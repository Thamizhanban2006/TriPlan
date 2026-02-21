import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { RouteOption, SearchParams, JourneyLeg } from '../services/groq';

interface PassengerDetails {
    name: string;
    age: string;
    gender: 'male' | 'female' | 'other';
    idType: 'aadhar' | 'passport' | 'pan' | 'driving';
    idNumber: string;
    phone: string;
    email: string;
}

interface JourneyState {
    searchParams: SearchParams | null;
    searchResults: RouteOption[];
    selectedRoute: RouteOption | null;
    passengers: PassengerDetails[];
    isSearching: boolean;
    error: string | null;
    origin: { name: string; lat?: number; lng?: number } | null;
    destination: { name: string; lat?: number; lng?: number } | null;
    recentSearches: { from: string; to: string; date: string }[];
}

type JourneyAction =
    | { type: 'SET_SEARCH_PARAMS'; payload: SearchParams }
    | { type: 'SET_SEARCHING'; payload: boolean }
    | { type: 'SET_RESULTS'; payload: RouteOption[] }
    | { type: 'SET_SELECTED_ROUTE'; payload: RouteOption }
    | { type: 'SET_PASSENGERS'; payload: PassengerDetails[] }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_ORIGIN'; payload: { name: string; lat?: number; lng?: number } }
    | { type: 'SET_DESTINATION'; payload: { name: string; lat?: number; lng?: number } }
    | { type: 'ADD_RECENT_SEARCH'; payload: { from: string; to: string; date: string } }
    | { type: 'CLEAR_RESULTS' };

const initialState: JourneyState = {
    searchParams: null,
    searchResults: [],
    selectedRoute: null,
    passengers: [],
    isSearching: false,
    error: null,
    origin: null,
    destination: null,
    recentSearches: [
        { from: 'Mumbai', to: 'Delhi', date: '2026-02-25' },
        { from: 'Bangalore', to: 'Chennai', date: '2026-02-22' },
        { from: 'Hyderabad', to: 'Pune', date: '2026-02-28' },
    ],
};

function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
    switch (action.type) {
        case 'SET_SEARCH_PARAMS':
            return { ...state, searchParams: action.payload, error: null };
        case 'SET_SEARCHING':
            return { ...state, isSearching: action.payload };
        case 'SET_RESULTS':
            return { ...state, searchResults: action.payload, isSearching: false };
        case 'SET_SELECTED_ROUTE':
            return { ...state, selectedRoute: action.payload };
        case 'SET_PASSENGERS':
            return { ...state, passengers: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isSearching: false };
        case 'SET_ORIGIN':
            return { ...state, origin: action.payload };
        case 'SET_DESTINATION':
            return { ...state, destination: action.payload };
        case 'ADD_RECENT_SEARCH':
            return {
                ...state,
                recentSearches: [action.payload, ...state.recentSearches.slice(0, 4)],
            };
        case 'CLEAR_RESULTS':
            return { ...state, searchResults: [], selectedRoute: null };
        default:
            return state;
    }
}

interface JourneyContextType {
    state: JourneyState;
    dispatch: React.Dispatch<JourneyAction>;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export function JourneyProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(journeyReducer, initialState);
    return (
        <JourneyContext.Provider value={{ state, dispatch }}>
            {children}
        </JourneyContext.Provider>
    );
}

export function useJourney() {
    const context = useContext(JourneyContext);
    if (!context) throw new Error('useJourney must be used within JourneyProvider');
    return context;
}
