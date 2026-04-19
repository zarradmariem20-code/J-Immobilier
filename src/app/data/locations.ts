export type TunisiaGovernorate = {
  region: string;
  cities: string[];
};

export const tunisiaGovernorates: TunisiaGovernorate[] = [
  { region: "Ariana", cities: ["Ariana", "La Soukra", "Raoued", "Ettadhamen", "Mnihla", "Sidi Thabet"] },
  { region: "Beja", cities: ["Beja", "Medjez el Bab", "Testour", "Teboursouk", "Nefza"] },
  { region: "Ben Arous", cities: ["Ben Arous", "El Mourouj", "Hammam Lif", "Rades", "Ezzahra", "Fouchana", "Mornag"] },
  { region: "Bizerte", cities: ["Bizerte", "Menzel Bourguiba", "Mateur", "Ras Jebel", "Menzel Jemil", "Ghar El Melh"] },
  { region: "Gabes", cities: ["Gabes", "El Hamma", "Mareth", "Metouia", "Ghannouch", "Matmata"] },
  { region: "Gafsa", cities: ["Gafsa", "Metlaoui", "Redeyef", "Moulares", "El Ksar", "Mdhila"] },
  { region: "Jendouba", cities: ["Jendouba", "Tabarka", "Bou Salem", "Ain Draham", "Ghardimaou", "Fernana"] },
  { region: "Kairouan", cities: ["Kairouan", "Bou Hajla", "Haffouz", "Sbikha", "Oueslatia", "Hajeb El Ayoun"] },
  { region: "Kasserine", cities: ["Kasserine", "Sbeitla", "Feriana", "Thala", "Foussana", "Haidra"] },
  { region: "Kebili", cities: ["Kebili", "Douz", "Souk Lahad", "El Golaa", "Djemna", "Faouar"] },
  { region: "Le Kef", cities: ["El Kef", "Tajerouine", "Dahmani", "Sakiet Sidi Youssef", "Jerissa", "Sers"] },
  { region: "Mahdia", cities: ["Mahdia", "El Jem", "Ksour Essef", "Chebba", "Essouassi", "Rejiche"] },
  { region: "Manouba", cities: ["Manouba", "Oued Ellil", "Douar Hicher", "Mornaguia", "Tebourba", "Djedeida"] },
  { region: "Medenine", cities: ["Medenine", "Ben Gardane", "Zarzis", "Houmt Souk", "Midoun", "Ajim"] },
  { region: "Monastir", cities: ["Monastir", "Moknine", "Ksar Hellal", "Teboulba", "Jemmal", "Bekalta"] },
  { region: "Nabeul", cities: ["Nabeul", "Hammamet", "Kelibia", "Korba", "Menzel Temime", "Soliman", "Grombalia"] },
  { region: "Sfax", cities: ["Sfax", "Sakiet Ezzit", "Sakiet Eddaier", "Thyna", "Skhira", "Mahares", "Jebiniana"] },
  { region: "Sidi Bouzid", cities: ["Sidi Bouzid", "Regueb", "Jilma", "Bir El Hafey", "Meknassy", "Mezzouna"] },
  { region: "Siliana", cities: ["Siliana", "Maktar", "Bou Arada", "Gaafour", "Rouhia", "El Krib"] },
  { region: "Sousse", cities: ["Sousse", "Hammam Sousse", "Akouda", "Msaken", "Kalaa Kebira", "Kalaa Sghira", "Sidi Bou Ali", "Chott Meriem", "Enfidha", "Bouficha"] },
  { region: "Tataouine", cities: ["Tataouine", "Ghomrassen", "Bir Lahmar", "Dehiba", "Remada"] },
  { region: "Tozeur", cities: ["Tozeur", "Nafta", "Degache", "Tamerza", "El Hamma du Jerid"] },
  { region: "Tunis", cities: ["Tunis", "La Marsa", "Le Bardo", "La Goulette", "Le Kram", "Carthage", "Sidi Bou Said"] },
  { region: "Zaghouan", cities: ["Zaghouan", "El Fahs", "Nadhour", "Bir Mcherga", "Zriba"] },
];

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const regionLookup = new Map(tunisiaGovernorates.map((item) => [normalized(item.region), item.region]));
const cityEntries = tunisiaGovernorates
  .flatMap((item) => item.cities.map((city) => ({ region: item.region, city, normalizedCity: normalized(city) })))
  .sort((left, right) => right.city.length - left.city.length);

export const tunisiaRegionOptions = tunisiaGovernorates.map((item) => item.region);

export function getCitiesForRegion(region: string) {
  const match = tunisiaGovernorates.find((item) => item.region === region);
  return match?.cities ?? [];
}

export function findRegionForCity(city: string) {
  const match = cityEntries.find((entry) => entry.city === city);
  return match?.region ?? "";
}

export function deriveLocationLabel(region?: string | null, city?: string | null, fallback?: string | null) {
  const cleanRegion = region?.trim() ?? "";
  const cleanCity = city?.trim() ?? "";
  const cleanFallback = fallback?.trim() ?? "";

  if (cleanCity && cleanRegion) {
    return `${cleanCity}, ${cleanRegion}`;
  }

  if (cleanCity) {
    return cleanCity;
  }

  if (cleanRegion) {
    return cleanRegion;
  }

  return cleanFallback || "Emplacement non precise";
}

export function inferRegionCity(values: {
  region?: string | null;
  city?: string | null;
  location?: string | null;
  mapLocationQuery?: string | null;
}) {
  const explicitRegion = values.region?.trim() ?? "";
  const explicitCity = values.city?.trim() ?? "";

  if (explicitRegion || explicitCity) {
    return {
      region: explicitRegion || findRegionForCity(explicitCity),
      city: explicitCity,
    };
  }

  const haystack = normalized(
    [values.location, values.mapLocationQuery]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" | "),
  );

  if (!haystack) {
    return { region: "", city: "" };
  }

  const cityMatch = cityEntries.find((entry) => haystack.includes(entry.normalizedCity));
  if (cityMatch) {
    return { region: cityMatch.region, city: cityMatch.city };
  }

  for (const [normalizedRegion, region] of regionLookup.entries()) {
    if (haystack.includes(normalizedRegion)) {
      return { region, city: "" };
    }
  }

  return { region: "", city: "" };
}

export function isRegionCityValid(region: string, city: string) {
  if (!region || !city) {
    return false;
  }

  return getCitiesForRegion(region).includes(city);
}
