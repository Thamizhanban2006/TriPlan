/**
 * TriPlan – Pivot Context (Connection Guardian State)
 *
 * Provides:
 *   1. `startGuardian(legs)` – begin GPS monitoring for a journey
 *   2. `stopGuardian()`      – stop monitoring and clean up
 *   3. `dismissAlert()`      – user dismissed the current pivot alert
 *   4. `activatePivot()`     – user tapped "Navigate Rescue Path"
 *
 * The context polls expo-location every 15 seconds, computes miss probability,
 * and fires the AI alert + push notification when > 60 %.
 *
 * A cooldown of 3 minutes prevents alert spam.
 */

import React, {
    createContext, useContext, useRef, useState,
    useCallback, useEffect, ReactNode,
} from 'react';
import * as Location from 'expo-location';
import {
    GuardedLeg,
    PivotAlert,
    PivotTick,
    buildTick,
    buildRescueRoute,
    buildShortNotificationText,
    buildFallbackAiMessage,
} from '../services/pivotEngine';
import {
    getPivotAlertMessage,
    getPivotNotificationTitle,
    PivotAlertInput,
} from '../services/groq';
import {
    requestNotificationPermissions,
    sendPivotNotification,
    dismissAllPivotNotifications,
} from '../services/notificationService';

// ─── Types ────────────────────────────────────────────────────────────────────

type GuardianStatus =
    | 'idle'          // not running
    | 'watching'      // GPS polling active, all OK
    | 'alert'         // pivot alert is showing
    | 'pivoting'      // user tapped – navigating rescue path
    | 'safe';         // connection made in time – guardian relaxed

interface PivotState {
    status: GuardianStatus;
    currentTick: PivotTick | null;
    activeAlert: PivotAlert | null;
    guardedLegs: GuardedLeg[];
    currentLegIndex: number;
}

interface PivotContextType extends PivotState {
    startGuardian: (legs: GuardedLeg[]) => Promise<void>;
    stopGuardian: () => void;
    dismissAlert: () => void;
    activatePivot: () => void;
}

// ─── Context Defaults ─────────────────────────────────────────────────────────

const defaultState: PivotState = {
    status: 'idle',
    currentTick: null,
    activeAlert: null,
    guardedLegs: [],
    currentLegIndex: 0,
};

const PivotContext = createContext<PivotContextType>({
    ...defaultState,
    startGuardian: async () => {},
    stopGuardian: () => {},
    dismissAlert: () => {},
    activatePivot: () => {},
});

// ─── Constants ────────────────────────────────────────────────────────────────

