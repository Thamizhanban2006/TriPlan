import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Animated, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useJourney } from '../context/JourneyContext';
import { usePivot } from '../context/PivotContext';
import { PivotGuardBanner } from '../components/PivotGuardBanner';
import { GuardedLeg } from '../services/pivotEngine';
import { geocodeSearch } from '../services/ors';
import type { JourneyLeg } from '../services/groq';

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

// ─── Convert JourneyLegs to GuardedLegs for the Pivot Engine ─────────────────

async function buildGuardedLegs(legs: JourneyLeg[]): Promise<GuardedLeg[]> {
    const result: GuardedLeg[] = [];
    for (let i = 0; i < legs.length - 1; i++) {
        const currentLeg = legs[i];
        const nextLeg = legs[i + 1];
        // The connection point is where the next leg departs from
        const connectionQuery = nextLeg.fromTerminal || nextLeg.from;
        let lat = 13.0827; // fallback: Chennai Central
        let lng = 80.2707;
        try {
            const geo = await geocodeSearch(connectionQuery);
            if (geo.length > 0) {
                lat = geo[0].lat;
                lng = geo[0].lng;
            }
        } catch { /* use fallback */ }
        result.push({
            connectionName: nextLeg.fromTerminal || nextLeg.from,
            connectionLat: lat,
            connectionLng: lng,
            departureTime: nextLeg.departureTime,
            nextMode: nextLeg.mode as GuardedLeg['nextMode'],
            nextProvider: nextLeg.provider,
        });
    }
    return result;
}

