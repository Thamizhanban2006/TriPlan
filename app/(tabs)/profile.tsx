import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Image } from 'react-native';

const PREF_LINKS = [
    { icon: 'language-outline' as const, label: 'Language', value: 'English' },
    { icon: 'notifications-outline' as const, label: 'Notifications', value: 'On' },
    { icon: 'shield-checkmark-outline' as const, label: 'Privacy', value: '' },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', value: '' },
    { icon: 'information-circle-outline' as const, label: 'About TriPlan', value: 'v1.0.0' },
];

export default function ProfileTab() {
    const [editMode, setEditMode] = useState(false);
    const { user, isLoading, signInWithGoogle, signOut } = useAuth();
    
    // Set initial values based on auth state
    const [localName, setLocalName] = useState(user?.name || 'Traveller');
    const [phone, setPhone] = useState('');
    const [localEmail, setLocalEmail] = useState(user?.email || '');
    
    // Update local state when user changes
    useEffect(() => {
        if (user) {
            setLocalName(user.name);
            setLocalEmail(user.email);
        }
    }, [user]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar + name */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarCircle}>
                        {user ? (
                            user.photo ? (
                                <Image source={{ uri: user.photo }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarInitial}>{localName.charAt(0).toUpperCase()}</Text>
                            )
                        ) : (
                            <Text style={styles.avatarInitial}>?</Text>
                        )}
                    </View>
                    {!user ? (
                        // Show Google Sign-In button if not authenticated
                        <>
                            <Text style={styles.profileName}>Sign in to continue</Text>
                            <TouchableOpacity 
                                style={styles.googleSignInBtn} 
                                onPress={signInWithGoogle}
                                disabled={isLoading}
                            >
                                <View style={styles.googleLogoContainer}>
                                    <Ionicons name="logo-google" size={18} color="#4285F4" />
                                </View>
                                <Text style={styles.googleSignInText}>Sign in with Google</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        // Show user profile if authenticated
                        !editMode ? (
                            <>
                                <Text style={styles.profileName}>{localName || 'Add your name'}</Text>
                                <Text style={styles.profileSub}>{localEmail || 'Add email'}</Text>
                                <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                                    <Ionicons name="pencil-outline" size={14} color={Colors.textPrimary} />
                                    <Text style={styles.editBtnText}>Edit Profile</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.editForm}>
                                <TextInput
                                    style={styles.editInput}
                                    value={localName}
                                    onChangeText={setLocalName}
                                    placeholder="Full name"
                                    placeholderTextColor={Colors.textMuted}
                                />
                                <TextInput
                                    style={styles.editInput}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Phone number"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="phone-pad"
                                />
                                <TextInput
                                    style={styles.editInput}
                                    value={localEmail}
                                    onChangeText={setLocalEmail}
                                    placeholder="Email address"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="email-address"
                                />
                                <TouchableOpacity style={styles.saveBtn} onPress={() => setEditMode(false)}>
                                    <Text style={styles.saveBtnText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>3</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>2</Text>
                        <Text style={styles.statLabel}>Cities</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>46kg</Text>
                        <Text style={styles.statLabel}>CO₂ saved</Text>
                    </View>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    <View style={styles.prefCard}>
                        {PREF_LINKS.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[styles.prefRow, i < PREF_LINKS.length - 1 && styles.prefRowBorder]}
                            >
                                <View style={styles.prefIconWrap}>
                                    <Ionicons name={item.icon} size={18} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.prefLabel}>{item.label}</Text>
                                <View style={styles.prefRight}>
                                    {item.value ? (
                                        <Text style={styles.prefValue}>{item.value}</Text>
                                    ) : null}
                                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Logout */}
                {user && (
                    <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md },

    avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
    avatarCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md, ...Shadow.medium,
    },
    avatarInitial: { fontSize: 34, fontWeight: '700', color: Colors.textInverse },
    avatarImage: {
        width: 80, height: 80, borderRadius: 40,
        ...Shadow.medium,
    },
    profileName: { ...Typography.headingMedium, marginBottom: 4 },
    profileSub: { ...Typography.bodyMedium },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: Spacing.md, paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    },
    editBtnText: { ...Typography.labelLarge, fontSize: 13 },
    googleSignInBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.md, paddingVertical: 12, paddingHorizontal: 16,
        borderRadius: Radius.full, borderWidth: 1, borderColor: '#dadce0',
        backgroundColor: Colors.surface,
        marginTop: Spacing.md,
    },
    googleLogoContainer: {
        width: 24, height: 24,
        borderRadius: 12, backgroundColor: 'white',
        alignItems: 'center', justifyContent: 'center',
    },
    googleSignInText: { ...Typography.labelLarge, color: Colors.textPrimary },

    editForm: { width: '100%', gap: Spacing.sm, marginTop: Spacing.md },
    editInput: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        ...Typography.bodyLarge, backgroundColor: Colors.surface,
    },
    saveBtn: {
        backgroundColor: Colors.accent, paddingVertical: 14,
        borderRadius: Radius.full, alignItems: 'center', marginTop: 4,
    },
    saveBtnText: { ...Typography.labelLarge, color: Colors.textInverse },

    statsRow: {
        flexDirection: 'row', backgroundColor: Colors.surface,
        borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
        marginBottom: Spacing.lg, padding: Spacing.md,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { ...Typography.headingMedium },
    statLabel: { ...Typography.bodySmall, marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: Colors.border },

    section: { marginBottom: Spacing.lg },
    sectionTitle: { ...Typography.labelSmall, letterSpacing: 1, marginBottom: Spacing.sm },

    prefCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    prefRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        padding: Spacing.md,
    },
    prefRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    prefIconWrap: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
    },
    prefLabel: { ...Typography.bodyLarge, flex: 1 },
    prefRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    prefValue: { ...Typography.bodyMedium },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingVertical: 14,
        borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.errorLight,
        backgroundColor: Colors.errorLight,
    },
    logoutText: { ...Typography.labelLarge, color: Colors.error },
});