const GPS_INTERVAL_MS = 15_000;       // poll every 15 s
const ALERT_THRESHOLD_PCT = 60;       // fire alert when miss chance > 60 %
const ALERT_COOLDOWN_MS = 3 * 60_000; // 3-minute cooldown between alerts
const SAFE_THRESHOLD_PCT = 25;        // below 25 % → mark as safe

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PivotProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PivotState>(defaultState);

    // Refs to avoid stale closures in the interval callback
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const lastAlertAt = useRef<number>(0);
    const isProcessingAlert = useRef(false);
    const guardedLegsRef = useRef<GuardedLeg[]>([]);
    const currentLegIndexRef = useRef(0);

    // ── Start Guardian ────────────────────────────────────────────────────────

    const startGuardian = useCallback(async (legs: GuardedLeg[]) => {
        if (legs.length === 0) return;

        // Request permissions
        const [locPerm] = await Promise.all([
            Location.requestForegroundPermissionsAsync(),
            requestNotificationPermissions(),
        ]);

        if (locPerm.status !== 'granted') {
            console.warn('[PivotGuardian] Location permission denied – guardian disabled');
            return;
        }

        guardedLegsRef.current = legs;
        currentLegIndexRef.current = 0;

        setState({
            status: 'watching',
            currentTick: null,
            activeAlert: null,
            guardedLegs: legs,
            currentLegIndex: 0,
        });

        // Stop any previous subscription
        locationSubscription.current?.remove();

        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: GPS_INTERVAL_MS,
                distanceInterval: 50, // also update if moved > 50m
            },
            (location) => handleGpsTick(location)
        );
    }, []);

    // ── Stop Guardian ─────────────────────────────────────────────────────────

    const stopGuardian = useCallback(() => {
        locationSubscription.current?.remove();
        locationSubscription.current = null;
        lastAlertAt.current = 0;
        isProcessingAlert.current = false;
        setState(defaultState);
        dismissAllPivotNotifications();
    }, []);

    // ── GPS Tick Handler ──────────────────────────────────────────────────────

    async function handleGpsTick(location: Location.LocationObject) {
        const legs = guardedLegsRef.current;
        const legIdx = currentLegIndexRef.current;
        if (!legs.length || legIdx >= legs.length) return;

        const leg = legs[legIdx];
        const { latitude: lat, longitude: lng } = location.coords;
        const speedMs = location.coords.speed ?? 0;
        const speedKmh = Math.max(0, speedMs * 3.6);

        const tick = buildTick(lat, lng, speedKmh, leg);

        // Update tick in state
        setState(prev => ({ ...prev, currentTick: tick }));

        // ── Advance to next leg if this one is "safe" ─────────────────────────
        if (tick.minutesRemaining <= 0 && legIdx < legs.length - 1) {
            currentLegIndexRef.current = legIdx + 1;
            setState(prev => ({
                ...prev,
                currentLegIndex: legIdx + 1,
                status: 'watching',
                activeAlert: null,
            }));
            return;
        }

        // ── Clear alert if risk dropped ───────────────────────────────────────
        if (tick.missChancePct < SAFE_THRESHOLD_PCT) {
            setState(prev =>
                prev.status === 'alert'
                    ? { ...prev, status: 'watching', activeAlert: null }
                    : prev
            );
            return;
        }

        // ── Trigger pivot alert ───────────────────────────────────────────────
        if (
            tick.missChancePct > ALERT_THRESHOLD_PCT &&
            !isProcessingAlert.current &&
            Date.now() - lastAlertAt.current > ALERT_COOLDOWN_MS
        ) {
            isProcessingAlert.current = true;
            lastAlertAt.current = Date.now();

            try {
                const { route, pickup, savingMin, mode } = await buildRescueRoute(
                    lat, lng, leg, tick
                );

                const pivotInput: PivotAlertInput = {
                    currentSpeedKmh: speedKmh,
                    distanceRemainingKm: tick.distanceRemainingKm,
                    minutesRemaining: tick.minutesRemaining,
                    missChancePct: tick.missChancePct,
                    connectionName: leg.connectionName,
                    nextProvider: leg.nextProvider,
                    nextMode: leg.nextMode,
                    departureTime: leg.departureTime,
                    pickupLandmark: pickup.name,
                    rescueMode: mode,
                    rescueSavingMin: savingMin,
                };

                // Fetch Groq AI message and notification title in parallel
                const [aiMessage, notifTitle] = await Promise.all([
                    getPivotAlertMessage(pivotInput),
                    getPivotNotificationTitle(pivotInput),
                ]);

                const shortNotifBody = buildShortNotificationText(tick, leg, savingMin, mode);

                const alert: PivotAlert = {
                    tick,
                    aiMessage,
                    rescueRoute: route,
                    rescuePickupLat: pickup.lat,
                    rescuePickupLng: pickup.lng,
                    rescuePickupName: pickup.name,
                    rescueMode: mode,
                    rescueSavingMin: savingMin,
                    triggeredAt: Date.now(),
                };

                // Push notification (visible even if app is backgrounded)
                await sendPivotNotification(notifTitle, shortNotifBody, {
                    pivotAlert: true,
                    missChancePct: tick.missChancePct,
                });

                setState(prev => ({
                    ...prev,
                    status: 'alert',
                    activeAlert: alert,
                }));
            } catch (err) {
                console.error('[PivotGuardian] Alert generation failed:', err);

                // Fallback: show banner with template message
                const { route, pickup, savingMin, mode } = await buildRescueRoute(
                    lat, lng, leg, tick
                ).catch(() => ({
                    route: null,
                    pickup: { lat, lng, name: 'next junction' },
                    savingMin: 0,
                    mode: 'auto' as PivotAlert['rescueMode'],
                }));

                const fallbackMsg = buildFallbackAiMessage(tick, leg, pickup.name, mode, savingMin);

                const alert: PivotAlert = {
                    tick,
                    aiMessage: fallbackMsg,
                    rescueRoute: route,
                    rescuePickupLat: pickup.lat,
                    rescuePickupLng: pickup.lng,
                    rescuePickupName: pickup.name,
                    rescueMode: mode,
                    rescueSavingMin: savingMin,
                    triggeredAt: Date.now(),
                };

                await sendPivotNotification(
                    `⚠️ ${Math.round(tick.missChancePct)}% chance of missing ${leg.nextMode} at ${leg.departureTime}`,
                    fallbackMsg.slice(0, 200)
                );

                setState(prev => ({
                    ...prev,
                    status: 'alert',
                    activeAlert: alert,
                }));
            } finally {
                isProcessingAlert.current = false;
            }
        }
    }

    // ── User Actions ──────────────────────────────────────────────────────────

    const dismissAlert = useCallback(() => {
        // Don't stop guardian – just hide the banner
        setState(prev => ({ ...prev, status: 'watching', activeAlert: null }));
    }, []);

    const activatePivot = useCallback(() => {
        setState(prev => ({ ...prev, status: 'pivoting' }));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            locationSubscription.current?.remove();
        };
    }, []);

    return (
        <PivotContext.Provider
            value={{
                ...state,
                startGuardian,
                stopGuardian,
                dismissAlert,
                activatePivot,
            }}
        >
            {children}
        </PivotContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePivot() {
    return useContext(PivotContext);
}
