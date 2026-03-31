export interface SavedInquiry {
  id: string;
  propertyId?: number;
  propertyTitle?: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

export interface AuthProfile {
  name: string;
  email?: string;
  provider: "email" | "google" | "facebook";
}

export interface AdminSession {
  email: string;
  name: string;
  loggedAt: string;
}

export type ListingStatus = "pending" | "approved" | "rejected";

export interface ListingSubmission {
  id: string;
  publicId: number;
  title: string;
  price: number;
  transactionType: "Vente" | "Location";
  location: string;
  mapLocationQuery: string;
  nearbyCommodities: string[];
  propertyType: string;
  description: string;
  fullName: string;
  email: string;
  phone: string;
  photoCount: number;
  hasVideo: boolean;
  coverImage?: string;
  status: ListingStatus;
  featured: boolean;
  createdAt: string;
  reviewedAt?: string;
}

const FAVORITES_KEY = "journal-immobilier-favorites";
const INQUIRIES_KEY = "journal-immobilier-inquiries";
const AUTH_KEY = "journal-immobilier-authenticated";
const AUTH_PROFILE_KEY = "journal-immobilier-auth-profile";
const ADMIN_SESSION_KEY = "journal-immobilier-admin-session";
const LISTINGS_SUBMISSIONS_KEY = "journal-immobilier-listings-submissions";

function isBrowser() {
  return typeof window !== "undefined";
}

export function notifyAuthChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent("auth-state-changed"));
}

export function getFavoriteIds(): number[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteId(propertyId: number): number[] {
  const current = getFavoriteIds();
  const next = current.includes(propertyId)
    ? current.filter((id) => id !== propertyId)
    : [...current, propertyId];

  if (isBrowser()) {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  return next;
}

export function isUserLoggedIn(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return window.localStorage.getItem(AUTH_KEY) === "true";
}

export function getAuthProfile(): AuthProfile | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(profile: AuthProfile) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_KEY, "true");
  window.localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  notifyAuthChange();
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(AUTH_PROFILE_KEY);
  notifyAuthChange();
}

export function setUserLoggedIn(value: boolean) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_KEY, value ? "true" : "false");
  if (!value) {
    window.localStorage.removeItem(AUTH_PROFILE_KEY);
  }
  notifyAuthChange();
}

export function saveInquiry(inquiry: SavedInquiry) {
  if (!isBrowser()) {
    return;
  }

  try {
    const currentRaw = window.localStorage.getItem(INQUIRIES_KEY);
    const current: SavedInquiry[] = currentRaw ? JSON.parse(currentRaw) : [];
    current.unshift(inquiry);
    window.localStorage.setItem(INQUIRIES_KEY, JSON.stringify(current));
  } catch {
    window.localStorage.setItem(INQUIRIES_KEY, JSON.stringify([inquiry]));
  }
}

export function getAdminSession(): AdminSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(payload: Omit<AdminSession, "loggedAt">) {
  if (!isBrowser()) {
    return;
  }

  const session: AdminSession = {
    ...payload,
    loggedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

function notifyListingsChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent("listings-updated"));
}

function getListingSubmissionsInternal(): ListingSubmission[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LISTINGS_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveListingSubmissionsInternal(items: ListingSubmission[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(LISTINGS_SUBMISSIONS_KEY, JSON.stringify(items));
  notifyListingsChange();
}

export function getListingSubmissions(): ListingSubmission[] {
  return getListingSubmissionsInternal().sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function createListingSubmission(
  payload: Omit<ListingSubmission, "id" | "publicId" | "status" | "featured" | "createdAt" | "reviewedAt">,
) {
  const current = getListingSubmissionsInternal();
  const entry: ListingSubmission = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    publicId: Date.now(),
    status: "pending",
    featured: false,
    createdAt: new Date().toISOString(),
  };

  current.unshift(entry);
  saveListingSubmissionsInternal(current);
  return entry;
}

export function updateListingSubmissionStatus(id: string, status: ListingStatus) {
  const current = getListingSubmissionsInternal();
  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          reviewedAt: new Date().toISOString(),
        }
      : item,
  );

  saveListingSubmissionsInternal(next);
}

export function toggleListingFeatured(id: string) {
  const current = getListingSubmissionsInternal();
  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          featured: !item.featured,
        }
      : item,
  );

  saveListingSubmissionsInternal(next);
}

export function deleteListingSubmission(id: string) {
  const current = getListingSubmissionsInternal();
  const next = current.filter((item) => item.id !== id);
  saveListingSubmissionsInternal(next);
}