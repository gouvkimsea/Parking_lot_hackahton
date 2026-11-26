import type {
  CommunityFeedbackReport,
  CommunityParkingSubmission,
  CommunityPhoto,
  CommunityPhotoTag,
  CommunityReview,
  CommunityUser,
  FacilityType,
  ParkingLot,
  SubmissionFeeMode,
  VehicleCategory,
} from '../types/parking';
import { buildStandardDemoFloors } from '../data/parkingLots';

export const COMMUNITY_CATEGORY_OPTIONS: Array<{
  id: FacilityType;
  label: string;
}> = [
  { id: 'public', label: 'Public Parking' },
  { id: 'private', label: 'Private Parking' },
  { id: 'mall', label: 'Shopping Mall' },
  { id: 'street', label: 'Street Parking' },
  { id: 'commercial', label: 'Building Parking' },
  { id: 'ev_station', label: 'EV Charging Parking' },
];

export const COMMUNITY_FACILITY_OPTIONS = [
  '24/7 Security',
  'CCTV',
  'Roof Coverage',
  'EV Charging',
  'KHQR Payment',
  'Well-Lit',
  'Attendant on Duty',
  'Accessible Entry',
] as const;

const DEFAULT_FALLBACK_IMAGE = '/src/assets/images/central_plaza_garage_1795607312182.jpg';
const DEFAULT_EV_IMAGE = '/src/assets/images/metro_ev_parking_1795607312046.jpg';

