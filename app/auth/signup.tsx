import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const COUNTRIES = [
    { label: 'India', value: 'IN' },
    { label: 'United States', value: 'US' },
    { label: 'United Kingdom', value: 'UK' },
    { label: 'Canada', value: 'CA' },
    { label: 'United Arab Emirates', value: 'AE' },
];

const LANGUAGES = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Tamil', value: 'ta' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
];

export default function SignupScreen() {
    const router = useRouter();
    const { signInWithGoogle, isLoading, user } = useAuth();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [country, setCountry] = useState('India');
    const [language, setLanguage] = useState('English');
    const [password, setPassword] = useState('');
    
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    // Navigate to home if user is authenticated (e.g. via Google)
    useEffect(() => {
        if (user) {
            // Check if user has all required profile info, if not, we stay here.
            // But for this "hardcore" version, we'll just navigate.
            router.replace('/(tabs)');
        }
    }, [user]);

    const handleSignup = async () => {
        // Here we would save to Supabase
        // Including country, language, total_spending: 0, etc.
        router.replace('/(tabs)');
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
                        <Text style={styles.headerTitle}>Join TriPlan</Text>
                        <Text style={styles.headerSub}>Create an account to start exploring</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.googleBtn} 
                        onPress={() => signInWithGoogle(router)}
                        disabled={isLoading}
                    >
                        <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
                        <Text style={styles.googleBtnText}>Sign up with Google</Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR COMPLETE FORM</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Alex Johnson"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

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

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Country</Text>
                                <TouchableOpacity 
                                    style={styles.pickerTrigger}
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text style={styles.pickerValue}>{country}</Text>
                                    <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Preferred Language</Text>
                                <TouchableOpacity 
                                    style={styles.pickerTrigger}
                                    onPress={() => setShowLanguagePicker(true)}
                                >
                                    <Text style={styles.pickerValue}>{language}</Text>
                                    <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!user && (
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
                        )}

                        <TouchableOpacity style={styles.signupBtn} onPress={handleSignup}>
                            <Text style={styles.signupBtnText}>Complete Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Country Picker Modal */}
            <Modal visible={showCountryPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        {COUNTRIES.map((c) => (
                            <TouchableOpacity 
                                key={c.value} 
                                style={styles.modalOption}
                                onPress={() => { setCountry(c.label); setShowCountryPicker(false); }}
                            >
                                <Text style={styles.modalOptionText}>{c.label}</Text>
                                {country === c.label && <Ionicons name="checkmark" size={20} color={Colors.accent} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Language Picker Modal */}
            <Modal visible={showLanguagePicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Language</Text>
                            <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        {LANGUAGES.map((l) => (
                            <TouchableOpacity 
                                key={l.value} 
                                style={styles.modalOption}
                                onPress={() => { setLanguage(l.label); setShowLanguagePicker(false); }}
                            >
                                <Text style={styles.modalOptionText}>{l.label}</Text>
                                {language === l.label && <Ionicons name="checkmark" size={20} color={Colors.accent} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: Spacing.xl },
    header: { marginBottom: Spacing.xl, marginTop: Spacing.md },
    backBtn: { marginBottom: Spacing.md },
    headerTitle: { ...Typography.displayMedium, marginBottom: 4 },
    headerSub: { ...Typography.bodyLarge, color: Colors.textSecondary },
    
    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, borderRadius: Radius.full,
        backgroundColor: Colors.surface, ...Shadow.small,
    },
    googleBtnText: { ...Typography.labelLarge, color: Colors.textPrimary },
    
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { ...Typography.labelSmall, color: Colors.textMuted },
    
    form: { gap: Spacing.lg },
    inputGroup: { gap: 8 },
    row: { flexDirection: 'row', gap: Spacing.md },
    label: { ...Typography.labelSmall, letterSpacing: 1 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        ...Typography.bodyLarge, backgroundColor: Colors.surface,
    },
    
    pickerTrigger: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        backgroundColor: Colors.surface,
    },
    pickerValue: { ...Typography.bodyLarge },
    
    signupBtn: {
        backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: Radius.full,
        alignItems: 'center', marginTop: Spacing.md, ...Shadow.medium,
    },
    signupBtnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 16 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: Colors.background, borderTopLeftRadius: Radius.xl, 
        borderTopRightRadius: Radius.xl, padding: Spacing.xl,
        maxHeight: '60%',
    },
    modalHeader: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: Spacing.lg 
    },
    modalTitle: { ...Typography.headingLarge },
    modalOption: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border 
    },
    modalOptionText: { ...Typography.bodyLarge },
});