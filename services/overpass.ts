// Overpass API – Nearby POI fetcher (free, no key needed)

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export interface POICategory {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export interface POIResult {
    id: number;
    lat: number;
    lng: number;
    name: string;
    category: string;
    tags: Record<string, string>;
}

// ─── Category Definitions ────────────────────────────────────────────────────

export const POI_CATEGORIES: POICategory[] = [
    { id: 'food', label: 'Food', icon: 'restaurant', color: '#E8450A' },
    { id: 'cafe', label: 'Cafe', icon: 'cafe', color: '#7B4A2D' },
    { id: 'hospital', label: 'Hospital', icon: 'medical', color: '#D32F2F' },
    { id: 'pharmacy', label: 'Pharmacy', icon: 'medkit', color: '#388E3C' },
    { id: 'fuel', label: 'Fuel', icon: 'car', color: '#F57C00' },
    { id: 'atm', label: 'ATM', icon: 'card', color: '#1565C0' },
    { id: 'police', label: 'Police', icon: 'shield', color: '#283593' },
    { id: 'market', label: 'Market', icon: 'cart', color: '#6A1B9A' },
];

// Per-category Overpass node filters (using simple equality, not regex)
const CATEGORY_FILTERS: Record<string, string[]> = {
    food: [
        'node["amenity"="restaurant"]',
        'node["amenity"="fast_food"]',
        'node["amenity"="food_court"]',
        'way["amenity"="restaurant"]',
    ],
    cafe: [
        'node["amenity"="cafe"]',
        'node["amenity"="tea_house"]',
        'node["amenity"="juice_bar"]',
    ],
    hospital: [
        'node["amenity"="hospital"]',
        'node["amenity"="clinic"]',
        'node["amenity"="doctors"]',
        'way["amenity"="hospital"]',
    ],
    pharmacy: [
        'node["amenity"="pharmacy"]',
        'node["shop"="chemist"]',
    ],
    fuel: [
        'node["amenity"="fuel"]',
    ],
    atm: [
        'node["amenity"="atm"]',
        'node["amenity"="bank"]["atm"="yes"]',
    ],
    police: [
        'node["amenity"="police"]',
        'way["amenity"="police"]',
    ],
    market: [
        'node["shop"="supermarket"]',
        'node["shop"="convenience"]',
        'node["amenity"="marketplace"]',
        'way["shop"="supermarket"]',
    ],
};

// ─── Fetch Nearby POIs ────────────────────────────────────────────────────────

export async function fetchNearbyPOIs(
    lat: number,
    lng: number,
    categoryId: string,
    radiusMetres: number = 2000
): Promise<POIResult[]> {
    const filters = CATEGORY_FILTERS[categoryId];
    if (!filters) return [];

    // Build union of all node filters
    const filterBlock = filters
        .map(f => `${f}(around:${radiusMetres},${lat},${lng});`)
        .join('\n  ');

    const query = `[out:json][timeout:20];
(
  ${filterBlock}
);
out center 25;`;

    try {
        const res = await fetch(OVERPASS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
        });

        // Read as text first — Overpass sometimes returns HTML on error
        const text = await res.text();

        // Detect HTML error page
        if (text.trim().startsWith('<')) {
            console.warn('Overpass returned HTML (possible rate limit or error), status:', res.status);
            return [];
        }

        let data: any;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            console.warn('Overpass JSON parse failed:', text.substring(0, 200));
            return [];
        }

        if (!data?.elements) return [];

        return data.elements
            .filter((el: any) => el.lat != null || el.center != null)
            .map((el: any) => ({
                id: el.id,
                lat: el.lat ?? el.center.lat,
                lng: el.lon ?? el.center.lon,
                name: el.tags?.name || el.tags?.['name:en'] || getCategoryLabel(categoryId),
                category: categoryId,
                tags: el.tags || {},
            }))
            .slice(0, 25);
    } catch (err) {
        console.error('Overpass fetch error:', err);
        return [];
    }
}

export function getCategoryColor(id: string): string {
    return POI_CATEGORIES.find(c => c.id === id)?.color || '#555';
}

export function getCategoryIcon(id: string): string {
    return POI_CATEGORIES.find(c => c.id === id)?.icon || 'location';
}

function getCategoryLabel(id: string): string {
    return POI_CATEGORIES.find(c => c.id === id)?.label || 'Place';
}
