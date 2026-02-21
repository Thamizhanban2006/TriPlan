import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useJourney } from '../context/JourneyContext';

const PROVIDER_URLS: Record<string, string> = {
    indigo: 'https://www.goindigo.in',
    'air india': 'https://www.airindia.in',
    spicejet: 'https://www.spicejet.com',
    akasa: 'https://www.akasaair.com',
    irctc: 'https://www.irctc.co.in',
    'vande bharat': 'https://www.irctc.co.in',
    shatabdi: 'https://www.irctc.co.in',
    rajdhani: 'https://www.irctc.co.in',
    duronto: 'https://www.irctc.co.in',
    tnstc: 'https://www.tnstc.in',
    setc: 'https://www.tnstc.in',
    ksrtc: 'https://www.ksrtc.in',
    msrtc: 'https://www.msrtc.gov.in',
    apsrtc: 'https://www.apsrtc.gov.in',
    tsrtc: 'https://www.tsrtc.telangana.gov.in',
    rsrtc: 'https://rsrtc.rajasthan.gov.in',
    gsrtc: 'https://www.gsrtc.in',
    upsrtc: 'https://upsrtc.up.gov.in',
    redbus: 'https://www.redbus.in',
    intrcity: 'https://www.intrcity.com',
    nuego: 'https://www.nuego.in',
    kallada: 'https://kalladatravels.com',
    ola: 'https://www.olacabs.com',
    uber: 'https://www.uber.com',
    rapido: 'https://www.rapido.bike',
};

