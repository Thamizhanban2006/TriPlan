/**
 * TriPlan – AI Pivot Engine (Connection Guardian)
 *
 * Core logic for the "Ghost Route" feature:
 *   1. Monitors real-time GPS speed vs next leg's hard departure time.
 *   2. Calculates a "miss probability" every GPS tick.
 *   3. When probability > 60 %, triggers Groq for the AI pivot message
 *      AND calls ORS to build a "Rescue Route".
 *   4. Fires a local push-notification so the user is alerted even if the
 *      app is backgrounded.
 *
 * Nothing in this file touches existing routing/booking logic.
 */

import { calculateRoute, geocodeSearch, ORSRoute } from './ors';

// ─── Types ────────────────────────────────────────────────────────────────────

/** One leg of the active journey that is being guarded */
export interface GuardedLeg {
    /** Human-readable name of the connection point (e.g. "Chennai Central") */
    connectionName: string;
    /** Approximate lat/lng of the connection point */
    connectionLat: number;
    connectionLng: number;
    /** Hard departure time – "HH:MM" 24-hour */
    departureTime: string;
    /** Transport mode of the next leg (train / flight / bus …) */
    nextMode: 'train' | 'flight' | 'bus' | 'metro' | 'ferry' | 'rideshare';
    /** Provider name for the message (e.g. "IRCTC – Vande Bharat") */
    nextProvider: string;
}

/** Result of a single probability calculation tick */
export interface PivotTick {
    missChancePct: number;          // 0 – 100
    minutesRemaining: number;       // calendar minutes until hard departure
    distanceRemainingKm: number;    // straight-line km to connection
    projectedArrivalMin: number;    // projected arrival in minutes at current speed
    speedKmh: number;
}

/** The full pivot alert that is surfaced to the UI */
export interface PivotAlert {
    tick: PivotTick;
    aiMessage: string;              // Groq-generated short alert text
    rescueRoute: ORSRoute | null;   // ORS route to the rescue point
    rescuePickupLat: number;        // where the user should get off / head to
    rescuePickupLng: number;
    rescuePickupName: string;       // human-readable (e.g. "Next signal, MG Road")
    rescueMode: 'auto' | 'bike_taxi' | 'cab';  // suggested last-mile mode
    rescueSavingMin: number;        // estimated minutes saved vs staying on current route
    triggeredAt: number;            // Date.now()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM" into today's UTC timestamp (ms) */
export function parseTimeToday(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    const now = new Date();
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    // If the time is already past, assume it's tomorrow
    if (t.getTime() < now.getTime() - 60_000) t.setDate(t.getDate() + 1);
    return t.getTime();
}

/** Haversine great-circle distance in km */
export function haversineKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute how likely the traveller is to MISS their connection.
 *
 * Formula (heuristic):
 *   requiredSpeedKmh = distanceKm / (minutesRemaining / 60)
 *   ratio            = requiredSpeedKmh / max(currentSpeedKmh, 1)
 *
 *   if ratio  < 0.8  → basically on-time  → low miss chance
 *   if ratio  > 2.0  → definitely missing → 95 %
 *   sigmoid interpolation in between
 *
 * Buffer: we add a +7-minute buffer for Indian traffic unpredictability.
 */
export function calculateMissChance(
    currentSpeedKmh: number,
    distanceKm: number,
    minutesRemaining: number
): number {
    const BUFFER_MIN = 7;
    const effectiveMinutes = minutesRemaining - BUFFER_MIN;

    if (effectiveMinutes <= 0) return 95; // already in buffer danger zone
    if (distanceKm <= 0.1) return 2;      // already at connection

    const requiredSpeed = (distanceKm / effectiveMinutes) * 60; // km/h needed
    const safeSpeed = Math.max(currentSpeedKmh, 1);
    const ratio = requiredSpeed / safeSpeed;

    // Logistic sigmoid: P = 1 / (1 + e^(-k*(x - x0)))
    // Calibrated so ratio=1.0 → 50 %, ratio=0.7 → ~20 %, ratio=1.6 → ~85 %
    const k = 5;
    const x0 = 1.0;
    const raw = 1 / (1 + Math.exp(-k * (ratio - x0)));
    return Math.min(95, Math.max(2, Math.round(raw * 100)));
}

/**
 * Build a single probability tick from GPS data.
 */
export function buildTick(
    userLat: number,
    userLng: number,
    speedKmh: number,
    leg: GuardedLeg
): PivotTick {
    const departureMs = parseTimeToday(leg.departureTime);
    const minutesRemaining = Math.max(0, (departureMs - Date.now()) / 60_000);
    const distanceRemainingKm = haversineKm(
        userLat, userLng,
        leg.connectionLat, leg.connectionLng
    );
    const projectedArrivalMin = speedKmh > 0.5
        ? (distanceRemainingKm / speedKmh) * 60
        : 999;
    const missChancePct = calculateMissChance(speedKmh, distanceRemainingKm, minutesRemaining);

    return {
        missChancePct,
        minutesRemaining,
        distanceRemainingKm,
        projectedArrivalMin,
        speedKmh,
    };
}

// ─── Rescue Route Builder ─────────────────────────────────────────────────────

/**
 * Auto-riskshaws and bike-taxis thrive in narrow lanes.
 * We model a "rescue pickup point" as a slight angular shift from the direct path,
 * simulating a cut-through lane ~60 % of the way to the connection.
 *
 * In production this would use a POI API to find actual signal/junction names.
 */
export function deriveRescuePickup(
    userLat: number, userLng: number,
    destLat: number, destLng: number
): { lat: number; lng: number; name: string } {
    // Place the pickup 55 % along the route with a slight perpendicular offset
    const t = 0.55;
    const perpScale = 0.004; // ~400 m offset to simulate a side lane
    const lat = userLat + t * (destLat - userLat) + perpScale * (destLng - userLng);
    const lng = userLng + t * (destLng - userLng) - perpScale * (destLat - userLat);
    return { lat, lng, name: 'Next signal junction' };
}

/**
 * Build the ORS rescue route from user's current position to the rescue pickup,
 * then from pickup to the connection point.
 *
 * Returns the first leg of the rescue (user → pickup), plus estimated saving.
 */
export async function buildRescueRoute(
    userLat: number, userLng: number,
    leg: GuardedLeg,
    tick: PivotTick
): Promise<{ route: ORSRoute | null; pickup: { lat: number; lng: number; name: string }; savingMin: number; mode: PivotAlert['rescueMode'] }> {
    const pickup = deriveRescuePickup(
        userLat, userLng,
        leg.connectionLat, leg.connectionLng
    );

    // ORS walking/driving to pickup then to destination
    const route = await calculateRoute(
        userLat, userLng,
        pickup.lat, pickup.lng,
        'foot-walking'   // walk to the pickup point
    );

    // Estimate saving: compare current projected arrival vs rescue route time
    const rescueTotalMin = route
        ? (route.durationS / 60)   // walk to pickup
          + 5                       // wait for auto/bike taxi
          + (haversineKm(pickup.lat, pickup.lng, leg.connectionLat, leg.connectionLng) / 15) * 60  // auto at 15 km/h
        : tick.projectedArrivalMin;

    const savingMin = Math.max(0, Math.round(tick.projectedArrivalMin - rescueTotalMin));

    // Choose mode based on distance to connection
    let mode: PivotAlert['rescueMode'] = 'auto';
    if (tick.distanceRemainingKm < 2) mode = 'bike_taxi';
    else if (tick.distanceRemainingKm > 8) mode = 'cab';

    return { route, pickup, savingMin, mode };
}

// ─── Short AI-free fallback messages ─────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
    train: 'Train',
    flight: 'Flight',
    bus: 'Bus',
    metro: 'Metro',
    ferry: 'Ferry',
    rideshare: 'Cab',
};

