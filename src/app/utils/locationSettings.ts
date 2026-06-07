import type { SiteSettings } from "../../lib/api";
import { getCitiesForRegion as getCitiesForRegionDefault, tunisiaRegionOptions as defaultRegionOptions } from "../data/locations";

export function getRegionOptions(settings?: SiteSettings) {
  return settings?.regions?.map((region) => region.name).filter(Boolean) ?? defaultRegionOptions;
}

export function getCitiesForRegionBySettings(settings: SiteSettings | null | undefined, region: string) {
  if (!region) return [];
  const regionItem = settings?.regions?.find((item) => item.name === region);
  return regionItem?.cities ?? getCitiesForRegionDefault(region);
}
