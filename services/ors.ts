// OpenRouteService (ORS) API wrapper + Nominatim geocoding
// Free ORS key: https://openrouteservice.org/sign-up/

const ORS_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY || '';
const ORS_BASE = 'https://api.openrouteservice.org/v2';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoResult {
    name: string;
    displayName: string;
    lat: number;
    lng: number;
    type: string;       // 'city' | 'place' | etc.
    isCity: boolean;
}

export interface RouteStep {
    instruction: string;
    distance: number;   // metres
    duration: number;   // seconds
    type: number;       // ORS manoeuvre type
}

export interface ORSRoute {
    coordinates: { lat: number; lng: number }[];
    distanceM: number;
    durationS: number;
    steps: RouteStep[];
}

// ─── Nominatim Geocoding ───────────────────────────────────────────────────────

export async function geocodeSearch(query: string): Promise<GeoResult[]> {
    try {
        const url =
            `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=8` +
            `&countrycodes=in&addressdetails=1`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'TriPlan-App/1.0' },
        });
        const data = await res.json();
        return data.map((d: any) => ({
            name: d.name || d.display_name.split(',')[0],
            displayName: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
            type: d.type || d.class,
            isCity: ['city', 'town', 'village', 'state', 'administrative'].includes(d.type),
        }));
    } catch (e) {
        console.error('Nominatim error:', e);
        return [];
    }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'TriPlan-App/1.0' } }
        );
        const data = await res.json();
        const a = data.address;
        return a.city || a.town || a.village || a.county || a.state || 'Your Location';
    } catch {
        return 'Your Location';
    }
}

// ─── ORS Route Calculation ────────────────────────────────────────────────────

export async function calculateRoute(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car'
): Promise<ORSRoute | null> {
    // If no ORS key, return straight-line fallback
    if (!ORS_KEY || ORS_KEY === 'your_ors_api_key_here') {
        return straightLineFallback(fromLat, fromLng, toLat, toLng);
    }

    try {
        const res = await fetch(`${ORS_BASE}/directions/${profile}/geojson`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ORS_KEY,
            },
            body: JSON.stringify({
                coordinates: [[fromLng, fromLat], [toLng, toLat]],
                instructions: true,
                instructions_format: 'text',
                language: 'en',
            }),
        });

        if (!res.ok) {
            console.warn('ORS API error:', res.status);
            return straightLineFallback(fromLat, fromLng, toLat, toLng);
        }

        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) return straightLineFallback(fromLat, fromLng, toLat, toLng);

        const coords: { lat: number; lng: number }[] = feature.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
        );

        const summary = feature.properties.summary;
        const segments = feature.properties.segments?.[0];
        const steps: RouteStep[] = (segments?.steps || []).map((s: any) => ({
            instruction: s.instruction,
            distance: s.distance,
            duration: s.duration,
            type: s.type,
        }));

        return {
            coordinates: coords,
            distanceM: summary.distance,
            durationS: summary.duration,
            steps,
        };
    } catch (e) {
        console.error('ORS error:', e);
        return straightLineFallback(fromLat, fromLng, toLat, toLng);
    }
}

function straightLineFallback(
    fromLat: number, fromLng: number, toLat: number, toLng: number
): ORSRoute {
    const R = 6371e3;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const speedMs = 60 / 3.6; // ~60 km/h
    return {
        coordinates: [
            { lat: fromLat, lng: fromLng },
            // Midpoint with slight curve
            { lat: (fromLat + toLat) / 2 + (toLng - fromLng) * 0.04, lng: (fromLng + toLng) / 2 },
            { lat: toLat, lng: toLng },
        ],
        distanceM,
        durationS: distanceM / speedMs,
        steps: [
            { instruction: `Head towards ${(toLat > fromLat ? 'north' : 'south')}`, distance: distanceM, duration: distanceM / speedMs, type: 11 },
            { instruction: 'Arrive at destination', distance: 0, duration: 0, type: 10 },
        ],
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDistance(metres: number): string {
    if (metres < 1000) return `${Math.round(metres)} m`;
    return `${(metres / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
}

export const STEP_ICONS: Record<number, string> = {
    0: 'arrow-up',       // straight
    1: 'arrow-forward',  // right
    2: 'arrow-back',     // left
    3: 'arrow-up',       // sharp right
    4: 'arrow-up',       // sharp left
    5: 'refresh',        // u-turn
    6: 'arrow-forward-circle', // merge
    7: 'git-merge',      // ramp
    8: 'git-branch',     // fork
    10: 'location',      // arrive
    11: 'navigate',      // depart
};
