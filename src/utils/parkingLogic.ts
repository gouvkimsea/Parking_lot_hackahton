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
