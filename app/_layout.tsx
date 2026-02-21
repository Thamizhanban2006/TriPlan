import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { JourneyProvider } from '../context/JourneyContext';
import { Colors } from '../constants/theme';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <JourneyProvider>
                <StatusBar style="dark" backgroundColor={Colors.background} />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: Colors.background },
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="results" />
                    <Stack.Screen name="detail" />
                    <Stack.Screen name="passengers" />
                    <Stack.Screen name="booking" />
                </Stack>
            </JourneyProvider>
        </GestureHandlerRootView>
    );
}
