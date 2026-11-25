import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Ticket,
  X,
} from 'lucide-react';
import type {
  BookingRecord,
  FloorId,
  ParkingBay,
  ParkingLot,
  SavedVehicle,
  VehicleCategory,
} from '../types/parking';
import {
  FLOOR_LABELS,
  calculateBookingSummary,
  formatBookingCode,
  formatCurrency,
  validateBookingInput,
} from '../utils/parkingLogic';

interface BookingModalProps {
  isOpen: boolean;
  mode: 'create' | 'view-pass';
  lot: ParkingLot;
  floor: FloorId;
  bay: ParkingBay | null;
  vehicles: SavedVehicle[];
  existingPass?: BookingRecord | null;
  onClose: () => void;
  onConfirmBooking: (booking: BookingRecord) => void;
  onViewBookings: () => void;
}

const DURATION_OPTIONS = [1, 2, 3, 4, 6, 10];

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Deterministic decorative QR matrix SVG derived from booking code */
const BookingQrSvg: React.FC<{ code: string }> = ({ code }) => {
  const size = 11;
  let hash = 2166136261;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inTopLeft = x < 3 && y < 3;
      const inTopRight = x >= size - 3 && y < 3;
      const inBottomLeft = x < 3 && y >= size - 3;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      const bit = (hash + x * 31 + y * 17 + x * y * 7) % 3 !== 0;
      if (bit) {
        cells.push({ x, y });
      }
    }
  }

  return (
    <svg
      viewBox="0 0 110 110"
      className="w-28 h-28 shrink-0"
      role="img"
      aria-label={`QR gate pass for code ${code}`}
    >
      <rect width="110" height="110" rx="12" fill="#FFFFFF" />
      {/* Finder squares */}
      {[
        [6, 6],
        [76, 6],
        [6, 76],
      ].map(([fx, fy], idx) => (
        <g key={idx}>
          <rect
            x={fx}
            y={fy}
            width="28"
            height="28"
            rx="5"
            fill="none"
            stroke="#141517"
            strokeWidth="4"
          />
          <rect x={fx + 8} y={fy + 8} width="12" height="12" rx="2.5" fill="#141517" />
        </g>
      ))}
      {cells.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={6 + x * 9}
          y={6 + y * 9}
          width="7.2"
          height="7.2"
          rx="1.8"
          fill="#141517"
        />
      ))}
    </svg>
  );
};

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  mode,
  lot,
  floor,
  bay,
  vehicles,
  existingPass,
  onClose,
  onConfirmBooking,
  onViewBookings,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicles[0]?.id ?? 'custom'
  );
  const [licensePlate, setLicensePlate] = useState<string>(vehicles[0]?.plate ?? '');
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>(
    vehicles[0]?.category ?? 'car'
  );
  const [date, setDate] = useState<string>(getTodayIso());
  const [startTime, setStartTime] = useState<string>('10:00');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [errors, setErrors] = useState<{
    bayId?: string;
    licensePlate?: string;
    date?: string;
    startTime?: string;
    durationHours?: string;
  }>({});
  const [confirmedPass, setConfirmedPass] = useState<BookingRecord | null>(
    mode === 'view-pass' ? existingPass ?? null : null
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (mode === 'view-pass' && existingPass) {
      setConfirmedPass(existingPass);
    } else {
      setConfirmedPass(null);
      const firstVehicle = vehicles[0];
      if (firstVehicle) {
        setSelectedVehicleId(firstVehicle.id);
        setLicensePlate(firstVehicle.plate);
        setVehicleCategory(firstVehicle.category);
      } else {
        setSelectedVehicleId('custom');
        setLicensePlate('');
        setVehicleCategory('car');
      }
      setDate(getTodayIso());
      setStartTime('10:00');
      setDurationHours(2);
    }
  }, [isOpen, mode, existingPass, vehicles]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = calculateBookingSummary(lot.pricePerHour, durationHours);

  const handleVehicleSelect = (id: string) => {
    setSelectedVehicleId(id);
    if (id === 'custom') {
      setLicensePlate('');
      return;
    }
    const found = vehicles.find((v) => v.id === id);
    if (found) {
      setLicensePlate(found.plate);
      setVehicleCategory(found.category);
      setErrors((prev) => ({ ...prev, licensePlate: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateBookingInput({
      bayId: bay?.id ?? null,
      licensePlate,
      date,
      startTime,
      durationHours,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!bay) return;

    const nowTs = Date.now();
    const record: BookingRecord = {
      id: `bk-${nowTs}`,
      code: formatBookingCode(bay.label, nowTs),
      lotId: lot.id,
      lotName: lot.name,
      lotAddress: lot.address,
      floor,
      floorLabel: FLOOR_LABELS[floor],
      bayId: bay.id,
      bayLabel: bay.label,
      vehicleCategory,
      licensePlate: licensePlate.trim().toUpperCase(),
      date,
      startTime,
      durationHours,
      hourlyRate: lot.pricePerHour,
      serviceFee: summary.serviceFee,
      totalPrice: summary.totalPrice,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    onConfirmBooking(record);
    setConfirmedPass(record);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141517]/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[460px] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-[0_24px_64px_rgba(20,21,23,0.22)] max-h-[92vh] overflow-y-auto clean-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="sm:hidden pt-3 flex justify-center">
          <span className="w-10 h-1.5 rounded-full bg-[#D8DCE2]" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#F0F1F3]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-[#C5EC45] flex items-center justify-center text-[#141517]">
              {confirmedPass ? (
                <Ticket className="w-[18px] h-[18px]" />
              ) : (
                <Car className="w-[18px] h-[18px]" />
              )}
            </span>
            <h2
              id="booking-modal-title"
              className="text-[18px] font-bold text-[#141517]"
            >
              {confirmedPass ? 'Digital Parking Pass' : 'Confirm Reservation'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="w-9 h-9 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedPass ? (
          /* Confirmation & Digital Pass State */
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 bg-[#F3FCE0] rounded-2xl p-4">
              <CheckCircle2 className="w-6 h-6 text-[#4D6A0A] shrink-0" />
              <div>
                <p className="text-[14px] font-bold text-[#141517]">
                  Space {confirmedPass.bayLabel} Reserved
                </p>
                <p className="text-[12px] text-[#4B5563]">
                  Scan this QR code or use plate entry at the arrival barrier.
                </p>
              </div>
            </div>

            <div className="bg-[#F6F7F8] rounded-[22px] p-5 flex items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-medium text-[#767B84]">
                  Confirmation Code
                </p>
                <p className="text-[17px] font-bold font-mono text-[#141517] tracking-tight">
                  {confirmedPass.code}
                </p>
                <p className="text-[13px] font-semibold text-[#141517] truncate pt-1">
                  {confirmedPass.lotName}
                </p>
                <p className="text-[12px] text-[#767B84] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{confirmedPass.lotAddress}</span>
                </p>
              </div>
              <BookingQrSvg code={confirmedPass.code} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="bg-[#F6F7F8] rounded-2xl p-3.5">
                <p className="text-[11px] text-[#767B84]">Bay & Floor</p>
                <p className="font-bold text-[#141517] mt-0.5">
                  {confirmedPass.bayLabel} · {confirmedPass.floorLabel}
                </p>
              </div>
              <div className="bg-[#F6F7F8] rounded-2xl p-3.5">
                <p className="text-[11px] text-[#767B84]">License Plate</p>
                <p className="font-bold font-mono text-[#141517] mt-0.5">
                  {confirmedPass.licensePlate}
                </p>
              </div>
              <div className="bg-[#F6F7F8] rounded-2xl p-3.5">
                <p className="text-[11px] text-[#767B84]">Schedule</p>
                <p className="font-semibold text-[#141517] mt-0.5 tabular-nums">
                  {confirmedPass.date} · {confirmedPass.startTime} ({confirmedPass.durationHours}h)
                </p>
              </div>
              <div className="bg-[#F6F7F8] rounded-2xl p-3.5">
                <p className="text-[11px] text-[#767B84]">Total Paid</p>
                <p className="font-bold text-[#141517] mt-0.5 tabular-nums">
                  {formatCurrency(confirmedPass.totalPrice)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewBookings();
                }}
                className="flex-1 h-12 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] text-[14px] font-semibold transition-colors"
              >
                My Bookings
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[14px] font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Booking Checkout Form */
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
            {/* Selected Bay Summary */}
            <div className="bg-[#F6F7F8] rounded-[20px] p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#141517] truncate">
                  {lot.name}
                </p>
                <p className="text-[12px] text-[#767B84] mt-0.5">
                  {FLOOR_LABELS[floor]} · Space{' '}
                  <strong className="text-[#141517]">{bay?.label ?? '—'}</strong>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[17px] font-extrabold text-[#141517] tabular-nums">
                  {lot.pricePerHour === 0 ? 'Free' : formatCurrency(lot.pricePerHour)}
                </p>
                <p className="text-[11px] text-[#767B84]">
                  {lot.pricePerHour === 0 ? 'demo rate' : 'per hour (est.)'}
                </p>
              </div>
            </div>

            {/* Saved Vehicle Selector */}
            {vehicles.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-[#141517] mb-2">
                  Choose Vehicle
                </p>
                <div className="flex flex-wrap gap-2">
                  {vehicles.map((veh) => {
                    const active = selectedVehicleId === veh.id;
                    return (
                      <button
                        key={veh.id}
                        type="button"
                        onClick={() => handleVehicleSelect(veh.id)}
                        className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium transition-all ${
                          active
                            ? 'bg-[#C5EC45] text-[#141517] font-semibold'
                            : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517]'
                        }`}
                      >
                        {veh.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleVehicleSelect('custom')}
                    className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium transition-all ${
                      selectedVehicleId === 'custom'
                        ? 'bg-[#C5EC45] text-[#141517] font-semibold'
                        : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517]'
                    }`}
                  >
                    Other Plate
                  </button>
                </div>
              </div>
            )}

            {/* License Plate Field */}
            <div>
              <label
                htmlFor="booking-license-plate"
                className="block text-[13px] font-semibold text-[#141517] mb-1.5"
              >
                License Plate
              </label>
              <input
                id="booking-license-plate"
                type="text"
                value={licensePlate}
                onChange={(e) => {
                  setLicensePlate(e.target.value.toUpperCase());
                  setErrors((prev) => ({ ...prev, licensePlate: undefined }));
                }}
                placeholder="e.g. PP-2AB-4821"
                className={`w-full h-11 px-4 rounded-2xl bg-[#F4F5F6] font-mono text-[14px] text-[#141517] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.licensePlate
                    ? 'ring-2 ring-[#EF4444] bg-white'
                    : 'focus:ring-[#C5EC45]'
                }`}
              />
              {errors.licensePlate && (
                <p role="alert" className="text-[12px] text-[#DC2626] mt-1.5 font-medium">
                  {errors.licensePlate}
                </p>
              )}
            </div>

            {/* Date & Start Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="booking-date"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-[#141517] mb-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#767B84]" />
                  <span>Date</span>
                </label>
                <input
                  id="booking-date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  className="w-full h-11 px-3.5 rounded-2xl bg-[#F4F5F6] text-[13.5px] text-[#141517] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                />
                {errors.date && (
                  <p role="alert" className="text-[12px] text-[#DC2626] mt-1">
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="booking-time"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-[#141517] mb-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-[#767B84]" />
                  <span>Arrival</span>
                </label>
                <input
                  id="booking-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setErrors((prev) => ({ ...prev, startTime: undefined }));
                  }}
                  className="w-full h-11 px-3.5 rounded-2xl bg-[#F4F5F6] text-[13.5px] text-[#141517] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                />
                {errors.startTime && (
                  <p role="alert" className="text-[12px] text-[#DC2626] mt-1">
                    {errors.startTime}
                  </p>
                )}
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <p className="text-[13px] font-semibold text-[#141517] mb-2">
                Duration
              </p>
              <div className="grid grid-cols-6 gap-2">
                {DURATION_OPTIONS.map((hrs) => {
                  const active = durationHours === hrs;
                  return (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDurationHours(hrs)}
                      aria-pressed={active}
                      className={`h-10 rounded-full text-[13px] font-semibold tabular-nums transition-all ${
                        active
                          ? 'bg-[#C5EC45] text-[#141517]'
                          : 'bg-[#F4F5F6] text-[#525760] hover:text-[#141517]'
                      }`}
                    >
                      {hrs}h
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-[#ECEEF0] pt-4 space-y-2 text-[13.5px]">
              <div className="flex justify-between text-[#525760]">
                <span>
                  Parking ({durationHours} {durationHours === 1 ? 'hr' : 'hrs'} ×{' '}
                  {formatCurrency(lot.pricePerHour)})
                </span>
                <span className="tabular-nums font-medium text-[#141517]">
                  {formatCurrency(summary.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#525760]">
                <span>Digital Gate Fee</span>
                <span className="tabular-nums font-medium text-[#141517]">
                  {formatCurrency(summary.serviceFee)}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-[#ECEEF0]">
                <span className="text-[15px] font-bold text-[#141517]">Total</span>
                <span className="text-[20px] font-extrabold text-[#141517] tabular-nums">
                  {formatCurrency(summary.totalPrice)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] text-[#141517] text-[15px] font-semibold transition-all shadow-[0_8px_22px_rgba(197,236,69,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] focus-visible:ring-offset-2"
            >
              Confirm Booking · {formatCurrency(summary.totalPrice)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
