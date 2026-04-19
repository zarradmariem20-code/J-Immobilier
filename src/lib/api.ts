import { supabase } from "./supabase";

function resolveDefaultBackendBaseUrl() {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const hostname = window.location.hostname || "localhost";
    return `${protocol}//${hostname}:3001`;
  }

  return "http://localhost:3001";
}

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? resolveDefaultBackendBaseUrl()).replace(/\/$/, "");

const PROPERTY_COLUMNS = [
  "id",
  "title",
  "price",
  "transaction_type",
  "region",
  "city",
  "location",
  "map_location_query",
  "nearby_commodities",
  "bedrooms",
  "bathrooms",
  "area",
  "type",
  "image",
  "gallery",
  "video_url",
  "description",
  "features",
  "tags",
  "featured",
  "status",
  "created_at",
].join(",");

const LIST_CACHE_TTL_MS = 45_000;
const PROPERTY_CACHE_TTL_MS = 120_000;

const LIST_STORAGE_PREFIX = "ji:listings:";
const PROPERTY_STORAGE_PREFIX = "ji:property:";
const MEDIA_BUCKET = "listing-media";

const listCache = new Map<string, { at: number; data: any[] }>();
const listInFlight = new Map<string, Promise<any[]>>();
const propertyCache = new Map<number, { at: number; data: any }>();
const propertyInFlight = new Map<number, Promise<any>>();

const isFresh = (at: number, ttlMs: number) => Date.now() - at < ttlMs;

function filterActiveRows<T extends { status?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => !row?.status || row.status === "active");
}

function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);

    Promise.resolve(promiseLike)
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function readStorageCache<T>(key: string): { at: number; data: T } | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; data?: T };
    if (!parsed || typeof parsed.at !== "number" || parsed.data === undefined) return null;
    return { at: parsed.at, data: parsed.data };
  } catch {
    return null;
  }
}

function writeStorageCache<T>(key: string, value: { at: number; data: T }) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota and serialization errors.
  }
}

function removeStorageCache(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function clearListStorageCache() {
  if (!canUseStorage()) return;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(LIST_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors.
  }
}

function clearPropertyStorageCache() {
  if (!canUseStorage()) return;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PROPERTY_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors.
  }
}

function emitPropertiesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("properties-changed"));
}

// Expose list cache invalidation for external callers (e.g. Admin after approval)
export function clearListingsCache() {
  listCache.clear();
  listInFlight.clear();
  propertyCache.clear();
  propertyInFlight.clear();
  clearListStorageCache();
  clearPropertyStorageCache();
}

export function subscribeToPropertiesRealtime(onChange: () => void) {
  const handleChange = () => {
    clearListingsCache();
    onChange();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("properties-changed", handleChange);
  }

  const channel = supabase
    .channel(`properties-live-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, handleChange)
    .subscribe();

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("properties-changed", handleChange);
    }
    supabase.removeChannel(channel);
  };
}

function normalizeCreatedSubmissionRow(value: any) {
  const candidate = Array.isArray(value) ? value[0] ?? null : value;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const parsedId = typeof candidate.id === "number"
    ? candidate.id
    : typeof candidate.id === "string" && candidate.id.trim().length > 0 && Number.isFinite(Number(candidate.id))
      ? Number(candidate.id)
      : null;

  if (!parsedId) {
    return null;
  }

  return {
    ...candidate,
    id: parsedId,
  };
}

export interface ApprovalSubmissionPayload {
  id: string;
  title: string;
  price: number;
  transactionType: "Vente" | "Location";
  region?: string;
  city?: string;
  location: string;
  mapLocationQuery?: string;
  nearbyCommodities?: string[];
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  description?: string;
  coverImage?: string;
  gallery?: string[];
  videoUrl?: string;
  features?: string[];
  tags?: string[];
  featured?: boolean;
  supabaseId?: number;
}

export async function approveListingWithBackend(submission: ApprovalSubmissionPayload): Promise<number> {
  let response: Response;

  try {
    response = await withTimeout(
      fetch(`${BACKEND_BASE_URL}/api/admin/submissions/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submission }),
      }),
      20_000,
      "La synchronisation Supabase de l'annonce a expiré."
    );
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }

    throw new Error(`Backend indisponible sur ${BACKEND_BASE_URL}. Vérifiez que le serveur backend (port 3001) est démarré.`);
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || "Echec de publication via le backend.";
    throw new Error(message);
  }

  if (typeof payload?.id !== "number") {
    throw new Error("Publication backend invalide: id Supabase manquant.");
  }

  clearListingsCache();
  emitPropertiesChanged();
  return payload.id;
}

