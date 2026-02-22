import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, Animated, ScrollView,
    Dimensions, Modal, FlatList, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Circle, MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useJourney } from '../../context/JourneyContext';
import { searchRoutes } from '../../services/groq';
import {
    geocodeSearch, reverseGeocode, calculateRoute,
    formatDistance, formatDuration, STEP_ICONS,
    GeoResult, ORSRoute, RouteStep,
} from '../../services/ors';
import {
    POI_CATEGORIES, fetchNearbyPOIs, getCategoryColor,
    getCategoryIcon, POICategory, POIResult,
} from '../../services/overpass';

const { width, height } = Dimensions.get('window');

// ─── Small POI marker ─────────────────────────────────────────────────────────
function POIMarker({ poi, color, onPress }: { poi: POIResult; color: string; onPress: () => void }) {
    return (
        <Marker
            coordinate={{ latitude: poi.lat, longitude: poi.lng }}
            title={poi.name}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            onPress={(e) => {
                e.stopPropagation();
                onPress();
            }}
        >
            <View style={[styles.poiMarkerWrap, { backgroundColor: color }]}>
                <Ionicons
                    name={getCategoryIcon(poi.category) as any}
                    size={11}
                    color="#fff"
                />
            </View>
        </Marker>
    );
}

// ─── Search Result Row ────────────────────────────────────────────────────────
function SearchRow({ item, onPress }: { item: GeoResult; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.searchResultRow} onPress={onPress}>
            <View style={styles.searchResultIcon}>
                <Ionicons
                    name={item.isCity ? 'business-outline' : 'location-outline'}
                    size={16}
                    color={Colors.textSecondary}
                />
            </View>
            <View style={styles.searchResultText}>
                <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.searchResultSub} numberOfLines={1}>{item.displayName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapHomeScreen() {
    const router = useRouter();
    const { state, dispatch } = useJourney();
    const mapRef = useRef<MapView>(null);

    // Location state
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [userCity, setUserCity] = useState('');
    const [locationGranted, setLocationGranted] = useState(false);
    const [heading, setHeading] = useState(0);

    // Search state
    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [searchInputRef] = useState(useRef<TextInput>(null));

    // Destination state
    const [destination, setDestination] = useState<GeoResult | null>(null);

    // Route state
    const [route, setRoute] = useState<ORSRoute | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);

    // Navigation mode
    const [navMode, setNavMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [watchSub, setWatchSub] = useState<Location.LocationSubscription | null>(null);

    // POI state
    const [activePOI, setActivePOI] = useState<string | null>(null);
    const [pois, setPois] = useState<POIResult[]>([]);
    const [poiLoading, setPoiLoading] = useState(false);
    const [selectedPOI, setSelectedPOI] = useState<POIResult | null>(null);

    // UI state
    const [mapType, setMapType] = useState<MapType>('standard');
    const [showMapTypeMenu, setShowMapTypeMenu] = useState(false);

    // Animations
    const routePanelSlide = useRef(new Animated.Value(200)).current;
    const searchPanelFade = useRef(new Animated.Value(0)).current;
    const poiBtnScale = useRef(new Animated.Value(1)).current;

    // ─── Location permission ─────────────────────────────────────────────────

    const requestLocation = useCallback(async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Location Required',
                'TriPlan needs location to show your position on the map.',
                [{ text: 'OK' }]
            );
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = loc.coords;
            setUserLoc({ lat: latitude, lng: longitude });
            setLocationGranted(true);
            dispatch({ type: 'SET_ORIGIN', payload: { name: 'My Location', lat: latitude, lng: longitude } });
            // Reverse geocode to city name
            reverseGeocode(latitude, longitude).then(setUserCity);
            // Animate map
            mapRef.current?.animateToRegion(
                { latitude, longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 },
                800
            );
        } catch {
            Alert.alert('Error', 'Could not get your location. Please try again.');
        }
    }, []);

    useEffect(() => {
        requestLocation();
        return () => { watchSub?.remove(); };
    }, []);

    // ─── Geocoding search ────────────────────────────────────────────────────

    useEffect(() => {
        if (!searchText.trim() || searchText.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            const results = await geocodeSearch(searchText);
            setSearchResults(results);
            setSearching(false);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchText]);

    const openSearch = () => {
        setShowSearchPanel(true);
        Animated.timing(searchPanelFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        setTimeout(() => searchInputRef.current?.focus(), 150);
    };

    const closeSearch = () => {
        Animated.timing(searchPanelFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setShowSearchPanel(false);
            setSearchText('');
            setSearchResults([]);
        });
    };

    // ─── Select destination from search ─────────────────────────────────────

    const selectDestination = useCallback(async (result: GeoResult) => {
        closeSearch();
        setDestination(result);
        setNavMode(false);
        setCurrentStep(0);
        setActivePOI(null);
        setPois([]);

        // Animate map to show destination
        mapRef.current?.animateToRegion(
            {
                latitude: result.lat,
                longitude: result.lng,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            },
            600
        );

        // Calculate route if we have user location
        if (userLoc) {
            setRouteLoading(true);
            // Bring route panel up
            Animated.spring(routePanelSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }).start();

            const orsRoute = await calculateRoute(userLoc.lat, userLoc.lng, result.lat, result.lng);
            setRoute(orsRoute);
            setRouteLoading(false);

            if (orsRoute) {
                // Fit map to show full route
                const coords = orsRoute.coordinates;
                const lats = coords.map(c => c.lat);
                const lngs = coords.map(c => c.lng);
                const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                mapRef.current?.animateToRegion({
                    latitude: (minLat + maxLat) / 2,
                    longitude: (minLng + maxLng) / 2,
                    latitudeDelta: (maxLat - minLat) * 1.4 + 0.05,
                    longitudeDelta: (maxLng - minLng) * 1.4 + 0.05,
                }, 1000);
            }
        }
    }, [userLoc]);

    // ─── POI: fetch nearby ────────────────────────────────────────────────────

    const handlePOICategory = useCallback(async (categoryId: string) => {
        if (activePOI === categoryId) {
            setActivePOI(null);
            setPois([]);
            return;
        }
        if (!userLoc) { Alert.alert('Enable Location', 'Turn on location to find nearby places.'); return; }

        setActivePOI(categoryId);
        setPoiLoading(true);
        setDestination(null);
        setRoute(null);
        Animated.spring(routePanelSlide, { toValue: 200, useNativeDriver: true }).start();

        const results = await fetchNearbyPOIs(userLoc.lat, userLoc.lng, categoryId, 2000);
        setPois(results);
        setPoiLoading(false);

        Animated.sequence([
            Animated.timing(poiBtnScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
            Animated.timing(poiBtnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
    }, [activePOI, userLoc]);

    // ─── Navigation mode ─────────────────────────────────────────────────────

    const startNavigation = useCallback(async () => {
        if (!route || !userLoc) return;
        setNavMode(true);
        setCurrentStep(0);

        try {
            const sub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10 },
                (loc) => {
                    const { latitude, longitude, heading: h } = loc.coords;
                    setUserLoc({ lat: latitude, lng: longitude });
                    if (h != null) setHeading(h);
                    // Pan map to user
                    mapRef.current?.animateCamera(
                        { center: { latitude, longitude }, heading: h || 0, pitch: 45, zoom: 16 },
                        { duration: 500 }
                    );
                    // Advance step
                    setCurrentStep(prev => {
                        if (!route.steps[prev + 1]) return prev;
                        return prev + 1;
                    });
                }
            );
            setWatchSub(sub);
        } catch (e) {
            Alert.alert('Navigation Error', 'Could not start navigation tracking.');
        }
    }, [route, userLoc]);

    const stopNavigation = useCallback(() => {
        watchSub?.remove();
        setWatchSub(null);
        setNavMode(false);
        setCurrentStep(0);
        // Re-centre on user
        if (userLoc) {
            mapRef.current?.animateCamera(
                { center: { latitude: userLoc.lat, longitude: userLoc.lng }, heading: 0, pitch: 0, zoom: 13 },
                { duration: 600 }
            );
        }
    }, [watchSub, userLoc]);

    // ─── Find Routes (to results screen) ────────────────────────────────────

    const handleFindRoutes = useCallback(async () => {
        if (!userCity || !destination) return;
        const params = {
            from: userCity,
            to: destination.name,
            date: new Date().toISOString().split('T')[0],
            passengers: 1,
            preference: 'cost' as const,
            modes: [],
        };
        dispatch({ type: 'SET_SEARCH_PARAMS', payload: params });
        dispatch({ type: 'SET_SEARCHING', payload: true });
        dispatch({ type: 'ADD_RECENT_SEARCH', payload: { from: userCity, to: destination.name, date: params.date } });
        router.push('/results');
        try {
            const routes = await searchRoutes(params);
            dispatch({ type: 'SET_RESULTS', payload: routes });
        } catch {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch routes.' });
        }
    }, [userCity, destination]);

    // ─── Recenter ────────────────────────────────────────────────────────────

    const recenter = useCallback(() => {
        if (!userLoc) { requestLocation(); return; }
        mapRef.current?.animateToRegion(
            { latitude: userLoc.lat, longitude: userLoc.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
            600
        );
    }, [userLoc]);

    // ─── Clear destination ────────────────────────────────────────────────────

    const clearDestination = () => {
        setDestination(null);
        setRoute(null);
        setNavMode(false);
        watchSub?.remove();
        setWatchSub(null);
        Animated.spring(routePanelSlide, { toValue: 200, useNativeDriver: true }).start();
    };

    // ─── Map double-tap to set custom destination ────────────────────────────

    const handleMapPress = useCallback(async (e: any) => {
        if (navMode) return;
        const { latitude, longitude } = e.nativeEvent.coordinate;
        const name = await reverseGeocode(latitude, longitude);
        const fakeResult: GeoResult = {
            name, displayName: name,
            lat: latitude, lng: longitude,
            type: 'place', isCity: false,
        };
        selectDestination(fakeResult);
    }, [navMode, selectDestination]);

    // ─── Route polyline coords ────────────────────────────────────────────────

    const polylineCoords = route?.coordinates.map(c => ({ latitude: c.lat, longitude: c.lng })) || [];

    // Current nav step
    const currentNavStep: RouteStep | null = route?.steps[currentStep] || null;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>

            {/* ── Map (top 75 %) ───────────────────────────────────────────── */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_DEFAULT}
                    mapType={mapType}
                    showsUserLocation={locationGranted}
                    showsMyLocationButton={false}
                    showsCompass
                    showsScale
                    onLongPress={handleMapPress}
                    initialRegion={{
                        latitude: 20.5937, longitude: 78.9629,
                        latitudeDelta: 15, longitudeDelta: 15,
                    }}
                >
                    {/* Destination marker */}
                    {destination && (
                        <Marker
                            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                            title={destination.name}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={styles.destMarkerWrap}>
                                <Ionicons name="location" size={28} color={Colors.textPrimary} />
                            </View>
                        </Marker>
                    )}

                    {/* Route polyline */}
                    {polylineCoords.length > 1 && (
                        <>
                            <Polyline coordinates={polylineCoords} strokeColor="rgba(0,0,0,0.12)" strokeWidth={7} />
                            <Polyline coordinates={polylineCoords} strokeColor={Colors.textPrimary} strokeWidth={4} />
                            {navMode && currentStep > 0 && (
                                <Polyline
                                    coordinates={polylineCoords.slice(0, Math.min(currentStep * 2, polylineCoords.length))}
                                    strokeColor={Colors.success}
                                    strokeWidth={5}
                                />
                            )}
                        </>
                    )}

                    {/* POI markers */}
                    {pois.map(poi => (
                        <POIMarker
                            key={poi.id}
                            poi={poi}
                            color={getCategoryColor(poi.category)}
                            onPress={() => {
                                const result: GeoResult = {
                                    name: poi.name, displayName: poi.name,
                                    lat: poi.lat, lng: poi.lng,
                                    type: 'place', isCity: false,
                                };
                                selectDestination(result);
                            }}
                        />
                    ))}

                    {/* Selected POI circle */}
                    {selectedPOI && (
                        <Circle
                            center={{ latitude: selectedPOI.lat, longitude: selectedPOI.lng }}
                            radius={80}
                            fillColor="rgba(0,0,0,0.08)"
                            strokeColor={Colors.textPrimary}
                            strokeWidth={1}
                        />
                    )}
                </MapView>

                {/* Navigation step banner — fixed at top of map area */}
                {navMode && currentNavStep && (
                    <SafeAreaView style={styles.navBannerWrap} edges={['top']} pointerEvents="box-none">
                        <View style={styles.navBanner}>
                            <View style={styles.navBannerIcon}>
                                <Ionicons
                                    name={(STEP_ICONS[currentNavStep.type] || 'navigate') as any}
                                    size={22}
                                    color={Colors.textInverse}
                                />
                            </View>
                            <View style={styles.navBannerText}>
                                <Text style={styles.navInstruction} numberOfLines={2}>{currentNavStep.instruction}</Text>
                                <Text style={styles.navDistance}>
                                    {formatDistance(currentNavStep.distance)} · {formatDuration(currentNavStep.duration)}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.navEndBtn} onPress={stopNavigation}>
                                <Ionicons name="close" size={18} color={Colors.textInverse} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                )}

                {/* Map type toggle button — top-right corner of map */}
                {!navMode && (
                    <SafeAreaView style={styles.mapTopRight} edges={['top']} pointerEvents="box-none">
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => setShowMapTypeMenu(!showMapTypeMenu)}
                        >
                            <Ionicons name="layers-outline" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </SafeAreaView>
                )}

                {/* Map type mini-menu */}
                {showMapTypeMenu && (
                    <View style={styles.mapTypeMenu}>
                        {(['standard', 'satellite', 'terrain', 'hybrid'] as MapType[]).map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.mapTypeOption, mapType === t && styles.mapTypeOptionActive]}
                                onPress={() => { setMapType(t); setShowMapTypeMenu(false); }}
                            >
                                <Ionicons
                                    name={
                                        t === 'standard' ? 'map-outline'
                                        : t === 'satellite' ? 'globe-outline'
                                        : t === 'terrain' ? 'triangle-outline'
                                        : 'layers'
                                    }
                                    size={14}
                                    color={mapType === t ? Colors.textInverse : Colors.textPrimary}
                                />
                                <Text style={[styles.mapTypeText, mapType === t && styles.mapTypeTextActive]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* FABs — right side of map */}
                <View style={styles.fabColumn}>
                    <TouchableOpacity style={styles.fab} onPress={recenter}>
                        <Ionicons name="navigate-circle-outline" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    {!locationGranted && (
                        <TouchableOpacity style={[styles.fab, styles.fabAccent]} onPress={requestLocation}>
                            <Ionicons name="location" size={22} color={Colors.textInverse} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Bottom Panel (25 %) ──────────────────────────────────────── */}
            <View style={styles.bottomPanel}>

                {/* Search bar — always visible */}
                <TouchableOpacity style={styles.searchBar} onPress={openSearch} activeOpacity={0.9}>
                    <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
                    <Text
                        style={[styles.searchBarText, destination && styles.searchBarTextActive]}
                        numberOfLines={1}
                    >
                        {destination ? destination.name : 'Search city or place…'}
                    </Text>
                    {destination ? (
                        <TouchableOpacity
                            onPress={clearDestination}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                    ) : (
                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    )}
                </TouchableOpacity>

                {/* ── Destination selected ── */}
                {destination ? (
                    <View style={styles.destPanel}>
                        {/* Distance / time row */}
                        {routeLoading ? (
                            <View style={styles.routeLoadingRow}>
                                <ActivityIndicator size="small" color={Colors.textPrimary} />
                                <Text style={styles.routeLoadingText}>Calculating route…</Text>
                            </View>
                        ) : route ? (
                            <View style={styles.routeMetricsRow}>
                                <Ionicons name="map-outline" size={13} color={Colors.textMuted} />
                                <Text style={styles.routeMetricVal}>{formatDistance(route.distanceM)}</Text>
                                <View style={styles.metricDot} />
                                <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                                <Text style={styles.routeMetricVal}>{formatDuration(route.durationS)}</Text>
                            </View>
                        ) : null}

                        {/* Action buttons */}
                        <View style={styles.actionRow}>
                            {/* Find Routes — primary CTA, shown for city destinations */}
                            {destination.isCity && userCity ? (
                                <TouchableOpacity
                                    style={styles.findRoutesBtn}
                                    onPress={handleFindRoutes}
                                >
                                    <Ionicons name="train-outline" size={16} color={Colors.textInverse} />
                                    <Text style={styles.findRoutesBtnText}>Find Routes</Text>
                                </TouchableOpacity>
                            ) : null}

                            {/* Navigate */}
                            <TouchableOpacity
                                style={[styles.navBtn, destination.isCity && userCity && styles.navBtnSecondary]}
                                onPress={navMode ? stopNavigation : startNavigation}
                            >
                                <Ionicons
                                    name={navMode ? 'stop-circle' : 'navigate'}
                                    size={16}
                                    color={destination.isCity && userCity ? Colors.textPrimary : Colors.textInverse}
                                />
                                <Text style={[
                                    styles.navBtnText,
                                    destination.isCity && userCity && styles.navBtnTextSecondary,
                                ]}>
                                    {navMode ? 'Stop' : 'Navigate'}
                                </Text>
                            </TouchableOpacity>

                            {/* Clear */}
                            <TouchableOpacity style={styles.clearBtn} onPress={clearDestination}>
                                <Ionicons name="close" size={16} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* ── No destination: show POI category chips ── */
                    <View style={styles.poiSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.poiBarContent}
                        >
                            {POI_CATEGORIES.map(cat => (
                                <Animated.View
                                    key={cat.id}
                                    style={activePOI === cat.id ? { transform: [{ scale: poiBtnScale }] } : undefined}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.poiChip,
                                            activePOI === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                                        ]}
                                        onPress={() => handlePOICategory(cat.id)}
                                    >
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={14}
                                            color={activePOI === cat.id ? '#fff' : Colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.poiChipText,
                                            activePOI === cat.id && { color: '#fff' },
                                        ]}>
                                            {cat.label}
                                        </Text>
                                        {activePOI === cat.id && pois.length > 0 && (
                                            <View style={styles.poiCountBadge}>
                                                <Text style={styles.poiCountText}>{pois.length}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </ScrollView>
                        {poiLoading && (
                            <View style={styles.poiLoadingRow}>
                                <ActivityIndicator size="small" color={Colors.textPrimary} />
                                <Text style={styles.poiLoadingText}>Finding nearby places…</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* ── Full-screen Search Panel ─────────────────────────────────── */}
            {showSearchPanel && (
                <Animated.View style={[styles.searchPanel, { opacity: searchPanelFade }]}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                        <View style={styles.searchPanelHeader}>
                            <TouchableOpacity onPress={closeSearch} style={styles.searchPanelBack}>
                                <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                            </TouchableOpacity>
                            <TextInput
                                ref={searchInputRef}
                                style={styles.searchPanelInput}
                                placeholder="Search city, area, or place..."
                                placeholderTextColor={Colors.textMuted}
                                value={searchText}
                                onChangeText={setSearchText}
                                autoFocus
                                clearButtonMode="while-editing"
                            />
                            {searching && (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.textPrimary}
                                    style={{ marginRight: 12 }}
                                />
                            )}
                        </View>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(r, i) => `${r.lat}-${r.lng}-${i}`}
                            renderItem={({ item }) => (
                                <SearchRow item={item} onPress={() => selectDestination(item)} />
                            )}
                            ListEmptyComponent={
                                searchText.length >= 2 && !searching ? (
                                    <View style={styles.noResults}>
                                        <Text style={styles.noResultsText}>No places found for "{searchText}"</Text>
                                    </View>
                                ) : searchText.length === 0 ? (
                                    <View style={styles.searchHint}>
                                        <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                                        <Text style={styles.searchHintText}>Type a city name to search</Text>
                                        <Text style={styles.searchHintSub}>e.g. "Chennai", "Mumbai", "Kochi"</Text>
                                    </View>
                                ) : null
                            }
                            keyboardShouldPersistTaps="handled"
                        />
                    </SafeAreaView>
                </Animated.View>
            )}
        </View>
    );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'column', backgroundColor: Colors.background },

    // ── Map container (75 %) ─────────────────────────────────────────────────
    mapContainer: {
        height: height * 0.75,
        overflow: 'hidden',
    },

    // Nav banner (absolute inside mapContainer)
    navBannerWrap: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: Spacing.sm, paddingTop: 4,
        zIndex: 10,
    },
    navBanner: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.accent, borderRadius: Radius.xl,
        padding: Spacing.md, ...Shadow.large,
    },
    navBannerIcon: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    navBannerText: { flex: 1 },
    navInstruction: { fontSize: 14, fontWeight: '600', color: Colors.textInverse },
    navDistance: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    navEndBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },

    // Map-type toggle (top-right of map)
    mapTopRight: {
        position: 'absolute', top: 0, right: Spacing.sm,
        paddingTop: 4, zIndex: 10,
    },
    iconBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
        ...Shadow.medium, borderWidth: 1, borderColor: Colors.border,
    },

    // Map type menu
    mapTypeMenu: {
        position: 'absolute', top: 58, right: Spacing.sm,
        backgroundColor: Colors.background, borderRadius: Radius.lg,
        ...Shadow.large, borderWidth: 1, borderColor: Colors.border,
        overflow: 'hidden', zIndex: 20,
    },
    mapTypeOption: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    mapTypeOptionActive: { backgroundColor: Colors.accent },
    mapTypeText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
    mapTypeTextActive: { color: Colors.textInverse },

    // FABs (right side of map, pinned above bottom panel)
    fabColumn: {
        position: 'absolute',
        right: Spacing.sm,
        bottom: Spacing.md,
        gap: Spacing.sm,
        zIndex: 10,
    },
    fab: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
        ...Shadow.medium, borderWidth: 1, borderColor: Colors.border,
    },
    fabAccent: { backgroundColor: Colors.accent },

    // Map markers
    destMarkerWrap: { alignItems: 'center' },
    poiMarkerWrap: {
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#fff', ...Shadow.small,
    },

    // ── Bottom Panel (25 %) ──────────────────────────────────────────────────
    bottomPanel: {
        flex: 1,
        backgroundColor: Colors.background,
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
        ...Shadow.large,
        borderTopWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },

    // Search bar in bottom panel
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md, paddingVertical: 13,
        borderWidth: 1, borderColor: Colors.border,
        ...Shadow.small,
    },
    searchBarText: { flex: 1, fontSize: 15, color: Colors.textMuted },
    searchBarTextActive: { color: Colors.textPrimary, fontWeight: '500' },

    // Destination panel
    destPanel: { flex: 1, gap: Spacing.xs },
    routeLoadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    },
    routeLoadingText: { fontSize: 13, color: Colors.textSecondary },
    routeMetricsRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    routeMetricVal: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
    metricDot: {
        width: 3, height: 3, borderRadius: 1.5,
        backgroundColor: Colors.textMuted, marginHorizontal: 2,
    },
    actionRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1,
    },
    findRoutesBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, backgroundColor: Colors.accent, paddingVertical: 13,
        borderRadius: Radius.full, ...Shadow.small,
    },
    findRoutesBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textInverse },
    navBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, backgroundColor: Colors.accent, paddingVertical: 13,
        borderRadius: Radius.full,
    },
    navBtnSecondary: {
        backgroundColor: Colors.surface,
        borderWidth: 1.5, borderColor: Colors.borderDark,
    },
    navBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textInverse },
    navBtnTextSecondary: { color: Colors.textPrimary },
    clearBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },

    // POI chips section
    poiSection: { flex: 1, gap: Spacing.xs },
    poiBarContent: { gap: Spacing.xs, paddingRight: Spacing.sm },
    poiChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.background, borderRadius: Radius.full,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: Colors.border, ...Shadow.small,
    },
    poiChipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
    poiCountBadge: {
        minWidth: 16, height: 16, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    },
    poiCountText: { fontSize: 9, fontWeight: '700', color: '#fff' },
    poiLoadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingTop: 4,
    },
    poiLoadingText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

    // ── Full-screen Search Panel ─────────────────────────────────────────────
    searchPanel: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        zIndex: 100,
    },
    searchPanelHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
        gap: Spacing.xs,
    },
    searchPanelBack: {
        width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    },
    searchPanelInput: {
        flex: 1, fontSize: 16, color: Colors.textPrimary, paddingVertical: 6,
    },
    searchResultRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    searchResultIcon: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    searchResultText: { flex: 1 },
    searchResultName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
    searchResultSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    noResults: { padding: Spacing.xl, alignItems: 'center' },
    noResultsText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
    searchHint: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
    searchHintText: { fontSize: 16, fontWeight: '500', color: Colors.textMuted },
    searchHintSub: { fontSize: 13, color: Colors.textMuted },
});

