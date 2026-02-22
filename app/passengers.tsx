import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { useJourney } from '../context/JourneyContext';

interface PassengerForm {
    name: string;
    age: string;
    gender: 'male' | 'female' | 'other';
    idType: 'aadhar' | 'passport' | 'pan' | 'driving';
    idNumber: string;
    phone: string;
    email: string;
}

const defaultForm = (): PassengerForm => ({
    name: '', age: '', gender: 'male',
    idType: 'aadhar', idNumber: '', phone: '', email: '',
});

const ID_TYPES = [
    { id: 'aadhar', label: 'Aadhaar' },
    { id: 'passport', label: 'Passport' },
    { id: 'pan', label: 'PAN Card' },
    { id: 'driving', label: 'Driving Licence' },
];

const GENDERS = [
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
    { id: 'other', label: 'Other' },
];

export default function PassengersScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();
    const count = state.searchParams?.passengers || 1;

    const [forms, setForms] = useState<PassengerForm[]>(
        Array.from({ length: count }, defaultForm)
    );
    const [expanded, setExpanded] = useState<number>(0);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isPreparing, setIsPreparing] = useState(false);

    const updateField = (idx: number, field: keyof PassengerForm, val: string) => {
        setForms(prev => prev.map((f, i) => i === idx ? { ...f, [field]: val } : f));
        setErrors(prev => { const n = { ...prev }; delete n[`${idx}-${field}`]; return n; });
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        forms.forEach((f, i) => {
            if (!f.name.trim()) errs[`${i}-name`] = 'Required';
            if (!f.age.trim()) errs[`${i}-age`] = 'Required';
            if (!f.phone.trim()) errs[`${i}-phone`] = 'Required';
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleProceed = () => {
        if (!validate()) return;
        setIsPreparing(true);
        dispatch({ type: 'SET_PASSENGERS', payload: forms as any });
        
        // Simulate a real app "preparing" the booking summary
        setTimeout(() => {
            router.push('/booking');
            setIsPreparing(false);
        }, 1200);
    };

    const route = state.selectedRoute;
    const totalMin = route ? route.price.min * count : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Passenger Details</Text>
                    <Text style={styles.headerSub}>{count} passenger{count > 1 ? 's' : ''}</Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {forms.map((form, idx) => (
                        <View key={idx} style={styles.passengerCard}>
                            {/* Accordion header */}
                            <TouchableOpacity
                                style={styles.accordionHeader}
                                onPress={() => setExpanded(expanded === idx ? -1 : idx)}
                            >
                                <View style={styles.accordionLeft}>
                                    <View style={styles.paxNumBadge}>
                                        <Text style={styles.paxNumText}>{idx + 1}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.paxName}>{form.name || 'Passenger ' + (idx + 1)}</Text>
                                        {form.age ? <Text style={styles.paxAge}>{form.age} yrs · {form.gender}</Text> : null}
                                    </View>
                                </View>
                                <Ionicons
                                    name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                                    size={18} color={Colors.textMuted}
                                />
                            </TouchableOpacity>

                            {/* Form */}
                            {expanded === idx && (
                                <View style={styles.formSection}>
                                    {/* Name */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Full Name *</Text>
                                        <TextInput
                                            style={[styles.input, errors[`${idx}-name`] && styles.inputError]}
                                            placeholder="As on ID proof"
                                            placeholderTextColor={Colors.textMuted}
                                            value={form.name}
                                            onChangeText={v => updateField(idx, 'name', v)}
                                        />
                                        {errors[`${idx}-name`] && <Text style={styles.errorText}>{errors[`${idx}-name`]}</Text>}
                                    </View>

                                    {/* Age + Gender */}
                                    <View style={styles.rowFields}>
                                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                                            <Text style={styles.fieldLabel}>Age *</Text>
                                            <TextInput
                                                style={[styles.input, errors[`${idx}-age`] && styles.inputError]}
                                                placeholder="25"
                                                placeholderTextColor={Colors.textMuted}
                                                keyboardType="numeric"
                                                value={form.age}
                                                onChangeText={v => updateField(idx, 'age', v)}
                                            />
                                        </View>
                                        <View style={[styles.fieldGroup, { flex: 2 }]}>
                                            <Text style={styles.fieldLabel}>Gender</Text>
                                            <View style={styles.optionRow}>
                                                {GENDERS.map(g => (
                                                    <TouchableOpacity
                                                        key={g.id}
                                                        style={[styles.optionChip, form.gender === g.id && styles.optionChipActive]}
                                                        onPress={() => updateField(idx, 'gender', g.id)}
                                                    >
                                                        <Text style={[styles.optionText, form.gender === g.id && styles.optionTextActive]}>
                                                            {g.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>

                                    {/* ID Type */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>ID Proof Type</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.idRow}>
                                            {ID_TYPES.map(id => (
                                                <TouchableOpacity
                                                    key={id.id}
                                                    style={[styles.idChip, form.idType === id.id && styles.idChipActive]}
                                                    onPress={() => updateField(idx, 'idType', id.id)}
                                                >
                                                    <Text style={[styles.idChipText, form.idType === id.id && styles.idChipTextActive]}>
                                                        {id.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* ID Number */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>ID Number</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter ID number"
                                            placeholderTextColor={Colors.textMuted}
                                            value={form.idNumber}
                                            onChangeText={v => updateField(idx, 'idNumber', v)}
                                        />
                                    </View>

                                    {/* Phone */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Phone *</Text>
                                        <TextInput
                                            style={[styles.input, errors[`${idx}-phone`] && styles.inputError]}
                                            placeholder="+91 9XXXXXXXXX"
                                            placeholderTextColor={Colors.textMuted}
                                            keyboardType="phone-pad"
                                            value={form.phone}
                                            onChangeText={v => updateField(idx, 'phone', v)}
                                        />
                                    </View>

                                    {/* Email */}
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Email (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="you@email.com"
                                            placeholderTextColor={Colors.textMuted}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={form.email}
                                            onChangeText={v => updateField(idx, 'email', v)}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Summary */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Estimated total</Text>
                            <Text style={styles.summaryPrice}>₹{totalMin.toLocaleString()}</Text>
                        </View>
                        <Text style={styles.summaryNote}>
                            You'll be redirected to the provider's website to complete payment.
                        </Text>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                <TouchableOpacity 
                    style={[styles.ctaBtn, isPreparing && { opacity: 0.8 }]} 
                    onPress={handleProceed} 
                    activeOpacity={0.87}
                    disabled={isPreparing}
                >
                    <Text style={styles.ctaBtnText}>{isPreparing ? 'Preparing Summary...' : 'Proceed to Booking'}</Text>
                    <Ionicons name={isPreparing ? "sync" : "arrow-forward"} size={18} color={Colors.textInverse} />
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
    headerCenter: { flex: 1 },
    headerTitle: { ...Typography.headingSmall },
    headerSub: { ...Typography.bodySmall, marginTop: 1 },

    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.sm },

    passengerCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', padding: Spacing.md,
    },
    accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    paxNumBadge: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    paxNumText: { fontSize: 14, fontWeight: '700', color: Colors.textInverse },
    paxName: { ...Typography.labelLarge },
    paxAge: { ...Typography.bodySmall, marginTop: 1 },

    formSection: {
        padding: Spacing.md, paddingTop: 0, gap: Spacing.md,
        borderTopWidth: 1, borderTopColor: Colors.border,
    },
    fieldGroup: {},
    fieldLabel: { ...Typography.labelSmall, letterSpacing: 0.6, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        ...Typography.bodyLarge, backgroundColor: Colors.background,
    },
    inputError: { borderColor: Colors.error },
    errorText: { fontSize: 11, color: Colors.error, marginTop: 3 },

    rowFields: { flexDirection: 'row', gap: Spacing.sm },
    optionRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: 6 },
    optionChip: {
        paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    },
    optionChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    optionText: { ...Typography.bodySmall, fontWeight: '500' },
    optionTextActive: { color: Colors.textInverse },

    idRow: { marginTop: 6 },
    idChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.xs,
        backgroundColor: Colors.background,
    },
    idChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    idChipText: { ...Typography.bodySmall, fontWeight: '500' },
    idChipTextActive: { color: Colors.textInverse },

    summaryCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginTop: Spacing.sm,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    summaryLabel: { ...Typography.bodyMedium },
    summaryPrice: { ...Typography.headingMedium },
    summaryNote: { ...Typography.bodySmall, fontStyle: 'italic' },

    bottomCTA: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.background, padding: Spacing.md,
        borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.large,
    },
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.accent, paddingVertical: 16,
        borderRadius: Radius.full, gap: Spacing.sm,
    },
    ctaBtnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 16 },
});
