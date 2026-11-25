import test from 'node:test';
import assert from 'node:assert/strict';
import { PARKING_LOTS, PHNOM_PENH_CENTER } from '../data/parkingLots';
import {
  calculateBookingSummary,
  calculateDailyRate,
  calculateDistanceKm,
  countAvailableSpaces,
  countFloorAvailableSpaces,
  filterParkingLots,
  filterPhnomPenhLots,
  findFirstAvailableBay,
  findNearestParkingLot,
  formatBookingCode,
  formatKhr,
  getActiveBookedBayKeys,
  getCompactPriceDisplay,
  getMarkerColorVariant,
  getTopNearestDailyRates,
  isBayOccupied,
  validateBookingInput,
  validatePriceReport,
  validateVehicleInput,
} from './parkingLogic';
import type { BookingRecord, ParkingLot } from '../types/parking';

test('Phnom Penh dataset covers required neighborhoods, categories, and realistic coordinates', () => {
  const requiredDistricts = [
    'BKK1',
    'BKK2',
    'Daun Penh',
    'Chamkar Mon',
    'Toul Kork',
    'Sen Sok',
    'Chroy Changvar',
    'Russey Keo',
    'Mean Chey',
    '7 Makara',
  ];

  const districts = new Set(PARKING_LOTS.map((l) => l.district));
  for (const d of requiredDistricts) {
    assert.ok(districts.has(d), `Missing required Phnom Penh district: ${d}`);
  }

  const facilityTypes = new Set(PARKING_LOTS.map((l) => l.facilityType));
  for (const t of ['mall', 'commercial', 'hotel', 'public', 'private', 'street', 'ev_station'] as const) {
    assert.ok(facilityTypes.has(t), `Missing facility type: ${t}`);
  }

  for (const lot of PARKING_LOTS) {
    assert.ok(
      lot.position.lat >= 11.45 && lot.position.lat <= 11.7,
      `Latitude out of Phnom Penh bounds for ${lot.id}: ${lot.position.lat}`
    );
    assert.ok(
      lot.position.lng >= 104.8 && lot.position.lng <= 105.0,
      `Longitude out of Phnom Penh bounds for ${lot.id}: ${lot.position.lng}`
    );
    // Ensure static curated records never fabricate ratings or live availability
    assert.equal(lot.rating, null, `${lot.id} should not fabricate ratings`);
    assert.equal(lot.availability.availableSpaces, null, `${lot.id} should not fabricate live bay counts`);
  }
});

test('getCompactPriceDisplay handles confirmed KHR, free parking, EV kWh, and unavailable prices honestly', () => {
  const aeon1 = PARKING_LOTS.find((l) => l.id === 'aeon-mall-1')!;
  const aeonDisplay = getCompactPriceDisplay(aeon1);
  assert.equal(aeonDisplay.primaryText, '2,000 KHR/hr');
  assert.equal(aeonDisplay.status, 'confirmed');

  const makro = PARKING_LOTS.find((l) => l.id === 'makro-sen-sok')!;
  assert.equal(getCompactPriceDisplay(makro).primaryText, 'Free parking');

  const pttEv = PARKING_LOTS.find((l) => l.id === 'ptt-ev-pluz-pp-thmey')!;
  assert.equal(getCompactPriceDisplay(pttEv).primaryText, '1,350 KHR/kWh');
  assert.equal(getCompactPriceDisplay(pttEv).status, 'confirmed');

  const eden = PARKING_LOTS.find((l) => l.id === 'eden-garden-ppcc')!;
  assert.equal(getCompactPriceDisplay(eden).primaryText, 'Price unavailable');
  assert.equal(getCompactPriceDisplay(eden).status, 'unavailable');
});

test('getMarkerColorVariant assigns Blue, Purple, Green, Orange, Red, and Cyan accurately', () => {
  const baseLot = PARKING_LOTS[0];

  const evLot = PARKING_LOTS.find((l) => l.facilityType === 'ev_station')!;
  assert.equal(getMarkerColorVariant(evLot), 'cyan');

  const mallUnknown: ParkingLot = {
    ...baseLot,
    facilityType: 'mall',
    availability: { status: 'unknown', source: 'unverified', availableSpaces: null },
  };
  assert.equal(getMarkerColorVariant(mallUnknown), 'purple');

  const generalUnknown: ParkingLot = {
    ...baseLot,
    facilityType: 'commercial',
    availability: { status: 'unknown', source: 'unverified', availableSpaces: null },
  };
  assert.equal(getMarkerColorVariant(generalUnknown), 'blue');

  const availableLot: ParkingLot = {
    ...baseLot,
    facilityType: 'public',
    availability: { status: 'available', source: 'live_api', availableSpaces: 12 },
  };
  assert.equal(getMarkerColorVariant(availableLot), 'green');

  const limitedLot: ParkingLot = {
    ...baseLot,
    facilityType: 'public',
    availability: { status: 'limited', source: 'live_api', availableSpaces: 2 },
  };
  assert.equal(getMarkerColorVariant(limitedLot), 'orange');

  const fullLot: ParkingLot = {
    ...baseLot,
    facilityType: 'public',
    availability: { status: 'full', source: 'live_api', availableSpaces: 0 },
  };
  assert.equal(getMarkerColorVariant(fullLot), 'red');
});

