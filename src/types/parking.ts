export type VehicleCategory = 'car' | 'bike' | 'bus' | 'ev';

export type FloorId = 'ground' | 'first' | 'second';

export type ActiveTab = 'home' | 'map' | 'settings';

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

export interface ParkingReview {
  id: string;
  author: string;
  initials: string;
  rating: number;
  dateLabel: string;
  comment: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  tagline: string;
  address: string;
  district: string;
  openHours: string;
  pricePerHour: number;
  categories: VehicleCategory[];
  images: string[];
  description: string;
  facilities: string[];
  distanceKm: number;
  rating: number;
  reviewCount: number;
  reviews: ParkingReview[];
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
