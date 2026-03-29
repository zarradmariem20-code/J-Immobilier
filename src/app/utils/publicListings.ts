import { properties as seedProperties, type Property } from "../data/properties";
import { getListingSubmissions } from "./storage";

const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

export function getPublicProperties(): Property[] {
  const approvedFromClients: Property[] = getListingSubmissions()
    .filter((item) => item.status === "approved")
    .map((item) => ({
      id: item.publicId,
      title: item.title,
      price: item.price,
      transactionType: item.transactionType,
      location: item.location,
      mapLocationQuery: item.mapLocationQuery,
      nearbyCommodities: item.nearbyCommodities,
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      type: item.propertyType,
      image: item.coverImage || DEFAULT_LISTING_IMAGE,
      gallery: [item.coverImage || DEFAULT_LISTING_IMAGE],
      description: item.description,
      features: ["Annonce vérifiée", "Contact propriétaire", "Publication approuvée"],
      tags: [item.propertyType, item.location.split(",")[0] || item.location, "Client"],
      featured: item.featured,
    }));

  return [...seedProperties, ...approvedFromClients];
}
