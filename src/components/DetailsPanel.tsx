import React, { useEffect, useState } from 'react';
import { ArrowLeft, Car, Clock, Heart, MapPin } from 'lucide-react';
import type { ParkingLot } from '../types/parking';
import {
  AVAILABILITY_LABELS,
  FACILITY_TYPE_LABELS,
  getCompactPriceDisplay,
} from '../utils/parkingLogic';

interface DetailsPanelProps {
  lot: ParkingLot;
  isFavorite: boolean;
  onToggleFavorite: (lotId: string) => void;
  activeBookedBayKeys: Set<string>;
  onBack: () => void;
  onSelectSpace: () => void;
  onOpenOnMap: (lotId: string) => void;
  isDesktop?: boolean;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  lot,
  isFavorite,
  onToggleFavorite,
  onBack,
  onSelectSpace,
  onOpenOnMap,
  isDesktop = false,
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedImageIdx(0);
  }, [lot.id]);

  const priceDisplay = getCompactPriceDisplay(lot);
  const activeImage = lot.images[selectedImageIdx] ?? lot.images[0];
  const heroKey = `${lot.id}-hero-${selectedImageIdx}`;

  return (
    <section
      aria-label="Parking Details"
      className="flex flex-col bg-white lg:rounded-[32px] lg:shadow-[0_14px_40px_rgba(20,21,23,0.06)] lg:border lg:border-black/[0.04] overflow-hidden min-h-full lg:h-full"
    >
      {/* Top Bar */}
      <div className="px-5 pt-5 pb-3.5 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={isDesktop ? 'Previous parking location' : 'Back to nearby parking'}
          className="w-11 h-11 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-95 text-[#141517] flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
        </button>

        <h2 className="text-[18px] font-bold tracking-[-0.01em] text-[#141517] truncate">
          Parking Details
        </h2>

        <div className="w-11 h-11 shrink-0" aria-hidden="true" />
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 min-h-0 lg:overflow-y-auto clean-scroll px-5 pb-28 lg:pb-4 flex flex-col gap-3.5">
        {/* Hero Image */}
        <div className="relative rounded-[22px] overflow-hidden aspect-[16/10] bg-[#E8ECE6]">
          {failedImages[heroKey] ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#ECEFE8] to-[#DCE2D6] text-[#525760] gap-2">
              <Car className="w-8 h-8" />
              <span className="text-xs font-medium">{lot.name}</span>
            </div>
          ) : (
            <img
              src={activeImage}
              alt={`${lot.name} featured view`}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, [heroKey]: true }))
              }
              className="w-full h-full object-cover transition-opacity duration-200"
            />
          )}

          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-[#141517] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#141517] shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap max-w-[190px] truncate">{lot.openHours}</span>
          </div>

          <button
            type="button"
            onClick={() => onToggleFavorite(lot.id)}
            aria-label={isFavorite ? `Remove ${lot.name} from favorites` : `Save ${lot.name} to favorites`}
            aria-pressed={isFavorite}
            className="absolute top-2.5 right-2.5 w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
          >
            <Heart
              className={`w-[18px] h-[18px] transition-colors ${
                isFavorite
                  ? 'fill-[#EF4444] text-[#EF4444]'
                  : 'text-[#141517] hover:text-[#EF4444]'
              }`}
            />
          </button>
        </div>

        {/* 3-Column Gallery Thumbnails */}
        <div className="grid grid-cols-3 gap-2.5">
          {lot.images.map((img, idx) => {
            const isSelected = idx === selectedImageIdx;
            const thumbKey = `${lot.id}-thumb-${idx}`;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                aria-label={`Select gallery photo ${idx + 1} for ${lot.name}`}
                aria-pressed={isSelected}
                className={`relative rounded-[16px] overflow-hidden aspect-[4/3] bg-[#E8ECE6] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                  isSelected
                    ? 'ring-[2.5px] ring-[#C5EC45] ring-offset-1'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                {failedImages[thumbKey] ? (
                  <div className="w-full h-full flex items-center justify-center bg-[#ECEFE8] text-[#767B84]">
                    <Car className="w-5 h-5" />
                  </div>
                ) : (
                  <img
                    src={img}
                    alt={`${lot.name} angle ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [thumbKey]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Title & Address */}
        <div className="pt-0.5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3FCE0] text-[#3F5A05]">
              {FACILITY_TYPE_LABELS[lot.facilityType]}
            </span>
            <span className="text-[11px] font-medium text-[#767B84]">
              {lot.district}
            </span>
          </div>
          <h3 className="text-[20px] font-bold tracking-[-0.02em] text-[#141517]">
            {lot.name}
          </h3>
          <button
            type="button"
            onClick={() => onOpenOnMap(lot.id)}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-[#767B84] hover:text-[#141517] transition-colors text-left"
          >
            <MapPin className="w-4 h-4 text-[#525760] shrink-0" aria-hidden="true" />
            <span>{lot.address}</span>
          </button>
        </div>

        {/* 2-Column Info Cards: Availability & Price */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F4F5F6] rounded-[18px] py-3.5 px-3 text-center">
            <p className="text-[13.5px] font-bold text-[#141517]">Availability</p>
            <p
              className="text-[12.5px] text-[#767B84] mt-1 tabular-nums"
              data-testid="details-availability"
            >
              {lot.availability.availableSpaces !== null
                ? `${lot.availability.availableSpaces} spaces`
                : AVAILABILITY_LABELS[lot.availability.status]}
            </p>
          </div>
          <div className="bg-[#F4F5F6] rounded-[18px] py-3.5 px-3 text-center">
            <p className="text-[13.5px] font-bold text-[#141517]">Price</p>
            <p className="text-[12.5px] text-[#767B84] mt-1 tabular-nums">
              {priceDisplay.primaryText}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="pt-1">
          <h4 className="text-[15px] font-bold text-[#141517]">Description</h4>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[#6B7280]">
            {lot.description}
          </p>
        </div>

        {/* Facilities */}
        <div className="pt-0.5">
          <h4 className="text-[15px] font-bold text-[#141517]">Facilities</h4>
          <p className="mt-1.5 text-[13px] leading-[1.7] text-[#525760]">
            {lot.facilities.map((facility, index) => (
              <React.Fragment key={facility}>
                {index > 0 && (
                  <span className="mx-2 text-[#B8BDC5]" aria-hidden="true">
                    ·
                  </span>
                )}
                <span>{facility}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* Desktop Anchored Bottom CTA */}
      <div className="hidden lg:block px-5 pt-3 pb-5 bg-white border-t border-black/[0.04] shrink-0">
        <button
          type="button"
          onClick={onSelectSpace}
          className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] text-[#141517] text-[15px] font-semibold transition-all shadow-[0_6px_18px_rgba(197,236,69,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] focus-visible:ring-offset-2"
        >
          Select Space (Demo)
        </button>
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-5 pt-3 pb-5 bg-gradient-to-t from-white via-white to-white/0">
        <button
          type="button"
          onClick={onSelectSpace}
          className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] text-[#141517] text-[15px] font-semibold transition-all shadow-[0_8px_24px_rgba(197,236,69,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          Select Space (Demo)
        </button>
      </div>
    </section>
  );
};
