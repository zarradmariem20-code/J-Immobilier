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
  description: string;
  features: string[];
  tags: string[];
  featured: boolean;
}

export const properties: Property[] = [
  {
    id: 1,
    title: "Villa Contemporaine à Gammarth",
    price: 2850000,
    transactionType: "Vente",
    location: "Gammarth, Tunis",
    bedrooms: 5,
    bathrooms: 4,
    area: 420,
    type: "Villa",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1600566753151-384129cf4e3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    ],
    description: "Superbe villa à Gammarth avec architecture contemporaine, grandes terrasses, piscine et finitions premium à quelques minutes de la mer.",
    features: ["Piscine", "Domotique", "Jardin paysager", "Garage", "Sécurité 24/7", "Proche mer"],
    tags: ["Gammarth", "Prestige", "Front de mer"],
    featured: true,
  },
  {
    id: 2,
    title: "Appartement Vue Lac",
    price: 3200,
    transactionType: "Location",
    location: "Les Berges du Lac 2, Tunis",
    bedrooms: 3,
    bathrooms: 2,
    area: 168,
    type: "Appartement",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    ],
    description: "Appartement meublé lumineux aux Berges du Lac 2 avec terrasse, cuisine équipée et accès rapide aux zones d'affaires de Tunis.",
    features: ["Vue dégagée", "Résidence gardée", "Parking", "Cuisine équipée", "Climatisation centrale"],
    tags: ["Lac 2", "Location", "Meublé"],
    featured: true,
  },
  {
    id: 3,
    title: "Penthouse Panoramique à La Marsa",
    price: 1950000,
    transactionType: "Vente",
    location: "La Marsa, Tunis",
    bedrooms: 4,
    bathrooms: 3,
    area: 325,
    type: "Penthouse",
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    ],
    description: "Penthouse haut standing à La Marsa avec rooftop, séjour traversant et vue dégagée sur le littoral nord de Tunis.",
    features: ["Vue mer", "Terrasse privée", "Ascenseur privatif", "Piscine commune", "Suite parentale"],
    tags: ["La Marsa", "Terrasse", "Vue mer"],
    featured: true,
  },
  {
    id: 4,
    title: "Maison Familiale à Sousse",
    price: 780000,
    transactionType: "Vente",
    location: "Chott Mariem, Sousse",
    bedrooms: 4,
    bathrooms: 3,
    area: 260,
    type: "Maison",
    image: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1519643381401-22c77e60520e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    ],
    description: "Maison familiale proche de la plage de Sousse avec jardin, cuisine ouverte et espaces extérieurs parfaits pour la vie de famille.",
    features: ["Jardin", "Garage", "Cuisine rénovée", "Terrasse", "Près des écoles"],
    tags: ["Sousse", "Famille", "Proche plage"],
    featured: false,
  },
  {
    id: 5,
    title: "Villa à Louer à Hammamet Nord",
    price: 6500,
    transactionType: "Location",
    location: "Hammamet Nord, Nabeul",
    bedrooms: 6,
    bathrooms: 5,
    area: 485,
    type: "Villa",
    image: "https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    ],
    description: "Grande villa de location saisonnière à Hammamet Nord avec piscine, jardin, espaces de réception et accès rapide aux plages.",
    features: ["Piscine", "Jardin", "Suite invités", "Terrasse couverte", "Proche plage"],
    tags: ["Hammamet", "Location", "Piscine"],
    featured: false,
  },
  {
    id: 6,
    title: "Duplex Moderne à Sfax",
    price: 420000,
    transactionType: "Vente",
    location: "Sfax El Jadida, Sfax",
    bedrooms: 3,
    bathrooms: 2,
    area: 205,
    type: "Maison de Ville",
    image: "https://images.unsplash.com/photo-1600210492493-0946911123ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    gallery: [
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1605146769289-440113cc3d00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    ],
    description: "Duplex contemporain au cœur de Sfax avec double séjour, rooftop et finitions sobres adaptées à une clientèle urbaine.",
    features: ["Rooftop", "Plan ouvert", "Parquet", "Proche commerces"],
    tags: ["Sfax", "Centre-ville", "Duplex"],
    featured: false,
  },
];