export async function inactivateListingWithBackend(supabaseId: number): Promise<number> {
  const response = await withTimeout(
    fetch(`${BACKEND_BASE_URL}/api/admin/submissions/inactivate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ supabaseId }),
    }),
    20_000,
    "La mise à jour Supabase de l'annonce a expiré."
  );

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || "Echec d'inactivation via le backend.";
    throw new Error(message);
  }

  if (typeof payload?.id !== "number") {
    throw new Error("Inactivation backend invalide: id manquant.");
  }

  return payload.id;
}

export async function deleteListingWithBackend(supabaseId: number): Promise<number> {
  const response = await withTimeout(
    fetch(`${BACKEND_BASE_URL}/api/admin/submissions/${supabaseId}`, {
      method: "DELETE",
    }),
    20_000,
    "La suppression Supabase de l'annonce a expiré."
  );

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || "Echec de suppression via le backend.";
    throw new Error(message);
  }

  if (typeof payload?.id !== "number") {
    throw new Error("Suppression backend invalide: id manquant.");
  }

  clearListingsCache();
  emitPropertiesChanged();
  return payload.id;
}

async function getPropertiesFromBackend(options?: {
  limit?: number;
  includeArchived?: boolean;
  region?: string;
  city?: string;
}): Promise<any[]> {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", String(options.limit));
  }
  if (options?.includeArchived) {
    params.set("includeArchived", "true");
  }
  if (options?.region) {
    params.set("region", options.region);
  }
  if (options?.city) {
    params.set("city", options.city);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await withTimeout(
    fetch(`${BACKEND_BASE_URL}/api/admin/properties${query}`),
    8000,
    "Le chargement des annonces via le backend a expiré."
  );

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Réponse backend invalide: JSON attendu.");
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Echec de chargement des annonces via le backend.");
  }

  if (!Array.isArray(payload?.data)) {
    throw new Error("Réponse backend invalide: données manquantes.");
  }

  return payload.data;
}

// Create an inquiry (contact request) for a property
export async function createInquiry(data: any) {
  const { data: result, error } = await supabase.from("inquiries").insert([data]).select();
  if (error) throw error;
  return result?.[0] || null;
}

// Create a report (flag) for a property
export async function createReport(data: any) {
  const { data: result, error } = await supabase.from("reports").insert([data]).select();
  if (error) throw error;
  return result?.[0] || null;
}

// ============ VISITS API ============

export async function getVisits(options?: {
  status?: string;
  propertyId?: number;
  limit?: number;
  offset?: number;
  window?: "today" | "7d" | "30d";
}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (options?.status) params.append("status", options.status);
    if (options?.propertyId) params.append("propertyId", String(options.propertyId));
    if (options?.limit) params.append("limit", String(options.limit));
    if (options?.offset) params.append("offset", String(options.offset));
    if (options?.window) params.append("window", options.window);

      const response = await fetch(`${BACKEND_BASE_URL}/api/admin/visits?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch visits");

    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch (error: any) {
    console.error("Error fetching visits:", error);
    return [];
  }
}

export async function getInquiries(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching inquiries:", error);
    return [];
  }
}

export async function createVisit(visitData: {
  inquiry_id?: number;
  property_id: number;
  property_title: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  requested_date?: string;
}): Promise<any> {
  try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/admin/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitData),
    });

    if (!response.ok) throw new Error("Failed to create visit");
    return await response.json();
  } catch (error: any) {
    console.error("Error creating visit:", error);
    throw error;
  }
}

export async function updateVisit(
  visitId: number,
  updates: {
    visit_status?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    notes?: string;
  }
): Promise<any> {
  try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/admin/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error("Failed to update visit");
    return await response.json();
  } catch (error: any) {
    console.error("Error updating visit:", error);
    throw error;
  }
}

