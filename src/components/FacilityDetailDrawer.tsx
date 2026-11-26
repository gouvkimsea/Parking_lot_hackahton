import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  Heart,
  MapPin,
  MessageSquarePlus,
  Navigation,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import type {
  CommunityFeedbackReport,
  CommunityIssueType,
  CommunityPhoto,
  CommunityReview,
  CommunityUser,
  ParkingLot,
  PriceReport,
  RateValue,
  VehicleCategory,
} from '../types/parking';
import {
  AVAILABILITY_LABELS,
  FACILITY_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  calculateDistanceKm,
  createPriceReportRecord,
  formatKhr,
  formatUsdApprox,
  validatePriceReport,
} from '../utils/parkingLogic';
import {
  compressImageToCommunityPhoto,
  computeLotRatingSummary,
  validateReviewInput,
} from '../utils/communityLogic';

interface FacilityDetailDrawerProps {
  lot: ParkingLot | null;
  isFavorite: boolean;
  userPosition: { lat: number; lng: number } | null;
  existingReports: PriceReport[];
  currentUser: CommunityUser | null;
  lotReviews: CommunityReview[];
  lotFeedbackReports: CommunityFeedbackReport[];
  onClose: () => void;
  onToggleFavorite: (lotId: string) => void;
  onRequestDirections: (lot: ParkingLot) => void;
  onOpenDemoReserve: (lotId: string) => void;
  onRequireAuth: (reason: string, afterAuth?: () => void) => void;
  onSubmitPriceReport: (report: PriceReport) => void;
  onSubmitReview: (review: {
    lotId: string;
    lotName: string;
    rating: number;
    comment: string;
    feeFeedback: CommunityReview['feeFeedback'];
    availabilityNote: CommunityReview['availabilityNote'];
    securityRating: number;
    cleanlinessRating: number;
    photos: CommunityPhoto[];
  }) => void;
  onSubmitFeedbackReport: (payload: {
    lotId: string;
    lotName: string;
    issueType: CommunityIssueType;
    reportedPriceKhr?: number;
    vehicleType?: PriceReport['vehicleType'];
    suggestedDetails: string;
  }) => void;
}

