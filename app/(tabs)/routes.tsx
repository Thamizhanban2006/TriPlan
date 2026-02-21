import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Modal, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useJourney } from '../../context/JourneyContext';
import { searchRoutes } from '../../services/groq';

const POPULAR_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata',
    'Pune', 'Ahmedabad', 'Jaipur', 'Goa', 'Kochi', 'Lucknow',
    'Coimbatore', 'Madurai', 'Surat', 'Nagpur', 'Varanasi', 'Ranchi',
    'Visakhapatnam', 'Thiruvananthapuram', 'Chandigarh', 'Bhopal', 'Indore', 'Amritsar',
];

const TRANSPORT_MODES = [
    { id: 'flight', label: 'Flight', icon: 'airplane' as const },
    { id: 'train', label: 'Train', icon: 'train' as const },
    { id: 'bus', label: 'Bus', icon: 'bus' as const },
    { id: 'ferry', label: 'Ferry', icon: 'boat' as const },
    { id: 'rideshare', label: 'Cab', icon: 'car' as const },
];

const PREFERENCES = [
    { id: 'cost', label: 'Cheapest', icon: 'wallet-outline' as const },
    { id: 'speed', label: 'Fastest', icon: 'flash-outline' as const },
    { id: 'comfort', label: 'Comfort', icon: 'star-outline' as const },
    { id: 'eco', label: 'Eco', icon: 'leaf-outline' as const },
];

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string) {
    if (!dateStr) return 'Select date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RoutesSearchTab() {
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

    const toggleMode = (id: string) => {
        setSelectedModes(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleSwap = () => {
        const tmp = from;
        setFrom(to);
        setTo(tmp);
    };

    const handleSearch = async () => {
        if (!from || !to) return;
        const params = { from, to, date, passengers, preference, modes: selectedModes };
        dispatch({ type: 'SET_SEARCH_PARAMS', payload: params });
        dispatch({ type: 'SET_SEARCHING', payload: true });
        dispatch({ type: 'ADD_RECENT_SEARCH', payload: { from, to, date } });
        router.push('/results');
        try {
            const routes = await searchRoutes(params);
            dispatch({ type: 'SET_RESULTS', payload: routes });
        } catch {
            dispatch({ type: 'SET_ERROR', payload: 'Could not fetch routes. Please try again.' });
        }
    };

    const canSearch = from.length > 0 && to.length > 0;

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
                    <Text style={styles.title}>Plan a Journey</Text>
                    <Text style={styles.subtitle}>Buses · Trains · Flights · More</Text>
                </View>

                {/* Route Card */}
                <View style={styles.routeCard}>
                    <TouchableOpacity
                        style={styles.routeField}
                        onPress={() => { setCityPickerTarget('from'); setCitySearch(''); }}
                    >
                        <View style={styles.dotOrig} />
                        <View style={styles.routeFieldContent}>
                            <Text style={styles.routeFieldLabel}>FROM</Text>
                            <Text style={[styles.routeCity, !from && styles.routePlaceholder]}>
                                {from || 'Origin city'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
                        <Ionicons name="swap-vertical" size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.routeDivider} />

                    <TouchableOpacity
                        style={styles.routeField}
                        onPress={() => { setCityPickerTarget('to'); setCitySearch(''); }}
                    >
                        <View style={styles.dotDest} />
                        <View style={styles.routeFieldContent}>
                            <Text style={styles.routeFieldLabel}>TO</Text>
                            <Text style={[styles.routeCity, !to && styles.routePlaceholder]}>
                                {to || 'Destination city'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Date + Passengers */}
                <View style={styles.metaRow}>
                    <TouchableOpacity style={styles.metaCard} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                        <View>
                            <Text style={styles.metaLabel}>DATE</Text>
                            <Text style={styles.metaValue}>{formatDateDisplay(date)}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.metaCard}>
                        <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
                        <View>
                            <Text style={styles.metaLabel}>PASSENGERS</Text>
                            <View style={styles.counterRow}>
                                <TouchableOpacity style={styles.counterBtn} onPress={() => setPassengers(Math.max(1, passengers - 1))}>
                                    <Ionicons name="remove" size={14} color={Colors.textPrimary} />
                                </TouchableOpacity>
                                <Text style={styles.counterVal}>{passengers}</Text>
                                <TouchableOpacity style={styles.counterBtn} onPress={() => setPassengers(Math.min(9, passengers + 1))}>
                                    <Ionicons name="add" size={14} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Transport Modes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MODE OF TRAVEL</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
                        <TouchableOpacity
                            style={[styles.modeChip, selectedModes.length === 0 && styles.modeChipActive]}
                            onPress={() => setSelectedModes([])}
                        >
                            <Text style={[styles.modeChipText, selectedModes.length === 0 && styles.modeChipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {TRANSPORT_MODES.map(m => (
                            <TouchableOpacity
                                key={m.id}
                                style={[styles.modeChip, selectedModes.includes(m.id) && styles.modeChipActive]}
                                onPress={() => toggleMode(m.id)}
                            >
                                <Ionicons name={m.icon} size={14} color={selectedModes.includes(m.id) ? Colors.textInverse : Colors.textSecondary} />
                                <Text style={[styles.modeChipText, selectedModes.includes(m.id) && styles.modeChipTextActive]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>OPTIMISE FOR</Text>
                    <View style={styles.prefRow}>
                        {PREFERENCES.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.prefCard, preference === p.id && styles.prefCardActive]}
                                onPress={() => setPreference(p.id as any)}
                            >
                                <Ionicons name={p.icon} size={20} color={preference === p.id ? Colors.textInverse : Colors.textSecondary} />
                                <Text style={[styles.prefLabel, preference === p.id && styles.prefLabelActive]}>{p.label}</Text>
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
                    <Text style={styles.searchBtnText}>Search Routes</Text>
                </TouchableOpacity>

                {/* Recent */}
                {state.recentSearches.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
                        {state.recentSearches.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.recentRow}
                                onPress={() => { setFrom(s.from); setTo(s.to); setDate(s.date); }}
                            >
                                <View style={styles.recentIconBox}>
                                    <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
                                </View>
                                <View style={styles.recentTextArea}>
                                    <Text style={styles.recentRoute}>{s.from} → {s.to}</Text>
                                    <Text style={styles.recentDate}>{formatDateDisplay(s.date)}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* City Picker Modal */}
            <Modal visible={!!cityPickerTarget} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {cityPickerTarget === 'from' ? 'From City' : 'To City'}
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
                            const isSelected = d === date;
                            const isToday = d === getTodayString();
                            const dateObj = new Date(d);
                            return (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                                    onPress={() => { setDate(d); setShowDatePicker(false); }}
                                >
                                    <View>
                                        <Text style={[styles.dateItemMain, isSelected && { fontWeight: '600' }]}>
                                            {dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </Text>
                                        {isToday && <Text style={styles.todayLabel}>Today</Text>}
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

    header: { marginBottom: Spacing.lg },
    title: { ...Typography.headingLarge },
    subtitle: { ...Typography.bodyMedium, marginTop: 4 },

    routeCard: {
        backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, ...Shadow.medium,
        marginBottom: Spacing.md, overflow: 'hidden', position: 'relative',
    },
    routeField: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
    dotOrig: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.textPrimary },
    dotDest: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: Colors.textPrimary },
    routeFieldContent: { flex: 1 },
    routeFieldLabel: { ...Typography.caption, letterSpacing: 0.8, color: Colors.textMuted },
    routeCity: { ...Typography.headingSmall, marginTop: 2 },
    routePlaceholder: { color: Colors.textMuted, fontWeight: '400' as const },
    routeDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 38 },
    swapBtn: {
        position: 'absolute', right: Spacing.md, top: '50%',
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border, marginTop: -17,
        zIndex: 10,
    },

    metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    metaCard: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    metaLabel: { ...Typography.caption, letterSpacing: 0.8, color: Colors.textMuted },
    metaValue: { ...Typography.labelLarge, fontSize: 13, marginTop: 2 },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
    counterBtn: {
        width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accentLight,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    counterVal: { ...Typography.labelLarge, minWidth: 16, textAlign: 'center' },

    section: { marginBottom: Spacing.lg },
    sectionTitle: { ...Typography.labelSmall, letterSpacing: 1, marginBottom: Spacing.sm },

    modeRow: { gap: Spacing.sm, paddingRight: Spacing.md },
    modeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
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
    searchBtnDisabled: { opacity: 0.38 },
    searchBtnText: { ...Typography.headingSmall, color: Colors.textInverse, fontSize: 16 },

    recentRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    recentIconBox: {
        width: 34, height: 34, borderRadius: Radius.sm,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    recentTextArea: { flex: 1 },
    recentRoute: { ...Typography.labelLarge },
    recentDate: { ...Typography.bodySmall, marginTop: 2 },

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
    todayLabel: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
});
