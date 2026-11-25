import test from 'node:test';
import assert from 'node:assert/strict';
import { PARKING_LOTS } from '../data/parkingLots';
import {
  calculateBookingSummary,
  calculateDailyRate,
  calculateDistanceKm,
  clampReviewRating,
  countAvailableSpaces,
  countFloorAvailableSpaces,
  filterParkingLots,
  findFirstAvailableBay,
  findNearestParkingLot,
  formatBookingCode,
  formatReviewCountLabel,
  getActiveBookedBayKeys,
  getTopNearestDailyRates,
  isBayOccupied,
  validateBookingInput,
  validateVehicleInput,
} from './parkingLogic';
import type { BookingRecord } from '../types/parking';

test('Prestige Parking initial availability matches 12 open spaces across floors', () => {
  const prestige = PARKING_LOTS.find((l) => l.id === 'prestige-parking')!;
  assert.ok(prestige, 'Prestige Parking must exist in seed data');

  const emptyBooked = new Set<string>();
  assert.equal(countFloorAvailableSpaces(prestige, 'ground', emptyBooked), 5);
  assert.equal(countFloorAvailableSpaces(prestige, 'first', emptyBooked), 4);
  assert.equal(countFloorAvailableSpaces(prestige, 'second', emptyBooked), 3);
  assert.equal(countAvailableSpaces(prestige, emptyBooked), 12);
});

test('Active bookings decrement available space count and mark bay occupied', () => {
  const prestige = PARKING_LOTS[0];
  const booking: BookingRecord = {
    id: 'bk-1',
    code: 'PK-G03-1024',
    lotId: prestige.id,
    lotName: prestige.name,
    lotAddress: prestige.address,
    floor: 'ground',
    floorLabel: 'Ground Floor',
    bayId: 'ground-G-03',
    bayLabel: 'G-03',
    vehicleCategory: 'car',
    licensePlate: 'CA-8KLP24',
    date: '2026-11-25',
    startTime: '10:00',
    durationHours: 2,
    hourlyRate: 20,
    serviceFee: 2,
    totalPrice: 42,
    status: 'active',
    createdAt: '2026-11-25T09:00:00Z',
  };

  const keys = getActiveBookedBayKeys([booking]);
  const g03 = prestige.floors.ground.find((b) => b.label === 'G-03')!;
  assert.equal(isBayOccupied(prestige.id, g03, keys), true);
  assert.equal(countAvailableSpaces(prestige, keys), 11);

  const cancelledKeys = getActiveBookedBayKeys([{ ...booking, status: 'cancelled' }]);
  assert.equal(isBayOccupied(prestige.id, g03, cancelledKeys), false);
  assert.equal(countAvailableSpaces(prestige, cancelledKeys), 12);
});

test('filterParkingLots filters by category and search query', () => {
  const busLots = filterParkingLots(PARKING_LOTS, { query: '', category: 'bus' });
  assert.equal(busLots.length, 2);
  assert.ok(busLots.every((l) => l.categories.includes('bus')));

  const centralSearch = filterParkingLots(PARKING_LOTS, { query: 'central', category: 'car' });
  assert.equal(centralSearch.length, 2);
  assert.equal(centralSearch[0].id, 'prestige-parking');

  const noMatch = filterParkingLots(PARKING_LOTS, { query: 'nonexistent-xyz', category: 'all' });
  assert.equal(noMatch.length, 0);
});

test('findFirstAvailableBay prefers G-03 when open and falls back otherwise', () => {
  const prestige = PARKING_LOTS[0];
  const defaultBay = findFirstAvailableBay(prestige, 'ground', new Set(), 'G-03');
  assert.equal(defaultBay?.label, 'G-03');

  const booked = new Set([`${prestige.id}::ground-G-03`]);
  const fallbackBay = findFirstAvailableBay(prestige, 'ground', booked, 'G-03');
  assert.equal(fallbackBay?.label, 'G-02');
});

test('calculateBookingSummary calculates subtotal, minimum service fee, and total accurately', () => {
  const shortStay = calculateBookingSummary(10, 1);
  assert.deepEqual(shortStay, { subtotal: 10, serviceFee: 1.5, totalPrice: 11.5 });

  const prestigeStay = calculateBookingSummary(20, 3);
  assert.deepEqual(prestigeStay, { subtotal: 60, serviceFee: 3, totalPrice: 63 });
});

