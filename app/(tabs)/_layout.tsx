import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: Colors.textPrimary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="routes"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.centerIconWrap, focused && styles.centerIconWrapActive]}>
                            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={focused ? Colors.textInverse : color} />
                        </View>
                    ),
                    tabBarLabelStyle: { ...styles.tabLabel, color: Colors.textMuted },
                }}
            />
            <Tabs.Screen
                name="bookings"
                options={{
                    title: 'Bookings',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        height: 70,
        paddingBottom: 10,
        paddingTop: 6,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    iconWrap: {
        width: 40,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    iconWrapActive: {
        backgroundColor: Colors.accentLight,
    },
    centerIconWrap: {
        width: 52,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: Colors.accentLight,
        marginBottom: 2,
    },
    centerIconWrapActive: {
        backgroundColor: Colors.accent,
    },
});
