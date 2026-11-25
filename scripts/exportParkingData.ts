import fs from 'node:fs';
import path from 'node:path';
import { PARKING_LOTS } from '../src/data/parkingLots';
import type { PhnomPenhParkingRecord } from '../src/types/parking';
import {
  FACILITY_TYPE_LABELS,
  recordsToCsv,
  toPhnomPenhDatabaseRecord,
} from '../src/utils/parkingLogic';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data');
const DOCS_DIR = path.join(ROOT, 'docs');

fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

const allRecords: PhnomPenhParkingRecord[] = PARKING_LOTS.map(toPhnomPenhDatabaseRecord);
const evRecords: PhnomPenhParkingRecord[] = allRecords.filter((r) => r.ev_charging_available);

// 1. Export Importable JSON & CSV (Deliverable F)
fs.writeFileSync(
  path.join(PUBLIC_DATA_DIR, 'phnom_penh_parking_database.json'),
  JSON.stringify(allRecords, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.join(PUBLIC_DATA_DIR, 'phnom_penh_parking_database.csv'),
  recordsToCsv(allRecords),
  'utf8'
);

fs.writeFileSync(
  path.join(PUBLIC_DATA_DIR, 'phnom_penh_ev_stations.json'),
  JSON.stringify(evRecords, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.join(PUBLIC_DATA_DIR, 'phnom_penh_ev_stations.csv'),
  recordsToCsv(evRecords),
  'utf8'
);

// 2. Build Deliverables A-E Research Report
const byDistrict = new Map<string, number>();
const byCategory = new Map<string, number>();
const byPriceConfidence = new Map<string, number>();

for (const lot of PARKING_LOTS) {
  byDistrict.set(lot.district, (byDistrict.get(lot.district) ?? 0) + 1);
  byCategory.set(lot.facilityType, (byCategory.get(lot.facilityType) ?? 0) + 1);
  byPriceConfidence.set(lot.priceConfidence, (byPriceConfidence.get(lot.priceConfidence) ?? 0) + 1);
}

const verifiedPriceLots = allRecords.filter(
  (r) => r.price_confidence === 'high' || r.price_confidence === 'medium'
);
const unknownPriceLots = allRecords.filter((r) => r.price_confidence === 'unknown');
const lowConfidenceLots = allRecords.filter((r) => r.price_confidence === 'low');
const approximateLocationLots = allRecords.filter(
  (r) => r.location_confidence !== 'high'
);

const lines: string[] = [
  '# Phnom Penh Smart Parking & EV Charging Deep Research Database',
  '',
  `**Last Verified:** 2026-11-25`,
  `**Total Discovered Facilities:** ${allRecords.length} (${allRecords.filter((r) => r.parking_category !== 'ev_station').length} parking facilities + ${allRecords.filter((r) => r.parking_category === 'ev_station').length} dedicated EV charging stations)`,
  `**Total EV-Capable Locations:** ${evRecords.length}`,
  '',
  '---',
  '',
  '## Coverage Summary',
  '',
  '### By District / Khan',
  '| District / Khan | Facilities |',
  '|---|---:|',
  ...[...byDistrict.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([d, c]) => `| ${d} | ${c} |`),
  '',
  '### By Parking Category',
  '| Category | Facilities |',
  '|---|---:|',
  ...[...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, c]) => `| ${FACILITY_TYPE_LABELS[k as keyof typeof FACILITY_TYPE_LABELS] ?? k} (\`${k}\`) | ${c} |`),
  '',
  '---',
  '',
  '## Deliverable A: Complete Phnom Penh Parking Directory',
  '',
  '| ID | Name | Category | District | Sangkat / Commune | Operator | Operating Hours | Lat, Lng |',
  '|---|---|---|---|---|---|---|---|',
  ...allRecords.map(
    (r) =>
      `| \`${r.parking_id}\` | ${r.parking_name} | ${FACILITY_TYPE_LABELS[r.parking_category]} | ${r.district} | ${r.commune ?? 'Unknown'} | ${r.operator_name ?? 'Unknown'} | ${r.operating_hours} | ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)} |`
  ),
  '',
  '---',
  '',
  '## Deliverable B: Parking Price Comparison (KHR / USD)',
  '',
  '> **Pricing Integrity Note:** Prices marked `Unknown` or `null` were not publicly verifiable from operators or recent fee boards. No rates were fabricated.',
  '',
  '| Facility | District | Moto Rate | Car Hourly / Entry | Monthly | Free Conditions | Confidence |',
  '|---|---|---|---|---|---|---|',
  ...allRecords
    .filter((r) => r.parking_category !== 'ev_station')
    .map(
      (r) =>
        `| ${r.parking_name} | ${r.district} | ${r.motorcycle_hourly_fee ?? 'Unknown'} | ${r.car_hourly_fee ?? 'Unknown'} | ${r.monthly_fee ?? 'Unknown'} | ${r.free_parking_conditions ?? '—'} | ${r.price_confidence} |`
    ),
  '',
  '---',
  '',
  '## Deliverable C: Interactive Map Coordinates',
  '',
  'All coordinates are integrated into `src/data/parkingLots.ts` and exported in `public/data/phnom_penh_parking_database.json` and `public/data/phnom_penh_parking_database.csv`.',
  '',
  '---',
  '',
  '## Deliverable D: EV Charging Directory (Separate Connected Database)',
  '',
  '> **EAC Regulated Tariffs:** Electricity Authority of Cambodia (EAC) caps public AC slow charging at **1,050 KHR/kWh (~$0.26/kWh)** and DC fast charging at **1,350 KHR/kWh (~$0.34/kWh)**, though private commercial hubs also list app tariffs around $0.32–$0.48/kWh.',
  '',
  '| Station | Provider | District | Connectors | Speed | EV Price / kWh | Parking Fee Separate? | Hours | Lat, Lng |',
  '|---|---|---|---|---|---|---|---|---|',
  ...evRecords.map((r) => {
    const lot = PARKING_LOTS.find((l) => l.id === r.parking_id);
    const sep = lot?.evCharging?.parkingFeeSeparateNote ?? r.free_parking_conditions ?? 'Verify on site';
    return `| ${r.parking_name} | ${r.ev_charging_provider ?? 'Unknown'} | ${r.district} | ${r.ev_connector_types ?? 'Unknown'} | ${r.ev_charging_speed ?? 'Unknown'} | ${r.ev_price_per_kwh ?? 'Unknown (see app)'} | ${sep} | ${r.operating_hours} | ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)} |`;
  }),
  '',
  '---',
  '',
  '## Deliverable E: Data Quality & Audit Report',
  '',
  `- **High/Medium Price Confidence:** ${verifiedPriceLots.length} facilities`,
  `- **Low Price Confidence (Estimates / Potentially Outdated):** ${lowConfidenceLots.length} facilities`,
  `- **Unknown Price (Requires On-Site Fee Board Verification):** ${unknownPriceLots.length} facilities`,
  `- **Non-High Location Confidence (District/Street Centroid Approximations):** ${approximateLocationLots.length} facilities`,
  '- **Duplicate Prevention:** EV charging hubs co-located inside multi-use garages (e.g., `chargeplus-exchange-square`, `tan-ev-aeon-1`) are linked via `parentParkingId` in the EV database rather than duplicating parking lot records.',
  '',
  '### Facilities Flagged for Manual / On-Site Verification',
  '',
  '| ID | Name | Reason |',
  '|---|---|---|',
  ...allRecords
    .filter((r) => r.price_confidence === 'unknown' || r.price_confidence === 'low' || r.location_confidence !== 'high')
    .map((r) => {
      const reasons: string[] = [];
      if (r.price_confidence === 'unknown') reasons.push('Public tariff not published online');
      if (r.price_confidence === 'low') reasons.push('Estimate or older review (verify current fee board)');
      if (r.location_confidence !== 'high') reasons.push('Approximate neighborhood/street entrance coordinate');
      return `| \`${r.parking_id}\` | ${r.parking_name} | ${reasons.join('; ')} |`;
    }),
  '',
];

fs.writeFileSync(
  path.join(DOCS_DIR, 'PHNOM_PENH_PARKING_RESEARCH.md'),
  lines.join('\n'),
  'utf8'
);

console.log(
  `Exported ${allRecords.length} total records (${evRecords.length} EV-capable) to public/data/ and docs/PHNOM_PENH_PARKING_RESEARCH.md`
);
