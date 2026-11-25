import React, { useState } from 'react';
import {
  Car,
  Heart,
  MapPin,
  Plus,
  Ticket,
  Trash2,
} from 'lucide-react';
import { USER_AVATAR_URL } from '../data/parkingLots';
import type {
  BookingRecord,
  ParkingLot,
  PriceReport,
  SavedVehicle,
  UserPreferences,
  VehicleCategory,
} from '../types/parking';
import {
  FACILITY_TYPE_LABELS,
  formatCurrency,
  getCompactPriceDisplay,
  validateVehicleInput,
} from '../utils/parkingLogic';

interface SettingsBookingsViewProps {
  bookings: BookingRecord[];
  lots: ParkingLot[];
  favoriteIds: Set<string>;
  vehicles: SavedVehicle[];
  preferences: UserPreferences;
  priceReports: PriceReport[];
  activeBookedBayKeys: Set<string>;
  onCancelBooking: (bookingId: string) => void;
  onShowPass: (booking: BookingRecord) => void;
  onOpenLot: (lotId: string) => void;
  onAddVehicle: (vehicle: SavedVehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onTogglePreference: (key: keyof UserPreferences) => void;
}

export const SettingsBookingsView: React.FC<SettingsBookingsViewProps> = ({
  bookings,
  lots,
  favoriteIds,
  vehicles,
  preferences,
  priceReports,
  onCancelBooking,
  onShowPass,
  onOpenLot,
  onAddVehicle,
  onDeleteVehicle,
  onTogglePreference,
}) => {
  const [newVehicleLabel, setNewVehicleLabel] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleCategory, setNewVehicleCategory] = useState<VehicleCategory>('car');
  const [vehicleErrors, setVehicleErrors] = useState<{ label?: string; plate?: string }>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const activeBookings = bookings.filter((b) => b.status === 'active');
  const pastBookings = bookings.filter((b) => b.status === 'cancelled');
  const favoriteLots = lots.filter((l) => favoriteIds.has(l.id));

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateVehicleInput({
      label: newVehicleLabel,
      plate: newVehiclePlate,
    });
    if (!validation.valid) {
      setVehicleErrors(validation.errors);
      return;
    }

