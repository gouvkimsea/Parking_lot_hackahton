import {
  SEED_COMMUNITY_REPORTS,
  SEED_COMMUNITY_REVIEWS,
  SEED_COMMUNITY_SUBMISSIONS,
  SEED_COMMUNITY_USERS,
} from '../data/communitySeedData';
import type {
  CommunityFeedbackReport,
  CommunityParkingSubmission,
  CommunityReview,
  CommunityUser,
} from '../types/parking';
import { hashPrototypePassword } from '../utils/communityLogic';

/**
 * Simulated frontend prototype storage layer (localStorage + realistic seed data).
 * Separated cleanly from UI components so real REST/DB endpoints can replace these methods later.
 */
const KEYS = {
  users: 'parkeasy_proto_users_v1',
  sessionUserId: 'parkeasy_proto_session_uid_v1',
  submissions: 'parkeasy_proto_submissions_v1',
  reviews: 'parkeasy_proto_reviews_v1',
  reports: 'parkeasy_proto_reports_v1',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors in prototype storage
  }
}

export function loadCommunityUsers(): CommunityUser[] {
  const stored = readJson<CommunityUser[] | null>(KEYS.users, null);
  if (!stored || stored.length === 0) {
    writeJson(KEYS.users, SEED_COMMUNITY_USERS);
    return SEED_COMMUNITY_USERS;
  }
  return stored;
}

export function saveCommunityUsers(users: CommunityUser[]): void {
  writeJson(KEYS.users, users);
}

export function loadCurrentSessionUserId(): string | null {
  try {
    return window.localStorage.getItem(KEYS.sessionUserId);
  } catch {
    return null;
  }
}

export function saveCurrentSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      window.localStorage.setItem(KEYS.sessionUserId, userId);
    } else {
      window.localStorage.removeItem(KEYS.sessionUserId);
    }
  } catch {
    // ignore
  }
}

export function loadCommunitySubmissions(): CommunityParkingSubmission[] {
  const stored = readJson<CommunityParkingSubmission[] | null>(KEYS.submissions, null);
  if (!stored) {
    writeJson(KEYS.submissions, SEED_COMMUNITY_SUBMISSIONS);
    return SEED_COMMUNITY_SUBMISSIONS;
  }
  return stored;
}

export function saveCommunitySubmissions(items: CommunityParkingSubmission[]): void {
  writeJson(KEYS.submissions, items);
}

export function loadCommunityReviews(): CommunityReview[] {
  const stored = readJson<CommunityReview[] | null>(KEYS.reviews, null);
  if (!stored) {
    writeJson(KEYS.reviews, SEED_COMMUNITY_REVIEWS);
    return SEED_COMMUNITY_REVIEWS;
  }
  return stored;
}

export function saveCommunityReviews(items: CommunityReview[]): void {
  writeJson(KEYS.reviews, items);
}

export function loadCommunityReports(): CommunityFeedbackReport[] {
  const stored = readJson<CommunityFeedbackReport[] | null>(KEYS.reports, null);
  if (!stored) {
    writeJson(KEYS.reports, SEED_COMMUNITY_REPORTS);
    return SEED_COMMUNITY_REPORTS;
  }
  return stored;
}

export function saveCommunityReports(items: CommunityFeedbackReport[]): void {
  writeJson(KEYS.reports, items);
}

export function authenticatePrototypeUser(
  users: CommunityUser[],
  email: string,
  password: string
): { user?: CommunityUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!found || found.passwordHash !== hashPrototypePassword(password)) {
    return { error: 'Invalid email or password.' };
  }
  return { user: found };
}

export function registerPrototypeUser(
  users: CommunityUser[],
  name: string,
  email: string,
  password: string
): { user?: CommunityUser; users?: CommunityUser[]; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { error: 'An account with this email already exists.' };
  }
  const newUser: CommunityUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    passwordHash: hashPrototypePassword(password),
    role: 'user',
    joinedAt: new Date().toISOString(),
  };
  return { user: newUser, users: [newUser, ...users] };
}
