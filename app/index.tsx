import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(20);
    const dotOpacity1 = new Animated.Value(0);
    const dotOpacity2 = new Animated.Value(0);
    const dotOpacity3 = new Animated.Value(0);

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 700, useNativeDriver: true }),
            ]),
            Animated.stagger(150, [
                Animated.timing(dotOpacity1, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dotOpacity2, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dotOpacity3, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]),
        ]).start();

        const timer = setTimeout(() => {
            router.replace('/(tabs)');
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Background pattern */}
            <View style={styles.patternGrid}>
                {Array.from({ length: 20 }).map((_, i) => (
                    <View key={i} style={styles.patternDot} />
                ))}
            </View>

            <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoIcon}>◎</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>TriPlan</Text>
                <Text style={styles.tagline}>One journey. Every mode.</Text>

                {/* Loading dots */}
                <View style={styles.dotsRow}>
                    <Animated.View style={[styles.dot, { opacity: dotOpacity1 }]} />
                    <Animated.View style={[styles.dot, { opacity: dotOpacity2 }]} />
                    <Animated.View style={[styles.dot, { opacity: dotOpacity3 }]} />
                </View>
            </Animated.View>

            {/* Bottom tagline */}
            <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Flights · Trains · Buses · Ferries</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    patternGrid: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        opacity: 0.04,
        padding: 20,
        gap: 40,
        alignContent: 'space-around',
        justifyContent: 'space-around',
    },
    patternDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FFFFFF',
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 24,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoIcon: {
        fontSize: 40,
        color: '#0A0A0A',
        fontWeight: '300',
    },
    title: {
        fontSize: 44,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '400',
        letterSpacing: 0.5,
        marginBottom: 40,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    bottomRow: {
        position: 'absolute',
        bottom: 48,
    },
    bottomText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});
