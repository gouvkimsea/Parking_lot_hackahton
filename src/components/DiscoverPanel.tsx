import React, { useState } from 'react';
import {
  Bike,
  Bus,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  X,
  Zap,
} from 'lucide-react';
import { USER_AVATAR_URL } from '../data/parkingLots';
import type { ParkingLot, VehicleCategory } from '../types/parking';
import { countAvailableSpaces, formatCurrency } from '../utils/parkingLogic';

interface DiscoverPanelProps {
  lots: ParkingLot[];
  selectedLotId: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeCategory: VehicleCategory | 'all';
  onCategoryChange: (category: VehicleCategory | 'all') => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  activeBookedBayKeys: Set<string>;
  onSelectLot: (lotId: string, openDetailsOnMobile?: boolean) => void;
  onOpenProfile: () => void;
  footerContent?: React.ReactNode;
}

const CATEGORY_OPTIONS: Array<{
  id: VehicleCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'bike', label: 'Bike', icon: Bike },
  { id: 'bus', label: 'Bus', icon: Bus },
  { id: 'ev', label: 'EV', icon: Zap },
];

export const DiscoverPanel: React.FC<DiscoverPanelProps> = ({
  lots,
  selectedLotId,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  showAll,
  onToggleShowAll,
  activeBookedBayKeys,
  onSelectLot,
  onOpenProfile,
  footerContent,
}) => {
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const visibleLots = showAll ? lots : lots.slice(0, 2);

  const cycleCardImage = (lot: ParkingLot, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndices((prev) => {
      const current = prev[lot.id] ?? 0;
      const next = (current + delta + lot.images.length) % lot.images.length;
      return { ...prev, [lot.id]: next };
    });
  };

  const setCardImage = (lotId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndices((prev) => ({ ...prev, [lotId]: index }));
  };

  return (
    <section
      aria-label="Find Nearby Parking"
      className="flex flex-col bg-white md:rounded-[32px] md:shadow-[0_14px_40px_rgba(20,21,23,0.06)] md:border md:border-black/[0.04] overflow-hidden min-h-full md:min-h-0"
    >
      {/* Top Row: User Avatar + Search Location Pill */}
      <div className="px-4 md:px-7 pt-4 md:pt-5 pb-2.5 md:pb-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open profile and settings"
          className="relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-[#F4F5F6] hover:ring-[#C5EC45] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          <img
            src={USER_AVATAR_URL}
            alt="Sarah Lin profile"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </button>

        <div className="relative flex-1">
          <Search
            className="w-[17px] h-[17px] text-[#767B84] absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="parking-search-input" className="sr-only">
            Search Location
          </label>
          <input
            id="parking-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Location"
            className="w-full h-10 md:h-11 pl-10 md:pl-11 pr-9 rounded-full bg-[#F4F5F6] text-[13.5px] md:text-[14px] text-[#141517] placeholder:text-[#8E939B] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#767B84] hover:text-[#141517] hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Heading */}
      <div className="px-4 md:px-7 pb-3 md:pb-4 text-center shrink-0">
        <h1 className="text-[21px] sm:text-[23px] md:text-[26px] font-bold tracking-[-0.02em] text-[#141517]">
          Find Nearby Parking
        </h1>
      </div>

      {/* Soft Grey Sheet Container matching reference */}
      <div className="flex-1 bg-[#F6F7F8] rounded-t-[26px] md:rounded-t-[32px] px-4 md:px-7 pt-4 md:pt-5 pb-24 md:pb-7 flex flex-col gap-4 md:gap-5">
        {/* Parking Categories */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[15px] md:text-[16px] font-semibold text-[#141517]">
              Parking Categories
            </h2>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onCategoryChange('all')}
                className="text-xs md:text-[13px] font-medium text-[#6B7280] hover:text-[#141517] transition-colors whitespace-nowrap shrink-0"
              >
                All Types
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Vehicle category filter"
            className="grid grid-cols-4 md:inline-grid md:grid-cols-4 gap-1.5 sm:gap-2.5 pb-0.5"
          >
            {CATEGORY_OPTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onCategoryChange(isActive ? 'all' : id)}
                  className={`flex items-center justify-center gap-1.5 md:gap-2 pl-1 pr-2 md:pl-1.5 md:pr-4 py-1 rounded-full text-[12.5px] md:text-[13.5px] font-medium transition-all whitespace-nowrap min-h-[40px] md:min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                    isActive
                      ? 'bg-[#C5EC45] text-[#141517] font-semibold shadow-[0_4px_12px_rgba(197,236,69,0.35)]'
                      : 'bg-white text-[#525760] hover:text-[#141517] shadow-[0_2px_8px_rgba(20,21,23,0.03)]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? 'bg-white text-[#141517]' : 'bg-[#F4F5F6] text-[#141517]'
                    }`}
                  >
                    <Icon className="w-[15px] h-[15px] md:w-4 md:h-4" aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parking Nearby Header */}
        <div className="flex flex-col gap-3.5 md:gap-4 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] md:text-[16px] font-semibold text-[#141517]">
              Parking Nearby
              <span className="ml-1.5 text-xs md:text-[13px] font-normal text-[#767B84] tabular-nums">
                ({lots.length})
              </span>
            </h2>
            {lots.length > 2 && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="text-[13px] md:text-[13.5px] font-medium text-[#525760] hover:text-[#141517] transition-colors whitespace-nowrap shrink-0 py-1 px-1"
              >
                {showAll ? 'Show Less' : 'Show All'}
              </button>
            )}
          </div>

          {/* Empty State */}
          {lots.length === 0 ? (
            <div className="bg-white rounded-[24px] p-7 text-center flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_rgba(20,21,23,0.04)]">
              <div className="w-12 h-12 rounded-full bg-[#F4F5F6] flex items-center justify-center text-[#767B84]">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#141517]">
                  No parking found
                </p>
                <p className="text-[13px] text-[#767B84] mt-1">
                  Try another street name or switch vehicle category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onCategoryChange('all');
                }}
                className="mt-1 px-5 py-2.5 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[13px] font-semibold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-5 ${
                showAll && visibleLots.length > 2 ? 'lg:grid-cols-3' : ''
              }`}
            >
              {visibleLots.map((lot) => {
                const isSelected = lot.id === selectedLotId;
                const currentImgIndex = imageIndices[lot.id] ?? 0;
                const currentImgSrc = lot.images[currentImgIndex] ?? lot.images[0];
                const availableCount = countAvailableSpaces(lot, activeBookedBayKeys);
                const imgKey = `${lot.id}-${currentImgIndex}`;

                return (
                  <article
                    key={lot.id}
                    className={`bg-white rounded-[22px] md:rounded-[24px] p-3 md:p-3.5 flex flex-col justify-between transition-all duration-200 ${
                      isSelected
                        ? 'shadow-[0_8px_26px_rgba(20,21,23,0.06)] ring-2 ring-[#C5EC45]'
                        : 'shadow-[0_4px_18px_rgba(20,21,23,0.04)] hover:shadow-[0_8px_24px_rgba(20,21,23,0.07)]'
                    }`}
                  >
                    <div>
                      {/* Card Image with Open Hours Pill & Carousel Indicators */}
                      <div className="relative rounded-[16px] md:rounded-[18px] overflow-hidden h-[156px] sm:h-[172px] md:h-[188px] w-full bg-[#E8ECE6] group">
                        {failedImages[imgKey] ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#ECEFE8] to-[#DCE2D6] text-[#525760] gap-1.5">
                            <Car className="w-7 h-7" />
                            <span className="text-xs font-medium">{lot.name}</span>
                          </div>
                        ) : (
                          <img
                            src={currentImgSrc}
                            alt={`${lot.name} interior view ${currentImgIndex + 1}`}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [imgKey]: true }))
                            }
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        )}

                        {/* Subtle bottom gradient for carousel dot legibility */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/50 to-transparent" />

                        {/* Floating Open Hours Badge (direct reference match) */}
                        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-[#141517] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-[#141517] shrink-0" aria-hidden="true" />
                          <span className="whitespace-nowrap">{lot.openHours}</span>
                        </div>

                        {/* Image Carousel Controls */}
                        {lot.images.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => cycleCardImage(lot, -1, e)}
                              aria-label={`Previous photo of ${lot.name}`}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#141517] flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-sm"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => cycleCardImage(lot, 1, e)}
                              aria-label={`Next photo of ${lot.name}`}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#141517] flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-sm"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Bottom-center Carousel Dots (elongated lime active pill) */}
                            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                              {lot.images.map((_, idx) => {
                                const activeDot = idx === currentImgIndex;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => setCardImage(lot.id, idx, e)}
                                    aria-label={`View photo ${idx + 1} of ${lot.name}`}
                                    className={`h-1.5 rounded-full transition-all ${
                                      activeDot
                                        ? 'w-6 bg-[#C5EC45]'
                                        : 'w-1.5 bg-white/75 hover:bg-white'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Title, Description & Price */}
                      <div className="mt-3 px-0.5 flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <h3 className="text-[16px] md:text-[17px] font-bold text-[#141517] truncate">
                            {lot.name}
                          </h3>
                          <p className="text-[12.5px] text-[#767B84] leading-[1.4] mt-0.5 line-clamp-1">
                            {lot.tagline}
                          </p>
                          <p className="text-[11.5px] text-[#525760] mt-1 tabular-nums">
                            {availableCount} spaces open · {lot.distanceKm.toFixed(1)} km
                          </p>
                        </div>
                        <div className="text-right shrink-0 pt-0.5">
                          <span className="text-[20px] md:text-[22px] font-extrabold tracking-[-0.02em] text-[#141517] tabular-nums">
                            {formatCurrency(lot.pricePerHour)}
                          </span>
                          <span className="text-[11.5px] font-medium text-[#767B84]">/hr</span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Lime CTA */}
                    <button
                      type="button"
                      onClick={() => onSelectLot(lot.id, true)}
                      aria-label={`View Details for ${lot.name}`}
                      className="mt-3.5 w-full h-10 md:h-11 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] text-[#141517] text-[13.5px] md:text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] focus-visible:ring-offset-2"
                    >
                      View Details
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {footerContent}
      </div>
    </section>
  );
};
