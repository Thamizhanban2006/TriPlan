export interface BookingProvider {
    name: string;
    logo: string;
    types: string[];
    baseUrl: string;
    appScheme?: string;
    color: string;
}

export const BOOKING_PROVIDERS: BookingProvider[] = [
    {
        name: 'IndiGo',
        logo: '✈',
        types: ['flight'],
        baseUrl: 'https://www.goindigo.in',
        appScheme: 'goindigo://',
        color: '#00008B',
    },
    {
        name: 'Air India',
        logo: '✈',
        types: ['flight'],
        baseUrl: 'https://www.airindia.in',
        color: '#C00000',
    },
    {
        name: 'SpiceJet',
        logo: '✈',
        types: ['flight'],
        baseUrl: 'https://www.spicejet.com',
        color: '#E04E2F',
    },
    {
        name: 'Vistara',
        logo: '✈',
        types: ['flight'],
        baseUrl: 'https://www.airvistara.com',
        color: '#4B1E78',
    },
    {
        name: 'IRCTC',
        logo: '🚂',
        types: ['train'],
        baseUrl: 'https://www.irctc.co.in',
        appScheme: 'irctcrail://',
        color: '#003580',
    },
    {
        name: 'RedBus',
        logo: '🚌',
        types: ['bus'],
        baseUrl: 'https://www.redbus.in',
        appScheme: 'redbus://',
        color: '#D84141',
    },
    {
        name: 'AbhiBus',
        logo: '🚌',
        types: ['bus'],
        baseUrl: 'https://www.abhibus.com',
        color: '#F47B20',
    },
    {
        name: 'Ola',
        logo: '🚗',
        types: ['rideshare', 'cab'],
        baseUrl: 'https://www.olacabs.com',
        appScheme: 'olacabs://',
        color: '#2CA040',
    },
    {
        name: 'Uber',
        logo: '🚗',
        types: ['rideshare', 'cab'],
        baseUrl: 'https://www.uber.com',
        appScheme: 'uber://',
        color: '#000000',
    },
    {
        name: 'Rapido',
        logo: '🏍',
        types: ['rideshare', 'bike'],
        baseUrl: 'https://rapido.bike',
        color: '#FFCC00',
    },
];

export function getProviderUrl(providerName: string, from: string, to: string, date: string): string {
    const name = providerName.toLowerCase();

    if (name.includes('redbus')) {
        const fromSlug = from.toLowerCase().replace(/\s+/g, '-');
        const toSlug = to.toLowerCase().replace(/\s+/g, '-');
        return `https://www.redbus.in/bus-tickets/${fromSlug}-to-${toSlug}?fromCityName=${encodeURIComponent(from)}&toCityName=${encodeURIComponent(to)}&onward=${date}`;
    }
    if (name.includes('irctc')) {
        return `https://www.irctc.co.in/nget/train-search?fromStation=${encodeURIComponent(from.toUpperCase())}&toStation=${encodeURIComponent(to.toUpperCase())}&jrnyDate=${date}`;
    }
    if (name.includes('indigo')) {
        return `https://www.goindigo.in/book/flight?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
    }
    if (name.includes('air india')) {
        return `https://www.airindia.in/book-flights.htm?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
    }
    if (name.includes('spicejet')) {
        return `https://www.spicejet.com/?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&date=${date}`;
    }
    if (name.includes('ola')) {
        return `https://book.olacabs.com/?pickup_name=${encodeURIComponent(from)}&drop_name=${encodeURIComponent(to)}`;
    }
    if (name.includes('uber')) {
        return `https://m.uber.com/ul/?pickup_name=${encodeURIComponent(from)}&dropoff_name=${encodeURIComponent(to)}`;
    }

    const provider = BOOKING_PROVIDERS.find(p => p.name.toLowerCase() === name);
    return provider?.baseUrl || 'https://www.google.com/search?q=' + encodeURIComponent(`${providerName} ${from} to ${to}`);
}
