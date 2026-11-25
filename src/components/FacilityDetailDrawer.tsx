import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  Heart,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  X,
  Zap,
} from 'lucide-react';
import type { ParkingLot, PriceReport, RateValue, VehicleCategory } from '../types/parking';
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

interface FacilityDetailDrawerProps {
  lot: ParkingLot | null;
  isFavorite: boolean;
  userPosition: { lat: number; lng: number } | null;
  existingReports: PriceReport[];
  onClose: () => void;
  onToggleFavorite: (lotId: string) => void;
  onRequestDirections: (lot: ParkingLot) => void;
  onOpenDemoReserve: (lotId: string) => void;
  onSubmitPriceReport: (report: PriceReport) => void;
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
  onClose,
  onToggleFavorite,
  onRequestDirections,
  onOpenDemoReserve,
  onSubmitPriceReport,
}) => {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportVehicleType, setReportVehicleType] = useState<
    PriceReport['vehicleType']
  >('car');
  const [reportedPriceKhr, setReportedPriceKhr] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [reportErrors, setReportErrors] = useState<{
    reportedPriceKhr?: string;
    notes?: string;
  }>({});
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    setReportOpen(false);
    setReportedPriceKhr('');
    setReportNotes('');
    setReportErrors({});
    setReportSubmitted(false);
  }, [lot?.id]);

  useEffect(() => {
    if (!lot) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lot, onClose]);

  if (!lot) return null;

  const distanceKm = userPosition
    ? calculateDistanceKm(userPosition, lot.position)
    : null;

  const lotReports = existingReports.filter((r) => r.lotId === lot.id);

  const googleMapsExternalUrl = `https://www.google.com/maps/dir/?api=1&destination=${lot.position.lat},${lot.position.lng}`;

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    setReportSubmitted(true);
    setReportOpen(false);
    setReportedPriceKhr('');
    setReportNotes('');
    setReportErrors({});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#141517]/45 backdrop-blur-[2px]"
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
        <div className="px-6 py-4 border-b border-[#F0F1F3] flex items-start justify-between gap-3 shrink-0">
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
            </div>
            <h2
              id="facility-drawer-title"
              className="text-[20px] font-bold text-[#141517] mt-1.5 leading-snug"
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
              className="w-10 h-10 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] flex items-center justify-center transition-colors"
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
              className="w-10 h-10 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] text-[#141517] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto clean-scroll px-6 py-5 space-y-5">
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
                    ({lot.reviewCount.toLocaleString()} Google reviews)
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

              <div className="grid grid-cols-2 gap-2.5 text-[12.5px]">
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

            <div className="flex items-center justify-between gap-2 pt-1 text-[11.5px] text-[#767B84]">
              <span className="truncate">Source: {lot.pricing.sourceLabel}</span>
              <button
                type="button"
                onClick={() => setReportOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[#141517] font-semibold hover:underline shrink-0"
              >
                <Flag className="w-3.5 h-3.5" />
                Report incorrect price
              </button>
            </div>

            {reportSubmitted && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-[12px]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Thank you! Your Phnom Penh price correction has been saved locally for review.
                </span>
              </div>
            )}

            {lotReports.length > 0 && (
              <div className="bg-amber-50/70 rounded-xl p-3 space-y-1">
                <p className="text-[11.5px] font-semibold text-amber-900">
                  Community Price Reports ({lotReports.length})
                </p>
                {lotReports.slice(0, 2).map((rep) => (
                  <p key={rep.id} className="text-[11.5px] text-amber-800 tabular-nums">
                    • {rep.vehicleType}: {formatKhr(rep.reportedPriceKhr)}
                    {rep.notes ? ` — "${rep.notes}"` : ''}
                  </p>
                ))}
              </div>
            )}

            {reportOpen && (
              <form
                onSubmit={handleReportSubmit}
                noValidate
                className="bg-[#F6F7F8] rounded-2xl p-3.5 space-y-3"
              >
                <p className="text-[12.5px] font-bold text-[#141517]">
                  Submit Price Correction
                </p>
                <div className="grid grid-cols-2 gap-2.5">
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
                      className="w-full h-9 px-2.5 rounded-xl bg-white text-[12.5px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
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
                      className="w-full h-9 px-3 rounded-xl bg-white text-[12.5px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                    />
                  </div>
                </div>
                {reportErrors.reportedPriceKhr && (
                  <p role="alert" className="text-[11.5px] text-red-600 font-medium">
                    {reportErrors.reportedPriceKhr}
                  </p>
                )}
                <div>
                  <label
                    htmlFor="report-notes"
                    className="block text-[11px] font-semibold text-[#525760] mb-1"
                  >
                    Details / Signboard Note (optional)
                  </label>
                  <input
                    id="report-notes"
                    type="text"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="e.g. Gate sign says 1,000 KHR flat for moto"
                    className="w-full h-9 px-3 rounded-xl bg-white text-[12.5px] text-[#141517] border border-black/10 focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="px-3.5 py-1.5 rounded-full text-[12px] font-medium text-[#525760] hover:text-[#141517]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#141517] text-white text-[12px] font-semibold hover:bg-[#2A2D32]"
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
        </div>

        {/* Sticky Bottom Actions */}
        <div className="px-6 py-4 border-t border-[#F0F1F3] bg-white shrink-0 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onRequestDirections(lot)}
              className="h-11 rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[13.5px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Route on Map</span>
            </button>
            <a
              href={googleMapsExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] text-[13.5px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => onOpenDemoReserve(lot.id)}
            className="w-full h-11 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-semibold transition-colors"
          >
            Open Bay Selector (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};
