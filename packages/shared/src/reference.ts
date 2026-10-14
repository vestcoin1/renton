/**
 * Reference data shared by web, mobile and the API: supported locations,
 * property types, budget bands and amenities. Not mock data; these are the
 * catalogues the product is built around.
 */
import type { PropertyType } from "./types";

export interface CityInfo {
  name: string;
  state: string;
  areas: string[];
  tagline: string;
  image: string;
  avgRent: number;
}

export const LOCATIONS: Record<string, { cities: string[] }> = {
  Lagos: { cities: ["Lagos"] },
  FCT: { cities: ["Abuja"] },
  Rivers: { cities: ["Port Harcourt"] },
  Enugu: { cities: ["Enugu"] },
  "Akwa Ibom": { cities: ["Uyo"] },
  Edo: { cities: ["Benin City"] },
};

export const CITIES: CityInfo[] = [
  {
    name: "Lagos",
    state: "Lagos",
    areas: ["Lekki Phase 1", "Ikoyi", "Victoria Island", "Yaba", "Ikeja GRA", "Ajah", "Surulere", "Magodo"],
    tagline: "Nigeria's commercial heartbeat",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=70",
    avgRent: 6_800_000,
  },
  {
    name: "Abuja",
    state: "FCT",
    areas: ["Maitama", "Wuse 2", "Asokoro", "Gwarinpa", "Jabi", "Lokogoma", "Katampe"],
    tagline: "Planned, green and secure",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
    avgRent: 5_900_000,
  },
  {
    name: "Port Harcourt",
    state: "Rivers",
    areas: ["GRA Phase 2", "Old GRA", "Rumuola", "Trans-Amadi", "Peter Odili Road", "Eliozu"],
    tagline: "The Garden City",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=70",
    avgRent: 3_200_000,
  },
  {
    name: "Enugu",
    state: "Enugu",
    areas: ["Independence Layout", "GRA", "Trans-Ekulu", "New Haven", "Achara Layout"],
    tagline: "The Coal City, calm and green",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=70",
    avgRent: 2_100_000,
  },
  {
    name: "Uyo",
    state: "Akwa Ibom",
    areas: ["Ewet Housing Estate", "Shelter Afrique", "Osongama", "Nwaniba Road"],
    tagline: "Clean streets, rising fast",
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70",
    avgRent: 1_700_000,
  },
  {
    name: "Benin City",
    state: "Edo",
    areas: ["GRA", "Ugbowo", "Sapele Road", "Ikpokpan", "Aduwawa"],
    tagline: "Heritage meets modern living",
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=70",
    avgRent: 1_600_000,
  },
];

export const STATES = Object.keys(LOCATIONS);

export function citiesFor(state?: string) {
  if (!state) return CITIES.map((c) => c.name);
  return LOCATIONS[state]?.cities ?? [];
}

export function areasFor(city?: string) {
  if (!city) return [];
  return CITIES.find((c) => c.name === city)?.areas ?? [];
}

/** URL slug for a city page, e.g. "Port Harcourt" → "port-harcourt". */
export function citySlug(city: string) {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function stateForCity(city: string) {
  return CITIES.find((c) => c.name === city)?.state;
}

export const PROPERTY_TYPES: PropertyType[] = ["Self Contain", "Mini Flat", "Apartment", "Terrace", "Bungalow", "Duplex", "Penthouse"];

export const BUDGET_RANGES = [
  { label: "Under ₦1M", min: 0, max: 1_000_000 },
  { label: "₦1M – ₦3M", min: 1_000_000, max: 3_000_000 },
  { label: "₦3M – ₦6M", min: 3_000_000, max: 6_000_000 },
  { label: "₦6M – ₦12M", min: 6_000_000, max: 12_000_000 },
  { label: "₦12M – ₦25M", min: 12_000_000, max: 25_000_000 },
  { label: "₦25M+", min: 25_000_000, max: 100_000_000 },
];

export const AMENITIES = [
  "24/7 Security",
  "Borehole",
  "Fitted Kitchen",
  "Wardrobes",
  "Air Conditioning",
  "Swimming Pool",
  "Gym",
  "Elevator",
  "Inverter Backup",
  "Generator",
  "Prepaid Meter",
  "CCTV",
  "Boys' Quarters",
  "Balcony",
  "Parking",
  "Gated Estate",
  "Water Heater",
  "POP Ceiling",
  "Wi-Fi Ready",
  "Children's Playground",
] as const;

export const MAX_BUDGET = 50_000_000;