export async function deleteVisit(visitId: number): Promise<void> {
  try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/admin/visits/${visitId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete visit");
  } catch (error: any) {
    console.error("Error deleting visit:", error);
    throw error;
  }
}

export async function getVisitsAnalytics(window?: "today" | "7d" | "30d"): Promise<{
  byProperty: any[];
  byStatus: any[];
  timeline: any[];
  metrics: {
    total_requests?: number;
    new_count?: number;
    scheduled_count?: number;
    completed_count?: number;
    rejected_count?: number;
    scheduling_rate?: number;
    completion_rate?: number;
    same_day_scheduling_rate?: number;
    avg_hours_to_schedule?: number;
  };
  window?: "today" | "7d" | "30d";
}> {
  try {
      const params = new URLSearchParams();
    if (window) params.append("window", window);

      const response = await fetch(`${BACKEND_BASE_URL}/api/admin/visits/analytics?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch analytics");

    const data = await response.json();
    return {
      byProperty: data.byProperty || [],
      byStatus: data.byStatus || [],
      timeline: data.timeline || [],
      metrics: data.metrics || {},
      window: data.window,
    };
  } catch (error: any) {
    console.error("Error fetching visits analytics:", error);
    return { byProperty: [], byStatus: [], timeline: [], metrics: {}, window };
  }
}

// ============ END VISITS API ============

// Fetch a single property by ID
export async function getProperty(id: number, options?: { forceRefresh?: boolean }) {
  const cached = propertyCache.get(id);
  if (!options?.forceRefresh && cached && isFresh(cached.at, PROPERTY_CACHE_TTL_MS)) {
    return cached.data;
  }

  const storageKey = `${PROPERTY_STORAGE_PREFIX}${id}`;
  const storageCached = readStorageCache<any>(storageKey);
  if (!options?.forceRefresh && storageCached && isFresh(storageCached.at, PROPERTY_CACHE_TTL_MS)) {
    propertyCache.set(id, storageCached);
    return storageCached.data;
  }

  const activeRequest = propertyInFlight.get(id);
  if (activeRequest) {
    return activeRequest;
  }

  const request = (async () => {
    try {
      try {
        const { data, error } = (await withTimeout(
          supabase
            .from("properties")
            .select(PROPERTY_COLUMNS)
            .eq("id", id)
            .single(),
          10000,
          "Le chargement du bien a expiré."
        )) as { data: any; error: any };

        if (error) throw error;
        propertyCache.set(id, { at: Date.now(), data });
        writeStorageCache(storageKey, { at: Date.now(), data });
        return data;
      } catch {
        const backendRows = await getPropertiesFromBackend({ includeArchived: true });
        const fallback = backendRows.find((row) => Number(row?.id) === id);

        if (!fallback) {
          throw new Error("Bien introuvable.");
        }

        propertyCache.set(id, { at: Date.now(), data: fallback });
        writeStorageCache(storageKey, { at: Date.now(), data: fallback });
        return fallback;
      }
    } finally {
      propertyInFlight.delete(id);
    }
  })();

  propertyInFlight.set(id, request);
  return request;
}

// Toggle favorite (stub)
export async function toggleFavorite(propertyId: number) {
  return propertyId;
}

// Fetch all properties from Supabase
export async function getProperties(options?: {
  limit?: number;
  forceRefresh?: boolean;
  includeArchived?: boolean;
  region?: string;
  city?: string;
}) {
  const key = `limit:${options?.limit ?? "all"}:includeArchived:${options?.includeArchived ? "yes" : "no"}:region:${options?.region ?? "all"}:city:${options?.city ?? "all"}`;
  const storageKey = `${LIST_STORAGE_PREFIX}${key}`;
  const cached = listCache.get(key);
  if (!options?.forceRefresh && cached && isFresh(cached.at, LIST_CACHE_TTL_MS) && cached.data.length > 0) {
    return options?.includeArchived ? cached.data : filterActiveRows(cached.data);
  }

  const storageCached = readStorageCache<any[]>(storageKey);
  const staleStorageRows = storageCached?.data ?? null;
  if (!options?.forceRefresh && storageCached && isFresh(storageCached.at, LIST_CACHE_TTL_MS) && storageCached.data.length > 0) {
    listCache.set(key, storageCached);

    for (const row of storageCached.data) {
      if (typeof row?.id === "number") {
        propertyCache.set(row.id, { at: storageCached.at, data: row });
      }
    }

    return options?.includeArchived ? storageCached.data : filterActiveRows(storageCached.data);
  }

  const activeRequest = listInFlight.get(key);
  if (activeRequest) {
    return activeRequest;
  }

  const request = (async () => {
    try {
      if (options?.includeArchived) {
        let rows: any[] = [];

        try {
          rows = await getPropertiesFromBackend({
            limit: options?.limit,
            includeArchived: true,
            region: options?.region,
            city: options?.city,
          });
        } catch (backendError) {
          let query = supabase.from("properties").select(PROPERTY_COLUMNS).order("created_at", { ascending: false });

          if (options?.region) {
            query = query.eq("region", options.region);
          }
          if (options?.city) {
            query = query.eq("city", options.city);
          }

          if (options?.limit) {
            query = query.limit(options.limit);
          }

          const { data, error } = (await withTimeout(
            query,
            10000,
            "Le chargement des annonces d'administration a expiré."
          )) as { data: any[] | null; error: any };

          if (error) {
            if (Array.isArray(staleStorageRows) && staleStorageRows.length > 0) {
              rows = staleStorageRows;
            } else {
              throw backendError instanceof Error ? backendError : error;
            }
          } else {
            rows = data || [];
          }
        }

        const now = Date.now();
        listCache.set(key, { at: now, data: rows });
        writeStorageCache(storageKey, { at: now, data: rows });

        for (const row of rows) {
          const normalizedId = typeof row?.id === "number" ? row.id : Number.parseInt(String(row?.id ?? ""), 10);
          if (Number.isFinite(normalizedId)) {
            propertyCache.set(normalizedId, { at: now, data: row });
          }
        }

        return rows;
      }

      let rows: any[] = [];

      try {
        rows = await getPropertiesFromBackend({
          limit: options?.limit,
          region: options?.region,
          city: options?.city,
        });
      } catch (backendError) {
        let query = supabase.from("properties").select(PROPERTY_COLUMNS).order("created_at", { ascending: false });

        query = query.eq("status", "active");

        if (options?.region) {
          query = query.eq("region", options.region);
        }
        if (options?.city) {
          query = query.eq("city", options.city);
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = (await withTimeout(
          query,
          10000,
          "Le chargement des annonces a expiré."
        )) as { data: any[] | null; error: any };

        if (error) {
          if (Array.isArray(staleStorageRows)) {
            rows = staleStorageRows;
          } else {
            throw backendError instanceof Error ? backendError : error;
          }
        } else {
          rows = data || [];
        }
      }

      if (rows.length === 0 && Array.isArray(staleStorageRows) && staleStorageRows.length > 0) {
        rows = staleStorageRows;
      }

      rows = filterActiveRows(rows);

      const now = Date.now();
      listCache.set(key, { at: now, data: rows });
      writeStorageCache(storageKey, { at: now, data: rows });

      for (const row of rows) {
        if (typeof row?.id === "number") {
          propertyCache.set(row.id, { at: now, data: row });
          writeStorageCache(`${PROPERTY_STORAGE_PREFIX}${row.id}`, { at: now, data: row });
        }
      }

      return rows;
    } finally {
      listInFlight.delete(key);
    }
  })();

  listInFlight.set(key, request);
  return request;
}

// Create a new property listing, preferring the backend DB route so submissions are visible to admin.
export async function createSubmission(data: any) {
  try {
    const response = await withTimeout(
      fetch(`${BACKEND_BASE_URL}/api/admin/submissions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ submission: data }),
      }),
      15_000,
      `Backend indisponible sur ${BACKEND_BASE_URL}. Vérifiez que le serveur backend (port 3001) est démarré.`
    );

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.error || "Echec d'envoi via le backend.");
    }

    const created = normalizeCreatedSubmissionRow(payload?.data ?? null);

    if (!created) {
      throw new Error("Réponse invalide du backend lors de la création de l'annonce.");
    }

    clearListingsCache();
    if (created.id && typeof created.id === "number") {
      propertyCache.set(created.id, { at: Date.now(), data: created });
      writeStorageCache(`${PROPERTY_STORAGE_PREFIX}${created.id}`, { at: Date.now(), data: created });
    }
    emitPropertiesChanged();

    return created;
  } catch (backendError) {
    const { data: result, error } = await withTimeout(
      supabase.from("properties").insert([data]).select(),
      15_000,
      "L'envoi de l'annonce vers la base de donnees prend trop de temps. Merci de reessayer."
    );
    if (error) {
      throw backendError instanceof Error ? backendError : error;
    }

    const created = normalizeCreatedSubmissionRow(result);

    if (!created) {
      if (backendError instanceof Error) {
        throw backendError;
      }

      throw new Error("L'annonce n'a pas pu être enregistrée côté base de données.");
    }

    clearListingsCache();
    if (created.id && typeof created.id === "number") {
      propertyCache.set(created.id, { at: Date.now(), data: created });
      writeStorageCache(`${PROPERTY_STORAGE_PREFIX}${created.id}`, { at: Date.now(), data: created });
    }
    emitPropertiesChanged();

    return created;
  }
}

