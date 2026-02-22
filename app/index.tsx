import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [step, setStep] = React.useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    const onboardingSteps = [
        {
            title: "Multi-Modal Search",
            desc: "One search for flights, trains, buses, and cabs - all in one optimized route.",
            icon: "search-outline",
            color: Colors.accent,
            accentIcons: ['airplane-outline', 'train-outline', 'bus-outline']
        },
        {
            title: "Smart Comparison",
            desc: "Compare carbon emissions, travel time, and costs side-by-side with AI.",
            icon: "git-compare-outline",
            color: Colors.success,
            accentIcons: ['leaf-outline', 'time-outline', 'wallet-outline']
        },
        {
            title: "Seamless Booking",
            desc: "Direct confirmation and in-app digital tickets for your entire journey.",
            icon: "ticket-outline",
            color: '#8A2BE2',
            accentIcons: ['qr-code-outline', 'card-outline', 'checkmark-circle-outline']
        },
        {
            title: "Journey Guardian",
            desc: "Real-time connection monitoring to ensure you never miss a transfer.",
            icon: "shield-checkmark-outline",
            color: '#FF6B6B',
            accentIcons: ['notifications-outline', 'navigate-outline', 'pulse-outline']
        }
    ];

    useEffect(() => {
        // Reset animations
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
        rotateAnim.setValue(0);
        floatAnim.setValue(0);

        if (!isLoading) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
                Animated.timing(rotateAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
                    ])
                )
            ]).start();
        }
    }, [step, isLoading]);
    
    // Check if user is already logged in
    React.useEffect(() => {
        if (!isLoading && user) {
            router.replace('/(tabs)');
        }
    }, [user, isLoading]);

    const handleNext = () => {
        if (step < onboardingSteps.length - 1) {
            setStep(step + 1);
        } else {
            router.push('/auth/login');
        }
    };

    const handleSkip = () => {
        router.push('/auth/login');
    };

    const currentStep = onboardingSteps[step];

    return (
        <SafeAreaView style={styles.container}>
            {isLoading ? (
                <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
                    <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                        <Ionicons name="airplane-outline" size={48} color={Colors.accent} />
                    </Animated.View>
                </View>
            ) : (
                <>
                {/* Dynamic Background */}
                <View style={[styles.bgCircle, { backgroundColor: currentStep.color, opacity: 0.05, top: -100, right: -100 }]} />
                <View style={[styles.bgCircle, { backgroundColor: currentStep.color, opacity: 0.03, bottom: -50, left: -50, width: 300, height: 300 }]} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                    <View style={styles.stepDots}>
                        {onboardingSteps.map((_, i) => (
                            <View key={i} style={[styles.stepDot, i === step && { width: 24, backgroundColor: currentStep.color }]} />
                        ))}
                    </View>
                </View>

                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Visual Diagram Layer */}
                    <View style={styles.diagramContainer}>
                        <Animated.View style={[styles.diagramCircle, { 
                            backgroundColor: currentStep.color + '10',
                            transform: [
                                { scale: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                                { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }
                            ] 
                        }]}>
                            <Ionicons name={currentStep.icon as any} size={70} color={currentStep.color} />
                        </Animated.View>
                        
                        {/* Floating Accent Icons */}
                        {currentStep.accentIcons.map((ic, i) => (
                            <Animated.View key={i} style={[
                                styles.accentIconWrap,
                                { 
                                    backgroundColor: Colors.surface,
                                    top: i === 0 ? '10%' : i === 1 ? '50%' : '80%',
                                    left: i === 0 ? '70%' : i === 1 ? '10%' : '65%',
                                    transform: [
                                        { translateY: floatAnim.interpolate({ 
                                            inputRange: [0, 1], 
                                            outputRange: [0, i % 2 === 0 ? -20 : 20] 
                                        }) }
                                    ]
                                }
                            ]}>
                                <Ionicons name={ic as any} size={22} color={currentStep.color} />
                            </Animated.View>
                        ))}
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{currentStep.title}</Text>
                        <Text style={styles.desc}>{currentStep.desc}</Text>
                    </View>
                </Animated.View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.getStartedBtn, { backgroundColor: currentStep.color }]} 
                        onPress={handleNext}
                    >
                        <Text style={styles.btnText}>
                            {step === onboardingSteps.length - 1 ? "Let's Explore" : "Continue"}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.textInverse} />
                    </TouchableOpacity>
                </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    bgCircle: {
        position: 'absolute',
        width: 400, height: 400, borderRadius: 200,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
    },
    skipText: { ...Typography.labelLarge, color: Colors.textMuted },
    stepDots: { flexDirection: 'row', gap: 6 },
    stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
    
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    diagramContainer: {
        width: width * 0.8, height: width * 0.8,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    diagramCircle: {
        width: 160, height: 160, borderRadius: 80,
        alignItems: 'center', justifyContent: 'center',
        ...Shadow.medium,
    },
    accentIconWrap: {
        position: 'absolute',
        width: 50, height: 50, borderRadius: 25,
        alignItems: 'center', justifyContent: 'center',
        ...Shadow.small,
        borderWidth: 1, borderColor: Colors.border,
    },

    textContainer: { alignItems: 'center' },
    title: { ...Typography.displayMedium, textAlign: 'center', marginBottom: Spacing.md, fontSize: 32 },
    desc: { ...Typography.bodyLarge, textAlign: 'center', color: Colors.textSecondary, lineHeight: 26 },

    footer: { padding: Spacing.xl },
    getStartedBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: Radius.full, gap: Spacing.sm,
        ...Shadow.large,
    },
    btnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 18, fontWeight: '700' },
});
