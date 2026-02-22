import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

const MODE_ICONS: Record<string, any> = {
    flight: 'airplane',
    train: 'train',
    bus: 'bus',
    ferry: 'boat',
    rideshare: 'car',
};

function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookingsTab() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = async () => {
        if (!user || !supabase) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (e) {
            console.error('Error fetching bookings:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>My Bookings</Text>
                <Text style={styles.subtitle}>Your real-time journeys</Text>
            </View>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
                }
            >
                {!user ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="lock-closed-outline" size={52} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>Sign in required</Text>
                        <Text style={styles.emptyText}>Please sign in to see your bookings</Text>
                    </View>
                ) : bookings.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={52} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No bookings yet</Text>
                        <Text style={styles.emptyText}>Your confirmed journeys will appear here</Text>
                    </View>
                ) : (
                    bookings.map(b => (
                        <TouchableOpacity key={b.id} style={styles.card} activeOpacity={0.85}>
                            {/* Header */}
                            <View style={styles.cardHeader}>
                                <View style={styles.modeIconWrap}>
                                    <Ionicons 
                                        name={MODE_ICONS[b.route_data?.legs[0]?.mode] || 'navigate'} 
                                        size={18} 
                                        color={Colors.textPrimary} 
                                    />
                                </View>
                                <View style={styles.cardHeaderText}>
                                    <Text style={styles.cardProvider}>
                                        {b.route_data?.legs[0]?.provider || 'Multi-modal Trip'}
                                    </Text>
                                    <Text style={styles.cardDate}>{formatDate(b.created_at)}</Text>
                                </View>
                                <View style={[styles.statusBadge, b.status === 'confirmed' && styles.statusCompleted]}>
                                    <Text style={[styles.statusText, b.status === 'confirmed' && styles.statusTextCompleted]}>
                                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                    </Text>
                                </View>
                            </View>

                            {/* Route */}
                            <View style={styles.routeRow}>
                                <Text style={styles.routeFrom}>{b.from_city}</Text>
                                <View style={styles.routeLineWrap}>
                                    <View style={styles.routeLine} />
                                    <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
                                </View>
                                <Text style={styles.routeTo}>{b.to_city}</Text>
                            </View>

                            {/* Details */}
                            <View style={styles.detailRow}>
                                <View style={styles.detailChip}>
                                    <Ionicons name="ticket-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.detailChipText}>{b.tickets_data?.[0]?.pnr || 'N/A'}</Text>
                                </View>
                                <View style={styles.detailChip}>
                                    <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.detailChipText}>{b.route_data?.legs?.length} legs</Text>
                                </View>
                                <Text style={styles.cardPrice}>₹{b.total_price.toLocaleString()}</Text>
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
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
