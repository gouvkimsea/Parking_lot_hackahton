import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  MapPin,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PHNOM_PENH_CENTER, PHNOM_PENH_DISTRICTS } from '../data/parkingLots';
import type {
  CommunityParkingSubmission,
  CommunityPhoto,
  CommunityPhotoTag,
  FacilityType,
  SubmissionFeeMode,
  VehicleCategory,
} from '../types/parking';
import {
  COMMUNITY_CATEGORY_OPTIONS,
  COMMUNITY_FACILITY_OPTIONS,
  compressImageToCommunityPhoto,
  validateSubmissionInput,
} from '../utils/communityLogic';
import { LocationPickerMap } from './LocationPickerMap';

interface AddParkingModalProps {
  isOpen: boolean;
  editingSubmission?: CommunityParkingSubmission | null;
  submitterName: string;
  isAdminMode?: boolean;
  onClose: () => void;
  onSubmitNew: (payload: {
    name: string;
    facilityType: FacilityType;
    district: string;
    address: string;
    position: { lat: number; lng: number };
    feeMode: SubmissionFeeMode;
    hourlyCarKhr: number | null;
    hourlyMotoKhr: number | null;
    dailyKhr: number | null;
    monthlyCarKhr: number | null;
    capacitySpaces: number | null;
    indoorOutdoor: 'indoor' | 'outdoor' | 'mixed';
    covered: boolean;
    vehicleTypes: VehicleCategory[];
    facilities: string[];
    openHours: string;
    description: string;
    photos: CommunityPhoto[];
  }) => void;
  onSaveEdit?: (
    submissionId: string,
    payload: {
      name: string;
      facilityType: FacilityType;
      district: string;
      address: string;
      position: { lat: number; lng: number };
      feeMode: SubmissionFeeMode;
      hourlyCarKhr: number | null;
      hourlyMotoKhr: number | null;
      dailyKhr: number | null;
      monthlyCarKhr: number | null;
      capacitySpaces: number | null;
      indoorOutdoor: 'indoor' | 'outdoor' | 'mixed';
      covered: boolean;
      vehicleTypes: VehicleCategory[];
      facilities: string[];
      openHours: string;
      description: string;
      photos: CommunityPhoto[];
    }
  ) => void;
}

const DISTRICT_CHOICES = PHNOM_PENH_DISTRICTS.filter((d) => d !== 'All Phnom Penh');

