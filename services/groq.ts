import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
    dangerouslyAllowBrowser: true,
});

export interface JourneyLeg {
    mode: 'flight' | 'train' | 'bus' | 'ferry' | 'rideshare' | 'metro';
    provider: string;
    from: string;
    to: string;
    fromTerminal?: string;   // bus stand, railway station, airport name
    toTerminal?: string;     // bus stand, railway station, airport name
    departureTime: string;
    arrivalTime: string;
    duration: string;
    class?: string;
    amenities?: string[];
    status?: 'on-time' | 'delayed';
    trainNumber?: string;
    busNumber?: string;
    flightNumber?: string;
    seatTypes?: string[];
}

export interface RouteOption {
    id: string;
    legs: JourneyLeg[];
    totalDuration: string;
    price: { min: number; max: number; currency: string };
    carbonKg: number;
    tags: string[];   // e.g. ["Cheapest", "Fastest", "Eco-Friendly"]
    transfers: number;
    duration: string;
    highlights?: string[];
}

export interface SearchParams {
    from: string;
    to: string;
    date: string;
    passengers: number;
    preference: 'cost' | 'speed' | 'comfort' | 'eco';
    modes: string[];
}

const SYSTEM_PROMPT = `You are TriPlan's route intelligence engine for Indian transportation.
Your job is to generate realistic, detailed, and accurate multi-modal journey options for ANY Indian city pair.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no extra text.
2. Return an array of 5-8 RouteOption objects covering different transport combinations.
3. Always include at least one bus option (with TNSTC / SETC / KSRTC / MSRTC / RSRTC / UPSRTC / GSRTC options as relevant), one train (IRCTC), and one flight (IndiGo / Air India / SpiceJet / Akasa).
4. For buses: always specify the exact bus stand name (e.g. "Koyambedu CMBT", "Majestic Bus Stand (Kempegowda Bus Stand)", "Guindy Bus Terminus", "Tambaram Bus Stand", "Mumbai Central Bus Depot", "Pune Swargate Bus Stand", "Hyderabad MGBS (Imlibun)", "Delhi ISBT Kashmere Gate", "Jaipur Sindhi Camp Bus Stand").
5. For trains: always specify the railway station name (e.g. "Chennai Central (MAS)", "Mumbai CST (CSMT)", "Bangalore City (SBC)", "Delhi New Delhi (NDLS)") and the actual train name + number.
6. For flights: always specify the airport (e.g. "Chennai International Airport (MAA)", "Chhatrapati Shivaji Maharaj International Airport (BOM)").
7. Price ranges must be realistic INR values matching current Indian market rates.
8. Duration must be realistic for the mode and distance.
9. Departure times should be spread across the day (morning / afternoon / evening / night options).
10. Carbon footprint in kg must be realistic (bus ~0.02 kg/km/pax, train ~0.01 kg/km/pax, flight ~0.09 kg/km/pax).

INDIAN BUS PROVIDERS BY STATE:
- Tamil Nadu: TNSTC (Tamil Nadu State Transport Corporation), SETC (State Express Transport Corporation), PRTC (Pallavan Road Transport Corporation)
- Karnataka: KSRTC (Karnataka State Road Transport Corporation), BMTC (Bangalore Metropolitan)
- Maharashtra: MSRTC (Maharashtra State Road Transport Corporation), "Shivneri Deluxe", "Asiad" 
- Andhra/Telangana: APSRTC (AP State Road Transport Corporation), TSRTC (Telangana State)
- Gujarat: GSRTC (Gujarat State Road Transport)
- Rajasthan: RSRTC (Rajasthan State Road Transport)
- Uttar Pradesh: UPSRTC (UP State Road Transport)
- Delhi: DTC (Delhi Transport Corporation)
- Private operators: RedBus (Volvo/VRL/SRS), IntrCity SmartBus, NueGo (EV buses), Kallada Travels, Orange Tours, Parveen Travels, SRS Travels, VRL Travels, Chartered Speed

INDIAN TRAIN CLASSES: 1A (AC First), 2A (AC 2-Tier), 3A (AC 3-Tier), SL (Sleeper), CC (AC Chair Car), 2S (Second Sitting)
Key trains to mention: Vande Bharat Express, Rajdhani Express, Shatabdi Express, Duronto Express, Humsafar Express, Garib Rath, Jan Shatabdi, Express trains

FLIGHT PROVIDERS: IndiGo, Air India, SpiceJet, Akasa Air, GoFirst, Air India Express, Alliance Air, Vistara

Generate routes for the given search. Factor in the preference to rank the best option first.`;

