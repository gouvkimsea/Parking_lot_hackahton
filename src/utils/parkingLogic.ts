import type {
  AvailabilityStatus,
  BookingRecord,
  DriveVehicleMode,
  EvFilterMode,
  FacilityType,
  FloorId,
  MarkerColorVariant,
  ParkingBay,
  ParkingLot,
  PhnomPenhParkingRecord,
  PriceBracketFilter,
  PriceReport,
  RateValue,
  VehicleCategory,
} from '../types/parking';

export const FLOOR_LABELS: Record<FloorId, string> = {
  ground: 'Ground Floor',
  first: '1st Floor',
  second: '2nd Floor',
};

export const FLOOR_ORDER: FloorId[] = ['ground', 'first', 'second'];

export const KHR_PER_USD = 4000;
export const SERVICE_FEE_RATE = 0.05;
export const MIN_SERVICE_FEE_KHR = 1000;

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  mall: 'Shopping Mall / Retail',
  hotel: 'Hotel / Resort',
  commercial: 'Commercial Building',
  public: 'Public Parking Lot',
  private: 'Private Parking',
  market: 'Market Parking',
  hospital: 'Hospital / Clinic',
  university: 'University / Campus',
  entertainment: 'Dining / Entertainment',
  street: 'Permitted Street Parking',
  motorcycle_lot: 'Motorcycle Parking',
  ev_station: 'EV Charging Station',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleCategory, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
  ev: 'Electric Vehicle',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  limited: 'Limited spaces',
  full: 'Full',
  unknown: 'Unknown',
};

export function getFloorLabel(floor: FloorId): string {
  return FLOOR_LABELS[floor];
}

