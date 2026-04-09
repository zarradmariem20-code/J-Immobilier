export interface Property {
  id: number;
  title: string;
  price: number;
  transactionType: "Vente" | "Location";
  location: string;
  mapLocationQuery?: string;
  nearbyCommodities?: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  type: string;
  image: string;
  gallery: string[];
  videoUrl?: string;
  description: string;
  features: string[];
  tags: string[];
  featured: boolean;
}

export const properties: Property[] = []

/**
 * Maps Supabase Property to local Property interface
 */
export function mapSupabaseProperty(dbProperty: any): Property {
  return {
    id: Number(dbProperty.id ?? 0),
    title: String(dbProperty.title ?? "Annonce immobilière"),
    price: Number(dbProperty.price ?? 0),
    transactionType: (dbProperty.transaction_type === "Location" ? "Location" : "Vente") as "Vente" | "Location",
    location: String(dbProperty.location ?? "Emplacement non précisé"),
    mapLocationQuery: dbProperty.map_location_query ? String(dbProperty.map_location_query) : undefined,
    nearbyCommodities: Array.isArray(dbProperty.nearby_commodities) ? dbProperty.nearby_commodities : [],
    bedrooms: Number(dbProperty.bedrooms ?? 0),
    bathrooms: Number(dbProperty.bathrooms ?? 0),
    area: Number(dbProperty.area ?? 0),
    type: String(dbProperty.type ?? "Bien immobilier"),
    image: String(dbProperty.image ?? ""),
    gallery: Array.isArray(dbProperty.gallery) ? dbProperty.gallery : [],
    videoUrl: dbProperty.video_url ? String(dbProperty.video_url) : undefined,
    description: String(dbProperty.description ?? ""),
    features: Array.isArray(dbProperty.features) ? dbProperty.features : [],
    tags: Array.isArray(dbProperty.tags) ? dbProperty.tags : [],
    featured: Boolean(dbProperty.featured),
  };
}
