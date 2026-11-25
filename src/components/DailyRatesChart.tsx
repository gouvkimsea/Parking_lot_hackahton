import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PHNOM_PENH_CENTER } from '../data/parkingLots';
import type { ParkingLot } from '../types/parking';
import {
  DEFAULT_DAILY_STAY_HOURS,
  type DailyRateComparisonItem,
  formatCurrency,
  getTopNearestDailyRates,
} from '../utils/parkingLogic';

interface DailyRatesChartProps {
  lots: ParkingLot[];
  selectedLotId: string;
  activeBookedBayKeys: Set<string>;
  referencePosition?: { lat: number; lng: number } | null;
  onSelectLot: (lotId: string) => void;
  compact?: boolean;
}

const STAY_DURATIONS = [
  { hours: 4, label: '4h Half', compactLabel: '4h', ariaLabel: '4 hours half day' },
  { hours: 8, label: '8h Workday', compactLabel: '8h Day', ariaLabel: '8 hours workday' },
  { hours: 12, label: '12h Full Day', compactLabel: '12h', ariaLabel: '12 hours full day' },
  { hours: 24, label: '24h Stay', compactLabel: '24h', ariaLabel: '24 hours stay' },
] as const;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyRateComparisonItem }>;
  stayHours: number;
}

const CustomDailyRateTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  stayHours,
}) => {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="bg-[#141517] text-white rounded-2xl px-3.5 py-2.5 shadow-[0_12px_28px_rgba(20,21,23,0.28)] border border-white/10 text-[12px]">
      <p className="font-bold text-[13px] text-white">{item.name}</p>
      <p className="text-[#C5EC45] font-extrabold text-[15px] mt-0.5 tabular-nums">
        {formatCurrency(item.dailyRate)}{' '}
        <span className="text-[11px] font-medium text-white/75">
          / {stayHours}h day ({formatCurrency(item.hourlyRate)}/hr)
        </span>
      </p>
      <p className="text-white/75 mt-1 tabular-nums">
        {item.distanceKm.toFixed(1)} km from center
        {item.rating !== null ? ` · ${item.rating.toFixed(1)}★` : ''}
      </p>
    </div>
  );
};