export function formatKhr(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} KHR`;
}

export function formatUsdApprox(khrAmount: number): string {
  const usd = khrAmount / KHR_PER_USD;
  return `~$${usd.toFixed(2)}`;
}

/** Legacy-friendly currency formatter now rendering KHR */
export function formatCurrency(amountKhr: number): string {
  return formatKhr(amountKhr);
}

/** Returns a concise primary hourly/entry price string for cards & marker tooltips */
export function getCompactPriceDisplay(lot: ParkingLot): {
  primaryText: string;
  secondaryUsd: string | null;
  status: 'confirmed' | 'estimated' | 'unavailable';
} {
  if (lot.facilityType === 'ev_station' && lot.evCharging) {
    if (lot.evCharging.pricePerKwhKhr !== null) {
      return {
        primaryText: `${formatKhr(lot.evCharging.pricePerKwhKhr)}/kWh`,
        secondaryUsd: formatUsdApprox(lot.evCharging.pricePerKwhKhr),
        status: lot.evCharging.priceStatus,
      };
    }
    return {
      primaryText: 'Price unavailable',
      secondaryUsd: null,
      status: 'unavailable',
    };
  }

  if (lot.pricing.isFree && lot.pricePerHourKhr === 0) {
    return {
      primaryText: 'Free parking',
      secondaryUsd: null,
      status: lot.pricing.verificationStatus,
    };
  }

  if (lot.pricing.carHourly?.khr !== null && lot.pricing.carHourly?.khr !== undefined) {
    const val = lot.pricing.carHourly.khr;
    const unitLabel = lot.pricing.carHourly.unit === 'entry' ? '/entry' : '/hr';
    return {
      primaryText: `${formatKhr(val)}${unitLabel}`,
      secondaryUsd: formatUsdApprox(val),
      status: lot.pricing.verificationStatus,
    };
  }

  if (lot.pricing.motorcycle?.khr !== null && lot.pricing.motorcycle?.khr !== undefined) {
    const val = lot.pricing.motorcycle.khr;
    return {
      primaryText: `Moto ${formatKhr(val)}`,
      secondaryUsd: formatUsdApprox(val),
      status: lot.pricing.verificationStatus,
    };
  }

  if (lot.pricing.monthlyCar?.khr !== null && lot.pricing.monthlyCar?.khr !== undefined) {
    const val = lot.pricing.monthlyCar.khr;
    return {
      primaryText: `${formatKhr(val)}/mo`,
      secondaryUsd: formatUsdApprox(val),
      status: lot.pricing.verificationStatus,
    };
  }

  if (lot.pricing.monthlyMotorcycle?.khr !== null && lot.pricing.monthlyMotorcycle?.khr !== undefined) {
    const val = lot.pricing.monthlyMotorcycle.khr;
    return {
      primaryText: `Moto ${formatKhr(val)}/mo`,
      secondaryUsd: formatUsdApprox(val),
      status: lot.pricing.verificationStatus,
    };
  }

  return {
    primaryText: 'Price unavailable',
    secondaryUsd: null,
    status: 'unavailable',
  };
}

/**
 * Determines marker color per design spec:
 * - Cyan: EV charging stations
 * - Green: Available parking
 * - Orange: Limited parking
 * - Red: Full parking
 * - Purple: Shopping mall parking (when availability is unknown)
 * - Blue: General parking (commercial, hotel, public, private, street when unknown)
 */
export function getMarkerColorVariant(lot: ParkingLot): MarkerColorVariant {
  if (lot.facilityType === 'ev_station') {
    return 'cyan';
  }
  if (lot.availability.status === 'available') {
    return 'green';
  }
  if (lot.availability.status === 'limited') {
    return 'orange';
  }
  if (lot.availability.status === 'full') {
    return 'red';
  }
  if (lot.facilityType === 'mall') {
    return 'purple';
  }
  return 'blue';
}

export function calculateDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Number((R * c).toFixed(2));
}

export function findNearestParkingLot(
  lots: ParkingLot[],
  userPos: { lat: number; lng: number }
): { lot: ParkingLot; distanceKm: number } | null {
  if (lots.length === 0) return null;
  let nearestLot = lots[0];
  let minDistance = calculateDistanceKm(userPos, lots[0].position);
  for (let i = 1; i < lots.length; i++) {
    const dist = calculateDistanceKm(userPos, lots[i].position);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLot = lots[i];
    }
  }
  return { lot: nearestLot, distanceKm: minDistance };
}

export function findNearestCompatibleParking(
  lots: ParkingLot[],
  userPos: { lat: number; lng: number },
  vehicle: DriveVehicleMode
): { lot: ParkingLot; distanceKm: number } | null {
  const compatible = lots.filter((lot) => lot.categories.includes(vehicle));
  if (compatible.length === 0) return null;
  const nonFull = compatible.filter((lot) => lot.availability.status !== 'full');
  return findNearestParkingLot(nonFull.length > 0 ? nonFull : compatible, userPos);
}

export function buildGoogleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  vehicle: DriveVehicleMode | null
): string {
  const travelMode = vehicle === 'motorcycle' ? 'two-wheeler' : 'driving';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${travelMode}`;
}

export const DEFAULT_DAILY_STAY_HOURS = 8;

export interface DailyRateComparisonItem {
  id: string;
  name: string;
  shortName: string;
  district: string;
  distanceKm: number;
  hourlyRate: number;
  dailyRate: number;
  rating: number | null;
  availableSpaces: number;
}

export function calculateDailyRate(
  hourlyRateKhr: number,
  hoursPerDay = DEFAULT_DAILY_STAY_HOURS
): number {
  const safeHours = Math.max(1, Math.min(24, Math.round(hoursPerDay)));
  const safeRate = Math.max(0, hourlyRateKhr);
  return Math.round(safeRate * safeHours);
}

function abbreviateLotName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+Parking$/i, '')
    .replace(/\s+Mega\s+Mall$/i, '')
    .replace(/\s+Mall$/i, '')
    .slice(0, 18);
}

