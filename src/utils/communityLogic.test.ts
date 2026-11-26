import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOTYPE_DEMO_PASSWORDS,
  SEED_COMMUNITY_REPORTS,
  SEED_COMMUNITY_REVIEWS,
  SEED_COMMUNITY_SUBMISSIONS,
  SEED_COMMUNITY_USERS,
} from '../data/communitySeedData';
import {
  canUserEditSubmission,
  communitySubmissionToParkingLot,
  computeLotRatingSummary,
  countUserContributions,
  enrichLotWithCommunityActivity,
  upsertUserReview,
  validateLoginInput,
  validateRegistrationInput,
  validateReviewInput,
  validateSubmissionInput,
} from './communityLogic';
import {
  authenticatePrototypeUser,
  registerPrototypeUser,
} from '../services/communityStore';
import { PARKING_LOTS } from '../data/parkingLots';

test('Community auth validation, registration, and login work accurately', () => {
  const badReg = validateRegistrationInput({
    name: 'A',
    email: 'not-an-email',
    password: '123',
    confirmPassword: '456',
  });
  assert.equal(badReg.valid, false);
  assert.ok(badReg.errors.name);
  assert.ok(badReg.errors.email);
  assert.ok(badReg.errors.password);
  assert.ok(badReg.errors.confirmPassword);

  const dupReg = registerPrototypeUser(
    SEED_COMMUNITY_USERS,
    'Duplicate User',
    'sokha@parkeasy.kh',
    'secret123'
  );
  assert.ok(dupReg.error);

  const newReg = registerPrototypeUser(
    SEED_COMMUNITY_USERS,
    'Chenda Vong',
    'chenda@example.com',
    'parkeasy99'
  );
  assert.ok(newReg.user);
  assert.equal(newReg.user.role, 'user');
  assert.ok(newReg.users);

  const loginOk = authenticatePrototypeUser(
    newReg.users!,
    'chenda@example.com',
    'parkeasy99'
  );
  assert.equal(loginOk.user?.id, newReg.user!.id);

  const adminOk = authenticatePrototypeUser(
    SEED_COMMUNITY_USERS,
    'admin@parkeasy.kh',
    PROTOTYPE_DEMO_PASSWORDS.admin
  );
  assert.equal(adminOk.user?.role, 'admin');

  const badLogin = validateLoginInput({ email: 'bad', password: '' });
  assert.equal(badLogin.valid, false);
});

test('Submission validation enforces Phnom Penh coordinates and structured pricing', () => {
  const invalid = validateSubmissionInput({
    name: 'Ok',
    district: 'All Phnom Penh',
    address: '123',
    openHours: '',
    feeMode: 'paid',
    hourlyCarKhr: 'abc',
    hourlyMotoKhr: '',
    dailyKhr: '',
    monthlyCarKhr: '',
    capacitySpaces: '',
    vehicleTypes: [],
    position: { lat: 13.0, lng: 103.0 },
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.district);
  assert.ok(invalid.errors.address);
  assert.ok(invalid.errors.position);
  assert.ok(invalid.errors.vehicleTypes);

  const validPaid = validateSubmissionInput({
    name: 'Street 63 Shade Lot',
    district: 'BKK1',
    address: 'No. 24 Street 63, BKK1, Phnom Penh',
    openHours: '6:00 AM – 10:00 PM',
    feeMode: 'paid',
    hourlyCarKhr: '2000',
    hourlyMotoKhr: '1000',
    dailyKhr: '10000',
    monthlyCarKhr: '',
    capacitySpaces: '30',
    vehicleTypes: ['car', 'motorcycle'],
    position: { lat: 11.552, lng: 104.925 },
  });
  assert.equal(validPaid.valid, true);
  assert.equal(validPaid.parsed.hourlyCarKhr, 2000);
  assert.equal(validPaid.parsed.capacitySpaces, 30);
});

test('Single-review-per-user upsert prevents duplicates and aggregates ratings cleanly', () => {
  const lotId = 'aeon-mall-1';
  const initialCount = SEED_COMMUNITY_REVIEWS.filter((r) => r.lotId === lotId).length;
  assert.equal(initialCount, 2);

  // Sokha updates their existing review for aeon-mall-1 rather than inserting a duplicate
  const afterUpdate = upsertUserReview(SEED_COMMUNITY_REVIEWS, {
    lotId,
    lotName: 'AEON Mall Phnom Penh (AEON 1)',
    userId: 'user-sokha',
    userName: 'Sokha Meas',
    rating: 3,
    comment: 'Updated weekend review: slightly busier near north ramp.',
    feeFeedback: 'accurate',
    availabilityNote: 'crowded',
    securityRating: 5,
    cleanlinessRating: 4,
    photos: [],
  });
  const sokhaReviewsForAeon = afterUpdate.filter(
    (r) => r.lotId === lotId && r.userId === 'user-sokha'
  );
  assert.equal(sokhaReviewsForAeon.length, 1);
  assert.equal(sokhaReviewsForAeon[0].rating, 3);
  assert.ok(sokhaReviewsForAeon[0].updatedAt);

  const summary = computeLotRatingSummary(afterUpdate, lotId);
  assert.equal(summary.reviewCount, 2);
  assert.equal(summary.averageRating, 3.5);

  const checkReview = validateReviewInput({ rating: 5, comment: 'short' });
  assert.equal(checkReview.valid, false);
});

test('Community submission conversion, edit permissions, and activity enrichment work cleanly', () => {
  const approvedSub = SEED_COMMUNITY_SUBMISSIONS.find(
    (s) => s.status === 'approved'
  )!;
  const pendingSub = SEED_COMMUNITY_SUBMISSIONS.find(
    (s) => s.status === 'pending'
  )!;
  const regularUser = SEED_COMMUNITY_USERS.find((u) => u.id === 'user-sokha')!;
  const otherUser = SEED_COMMUNITY_USERS.find((u) => u.id === 'user-dara')!;
  const adminUser = SEED_COMMUNITY_USERS.find((u) => u.role === 'admin')!;

  assert.equal(canUserEditSubmission(regularUser, pendingSub), true);
  assert.equal(canUserEditSubmission(otherUser, pendingSub), false);
  assert.equal(canUserEditSubmission(regularUser, approvedSub), false);
  assert.equal(canUserEditSubmission(adminUser, approvedSub), true);

  const converted = communitySubmissionToParkingLot(
    approvedSub,
    SEED_COMMUNITY_REVIEWS
  );
  assert.equal(converted.dataSource, 'community');
  assert.equal(converted.rating, 5);
  assert.equal(converted.reviewCount, 1);

  const enrichedBase = enrichLotWithCommunityActivity(
    PARKING_LOTS[0],
    SEED_COMMUNITY_REVIEWS,
    SEED_COMMUNITY_SUBMISSIONS
  );
  assert.equal(enrichedBase.rating, 4.5);
  assert.equal(enrichedBase.reviewCount, 2);

  const contrib = countUserContributions(
    regularUser.id,
    SEED_COMMUNITY_SUBMISSIONS,
    SEED_COMMUNITY_REVIEWS,
    SEED_COMMUNITY_REPORTS
  );
  assert.ok(contrib.total >= 4);
});