export default function BookingScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();
    const { startGuardian, stopGuardian, status: guardianStatus } = usePivot();
    const route = state.selectedRoute;

    const [guardianLoading, setGuardianLoading] = useState(false);
    const [bookingState, setBookingState] = useState<'review' | 'processing' | 'success'>('review');
    const [processingStep, setProcessingStep] = useState(0);
    const [tickets, setTickets] = useState<{ seat: string, pnr: string, gate?: string, platform?: string }[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Record<number, boolean>>({});
    const [selectedMeals, setSelectedMeals] = useState<Record<number, boolean>>({});

    const checkAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // More detailed, leg-aware steps for the "Live" feel
    const STEPS = route ? [
        'Initializing secure transaction...',
        `Contacting ${route.legs[0]?.provider} servers...`,
        ...route.legs.map(l => `Confirming ${l.mode} leg: ${l.from} to ${l.to}...`),
        'Validating payment authorization...',
        'Generating digital PNRs and tickets...'
    ] : [];

    useEffect(() => {
        if (bookingState === 'review') {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start();
        }
    }, [bookingState]);

    const handleConfirmBooking = () => {
        setBookingState('processing');
        progressAnim.setValue(0);
        
        const totalDuration = 5000;
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: totalDuration,
            useNativeDriver: false
        }).start();

        let step = 0;
        const stepInterval = totalDuration / STEPS.length;
        
        const interval = setInterval(() => {
            step++;
            if (step < STEPS.length) {
                setProcessingStep(step);
            } else {
                clearInterval(interval);
                
                if (route) {
                    const newTickets = route.legs.map((l) => ({
                        seat: `${Math.floor(Math.random()*15)+1}${['A','B','C','D','E','F'][Math.floor(Math.random()*6)]}`,
                        pnr: `${l.provider.substring(0,2).toUpperCase()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                        gate: l.mode === 'flight' ? `${Math.floor(Math.random()*20)+1}${['A','B'][Math.floor(Math.random()*2)]}` : undefined,
                        platform: l.mode === 'train' ? `${Math.floor(Math.random()*12)+1}` : undefined
                    }));
                    setTickets(newTickets);
                }

                setBookingState('success');
                Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
            }
        }, stepInterval);
    };

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
    const basePrice = route.price.min * passengerCount;
    const taxes = Math.floor(basePrice * 0.12);
    const fees = 49 * passengerCount;
    const totalPrice = basePrice + taxes + fees;

    const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet'>('upi');
    const [insurance, setInsurance] = useState(true);

    const handleBookLeg = (provider: string) => {
        Linking.openURL(getProviderUrl(provider));
    };

    const handleHome = () => {
        stopGuardian();
        dispatch({ type: 'CLEAR_RESULTS' });
        router.replace('/(tabs)');
    };

    const handleStartGuardian = useCallback(async () => {
        if (!route) return;
        if (guardianStatus !== 'idle' && guardianStatus !== 'safe') {
            stopGuardian();
            return;
        }
        setGuardianLoading(true);
        try {
            const guardedLegs = await buildGuardedLegs(route.legs);
            if (guardedLegs.length > 0) {
                await startGuardian(guardedLegs);
            }
        } catch (e) {
            console.error('[BookingScreen] Guardian start failed:', e);
        } finally {
            setGuardianLoading(false);
        }
    }, [route, guardianStatus, startGuardian, stopGuardian]);

    const isGuardianActive = guardianStatus !== 'idle';

    if (bookingState === 'processing') {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.processingRoot}>
                    <View style={styles.loadingContainer}>
                        <Ionicons name="airplane-outline" size={60} color={Colors.accent} />
                    </View>
                    <Text style={styles.processingTitle}>Booking Journey...</Text>
                    <Text style={styles.processingSub}>{STEPS[processingStep]}</Text>
                    
                    <View style={styles.progressBar}>
                        <Animated.View style={[styles.progressFill, { 
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%']
                            })
                        }]} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Connection Guardian Overlay */}
            <PivotGuardBanner />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{bookingState === 'review' ? 'Review & Confirm' : 'Tickets Confirmed'}</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Success animation - only on success */}
                {bookingState === 'success' && (
                    <Animated.View style={[styles.successBlock, { transform: [{ scale: checkAnim }] }]}>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark" size={38} color={Colors.textInverse} />
                        </View>
                        <Text style={styles.successTitle}>Booking Successful!</Text>
                        <Text style={styles.successSub}>Your tickets are ready below.</Text>
                    </Animated.View>
                )}

                {/* Journey summary card */}
                {bookingState === 'review' && (
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
                                <Text style={styles.metaChipText}>₹{totalPrice.toLocaleString()}</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Per-leg summary - more refined for review */}
                <Text style={styles.sectionTitle}>{bookingState === 'review' ? 'CONFIGURE YOUR JOURNEY' : 'YOUR TICKETS'}</Text>
                {route.legs.map((leg, i) => (
                    <View key={i} style={[styles.legBookCard, bookingState === 'success' && styles.ticketCard]}>
                        {bookingState === 'success' && (
                            <View style={styles.ticketSideStrip}>
                                <Text style={styles.ticketSideText}>CONFIRMED</Text>
                            </View>
                        )}
                        <View style={styles.legBookHeader}>
                            <View style={styles.legModeIcon}>
                                <Ionicons name={MODE_ICON[leg.mode] || 'navigate'} size={16} color={Colors.textPrimary} />
                            </View>
                            <View style={styles.legBookInfo}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.legBookProvider}>{leg.provider}</Text>
                                    {bookingState === 'review' ? (
                                        <View style={styles.availabilityBadge}>
                                            <View style={styles.liveIndicator} />
                                            <Text style={styles.availabilityText}>{Math.floor(Math.random()*8)+3} Seats Left</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.paxAge}>{leg.mode.toUpperCase()}</Text>
                                    )
                                    }
                                </View>
                                <Text style={styles.legBookRoute}>
                                    {leg.from} → {leg.to}  ·  {leg.departureTime}–{leg.arrivalTime}
                                </Text>
                                {bookingState === 'review' && (
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                        <Text style={styles.legBookTerminal}>Non-stop · {leg.mode}</Text>
                                        <Text style={styles.legBookTerminal}>Refundable</Text>
                                    </View>
                                )}
                                {bookingState === 'success' && tickets[i] ? (
                                    <View style={styles.ticketMetaRow}>
                                        <View>
                                            <Text style={[styles.ticketLabel, { marginTop: 4 }]}>SEAT</Text>
                                            <Text style={styles.ticketSeatValue}>{tickets[i].seat}</Text>
                                        </View>
                                        <View>
                                            <Text style={[styles.ticketLabel, { marginTop: 4 }]}>PNR</Text>
                                            <Text style={styles.ticketPnrValue}>{tickets[i].pnr}</Text>
                                        </View>
                                        {tickets[i].gate && (
                                            <View>
                                                <Text style={[styles.ticketLabel, { marginTop: 4 }]}>GATE</Text>
                                                <Text style={styles.ticketSeatValue}>{tickets[i].gate}</Text>
                                            </View>
                                        )}
                                        {tickets[i].platform && (
                                            <View>
                                                <Text style={[styles.ticketLabel, { marginTop: 4 }]}>PLATFORM</Text>
                                                <Text style={styles.ticketSeatValue}>{tickets[i].platform}</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    (leg.fromTerminal || leg.toTerminal) && (
                                        <Text style={styles.legBookTerminal} numberOfLines={1}>
                                            📍 {leg.fromTerminal || leg.toTerminal}
                                        </Text>
                                    )
                                )}
                            </View>
                        </View>
                        {bookingState === 'review' ? (
                            <View style={styles.legConfigRow}>
                                <TouchableOpacity 
                                    style={[styles.configBtn, selectedSeats[i] && { backgroundColor: Colors.successLight }]}
                                    onPress={() => setSelectedSeats(prev => ({ ...prev, [i]: !prev[i] }))}
                                >
                                    <Ionicons 
                                        name={selectedSeats[i] ? "checkbox" : "grid-outline"} 
                                        size={14} 
                                        color={selectedSeats[i] ? Colors.success : Colors.accent} 
                                    />
                                    <Text style={[styles.configBtnText, selectedSeats[i] && { color: Colors.success }]}>
                                        {selectedSeats[i] ? 'Seat Selected' : 'Select Seat'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.configBtn, selectedMeals[i] && { backgroundColor: Colors.successLight }]}
                                    onPress={() => setSelectedMeals(prev => ({ ...prev, [i]: !prev[i] }))}
                                >
                                    <Ionicons 
                                        name={selectedMeals[i] ? "restaurant" : "fast-food-outline"} 
                                        size={14} 
                                        color={selectedMeals[i] ? Colors.success : Colors.accent} 
                                    />
                                    <Text style={[styles.configBtnText, selectedMeals[i] && { color: Colors.success }]}>
                                        {selectedMeals[i] ? 'Meal Added' : 'Add Meal'}
                                    </Text>
                                </TouchableOpacity>
                                <View style={{ flex: 1 }} />
                                <View style={styles.partnerBadge}>
                                    <Ionicons name="link" size={12} color={Colors.textMuted} />
                                    <Text style={styles.partnerBadgeText}>Direct Sync</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.ticketFooter}>
                                <View style={styles.barcodeStrip}>
                                    <View style={styles.barcodePlaceholder} />
                                    <Text style={styles.barcodeText}>TRIP-{i+1}-{route.totalDuration.replace(/\s+/g, '')}-{tickets[i]?.pnr}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                ))}

                {/* --- New Sections Only for Review State --- */}
                {bookingState === 'review' && (
                    <>
                        {/* Insurance Add-on */}
                        <View style={styles.addonCard}>
                            <View style={styles.addonInfo}>
                                <View style={styles.addonLabelRow}>
                                    <Ionicons name="medkit-outline" size={18} color={Colors.accent} />
                                    <Text style={styles.addonTitle}>Travel Insurance</Text>
                                </View>
                                <Text style={styles.addonDesc}>Covers medical emergencies, trip delays, and lost luggage up to ₹5,00,000.</Text>
                            </View>
                            <TouchableOpacity style={styles.addonToggle} onPress={() => setInsurance(!insurance)}>
                                <Ionicons 
                                    name={insurance ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={insurance ? Colors.accent : Colors.textMuted} 
                                />
                                <Text style={styles.addonPrice}>₹{99 * passengerCount}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Fare Breakup */}
                        <Text style={styles.sectionTitle}>FARE BREAKUP</Text>
                        <View style={styles.fareCard}>
                            <View style={styles.fareRow}>
                                <Text style={styles.fareLabel}>Base Fare ({passengerCount} Pax)</Text>
                                <Text style={styles.fareValue}>₹{basePrice.toLocaleString()}</Text>
                            </View>
                            <View style={styles.fareRow}>
                                <Text style={styles.fareLabel}>Taxes & VAT</Text>
                                <Text style={styles.fareValue}>₹{taxes.toLocaleString()}</Text>
                            </View>
                            <View style={styles.fareRow}>
                                <Text style={styles.fareLabel}>Handling Fees</Text>
                                <Text style={styles.fareValue}>₹{fees.toLocaleString()}</Text>
                            </View>
                            {insurance && (
                                <View style={styles.fareRow}>
                                    <Text style={styles.fareLabel}>Insurance Add-on</Text>
                                    <Text style={styles.fareValue}>₹{(99 * passengerCount).toLocaleString()}</Text>
                                </View>
                            )}
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Payable</Text>
                                <Text style={styles.totalValue}>₹{(totalPrice + (insurance ? 99 * passengerCount : 0)).toLocaleString()}</Text>
                            </View>
                        </View>

                        {/* Payment Selection */}
                        <Text style={styles.sectionTitle}>SELECT PAYMENT METHOD</Text>
                        <View style={styles.paymentContainer}>
                            <TouchableOpacity 
                                style={[styles.paymentOption, paymentMethod === 'upi' && styles.paymentOptionActive]}
                                onPress={() => setPaymentMethod('upi')}
                            >
                                <Ionicons name="flash-outline" size={20} color={paymentMethod === 'upi' ? Colors.textInverse : Colors.textPrimary} />
                                <Text style={[styles.paymentText, paymentMethod === 'upi' && styles.paymentTextActive]}>UPI / GPay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
                                onPress={() => setPaymentMethod('card')}
                            >
                                <Ionicons name="card-outline" size={20} color={paymentMethod === 'card' ? Colors.textInverse : Colors.textPrimary} />
                                <Text style={[styles.paymentText, paymentMethod === 'card' && styles.paymentTextActive]}>Card</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionActive]}
                                onPress={() => setPaymentMethod('wallet')}
                            >
                                <Ionicons name="wallet-outline" size={20} color={paymentMethod === 'wallet' ? Colors.textInverse : Colors.textPrimary} />
                                <Text style={[styles.paymentText, paymentMethod === 'wallet' && styles.paymentTextActive]}>Wallet</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* Passengers summary */}
                {state.passengers.length > 0 && bookingState === 'review' && (
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

                <View style={{ height: 180 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                {bookingState === 'review' ? (
                    <>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmBooking}>
                            <Ionicons name="card-outline" size={18} color={Colors.textInverse} />
                            <Text style={styles.primaryBtnText}>PAY ₹{(totalPrice + (insurance ? 99 * passengerCount : 0)).toLocaleString()}</Text>
                        </TouchableOpacity>

                        {/* Optional guardian activation before booking */}
                        {route.legs.length > 1 && (
                            <TouchableOpacity
                                style={[
                                    styles.guardianBtn,
                                    isGuardianActive && styles.guardianBtnActive,
                                ]}
                                onPress={handleStartGuardian}
                                disabled={guardianLoading}
                            >
                                <Ionicons
                                    name={isGuardianActive ? 'shield-checkmark' : 'shield-outline'}
                                    size={18}
                                    color={isGuardianActive ? Colors.success : Colors.textPrimary}
                                />
                                <Text style={[styles.guardianBtnText, isGuardianActive && { color: Colors.success }]}>
                                    {isGuardianActive ? 'Guardian Shield Active' : 'Add Pivot Connection Protection (₹149)'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <>
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openURL('https://triplan.example/download-all-tickets')}>
                            <Ionicons name="download-outline" size={18} color={Colors.textInverse} />
                            <Text style={styles.primaryBtnText}>Download All Tickets</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.homeBtn2} onPress={handleHome}>
                            <Ionicons name="home-outline" size={18} color={Colors.textPrimary} />
                            <Text style={styles.homeBtn2Text}>Go to Your Bookings</Text>
                        </TouchableOpacity>
                    </>
                )}
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
    
    // --- Detailed Leg Config (Simulated website steps) ---
    legConfigRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm,
        paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    configBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4, 
        backgroundColor: Colors.accentLight, paddingHorizontal: 10,
        paddingVertical: 6, borderRadius: Radius.full,
    },
    configBtnText: { ...Typography.labelSmall, color: Colors.accent, fontSize: 10 },
    
    availabilityBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.successLight, paddingHorizontal: 8,
        paddingVertical: 2, borderRadius: Radius.full,
    },
    liveIndicator: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success,
    },
    availabilityText: { fontSize: 10, fontWeight: '700', color: Colors.success },

    partnerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    partnerBadgeText: { ...Typography.bodySmall, fontSize: 10, fontStyle: 'italic', color: Colors.textMuted },

    // ── Fare & Payments ──────────────────────────────────────────────────────
    fareCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
    },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between' },
    fareLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
    fareValue: { ...Typography.labelLarge },
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs,
        paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    totalLabel: { ...Typography.labelLarge, fontSize: 16 },
    totalValue: { ...Typography.headingMedium, color: Colors.accent },

    addonCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
        marginTop: Spacing.md,
    },
    addonInfo: { flex: 1, gap: 4 },
    addonLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addonTitle: { ...Typography.labelLarge },
    addonDesc: { ...Typography.bodySmall, lineHeight: 16 },
    addonToggle: { alignItems: 'center', gap: 4, paddingLeft: Spacing.md },
    addonPrice: { fontSize: 11, fontWeight: '700', color: Colors.accent },

    paymentContainer: { flexDirection: 'row', gap: Spacing.sm },
    paymentOption: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    paymentOptionActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    paymentText: { ...Typography.labelSmall, color: Colors.textPrimary },
    paymentTextActive: { color: Colors.textInverse },

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

    // ── Journey Guardian button ───────────────────────────────────────────────
    guardianBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        paddingVertical: 12, borderRadius: Radius.full,
        borderWidth: 1.5, borderColor: Colors.borderDark,
        backgroundColor: Colors.surface,
    },
    guardianBtnActive: {
        borderColor: Colors.success,
        backgroundColor: Colors.successLight,
    },
    guardianBtnText: { ...Typography.labelLarge, fontSize: 14 },

    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorText: { ...Typography.headingMedium },
    homeBtn: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
        backgroundColor: Colors.accent,
    },
    homeBtnText: { ...Typography.labelLarge, color: Colors.textInverse },

    // ── Processing State ─────────────────────────────────────────────────────
    processingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    loadingContainer: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.accentLight,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    },
    processingTitle: { ...Typography.headingLarge, marginBottom: 8 },
    processingSub: { ...Typography.bodyMedium, color: Colors.textMuted, marginBottom: Spacing.xl },
    progressBar: {
        width: '100%', height: 6, backgroundColor: Colors.border,
        borderRadius: 3, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: Colors.accent },

    // ── Ticket Styles ────────────────────────────────────────────────────────
    ticketCard: {
        paddingTop: 0, paddingLeft: 40, overflow: 'hidden',
        borderColor: Colors.borderDark, 
    },
    ticketSideStrip: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 30,
        backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    },
    ticketSideText: {
        color: Colors.textInverse, fontSize: 10, fontWeight: '900',
        transform: [{ rotate: '-90deg' }], width: 100, textAlign: 'center',
    },
    ticketMetaRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: 4, paddingBottom: 10 },
    ticketLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
    ticketSeatValue: { fontSize: 18, fontWeight: '800', color: Colors.accent },
    ticketPnrValue: { fontSize: 18, fontWeight: '800', color: Colors.accent, letterSpacing: 1 },

    ticketFooter: {
        marginTop: Spacing.sm, borderTopWidth: 2, borderTopColor: Colors.border,
        borderStyle: 'dashed', paddingTop: Spacing.md, alignItems: 'center',
    },
    barcodeStrip: { alignItems: 'center', gap: 6 },
    barcodePlaceholder: {
        width: '90%', height: 40, backgroundColor: '#000', opacity: 0.15,
        borderRadius: 2,
    },
    barcodeText: { fontSize: 10, color: Colors.textMuted, letterSpacing: 4, fontWeight: '600' },
});