    onAddVehicle({
      id: `veh-${Date.now()}`,
      label: newVehicleLabel.trim(),
      plate: newVehiclePlate.trim().toUpperCase(),
      category: newVehicleCategory,
    });
    setNewVehicleLabel('');
    setNewVehiclePlate('');
    setNewVehicleCategory('car');
    setVehicleErrors({});
    setShowAddForm(false);
  };

  return (
    <section
      aria-label="Account Settings and Bookings"
      className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full px-3 sm:px-5 lg:px-6 xl:px-8 pt-3 md:pt-0 pb-28 md:pb-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column: Profile + Vehicles + Preferences */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {/* Profile Summary Card */}
          <div className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] flex items-center gap-3.5 sm:gap-4">
            <img
              src={USER_AVATAR_URL}
              alt="Sarah Lin"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-[#C5EC45] shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold text-[#141517] truncate">
                Sarah Lin
              </h1>
              <p className="text-[13px] text-[#767B84]">
                Phnom Penh Driver · {priceReports.length} Price Report{priceReports.length === 1 ? '' : 's'}
              </p>
              <p className="text-[12.5px] font-semibold text-[#141517] mt-1.5 tabular-nums">
                {activeBookings.length} Active Booking{activeBookings.length === 1 ? '' : 's'}
                <span className="mx-2 text-[#C4C9D0]" aria-hidden="true">·</span>
                {favoriteLots.length} Saved Garage{favoriteLots.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Saved Vehicles Card */}
          <div className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-bold text-[#141517]">
                Saved Vehicles
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((prev) => !prev);
                  setVehicleErrors({});
                }}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12.5px] font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Close' : 'Add Vehicle'}</span>
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleVehicleSubmit}
                noValidate
                className="bg-[#F6F7F8] rounded-[20px] p-3.5 sm:p-4 space-y-3"
              >
                <div>
                  <label
                    htmlFor="new-vehicle-name"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Vehicle Name
                  </label>
                  <input
                    id="new-vehicle-name"
                    type="text"
                    value={newVehicleLabel}
                    onChange={(e) => {
                      setNewVehicleLabel(e.target.value);
                      setVehicleErrors((prev) => ({ ...prev, label: undefined }));
                    }}
                    placeholder="e.g. Honda Civic · Silver"
                    className="w-full h-11 px-3.5 rounded-xl bg-white text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                  />
                  {vehicleErrors.label && (
                    <p role="alert" className="text-[11.5px] text-[#DC2626] mt-1 font-medium">
                      {vehicleErrors.label}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="new-vehicle-plate"
                      className="block text-[12px] font-semibold text-[#141517] mb-1"
                    >
                      License Plate
                    </label>
                    <input
                      id="new-vehicle-plate"
                      type="text"
                      value={newVehiclePlate}
                      onChange={(e) => {
                        setNewVehiclePlate(e.target.value.toUpperCase());
                        setVehicleErrors((prev) => ({ ...prev, plate: undefined }));
                      }}
                      placeholder="PP-2AB-4821"
                      className="w-full h-11 px-3.5 rounded-xl bg-white font-mono text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                    />
                    {vehicleErrors.plate && (
                      <p role="alert" className="text-[11.5px] text-[#DC2626] mt-1 font-medium">
                        {vehicleErrors.plate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="new-vehicle-type"
                      className="block text-[12px] font-semibold text-[#141517] mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="new-vehicle-type"
                      value={newVehicleCategory}
                      onChange={(e) =>
                        setNewVehicleCategory(e.target.value as VehicleCategory)
                      }
                      className="w-full h-11 px-3 rounded-xl bg-white text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45]"
                    >
                      <option value="car">Car</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="ev">Electric Vehicle</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-full bg-[#141517] hover:bg-[#2A2D32] text-white text-[13px] font-semibold transition-colors"
                >
                  Save Vehicle
                </button>
              </form>
            )}

            <div className="space-y-2.5">
              {vehicles.map((veh) => (
                <div
                  key={veh.id}
                  className="flex items-center justify-between gap-3 bg-[#F6F7F8] rounded-2xl px-3.5 sm:px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#141517] shrink-0">
                      <Car className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#141517] truncate">
                        {veh.label}
                      </p>
                      <p className="text-[12px] font-mono text-[#767B84]">
                        {veh.plate} · {veh.category.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteVehicle(veh.id)}
                    aria-label={`Remove vehicle ${veh.label}`}
                    className="w-11 h-11 rounded-full hover:bg-white text-[#767B84] hover:text-[#DC2626] flex items-center justify-center transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* App Preferences */}
          <div className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
            <h2 className="text-[16px] font-bold text-[#141517]">Preferences</h2>

            {(
              [
                {
                  key: 'autoGateEntry',
                  title: 'License-Plate Auto Gate',
                  desc: 'Open arrival barriers automatically when your plate is detected.',
                },
                {
                  key: 'pushReminders',
                  title: 'Expiry Reminders',
                  desc: 'Notify 15 minutes before your booked session ends.',
                },
                {
                  key: 'evPriority',
                  title: 'Highlight EV Chargers',
                  desc: 'Prioritize garages with active fast-charging spaces.',
                },
              ] as const
            ).map((item) => {
              const checked = preferences[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 py-1"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[#141517]">
                      {item.title}
                    </p>
                    <p className="text-[12px] text-[#767B84] mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={item.title}
                    onClick={() => onTogglePreference(item.key)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
                      checked ? 'bg-[#C5EC45]' : 'bg-[#E2E5E9]'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Reservations + Saved Favorites */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* Active Bookings */}
          <div className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#141517]">
                Active Reservations
              </h2>
              <span className="text-[12.5px] font-medium text-[#767B84] tabular-nums">
                {activeBookings.length} active
              </span>
            </div>

            {activeBookings.length === 0 ? (
              <div className="bg-[#F6F7F8] rounded-[22px] p-7 text-center space-y-2">
                <Ticket className="w-7 h-7 text-[#767B84] mx-auto" />
                <p className="text-[15px] font-semibold text-[#141517]">
                  No active parking bookings
                </p>
                <p className="text-[13px] text-[#767B84]">
                  Select any open bay from Home or Map to reserve your spot.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="bg-[#F6F7F8] rounded-[22px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[16px] font-bold text-[#141517]">
                          {bk.lotName}
                        </h3>
                        <span className="text-[12px] font-mono font-semibold text-[#4D6A0A] bg-[#E8F8B4] px-2.5 py-0.5 rounded-full">
                          Bay {bk.bayLabel}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[#767B84] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{bk.lotAddress}</span>
                      </p>
                      <p className="text-[12.5px] text-[#525760] tabular-nums pt-0.5">
                        {bk.floorLabel} · {bk.date} at {bk.startTime} ({bk.durationHours}h) · Plate{' '}
                        <span className="font-mono font-semibold text-[#141517]">
                          {bk.licensePlate}
                        </span>
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <p className="text-[18px] font-extrabold text-[#141517] tabular-nums">
                        {formatCurrency(bk.totalPrice)}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onShowPass(bk)}
                          className="min-h-[44px] px-4 py-2 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[12.5px] font-semibold transition-colors whitespace-nowrap"
                        >
                          Show Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancelBooking(bk.id)}
                          aria-label={`Cancel booking ${bk.code}`}
                          className="min-h-[44px] px-3.5 py-2 rounded-full bg-white hover:bg-[#FEE2E2] text-[#525760] hover:text-[#DC2626] text-[12.5px] font-semibold transition-colors whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pastBookings.length > 0 && (
              <div className="pt-3 border-t border-[#F0F1F3] space-y-2.5">
                <h3 className="text-[13.5px] font-semibold text-[#767B84]">
                  Cancelled History
                </h3>
                {pastBookings.slice(0, 3).map((bk) => (
                  <div
                    key={bk.id}
                    className="flex items-center justify-between text-[13px] text-[#767B84] py-1.5"
                  >
                    <span>
                      {bk.lotName} · Bay {bk.bayLabel} ({bk.date})
                    </span>
                    <span className="tabular-nums">Cancelled · {formatCurrency(bk.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Favorites */}
          <div className="bg-white rounded-[28px] p-6 shadow-[0_12px_36px_rgba(20,21,23,0.05)] border border-black/[0.04] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#141517]">
                Saved Garages
              </h2>
              <Heart className="w-4 h-4 fill-[#EF4444] text-[#EF4444]" aria-hidden="true" />
            </div>

            {favoriteLots.length === 0 ? (
              <p className="text-[13.5px] text-[#767B84]">
                Tap the heart icon on any parking location to save it here for quick booking.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {favoriteLots.map((lot) => {
                  const price = getCompactPriceDisplay(lot);
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => onOpenLot(lot.id)}
                      className="text-left bg-[#F6F7F8] hover:bg-[#EEF2E6] rounded-[20px] p-3.5 flex items-center gap-3.5 transition-colors"
                    >
                      <img
                        src={lot.images[0]}
                        alt={lot.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-bold text-[#141517] truncate">
                          {lot.name}
                        </p>
                        <p className="text-[12px] text-[#767B84] truncate">
                          {lot.district} · {FACILITY_TYPE_LABELS[lot.facilityType]}
                        </p>
                        <p className="text-[12.5px] font-semibold text-[#141517] mt-1 tabular-nums">
                          {price.primaryText}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