test('validateBookingInput catches missing plate, bad characters, and missing bay', () => {
  const invalid = validateBookingInput({
    bayId: null,
    licensePlate: '',
    date: '',
    startTime: '',
    durationHours: 0,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.bayId);
  assert.ok(invalid.errors.licensePlate);
  assert.ok(invalid.errors.date);
  assert.ok(invalid.errors.startTime);
  assert.ok(invalid.errors.durationHours);

  const valid = validateBookingInput({
    bayId: 'ground-G-03',
    licensePlate: 'ABC-4821',
    date: '2026-11-25',
    startTime: '14:00',
    durationHours: 3,
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('validateVehicleInput validates vehicle name and license plate', () => {
  const bad = validateVehicleInput({ label: 'A', plate: '!' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.label);
  assert.ok(bad.errors.plate);

  const good = validateVehicleInput({ label: 'Tesla Model 3', plate: 'EV-9910' });
  assert.equal(good.valid, true);
});

test('formatBookingCode produces readable bay-prefixed confirmation code', () => {
  assert.equal(formatBookingCode('G-03', 421), 'PK-G03-1421');
});

test('calculateDistanceKm computes accurate Haversine distance', () => {
  const origin = { lat: 37.7897, lng: -122.4014 };
  assert.equal(calculateDistanceKm(origin, origin), 0);

  // Distance between Prestige Parking and Central Plaza Garage (~0.83 km)
  const central = { lat: 37.7852, lng: -122.4089 };
  const dist = calculateDistanceKm(origin, central);
  assert.ok(dist > 0.7 && dist < 1.0, `Expected ~0.83 km, got ${dist}`);
});

test('findNearestParkingLot identifies closest garage to user coordinates', () => {
  const nearMetroEv = { lat: 37.792, lng: -122.395 };
  const nearest = findNearestParkingLot(PARKING_LOTS, nearMetroEv);
  assert.ok(nearest);
  assert.equal(nearest.lot.id, 'metro-green-ev');
  assert.ok(nearest.distanceKm < 0.2);

  assert.equal(findNearestParkingLot([], nearMetroEv), null);
});

test('clampReviewRating and formatReviewCountLabel normalize review display values', () => {
  assert.equal(clampReviewRating(4.6), 5);
  assert.equal(clampReviewRating(0), 1);
  assert.equal(clampReviewRating(7), 5);
  assert.equal(formatReviewCountLabel(1), '1 review');
  assert.equal(formatReviewCountLabel(418), '418 reviews');
  assert.equal(formatReviewCountLabel(0), '0 reviews');
});

test('every parking lot provides non-empty read-only mock reviews with valid ratings', () => {
  for (const lot of PARKING_LOTS) {
    assert.ok(lot.reviews.length >= 2, `${lot.id} should include mock reviews`);
    for (const review of lot.reviews) {
      assert.ok(review.author.trim().length > 0);
      assert.ok(review.comment.trim().length > 0);
      assert.ok(review.rating >= 1 && review.rating <= 5);
    }
  }
});

test('calculateDailyRate computes daily rate accurately for standard and full-day stays', () => {
  assert.equal(calculateDailyRate(20, 8), 160);
  assert.equal(calculateDailyRate(16, 12), 192);
  assert.equal(calculateDailyRate(10, 24), 240);
  assert.equal(calculateDailyRate(-5, 8), 0);
});

test('getTopNearestDailyRates sorts nearest first and limits to top 5 lots', () => {
  const reversed = [...PARKING_LOTS].reverse();
  const top5 = getTopNearestDailyRates(reversed, new Set<string>(), 5, 8);
  assert.equal(top5.length, 5);
  assert.equal(top5[0].id, 'prestige-parking');
  assert.equal(top5[0].dailyRate, 160);
  assert.equal(top5[0].distanceKm, 0.4);
  assert.equal(top5[4].id, 'westside-bike-ride');
  assert.equal(top5[4].dailyRate, 80);

  for (let i = 1; i < top5.length; i++) {
    assert.ok(top5[i].distanceKm >= top5[i - 1].distanceKm);
  }

  const top3 = getTopNearestDailyRates(PARKING_LOTS, new Set<string>(), 3, 8);
  assert.equal(top3.length, 3);
});