export async function updateSubmissionMedia(
  supabaseId: number,
  media: { image?: string; gallery?: string[]; video_url?: string | null },
) {
  const response = await withTimeout(
    fetch(`${BACKEND_BASE_URL}/api/admin/submissions/${supabaseId}/media`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(media),
    }),
    15_000,
    "La mise a jour des medias prend trop de temps. Merci de reessayer."
  );

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Echec de mise a jour des medias via le backend.");
  }

  const updated = payload?.data ?? null;
  clearListingsCache();
  if (updated?.id && typeof updated.id === "number") {
    propertyCache.set(updated.id, { at: Date.now(), data: updated });
    writeStorageCache(`${PROPERTY_STORAGE_PREFIX}${updated.id}`, { at: Date.now(), data: updated });
  }
  emitPropertiesChanged();

  return updated;
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getBackendAuthHeaders() {
  const { data } = await withTimeout(
    supabase.auth.getSession(),
    5_000,
    "La recuperation de la session utilisateur prend trop de temps."
  );
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("Session utilisateur introuvable pour l'upload video.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function uploadVideoFileDirect(file: File) {
  const headers = await getBackendAuthHeaders();
  const response = await withTimeout(
    fetch(`${BACKEND_BASE_URL}/api/uploads/video-sign`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type || "video/mp4",
      }),
    }),
    15_000,
    "La preparation de l'upload video prend trop de temps."
  );

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.uploadUrl || !payload?.publicUrl) {
    throw new Error(payload?.error || "Impossible de preparer l'upload video.");
  }

  const uploadResponse = await withTimeout(
    fetch(payload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "video/mp4",
      },
      body: file,
    }),
    120_000,
    "L'envoi direct de la video prend trop de temps."
  );

  if (!uploadResponse.ok) {
    throw new Error("Echec d'envoi direct de la video.");
  }

  return payload.publicUrl as string;
}

async function uploadMediaFile(file: File, folder: "photos" | "videos") {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : folder === "videos"
      ? "mp4"
      : "jpg";
  const safeBaseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, "")) || folder;
  const uniqueId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fileName = `${Date.now()}-${uniqueId}-${safeBaseName}.${extension}`;
  const filePath = `${folder}/${new Date().toISOString().slice(0, 10)}/${fileName}`;

  const { error } = await withTimeout(
    supabase.storage.from(MEDIA_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    }),
    folder === "videos" ? 120_000 : 45_000,
    `L'envoi de la ${folder === "videos" ? "video" : "photo"} prend trop de temps.`
  );

  if (error) {
    throw new Error(`Impossible d'envoyer la ${folder === "videos" ? "video" : "photo"} : ${error.message}`);
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Impossible de recuperer l'URL publique du media.");
  }

  return data.publicUrl;
}

export async function uploadAllMedia(photos: File[], videoFile?: File | null) {
  const photoUrls = await Promise.all(photos.map((file) => uploadMediaFile(file, "photos")));
  const videoUrl = videoFile
    ? await uploadVideoFileDirect(videoFile).catch(() => uploadMediaFile(videoFile, "videos"))
    : null;

  return { photoUrls, videoUrl };
}
