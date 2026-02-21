import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useJourney } from '../context/JourneyContext';
import { JourneyLeg } from '../services/groq';

const MODE_ICON: Record<string, any> = {
    flight: 'airplane',
    train: 'train',
    bus: 'bus',
    ferry: 'boat',
    rideshare: 'car',
    metro: 'subway',
};

const MODE_COLOR: Record<string, string> = {
    flight: '#EEF4FF',
    train: '#EAF5EE',
    bus: '#FDF6E3',
    ferry: '#F0F5FF',
    rideshare: '#F5F0FF',
    metro: '#FFF0F5',
};

function LegCard({ leg, legIndex, total }: { leg: JourneyLeg; legIndex: number; total: number }) {
    const [expanded, setExpanded] = useState(false);
    const bgColor = MODE_COLOR[leg.mode] || Colors.surface;
    const serviceRef = leg.trainNumber || leg.busNumber || leg.flightNumber || '';

    return (
        <View style={styles.legCard}>
            {/* Step indicator */}
            <View style={styles.legStepRow}>
                <View style={styles.legStepLine} />
                <View style={[styles.legModeChip, { backgroundColor: bgColor }]}>
                    <Ionicons name={MODE_ICON[leg.mode] || 'navigate'} size={13} color={Colors.textPrimary} />
                    <Text style={styles.legModeText}>{leg.mode.toUpperCase()}</Text>
                </View>
                {legIndex < total - 1 && <View style={styles.legStepLineRight} />}
            </View>

            {/* Provider & service */}
            <View style={styles.legProviderRow}>
                <Text style={styles.legProvider}>{leg.provider}</Text>
                {serviceRef ? (
                    <View style={styles.serviceRefBadge}>
                        <Text style={styles.serviceRefText}>{serviceRef}</Text>
                    </View>
                ) : null}
                {leg.status === 'on-time' && (
                    <View style={styles.onTimeBadge}>
                        <View style={styles.onTimeDot} />
                        <Text style={styles.onTimeText}>On Time</Text>
                    </View>
                )}
            </View>

            {/* Time + Route */}
            <View style={styles.legTimeRow}>
                <View style={styles.legTimeBlock}>
                    <Text style={styles.legTime}>{leg.departureTime}</Text>
                    <Text style={styles.legCity}>{leg.from}</Text>
                    {leg.fromTerminal ? (
                        <Text style={styles.legTerminal} numberOfLines={2}>{leg.fromTerminal}</Text>
                    ) : null}
                </View>

                <View style={styles.legDurationBlock}>
                    <Text style={styles.legDuration}>{leg.duration}</Text>
                    <View style={styles.legLine} />
                    <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
                </View>

                <View style={[styles.legTimeBlock, { alignItems: 'flex-end' }]}>
                    <Text style={styles.legTime}>{leg.arrivalTime}</Text>
                    <Text style={styles.legCity}>{leg.to}</Text>
                    {leg.toTerminal ? (
                        <Text style={[styles.legTerminal, { textAlign: 'right' }]} numberOfLines={2}>
                            {leg.toTerminal}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Class */}
            {leg.class ? (
                <View style={styles.classRow}>
                    <Ionicons name="ribbon-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.classText}>{leg.class}</Text>
                </View>
            ) : null}

            {/* Expand toggle */}
            <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(!expanded)}>
                <Text style={styles.expandBtnText}>{expanded ? 'Less details' : 'More details'}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Expanded: amenities + seat types */}
            {expanded && (
                <View style={styles.expandedSection}>
                    {leg.amenities && leg.amenities.length > 0 && (
                        <View style={styles.amenitiesBlock}>
                            <Text style={styles.expandedLabel}>AMENITIES</Text>
                            <View style={styles.amenitiesRow}>
                                {leg.amenities.map((a, i) => (
                                    <View key={i} style={styles.amenityChip}>
                                        <Text style={styles.amenityText}>{a}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                    {leg.seatTypes && leg.seatTypes.length > 0 && (
                        <View style={styles.seatTypesBlock}>
                            <Text style={styles.expandedLabel}>SEAT TYPES AVAILABLE</Text>
                            {leg.seatTypes.map((s, i) => (
                                <View key={i} style={styles.seatTypeRow}>
                                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                                    <Text style={styles.seatTypeText}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

export default function DetailScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();
    const route = state.selectedRoute;

    if (!route) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                    <Text style={styles.errorText}>No route selected</Text>
                    <TouchableOpacity style={styles.backLinkBtn} onPress={() => router.back()}>
                        <Text style={styles.backLinkText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const firstLeg = route.legs[0];
    const lastLeg = route.legs[route.legs.length - 1];
    const totalPrice = `₹${route.price.min.toLocaleString()} – ₹${route.price.max.toLocaleString()}`;

    const handleBook = () => {
        const defaultPassengers = Array.from({ length: state.searchParams?.passengers || 1 }, () => ({
            name: '', age: '', gender: 'male' as const,
            idType: 'aadhar' as const, idNumber: '', phone: '', email: '',
        }));
        dispatch({ type: 'SET_PASSENGERS', payload: defaultPassengers });
        router.push('/passengers');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{firstLeg.from} → {lastLeg.to}</Text>
                    <Text style={styles.headerSub}>{route.totalDuration} · {route.legs.length} leg{route.legs.length > 1 ? 's' : ''}</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Summary Banner */}
                <View style={styles.summaryBanner}>
                    <View style={styles.summaryTimeRow}>
                        <View style={styles.summaryTimeBlock}>
                            <Text style={styles.summaryTime}>{firstLeg.departureTime}</Text>
                            <Text style={styles.summaryCity}>{firstLeg.from}</Text>
                        </View>
                        <View style={styles.summaryMid}>
                            <Text style={styles.summaryDuration}>{route.totalDuration}</Text>
                            <View style={styles.summaryLine} />
                            <Text style={styles.summaryStops}>
                                {route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
                            </Text>
                        </View>
                        <View style={[styles.summaryTimeBlock, { alignItems: 'flex-end' }]}>
                            <Text style={styles.summaryTime}>{lastLeg.arrivalTime}</Text>
                            <Text style={styles.summaryCity}>{lastLeg.to}</Text>
                        </View>
                    </View>

                    {/* Tags */}
                    {route.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                            {route.tags.map((t, i) => (
                                <View key={i} style={styles.tagBadge}>
                                    <Text style={styles.tagText}>{t}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Legs section */}
                <Text style={styles.sectionTitle}>ITINERARY</Text>

                {route.legs.map((leg, i) => (
                    <React.Fragment key={i}>
                        <LegCard leg={leg} legIndex={i} total={route.legs.length} />
                        {/* Transfer indicator between legs */}
                        {i < route.legs.length - 1 && (
                            <View style={styles.transferRow}>
                                <Ionicons name="time-outline" size={14} color={Colors.warning} />
                                <Text style={styles.transferText}>
                                    Transfer at {leg.to} → board {route.legs[i + 1].provider}
                                </Text>
                            </View>
                        )}
                    </React.Fragment>
                ))}

                {/* Environmental Impact */}
                <Text style={styles.sectionTitle}>ENVIRONMENTAL IMPACT</Text>
                <View style={styles.ecoCard}>
                    <View style={styles.ecoRow}>
                        <View style={styles.ecoIconBox}>
                            <Ionicons name="leaf-outline" size={22} color={Colors.success} />
                        </View>
                        <View>
                            <Text style={styles.ecoValue}>{route.carbonKg} kg CO₂</Text>
                            <Text style={styles.ecoLabel}>Total estimated emissions</Text>
                        </View>
                        <View style={styles.ecoRight}>
                            <Text style={styles.ecoCompare}>
                                vs ~{Math.round(route.carbonKg * 4.5)} km by car
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Fare Summary */}
                <Text style={styles.sectionTitle}>FARE SUMMARY</Text>
                <View style={styles.fareCard}>
                    <View style={styles.fareRow}>
                        <Text style={styles.fareLabel}>Base fare (1 pax)</Text>
                        <Text style={styles.fareValue}>₹{route.price.min.toLocaleString()}</Text>
                    </View>
                    {(state.searchParams?.passengers || 1) > 1 && (
                        <View style={styles.fareRow}>
                            <Text style={styles.fareLabel}>× {state.searchParams?.passengers} passengers</Text>
                            <Text style={styles.fareValue}>
                                ₹{(route.price.min * (state.searchParams?.passengers || 1)).toLocaleString()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.fareDivider} />
                    <View style={styles.fareRow}>
                        <Text style={styles.fareTotalLabel}>Estimated Total</Text>
                        <Text style={styles.fareTotalValue}>
                            ₹{(route.price.min * (state.searchParams?.passengers || 1)).toLocaleString()}–
                            ₹{(route.price.max * (state.searchParams?.passengers || 1)).toLocaleString()}
                        </Text>
                    </View>
                    <Text style={styles.fareDisclaimer}>
                        * Final price may vary on provider site. Taxes, GST &amp; booking fees extra.
                    </Text>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Sticky Bottom CTA */}
            <View style={styles.bottomCTA}>
                <View>
                    <Text style={styles.ctaPrice}>{totalPrice}</Text>
                    <Text style={styles.ctaPriceSub}>per person · all legs</Text>
                </View>
                <TouchableOpacity style={styles.ctaBtn} onPress={handleBook} activeOpacity={0.87}>
                    <Text style={styles.ctaBtnText}>Enter Passenger Details</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    headerCenter: { flex: 1 },
    headerTitle: { ...Typography.headingSmall },
    headerSub: { ...Typography.bodySmall, marginTop: 1 },

    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md },

    summaryBanner: {
        backgroundColor: Colors.accent, borderRadius: Radius.xl,
        padding: Spacing.md, marginBottom: Spacing.lg,
    },
    summaryTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    summaryTimeBlock: { flex: 1 },
    summaryTime: { fontSize: 26, fontWeight: '700', color: Colors.textInverse },
    summaryCity: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    summaryMid: { alignItems: 'center', paddingHorizontal: Spacing.sm },
    summaryDuration: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    summaryLine: { width: 60, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
    summaryStops: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    tagBadge: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    tagText: { fontSize: 11, fontWeight: '600', color: Colors.textInverse },

    sectionTitle: {
        ...Typography.labelSmall, letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md,
    },

    // Leg card
    legCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
        marginBottom: Spacing.xs,
    },
    legStepRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm,
    },
    legStepLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    legStepLineRight: { flex: 1, height: 1, backgroundColor: Colors.border },
    legModeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    },
    legModeText: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },

    legProviderRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm,
        flexWrap: 'wrap',
    },
    legProvider: { ...Typography.headingSmall, flex: 1 },
    serviceRefBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
        backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.border,
    },
    serviceRefText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
    onTimeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
        backgroundColor: Colors.successLight, borderWidth: 1, borderColor: '#C8E6D4',
    },
    onTimeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
    onTimeText: { fontSize: 10, fontWeight: '600', color: Colors.success },

    legTimeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
    legTimeBlock: { flex: 1 },
    legTime: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
    legCity: { ...Typography.bodyMedium, marginTop: 2 },
    legTerminal: { ...Typography.bodySmall, fontSize: 11, marginTop: 3, color: Colors.textMuted },
    legDurationBlock: { alignItems: 'center', paddingHorizontal: Spacing.sm, marginTop: 4 },
    legDuration: { ...Typography.bodySmall, fontWeight: '600', marginBottom: 4 },
    legLine: { width: 40, height: 1, backgroundColor: Colors.border, marginBottom: 4 },

    classRow: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm,
        backgroundColor: Colors.accentLight, alignSelf: 'flex-start', marginBottom: Spacing.sm,
    },
    classText: { ...Typography.bodySmall, fontWeight: '500' },

    expandBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start', paddingVertical: 4,
    },
    expandBtnText: { ...Typography.bodySmall, fontWeight: '500', color: Colors.textSecondary },

    expandedSection: { marginTop: Spacing.sm, gap: Spacing.sm },
    amenitiesBlock: {},
    expandedLabel: { ...Typography.caption, letterSpacing: 0.6, marginBottom: Spacing.xs },
    amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    amenityChip: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
        backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    },
    amenityText: { fontSize: 11, color: Colors.textSecondary },
    seatTypesBlock: {},
    seatTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 3 },
    seatTypeText: { ...Typography.bodySmall },

    transferRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.warningLight, borderRadius: Radius.md,
        borderWidth: 1, borderColor: '#E8D9A0', marginBottom: Spacing.xs,
    },
    transferText: { ...Typography.bodySmall, fontWeight: '500', color: Colors.warning, flex: 1 },

    ecoCard: {
        backgroundColor: Colors.successLight, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: '#C8E6D4', padding: Spacing.md, marginBottom: Spacing.xs,
    },
    ecoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    ecoIconBox: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(42,122,75,0.1)', alignItems: 'center', justifyContent: 'center',
    },
    ecoValue: { ...Typography.headingSmall, color: Colors.success },
    ecoLabel: { ...Typography.bodySmall, marginTop: 1 },
    ecoRight: { marginLeft: 'auto' },
    ecoCompare: { ...Typography.bodySmall, fontSize: 11 },

    fareCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
    fareLabel: { ...Typography.bodyMedium },
    fareValue: { ...Typography.labelLarge },
    fareDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
    fareTotalLabel: { ...Typography.headingSmall },
    fareTotalValue: { ...Typography.headingSmall },
    fareDisclaimer: { ...Typography.bodySmall, marginTop: Spacing.sm, fontStyle: 'italic' },

    bottomCTA: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.background, padding: Spacing.md,
        borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.large,
    },
    ctaPrice: { ...Typography.headingSmall, fontSize: 17 },
    ctaPriceSub: { ...Typography.bodySmall, marginTop: 1 },
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.accent, paddingHorizontal: Spacing.lg, paddingVertical: 14,
        borderRadius: Radius.full, ...Shadow.medium,
    },
    ctaBtnText: { ...Typography.labelLarge, color: Colors.textInverse },

    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorText: { ...Typography.headingMedium },
    backLinkBtn: { padding: Spacing.md },
    backLinkText: { ...Typography.labelLarge, textDecorationLine: 'underline' },
});