export function getTopNearestDailyRates(
  lots: ParkingLot[],
  activeBookedBayKeys: Set<string>,
  referencePos: { lat: number; lng: number } = { lat: 11.5625, lng: 104.916 },
  limit = 5,
  hoursPerDay = DEFAULT_DAILY_STAY_HOURS
): DailyRateComparisonItem[] {
  const safeLimit = Math.max(1, Math.round(limit));
  return lots
    .filter(
      (lot) =>
        lot.pricing.carHourly?.khr !== null &&
        lot.pricing.carHourly?.khr !== undefined &&
        lot.pricing.carHourly.khr > 0
    )
    .map((lot) => ({
      lot,
      dist: calculateDistanceKm(referencePos, lot.position),
      rate: lot.pricing.carHourly!.khr!,
    }))
    .sort((a, b) => a.dist - b.dist || a.rate - b.rate)
    .slice(0, safeLimit)
    .map(({ lot, dist, rate }) => ({
      id: lot.id,
      name: lot.name,
      shortName: abbreviateLotName(lot.name),
      district: lot.district,
      distanceKm: dist,
      hourlyRate: rate,
      dailyRate: calculateDailyRate(rate, hoursPerDay),
      rating: lot.rating,
      availableSpaces: countAvailableSpaces(lot, activeBookedBayKeys),
    }));
}

export function getBayCompositeKey(lotId: string, bayId: string): string {
  return `${lotId}::${bayId}`;
}

export function getActiveBookedBayKeys(bookings: BookingRecord[]): Set<string> {
  const keys = new Set<string>();
  for (const booking of bookings) {
    if (booking.status === 'active') {
      keys.add(getBayCompositeKey(booking.lotId, booking.bayId));
    }
  }
  return keys;
}

export function isBayOccupied(
  lotId: string,
  bay: ParkingBay,
  activeBookedBayKeys: Set<string>
): boolean {
  if (bay.baseOccupied) return true;
  return activeBookedBayKeys.has(getBayCompositeKey(lotId, bay.id));
}

export function countAvailableSpaces(
  lot: ParkingLot,
  activeBookedBayKeys: Set<string>
): number {
  let available = 0;
  for (const floor of FLOOR_ORDER) {
    for (const bay of lot.floors[floor]) {
      if (!isBayOccupied(lot.id, bay, activeBookedBayKeys)) {
        available += 1;
      }
    }
  }
  return available;
}

export function countFloorAvailableSpaces(
  lot: ParkingLot,
  floor: FloorId,
  activeBookedBayKeys: Set<string>
): number {
  let available = 0;
  for (const bay of lot.floors[floor]) {
    if (!isBayOccupied(lot.id, bay, activeBookedBayKeys)) {
      available += 1;
    }
  }
  return available;
}

export function findFirstAvailableBay(
  lot: ParkingLot,
  floor: FloorId,
  activeBookedBayKeys: Set<string>,
  preferredLabel?: string
): ParkingBay | null {
  const bays = lot.floors[floor];
  if (preferredLabel) {
    const preferred = bays.find(
      (b) => b.label === preferredLabel && !isBayOccupied(lot.id, b, activeBookedBayKeys)
    );
    if (preferred) return preferred;
  }
  return bays.find((b) => !isBayOccupied(lot.id, b, activeBookedBayKeys)) ?? null;
}

export interface FilterCriteria {
  query: string;
  category: VehicleCategory | 'all';
}

