import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useJourney } from '../context/JourneyContext';
import { RouteOption } from '../services/groq';

const { width } = Dimensions.get('window');

const MODE_TABS = [
    { id: 'all', label: 'All', icon: 'grid-outline' as const },
    { id: 'flight', label: 'Flight', icon: 'airplane-outline' as const },
    { id: 'train', label: 'Train', icon: 'train-outline' as const },
    { id: 'bus', label: 'bus', icon: 'bus-outline' as const },
    { id: 'rideshare', label: 'Cab', icon: 'car-outline' as const },
];

const SORT_OPTS = [
    { id: 'price', label: 'Cheapest' },
    { id: 'duration', label: 'Fastest' },
    { id: 'eco', label: 'Eco' },
];

const MODE_ICON_MAP: Record<string, any> = {
    flight: 'airplane',
    train: 'train',
    bus: 'bus',
    ferry: 'boat',
    rideshare: 'car',
    metro: 'subway',
};

function TagBadge({ label }: { label: string }) {
    const isGreen = label.toLowerCase().includes('eco') || label.toLowerCase().includes('green');
    const isBlue = label.toLowerCase().includes('fast') || label.toLowerCase().includes('direct');
    return (
        <View style={[
            styles.tagBadge,
            isGreen && styles.tagBadgeGreen,
            isBlue && styles.tagBadgeBlue,
        ]}>
            <Text style={[styles.tagText, isGreen && styles.tagTextGreen, isBlue && styles.tagTextBlue]}>
                {label}
            </Text>
        </View>
    );
}

