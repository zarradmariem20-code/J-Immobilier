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
  phone?: string;
  provider: "email" | "google" | "facebook" | "phone";
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
  region?: string;
  city?: string;
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
  videoUrl?: string;
  coverImage?: string;
  gallery?: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  features?: string[];
  tags?: string[];
  // Supabase row ID after approval-publish
  supabaseId?: number;
  status: ListingStatus;
  featured: boolean;
  createdAt: string;
  reviewedAt?: string;
}

export interface FavoriteHistoryItem {
  propertyId: number;
  savedAt: string;
}

import { supabase } from "../../lib/supabase";

const FAVORITES_KEY = "journal-immobilier-favorites";
const INQUIRIES_KEY = "journal-immobilier-inquiries";
const AUTH_KEY = "journal-immobilier-authenticated";
const AUTH_PROFILE_KEY = "journal-immobilier-auth-profile";
const ADMIN_SESSION_KEY = "journal-immobilier-admin-session";
const LISTINGS_SUBMISSIONS_KEY = "journal-immobilier-listings-submissions";
const LANGUAGE_KEY = "journal-immobilier-language";

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
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    if (parsed.length === 0) {
      return [];
    }

    if (typeof parsed[0] === "number") {
      return parsed as number[];
    }

    return (parsed as FavoriteHistoryItem[])
      .map((item) => Number(item?.propertyId))
      .filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

export function getFavoriteHistory(): FavoriteHistoryItem[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    if (typeof parsed[0] === "number") {
      return (parsed as number[]).map((propertyId) => ({
        propertyId,
        savedAt: new Date(0).toISOString(),
      }));
    }

    return (parsed as FavoriteHistoryItem[])
      .filter((item) => Number.isFinite(item?.propertyId) && typeof item?.savedAt === "string")
      .sort((left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime());
  } catch {
    return [];
  }
}

export function toggleFavoriteId(propertyId: number): number[] {
  const current = getFavoriteHistory();
  const exists = current.some((item) => item.propertyId === propertyId);
  const next: FavoriteHistoryItem[] = exists
    ? current.filter((item) => item.propertyId !== propertyId)
    : [{ propertyId, savedAt: new Date().toISOString() }, ...current.filter((item) => item.propertyId !== propertyId)];

  if (isBrowser()) {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  return next.map((item) => item.propertyId);
}

export function isUserLoggedIn(): boolean {
  if (!isBrowser()) {
    return false;
  }

  if (window.localStorage.getItem(AUTH_KEY) !== "true") {
    return false;
  }

  // OAuth providers may occasionally return no email, so keep the session valid
  // as long as we still have a profile with a provider and a display name.
  const profile = getAuthProfile();
  return Boolean(profile && profile.provider && (profile.email || profile.name));
}

export async function hasActiveAuthSession(): Promise<boolean> {
  if (!isBrowser()) {
    return false;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    const hasUser = !error && Boolean(user);

    if (!hasUser) {
      clearAuthSession();
    }

    return hasUser;
  } catch {
    clearAuthSession();
    return false;
  }
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

export function getSavedInquiries(): SavedInquiry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(INQUIRIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPreferredLanguage(): "fr" | "en" {
  if (!isBrowser()) {
    return "fr";
  }

  const language = window.localStorage.getItem(LANGUAGE_KEY);
  return language === "en" ? "en" : "fr";
}

export function setPreferredLanguage(language: "fr" | "en") {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(LANGUAGE_KEY, language);
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

export function updateListingSubmissionStatus(
  id: string,
  status: ListingStatus,
  supabaseId?: number,
) {
  const current = getListingSubmissionsInternal();
  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          reviewedAt: new Date().toISOString(),
          ...(supabaseId !== undefined ? { supabaseId } : {}),
        }
      : item,
  );

  saveListingSubmissionsInternal(next);
}

export function updateListingSubmission(
  id: string,
  updates: Partial<Omit<ListingSubmission, "id" | "publicId" | "createdAt">>,
) {
  const current = getListingSubmissionsInternal();
  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          ...updates,
          reviewedAt: updates.reviewedAt ?? new Date().toISOString(),
        }
      : item,
  );

  saveListingSubmissionsInternal(next);
}

export function syncListingSubmissionsFromDatabase(rows: Array<any>): ListingSubmission[] {
  const current = getListingSubmissionsInternal();
  const rowsById = new Map(
    rows
      .map((row) => [Number(row?.id), row] as const)
      .filter(([id]) => Number.isFinite(id)),
  );

  let hasChanges = false;
  const next = current.map((item) => {
    if (typeof item.supabaseId !== "number") {
      return item;
    }

    const row = rowsById.get(item.supabaseId);
    if (!row) {
      return item;
    }

    const syncedStatus: ListingStatus = row.status === "pending"
      ? "pending"
      : row.status === "archived"
        ? "rejected"
        : "approved";
    const syncedFeatured = row.status === "archived" ? false : Boolean(row.featured);

    const nextItem: ListingSubmission = {
      ...item,
      status: syncedStatus,
      featured: syncedFeatured,
      reviewedAt: row.updated_at ?? row.created_at ?? item.reviewedAt,
    };

    if (nextItem.status !== item.status || nextItem.featured !== item.featured || nextItem.reviewedAt !== item.reviewedAt) {
      hasChanges = true;
    }

    return nextItem;
  });

  if (hasChanges) {
    saveListingSubmissionsInternal(next);
  }

  return next.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
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