export function filterParkingLots(
  lots: ParkingLot[],
  criteria: FilterCriteria
): ParkingLot[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();

  return lots.filter((lot) => {
    const categoryMatches =
      criteria.category === 'all' || lot.categories.includes(criteria.category);
    if (!categoryMatches) return false;

    if (!normalizedQuery) return true;

    const haystack = [
      lot.name,
      lot.tagline,
      lot.address,
      lot.district,
      ...(lot.landmarks ?? []),
      ...lot.facilities,
      lot.evCharging?.provider ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export interface PhnomPenhFilterCriteria {
  query: string;
  district: string; // 'All Phnom Penh' or specific district
  vehicleType: VehicleCategory | 'all';
  priceBracket: PriceBracketFilter;
  facilityType: FacilityType | 'all';
  availability: AvailabilityStatus | 'all';
  evFilter: EvFilterMode;
  nearUserOnly?: boolean;
  userPosition?: { lat: number; lng: number } | null;
  maxDistanceKm?: number;
}

function matchesPriceBracket(lot: ParkingLot, bracket: PriceBracketFilter): boolean {
  if (bracket === 'all') return true;
  if (bracket === 'free') {
    return Boolean(lot.pricing.isFree) || lot.pricePerHourKhr === 0;
  }

  // Determine representative hourly/entry KHR rate for filtering
  const rate =
    lot.pricing.carHourly?.khr ??
    lot.pricing.motorcycle?.khr ??
    lot.pricePerHourKhr;

  if (rate === null || rate === undefined) {
    return false;
  }

  if (bracket === 'under_2000') {
    return rate > 0 && rate < 2000;
  }
  if (bracket === '2000_to_5000') {
    return rate >= 2000 && rate <= 5000;
  }
  if (bracket === 'above_5000') {
    return rate > 5000;
  }
  return true;
}

function matchesEvFilter(lot: ParkingLot, evFilter: EvFilterMode): boolean {
  if (evFilter === 'all') return true;
  if (lot.facilityType !== 'ev_station' && !lot.evCharging) return false;
  if (evFilter === 'available') {
    return (
      lot.evCharging?.liveStatus === 'available' ||
      lot.availability.status === 'available'
    );
  }
  if (evFilter === 'fast') {
    return lot.evCharging?.speedTier === 'fast';
  }
  if (evFilter === 'standard') {
    return lot.evCharging?.speedTier === 'standard';
  }
  return true;
}

export function filterPhnomPenhLots(
  lots: ParkingLot[],
  criteria: PhnomPenhFilterCriteria
): ParkingLot[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();

  const filtered = lots.filter((lot) => {
    if (
      criteria.district &&
      criteria.district !== 'All Phnom Penh' &&
      lot.district.toLowerCase() !== criteria.district.toLowerCase()
    ) {
      return false;
    }

    if (
      criteria.vehicleType !== 'all' &&
      !lot.categories.includes(criteria.vehicleType)
    ) {
      return false;
    }

    if (
      criteria.facilityType !== 'all' &&
      lot.facilityType !== criteria.facilityType
    ) {
      return false;
    }

    if (
      criteria.availability !== 'all' &&
      lot.availability.status !== criteria.availability
    ) {
      return false;
    }

    if (!matchesPriceBracket(lot, criteria.priceBracket)) {
      return false;
    }

    if (!matchesEvFilter(lot, criteria.evFilter)) {
      return false;
    }

    if (criteria.nearUserOnly && criteria.userPosition) {
      const dist = calculateDistanceKm(criteria.userPosition, lot.position);
      if (dist > (criteria.maxDistanceKm ?? 3.5)) {
        return false;
      }
    }

    if (!normalizedQuery) return true;

    const haystack = [
      lot.name,
      lot.tagline,
      lot.address,
      lot.district,
      FACILITY_TYPE_LABELS[lot.facilityType],
      ...(lot.landmarks ?? []),
      ...lot.facilities,
      lot.evCharging?.provider ?? '',
      ...(lot.evCharging?.connectorTypes ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  if (criteria.userPosition) {
    return [...filtered].sort((a, b) => {
      const distA = calculateDistanceKm(criteria.userPosition!, a.position);
      const distB = calculateDistanceKm(criteria.userPosition!, b.position);
      return distA - distB;
    });
  }

  return filtered;
}

export interface BookingSummary {
  subtotal: number;
  serviceFee: number;
  totalPrice: number;
}

export function calculateBookingSummary(
  hourlyRateKhr: number,
  durationHours: number
): BookingSummary {
  const safeHours = Math.max(1, Math.min(24, Math.round(durationHours)));
  const subtotal = Math.round(hourlyRateKhr * safeHours);
  const rawFee = subtotal * SERVICE_FEE_RATE;
  const serviceFee =
    subtotal === 0 ? 0 : Math.round(Math.max(MIN_SERVICE_FEE_KHR, rawFee));
  const totalPrice = subtotal + serviceFee;

  return { subtotal, serviceFee, totalPrice };
}

export interface BookingInput {
  bayId: string | null;
  licensePlate: string;
  date: string;
  startTime: string;
  durationHours: number;
}

export interface BookingValidationResult {
  valid: boolean;
  errors: {
    bayId?: string;
    licensePlate?: string;
    date?: string;
    startTime?: string;
    durationHours?: string;
  };
}

export function validateBookingInput(input: BookingInput): BookingValidationResult {
  const errors: BookingValidationResult['errors'] = {};

  if (!input.bayId) {
    errors.bayId = 'Please select an available parking space.';
  }

  const cleanedPlate = input.licensePlate.trim().toUpperCase();
  if (!cleanedPlate) {
    errors.licensePlate = 'License plate is required.';
  } else if (cleanedPlate.length < 3 || cleanedPlate.length > 14) {
    errors.licensePlate = 'Enter a valid plate (3–14 characters).';
  } else if (!/^[A-Z0-9-\s]+$/.test(cleanedPlate)) {
    errors.licensePlate = 'Use letters, numbers, or hyphens only.';
  }

  if (!input.date.trim()) {
    errors.date = 'Choose a booking date.';
  }

  if (!input.startTime.trim()) {
    errors.startTime = 'Choose an arrival time.';
  }

  if (!Number.isFinite(input.durationHours) || input.durationHours < 1 || input.durationHours > 24) {
    errors.durationHours = 'Duration must be between 1 and 24 hours.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface VehicleInput {
  label: string;
  plate: string;
}

export interface VehicleValidationResult {
  valid: boolean;
  errors: {
    label?: string;
    plate?: string;
  };
}

export function validateVehicleInput(input: VehicleInput): VehicleValidationResult {
  const errors: VehicleValidationResult['errors'] = {};
  if (input.label.trim().length < 2) {
    errors.label = 'Enter a vehicle name (e.g. Toyota Prius).';
  }

  const plate = input.plate.trim().toUpperCase();
  if (!plate) {
    errors.plate = 'License plate is required.';
  } else if (plate.length < 3 || plate.length > 14 || !/^[A-Z0-9-\s]+$/.test(plate)) {
    errors.plate = 'Enter a valid plate (3–14 letters/numbers).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePriceReport(input: {
  reportedPriceKhr: string;
  notes: string;
}): {
  valid: boolean;
  parsedPrice?: number;
  errors: { reportedPriceKhr?: string; notes?: string };
} {
  const errors: { reportedPriceKhr?: string; notes?: string } = {};
  const trimmed = input.reportedPriceKhr.replace(/,/g, '').trim();
  const parsed = Number(trimmed);

  if (!trimmed || !Number.isFinite(parsed) || parsed < 0 || parsed > 2000000) {
    errors.reportedPriceKhr = 'Enter a valid rate in KHR (0 – 2,000,000).';
  }

  if (input.notes.trim().length > 300) {
    errors.notes = 'Note must be 300 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    parsedPrice: Number.isFinite(parsed) ? Math.round(parsed) : undefined,
    errors,
  };
}

export function createPriceReportRecord(params: {
  lotId: string;
  lotName: string;
  vehicleType: PriceReport['vehicleType'];
  reportedPriceKhr: number;
  notes: string;
}): PriceReport {
  return {
    id: `pr-${Date.now()}`,
    lotId: params.lotId,
    lotName: params.lotName,
    vehicleType: params.vehicleType,
    reportedPriceKhr: Math.round(params.reportedPriceKhr),
    notes: params.notes.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function formatBookingCode(bayLabel: string, seedNumber: number): string {
  const normalizedBay = bayLabel.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const suffix = String(Math.abs(seedNumber) % 9000 + 1000);
  return `PK-${normalizedBay}-${suffix}`;
}

function formatRateForExport(rate?: RateValue): string | null {
  if (!rate || rate.khr === null || rate.khr === undefined) return null;
  if (rate.khr === 0) return '0 KHR (Free)';
  const usdSuffix =
    rate.usd !== undefined && rate.usd !== null
      ? ` (~$${rate.usd.toFixed(2)})`
      : '';
  return `${Math.round(rate.khr).toLocaleString('en-US')} KHR/${rate.unit}${usdSuffix}`;
}

export function toPhnomPenhDatabaseRecord(lot: ParkingLot): PhnomPenhParkingRecord {
  const monthlyParts: string[] = [];
  if (lot.pricing.monthlyCar?.khr) {
    monthlyParts.push(`Car: ${formatRateForExport(lot.pricing.monthlyCar)}`);
  }
  if (lot.pricing.monthlyMotorcycle?.khr) {
    monthlyParts.push(`Moto: ${formatRateForExport(lot.pricing.monthlyMotorcycle)}`);
  }

  const cap = lot.capacity;
  const capSummary = cap
    ? [
        cap.totalSpaces !== null ? `Total: ${cap.totalSpaces}` : null,
        cap.carSpaces ? `Car: ${cap.carSpaces}` : null,
        cap.motorcycleSpaces ? `Moto: ${cap.motorcycleSpaces}` : null,
        cap.evSpaces ? `EV: ${cap.evSpaces}` : null,
      ]
        .filter(Boolean)
        .join('; ') || null
    : null;

  return {
    parking_id: lot.id,
    parking_name: lot.name,
    parking_category: lot.facilityType,
    operator_name: lot.operatorName ?? null,
    address: lot.address,
    district: lot.district,
    commune: lot.commune ?? null,
    village: lot.village ?? null,
    latitude: lot.position.lat,
    longitude: lot.position.lng,
    google_maps_url:
      lot.googleMapsUrl ??
      `https://www.google.com/maps/search/?api=1&query=${lot.position.lat},${lot.position.lng}`,
    motorcycle_hourly_fee: formatRateForExport(lot.pricing.motorcycle),
    motorcycle_daily_fee: formatRateForExport(lot.pricing.motorcycleDaily),
    car_hourly_fee: formatRateForExport(lot.pricing.carHourly),
    car_daily_fee: formatRateForExport(lot.pricing.carDaily ?? lot.pricing.daily),
    monthly_fee: monthlyParts.length > 0 ? monthlyParts.join(' | ') : null,
    free_parking_conditions: lot.pricing.freeRule ?? null,
    operating_hours: lot.openHours,
    parking_capacity: capSummary,
    parking_type:
      cap?.indoorOutdoor && cap.indoorOutdoor !== 'unknown'
        ? cap.indoorOutdoor
        : 'Unknown',
    covered_parking: cap?.covered ?? null,
    payment_methods: cap?.paymentMethods?.join(', ') ?? null,
    ev_charging_available: Boolean(lot.evCharging || lot.categories.includes('ev')),
    ev_charging_provider: lot.evCharging?.provider ?? null,
    ev_connector_types: lot.evCharging?.connectorTypes.join(', ') ?? null,
    ev_charging_speed: lot.evCharging?.maxPowerKw
      ? `${lot.evCharging.maxPowerKw} kW (${lot.evCharging.speedTier})`
      : lot.evCharging?.speedTier && lot.evCharging.speedTier !== 'unknown'
        ? lot.evCharging.speedTier
        : null,
    ev_price_per_kwh:
      lot.evCharging?.pricePerKwhKhr !== null &&
      lot.evCharging?.pricePerKwhKhr !== undefined
        ? `${lot.evCharging.pricePerKwhKhr.toLocaleString('en-US')} KHR/kWh`
        : null,
    parking_status: AVAILABILITY_LABELS[lot.availability.status],
    price_confidence: lot.priceConfidence,
    location_confidence: lot.locationConfidence,
    source_urls: lot.sourceUrls,
    last_verified_date: lot.lastVerifiedDate,
  };
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join(' | ') : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function recordsToCsv(records: PhnomPenhParkingRecord[]): string {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]) as Array<keyof PhnomPenhParkingRecord>;
  const lines = [headers.join(',')];
  for (const row of records) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(','));
  }
  return lines.join('\n');
}
