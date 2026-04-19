import { type Property, mapSupabaseProperty } from "../data/properties";
import { getProperties } from "../../lib/api";

export function getPublicProperties(): Property[] {
  return [];
}

export function getCachedPublicProperties(): Property[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith("ji:listings:") || key.includes("includeArchived:yes")) {
        continue;
      }

      const raw = window.localStorage.getItem(key);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw) as { data?: any[] };
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        return parsed.data
          .filter((row) => !row?.status || row.status === "active")
          .map(mapSupabaseProperty);
      }
    }
  } catch {
    return [];
  }

  return [];
}

export function hasCachedPublicProperties(): boolean {
  return getCachedPublicProperties().length > 0;
}

/**
 * Fetch public properties from the database, optionally forcing a refresh.
 */
export async function getPublicPropertiesAsync(options?: { forceRefresh?: boolean }): Promise<Property[]> {
  try {
    const dbProperties = await getProperties({ forceRefresh: options?.forceRefresh ?? false });
    return dbProperties.map(mapSupabaseProperty);
  } catch (error) {
    console.error("Failed to fetch properties from the database:", error);
    return [];
  }
}
