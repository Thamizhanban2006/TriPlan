/**
 * TriPlan – Notification Service
 *
 * In Expo Go (SDK 53+), expo-notifications remote push infrastructure was
 * removed and its module-level side-effects crash on load. This service
 * avoids importing expo-notifications entirely and uses React Native's
 * built-in Alert for in-app pivot alerts.
 *
 * In a real development build or production APK/IPA, swap the Alert calls
 * here for expo-notifications scheduleNotificationAsync calls.
 */

import { Alert } from 'react-native';

let _alertShown = false; // simple cooldown so we don't spam Alert

// ─── Permission (no-op in this implementation) ────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
    return true; // Alert requires no permission
}

// ─── Pivot Alert ──────────────────────────────────────────────────────────────

export async function sendPivotNotification(
    shortTitle: string,
    body: string,
    _data?: Record<string, unknown>
): Promise<string | null> {
    if (_alertShown) return null; // respect cooldown – PivotContext re-fires after 3 min
    _alertShown = true;
    setTimeout(() => { _alertShown = false; }, 180_000); // reset after 3 min

    // Show an Alert – this works in Expo Go, dev builds, and production
    Alert.alert(shortTitle, body, [{ text: 'OK', style: 'default' }], {
        cancelable: true,
    });

    return 'alert-shown';
}

// ─── Dismiss (no-op for Alert) ────────────────────────────────────────────────

export async function dismissPivotNotification(_id: string): Promise<void> {}

export async function dismissAllPivotNotifications(): Promise<void> {
    _alertShown = false;
}