function renderRateLine(label: string, rate?: RateValue) {
  if (!rate) return null;
  const unitSuffix =
    rate.unit === 'hour'
      ? '/hour'
      : rate.unit === 'entry'
        ? '/entry'
        : rate.unit === 'day'
          ? '/day'
          : rate.unit === 'month'
            ? '/month'
            : '/kWh';

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[#F0F1F3] last:border-b-0">
      <div>
        <p className="text-[13px] font-semibold text-[#141517]">{label}</p>
        {rate.note && (
          <p className="text-[11.5px] text-[#767B84] mt-0.5">{rate.note}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {rate.khr === null ? (
          <span className="text-[12.5px] font-medium text-[#767B84]">
            Price unavailable
          </span>
        ) : rate.khr === 0 ? (
          <span className="text-[13px] font-bold text-[#15803D]">Free</span>
        ) : (
          <>
            <p className="text-[13.5px] font-bold text-[#141517] tabular-nums">
              {formatKhr(rate.khr)}
              <span className="text-[11px] font-medium text-[#767B84]">
                {unitSuffix}
              </span>
            </p>
            <p className="text-[11px] text-[#767B84] tabular-nums">
              {rate.usd !== undefined && rate.usd !== null
                ? `~$${rate.usd.toFixed(2)}`
                : formatUsdApprox(rate.khr)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function VerificationBadge({
  status,
}: {
  status: 'confirmed' | 'estimated' | 'unavailable';
}) {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#047857]">
        <ShieldCheck className="w-3 h-3" />
        Officially Confirmed
      </span>
    );
  }
  if (status === 'estimated') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309]">
        <AlertTriangle className="w-3 h-3" />
        Estimated Rate
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[#4B5563]">
      Price Unavailable
    </span>
  );
}

function VehicleIcon({ type }: { type: VehicleCategory }) {
  if (type === 'motorcycle') return <Bike className="w-3.5 h-3.5" />;
  if (type === 'bicycle') return <Bike className="w-3.5 h-3.5" />;
  if (type === 'ev') return <Zap className="w-3.5 h-3.5" />;
  return <Car className="w-3.5 h-3.5" />;
}

export const FacilityDetailDrawer: React.FC<FacilityDetailDrawerProps> = ({
  lot,
  isFavorite,
  userPosition,
  existingReports,
  currentUser,
  lotReviews,
  lotFeedbackReports,
  onClose,
  onToggleFavorite,
  onRequestDirections,
  onOpenDemoReserve,
  onRequireAuth,
  onSubmitPriceReport,
  onSubmitReview,
  onSubmitFeedbackReport,
}) => {
  const [reportMode, setReportMode] = useState<CommunityIssueType | null>(null);
  const [reportVehicleType, setReportVehicleType] = useState<
    PriceReport['vehicleType']
  >('car');
  const [reportedPriceKhr, setReportedPriceKhr] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [reportErrors, setReportErrors] = useState<{
    reportedPriceKhr?: string;
    notes?: string;
  }>({});
  const [reportSubmittedMsg, setReportSubmittedMsg] = useState<string | null>(null);

  // Community review composer state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFeeFeedback, setReviewFeeFeedback] =
    useState<CommunityReview['feeFeedback']>('accurate');
  const [reviewAvailability, setReviewAvailability] =
    useState<CommunityReview['availabilityNote']>('moderate');
  const [reviewSecurityRating, setReviewSecurityRating] = useState(4);
  const [reviewCleanlinessRating, setReviewCleanlinessRating] = useState(4);
  const [reviewPhotos, setReviewPhotos] = useState<CommunityPhoto[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const existingUserReview =
    currentUser && lot
      ? lotReviews.find((r) => r.userId === currentUser.id) ?? null
      : null;

  useEffect(() => {
    setReportMode(null);
    setReportedPriceKhr('');
    setReportNotes('');
    setReportErrors({});
    setReportSubmittedMsg(null);
    setReviewOpen(false);
    setReviewError(null);
    setReviewSuccessMsg(null);
    setLightboxImage(null);
  }, [lot?.id]);

  useEffect(() => {
    if (!lot) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lot, lightboxImage, onClose]);

  if (!lot) return null;

  const distanceKm = userPosition
    ? calculateDistanceKm(userPosition, lot.position)
    : null;

  const lotReports = existingReports.filter((r) => r.lotId === lot.id);
  const ratingSummary = computeLotRatingSummary(lotReviews, lot.id);
  const allReviewPhotos = lotReviews.flatMap((r) => r.photos);

  const googleMapsExternalUrl = `https://www.google.com/maps/dir/?api=1&destination=${lot.position.lat},${lot.position.lng}`;

  const openReviewComposer = () => {
    const startComposer = () => {
      if (existingUserReview) {
        setReviewRating(existingUserReview.rating);
        setReviewComment(existingUserReview.comment);
        setReviewFeeFeedback(existingUserReview.feeFeedback);
        setReviewAvailability(existingUserReview.availabilityNote);
        setReviewSecurityRating(existingUserReview.securityRating);
        setReviewCleanlinessRating(existingUserReview.cleanlinessRating);
        setReviewPhotos(existingUserReview.photos);
      } else {
        setReviewRating(5);
        setReviewComment('');
        setReviewFeeFeedback('accurate');
        setReviewAvailability('moderate');
        setReviewSecurityRating(4);
        setReviewCleanlinessRating(4);
        setReviewPhotos([]);
      }
      setReviewError(null);
      setReviewSuccessMsg(null);
      setReviewOpen(true);
    };

    if (!currentUser) {
      onRequireAuth(
        'Sign in or create an account to post or edit your review for this parking spot.',
        startComposer
      );
      return;
    }
    startComposer();
  };

  const openFeedbackMode = (mode: CommunityIssueType) => {
    const startFeedback = () => {
      setReportErrors({});
      setReportSubmittedMsg(null);
      setReportMode((prev) => (prev === mode ? null : mode));
    };
    if (!currentUser) {
      onRequireAuth(
        'Sign in or register to submit price updates, corrections, or closure reports.',
        startFeedback
      );
      return;
    }
    startFeedback();
  };

  const handleReviewPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const picked = Array.from(files).slice(0, Math.max(0, 4 - reviewPhotos.length));
    const compressed = await Promise.all(
      picked.map((f) =>
        compressImageToCommunityPhoto(f, 'review', currentUser?.name)
      )
    );
    setReviewPhotos((prev) => [...prev, ...compressed].slice(0, 4));
    e.target.value = '';
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth('Sign in to publish your parking review.');
      return;
    }
    const check = validateReviewInput({
      rating: reviewRating,
      comment: reviewComment,
    });
    if (!check.valid) {
      setReviewError(check.errors.comment || check.errors.rating || 'Check your review.');
      return;
    }

    onSubmitReview({
      lotId: lot.id,
      lotName: lot.name,
      rating: reviewRating,
      comment: reviewComment.trim(),
      feeFeedback: reviewFeeFeedback,
      availabilityNote: reviewAvailability,
      securityRating: reviewSecurityRating,
      cleanlinessRating: reviewCleanlinessRating,
      photos: reviewPhotos,
    });
    setReviewOpen(false);
    setReviewSuccessMsg(
      existingUserReview
        ? 'Your review has been updated.'
        : 'Thank you! Your community review is now live.'
    );
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reportMode) {
      onRequireAuth('Sign in to submit parking feedback.');
      return;
    }

    if (reportMode === 'incorrect_price') {
      const validation = validatePriceReport({
        reportedPriceKhr,
        notes: reportNotes,
      });
      if (!validation.valid || validation.parsedPrice === undefined) {
        setReportErrors(validation.errors);
        return;
      }

      onSubmitPriceReport(
        createPriceReportRecord({
          lotId: lot.id,
          lotName: lot.name,
          vehicleType: reportVehicleType,
          reportedPriceKhr: validation.parsedPrice,
          notes: reportNotes,
        })
      );
      onSubmitFeedbackReport({
        lotId: lot.id,
        lotName: lot.name,
        issueType: 'incorrect_price',
        reportedPriceKhr: validation.parsedPrice,
        vehicleType: reportVehicleType,
        suggestedDetails:
          reportNotes.trim() || 'Observed fee signboard update.',
      });
      setReportSubmittedMsg(
        'Thank you! Your Phnom Penh price correction has been submitted for review.'
      );
    } else {
      if (reportNotes.trim().length < 8) {
        setReportErrors({
          notes: 'Please enter at least 8 characters describing the correction or closure.',
        });
        return;
      }
      onSubmitFeedbackReport({
        lotId: lot.id,
        lotName: lot.name,
        issueType: reportMode,
        suggestedDetails: reportNotes.trim(),
      });
      setReportSubmittedMsg(
        reportMode === 'permanently_closed'
          ? 'Closure report recorded and flagged for moderator verification.'
          : 'Suggested correction submitted to ParkEasy moderators.'
      );
    }

    setReportMode(null);
    setReportedPriceKhr('');
    setReportNotes('');
    setReportErrors({});
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-end bg-[#141517]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="facility-drawer-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] bg-white h-full shadow-[-12px_0_48px_rgba(20,21,23,0.18)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#F0F1F3] flex items-start justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3FCE0] text-[#3F5A05]">
                {FACILITY_TYPE_LABELS[lot.facilityType]}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F4F5F6] text-[#525760]">
                {lot.district}
              </span>
              {lot.dataSource === 'google_places' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                  Google Places
                </span>
              )}
              {lot.dataSource === 'osm_overpass' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                  OpenStreetMap
                </span>
              )}
              {lot.dataSource === 'community' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#141517] text-[#C5EC45]">
                  Community Verified
                </span>
              )}
            </div>
            <h2
              id="facility-drawer-title"
              className="text-[18px] sm:text-[20px] font-bold text-[#141517] mt-1.5 leading-snug"
            >
              {lot.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(lot.id)}
              aria-label={
                isFavorite
                  ? `Remove ${lot.name} from saved places`
                  : `Save ${lot.name} to favorites`
              }
              className="w-11 h-11 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] flex items-center justify-center transition-colors"
            >
              <Heart
                className={`w-[18px] h-[18px] ${
                  isFavorite ? 'fill-[#EF4444] text-[#EF4444]' : 'text-[#141517]'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close facility details"
              className="w-11 h-11 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] text-[#141517] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto clean-scroll px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Address, Coordinates & Hours */}
          <div className="bg-[#F6F7F8] rounded-[20px] p-4 space-y-2.5">
            <p className="text-[13px] text-[#141517] font-medium flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#525760] shrink-0 mt-0.5" />
              <span>
                {lot.address}
                {lot.commune ? ` · Sangkat ${lot.commune}` : ''}
              </span>
            </p>
            {lot.operatorName && (
              <p className="text-[12px] text-[#525760]">
                Operator: <span className="font-semibold text-[#141517]">{lot.operatorName}</span>
              </p>
            )}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {lot.openHours}
              </span>
              {distanceKm !== null && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#141517]">
                  <Navigation className="w-3.5 h-3.5 text-[#5A760E]" />
                  {distanceKm.toFixed(1)} km from your location
                </span>
              )}
              <span className="font-mono text-[11px]">
                {lot.position.lat.toFixed(5)}°N, {lot.position.lng.toFixed(5)}°E
              </span>
            </div>
            {lotFeedbackReports.some(
              (r) => r.issueType === 'permanently_closed' && r.status === 'open'
            ) && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-[12px] text-orange-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  Community Alert: Reported closed or inaccessible — pending moderator verification.
                </span>
              </div>
            )}
            <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-white text-[#525760] border border-black/5">
                Price confidence: <strong className="capitalize">{lot.priceConfidence}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#525760] border border-black/5">
                Location: <strong className="capitalize">{lot.locationConfidence}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#525760] border border-black/5">
                Verified: {lot.lastVerifiedDate}
              </span>
            </div>

            {lot.rating !== null && (
              <div className="flex items-center gap-1.5 text-[12.5px] pt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-[#141517]">{lot.rating.toFixed(1)}</span>
                {lot.reviewCount !== null && (
                  <span className="text-[#6B7280]">
                    ({lot.reviewCount.toLocaleString()} community review{lot.reviewCount === 1 ? '' : 's'})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Availability Card */}
          <div className="rounded-[20px] border border-[#ECEEF0] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold text-[#141517]">
                Availability Status
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold ${
                  lot.availability.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700'
                    : lot.availability.status === 'limited'
                      ? 'bg-amber-50 text-amber-700'
                      : lot.availability.status === 'full'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-[#F4F5F6] text-[#525760]'
                }`}
              >
                {AVAILABILITY_LABELS[lot.availability.status]}
                {lot.availability.availableSpaces !== null &&
                  ` · ${lot.availability.availableSpaces} spaces`}
              </span>
            </div>
            <p className="text-[12px] text-[#6B7280]">
              {lot.availability.note ??
                'Live sensor occupancy is not available for this Phnom Penh facility.'}
            </p>
          </div>

          {/* EV Charging Details (Dedicated Section) */}
          {lot.evCharging && (
            <div className="rounded-[20px] border border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14.5px] font-bold text-[#141517] flex items-center gap-1.5">
                  <BatteryCharging className="w-4 h-4 text-cyan-700" />
                  EV Charging Specifications
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-100 text-cyan-800">
                  {lot.evCharging.speedTier === 'fast'
                    ? 'Fast Charging'
                    : lot.evCharging.speedTier === 'standard'
                      ? 'Standard AC'
                      : 'EV Station'}
                </span>
              </div>

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 text-[12.5px]">
                <div className="bg-white rounded-xl p-3 border border-cyan-100">
                  <p className="text-[11px] text-[#767B84]">Provider</p>
                  <p className="font-semibold text-[#141517] mt-0.5">
                    {lot.evCharging.provider ?? 'Unknown provider'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-cyan-100">
                  <p className="text-[11px] text-[#767B84]">Max Power</p>
                  <p className="font-semibold text-[#141517] mt-0.5">
                    {lot.evCharging.maxPowerKw !== null
                      ? `${lot.evCharging.maxPowerKw} kW`
                      : 'Not publicly listed'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-cyan-100">
                  <p className="text-[11px] text-[#767B84]">Connectors</p>
                  <p className="font-semibold text-[#141517] mt-0.5">
                    {lot.evCharging.connectorTypes.join(', ')}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-cyan-100">
                  <p className="text-[11px] text-[#767B84]">Price per kWh</p>
                  <p className="font-semibold text-[#141517] mt-0.5 tabular-nums">
                    {lot.evCharging.pricePerKwhKhr !== null
                      ? `${formatKhr(lot.evCharging.pricePerKwhKhr)}/kWh`
                      : 'Price unavailable'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-cyan-100">
                  <p className="text-[11px] text-[#767B84]">Charging Ports</p>
                  <p className="font-semibold text-[#141517] mt-0.5">
                    {lot.evCharging.portCount !== null
                      ? `${lot.evCharging.portCount} ports`
                      : 'Port count unverified'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-cyan-100">
                  <p className="text-[11px] text-[#767B84]">Live Port Status</p>
                  <p className="font-semibold text-[#141517] mt-0.5 capitalize">
                    {lot.evCharging.liveStatus === 'unknown'
                      ? 'No live feed'
                      : lot.evCharging.liveStatus}
                  </p>
                </div>
              </div>

              {(lot.evCharging.priceNote ||
                lot.evCharging.parkingFeeSeparateNote ||
                lot.evCharging.availabilityNote) && (
                <p className="text-[11.5px] text-cyan-900/80 leading-relaxed">
                  {[
                    lot.evCharging.priceNote,
                    lot.evCharging.parkingFeeSeparateNote,
                    lot.evCharging.availabilityNote,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          )}

          {/* Parking Price Information */}
          <div className="rounded-[20px] border border-[#ECEEF0] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[14.5px] font-bold text-[#141517]">
                Parking Rates (KHR / USD)
              </h3>
              <VerificationBadge status={lot.pricing.verificationStatus} />
            </div>

            {lot.pricing.freeRule && (
              <div className="bg-[#F3FCE0] text-[#3F5A05] rounded-xl px-3 py-2 text-[12px] font-medium">
                {lot.pricing.freeRule}
              </div>
            )}

            <div className="divide-y divide-[#F0F1F3]">
              {renderRateLine('Motorcycle', lot.pricing.motorcycle)}
              {renderRateLine('Car (Hourly / Entry)', lot.pricing.carHourly)}
              {renderRateLine('Bicycle', lot.pricing.bicycle)}
              {renderRateLine('Daily Rate', lot.pricing.daily)}
              {renderRateLine('Monthly (Car)', lot.pricing.monthlyCar)}
              {renderRateLine('Monthly (Motorcycle)', lot.pricing.monthlyMotorcycle)}
            </div>

            {!lot.pricing.motorcycle &&
              !lot.pricing.carHourly &&
              !lot.pricing.bicycle &&
              !lot.pricing.daily &&
              !lot.pricing.monthlyCar && (
                <p className="text-[13px] text-[#767B84]">
                  Price unavailable — tariff has not been verified from the operator.
                </p>
              )}

            {lot.pricing.additionalCharges && (
              <p className="text-[11.5px] text-[#6B7280] bg-[#F8F9FA] rounded-xl p-2.5">
                Additional notes: {lot.pricing.additionalCharges}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-[11.5px] text-[#767B84]">
              <span className="truncate">Source: {lot.pricing.sourceLabel}</span>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => openFeedbackMode('incorrect_price')}
                  className="min-h-[34px] inline-flex items-center gap-1 text-[#141517] font-semibold hover:underline shrink-0"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report incorrect price
                </button>
                <button
                  type="button"
                  onClick={() => openFeedbackMode('suggest_correction')}
                  className="min-h-[34px] inline-flex items-center gap-1 text-[#525760] font-semibold hover:text-[#141517] hover:underline shrink-0"
                >
                  Suggest correction
                </button>
                <button
                  type="button"
                  onClick={() => openFeedbackMode('permanently_closed')}
                  className="min-h-[34px] inline-flex items-center gap-1 text-red-700 font-semibold hover:underline shrink-0"
                >
                  Report closed
                </button>
              </div>
            </div>

            {reportSubmittedMsg && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-[12px]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reportSubmittedMsg}</span>
              </div>
            )}

            {(lotReports.length > 0 || lotFeedbackReports.length > 0) && (
              <div className="bg-amber-50/70 rounded-xl p-3 space-y-1">
                <p className="text-[11.5px] font-semibold text-amber-900">
                  Community Reports ({Math.max(lotReports.length, lotFeedbackReports.length)})
                </p>
                {lotReports.slice(0, 2).map((rep) => (
                  <p key={rep.id} className="text-[11.5px] text-amber-800 tabular-nums">
                    • {rep.vehicleType}: {formatKhr(rep.reportedPriceKhr)}
                    {rep.notes ? ` — "${rep.notes}"` : ''}
                  </p>
                ))}
                {lotFeedbackReports
                  .filter((f) => f.issueType !== 'incorrect_price')
                  .slice(0, 2)
                  .map((rep) => (
                    <p key={rep.id} className="text-[11.5px] text-amber-800">
                      • {rep.issueType === 'permanently_closed' ? 'Closure Alert' : 'Suggested Edit'}:{' '}
                      {rep.suggestedDetails}
                    </p>
                  ))}
              </div>
            )}

            {reportMode && (
              <form
                onSubmit={handleReportSubmit}
                noValidate
                className="bg-[#F6F7F8] rounded-2xl p-3.5 space-y-3"
              >
                <p className="text-[12.5px] font-bold text-[#141517]">
                  {reportMode === 'incorrect_price'
                    ? 'Submit Price Correction'
                    : reportMode === 'permanently_closed'
                      ? 'Report Closed or Nonexistent Location'
                      : 'Suggest Parking Info Correction'}
                </p>

                {reportMode === 'incorrect_price' && (
                  <>
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="report-vehicle-type"
                          className="block text-[11px] font-semibold text-[#525760] mb-1"
                        >
                          Rate Type
                        </label>
                        <select
                          id="report-vehicle-type"
                          value={reportVehicleType}
                          onChange={(e) =>
                            setReportVehicleType(
                              e.target.value as PriceReport['vehicleType']
                            )
                          }
                          className="w-full h-11 px-2.5 rounded-xl bg-white text-[12.5px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                        >
                          <option value="car">Car (KHR/hr)</option>
                          <option value="motorcycle">Motorcycle (KHR)</option>
                          <option value="bicycle">Bicycle (KHR)</option>
                          <option value="ev_kwh">EV Charging (KHR/kWh)</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="report-price-khr"
                          className="block text-[11px] font-semibold text-[#525760] mb-1"
                        >
                          Observed Rate (KHR)
                        </label>
                        <input
                          id="report-price-khr"
                          type="text"
                          inputMode="numeric"
                          value={reportedPriceKhr}
                          onChange={(e) => {
                            setReportedPriceKhr(e.target.value);
                            setReportErrors((prev) => ({
                              ...prev,
                              reportedPriceKhr: undefined,
                            }));
                          }}
                          placeholder="e.g. 2000"
                          className="w-full h-11 px-3 rounded-xl bg-white text-[12.5px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                        />
                      </div>
                    </div>
                    {reportErrors.reportedPriceKhr && (
                      <p role="alert" className="text-[11.5px] text-red-600 font-medium">
                        {reportErrors.reportedPriceKhr}
                      </p>
                    )}
                  </>
                )}

                <div>
                  <label
                    htmlFor="report-notes"
                    className="block text-[11px] font-semibold text-[#525760] mb-1"
                  >
                    {reportMode === 'incorrect_price'
                      ? 'Details / Signboard Note (optional)'
                      : 'Details for Moderators *'}
                  </label>
                  <input
                    id="report-notes"
                    type="text"
                    value={reportNotes}
                    onChange={(e) => {
                      setReportNotes(e.target.value);
                      setReportErrors((prev) => ({ ...prev, notes: undefined }));
                    }}
                    placeholder={
                      reportMode === 'permanently_closed'
                        ? 'e.g. Lot demolished / closed permanently'
                        : reportMode === 'suggest_correction'
                          ? 'e.g. Gate now closes at 11:00 PM instead of 9:00 PM'
                          : 'e.g. Gate sign says 1,000 KHR flat for moto'
                    }
                    className="w-full h-11 px-3 rounded-xl bg-white text-[12.5px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                  />
                  {reportErrors.notes && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {reportErrors.notes}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportMode(null)}
                    className="min-h-[44px] px-4 py-1.5 rounded-full text-[12px] font-medium text-[#525760] hover:text-[#141517]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-1.5 rounded-full bg-[#141517] text-white text-[12px] font-semibold hover:bg-[#2A2D32]"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Vehicle Types & Facilities */}
          <div className="space-y-2.5">
            <h3 className="text-[14px] font-bold text-[#141517]">
              Supported Vehicles
            </h3>
            <div className="flex flex-wrap gap-2">
              {lot.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F5F6] text-[12.5px] font-medium text-[#141517]"
                >
                  <VehicleIcon type={cat} />
                  {VEHICLE_TYPE_LABELS[cat]}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[14px] font-bold text-[#141517]">About & Facilities</h3>
            <p className="text-[13px] leading-[1.6] text-[#525760]">
              {lot.description}
            </p>
            {lot.capacity && (
              <div className="bg-[#F8F9FA] rounded-xl p-3 text-[12px] text-[#525760] space-y-1">
                <p>
                  Structure:{' '}
                  <strong className="text-[#141517] capitalize">
                    {lot.capacity.indoorOutdoor}
                  </strong>
                  {lot.capacity.covered !== null &&
                    ` · ${lot.capacity.covered ? 'Covered' : 'Uncovered'}`}
                  {lot.capacity.totalSpaces !== null &&
                    ` · Capacity: ${lot.capacity.totalSpaces.toLocaleString()} spaces`}
                </p>
                {lot.capacity.paymentMethods && lot.capacity.paymentMethods.length > 0 && (
                  <p>Payment: {lot.capacity.paymentMethods.join(', ')}</p>
                )}
              </div>
            )}
            {lot.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lot.facilities.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-full bg-[#F8F9FA] border border-black/[0.05] text-[11.5px] text-[#525760]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
            {lot.sourceUrls.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-2 text-[11.5px]">
                <span className="text-[#767B84]">Sources:</span>
                {lot.sourceUrls.map((url, idx) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#141517] underline hover:text-[#4D6A0A]"
                  >
                    Reference {idx + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Community Photos Gallery */}
          {(lot.images.length > 0 || allReviewPhotos.length > 0) && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[#141517] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#525760]" />
                  <span>Parking Photos</span>
                </h3>
                <span className="text-[11.5px] text-[#767B84]">
                  {Array.from(new Set([...allReviewPhotos.map((p) => p.dataUrl), ...lot.images])).length} photos
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from(
                  new Set([...allReviewPhotos.map((p) => p.dataUrl), ...lot.images])
                )
                  .slice(0, 6)
                  .map((src, idx) => (
                    <button
                      key={`${src.slice(0, 32)}-${idx}`}
                      type="button"
                      onClick={() => setLightboxImage(src)}
                      className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F4F5F6] border border-black/5 hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={src}
                        alt={`${lot.name} photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Community Feedback & Reviews */}
          <div className="rounded-[20px] border border-[#ECEEF0] p-4 space-y-3.5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-[14.5px] font-bold text-[#141517]">
                  Community Ratings & Reviews
                </h3>
                {ratingSummary.reviewCount > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-[12px]">
                    <span className="inline-flex items-center gap-1 font-bold text-[#141517]">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {ratingSummary.averageRating?.toFixed(1)}
                    </span>
                    <span className="text-[#6B7280]">
                      ({ratingSummary.reviewCount} review{ratingSummary.reviewCount === 1 ? '' : 's'})
                    </span>
                    {ratingSummary.avgSecurity !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-[#F6F7F8] text-[#525760] text-[11px]">
                        Security {ratingSummary.avgSecurity}/5
                      </span>
                    )}
                    {ratingSummary.avgCleanliness !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-[#F6F7F8] text-[#525760] text-[11px]">
                        Cleanliness {ratingSummary.avgCleanliness}/5
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[12px] text-[#767B84] mt-0.5">
                    No community reviews yet — be the first driver to review this spot.
                  </p>
                )}
              </div>

              <button
                type="button"
                data-testid="write-review-btn"
                onClick={openReviewComposer}
                className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-[#C5EC45]" />
                <span>{existingUserReview ? 'Edit Your Review' : 'Write a Review'}</span>
              </button>
            </div>

            {reviewSuccessMsg && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-[12px]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            )}

            {reviewOpen && (
              <form
                onSubmit={handleReviewSubmit}
                noValidate
                className="bg-[#F6F7F8] rounded-2xl p-3.5 space-y-3"
              >
                <p className="text-[12.5px] font-bold text-[#141517]">
                  {existingUserReview
                    ? 'Update Your Review (one review per user)'
                    : 'Share Your Parking Experience'}
                </p>

                <div>
                  <span className="block text-[11px] font-semibold text-[#525760] mb-1">
                    Overall Star Rating
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} stars`}
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-[#D1D5DB]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="rev-fee-feedback"
                      className="block text-[11px] font-semibold text-[#525760] mb-1"
                    >
                      Fee Feedback
                    </label>
                    <select
                      id="rev-fee-feedback"
                      value={reviewFeeFeedback}
                      onChange={(e) =>
                        setReviewFeeFeedback(
                          e.target.value as CommunityReview['feeFeedback']
                        )
                      }
                      className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12px]"
                    >
                      <option value="accurate">Fair / Accurate</option>
                      <option value="higher">Higher than listed</option>
                      <option value="lower">Lower than listed</option>
                      <option value="free">Confirmed Free</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="rev-avail"
                      className="block text-[11px] font-semibold text-[#525760] mb-1"
                    >
                      Typical Availability
                    </label>
                    <select
                      id="rev-avail"
                      value={reviewAvailability}
                      onChange={(e) =>
                        setReviewAvailability(
                          e.target.value as CommunityReview['availabilityNote']
                        )
                      }
                      className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12px]"
                    >
                      <option value="plenty">Plenty of spaces</option>
                      <option value="moderate">Moderate spaces</option>
                      <option value="crowded">Usually crowded</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="rev-security"
                      className="block text-[11px] font-semibold text-[#525760] mb-1"
                    >
                      Security (1–5)
                    </label>
                    <select
                      id="rev-security"
                      value={reviewSecurityRating}
                      onChange={(e) => setReviewSecurityRating(Number(e.target.value))}
                      className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12px]"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="rev-cleanliness"
                      className="block text-[11px] font-semibold text-[#525760] mb-1"
                    >
                      Cleanliness (1–5)
                    </label>
                    <select
                      id="rev-cleanliness"
                      value={reviewCleanlinessRating}
                      onChange={(e) => setReviewCleanlinessRating(Number(e.target.value))}
                      className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12px]"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rev-comment"
                    className="block text-[11px] font-semibold text-[#525760] mb-1"
                  >
                    Written Review *
                  </label>
                  <textarea
                    id="rev-comment"
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => {
                      setReviewComment(e.target.value);
                      setReviewError(null);
                    }}
                    placeholder="Share entrance conditions, attendant helpfulness, shade, security, or real pricing..."
                    className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-[12.5px]"
                  />
                  {reviewError && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {reviewError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-[12px] font-semibold text-[#141517] inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Add Review Photos (up to 4)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={reviewPhotos.length >= 4}
                      onChange={handleReviewPhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  {reviewPhotos.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {reviewPhotos.map((p) => (
                        <div key={p.id} className="relative w-14 h-14 rounded-xl overflow-hidden border border-black/10">
                          <img src={p.dataUrl} alt="Review upload" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              setReviewPhotos((prev) => prev.filter((item) => item.id !== p.id))
                            }
                            aria-label="Remove review photo"
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white text-[#141517] flex items-center justify-center shadow"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="min-h-[40px] px-4 rounded-full text-[12px] font-medium text-[#525760]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-review-btn"
                    className="min-h-[40px] px-5 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12.5px] font-bold"
                  >
                    {existingUserReview ? 'Update Review' : 'Post Review'}
                  </button>
                </div>
              </form>
            )}

            {lotReviews.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {lotReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-[#F6F7F8] rounded-2xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#141517] text-[#C5EC45] text-[11px] font-bold flex items-center justify-center shrink-0">
                          {rev.userName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-[#141517] truncate">
                            {rev.userName}
                          </p>
                          <p className="text-[10.5px] text-[#767B84]">
                            {(rev.updatedAt ?? rev.createdAt).slice(0, 10)}
                            {rev.updatedAt ? ' (edited)' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white text-[11.5px] font-bold text-[#141517]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {rev.rating}.0
                        </span>
                        {currentUser?.id === rev.userId && !reviewOpen && (
                          <button
                            type="button"
                            onClick={openReviewComposer}
                            className="text-[11px] font-semibold text-[#525760] hover:text-[#141517] underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[12.5px] text-[#141517] leading-relaxed">
                      {rev.comment}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-[#525760]">
                      <span className="px-2 py-0.5 rounded-full bg-white">
                        Fee: {rev.feeFeedback}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white">
                        Spaces: {rev.availabilityNote}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white">
                        Security {rev.securityRating}/5 · Cleanliness {rev.cleanlinessRating}/5
                      </span>
                    </div>

                    {rev.photos.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {rev.photos.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setLightboxImage(p.dataUrl)}
                            className="w-12 h-12 rounded-lg overflow-hidden border border-black/10"
                          >
                            <img src={p.dataUrl} alt={p.caption || 'Review photo'} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="px-4 sm:px-6 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#F0F1F3] bg-white shrink-0 flex flex-col gap-2.5">
          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onRequestDirections(lot)}
              className="min-h-[44px] rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[13.5px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Route on Map</span>
            </button>
            <a
              href={googleMapsExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] text-[13.5px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => onOpenDemoReserve(lot.id)}
            className="w-full min-h-[46px] rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-semibold transition-colors"
          >
            Select Parking Bay
          </button>
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[1200] bg-black/85 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImage(null);
          }}
        >
          <button
            type="button"
            aria-label="Close enlarged photo"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white text-[#141517] flex items-center justify-center shadow"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged parking view"
            className="max-w-full max-h-[85dvh] rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