function getMockRoutes(params: SearchParams): RouteOption[] {
    return [
        {
            id: 'mock-1',
            legs: [
                {
                    mode: 'bus',
                    provider: 'TNSTC / SETC Ultra Deluxe',
                    from: params.from,
                    to: params.to,
                    fromTerminal: 'Koyambedu CMBT (Chennai Mofussil Bus Terminus)',
                    toTerminal: 'Kempegowda Bus Stand (Majestic), Bangalore',
                    departureTime: '22:00',
                    arrivalTime: '06:00',
                    duration: '8h',
                    class: 'Ultra Deluxe AC',
                    amenities: ['AC', 'Blanket', 'Charging Point', 'Sleeper Seats'],
                    status: 'on-time',
                    busNumber: 'TN-01-N-4421',
                    seatTypes: ['Seater (2+2)', 'Semi-Sleeper (2+1)', 'Sleeper (1+1)'],
                },
            ],
            totalDuration: '8h',
            duration: '8h',
            price: { min: 500, max: 1100, currency: 'INR' },
            carbonKg: 4.8,
            tags: ['Cheapest', 'Eco-Friendly'],
            transfers: 0,
            highlights: ['Most popular overnight bus', 'Arrives early morning'],
        },
        {
            id: 'mock-2',
            legs: [
                {
                    mode: 'train',
                    provider: 'IRCTC – Shatabdi Express',
                    from: params.from,
                    to: params.to,
                    fromTerminal: 'Chennai Central (MAS)',
                    toTerminal: 'Bangalore City Junction (SBC)',
                    departureTime: '06:00',
                    arrivalTime: '11:00',
                    duration: '5h',
                    class: 'CC / 2A',
                    amenities: ['Breakfast Included', 'AC', 'Panoramic Windows', 'Pantry'],
                    status: 'on-time',
                    trainNumber: '12007 – Chennai Shatabdi Express',
                    seatTypes: ['2nd AC (2A)', 'AC Chair Car (CC)'],
                },
            ],
            totalDuration: '5h',
            duration: '5h',
            price: { min: 700, max: 1600, currency: 'INR' },
            carbonKg: 2.1,
            tags: ['Fastest Train', 'Premium'],
            transfers: 0,
            highlights: ['Premium morning train', 'Meal included'],
        },
        {
            id: 'mock-3',
            legs: [
                {
                    mode: 'flight',
                    provider: 'IndiGo',
                    from: params.from,
                    to: params.to,
                    fromTerminal: 'Chennai International Airport (MAA) – T1',
                    toTerminal: 'Kempegowda International Airport (BLR) – T2',
                    departureTime: '07:30',
                    arrivalTime: '08:30',
                    duration: '1h',
                    class: 'Economy',
                    amenities: ['Snacks', 'Cabin Baggage 7kg', 'Web Check-in'],
                    status: 'on-time',
                    flightNumber: '6E-301',
                    seatTypes: ['Economy', 'Extra Legroom'],
                },
            ],
            totalDuration: '1h',
            duration: '1h',
            price: { min: 2200, max: 5500, currency: 'INR' },
            carbonKg: 58,
            tags: ['Fastest Overall'],
            transfers: 0,
        },
    ];
}

export async function searchRoutes(params: SearchParams): Promise<RouteOption[]> {
    const modeNote = params.modes.length > 0
        ? `Focus on: ${params.modes.join(', ')} modes.`
        : 'Provide bus, train, and flight options (and cab/ferry where relevant).';

    const prefNote: Record<string, string> = {
        cost: 'Rank by lowest price first. Include all budget options.',
        speed: 'Rank by fastest journey first. Prioritize direct flights and express trains.',
        comfort: 'Rank by highest comfort first. Prioritize premium trains (Vande Bharat, Rajdhani) and AC Volvo buses.',
        eco: 'Rank by lowest carbon footprint first. Bus and train first.',
    };

    const prompt = `Search: ${params.from} → ${params.to}
Date: ${params.date}
Passengers: ${params.passengers}
Preference: ${prefNote[params.preference] || 'Balanced options'}
${modeNote}

MANDATORY REQUIREMENTS:
- Include specific bus stand names for all bus routes
- Include actual railway station codes and train numbers
- Include airport codes for all flights
- Include at least 2 different bus operators (TNSTC, SETC, KSRTC, MSRTC, RedBus, etc. as applicable)
- Include at least 2 different trains at different times of day
- Include flights from at least 2 carriers if direct flight is available
- All prices in INR, realistic for current Indian market
- Show morning, afternoon, evening, and night departure options

Return a JSON array of 6-8 RouteOption objects. Each must follow this exact structure:
[
  {
    "id": "unique-id",
    "legs": [
      {
        "mode": "bus|train|flight|rideshare|ferry|metro",
        "provider": "Provider Name",
        "from": "City Name",
        "to": "City Name",
        "fromTerminal": "Exact bus stand / station / airport name with code",
        "toTerminal": "Exact bus stand / station / airport name with code",
        "departureTime": "HH:MM",
        "arrivalTime": "HH:MM",
        "duration": "Xh Ym",
        "class": "Class Name",
        "amenities": ["item1", "item2"],
        "status": "on-time",
        "trainNumber": "Train number if train",
        "busNumber": "Bus/service number if bus",
        "flightNumber": "Flight code if flight",
        "seatTypes": ["Type 1", "Type 2"]
      }
    ],
    "totalDuration": "Xh Ym",
    "duration": "Xh Ym",
    "price": { "min": 500, "max": 900, "currency": "INR" },
    "carbonKg": 4.5,
    "tags": ["Cheapest"],
    "transfers": 0,
    "highlights": ["Key selling point"]
  }
]`;

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 6000,
        });

        const raw = completion.choices[0]?.message?.content || '';
        // Extract JSON array from response
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array in response');
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty result');
        return parsed as RouteOption[];
    } catch (error) {
        console.error('Groq search error:', error);
        return getMockRoutes(params);
    }
}

export async function findAlternativeRoutes(
    from: string,
    to: string,
    currentMode: string
): Promise<RouteOption[]> {
    const prompt = `Emergency alternatives: ${from} → ${to}
Current ${currentMode} is delayed/cancelled. Find 3 alternative routes NOW.
Include: fastest available bus, next available train, and direct cab/rideshare.
All must be immediately available (next 2 hours).
Return JSON array of 3 RouteOption objects.`;
    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 3000,
        });
        const raw = completion.choices[0]?.message?.content || '';
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON');
        return JSON.parse(jsonMatch[0]) as RouteOption[];
    } catch {
        return getMockRoutes({ from, to, date: '', passengers: 1, preference: 'speed', modes: [] });
    }
}