function getProviderUrl(provider: string): string {
    const key = provider.toLowerCase();
    for (const [k, url] of Object.entries(PROVIDER_URLS)) {
        if (key.includes(k)) return url;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(provider + ' booking')}`;
}

const MODE_ICON: Record<string, any> = {
    flight: 'airplane',
    train: 'train',
    bus: 'bus',
    ferry: 'boat',
    rideshare: 'car',
    metro: 'subway',
};

export default function BookingScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();
    const route = state.selectedRoute;

    const checkAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(checkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    if (!route) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
                    <Text style={styles.errorText}>No booking data</Text>
                    <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.homeBtn}>
                        <Text style={styles.homeBtnText}>Go to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const firstLeg = route.legs[0];
    const lastLeg = route.legs[route.legs.length - 1];
    const passengerCount = state.searchParams?.passengers || 1;
    const totalPrice = route.price.min * passengerCount;

    const handleBookLeg = (provider: string) => {
        Linking.openURL(getProviderUrl(provider));
    };

    const handleHome = () => {
        dispatch({ type: 'CLEAR_RESULTS' });
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Summary</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Success animation */}
                <Animated.View style={[styles.successBlock, { transform: [{ scale: checkAnim }] }]}>
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={38} color={Colors.textInverse} />
                    </View>
                    <Text style={styles.successTitle}>Route Confirmed!</Text>
                    <Text style={styles.successSub}>Complete booking on each provider's site below</Text>
                </Animated.View>

                {/* Journey summary card */}
                <Animated.View style={[styles.journeyCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.journeyRouteRow}>
                        <View>
                            <Text style={styles.bigTime}>{firstLeg.departureTime}</Text>
                            <Text style={styles.bigCity}>{firstLeg.from}</Text>
                        </View>
                        <View style={styles.journeyMid}>
                            <Text style={styles.journeyDur}>{route.totalDuration}</Text>
                            <View style={styles.journeyLine} />
                            <Text style={styles.journeyLegs}>{route.legs.length} leg{route.legs.length > 1 ? 's' : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.bigTime}>{lastLeg.arrivalTime}</Text>
                            <Text style={styles.bigCity}>{lastLeg.to}</Text>
                        </View>
                    </View>
                    <View style={styles.journeyMeta}>
                        <View style={styles.metaChip}>
                            <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                            <Text style={styles.metaChipText}>{passengerCount} pax</Text>
                        </View>
                        <View style={styles.metaChip}>
                            <Ionicons name="wallet-outline" size={13} color={Colors.textMuted} />
                            <Text style={styles.metaChipText}>₹{totalPrice.toLocaleString()}+</Text>
                        </View>
                        <View style={styles.metaChip}>
                            <Ionicons name="leaf-outline" size={13} color={Colors.success} />
                            <Text style={styles.metaChipText}>{route.carbonKg} kg CO₂</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Per-leg booking links */}
                <Text style={styles.sectionTitle}>BOOK EACH LEG</Text>
                {route.legs.map((leg, i) => (
                    <View key={i} style={styles.legBookCard}>
                        <View style={styles.legBookHeader}>
                            <View style={styles.legModeIcon}>
                                <Ionicons name={MODE_ICON[leg.mode] || 'navigate'} size={16} color={Colors.textPrimary} />
                            </View>
                            <View style={styles.legBookInfo}>
                                <Text style={styles.legBookProvider}>{leg.provider}</Text>
                                <Text style={styles.legBookRoute}>
                                    {leg.from} → {leg.to}  ·  {leg.departureTime}–{leg.arrivalTime}
                                </Text>
                                {(leg.fromTerminal || leg.toTerminal) && (
                                    <Text style={styles.legBookTerminal} numberOfLines={1}>
                                        {leg.fromTerminal || leg.toTerminal}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.bookLegBtn}
                            onPress={() => handleBookLeg(leg.provider)}
                        >
                            <Text style={styles.bookLegBtnText}>Book on {leg.provider.split(' ')[0]}</Text>
                            <Ionicons name="open-outline" size={14} color={Colors.textInverse} />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Passengers summary */}
                {state.passengers.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>PASSENGERS</Text>
                        <View style={styles.passengersCard}>
                            {state.passengers.map((p: any, i: number) => (
                                <View key={i} style={[styles.paxRow, i < state.passengers.length - 1 && styles.paxRowBorder]}>
                                    <View style={styles.paxNum}>
                                        <Text style={styles.paxNumText}>{i + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.paxName}>{p.name || 'Passenger ' + (i + 1)}</Text>
                                        {p.age ? <Text style={styles.paxAge}>{p.age} yrs · {p.gender}</Text> : null}
                                    </View>
                                    {p.phone ? (
                                        <Text style={styles.paxPhone}>{p.phone}</Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleBookLeg(firstLeg.provider)}>
                    <Ionicons name="globe-outline" size={18} color={Colors.textInverse} />
                    <Text style={styles.primaryBtnText}>Book All Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.homeBtn2} onPress={handleHome}>
                    <Ionicons name="home-outline" size={18} color={Colors.textPrimary} />
                    <Text style={styles.homeBtn2Text}>Back to Home</Text>
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
    headerTitle: { ...Typography.headingSmall },

    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md },

    successBlock: { alignItems: 'center', paddingVertical: Spacing.xl },
    checkCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md, ...Shadow.medium,
    },
    successTitle: { ...Typography.headingLarge },
    successSub: { ...Typography.bodyMedium, textAlign: 'center', marginTop: 4 },

    journeyCard: {
        backgroundColor: Colors.accent, borderRadius: Radius.xl,
        padding: Spacing.md, marginBottom: Spacing.lg,
    },
    journeyRouteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    bigTime: { fontSize: 26, fontWeight: '700', color: Colors.textInverse },
    bigCity: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    journeyMid: { flex: 1, alignItems: 'center' },
    journeyDur: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    journeyLine: { width: 60, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
    journeyLegs: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    journeyMeta: { flexDirection: 'row', gap: Spacing.sm },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    },
    metaChipText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

    sectionTitle: { ...Typography.labelSmall, letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md },

    legBookCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    legBookHeader: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    legModeIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
    },
    legBookInfo: { flex: 1 },
    legBookProvider: { ...Typography.labelLarge },
    legBookRoute: { ...Typography.bodySmall, marginTop: 2 },
    legBookTerminal: { ...Typography.bodySmall, fontSize: 10, marginTop: 2, color: Colors.textMuted },
    bookLegBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
        backgroundColor: Colors.accent, paddingVertical: 10, borderRadius: Radius.full,
    },
    bookLegBtnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 13 },

    passengersCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    paxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    paxRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    paxNum: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accentLight,
        alignItems: 'center', justifyContent: 'center',
    },
    paxNumText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
    paxName: { ...Typography.labelLarge },
    paxAge: { ...Typography.bodySmall, marginTop: 1 },
    paxPhone: { ...Typography.bodySmall },

    bottomCTA: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.background, padding: Spacing.md,
        borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.large, gap: Spacing.sm,
    },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.accent, paddingVertical: 15, borderRadius: Radius.full, gap: Spacing.sm,
    },
    primaryBtnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 16 },
    homeBtn2: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: Radius.full, gap: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    homeBtn2Text: { ...Typography.labelLarge, fontSize: 14 },

    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorText: { ...Typography.headingMedium },
    homeBtn: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
        backgroundColor: Colors.accent,
    },
    homeBtnText: { ...Typography.labelLarge, color: Colors.textInverse },
});
