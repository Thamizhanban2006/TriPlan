import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
    const router = useRouter();
    const { signInWithGoogle, isLoading, user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Navigate to home if user is authenticated
    React.useEffect(() => {
        if (user) {
            router.replace('/(tabs)');
        }
    }, [user]);

    const handleLogin = async () => {
        // For simulation/hardcore, just navigate if we have email
        if (email && password) {
            router.replace('/(tabs)');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Welcome Back</Text>
                        <Text style={styles.headerSub}>Sign in to continue your journey</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. alex@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                            <Text style={styles.loginBtnText}>Sign In</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity 
                            style={styles.googleBtn} 
                            onPress={() => signInWithGoogle(router)}
                            disabled={isLoading}
                        >
                            <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
                            <Text style={styles.googleBtnText}>Sign in with Google</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <Link href="/auth/signup" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.signupLink}>Sign up here</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: Spacing.xl },
    header: { marginBottom: Spacing.xxl, marginTop: Spacing.md },
    backBtn: { marginBottom: Spacing.md },
    headerTitle: { ...Typography.displayMedium, marginBottom: 4 },
    headerSub: { ...Typography.bodyLarge, color: Colors.textSecondary },
    
    form: { gap: Spacing.lg },
    inputGroup: { gap: 8 },
    label: { ...Typography.labelSmall, letterSpacing: 1 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        ...Typography.bodyLarge, backgroundColor: Colors.surface,
    },
    
    loginBtn: {
        backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: Radius.full,
        alignItems: 'center', marginTop: Spacing.md, ...Shadow.medium,
    },
    loginBtnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 16 },
    
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { ...Typography.labelSmall, color: Colors.textMuted },
    
    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, borderRadius: Radius.full,
        backgroundColor: Colors.surface,
    },
    googleBtnText: { ...Typography.labelLarge, color: Colors.textPrimary },
    
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
    footerText: { ...Typography.bodyMedium, color: Colors.textSecondary },
    signupLink: { ...Typography.labelLarge, color: Colors.accent },
});