const RESCUE_LABELS: Record<PivotAlert['rescueMode'], string> = {
    auto: 'Auto-Rickshaw',
    bike_taxi: 'Bike Taxi (Rapido)',
    cab: 'Cab (Ola/Uber)',
};

/**
 * Generate a short (~120 char) notification blurb WITHOUT needing Groq.
 * Used as the push-notification body where brevity is mandatory.
 */
export function buildShortNotificationText(
    tick: PivotTick,
    leg: GuardedLeg,
    savingMin: number,
    rescueMode: PivotAlert['rescueMode']
): string {
    const modeLabel = MODE_LABELS[leg.nextMode] || 'connection';
    const rideName = RESCUE_LABELS[rescueMode];
    return (
        `⚠️ ${Math.round(tick.missChancePct)}% chance of missing your ${modeLabel} at ${leg.departureTime}. ` +
        `Get off now → ${rideName} can save ~${savingMin} min. Tap to see rescue route.`
    );
}

/**
 * Generate a verbose in-app AI message without Groq (pure template fallback).
 * This is shown in the banner when Groq is unavailable.
 */
export function buildFallbackAiMessage(
    tick: PivotTick,
    leg: GuardedLeg,
    pickupName: string,
    rescueMode: PivotAlert['rescueMode'],
    savingMin: number
): string {
    const rideName = RESCUE_LABELS[rescueMode];
    const modeLabel = MODE_LABELS[leg.nextMode] || 'connection';
    return (
        `Traffic detected on your route. At your current speed (${Math.round(tick.speedKmh)} km/h), ` +
        `you have a ${Math.round(tick.missChancePct)}% chance of missing the ${modeLabel} (${leg.nextProvider}) ` +
        `departing at ${leg.departureTime}. ` +
        `🛺 Get off at the ${pickupName}. A ${rideName} through the side lane can save ~${savingMin} minutes. ` +
        `Tap "Navigate Rescue Path" to start.`
    );
}
