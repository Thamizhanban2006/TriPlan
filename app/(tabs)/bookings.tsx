import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const MOCK_BOOKINGS = [
    {
        id: '1',
        from: 'Chennai',
        to: 'Mumbai',
        date: '2026-02-18',
        mode: 'train',
        provider: 'IRCTC – Rajdhani Express',
        status: 'completed',
        price: '₹1,240',
        pnr: '4521896732',
        passengers: 2,
    },
    {
        id: '2',
        from: 'Bangalore',
        to: 'Hyderabad',
        date: '2026-02-14',
        mode: 'bus',
        provider: 'RedBus – KSRTC Volvo',
        status: 'completed',
        price: '₹680',
        pnr: 'RB928374',
        passengers: 1,
    },
    {
        id: '3',
        from: 'Delhi',
        to: 'Jaipur',
        date: '2026-01-30',
        mode: 'rideshare',
        provider: 'Ola Outstation',
        status: 'completed',
        price: '₹2,100',
        pnr: 'OLA-7782',
        passengers: 3,
    },
];

const MODE_ICONS: Record<string, any> = {
    flight: 'airplane',
    train: 'train',
    bus: 'bus',
    ferry: 'boat',
    rideshare: 'car',
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookingsTab() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>My Bookings</Text>
                <Text style={styles.subtitle}>Your past journeys</Text>
            </View>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {MOCK_BOOKINGS.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={52} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No bookings yet</Text>
                        <Text style={styles.emptyText}>Your completed journeys will appear here</Text>
                    </View>
                ) : (
                    MOCK_BOOKINGS.map(b => (
                        <TouchableOpacity key={b.id} style={styles.card} activeOpacity={0.85}>
                            {/* Header */}
                            <View style={styles.cardHeader}>
                                <View style={styles.modeIconWrap}>
                                    <Ionicons name={MODE_ICONS[b.mode] || 'navigate'} size={18} color={Colors.textPrimary} />
                                </View>
                                <View style={styles.cardHeaderText}>
                                    <Text style={styles.cardProvider}>{b.provider}</Text>
                                    <Text style={styles.cardDate}>{formatDate(b.date)}</Text>
                                </View>
                                <View style={[styles.statusBadge, b.status === 'completed' && styles.statusCompleted]}>
                                    <Text style={[styles.statusText, b.status === 'completed' && styles.statusTextCompleted]}>
                                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                    </Text>
                                </View>
                            </View>

                            {/* Route */}
                            <View style={styles.routeRow}>
                                <Text style={styles.routeFrom}>{b.from}</Text>
                                <View style={styles.routeLineWrap}>
                                    <View style={styles.routeLine} />
                                    <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
                                </View>
                                <Text style={styles.routeTo}>{b.to}</Text>
                            </View>

                            {/* Details */}
                            <View style={styles.detailRow}>
                                <View style={styles.detailChip}>
                                    <Ionicons name="ticket-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.detailChipText}>{b.pnr}</Text>
                                </View>
                                <View style={styles.detailChip}>
                                    <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.detailChipText}>{b.passengers} pax</Text>
                                </View>
                                <Text style={styles.cardPrice}>{b.price}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    title: { ...Typography.headingLarge },
    subtitle: { ...Typography.bodyMedium, marginTop: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md },

    emptyBox: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { ...Typography.headingMedium },
    emptyText: { ...Typography.bodyMedium },

    card: {
        backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
        marginBottom: Spacing.sm, ...Shadow.small,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    modeIconWrap: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
    },
    cardHeaderText: { flex: 1 },
    cardProvider: { ...Typography.labelLarge },
    cardDate: { ...Typography.bodySmall, marginTop: 1 },
    statusBadge: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    },
    statusCompleted: { backgroundColor: Colors.successLight, borderColor: '#C8E6D4' },
    statusText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    statusTextCompleted: { color: Colors.success },

    routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    routeFrom: { ...Typography.headingSmall, fontSize: 17 },
    routeLineWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm },
    routeLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    routeTo: { ...Typography.headingSmall, fontSize: 17 },

    detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    detailChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    },
    detailChipText: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
    cardPrice: { ...Typography.headingSmall, marginLeft: 'auto' },
});
