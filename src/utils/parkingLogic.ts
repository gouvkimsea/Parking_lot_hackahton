import type {
  BookingRecord,
  FloorId,
  ParkingBay,
  ParkingLot,
  VehicleCategory,
} from '../types/parking';

export const FLOOR_LABELS: Record<FloorId, string> = {
  ground: 'Ground Floor',
  first: '1st Floor',
  second: '2nd Floor',
};

export const FLOOR_ORDER: FloorId[] = ['ground', 'first', 'second'];

export const SERVICE_FEE_RATE = 0.05;
export const MIN_SERVICE_FEE = 1.5;

export function getFloorLabel(floor: FloorId): string {
  return FLOOR_LABELS[floor];
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
      ...lot.facilities,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export interface BookingSummary {
  subtotal: number;
  serviceFee: number;
  totalPrice: number;
}

export function calculateBookingSummary(
  hourlyRate: number,
  durationHours: number
): BookingSummary {
  const safeHours = Math.max(1, Math.min(24, Math.round(durationHours)));
  const subtotal = Number((hourlyRate * safeHours).toFixed(2));
  const rawFee = subtotal * SERVICE_FEE_RATE;
  const serviceFee = Number(Math.max(MIN_SERVICE_FEE, rawFee).toFixed(2));
  const totalPrice = Number((subtotal + serviceFee).toFixed(2));

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
  } else if (cleanedPlate.length < 3 || cleanedPlate.length > 12) {
    errors.licensePlate = 'Enter a valid plate (3–12 characters).';
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
    errors.label = 'Enter a vehicle name (e.g. Honda Civic).';
  }

  const plate = input.plate.trim().toUpperCase();
  if (!plate) {
    errors.plate = 'License plate is required.';
  } else if (plate.length < 3 || plate.length > 12 || !/^[A-Z0-9-\s]+$/.test(plate)) {
    errors.plate = 'Enter a valid plate (3–12 letters/numbers).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatBookingCode(bayLabel: string, seedNumber: number): string {
  const normalizedBay = bayLabel.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const suffix = String(Math.abs(seedNumber) % 9000 + 1000);
  return `PK-${normalizedBay}-${suffix}`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/** Calculates great-circle distance in kilometers between two coordinates using the Haversine formula. */
export function calculateDistanceKm(from: LatLngPoint, to: LatLngPoint): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

export function findNearestParkingLot(
  lots: ParkingLot[],
  userPos: LatLngPoint
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

/** Clamps a star rating into the inclusive [1, 5] integer range for safe display. */
export function clampReviewRating(rating: number): number {
  if (!Number.isFinite(rating)) return 5;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

/** Formats review totals with proper singular/plural wording. */
export function formatReviewCountLabel(count: number): string {
  const safeCount = Math.max(0, Math.round(count));
  return safeCount === 1 ? '1 review' : `${safeCount} reviews`;
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
  rating: number;
  availableSpaces: number;
}

/** Computes estimated daily parking rate for a given hourly rate and daily stay hours. */
export function calculateDailyRate(
  hourlyRate: number,
  hoursPerDay = DEFAULT_DAILY_STAY_HOURS
): number {
  const safeHours = Math.max(1, Math.min(24, Math.round(hoursPerDay)));
  const safeRate = Math.max(0, hourlyRate);
  return Number((safeRate * safeHours).toFixed(2));
}

function abbreviateLotName(name: string): string {
  return name
    .replace(/\s+Garage$/i, '')
    .replace(/\s+Parking$/i, '')
    .replace(/\s+Deck$/i, '')
    .replace(/\s+Hub$/i, '')
    .replace(/\s+&\s+Ride$/i, '');
}

/** Returns top nearest parking lots sorted ascending by distance with daily rate comparison metrics. */
export function getTopNearestDailyRates(
  lots: ParkingLot[],
  activeBookedBayKeys: Set<string>,
  limit = 5,
  hoursPerDay = DEFAULT_DAILY_STAY_HOURS
): DailyRateComparisonItem[] {
  const safeLimit = Math.max(1, Math.round(limit));
  return [...lots]
    .sort((a, b) => a.distanceKm - b.distanceKm || a.pricePerHour - b.pricePerHour)
    .slice(0, safeLimit)
    .map((lot) => ({
      id: lot.id,
      name: lot.name,
      shortName: abbreviateLotName(lot.name),
      district: lot.district,
      distanceKm: lot.distanceKm,
      hourlyRate: lot.pricePerHour,
      dailyRate: calculateDailyRate(lot.pricePerHour, hoursPerDay),
      rating: lot.rating,
      availableSpaces: countAvailableSpaces(lot, activeBookedBayKeys),
    }));
}