export const DailyRatesChart: React.FC<DailyRatesChartProps> = ({
  lots,
  selectedLotId,
  activeBookedBayKeys,
  referencePosition,
  onSelectLot,
  compact = false,
}) => {
  const [stayHours, setStayHours] = useState<number>(DEFAULT_DAILY_STAY_HOURS);

  const chartData = useMemo(
    () =>
      getTopNearestDailyRates(
        lots,
        activeBookedBayKeys,
        referencePosition ?? PHNOM_PENH_CENTER,
        5,
        stayHours
      ),
    [lots, activeBookedBayKeys, referencePosition, stayHours]
  );

  const summaryStats = useMemo(() => {
    if (chartData.length === 0) return null;
    const lowest = chartData.reduce((best, cur) =>
      cur.dailyRate < best.dailyRate ? cur : best
    );
    const closest = chartData[0];
    return { lowest, closest };
  }, [chartData]);

  if (chartData.length === 0) return null;

  return (
    <section
      aria-label="Daily parking rate comparison"
      data-testid="daily-rates-chart-section"
      className={`bg-white border border-black/[0.04] ${
        compact
          ? 'rounded-[24px] p-4 shadow-[0_4px_18px_rgba(20,21,23,0.04)]'
          : 'rounded-[32px] p-6 shadow-[0_14px_40px_rgba(20,21,23,0.06)]'
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] lg:text-[18px] font-bold tracking-[-0.01em] text-[#141517]">
            Daily Rate Comparison
          </h2>
          {summaryStats && (
            <p className="mt-1 text-[12.5px] text-[#6B7280] tabular-nums">
              Top 5 nearest garages · Lowest:{' '}
              <span className="font-semibold text-[#141517]">
                {summaryStats.lowest.shortName} (
                {formatCurrency(summaryStats.lowest.dailyRate)})
              </span>
              <span className="mx-1.5 text-[#C4C9D0]" aria-hidden="true">
                ·
              </span>
              Closest:{' '}
              <span className="font-semibold text-[#141517]">
                {summaryStats.closest.shortName} (
                {summaryStats.closest.distanceKm.toFixed(1)} km)
              </span>
            </p>
          )}
        </div>

        {/* Interactive Stay Length Segmented Control */}
        <div
          role="group"
          aria-label="Daily stay duration"
          className={`grid grid-cols-4 sm:inline-flex items-center gap-1 p-1 bg-[#F4F5F6] rounded-full ${
            compact ? 'w-full' : 'self-start lg:self-auto'
          }`}
        >
          {STAY_DURATIONS.map((opt) => {
            const isActive = stayHours === opt.hours;
            return (
              <button
                key={opt.hours}
                type="button"
                aria-label={opt.ariaLabel}
                aria-pressed={isActive}
                onClick={() => setStayHours(opt.hours)}
                className={`px-2 sm:px-3.5 py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-semibold whitespace-nowrap text-center transition-all min-h-[44px] sm:min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                  isActive
                    ? 'bg-[#C5EC45] text-[#141517] shadow-sm'
                    : 'text-[#525760] hover:text-[#141517]'
                }`}
              >
                {compact ? opt.compactLabel : opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts BarChart: vertical bars on desktop, horizontal bars on compact mobile so labels never collide */}
      <div
        data-testid="daily-rates-recharts-wrapper"
        className={`w-full mt-4 ${compact ? 'h-[235px]' : 'h-[250px]'}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {compact ? (
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 6, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#ECEEF0"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                tick={{ fill: '#767B84', fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                axisLine={false}
                tickLine={false}
                width={96}
                tick={{ fill: '#141517', fontSize: 11.5, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(197, 236, 69, 0.14)' }}
                content={<CustomDailyRateTooltip stayHours={stayHours} />}
              />
              <Bar
                dataKey="dailyRate"
                name="Daily Rate"
                radius={[4, 10, 10, 4]}
                barSize={24}
                cursor="pointer"
                onClick={(entry) => {
                  const lotId = (entry as unknown as { id?: string })?.id;
                  if (lotId) onSelectLot(lotId);
                }}
              >
                {chartData.map((entry) => {
                  const isSelected = entry.id === selectedLotId;
                  const isLowest = summaryStats?.lowest.id === entry.id;
                  const fill = isSelected
                    ? '#C5EC45'
                    : isLowest
                      ? '#141517'
                      : '#D5DBD0';
                  return (
                    <Cell
                      key={entry.id}
                      fill={fill}
                      stroke={isSelected ? '#141517' : 'transparent'}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#ECEEF0"
              />
              <XAxis
                dataKey="shortName"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#525760', fontSize: 12, fontWeight: 600 }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                tick={{ fill: '#767B84', fontSize: 11.5 }}
                width={48}
              />
              <Tooltip
                cursor={{ fill: 'rgba(197, 236, 69, 0.14)' }}
                content={<CustomDailyRateTooltip stayHours={stayHours} />}
              />
              <Bar
                dataKey="dailyRate"
                name="Daily Rate"
                radius={[10, 10, 4, 4]}
                maxBarSize={56}
                cursor="pointer"
                onClick={(entry) => {
                  const lotId = (entry as unknown as { id?: string })?.id;
                  if (lotId) onSelectLot(lotId);
                }}
              >
                {chartData.map((entry) => {
                  const isSelected = entry.id === selectedLotId;
                  const isLowest = summaryStats?.lowest.id === entry.id;
                  const fill = isSelected
                    ? '#C5EC45'
                    : isLowest
                      ? '#141517'
                      : '#D5DBD0';
                  return (
                    <Cell
                      key={entry.id}
                      fill={fill}
                      stroke={isSelected ? '#141517' : 'transparent'}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Keyboard-Accessible Quick Select Legend Strip */}
      <div className="mt-3 pt-3 border-t border-[#F0F1F3] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {chartData.map((item) => {
          const isSelected = item.id === selectedLotId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectLot(item.id)}
              aria-pressed={isSelected}
              className={`min-h-[44px] text-left px-3 py-2 rounded-2xl transition-all flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517] ${
                isSelected
                  ? 'bg-[#C5EC45]/25 ring-1 ring-[#C5EC45]'
                  : 'bg-[#F6F7F8] hover:bg-[#ECEFE8]'
              }`}
            >
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#141517] truncate">
                  {item.shortName}
                </p>
                <p className="text-[11px] text-[#767B84] tabular-nums">
                  {item.distanceKm.toFixed(1)} km · {item.district}
                </p>
              </div>
              <span className="text-[13px] font-extrabold text-[#141517] tabular-nums shrink-0">
                {formatCurrency(item.dailyRate)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
