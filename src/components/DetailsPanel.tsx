import React, { useEffect, useState } from 'react';
import { ArrowLeft, Car, Clock, Heart, MapPin, Star } from 'lucide-react';
import type { ParkingLot } from '../types/parking';
import {
  clampReviewRating,
  countAvailableSpaces,
  formatCurrency,
  formatReviewCountLabel,
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
  activeBookedBayKeys,
  onBack,
  onSelectSpace,
  onOpenOnMap,
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedImageIdx(0);
  }, [lot.id]);

  const availableSpaces = countAvailableSpaces(lot, activeBookedBayKeys);
  const activeImage = lot.images[selectedImageIdx] ?? lot.images[0];
  const heroKey = `${lot.id}-hero-${selectedImageIdx}`;

  return (
    <section
      aria-label="Parking Details"
      className="flex flex-col bg-white md:rounded-[32px] md:shadow-[0_14px_40px_rgba(20,21,23,0.06)] md:border md:border-black/[0.04] overflow-hidden min-h-full md:min-h-0"
    >
      {/* Top Bar: Circular Lime Back Button + Centered Title */}
      <div className="px-4 md:px-7 pt-4 md:pt-5 pb-3 md:pb-4 flex items-center justify-between gap-3 shrink-0 border-b border-black/[0.03]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to nearby parking"
          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-95 text-[#141517] flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
        </button>

        <h1 className="text-[18px] md:text-[22px] font-bold tracking-[-0.02em] text-[#141517]">
          Parking Details
        </h1>

        {/* Spacer for optical symmetry */}
        <div className="w-10 h-10 md:w-11 md:h-11 shrink-0" aria-hidden="true" />
      </div>

      {/* Main Content: 1-Column Mobile, 2-Column Laptop/Desktop */}
      <div className="flex-1 px-4 md:px-7 pt-4 md:pt-6 pb-28 md:pb-7">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-7 items-start">
          {/* Left Column: Hero Gallery + Thumbnails + Title & Address */}
          <div className="md:col-span-5 space-y-3.5">
            {/* Hero Image with Floating Hours & Favorite Heart */}
            <div className="relative rounded-[20px] md:rounded-[22px] overflow-hidden h-[190px] sm:h-[220px] md:h-[240px] w-full bg-[#E8ECE6]">
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

              {/* Open Hours Pill */}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-[#141517] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm">
                <Clock className="w-3.5 h-3.5 text-[#141517] shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{lot.openHours}</span>
              </div>

              {/* Favorite Heart Button */}
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

            {/* 3-Column Interactive Gallery Thumbnails */}
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
                    className={`relative rounded-[14px] overflow-hidden h-[58px] md:h-[68px] w-full bg-[#E8ECE6] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
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
            <div className="pt-1">
              <h2 className="text-[20px] md:text-[22px] font-bold tracking-[-0.02em] text-[#141517]">
                {lot.name}
              </h2>
              <button
                type="button"
                onClick={() => onOpenOnMap(lot.id)}
                className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-[#767B84] hover:text-[#141517] transition-colors text-left"
              >
                <MapPin className="w-4 h-4 text-[#525760] shrink-0" aria-hidden="true" />
                <span>{lot.address}</span>
              </button>
            </div>

            {/* Desktop & Tablet Primary CTA (above the fold on 13"-14" laptops) */}
            <div className="hidden md:block pt-2">
              <button
                type="button"
                onClick={onSelectSpace}
                className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] text-[#141517] text-[15px] font-semibold transition-all shadow-[0_6px_18px_rgba(197,236,69,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] focus-visible:ring-offset-2"
              >
                Select Space
              </button>
            </div>
          </div>

          {/* Right Column: Stats, Description, Facilities, Reviews & Primary CTA */}
          <div className="md:col-span-7 space-y-4">
            {/* 2-Column Info Cards: Availability & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F4F5F6] rounded-[18px] py-3.5 px-4 text-center">
                <p className="text-[13.5px] md:text-[14px] font-bold text-[#141517]">Availability</p>
                <p
                  className="text-[13px] text-[#767B84] mt-0.5 tabular-nums"
                  data-testid="details-availability"
                >
                  {availableSpaces} Space available
                </p>
              </div>
              <div className="bg-[#F4F5F6] rounded-[18px] py-3.5 px-4 text-center">
                <p className="text-[13.5px] md:text-[14px] font-bold text-[#141517]">Price</p>
                <p className="text-[13px] text-[#767B84] mt-0.5 tabular-nums">
                  {formatCurrency(lot.pricePerHour)}/hr
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-[15px] md:text-[16px] font-bold text-[#141517]">Description</h3>
              <p className="mt-1.5 text-[13.5px] md:text-[14px] leading-[1.6] text-[#6B7280]">
                {lot.description}
              </p>
            </div>

            {/* Facilities */}
            <div>
              <h3 className="text-[15px] md:text-[16px] font-bold text-[#141517]">Facilities</h3>
              <p className="mt-1.5 text-[13px] md:text-[13.5px] leading-[1.7] text-[#525760]">
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

            {/* Read-Only User Reviews */}
            <div
              aria-label="Driver reviews"
              data-testid="details-reviews-section"
              className="pt-1"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] md:text-[16px] font-bold text-[#141517]">Reviews</h3>
                <div className="inline-flex items-center gap-1.5 text-[12.5px] md:text-[13px] tabular-nums">
                  <Star
                    className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B] shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    className="font-bold text-[#141517]"
                    data-testid="details-rating-value"
                  >
                    {lot.rating.toFixed(1)}
                  </span>
                  <span className="text-[#767B84]">
                    ({formatReviewCountLabel(lot.reviewCount)})
                  </span>
                </div>
              </div>

              {lot.reviews.length > 0 ? (
                <ul className="mt-2.5 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                  {lot.reviews.map((review) => {
                    const stars = clampReviewRating(review.rating);
                    return (
                      <li
                        key={review.id}
                        className="bg-[#F4F5F6] rounded-[16px] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              aria-hidden="true"
                              className="w-7 h-7 rounded-full bg-white text-[#141517] text-[11px] font-bold flex items-center justify-center border border-black/[0.06] shrink-0"
                            >
                              {review.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#141517] truncate">
                                {review.author}
                              </p>
                              <p className="text-[11px] text-[#767B84] leading-tight">
                                {review.dateLabel}
                              </p>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-0.5 shrink-0"
                            aria-label={`${stars} out of 5 stars`}
                          >
                            {Array.from({ length: 5 }, (_, idx) => (
                              <Star
                                key={idx}
                                aria-hidden="true"
                                className={`w-3.5 h-3.5 ${
                                  idx < stars
                                    ? 'fill-[#F59E0B] text-[#F59E0B]'
                                    : 'text-[#D1D5DB]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="mt-2 text-[12.5px] leading-[1.55] text-[#525760]">
                          {review.comment}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-[#767B84]">
                  No driver reviews yet for this location.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 px-5 pt-3 pb-5 bg-gradient-to-t from-white via-white to-white/0">
        <button
          type="button"
          onClick={onSelectSpace}
          className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] text-[#141517] text-[15px] font-semibold transition-all shadow-[0_8px_24px_rgba(197,236,69,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          Select Space
        </button>
      </div>
    </section>
  );
};
