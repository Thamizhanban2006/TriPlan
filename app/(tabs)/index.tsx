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
            {/* ── Full-screen Map ── */}
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
                        {/* Shadow */}
                        <Polyline coordinates={polylineCoords} strokeColor="rgba(0,0,0,0.12)" strokeWidth={7} />
                        {/* Main line */}
                        <Polyline coordinates={polylineCoords} strokeColor={Colors.textPrimary} strokeWidth={4} />
                        {/* Progress (done portion) */}
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
                                name: poi.name,
                                displayName: poi.name,
                                lat: poi.lat,
                                lng: poi.lng,
                                type: 'place',
                                isCity: false,
                            };
                            selectDestination(result);
                        }}
                    />
                ))}

                {/* Selected POI highlight circle */}
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

            {/* ── TOP OVERLAY ── */}
            <SafeAreaView style={styles.topOverlay} pointerEvents="box-none" edges={['top']}>

                {/* Navigation step banner (shown during nav) */}
                {navMode && currentNavStep && (
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
                )}

                {/* Search bar */}
                {!navMode && (
                    <View style={styles.searchBarRow}>
                        <TouchableOpacity style={styles.searchBar} onPress={openSearch} activeOpacity={0.9}>
                            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
                            <Text style={[styles.searchBarText, destination && styles.searchBarTextActive]} numberOfLines={1}>
                                {destination ? destination.name : 'Search city or place...'}
                            </Text>
                            {destination && (
                                <TouchableOpacity onPress={clearDestination} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* Map type toggle */}
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => setShowMapTypeMenu(!showMapTypeMenu)}
                        >
                            <Ionicons name="layers-outline" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
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
                                    name={t === 'standard' ? 'map-outline' : t === 'satellite' ? 'globe-outline' : t === 'terrain' ? 'triangle-outline' : 'layers'}
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
            </SafeAreaView>

            {/* ── POI Category Bar ── */}
            {!navMode && (
                <View style={styles.poiBar}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.poiBarContent}
                    >
                        {POI_CATEGORIES.map(cat => (
                            <Animated.View key={cat.id} style={activePOI === cat.id ? { transform: [{ scale: poiBtnScale }] } : undefined}>
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

                    {/* poi loading indicator below category bar */}
                    {poiLoading && (
                        <View style={styles.poiLoadingBannerInline}>
                            <ActivityIndicator size="small" color={Colors.textPrimary} />
                            <Text style={styles.poiLoadingText}>Finding nearby places...</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── Right-side floating buttons ── */}
            <View style={styles.fabColumn}>
                {/* Recenter */}
                <TouchableOpacity style={styles.fab} onPress={recenter}>
                    <Ionicons name="navigate-circle-outline" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                {/* Location grant */}
                {!locationGranted && (
                    <TouchableOpacity style={[styles.fab, styles.fabAccent]} onPress={requestLocation}>
                        <Ionicons name="location" size={22} color={Colors.textInverse} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Route Info Panel ── */}
            <Animated.View style={[styles.routePanel, { transform: [{ translateY: routePanelSlide }] }]}>
                {routeLoading ? (
                    <View style={styles.routePanelLoading}>
                        <ActivityIndicator size="small" color={Colors.textPrimary} />
                        <Text style={styles.routePanelLoadingText}>Calculating route...</Text>
                    </View>
                ) : route && destination ? (
                    <>
                        {/* Destination + distance/duration */}
                        <View style={styles.routeInfoRow}>
                            <View style={styles.routeDestBlock}>
                                <Text style={styles.routeDestName} numberOfLines={1}>{destination.name}</Text>
                                <Text style={styles.routeDestSub} numberOfLines={1}>
                                    {destination.isCity ? destination.displayName.split(',').slice(0, 2).join(',') : 'Custom location'}
                                </Text>
                            </View>
                            <View style={styles.routeMetrics}>
                                <View style={styles.routeMetric}>
                                    <Ionicons name="map-outline" size={13} color={Colors.textMuted} />
                                    <Text style={styles.routeMetricVal}>{formatDistance(route.distanceM)}</Text>
                                </View>
                                <View style={styles.routeMetric}>
                                    <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                                    <Text style={styles.routeMetricVal}>{formatDuration(route.durationS)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Steps preview (first 2 steps) */}
                        {route.steps.slice(0, 2).map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                                <View style={styles.stepIconBox}>
                                    <Ionicons name={(STEP_ICONS[step.type] || 'navigate') as any} size={13} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.stepText} numberOfLines={1}>{step.instruction}</Text>
                                <Text style={styles.stepDist}>{formatDistance(step.distance)}</Text>
                            </View>
                        ))}
                        {route.steps.length > 2 && (
                            <Text style={styles.moreSteps}>+{route.steps.length - 2} more steps</Text>
                        )}

                        {/* Action buttons */}
                        <View style={styles.routeActions}>
                            {/* Navigate button */}
                            <TouchableOpacity
                                style={styles.navBtn}
                                onPress={navMode ? stopNavigation : startNavigation}
                            >
                                <Ionicons name={navMode ? 'stop-circle' : 'navigate'} size={16} color={Colors.textInverse} />
                                <Text style={styles.navBtnText}>{navMode ? 'Stop Nav' : 'Navigate'}</Text>
                            </TouchableOpacity>

                            {/* Find Routes – only for city destinations */}
                            {destination.isCity && userCity && (
                                <TouchableOpacity style={styles.findRoutesBtn} onPress={handleFindRoutes}>
                                    <Ionicons name="train-outline" size={16} color={Colors.textPrimary} />
                                    <Text style={styles.findRoutesBtnText}>Find Routes</Text>
                                </TouchableOpacity>
                            )}

                            {/* Clear */}
                            <TouchableOpacity style={styles.clearBtn} onPress={clearDestination}>
                                <Ionicons name="close" size={16} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </>
                ) : null}
            </Animated.View>

            {/* ── Search Panel (full-screen modal-like) ── */}
            {showSearchPanel && (
                <Animated.View style={[styles.searchPanel, { opacity: searchPanelFade }]}>
                    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                        {/* Search input row */}
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
                            {searching && <ActivityIndicator size="small" color={Colors.textPrimary} style={{ marginRight: 12 }} />}
                        </View>

                        {/* Results */}
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
                                        <Text style={styles.searchHintSub}>
                                            e.g. "Chennai", "Mumbai", "Kochi"
                                        </Text>
                                    </View>
                                ) : null
                            }
                            keyboardShouldPersistTaps="handled"
                        />
                    </SafeAreaView>
                </Animated.View>
            )}

            {/* ── No-location prompt ── */}
            {!locationGranted && !showSearchPanel && (
                <View style={styles.locationPrompt}>
                    <TouchableOpacity style={styles.locationPromptBtn} onPress={requestLocation}>
                        <Ionicons name="location" size={16} color={Colors.textInverse} />
                        <Text style={styles.locationPromptText}>Enable Location</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Top overlay ──
    topOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: Spacing.sm, paddingTop: 4,
    },

    // Nav banner
    navBanner: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.accent, borderRadius: Radius.xl,
        padding: Spacing.md, marginBottom: Spacing.xs, ...Shadow.large,
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

    // Search bar
    searchBarRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs,
    },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.background, borderRadius: Radius.full,
        paddingHorizontal: Spacing.md, paddingVertical: 11,
        ...Shadow.large, borderWidth: 1, borderColor: Colors.border,
    },
    searchBarText: { flex: 1, fontSize: 14, color: Colors.textMuted },
    searchBarTextActive: { color: Colors.textPrimary, fontWeight: '500' },
    iconBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
        ...Shadow.medium, borderWidth: 1, borderColor: Colors.border,
    },

    // Map type menu
    mapTypeMenu: {
        position: 'absolute', top: 52, right: Spacing.sm,
        backgroundColor: Colors.background, borderRadius: Radius.lg,
        ...Shadow.large, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    mapTypeOption: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    mapTypeOptionActive: { backgroundColor: Colors.accent },
    mapTypeText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
    mapTypeTextActive: { color: Colors.textInverse },

    poiLoadingBannerInline: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: Radius.full,
        paddingHorizontal: Spacing.md, paddingVertical: 6,
        alignSelf: 'center', marginTop: 8, ...Shadow.small,
        borderWidth: 1, borderColor: Colors.border,
    },
    poiLoadingText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

    // ── POI Category Bar ──
    poiBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 95,
        left: 0, right: 0,
    },
    poiBarContent: {
        paddingHorizontal: Spacing.sm, gap: Spacing.xs,
    },
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

    // ── FABs ──
    fabColumn: {
        position: 'absolute',
        right: Spacing.sm,
        bottom: 240,
        gap: Spacing.sm,
    },
    fab: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
        ...Shadow.medium, borderWidth: 1, borderColor: Colors.border,
    },
    fabAccent: { backgroundColor: Colors.accent },

    // ── Route Panel ──
    routePanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.background,
        borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
        padding: Spacing.md, paddingBottom: Spacing.xl,
        ...Shadow.large, borderWidth: 1, borderColor: Colors.border,
    },
    routePanelLoading: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        justifyContent: 'center', paddingVertical: Spacing.md,
    },
    routePanelLoadingText: { fontSize: 14, color: Colors.textSecondary },

    routeInfoRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm,
    },
    routeDestBlock: { flex: 1 },
    routeDestName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
    routeDestSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    routeMetrics: { alignItems: 'flex-end', gap: 4 },
    routeMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    routeMetricVal: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

    stepRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    stepIconBox: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    stepText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
    stepDist: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    moreSteps: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

    routeActions: {
        flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center',
    },
    navBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, backgroundColor: Colors.accent, paddingVertical: 13,
        borderRadius: Radius.full, ...Shadow.small,
    },
    navBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textInverse },
    findRoutesBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, backgroundColor: Colors.surface, paddingVertical: 13,
        borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.textPrimary,
    },
    findRoutesBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
    clearBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },

    // ── Map markers ──
    destMarkerWrap: { alignItems: 'center' },
    poiMarkerWrap: {
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#fff', ...Shadow.small,
    },

    // ── Search panel ──
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

    // ── No location prompt ──
    locationPrompt: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
    },
    locationPromptBtn: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: Radius.full, ...Shadow.large,
    },
    locationPromptText: { fontSize: 14, fontWeight: '600', color: Colors.textInverse },
});
