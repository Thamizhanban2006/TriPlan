import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
    Dimensions,
    Modal,
    Animated,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useJourney } from '../context/JourneyContext';
import { searchRoutes } from '../services/groq';

const { width, height } = Dimensions.get('window');

const TRANSPORT_MODES = [
    { id: 'flight', label: 'Flight', icon: 'airplane' as const },
    { id: 'train', label: 'Train', icon: 'train' as const },
    { id: 'bus', label: 'Bus', icon: 'bus' as const },
    { id: 'ferry', label: 'boat' as any, icon: 'boat' as const },
    { id: 'rideshare', label: 'Cab', icon: 'car' as const },
];

const PREFERENCES = [
    { id: 'cost', label: 'Cheapest', icon: 'wallet-outline' as const },
    { id: 'speed', label: 'Fastest', icon: 'flash-outline' as const },
    { id: 'comfort', label: 'Comfort', icon: 'star-outline' as const },
    { id: 'eco', label: 'Eco', icon: 'leaf-outline' as const },
];

const POPULAR_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Goa',
    'Kochi', 'Lucknow', 'Chandigarh', 'Bhopal', 'Indore',
    'Surat', 'Vadodara', 'Nagpur', 'Patna', 'Coimbatore',
];

function getTodayString() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string) {
    if (!dateStr) return 'Select date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HomeScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState(getTodayString());
    const [passengers, setPassengers] = useState(1);
    const [selectedModes, setSelectedModes] = useState<string[]>([]);
    const [preference, setPreference] = useState<'cost' | 'speed' | 'comfort' | 'eco'>('cost');
    const [cityPickerTarget, setCityPickerTarget] = useState<'from' | 'to' | null>(null);
    const [citySearch, setCitySearch] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const filteredCities = POPULAR_CITIES.filter(c =>
        c.toLowerCase().includes(citySearch.toLowerCase())
    );

    const handleSwap = () => {
        setFrom(to);
        setTo(from);
    };

    const toggleMode = (id: string) => {
        setSelectedModes(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleSearch = async () => {
        if (!from || !to) return;
        const params = {
            from,
            to,
            date,
            passengers,
            preference,
            modes: selectedModes,
        };
        dispatch({ type: 'SET_SEARCH_PARAMS', payload: params });
        dispatch({ type: 'SET_SEARCHING', payload: true });
        dispatch({ type: 'ADD_RECENT_SEARCH', payload: { from, to, date } });
        router.push('/results');
        try {
            const routes = await searchRoutes(params);
            dispatch({ type: 'SET_RESULTS', payload: routes });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch routes. Please try again.' });
        }
    };

    const canSearch = from.length > 0 && to.length > 0;

    // Generate date options (next 30 days)
    const dateOptions = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Plan your journey</Text>
                        <Text style={styles.subGreeting}>Find the best route for you</Text>
                    </View>
                    <TouchableOpacity style={styles.avatarBtn}>
                        <Ionicons name="person-outline" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Search Card */}
                <View style={styles.searchCard}>
                    {/* From / To */}
                    <View style={styles.routeRow}>
                        <View style={styles.routeInputs}>
                            {/* From */}
                            <TouchableOpacity
                                style={styles.routeField}
                                onPress={() => { setCityPickerTarget('from'); setCitySearch(''); }}
                            >
                                <View style={styles.routeDot} />
                                <View style={styles.routeTextArea}>
                                    <Text style={styles.routeLabel}>FROM</Text>
                                    <Text style={[styles.routeCity, !from && styles.routePlaceholder]}>
                                        {from || 'Origin city'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.routeDividerLine} />

                            {/* To */}
                            <TouchableOpacity
                                style={styles.routeField}
                                onPress={() => { setCityPickerTarget('to'); setCitySearch(''); }}
                            >
                                <View style={[styles.routeDot, styles.routeDotDest]} />
                                <View style={styles.routeTextArea}>
                                    <Text style={styles.routeLabel}>TO</Text>
                                    <Text style={[styles.routeCity, !to && styles.routePlaceholder]}>
                                        {to || 'Destination city'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Swap Button */}
                        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
                            <Ionicons name="swap-vertical" size={18} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* Date + Passengers */}
                    <View style={styles.metaRow}>
                        <TouchableOpacity
                            style={styles.metaField}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                            <View style={styles.metaTextArea}>
                                <Text style={styles.metaLabel}>DATE</Text>
                                <Text style={styles.metaValue}>{formatDateDisplay(date)}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.metaVertDivider} />

                        <View style={styles.metaField}>
                            <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                            <View style={styles.metaTextArea}>
                                <Text style={styles.metaLabel}>PASSENGERS</Text>
                                <View style={styles.passengerCounter}>
                                    <TouchableOpacity
                                        onPress={() => setPassengers(Math.max(1, passengers - 1))}
                                        style={styles.counterBtn}
                                    >
                                        <Ionicons name="remove" size={14} color={Colors.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.passengerCount}>{passengers}</Text>
                                    <TouchableOpacity
                                        onPress={() => setPassengers(Math.min(9, passengers + 1))}
                                        style={styles.counterBtn}
                                    >
                                        <Ionicons name="add" size={14} color={Colors.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Transport Modes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transport Mode</Text>
                    <View style={styles.modeRow}>
                        <TouchableOpacity
                            style={[styles.modeChip, selectedModes.length === 0 && styles.modeChipActive]}
                            onPress={() => setSelectedModes([])}
                        >
                            <Text style={[styles.modeChipText, selectedModes.length === 0 && styles.modeChipTextActive]}>
                                All
                            </Text>
                        </TouchableOpacity>
                        {TRANSPORT_MODES.map(mode => (
                            <TouchableOpacity
                                key={mode.id}
                                style={[styles.modeChip, selectedModes.includes(mode.id) && styles.modeChipActive]}
                                onPress={() => toggleMode(mode.id)}
                            >
                                <Ionicons
                                    name={mode.icon}
                                    size={14}
                                    color={selectedModes.includes(mode.id) ? Colors.textInverse : Colors.textSecondary}
                                />
                                <Text style={[
                                    styles.modeChipText,
                                    selectedModes.includes(mode.id) && styles.modeChipTextActive,
                                ]}>
                                    {mode.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Preference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Optimise for</Text>
                    <View style={styles.prefRow}>
                        {PREFERENCES.map(pref => (
                            <TouchableOpacity
                                key={pref.id}
                                style={[styles.prefCard, preference === pref.id && styles.prefCardActive]}
                                onPress={() => setPreference(pref.id as any)}
                            >
                                <Ionicons
                                    name={pref.icon}
                                    size={20}
                                    color={preference === pref.id ? Colors.textInverse : Colors.textSecondary}
                                />
                                <Text style={[styles.prefLabel, preference === pref.id && styles.prefLabelActive]}>
                                    {pref.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Search Button */}
                <TouchableOpacity
                    style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
                    onPress={handleSearch}
                    disabled={!canSearch}
                    activeOpacity={0.85}
                >
                    <Ionicons name="search" size={18} color={Colors.textInverse} />
                    <Text style={styles.searchBtnText}>Find Routes</Text>
                </TouchableOpacity>

                {/* Recent Searches */}
                {state.recentSearches.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                        {state.recentSearches.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.recentCard}
                                onPress={() => {
                                    setFrom(s.from);
                                    setTo(s.to);
                                    setDate(s.date);
                                }}
                            >
                                <View style={styles.recentIconBox}>
                                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                                </View>
                                <View style={styles.recentText}>
                                    <Text style={styles.recentRoute}>{s.from} → {s.to}</Text>
                                    <Text style={styles.recentDate}>{formatDateDisplay(s.date)}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Popular Destinations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Popular Routes</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popScroll}>
                        {[
                            { from: 'Mumbai', to: 'Goa', icon: 'airplane' as const },
                            { from: 'Delhi', to: 'Jaipur', icon: 'train' as const },
                            { from: 'Bangalore', to: 'Chennai', icon: 'bus' as const },
                            { from: 'Hyderabad', to: 'Kochi', icon: 'airplane' as const },
                        ].map((route, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.popCard}
                                onPress={() => { setFrom(route.from); setTo(route.to); }}
                            >
                                <View style={styles.popIconBox}>
                                    <Ionicons name={route.icon} size={18} color={Colors.textPrimary} />
                                </View>
                                <Text style={styles.popFrom}>{route.from}</Text>
                                <View style={styles.popArrow}>
                                    <Ionicons name="arrow-forward" size={10} color={Colors.textMuted} />
                                </View>
                                <Text style={styles.popTo}>{route.to}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* City Picker Modal */}
            <Modal visible={!!cityPickerTarget} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Select {cityPickerTarget === 'from' ? 'Origin' : 'Destination'}
                        </Text>
                        <TouchableOpacity onPress={() => setCityPickerTarget(null)} style={styles.modalClose}>
                            <Ionicons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.citySearchBox}>
                        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
                        <TextInput
                            style={styles.citySearchInput}
                            placeholder="Search city..."
                            placeholderTextColor={Colors.textMuted}
                            value={citySearch}
                            onChangeText={setCitySearch}
                            autoFocus
                        />
                    </View>
                    <ScrollView>
                        {filteredCities.map(city => (
                            <TouchableOpacity
                                key={city}
                                style={styles.cityItem}
                                onPress={() => {
                                    if (cityPickerTarget === 'from') setFrom(city);
                                    else setTo(city);
                                    setCityPickerTarget(null);
                                }}
                            >
                                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.cityItemText}>{city}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Date Picker Modal */}
            <Modal visible={showDatePicker} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Date</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.modalClose}>
                            <Ionicons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView>
                        {dateOptions.map(d => {
                            const dateObj = new Date(d);
                            const isToday = d === getTodayString();
                            const isSelected = d === date;
                            return (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                                    onPress={() => { setDate(d); setShowDatePicker(false); }}
                                >
                                    <View>
                                        <Text style={[styles.dateItemMain, isSelected && styles.dateItemMainSelected]}>
                                            {dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </Text>
                                        {isToday && <Text style={styles.todayBadge}>Today</Text>}
                                    </View>
                                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={Colors.textPrimary} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    greeting: { ...Typography.headingLarge },
    subGreeting: { ...Typography.bodyMedium, marginTop: 2 },
    avatarBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },

    searchCard: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.medium,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
    },

    routeRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
    routeInputs: { flex: 1 },
    routeField: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    routeDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: Colors.textPrimary, marginRight: 12,
    },
    routeDotDest: { backgroundColor: 'transparent', borderWidth: 2, borderColor: Colors.textPrimary },
    routeTextArea: { flex: 1 },
    routeLabel: { ...Typography.caption, letterSpacing: 0.8, color: Colors.textMuted },
    routeCity: { ...Typography.headingSmall, marginTop: 2 },
    routePlaceholder: { color: Colors.textMuted, fontWeight: '400' },
    routeDividerLine: { height: 1, backgroundColor: Colors.border, marginLeft: 22, marginVertical: 4 },

    swapBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border, marginLeft: Spacing.sm,
    },

    divider: { height: 1, backgroundColor: Colors.border },

    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaField: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
    metaTextArea: { flex: 1 },
    metaLabel: { ...Typography.caption, letterSpacing: 0.8, color: Colors.textMuted },
    metaValue: { ...Typography.labelLarge, marginTop: 2 },
    metaVertDivider: { width: 1, height: 36, backgroundColor: Colors.border },

    passengerCounter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
    counterBtn: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    passengerCount: { ...Typography.labelLarge, minWidth: 16, textAlign: 'center' },

    section: { marginBottom: Spacing.lg },
    sectionTitle: { ...Typography.labelSmall, marginBottom: Spacing.sm, letterSpacing: 1 },

    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    modeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    modeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    modeChipText: { ...Typography.labelSmall, fontSize: 12, color: Colors.textSecondary },
    modeChipTextActive: { color: Colors.textInverse },

    prefRow: { flexDirection: 'row', gap: Spacing.sm },
    prefCard: {
        flex: 1, alignItems: 'center', paddingVertical: 12,
        borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
        backgroundColor: Colors.surface, gap: 4,
    },
    prefCardActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    prefLabel: { ...Typography.bodySmall, fontSize: 11, color: Colors.textSecondary },
    prefLabelActive: { color: Colors.textInverse },

    searchBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.accent, paddingVertical: 16,
        borderRadius: Radius.full, gap: Spacing.sm, marginBottom: Spacing.lg,
        ...Shadow.medium,
    },
    searchBtnDisabled: { opacity: 0.4 },
    searchBtnText: { ...Typography.headingSmall, color: Colors.textInverse, fontSize: 16 },

    recentCard: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
        gap: Spacing.sm,
    },
    recentIconBox: {
        width: 36, height: 36, borderRadius: Radius.sm,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    recentText: { flex: 1 },
    recentRoute: { ...Typography.labelLarge },
    recentDate: { ...Typography.bodySmall, marginTop: 2 },

    popScroll: { marginHorizontal: -Spacing.md, paddingLeft: Spacing.md },
    popCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.lg,
        padding: Spacing.md, marginRight: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border,
        alignItems: 'center', minWidth: 110,
    },
    popIconBox: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    popFrom: { ...Typography.labelLarge, fontSize: 13, marginBottom: 2 },
    popArrow: { marginVertical: 2 },
    popTo: { ...Typography.bodySmall, fontSize: 12 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: Colors.background },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    modalTitle: { ...Typography.headingMedium },
    modalClose: { padding: Spacing.xs },

    citySearchBox: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        margin: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
        backgroundColor: Colors.surface, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border,
    },
    citySearchInput: { flex: 1, ...Typography.bodyLarge, color: Colors.textPrimary },

    cityItem: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    cityItemText: { ...Typography.bodyLarge },

    dateItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    dateItemSelected: { backgroundColor: Colors.accentLight },
    dateItemMain: { ...Typography.bodyLarge },
    dateItemMainSelected: { fontWeight: '600', color: Colors.textPrimary },
    todayBadge: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
});