function parseMins(dur: string) {
    const h = dur.match(/(\d+)h/);
    const m = dur.match(/(\d+)m/);
    return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function RouteCard({ route, index, onPress }: { route: RouteOption; index: number; onPress: () => void }) {
    const animVal = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animVal, {
            toValue: 1,
            duration: 400,
            delay: index * 80,
            useNativeDriver: true,
        }).start();
    }, []);

    const primaryLeg = route.legs[0];
    const modes = [...new Set(route.legs.map(l => l.mode))];
    const isMultiModal = modes.length > 1;

    return (
        <Animated.View style={{
            opacity: animVal,
            transform: [{ translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>
            <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>

                {/* Title row: provider + price */}
                <View style={styles.cardTopRow}>
                    <View style={styles.modeIconsRow}>
                        {modes.map((m, i) => (
                            <View key={i} style={[styles.modeIcon, i > 0 && { marginLeft: -6 }]}>
                                <Ionicons name={MODE_ICON_MAP[m] || 'navigate'} size={15} color={Colors.textPrimary} />
                            </View>
                        ))}
                    </View>
                    <View style={styles.cardTitleBlock}>
                        <Text style={styles.cardProvider} numberOfLines={1}>
                            {primaryLeg.provider}
                            {isMultiModal && <Text style={styles.cardProviderSub}> + {route.legs.length - 1} more</Text>}
                        </Text>
                        {primaryLeg.fromTerminal && (
                            <Text style={styles.cardTerminal} numberOfLines={1}>
                                🏢 {primaryLeg.fromTerminal}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.cardPrice}>
                        ₹{route.price.min.toLocaleString()}
                    </Text>
                </View>

                {/* Route timeline */}
                <View style={styles.cardRoute}>
                    <View style={styles.timeBlock}>
                        <Text style={styles.timeText}>{primaryLeg.departureTime}</Text>
                        <Text style={styles.cityText} numberOfLines={1}>{primaryLeg.from}</Text>
                    </View>

                    <View style={styles.timelineCenter}>
                        <Text style={styles.durationLabel}>{route.duration}</Text>
                        <View style={styles.timelineLine}>
                            {modes.map((m, i) => (
                                <View key={i} style={[styles.timelineSegment, { flex: 1 }]}>
                                    {i < modes.length - 1 && (
                                        <View style={styles.transferDot} />
                                    )}
                                </View>
                            ))}
                        </View>
                        <Text style={styles.stopsLabel}>
                            {route.transfers === 0 ? 'Direct' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
                        </Text>
                    </View>

                    <View style={styles.timeBlock}>
                        <Text style={styles.timeText}>{route.legs[route.legs.length - 1].arrivalTime}</Text>
                        <Text style={styles.cityText} numberOfLines={1}>{route.legs[route.legs.length - 1].to}</Text>
                    </View>
                </View>

                {/* Tags + eco row */}
                <View style={styles.cardBottomRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                        {route.tags.map((t, i) => <TagBadge key={i} label={t} />)}
                        {route.legs[0].class && (
                            <View style={styles.classChip}>
                                <Text style={styles.classChipText}>{route.legs[0].class}</Text>
                            </View>
                        )}
                    </ScrollView>
                    <View style={styles.ecoChip}>
                        <Ionicons name="leaf-outline" size={11} color={Colors.success} />
                        <Text style={styles.ecoText}>{route.carbonKg}kg CO₂</Text>
                    </View>
                </View>

                {/* Destination terminal */}
                {route.legs[route.legs.length - 1].toTerminal && (
                    <View style={styles.terminalRow}>
                        <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.terminalText} numberOfLines={1}>
                            Arrives: {route.legs[route.legs.length - 1].toTerminal}
                        </Text>
                    </View>
                )}

                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.cardArrow} />
            </TouchableOpacity>
        </Animated.View>
    );
}

function SkeletonCard() {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
    return (
        <Animated.View style={[styles.card, { opacity }]}>
            <View style={[styles.skeletonLine, { width: '60%', height: 16, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '40%', height: 12, marginBottom: 20 }]} />
            <View style={styles.cardRoute}>
                <View style={[styles.skeletonLine, { width: 50, height: 20 }]} />
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <View style={[styles.skeletonLine, { height: 2 }]} />
                </View>
                <View style={[styles.skeletonLine, { width: 50, height: 20 }]} />
            </View>
        </Animated.View>
    );
}

export default function ResultsScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();
    const { searchParams, searchResults, isSearching, error } = state;

    const [sortBy, setSortBy] = useState<'price' | 'duration' | 'eco'>('price');
    const [modeFilter, setModeFilter] = useState('all');

    const handleRouteSelect = (route: RouteOption) => {
        dispatch({ type: 'SET_SELECTED_ROUTE', payload: route });
        router.push('/detail');
    };

    // Filter by mode
    const modeFiltered = modeFilter === 'all'
        ? searchResults
        : searchResults.filter(r => r.legs.some(l => l.mode === modeFilter));

    // Sort
    const sorted = [...modeFiltered].sort((a, b) => {
        if (sortBy === 'price') return a.price.min - b.price.min;
        if (sortBy === 'eco') return a.carbonKg - b.carbonKg;
        return parseMins(a.duration) - parseMins(b.duration);
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerRoute}>
                        {searchParams?.from} → {searchParams?.to}
                    </Text>
                    <Text style={styles.headerMeta}>
                        {searchParams?.date} · {searchParams?.passengers} pax
                    </Text>
                </View>
            </View>

            {/* Sort Bar */}
            <View style={styles.sortBar}>
                <Text style={styles.sortLabel}>Sort:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
                    {SORT_OPTS.map(opt => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[styles.sortChip, sortBy === opt.id && styles.sortChipActive]}
                            onPress={() => setSortBy(opt.id as any)}
                        >
                            <Text style={[styles.sortChipText, sortBy === opt.id && styles.sortChipTextActive]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.resultCount}>
                        <Text style={styles.resultCountText}>{modeFiltered.length} routes</Text>
                    </View>
                </ScrollView>
            </View>

            {/* Mode Filter Tabs */}
            <View style={styles.modeTabBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeTabRow}>
                    {MODE_TABS.map(tab => {
                        const count = tab.id === 'all'
                            ? searchResults.length
                            : searchResults.filter(r => r.legs.some(l => l.mode === tab.id)).length;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[styles.modeTab, modeFilter === tab.id && styles.modeTabActive]}
                                onPress={() => setModeFilter(tab.id)}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={15}
                                    color={modeFilter === tab.id ? Colors.textInverse : Colors.textSecondary}
                                />
                                <Text style={[styles.modeTabText, modeFilter === tab.id && styles.modeTabTextActive]}>
                                    {tab.label}
                                </Text>
                                {count > 0 && (
                                    <View style={[styles.modeCountBadge, modeFilter === tab.id && styles.modeCountBadgeActive]}>
                                        <Text style={[styles.modeCountText, modeFilter === tab.id && styles.modeCountTextActive]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {isSearching && sorted.length === 0 ? (
                    // Skeleton loading
                    <>
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                    </>
                ) : error ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>Something went wrong</Text>
                        <Text style={styles.emptyText}>{error}</Text>
                    </View>
                ) : sorted.length === 0 && !isSearching ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No routes found</Text>
                        <Text style={styles.emptyText}>
                            {modeFilter !== 'all'
                                ? `No ${modeFilter} routes available. Try another mode tab.`
                                : 'Try different dates or cities.'}
                        </Text>
                        {modeFilter !== 'all' && (
                            <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setModeFilter('all')}>
                                <Text style={styles.clearFilterText}>Show all routes</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        {isSearching && (
                            <View style={styles.loadingBar}>
                                <ActivityIndicator size="small" color={Colors.textPrimary} />
                                <Text style={styles.loadingText}>Finding more routes...</Text>
                            </View>
                        )}
                        {sorted.map((route, i) => (
                            <RouteCard
                                key={route.id}
                                route={route}
                                index={i}
                                onPress={() => handleRouteSelect(route)}
                            />
                        ))}
                    </>
                )}
                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm,
    },
    headerCenter: { flex: 1 },
    headerRoute: { ...Typography.headingSmall, fontSize: 15 },
    headerMeta: { ...Typography.bodySmall, marginTop: 1 },

    sortBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Spacing.md, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    sortLabel: { ...Typography.labelSmall, letterSpacing: 0.5, marginRight: Spacing.sm },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    sortChip: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    },
    sortChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    sortChipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
    sortChipTextActive: { color: Colors.textInverse },
    resultCount: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
        backgroundColor: Colors.accentLight, marginLeft: Spacing.sm,
    },
    resultCountText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

    // Mode Filter Tabs
    modeTabBar: {
        borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background,
    },
    modeTabRow: {
        flexDirection: 'row', paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm, gap: Spacing.xs,
    },
    modeTab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    modeTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    modeTabText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
    modeTabTextActive: { color: Colors.textInverse },
    modeCountBadge: {
        minWidth: 18, height: 18, borderRadius: 9,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 4,
    },
    modeCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    modeCountText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
    modeCountTextActive: { color: Colors.textInverse },

    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.sm },

    card: {
        backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
        ...Shadow.small, position: 'relative',
    },
    cardTopRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm,
    },
    modeIconsRow: { flexDirection: 'row', marginTop: 2 },
    modeIcon: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.background,
    },
    cardTitleBlock: { flex: 1 },
    cardProvider: { ...Typography.labelLarge, fontSize: 14 },
    cardProviderSub: { fontWeight: '400', color: Colors.textMuted },
    cardTerminal: { ...Typography.bodySmall, marginTop: 2, fontSize: 11 },
    cardPrice: { ...Typography.headingSmall, fontSize: 17 },

    cardRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    timeBlock: { alignItems: 'center', minWidth: 60 },
    timeText: { ...Typography.headingSmall, fontSize: 18 },
    cityText: { ...Typography.bodySmall, marginTop: 2, maxWidth: 70 },
    timelineCenter: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm },
    durationLabel: { ...Typography.bodySmall, fontWeight: '600', marginBottom: 4 },
    timelineLine: {
        width: '100%', height: 2, backgroundColor: Colors.border,
        borderRadius: 1, flexDirection: 'row', alignItems: 'center',
    },
    timelineSegment: { height: '100%', backgroundColor: Colors.textPrimary, borderRadius: 1 },
    transferDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.textPrimary,
        position: 'absolute', right: -3, top: -2,
    },
    stopsLabel: { ...Typography.caption, marginTop: 4 },

    cardBottomRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    tagsScroll: { flex: 1 },
    tagBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
        backgroundColor: Colors.accentLight, marginRight: 5,
    },
    tagBadgeGreen: { backgroundColor: Colors.successLight },
    tagBadgeBlue: { backgroundColor: '#EEF4FF' },
    tagText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
    tagTextGreen: { color: Colors.success },
    tagTextBlue: { color: '#2A5AC8' },
    classChip: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, marginRight: 5,
    },
    classChipText: { fontSize: 10, fontWeight: '500', color: Colors.textMuted },
    ecoChip: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full,
        backgroundColor: Colors.successLight, borderWidth: 1, borderColor: '#C8E6D4',
    },
    ecoText: { fontSize: 10, fontWeight: '600', color: Colors.success },

    terminalRow: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    },
    terminalText: { ...Typography.bodySmall, fontSize: 10, flex: 1 },

    cardArrow: { position: 'absolute', right: Spacing.md, bottom: Spacing.md },

    skeletonLine: {
        backgroundColor: Colors.border, borderRadius: Radius.sm,
    },

    loadingBar: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingVertical: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.sm,
    },
    loadingText: { ...Typography.bodySmall, fontWeight: '500' },

    emptyBox: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { ...Typography.headingMedium },
    emptyText: { ...Typography.bodyMedium, textAlign: 'center', paddingHorizontal: Spacing.lg },
    clearFilterBtn: {
        marginTop: Spacing.md, paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.textPrimary,
    },
    clearFilterText: { ...Typography.labelLarge },
});
