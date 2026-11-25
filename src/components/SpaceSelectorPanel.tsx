import React, { useState } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import type { FloorId, ParkingBay, ParkingLot } from '../types/parking';
import {
  FLOOR_LABELS,
  FLOOR_ORDER,
  countFloorAvailableSpaces,
  formatCurrency,
  getBayCompositeKey,
  isBayOccupied,
} from '../utils/parkingLogic';
import { TopDownCarSvg } from './TopDownCarSvg';

interface SpaceSelectorPanelProps {
  lot: ParkingLot;
  activeFloor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  selectedBayId: string | null;
  onSelectBay: (bay: ParkingBay) => void;
  activeBookedBayKeys: Set<string>;
  onBack: () => void;
  onBookNow: () => void;
  highlighted?: boolean;
  isDesktop?: boolean;
}

const SPINE_X = 170;
const BAY_WIDTH = 96;
const BAY_RISE = 40;
const ROW_PITCH = 66;
const TOP_OFFSET = 58;

export const SpaceSelectorPanel: React.FC<SpaceSelectorPanelProps> = ({
  lot,
  activeFloor,
  onFloorChange,
  selectedBayId,
  onSelectBay,
  activeBookedBayKeys,
  onBack,
  onBookNow,
  highlighted = false,
  isDesktop = false,
}) => {
  const [occupiedNotice, setOccupiedNotice] = useState<string | null>(null);
  const floorBays = lot.floors[activeFloor];
  const selectedBay = floorBays.find((b) => b.id === selectedBayId) ?? null;

  const handleBayClick = (bay: ParkingBay, occupied: boolean) => {
    if (occupied) {
      setOccupiedNotice(`Space ${bay.label} is currently occupied.`);
      return;
    }
    setOccupiedNotice(null);
    onSelectBay(bay);
  };

  return (
    <section
      aria-label="Select Space"
      className={`flex flex-col bg-white lg:rounded-[32px] lg:shadow-[0_14px_40px_rgba(20,21,23,0.06)] lg:border overflow-hidden min-h-full lg:h-full transition-shadow duration-300 ${
        highlighted
          ? 'lg:border-[#C5EC45] lg:ring-2 lg:ring-[#C5EC45]/70'
          : 'lg:border-black/[0.04]'
      }`}
    >
      {/* Top Bar: Circular Lime Back Button + Centered Title */}
      <div className="px-5 pt-5 pb-3.5 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={isDesktop ? 'Focus parking details' : 'Back to parking details'}
          className="w-11 h-11 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-95 text-[#141517] flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
        </button>

        <h2 className="text-[18px] font-bold tracking-[-0.01em] text-[#141517] truncate">
          Select Space
        </h2>

        <div className="w-11 h-11 shrink-0" aria-hidden="true" />
      </div>

      {/* Floor Tabs (Ground Floor / 1st Floor / 2nd Floor) */}
      <div
        role="tablist"
        aria-label="Parking floor selection"
        className="px-5 pb-2 flex items-center gap-2.5 overflow-x-auto no-scrollbar"
      >
        {FLOOR_ORDER.map((floorId) => {
          const isActive = activeFloor === floorId;
          const openOnFloor = countFloorAvailableSpaces(lot, floorId, activeBookedBayKeys);
          return (
            <button
              key={floorId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setOccupiedNotice(null);
                onFloorChange(floorId);
              }}
              className={`px-4 py-2.5 rounded-full text-[13px] transition-all whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                isActive
                  ? 'bg-[#C5EC45] text-[#141517] font-semibold shadow-[0_4px_12px_rgba(197,236,69,0.3)]'
                  : 'bg-[#F4F5F6] text-[#767B84] hover:text-[#141517] font-medium'
              }`}
            >
              {FLOOR_LABELS[floorId]}
              <span className="sr-only"> ({openOnFloor} open)</span>
            </button>
          );
        })}
      </div>

      {/* Angled Herringbone Parking Map (Exact Visual Match to Screen 3) */}
      <div className="flex-1 min-h-0 px-4 pt-1 pb-28 lg:pb-5 flex flex-col justify-between">
        <div className="w-full max-w-[350px] mx-auto flex-1 min-h-0 flex items-center justify-center">
          <svg
            viewBox="0 0 340 404"
            className="w-full h-full max-h-[450px] select-none"
            role="group"
            aria-label={`${lot.name} ${FLOOR_LABELS[activeFloor]} parking bay map`}
          >
            {/* Central Spine Divider */}
            <line
              x1={SPINE_X}
              y1={18}
              x2={SPINE_X}
              y2={348}
              stroke="#E6E8EC"
              strokeWidth="1.5"
            />

            {/* Left Driving Lane: Car moving down + downward arrow */}
            <g aria-hidden="true">
              <TopDownCarSvg cx={34} cy={232} angle={90} scale={0.78} />
              <line
                x1={34}
                y1={270}
                x2={34}
                y2={326}
                stroke="#141517"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M 28.5 320 L 34 327.5 L 39.5 320"
                fill="none"
                stroke="#141517"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Right Driving Lane: upward arrow + car moving up */}
            <g aria-hidden="true">
              <line
                x1={306}
                y1={142}
                x2={306}
                y2={86}
                stroke="#141517"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M 300.5 92 L 306 84.5 L 311.5 92"
                fill="none"
                stroke="#141517"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <TopDownCarSvg cx={306} cy={176} angle={-90} scale={0.78} />
            </g>

            {/* Parking Bays (5 rows x 2 sides = 10 angled bays) */}
            {floorBays.map((bay) => {
              const occupied = isBayOccupied(lot.id, bay, activeBookedBayKeys);
              const isUserReserved = activeBookedBayKeys.has(
                getBayCompositeKey(lot.id, bay.id)
              );
              const isSelected = !occupied && selectedBayId === bay.id;
              const row = bay.rowIndex;

              let points: string;
              let centerX: number;
              let centerY: number;
              let labelAngle: number;
              let carAngle: number;

              if (bay.side === 'left') {
                const y0 = TOP_OFFSET + row * ROW_PITCH;
                const xL = SPINE_X - BAY_WIDTH;
                const xR = SPINE_X;
                points = `${xL},${y0} ${xR},${y0 - BAY_RISE} ${xR},${y0 - BAY_RISE + ROW_PITCH} ${xL},${y0 + ROW_PITCH}`;
                centerX = (xL + xR) / 2;
                centerY = y0 + (ROW_PITCH - BAY_RISE) / 2;
                labelAngle = -22.6;
                carAngle = -22.6;
              } else {
                const y0 = TOP_OFFSET - BAY_RISE + row * ROW_PITCH;
                const xL = SPINE_X;
                const xR = SPINE_X + BAY_WIDTH;
                points = `${xL},${y0} ${xR},${y0 + BAY_RISE} ${xR},${y0 + BAY_RISE + ROW_PITCH} ${xL},${y0 + ROW_PITCH}`;
                centerX = (xL + xR) / 2;
                centerY = y0 + (ROW_PITCH + BAY_RISE) / 2;
                labelAngle = 22.6;
                carAngle = 202.6;
              }

              const bayStatusText = isUserReserved
                ? 'Reserved by you'
                : occupied
                  ? 'Occupied'
                  : isSelected
                    ? 'Selected'
                    : 'Available';

              return (
                <g
                  key={bay.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Space ${bay.label}, ${FLOOR_LABELS[activeFloor]}, ${bayStatusText}${bay.evReady ? ', EV charger' : ''}`}
                  aria-pressed={isSelected}
                  aria-disabled={occupied}
                  onClick={() => handleBayClick(bay, occupied)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleBayClick(bay, occupied);
                    }
                  }}
                  className={
                    occupied
                      ? 'cursor-not-allowed outline-none'
                      : 'cursor-pointer group outline-none'
                  }
                >
                  {/* Base Bay Polygon */}
                  <polygon
                    points={points}
                    fill={isSelected ? '#F3FCE0' : '#FFFFFF'}
                    stroke={isSelected ? '#C5EC45' : '#E6E8EC'}
                    strokeWidth={isSelected ? 2.8 : 1.4}
                    strokeLinejoin="round"
                    className={
                      !occupied && !isSelected
                        ? 'transition-colors duration-150 group-hover:fill-[#FAFDF1] group-hover:stroke-[#C5EC45] group-focus-visible:fill-[#F3FCE0] group-focus-visible:stroke-[#141517]'
                        : 'transition-colors duration-150'
                    }
                  />

                  {occupied ? (
                    <TopDownCarSvg
                      cx={centerX}
                      cy={centerY}
                      angle={carAngle}
                      scale={0.95}
                      isUserReserved={isUserReserved}
                    />
                  ) : (
                    <g transform={`translate(${centerX}, ${centerY}) rotate(${labelAngle})`}>
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-[#141517] font-bold select-none"
                        style={{
                          fontSize: '20px',
                          fontFamily: 'var(--font-sans)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {bay.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Clean Status & Legend Row */}
        <div className="mt-2 px-1 space-y-2.5">
          {occupiedNotice ? (
            <p
              role="status"
              className="text-center text-[12px] font-medium text-[#B45309]"
            >
              {occupiedNotice} Pick any labeled white space.
            </p>
          ) : (
            <div className="flex items-center justify-between text-[12px] text-[#525760] px-1">
              <span className="font-medium text-[#141517] flex items-center gap-1.5">
                {selectedBay ? (
                  <>
                    Selected:{' '}
                    <strong className="font-bold">{selectedBay.label}</strong>
                    {selectedBay.evReady && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#5A760E]">
                        <Zap className="w-3 h-3" aria-hidden="true" />
                        EV
                      </span>
                    )}
                  </>
                ) : (
                  'No available bays on this floor'
                )}
              </span>
              <span className="tabular-nums text-[#767B84]">
                {FLOOR_LABELS[activeFloor]} · {formatCurrency(lot.pricePerHour)}/hr
              </span>
            </div>
          )}

          {/* Desktop Inline Book Now CTA */}
          <div className="hidden lg:block pt-1">
            <button
              type="button"
              onClick={onBookNow}
              disabled={!selectedBay}
              className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed text-[#141517] text-[15px] font-semibold transition-all shadow-[0_6px_18px_rgba(197,236,69,0.28)] disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] focus-visible:ring-offset-2"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-5 pt-3 pb-5 bg-gradient-to-t from-white via-white to-white/0">
        <button
          type="button"
          onClick={onBookNow}
          disabled={!selectedBay}
          className="w-full h-12 rounded-full bg-[#C5EC45] hover:bg-[#B6DE35] active:scale-[0.99] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed text-[#141517] text-[15px] font-semibold transition-all shadow-[0_8px_24px_rgba(197,236,69,0.38)] disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
        >
          Book Now
        </button>
      </div>
    </section>
  );
};