export const AddParkingModal: React.FC<AddParkingModalProps> = ({
  isOpen,
  editingSubmission,
  submitterName,
  isAdminMode = false,
  onClose,
  onSubmitNew,
  onSaveEdit,
}) => {
  const [name, setName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('public');
  const [district, setDistrict] = useState<string>('BKK1');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    PHNOM_PENH_CENTER
  );
  const [feeMode, setFeeMode] = useState<SubmissionFeeMode>('paid');
  const [hourlyCarKhr, setHourlyCarKhr] = useState('');
  const [hourlyMotoKhr, setHourlyMotoKhr] = useState('');
  const [dailyKhr, setDailyKhr] = useState('');
  const [monthlyCarKhr, setMonthlyCarKhr] = useState('');
  const [capacitySpaces, setCapacitySpaces] = useState('');
  const [indoorOutdoor, setIndoorOutdoor] = useState<'indoor' | 'outdoor' | 'mixed'>(
    'outdoor'
  );
  const [covered, setCovered] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleCategory[]>([
    'car',
    'motorcycle',
  ]);
  const [facilities, setFacilities] = useState<string[]>(['Attendant on Duty']);
  const [openHours, setOpenHours] = useState('6:00 AM – 10:00 PM');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [photoTag, setPhotoTag] = useState<CommunityPhotoTag>('entrance');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSubmittedSuccess(false);
    setErrors({});

    if (editingSubmission) {
      setName(editingSubmission.name);
      setFacilityType(editingSubmission.facilityType);
      setDistrict(editingSubmission.district);
      setAddress(editingSubmission.address);
      setPosition(editingSubmission.position);
      setFeeMode(editingSubmission.feeMode);
      setHourlyCarKhr(
        editingSubmission.hourlyCarKhr !== null
          ? String(editingSubmission.hourlyCarKhr)
          : ''
      );
      setHourlyMotoKhr(
        editingSubmission.hourlyMotoKhr !== null
          ? String(editingSubmission.hourlyMotoKhr)
          : ''
      );
      setDailyKhr(
        editingSubmission.dailyKhr !== null ? String(editingSubmission.dailyKhr) : ''
      );
      setMonthlyCarKhr(
        editingSubmission.monthlyCarKhr !== null
          ? String(editingSubmission.monthlyCarKhr)
          : ''
      );
      setCapacitySpaces(
        editingSubmission.capacitySpaces !== null
          ? String(editingSubmission.capacitySpaces)
          : ''
      );
      setIndoorOutdoor(editingSubmission.indoorOutdoor);
      setCovered(editingSubmission.covered);
      setVehicleTypes(editingSubmission.vehicleTypes);
      setFacilities(editingSubmission.facilities);
      setOpenHours(editingSubmission.openHours);
      setDescription(editingSubmission.description);
      setPhotos(editingSubmission.photos);
    } else {
      setName('');
      setFacilityType('public');
      setDistrict('BKK1');
      setAddress('');
      setPosition(PHNOM_PENH_CENTER);
      setFeeMode('paid');
      setHourlyCarKhr('');
      setHourlyMotoKhr('');
      setDailyKhr('');
      setMonthlyCarKhr('');
      setCapacitySpaces('');
      setIndoorOutdoor('outdoor');
      setCovered(false);
      setVehicleTypes(['car', 'motorcycle']);
      setFacilities(['Attendant on Duty']);
      setOpenHours('6:00 AM – 10:00 PM');
      setDescription('');
      setPhotos([]);
    }
  }, [isOpen, editingSubmission]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleVehicle = (v: VehicleCategory) => {
    setVehicleTypes((prev) =>
      prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v]
    );
    setErrors((prev) => ({ ...prev, vehicleTypes: '' }));
  };

  const toggleFacility = (label: string) => {
    setFacilities((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingPhotos(true);
    try {
      const files = Array.from(fileList).slice(0, Math.max(0, 6 - photos.length));
      const compressed = await Promise.all(
        files.map((f) => compressImageToCommunityPhoto(f, photoTag, submitterName))
      );
      setPhotos((prev) => [...prev, ...compressed].slice(0, 6));
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSubmissionInput({
      name,
      district,
      address,
      openHours,
      feeMode,
      hourlyCarKhr,
      hourlyMotoKhr,
      dailyKhr,
      monthlyCarKhr,
      capacitySpaces,
      vehicleTypes,
      position,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const payload = {
      name: name.trim(),
      facilityType,
      district,
      address: address.trim(),
      position,
      feeMode,
      hourlyCarKhr: validation.parsed.hourlyCarKhr,
      hourlyMotoKhr: validation.parsed.hourlyMotoKhr,
      dailyKhr: validation.parsed.dailyKhr,
      monthlyCarKhr: validation.parsed.monthlyCarKhr,
      capacitySpaces: validation.parsed.capacitySpaces,
      indoorOutdoor,
      covered,
      vehicleTypes,
      facilities,
      openHours: openHours.trim(),
      description: description.trim(),
      photos,
    };

    if (editingSubmission && onSaveEdit) {
      onSaveEdit(editingSubmission.id, payload);
      onClose();
      return;
    }

    onSubmitNew(payload);
    setSubmittedSuccess(true);
  };

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#141517]/50 backdrop-blur-[2px] p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-parking-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[740px] bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_24px_64px_rgba(20,21,23,0.22)] border border-black/[0.06] overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#F0F1F3] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2
              id="add-parking-modal-title"
              className="text-[18px] sm:text-[20px] font-bold text-[#141517]"
            >
              {editingSubmission
                ? isAdminMode
                  ? 'Moderator Edit Parking Location'
                  : 'Edit Pending Parking Submission'
                : 'Add Missing Parking Location'}
            </h2>
            <p className="text-[12px] text-[#767B84] mt-0.5">
              Submitting as <strong className="text-[#141517]">{submitterName}</strong> · Phnom Penh, Cambodia
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close submission modal"
            className="w-10 h-10 rounded-full bg-[#F4F5F6] hover:bg-[#EAECEF] text-[#141517] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-[19px] font-bold text-[#141517]">
                Submission Received — Pending Review
              </h3>
              <p className="text-[13px] text-[#525760] leading-relaxed">
                Thank you for contributing to Phnom Penh parking accuracy. Your submission has been saved under <strong className="text-[#141517]">Pending Review</strong> and will appear on the public map once verified by a moderator.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-7 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-bold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto clean-scroll p-4 sm:p-6 space-y-5">
            {/* Section 1: Basic Information */}
            <div className="space-y-3.5">
              <h3 className="text-[14px] font-bold text-[#141517] uppercase tracking-wide text-[#525760]">
                1. Basic Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="sub-name"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Parking Lot Name *
                  </label>
                  <input
                    id="sub-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((p) => ({ ...p, name: '' }));
                    }}
                    placeholder="e.g. Street 51 Shaded Courtyard Parking"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                  />
                  {errors.name && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sub-category"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Parking Category *
                  </label>
                  <select
                    id="sub-category"
                    value={facilityType}
                    onChange={(e) => {
                      const next = e.target.value as FacilityType;
                      setFacilityType(next);
                      if (next === 'ev_station' && !vehicleTypes.includes('ev')) {
                        setVehicleTypes((p) => [...p, 'ev']);
                      }
                    }}
                    className="w-full h-11 px-3 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                  >
                    {COMMUNITY_CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sub-district"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Khan / Neighborhood *
                  </label>
                  <select
                    id="sub-district"
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setErrors((p) => ({ ...p, district: '' }));
                    }}
                    className="w-full h-11 px-3 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                  >
                    {DISTRICT_CHOICES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="sub-address"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Full Address or Landmark Description *
                  </label>
                  <input
                    id="sub-address"
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrors((p) => ({ ...p, address: '' }));
                    }}
                    placeholder="Street number, Sangkat, nearby landmark..."
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                  />
                  {errors.address && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {errors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sub-hours"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Operating Hours *
                  </label>
                  <input
                    id="sub-hours"
                    type="text"
                    value={openHours}
                    onChange={(e) => {
                      setOpenHours(e.target.value);
                      setErrors((p) => ({ ...p, openHours: '' }));
                    }}
                    placeholder="e.g. 6:00 AM – 10:00 PM or Open 24 Hours"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                  />
                  {errors.openHours && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {errors.openHours}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sub-capacity"
                    className="block text-[12px] font-semibold text-[#141517] mb-1"
                  >
                    Parking Capacity (optional)
                  </label>
                  <input
                    id="sub-capacity"
                    type="text"
                    inputMode="numeric"
                    value={capacitySpaces}
                    onChange={(e) => setCapacitySpaces(e.target.value)}
                    placeholder="Approx. total spaces"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13.5px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                  />
                  {errors.capacitySpaces && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {errors.capacitySpaces}
                    </p>
                  )}
                </div>
              </div>

              {/* Fee Options */}
              <div className="rounded-2xl bg-[#F6F7F8] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[12.5px] font-bold text-[#141517]">
                    Parking Fee Structure (KHR)
                  </span>
                  <div className="inline-flex bg-white rounded-full p-0.5 border border-black/10">
                    {(
                      [
                        { id: 'paid', label: 'Paid (KHR)' },
                        { id: 'free', label: 'Free Parking' },
                        { id: 'unknown', label: 'Unverified' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFeeMode(m.id)}
                        className={`px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                          feeMode === m.id
                            ? 'bg-[#141517] text-white'
                            : 'text-[#525760] hover:text-[#141517]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {feeMode === 'paid' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label htmlFor="sub-car-hr" className="block text-[11px] font-semibold text-[#525760] mb-1">
                        Car (KHR/hr)
                      </label>
                      <input
                        id="sub-car-hr"
                        type="text"
                        inputMode="numeric"
                        value={hourlyCarKhr}
                        onChange={(e) => {
                          setHourlyCarKhr(e.target.value);
                          setErrors((p) => ({ ...p, hourlyCarKhr: '' }));
                        }}
                        placeholder="e.g. 2000"
                        className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12.5px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="sub-moto-hr" className="block text-[11px] font-semibold text-[#525760] mb-1">
                        Moto (KHR)
                      </label>
                      <input
                        id="sub-moto-hr"
                        type="text"
                        inputMode="numeric"
                        value={hourlyMotoKhr}
                        onChange={(e) => setHourlyMotoKhr(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12.5px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="sub-daily" className="block text-[11px] font-semibold text-[#525760] mb-1">
                        Daily (KHR)
                      </label>
                      <input
                        id="sub-daily"
                        type="text"
                        inputMode="numeric"
                        value={dailyKhr}
                        onChange={(e) => setDailyKhr(e.target.value)}
                        placeholder="e.g. 10000"
                        className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12.5px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="sub-monthly" className="block text-[11px] font-semibold text-[#525760] mb-1">
                        Monthly Car (KHR)
                      </label>
                      <input
                        id="sub-monthly"
                        type="text"
                        inputMode="numeric"
                        value={monthlyCarKhr}
                        onChange={(e) => setMonthlyCarKhr(e.target.value)}
                        placeholder="e.g. 160000"
                        className="w-full h-10 px-2.5 rounded-xl bg-white border border-black/10 text-[12.5px]"
                      />
                    </div>
                  </div>
                )}
                {errors.hourlyCarKhr && (
                  <p role="alert" className="text-[11.5px] text-red-600 font-medium">
                    {errors.hourlyCarKhr}
                  </p>
                )}
              </div>

              {/* Vehicles & Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-[12px] font-semibold text-[#141517] mb-1.5">
                    Supported Vehicles *
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'car', label: 'Car' },
                        { id: 'motorcycle', label: 'Motorcycle' },
                        { id: 'bicycle', label: 'Bicycle' },
                        { id: 'ev', label: 'EV' },
                      ] as const
                    ).map((v) => {
                      const active = vehicleTypes.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleVehicle(v.id)}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                            active
                              ? 'bg-[#C5EC45] text-[#141517]'
                              : 'bg-[#F4F5F6] text-[#525760]'
                          }`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.vehicleTypes && (
                    <p role="alert" className="text-[11.5px] text-red-600 mt-1 font-medium">
                      {errors.vehicleTypes}
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-[12px] font-semibold text-[#141517] mb-1.5">
                    Structure & Roof
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['outdoor', 'indoor', 'mixed'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setIndoorOutdoor(type)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize ${
                          indoorOutdoor === type
                            ? 'bg-[#141517] text-white'
                            : 'bg-[#F4F5F6] text-[#525760]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCovered((c) => !c)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                        covered
                          ? 'bg-[#E8F8B4] text-[#3F5A05]'
                          : 'bg-[#F4F5F6] text-[#525760]'
                      }`}
                    >
                      {covered ? 'Covered ✓' : 'Uncovered'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Facilities */}
              <div>
                <span className="block text-[12px] font-semibold text-[#141517] mb-1.5">
                  Available Facilities
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMUNITY_FACILITY_OPTIONS.map((fac) => {
                    const active = facilities.includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacility(fac)}
                        className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-colors ${
                          active
                            ? 'bg-[#141517] text-white border-[#141517]'
                            : 'bg-white text-[#525760] border-black/10 hover:text-[#141517]'
                        }`}
                      >
                        {fac}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="sub-description"
                  className="block text-[12px] font-semibold text-[#141517] mb-1"
                >
                  Additional Notes & Entrance Tips
                </label>
                <textarea
                  id="sub-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe gate access, clearance height, payment methods, or peak hours..."
                  className="w-full p-3 rounded-xl bg-[#F6F7F8] border border-black/10 text-[13px] text-[#141517] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white"
                />
              </div>
            </div>

            {/* Section 2: Interactive Location Picker */}
            <div className="space-y-2.5 pt-2 border-t border-[#F0F1F3]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-bold text-[#525760] uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#4D6A0A]" />
                  <span>2. Pin Exact Location in Phnom Penh</span>
                </h3>
              </div>

              <LocationPickerMap
                position={position}
                onChangePosition={(nextPos, resolved) => {
                  setPosition(nextPos);
                  setErrors((p) => ({ ...p, position: '' }));
                  if (resolved?.address && !address.trim()) {
                    setAddress(resolved.address);
                  }
                  if (
                    resolved?.districtHint &&
                    DISTRICT_CHOICES.includes(resolved.districtHint as (typeof DISTRICT_CHOICES)[number])
                  ) {
                    setDistrict(resolved.districtHint);
                  }
                }}
              />
              {errors.position && (
                <p role="alert" className="text-[11.5px] text-red-600 font-medium">
                  {errors.position}
                </p>
              )}
            </div>

            {/* Section 3: Parking Photos */}
            <div className="space-y-2.5 pt-2 border-t border-[#F0F1F3]">
              <h3 className="text-[14px] font-bold text-[#525760] uppercase tracking-wide flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#141517]" />
                <span>3. Parking Photos (Optional, up to 6)</span>
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  aria-label="Photo category tag"
                  value={photoTag}
                  onChange={(e) => setPhotoTag(e.target.value as CommunityPhotoTag)}
                  className="h-10 px-3 rounded-xl bg-[#F6F7F8] border border-black/10 text-[12px] font-semibold text-[#141517]"
                >
                  <option value="entrance">Entrance Gate</option>
                  <option value="parking_area">Parking Area</option>
                  <option value="fee_board">Fee Signboard</option>
                  <option value="facilities">Facilities / EV</option>
                </select>

                <label className="min-h-[40px] px-4 rounded-full bg-[#F4F5F6] hover:bg-[#E7E9EC] text-[#141517] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhotos ? 'Processing...' : 'Upload Photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={photos.length >= 6 || uploadingPhotos}
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative rounded-xl overflow-hidden border border-black/10 aspect-square bg-[#F6F7F8]"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption || photo.tag}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9.5px] font-semibold">
                        {photo.tag.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((p) => p.filter((item) => item.id !== photo.id))
                        }
                        aria-label="Remove uploaded photo"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-[#141517] flex items-center justify-center shadow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#F0F1F3] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 rounded-full bg-[#F4F5F6] text-[#525760] text-[13px] font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-parking-location-btn"
                className="min-h-[44px] px-6 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13.5px] font-bold transition-colors"
              >
                {editingSubmission ? 'Save Changes' : 'Submit Parking Location'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
