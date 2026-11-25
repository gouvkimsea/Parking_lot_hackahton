export type VehicleCategory = 'car' | 'motorcycle' | 'bicycle' | 'ev';

export type FacilityType =
  | 'mall'
  | 'commercial'
  | 'hotel'
  | 'public'
  | 'private'
  | 'street'
  | 'ev_station';

export type AvailabilityStatus = 'available' | 'limited' | 'full' | 'unknown';

export type AvailabilitySource = 'live_api' | 'operator_reported' | 'unverified';

export type PriceVerificationStatus = 'confirmed' | 'estimated' | 'unavailable';

export type PriceBracketFilter =
  | 'all'
  | 'free'
  | 'under_2000'
  | '2000_to_5000'
  | 'above_5000';

export type EvFilterMode = 'all' | 'available' | 'fast' | 'standard';

export type MarkerColorVariant =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'red'
  | 'cyan';

export type FloorId = 'ground' | 'first' | 'second';

export type ActiveTab = 'map' | 'home' | 'settings';

export type MobileScreen = 'home' | 'details' | 'select-space';

export interface ParkingBay {
  id: string;
  label: string;
  floor: FloorId;
  side: 'left' | 'right';
  rowIndex: number; // 0 to 4
  baseOccupied: boolean;
  evReady?: boolean;
}

export interface RateValue {
  khr: number | null;
  usd?: number | null;
  unit: 'hour' | 'entry' | 'day' | 'month' | 'kWh';
  note?: string;
}

export interface ParkingPricing {
  verificationStatus: PriceVerificationStatus;
  sourceLabel: string;
  isFree?: boolean;
  freeRule?: string;
  motorcycle?: RateValue;
  carHourly?: RateValue;
  bicycle?: RateValue;
  daily?: RateValue;
  monthlyCar?: RateValue;
  monthlyMotorcycle?: RateValue;
  additionalCharges?: string;
}

export interface EvChargingInfo {
  provider: string | null;
  connectorTypes: string[];
  maxPowerKw: number | null;
  speedTier: 'fast' | 'standard' | 'unknown';
  pricePerKwhKhr: number | null;
  pricePerKwhUsd?: number | null;
  priceStatus: PriceVerificationStatus;
  priceNote?: string;
  operatingHours: string;
  portCount: number | null;
  liveStatus: 'available' | 'busy' | 'offline' | 'unknown';
  availabilityNote?: string;
}

export interface FacilityAvailability {
  status: AvailabilityStatus;
  source: AvailabilitySource;
  availableSpaces: number | null;
  totalSpaces?: number | null;
  note?: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  tagline: string;
  address: string;
  district: string;
  landmarks?: string[];
  facilityType: FacilityType;
  openHours: string;
  /** Primary hourly car rate in KHR (0 if free, null if unverified/unavailable) */
  pricePerHourKhr: number | null;
  /** Legacy numeric booking rate in KHR for demo bay reservations */
  pricePerHour: number;
  pricing: ParkingPricing;
  availability: FacilityAvailability;
  evCharging?: EvChargingInfo;
  categories: VehicleCategory[];
  images: string[];
  description: string;
  facilities: string[];
  distanceKm: number | null;
  rating: number | null;
  reviewCount: number | null;
  dataSource: 'verified_dataset' | 'google_places' | 'osm_overpass';
  googlePlaceId?: string;
  coordinates: {
    x: number;
    y: number;
  };
  position: {
    lat: number;
    lng: number;
  };
  floors: Record<FloorId, ParkingBay[]>;
}

export interface PriceReport {
  id: string;
  lotId: string;
  lotName: string;
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'ev_kwh';
  reportedPriceKhr: number;
  notes: string;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  code: string;
  lotId: string;
  lotName: string;
  lotAddress: string;
  floor: FloorId;
  floorLabel: string;
  bayId: string;
  bayLabel: string;
  vehicleCategory: VehicleCategory;
  licensePlate: string;
  date: string;
  startTime: string;
  durationHours: number;
  hourlyRate: number;
  serviceFee: number;
  totalPrice: number;
  status: 'active' | 'cancelled';
  createdAt: string;
}

export interface SavedVehicle {
  id: string;
  label: string;
  plate: string;
  category: VehicleCategory;
}

export interface UserPreferences {
  autoGateEntry: boolean;
  pushReminders: boolean;
  evPriority: boolean;
}
