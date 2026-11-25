import React, { useState } from 'react';
import {
  Clock,
  Heart,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react';
import type { ParkingLot, VehicleCategory } from '../types/parking';
import { countAvailableSpaces, formatCurrency } from '../utils/parkingLogic';

interface MapExplorerViewProps {
  lots: ParkingLot[];
  allLots: ParkingLot[];
  selectedLotId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: VehicleCategory | 'all';
  onCategoryChange: (cat: VehicleCategory | 'all') => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (lotId: string) => void;
  activeBookedBayKeys: Set<string>;
  onSelectLot: (lotId: string) => void;
  onOpenDetails: (lotId: string) => void;
  onOpenSelectSpace: (lotId: string) => void;
}

const MAP_CATEGORIES: Array<{ id: VehicleCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'car', label: 'Car' },
  { id: 'bike', label: 'Bike' },
  { id: 'bus', label: 'Bus' },
  { id: 'ev', label: 'EV' },
];

export const MapExplorerView: React.FC<MapExplorerViewProps> = ({
  lots,
  allLots,
  selectedLotId,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  favoriteIds,
  onToggleFavorite,
  activeBookedBayKeys,
  onSelectLot,
  onOpenDetails,
  onOpenSelectSpace,
}) => {
  const [centeredNotice, setCenteredNotice] = useState(false);

  const activeLot =
    lots.find((l) => l.id === selectedLotId) ?? lots[0] ?? allLots[0];

  const activeAvailable = countAvailableSpaces(activeLot, activeBookedBayKeys);

  return (
    <section
      aria-label="Interactive Parking Map"
      className="max-w-[1380px] mx-auto w-full px-0 sm:px-5 lg:px-8 pb-24 lg:pb-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left/Main Interactive Vector City Map */}
        <div className="lg:col-span-8 bg-white sm:rounded-[32px] shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] overflow-hidden flex flex-col">
          {/* Map Top Search & Category Filter */}
          <div className="p-4 sm:p-5 border-b border-[#F0F1F3] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-[#767B84] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="map-search-input" className="sr-only">
                Search map location
              </label>
              <input
                id="map-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search downtown street or garage"
                className="w-full h-11 pl-10 pr-9 rounded-full bg-[#F4F5F6] text-[14px] text-[#141517] placeholder:text-[#8E939B] focus:outline-none focus:ring-2 focus:ring-[#C5EC45] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear map search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#767B84] hover:text-[#141517]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {MAP_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onCategoryChange(cat.id)}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-all min-h-[40px] ${
                      isActive
                        ? 'bg-[#C5EC45] text-[#141517] font-semibold'
                        : 'bg-[#F4F5F6] text-[#6B7280] hover:text-[#141517]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive City Street Canvas */}
          <div className="relative h-[430px] sm:h-[520px] bg-[#EEF2EB] overflow-hidden select-none">
            {/* Clean Minimalist City Map SVG Background */}
            <svg
              viewBox="0 0 800 520"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              {/* City Blocks */}
              <rect width="800" height="520" fill="#F2F4EF" />
              <rect x="40" y="34" width="150" height="110" rx="16" fill="#E6EBE2" />
              <rect x="220" y="34" width="170" height="110" rx="16" fill="#EAECE7" />
              <rect x="420" y="34" width="160" height="110" rx="16" fill="#E2EBD7" />
              <rect x="610" y="34" width="150" height="110" rx="16" fill="#EAECE7" />

              <rect x="40" y="176" width="150" height="130" rx="16" fill="#EAECE7" />
              <rect x="220" y="176" width="170" height="130" rx="16" fill="#E2EBD7" />
              <rect x="420" y="176" width="160" height="130" rx="16" fill="#EAECE7" />
              <rect x="610" y="176" width="150" height="130" rx="16" fill="#E6EBE2" />

              <rect x="40" y="338" width="150" height="142" rx="16" fill="#E2EBD7" />
              <rect x="220" y="338" width="170" height="142" rx="16" fill="#EAECE7" />
              <rect x="420" y="338" width="160" height="142" rx="16" fill="#E6EBE2" />
              <rect x="610" y="338" width="150" height="142" rx="16" fill="#EAECE7" />

              {/* Major Avenues */}
              <path d="M 0 160 L 800 160" stroke="#FFFFFF" strokeWidth="18" />
              <path d="M 0 322 L 800 322" stroke="#FFFFFF" strokeWidth="16" />
              <path d="M 205 0 L 205 520" stroke="#FFFFFF" strokeWidth="16" />
              <path d="M 405 0 L 405 520" stroke="#FFFFFF" strokeWidth="20" />
              <path d="M 595 0 L 595 520" stroke="#FFFFFF" strokeWidth="14" />

              {/* Center Dashed Line on Central Avenue */}
              <path
                d="M 405 12 L 405 508"
                stroke="#D5DBD0"
                strokeWidth="2"
                strokeDasharray="8 8"
              />

              {/* District & Street Labels */}
              <text x="415" y="154" fill="#8C9388" fontSize="11" fontWeight="600">
                CENTRAL AVENUE
              </text>
              <text x="58" y="317" fill="#8C9388" fontSize="11" fontWeight="600">
                MARKET STREET
              </text>
              <text x="616" y="154" fill="#8C9388" fontSize="11" fontWeight="600">
                PARKVIEW BLVD
              </text>
              <text x="250" y="246" fill="#6F8259" fontSize="12" fontWeight="600">
                Civic Park
              </text>
              <text x="456" y="92" fill="#6F8259" fontSize="12" fontWeight="600">
                Central Gardens
              </text>
            </svg>

            {/* User Location Marker */}
            <div
              style={{ left: '43%', top: '53%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            >
              <div className="w-10 h-10 rounded-full bg-[#141517]/10 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[#141517] border-[3px] border-white shadow-md" />
              </div>
            </div>

            {/* Interactive Parking Price Pins */}
            {lots.map((lot) => {
              const isSelected = lot.id === activeLot.id;
              const openCount = countAvailableSpaces(lot, activeBookedBayKeys);
              return (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => onSelectLot(lot.id)}
                  style={{
                    left: `${lot.coordinates.x}%`,
                    top: `${lot.coordinates.y}%`,
                  }}
                  aria-label={`${lot.name}, ${formatCurrency(lot.pricePerHour)} per hour, ${openCount} spaces open`}
                  aria-pressed={isSelected}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-3.5 py-2 rounded-full text-[13px] font-bold tabular-nums transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                    isSelected
                      ? 'z-20 bg-[#C5EC45] text-[#141517] scale-110 shadow-[0_10px_26px_rgba(20,21,23,0.22)] ring-2 ring-[#141517]'
                      : 'z-10 bg-white text-[#141517] hover:bg-[#141517] hover:text-white shadow-[0_6px_18px_rgba(20,21,23,0.14)]'
                  }`}
                >
                  <span>${lot.pricePerHour}</span>
                  <span className="text-[10px] font-medium opacity-75">/hr</span>
                </button>
              );
            })}

            {/* Recenter Action Button */}
            <button
              type="button"
              onClick={() => {
                onSelectLot('prestige-parking');
                setCenteredNotice(true);
                window.setTimeout(() => setCenteredNotice(false), 2000);
              }}
              aria-label="Center map on Downtown District"
              className="absolute bottom-4 right-4 h-11 px-4 rounded-full bg-white/95 hover:bg-white text-[#141517] text-[13px] font-semibold shadow-md flex items-center gap-2 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span>{centeredNotice ? 'Centered' : 'Recenter'}</span>
            </button>
          </div>
        </div>

        {/* Right Selected Lot Summary Panel */}
        <div className="lg:col-span-4 bg-white sm:rounded-[32px] shadow-[0_14px_40px_rgba(20,21,23,0.06)] border border-black/[0.04] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#141517]">
                Selected Location
              </h2>
              <span className="text-[12px] text-[#767B84] tabular-nums">
                {lots.length} nearby
              </span>
            </div>

            <div className="relative rounded-[20px] overflow-hidden aspect-[16/10] bg-[#E8ECE6]">
              <img
                src={activeLot.images[0]}
                alt={activeLot.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 text-[#141517] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{activeLot.openHours}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(activeLot.id)}
                aria-label={
                  favoriteIds.has(activeLot.id)
                    ? `Remove ${activeLot.name} from favorites`
                    : `Save ${activeLot.name} to favorites`
                }
                className="absolute top-2.5 right-2.5 w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-sm"
              >
                <Heart
                  className={`w-[18px] h-[18px] ${
                    favoriteIds.has(activeLot.id)
                      ? 'fill-[#EF4444] text-[#EF4444]'
                      : 'text-[#141517]'
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[19px] font-bold text-[#141517]">
                  {activeLot.name}
                </h3>
                <p className="text-[19px] font-extrabold text-[#141517] tabular-nums shrink-0">
                  {formatCurrency(activeLot.pricePerHour)}
                  <span className="text-[11px] font-medium text-[#767B84]">/hr</span>
                </p>
              </div>
              <p className="mt-1 text-[13px] text-[#767B84] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0 text-[#525760]" />
                <span>{activeLot.address}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F4F5F6] rounded-[16px] py-3.5 px-3 text-center">
                <p className="text-[13px] font-bold text-[#141517]">Availability</p>
                <p className="text-[12.5px] text-[#767B84] mt-0.5 tabular-nums">
                  {activeAvailable} Space available
                </p>
              </div>
              <div className="bg-[#F4F5F6] rounded-[16px] py-3.5 px-3 text-center">
                <p className="text-[13px] font-bold text-[#141517]">Distance</p>
                <p className="text-[12.5px] text-[#767B84] mt-0.5 tabular-nums">
                  {activeLot.distanceKm.toFixed(1)} km away
                </p>
              </div>
            </div>

            <p className="text-[13px] leading-[1.6] text-[#6B7280]">
              {activeLot.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onOpenSelectSpace(activeLot.id)}
              className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] text-[#141517] text-[14px] font-semibold transition-colors"
            >
              Select Space
            </button>
            <button
              type="button"
              onClick={() => onOpenDetails(activeLot.id)}
              className="w-full h-11 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] text-[14px] font-semibold transition-colors"
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
