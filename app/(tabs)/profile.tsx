import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Image } from 'react-native';
import { supabase } from '../../services/supabase';

const PREF_LINKS = (profile: any) => [
    { icon: 'language-outline' as const, label: 'Language', value: profile?.language || 'English' },
    { icon: 'notifications-outline' as const, label: 'Notifications', value: 'On' },
    { icon: 'flag-outline' as const, label: 'Country', value: profile?.country || 'India' },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', value: '' },
    { icon: 'information-circle-outline' as const, label: 'About TriPlan', value: 'v1.0.0' },
];

export default function ProfileTab() {
    const { user, profile, loading: authLoading, signOut } = useAuth();
    const [stats, setStats] = useState({
        total_spending: 0,
        carbon_saved: 0,
        trips_count: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                // Fetch stats from users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('total_spending, carbon_saved')
                    .eq('id', user.id)
                    .single();

                // Fetch trips count
                const { count, error: countError } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (!userError && userData) {
                    setStats({
                        total_spending: userData.total_spending || 0,
                        carbon_saved: userData.carbon_saved || 0,
                        trips_count: count || 0
                    });
                }
            } catch (e) {
                console.error('Error fetching profile stats:', e);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchUserData();
    }, [user]);

    const STATS = [
        { label: 'Total Spending', value: `₹${(stats.total_spending || 0).toLocaleString()}`, icon: 'wallet-outline', color: Colors.accent },
        { label: 'CO₂ Saved', value: `${(stats.carbon_saved || 0).toFixed(1)} kg`, icon: 'leaf-outline', color: Colors.success },
        { label: 'Trips Taken', value: stats.trips_count.toString(), icon: 'trail-sign-outline', color: '#8A2BE2' },
    ];

    // Get name from email as fallback
    const nameFromEmail = user?.email?.split('@')[0] || 'Traveler';
    const displayName = profile?.full_name || nameFromEmail;

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
                            profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                            )
                        ) : (
                            <Text style={styles.avatarInitial}>?</Text>
                        )}
                    </View>
                    {!user ? (
                        <>
                            <Text style={styles.profileName}>Sign in to continue</Text>
                            <TouchableOpacity style={styles.googleSignInBtn} onPress={() => {/* handled in auth context */}}>
                                <Ionicons name="logo-google" size={18} color="#4285F4" />
                                <Text style={styles.googleSignInText}>Sign in with Google</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.profileName}>{displayName}</Text>
                            <Text style={styles.profileSub}>{user.email}</Text>
                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                                <Text style={styles.locationText}>{profile?.country || 'India'}</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    {STATS.map((stat, i) => (
                        <View key={i} style={styles.statBox}>
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Account Settings */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                </View>

                <View style={styles.settingsGroup}>
                    {PREF_LINKS(profile).map((link, i) => (
                        <TouchableOpacity key={i} style={[styles.settingRow, i === PREF_LINKS(profile).length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.settingLeft}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name={link.icon as any} size={20} color={Colors.textPrimary} />
                                </View>
                                <Text style={styles.settingLabel}>{link.label}</Text>
                            </View>
                            <View style={styles.settingRight}>
                                <Text style={styles.settingValue}>{link.value}</Text>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {user && (
                    <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                        <Text style={styles.logoutText}>Sign Out from Account</Text>
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
    avatarImage: { width: 80, height: 80, borderRadius: 40 },
    
    profileName: { ...Typography.headingMedium, marginBottom: 4 },
    profileSub: { ...Typography.bodyMedium, color: Colors.textMuted },
    
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locationText: { ...Typography.bodySmall, color: Colors.textMuted },

    googleSignInBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.md, paddingVertical: 12, paddingHorizontal: 24,
        borderRadius: Radius.full, borderWidth: 1, borderColor: '#dadce0',
        backgroundColor: Colors.surface,
        marginTop: Spacing.lg,
        ...Shadow.small,
    },
    googleSignInText: { ...Typography.labelLarge, color: Colors.textPrimary },

    statsRow: {
        flexDirection: 'row', gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    statBox: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl,
        padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
        ...Shadow.small,
    },
    statIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    statValue: { ...Typography.labelLarge, fontSize: 16, fontWeight: '700' },
    statLabel: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },

    sectionHeader: { marginBottom: Spacing.sm, paddingHorizontal: 4 },
    sectionTitle: { ...Typography.labelSmall, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },

    settingsGroup: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
        marginBottom: Spacing.xl,
    },
    settingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    iconCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
    },
    settingLabel: { ...Typography.bodyLarge, color: Colors.textPrimary },
    settingValue: { ...Typography.bodyMedium, color: Colors.textMuted, marginRight: 4 },
    settingRight: { flexDirection: 'row', alignItems: 'center' },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingVertical: 16,
        borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.error + '30',
        backgroundColor: Colors.error + '08',
    },
    logoutText: { ...Typography.labelLarge, color: Colors.error, fontWeight: '600' },
});