test('filterPhnomPenhLots filters by neighborhood, vehicle, price bracket, facility type, and EV speed', () => {
  const bkk1Lots = filterPhnomPenhLots(PARKING_LOTS, {
    query: '',
    district: 'BKK1',
    vehicleType: 'all',
    priceBracket: 'all',
    facilityType: 'all',
    availability: 'all',
    evFilter: 'all',
  });
  assert.ok(bkk1Lots.length >= 2);
  assert.ok(bkk1Lots.every((l) => l.district === 'BKK1'));

  const freeLots = filterPhnomPenhLots(PARKING_LOTS, {
    query: '',
    district: 'All Phnom Penh',
    vehicleType: 'all',
    priceBracket: 'free',
    facilityType: 'all',
    availability: 'all',
    evFilter: 'all',
  });
  assert.ok(freeLots.some((l) => l.id === 'makro-sen-sok'));
  assert.ok(freeLots.some((l) => l.id === 'aeon-mall-1'));

  const fastEv = filterPhnomPenhLots(PARKING_LOTS, {
    query: '',
    district: 'All Phnom Penh',
    vehicleType: 'ev',
    priceBracket: 'all',
    facilityType: 'ev_station',
    availability: 'all',
    evFilter: 'fast',
  });
  assert.ok(fastEv.length >= 3);
  assert.ok(fastEv.every((l) => l.evCharging?.speedTier === 'fast'));

  const bicycleLots = filterPhnomPenhLots(PARKING_LOTS, {
    query: '',
    district: 'All Phnom Penh',
    vehicleType: 'bicycle',
    priceBracket: 'all',
    facilityType: 'all',
    availability: 'all',
    evFilter: 'all',
  });
  assert.ok(bicycleLots.length >= 5);
  assert.ok(bicycleLots.every((l) => l.categories.includes('bicycle')));
});

test('calculateDistanceKm, findNearestParkingLot, and getTopNearestDailyRates work for Phnom Penh', () => {
  const aeon1 = PARKING_LOTS.find((l) => l.id === 'aeon-mall-1')!;
  const dist = calculateDistanceKm(PHNOM_PENH_CENTER, aeon1.position);
  assert.ok(dist > 1.5 && dist < 4.0, `Unexpected distance from center to AEON 1: ${dist}`);

  const nearest = findNearestParkingLot(PARKING_LOTS, aeon1.position);
  assert.equal(nearest?.lot.id, 'aeon-mall-1');
  assert.equal(nearest?.distanceKm, 0);

  assert.equal(calculateDailyRate(2000, 8), 16000);
  const top5 = getTopNearestDailyRates(PARKING_LOTS, new Set(), PHNOM_PENH_CENTER, 5, 8);
  assert.equal(top5.length, 5);
  assert.ok(top5[0].distanceKm <= top5[4].distanceKm);
  assert.ok(top5.every((item) => item.dailyRate === item.hourlyRate * 8));
});

test('Demo bay reservation logic and KHR booking summary remain consistent', () => {
  const aeon1 = PARKING_LOTS[0];
  const emptyBooked = new Set<string>();
  assert.equal(countFloorAvailableSpaces(aeon1, 'ground', emptyBooked), 5);
  assert.equal(countAvailableSpaces(aeon1, emptyBooked), 12);

  const booking: BookingRecord = {
    id: 'bk-1',
    code: 'PK-G03-1024',
    lotId: aeon1.id,
    lotName: aeon1.name,
    lotAddress: aeon1.address,
    floor: 'ground',
    floorLabel: 'Ground Floor',
    bayId: 'ground-G-03',
    bayLabel: 'G-03',
    vehicleCategory: 'car',
    licensePlate: 'PP-2AB-4821',
    date: '2026-11-25',
    startTime: '10:00',
    durationHours: 2,
    hourlyRate: 2000,
    serviceFee: 1000,
    totalPrice: 5000,
    status: 'active',
    createdAt: '2026-11-25T09:00:00Z',
  };

  const keys = getActiveBookedBayKeys([booking]);
  const g03 = aeon1.floors.ground.find((b) => b.label === 'G-03')!;
  assert.equal(isBayOccupied(aeon1.id, g03, keys), true);
  assert.equal(countAvailableSpaces(aeon1, keys), 11);

  assert.deepEqual(calculateBookingSummary(2000, 2), {
    subtotal: 4000,
    serviceFee: 1000,
    totalPrice: 5000,
  });

  assert.equal(formatKhr(10000), '10,000 KHR');
  assert.equal(formatBookingCode('G-03', 421), 'PK-G03-1421');

  const fallbackBay = findFirstAvailableBay(aeon1, 'ground', keys, 'G-03');
  assert.equal(fallbackBay?.label, 'G-02');
});

test('filterParkingLots, validateBookingInput, validateVehicleInput, and validatePriceReport work correctly', () => {
  const toulKork = filterParkingLots(PARKING_LOTS, { query: 'Toul Kork', category: 'all' });
  assert.ok(toulKork.length >= 2);

  const invalidBooking = validateBookingInput({
    bayId: null,
    licensePlate: '',
    date: '',
    startTime: '',
    durationHours: 0,
  });
  assert.equal(invalidBooking.valid, false);

  const validBooking = validateBookingInput({
    bayId: 'ground-G-03',
    licensePlate: 'PP-2AB-4821',
    date: '2026-11-25',
    startTime: '14:00',
    durationHours: 3,
  });
  assert.equal(validBooking.valid, true);

  assert.equal(validateVehicleInput({ label: 'A', plate: '!' }).valid, false);
  assert.equal(validateVehicleInput({ label: 'Toyota Prius', plate: 'PP-2AB-4821' }).valid, true);

  assert.equal(validatePriceReport({ reportedPriceKhr: '-100', notes: '' }).valid, false);
  const goodReport = validatePriceReport({ reportedPriceKhr: '2,000', notes: 'Gate board' });
  assert.equal(goodReport.valid, true);
  assert.equal(goodReport.parsedPrice, 2000);
});