/** Simple deterministic client-only hash for simulated prototype auth (NOT for production security). */
export function hashPrototypePassword(password: string): string {
  let hash = 2166136261;
  for (let i = 0; i < password.length; i++) {
    hash ^= password.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `proto_${(hash >>> 0).toString(16)}`;
}

export function validateRegistrationInput(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();

  if (trimmedName.length < 2) {
    errors.name = 'Enter your full name (at least 2 characters).';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }
  if (input.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  if (
    input.confirmPassword !== undefined &&
    input.password !== input.confirmPassword
  ) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLoginInput(input: {
  email: string;
  password: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim().toLowerCase())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!input.password) {
    errors.password = 'Enter your password.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateSubmissionInput(input: {
  name: string;
  district: string;
  address: string;
  openHours: string;
  feeMode: SubmissionFeeMode;
  hourlyCarKhr: string;
  hourlyMotoKhr: string;
  dailyKhr: string;
  monthlyCarKhr: string;
  capacitySpaces: string;
  vehicleTypes: VehicleCategory[];
  position: { lat: number; lng: number } | null;
}): {
  valid: boolean;
  errors: Record<string, string>;
  parsed: {
    hourlyCarKhr: number | null;
    hourlyMotoKhr: number | null;
    dailyKhr: number | null;
    monthlyCarKhr: number | null;
    capacitySpaces: number | null;
  };
} {
  const errors: Record<string, string> = {};

  if (input.name.trim().length < 3) {
    errors.name = 'Enter a descriptive parking location name (at least 3 characters).';
  }
  if (!input.district || input.district === 'All Phnom Penh') {
    errors.district = 'Select a Phnom Penh Khan / district.';
  }
  if (input.address.trim().length < 5) {
    errors.address = 'Provide the street, building, or landmark address.';
  }
  if (input.openHours.trim().length < 3) {
    errors.openHours = 'Specify operating hours (e.g. 6:00 AM – 10:00 PM).';
  }
  if (input.vehicleTypes.length === 0) {
    errors.vehicleTypes = 'Select at least one supported vehicle type.';
  }
  if (
    !input.position ||
    input.position.lat < 11.3 ||
    input.position.lat > 11.75 ||
    input.position.lng < 104.7 ||
    input.position.lng > 105.1
  ) {
    errors.position = 'Pin a valid location within Phnom Penh on the map.';
  }

  const parseOptionalInt = (raw: string, fieldKey: string): number | null => {
    const clean = raw.replace(/[,\s]/g, '');
    if (!clean) return null;
    if (!/^\d+$/.test(clean)) {
      errors[fieldKey] = 'Enter a whole number in KHR.';
      return null;
    }
    const n = Number(clean);
    if (n < 0 || n > 10000000) {
      errors[fieldKey] = 'Enter a realistic amount (0 – 10,000,000).';
      return null;
    }
    return n;
  };

  let hourlyCarKhr: number | null = null;
  let hourlyMotoKhr: number | null = null;
  let dailyKhr: number | null = null;
  let monthlyCarKhr: number | null = null;

  if (input.feeMode === 'paid') {
    hourlyCarKhr = parseOptionalInt(input.hourlyCarKhr, 'hourlyCarKhr');
    hourlyMotoKhr = parseOptionalInt(input.hourlyMotoKhr, 'hourlyMotoKhr');
    dailyKhr = parseOptionalInt(input.dailyKhr, 'dailyKhr');
    monthlyCarKhr = parseOptionalInt(input.monthlyCarKhr, 'monthlyCarKhr');
    if (
      hourlyCarKhr === null &&
      hourlyMotoKhr === null &&
      dailyKhr === null &&
      monthlyCarKhr === null &&
      !errors.hourlyCarKhr
    ) {
      errors.hourlyCarKhr = 'Enter at least one parking fee or choose Free / Unknown.';
    }
  } else if (input.feeMode === 'free') {
    hourlyCarKhr = 0;
    hourlyMotoKhr = 0;
  }

  const capacitySpaces = parseOptionalInt(input.capacitySpaces, 'capacitySpaces');

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    parsed: {
      hourlyCarKhr,
      hourlyMotoKhr,
      dailyKhr,
      monthlyCarKhr,
      capacitySpaces,
    },
  };
}

export function validateReviewInput(input: {
  rating: number;
  comment: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (input.rating < 1 || input.rating > 5) {
    errors.rating = 'Select a rating between 1 and 5 stars.';
  }
  if (input.comment.trim().length < 8) {
    errors.comment = 'Write at least 8 characters describing your experience.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function computeLotRatingSummary(
  reviews: CommunityReview[],
  lotId: string
): {
  averageRating: number | null;
  reviewCount: number;
  avgSecurity: number | null;
  avgCleanliness: number | null;
} {
  const matching = reviews.filter((r) => r.lotId === lotId);
  if (matching.length === 0) {
    return {
      averageRating: null,
      reviewCount: 0,
      avgSecurity: null,
      avgCleanliness: null,
    };
  }
  const sumRating = matching.reduce((acc, r) => acc + r.rating, 0);
  const sumSec = matching.reduce((acc, r) => acc + r.securityRating, 0);
  const sumClean = matching.reduce((acc, r) => acc + r.cleanlinessRating, 0);

  return {
    averageRating: Number((sumRating / matching.length).toFixed(1)),
    reviewCount: matching.length,
    avgSecurity: Number((sumSec / matching.length).toFixed(1)),
    avgCleanliness: Number((sumClean / matching.length).toFixed(1)),
  };
}

/**
 * Enforces one review per registered user per parking lot.
 * If the user already reviewed this lot, updates their existing review rather than adding a duplicate.
 */
export function upsertUserReview(
  existingReviews: CommunityReview[],
  incoming: Omit<CommunityReview, 'id' | 'createdAt' | 'updatedAt'>
): CommunityReview[] {
  const now = new Date().toISOString();
  const idx = existingReviews.findIndex(
    (r) => r.lotId === incoming.lotId && r.userId === incoming.userId
  );
  if (idx >= 0) {
    const updated: CommunityReview = {
      ...existingReviews[idx],
      ...incoming,
      updatedAt: now,
    };
    return existingReviews.map((r, i) => (i === idx ? updated : r));
  }
  const created: CommunityReview = {
    ...incoming,
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
  };
  return [created, ...existingReviews];
}

export function canUserEditSubmission(
  user: CommunityUser | null,
  submission: CommunityParkingSubmission
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return (
    submission.submittedById === user.id &&
    (submission.status === 'pending' || submission.status === 'flagged')
  );
}

/** Converts an approved community submission into a ParkEasy map-ready ParkingLot. */
export function communitySubmissionToParkingLot(
  sub: CommunityParkingSubmission,
  reviews: CommunityReview[] = []
): ParkingLot {
  const isEv = sub.facilityType === 'ev_station' || sub.vehicleTypes.includes('ev');
  const isFree = sub.feeMode === 'free';
  const isPaid = sub.feeMode === 'paid';
  const summary = computeLotRatingSummary(reviews, sub.id);

  const images =
    sub.photos.length > 0
      ? sub.photos.map((p) => p.dataUrl)
      : [isEv ? DEFAULT_EV_IMAGE : DEFAULT_FALLBACK_IMAGE];

  return {
    id: sub.id,
    name: sub.name,
    tagline:
      sub.description.trim() ||
      `Community-submitted ${sub.district} parking location verified by ParkEasy moderators.`,
    operatorName: `Submitted by ${sub.submittedByName}`,
    address: sub.address,
    district: sub.district,
    landmarks: [sub.district, 'Community Verified'],
    facilityType: sub.facilityType,
    openHours: sub.openHours,
    pricePerHourKhr: isFree ? 0 : sub.hourlyCarKhr,
    pricePerHour: isFree ? 0 : sub.hourlyCarKhr ?? sub.hourlyMotoKhr ?? 2000,
    pricing: {
      verificationStatus: isFree || isPaid ? 'estimated' : 'unavailable',
      sourceLabel: `Community submission (${sub.submittedByName})`,
      isFree,
      freeRule: isFree ? 'Reported as free parking by community contributor' : undefined,
      carHourly: isFree
        ? { khr: 0, usd: 0, unit: 'hour' }
        : sub.hourlyCarKhr !== null
          ? { khr: sub.hourlyCarKhr, unit: 'hour' }
          : { khr: null, unit: 'hour' },
      motorcycle: isFree
        ? { khr: 0, usd: 0, unit: 'entry' }
        : sub.hourlyMotoKhr !== null
          ? { khr: sub.hourlyMotoKhr, unit: 'entry' }
          : undefined,
      daily:
        sub.dailyKhr !== null ? { khr: sub.dailyKhr, unit: 'day' } : undefined,
      monthlyCar:
        sub.monthlyCarKhr !== null
          ? { khr: sub.monthlyCarKhr, unit: 'month' }
          : undefined,
    },
    capacity: {
      totalSpaces: sub.capacitySpaces,
      indoorOutdoor: sub.indoorOutdoor,
      covered: sub.covered,
      paymentMethods: isFree ? ['Free Entry'] : ['Cash / Gate Ticket'],
    },
    availability: {
      status: 'unknown',
      source: 'unverified',
      availableSpaces: null,
      totalSpaces: sub.capacitySpaces,
      note: 'Community-contributed parking location (live bay feed unavailable).',
    },
    evCharging: isEv
      ? {
          provider: `Community Hub (${sub.submittedByName})`,
          connectorTypes: ['Type 2', 'CCS2'],
          maxPowerKw: null,
          speedTier: 'unknown',
          pricePerKwhKhr: null,
          priceStatus: 'unavailable',
          operatingHours: sub.openHours,
          portCount: null,
          liveStatus: 'unknown',
          availabilityNote: 'Verify charger availability on site',
        }
      : undefined,
    categories: sub.vehicleTypes,
    images,
    description:
      sub.description.trim() ||
      `Community-submitted parking space in ${sub.district}, Phnom Penh.`,
    facilities: sub.facilities.length > 0 ? sub.facilities : ['Community Contributed'],
    distanceKm: null,
    rating: summary.averageRating,
    reviewCount: summary.reviewCount > 0 ? summary.reviewCount : null,
    dataSource: 'community',
    priceConfidence: isFree || isPaid ? 'medium' : 'unknown',
    locationConfidence: 'high',
    sourceUrls: ['https://www.openstreetmap.org/'],
    lastVerifiedDate: (sub.reviewedAt ?? sub.submittedAt).slice(0, 10),
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${sub.position.lat},${sub.position.lng}`,
    communityMeta: {
      submissionId: sub.id,
      submittedById: sub.submittedById,
      submittedByName: sub.submittedByName,
      submittedAt: sub.submittedAt,
    },
    coordinates: { x: 50, y: 50 },
    position: sub.position,
    floors: buildStandardDemoFloors(isEv),
  };
}

/** Merges real community reviews and extra user-uploaded photos onto any ParkingLot (base or community). */
export function enrichLotWithCommunityActivity(
  lot: ParkingLot,
  reviews: CommunityReview[],
  submissions: CommunityParkingSubmission[] = []
): ParkingLot {
  const summary = computeLotRatingSummary(reviews, lot.id);
  const matchingSub = submissions.find((s) => s.id === lot.id);
  const reviewPhotos = reviews
    .filter((r) => r.lotId === lot.id)
    .flatMap((r) => r.photos.map((p) => p.dataUrl));

  const subPhotos = matchingSub ? matchingSub.photos.map((p) => p.dataUrl) : [];
  const combinedImages = Array.from(
    new Set([...subPhotos, ...reviewPhotos, ...lot.images])
  );

  if (summary.reviewCount === 0 && reviewPhotos.length === 0 && subPhotos.length === 0) {
    return lot;
  }

  return {
    ...lot,
    images: combinedImages,
    rating: summary.averageRating ?? lot.rating,
    reviewCount: summary.reviewCount > 0 ? summary.reviewCount : lot.reviewCount,
  };
}

/** Client-side image compression so user uploads stay lightweight inside prototype localStorage. */
export async function compressImageToCommunityPhoto(
  file: File,
  tag: CommunityPhotoTag,
  uploadedByName?: string
): Promise<CommunityPhoto> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        const maxDim = 720;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dataUrl,
    caption: file.name.replace(/\.[^.]+$/, ''),
    tag,
    uploadedByName,
    uploadedAt: new Date().toISOString(),
  };
}

export function countUserContributions(
  userId: string,
  submissions: CommunityParkingSubmission[],
  reviews: CommunityReview[],
  reports: CommunityFeedbackReport[]
): {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  totalReviews: number;
  totalReports: number;
  total: number;
} {
  const userSubs = submissions.filter((s) => s.submittedById === userId);
  const userRevs = reviews.filter((r) => r.userId === userId);
  const userReps = reports.filter((r) => r.userId === userId);
  return {
    totalSubmissions: userSubs.length,
    approvedSubmissions: userSubs.filter((s) => s.status === 'approved').length,
    pendingSubmissions: userSubs.filter((s) => s.status === 'pending').length,
    totalReviews: userRevs.length,
    totalReports: userReps.length,
    total: userSubs.length + userRevs.length + userReps.length,
  };
}
