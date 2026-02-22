/**
 * TriPlan – PivotGuardBanner
 *
 * The in-app visual layer of the Connection Guardian.
 * Rendered as an overlay on top of the Booking screen.
 *
 * States:
 *  - GuardianStatusBar  : thin status strip shown while "watching" (no alert)
 *  - PivotAlertSheet    : full bottom-sheet alert when miss chance > 60 %
 *  - RescueMapPin       : shows the rescue mode icon + saving after user taps
 */

import React, { useEffect, useRef, memo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Easing, Pressable, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { usePivot } from '../context/PivotContext';
import { PivotAlert } from '../services/pivotEngine';

// ─── Rescue Mode Metadata ─────────────────────────────────────────────────────

const RESCUE_CONFIG = {
    auto: {
        label: 'Auto-Rickshaw',
        icon: 'bicycle' as const,           // closest Ionicons approximation
        color: '#F59E0B',
        deepLink: null,
    },
    bike_taxi: {
        label: 'Bike Taxi',
        icon: 'bicycle' as const,
        color: '#10B981',
        deepLink: 'https://rapido.bike',    // Rapido
    },
    cab: {
        label: 'Cab (Ola/Uber)',
        icon: 'car' as const,
        color: '#3B82F6',
        deepLink: 'https://www.olacabs.com',
    },
};

// ─── Probability ring colour ──────────────────────────────────────────────────

function riskColor(pct: number): string {
    if (pct < 40) return Colors.success;
    if (pct < 60) return Colors.warning;
    return Colors.error;
}

// ─── Tiny pulse animation hook ────────────────────────────────────────────────

function usePulse() {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1.00, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return anim;
}

// ─── Guardian Status Bar ──────────────────────────────────────────────────────
// Thin strip shown while guardian is "watching" (green/amber, no alert)

function GuardianStatusBar() {
    const { currentTick, status, stopGuardian, guardedLegs, currentLegIndex } = usePivot();
    const pulse = usePulse();

    if (status === 'idle' || status === 'safe') return null;
    if (status === 'alert' || status === 'pivoting') return null;

    const leg = guardedLegs[currentLegIndex];
    const pct = currentTick?.missChancePct ?? 0;
    const minLeft = currentTick ? Math.round(currentTick.minutesRemaining) : '--';
    const color = riskColor(pct);

    return (
        <View style={[styles.statusBar, { borderLeftColor: color }]}>
            <Animated.View style={[styles.statusDot, { backgroundColor: color, transform: [{ scale: pulse }] }]} />
            <View style={styles.statusTextBlock}>
                <Text style={[styles.statusTitle, { color }]}>
                    Journey Guardian Active
                </Text>
                {leg && (
                    <Text style={styles.statusSub} numberOfLines={1}>
                        Watching: {leg.nextProvider} · {leg.departureTime}
                        {currentTick ? `  ·  ${minLeft} min left` : ''}
                    </Text>
                )}
            </View>
            <TouchableOpacity onPress={stopGuardian} style={styles.statusClose}>
                <Ionicons name="close" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Pivot Alert Sheet ────────────────────────────────────────────────────────

interface AlertSheetProps {
    alert: PivotAlert;
}

function PivotAlertSheet({ alert }: AlertSheetProps) {
    const { dismissAlert, activatePivot } = usePivot();

    // Slide-up entrance
    const slideAnim = useRef(new Animated.Value(300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulse = usePulse();

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, []);

    const rescue = RESCUE_CONFIG[alert.rescueMode];
    const pct = Math.round(alert.tick.missChancePct);

    const handleNavigate = () => {
        activatePivot();
        if (rescue.deepLink) Linking.openURL(rescue.deepLink);
    };

    return (
        <Animated.View
            style={[styles.sheetBackdrop, { opacity: fadeAnim }]}
            pointerEvents="box-none"
        >
            <Animated.View style={[styles.alertSheet, { transform: [{ translateY: slideAnim }] }]}>

                {/* ── Header ── */}
                <View style={styles.alertHeader}>
                    <Animated.View style={[styles.alertIconCircle, { transform: [{ scale: pulse }] }]}>
                        <Ionicons name="warning" size={22} color={Colors.textInverse} />
                    </Animated.View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>Connection Guardian Alert</Text>
                        <View style={styles.riskRow}>
                            <View style={[styles.riskBadge, { backgroundColor: riskColor(pct) + '20' }]}>
                                <Text style={[styles.riskBadgeText, { color: riskColor(pct) }]}>
                                    {pct}% miss risk
                                </Text>
                            </View>
                            <Text style={styles.alertSub}>
                                {alert.tick.distanceRemainingKm.toFixed(1)} km · {Math.round(alert.tick.minutesRemaining)} min left
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={dismissAlert} style={styles.sheetClose}>
                        <Ionicons name="close" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* ── Divider ── */}
                <View style={styles.divider} />

                {/* ── AI Message ── */}
                <View style={styles.aiMessageBlock}>
                    <View style={styles.aiBadge}>
                        <Ionicons name="sparkles" size={11} color={Colors.accent} />
                        <Text style={styles.aiBadgeText}>AI Guardian</Text>
                    </View>
                    <Text style={styles.aiMessageText}>{alert.aiMessage}</Text>
                </View>

                {/* ── Rescue mode chips ── */}
                <View style={styles.rescueModeRow}>
                    {/* Auto */}
                    <View style={[styles.rescueChip, alert.rescueMode === 'auto' && styles.rescueChipActive]}>
                        <Ionicons name="bicycle" size={14} color={RESCUE_CONFIG.auto.color} />
                        <Text style={styles.rescueChipText}>Auto-Rickshaw</Text>
                    </View>
                    {/* Bike Taxi */}
                    <View style={[styles.rescueChip, alert.rescueMode === 'bike_taxi' && styles.rescueChipActive]}>
                        <Ionicons name="bicycle" size={14} color={RESCUE_CONFIG.bike_taxi.color} />
                        <Text style={styles.rescueChipText}>Bike Taxi</Text>
                    </View>
                    {/* Cab */}
                    <View style={[styles.rescueChip, alert.rescueMode === 'cab' && styles.rescueChipActive]}>
                        <Ionicons name="car" size={14} color={RESCUE_CONFIG.cab.color} />
                        <Text style={styles.rescueChipText}>Cab</Text>
                    </View>
                </View>

                {/* ── Savings pill ── */}
                {alert.rescueSavingMin > 0 && (
                    <View style={styles.savingsPill}>
                        <Ionicons name="time-outline" size={13} color={Colors.success} />
                        <Text style={styles.savingsPillText}>
                            Save ~{alert.rescueSavingMin} minutes via {rescue.label}
                        </Text>
                    </View>
                )}

                {/* ── CTA Buttons ── */}
                <View style={styles.ctaRow}>
                    <TouchableOpacity
                        style={styles.ctaPrimaryBtn}
                        onPress={handleNavigate}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="navigate" size={16} color={Colors.textInverse} />
                        <Text style={styles.ctaPrimaryText}>Navigate Rescue Path</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={dismissAlert} style={styles.ctaDismiss}>
                    <Text style={styles.ctaDismissText}>I'll manage on my own</Text>
                </TouchableOpacity>

            </Animated.View>
        </Animated.View>
    );
}

// ─── Pivoting Confirmation Banner ─────────────────────────────────────────────

function PivotingConfirmation() {
    const { activeAlert, stopGuardian } = usePivot();
    if (!activeAlert) return null;
    const rescue = RESCUE_CONFIG[activeAlert.rescueMode];

    return (
        <View style={styles.pivotingBar}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.pivotingText}>
                Rescue path activated · Hail a {rescue.label} from {activeAlert.rescuePickupName}
            </Text>
            <TouchableOpacity onPress={stopGuardian}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export const PivotGuardBanner = memo(function PivotGuardBanner() {
    const { status, activeAlert } = usePivot();

    return (
        <>
            <GuardianStatusBar />
            {status === 'alert' && activeAlert && (
                <PivotAlertSheet alert={activeAlert} />
            )}
            {status === 'pivoting' && (
                <PivotingConfirmation />
            )}
        </>
    );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // ── Status bar ──────────────────────────────────────────────────────────
    statusBar: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderLeftWidth: 3,
        paddingHorizontal: Spacing.md, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
        ...Shadow.small,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusTextBlock: { flex: 1 },
    statusTitle: { fontSize: 12, fontWeight: '600' },
    statusSub: { ...Typography.bodySmall, marginTop: 1 },
    statusClose: { padding: 4 },

    // ── Backdrop ─────────────────────────────────────────────────────────────
    sheetBackdrop: {
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        zIndex: 999,
    },

    // ── Alert sheet ──────────────────────────────────────────────────────────
    alertSheet: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing.md,
        paddingBottom: 32,
        ...Shadow.large,
    },
    alertHeader: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    alertIconCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.error,
        alignItems: 'center', justifyContent: 'center',
        ...Shadow.medium,
    },
    alertTitle: { ...Typography.headingSmall, color: Colors.error },
    riskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
    riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    riskBadgeText: { fontSize: 11, fontWeight: '700' },
    alertSub: { ...Typography.bodySmall },
    sheetClose: { padding: 6 },

    divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

    // ── AI message ────────────────────────────────────────────────────────────
    aiMessageBlock: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    aiBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginBottom: Spacing.xs,
    },
    aiBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
    aiMessageText: { ...Typography.bodyMedium, color: Colors.textPrimary, lineHeight: 22 },

    // ── Rescue chips ──────────────────────────────────────────────────────────
    rescueModeRow: {
        flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap',
    },
    rescueChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    rescueChipActive: {
        backgroundColor: Colors.accentLight,
        borderColor: Colors.accent,
    },
    rescueChipText: { fontSize: 12, fontWeight: '500', color: Colors.textPrimary },

    // ── Savings pill ──────────────────────────────────────────────────────────
    savingsPill: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        backgroundColor: Colors.successLight,
        borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6,
        alignSelf: 'flex-start', marginBottom: Spacing.md,
    },
    savingsPillText: { fontSize: 12, fontWeight: '600', color: Colors.success },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
    ctaPrimaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        backgroundColor: Colors.accent,
        paddingVertical: 14, borderRadius: Radius.full,
        ...Shadow.medium,
    },
    ctaPrimaryText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 15 },

    ctaDismiss: { alignItems: 'center', paddingVertical: 6 },
    ctaDismissText: { ...Typography.bodySmall, color: Colors.textMuted, fontSize: 12 },

    // ── Pivoting bar ─────────────────────────────────────────────────────────
    pivotingBar: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.successLight,
        borderTopWidth: 1, borderTopColor: Colors.border,
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        ...Shadow.small,
    },
    pivotingText: {
        flex: 1, fontSize: 12, fontWeight: '500', color: Colors.success,
    },
});
