export type VehicleCategory = 'car' | 'motorcycle' | 'bicycle' | 'ev';

export type DriveVehicleMode = 'car' | 'motorcycle';

export type FacilityType =
  | 'mall'
  | 'hotel'
  | 'commercial'
  | 'public'
  | 'private'
  | 'market'
  | 'hospital'
  | 'university'
  | 'entertainment'
  | 'street'
  | 'motorcycle_lot'
  | 'ev_station';

export type AvailabilityStatus = 'available' | 'limited' | 'full' | 'unknown';

export type AvailabilitySource = 'live_api' | 'operator_reported' | 'unverified';

export type PriceVerificationStatus = 'confirmed' | 'estimated' | 'unavailable';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

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
  gracePeriod?: string;
  motorcycle?: RateValue;
  motorcycleDaily?: RateValue;
  carHourly?: RateValue;
  carDaily?: RateValue;
  bicycle?: RateValue;
  daily?: RateValue;
  monthlyCar?: RateValue;
  monthlyMotorcycle?: RateValue;
  additionalCharges?: string;
}

export interface ParkingCapacityInfo {
  totalSpaces: number | null;
  carSpaces?: number | null;
  motorcycleSpaces?: number | null;
  evSpaces?: number | null;
  indoorOutdoor: 'indoor' | 'outdoor' | 'mixed' | 'unknown';
  covered: boolean | null;
  paymentMethods?: string[];
  heightLimitMeters?: number | null;
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
  parkingFeeSeparateNote?: string;
  operatingHours: string;
  portCount: number | null;
  liveStatus: 'available' | 'busy' | 'offline' | 'unknown';
  availabilityNote?: string;
  parentParkingId?: string;
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
  operatorName?: string | null;
  address: string;
  district: string; // Khan / major urban district
  commune?: string | null; // Sangkat
  village?: string | null; // Phum
  landmarks?: string[];
  facilityType: FacilityType;
  openHours: string;
  /** Primary hourly car rate in KHR (0 if free, null if unverified/unavailable) */
  pricePerHourKhr: number | null;
  /** Numeric booking rate in KHR for demo bay reservations */
  pricePerHour: number;
  pricing: ParkingPricing;
  capacity?: ParkingCapacityInfo;
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
  priceConfidence: ConfidenceLevel;
  locationConfidence: ConfidenceLevel;
  sourceUrls: string[];
  lastVerifiedDate: string;
  googleMapsUrl?: string;
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

/** Exact 32-field export schema specified in Section 7 for CSV/JSON integration */
export interface PhnomPenhParkingRecord {
  parking_id: string;
  parking_name: string;
  parking_category: FacilityType;
  operator_name: string | null;
  address: string;
  district: string;
  commune: string | null;
  village: string | null;
  latitude: number;
  longitude: number;
  google_maps_url: string;
  motorcycle_hourly_fee: string | null;
  motorcycle_daily_fee: string | null;
  car_hourly_fee: string | null;
  car_daily_fee: string | null;
  monthly_fee: string | null;
  free_parking_conditions: string | null;
  operating_hours: string;
  parking_capacity: string | null;
  parking_type: 'indoor' | 'outdoor' | 'mixed' | 'Unknown';
  covered_parking: boolean | null;
  payment_methods: string | null;
  ev_charging_available: boolean;
  ev_charging_provider: string | null;
  ev_connector_types: string | null;
  ev_charging_speed: string | null;
  ev_price_per_kwh: string | null;
  parking_status: string;
  price_confidence: ConfidenceLevel;
  location_confidence: ConfidenceLevel;
  source_urls: string[];
  last_verified_date: string;
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
