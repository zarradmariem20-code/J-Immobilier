-- Comprehensive sample property listings for visualization

INSERT INTO properties (
  title, price, transaction_type, location, map_location_query,
  nearby_commodities, bedrooms, bathrooms, area, type,
  image, gallery, description, features, tags, featured
) VALUES
-- Featured Sales
(
  'Villa Contemporaine à Gammarth',
  2850000,
  'Vente',
  'Gammarth, Tunis',
  'Gammarth Tunis',
  ARRAY['Université', 'Pharmacie', 'Supermarché', 'Plage'],
  5, 4, 420, 'Villa',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Superbe villa à Gammarth avec architecture contemporaine, grandes terrasses, piscine et finitions premium à quelques minutes de la mer.',
  ARRAY['Piscine', 'Domotique', 'Jardin paysager', 'Garage', 'Sécurité 24/7', 'Proche mer'],
  ARRAY['Gammarth', 'Prestige', 'Front de mer'],
  true
),

(
  'Penthouse Panoramique à La Marsa',
  1950000,
  'Vente',
  'La Marsa, Tunis',
  'La Marsa Tunis',
  ARRAY['Restaurant', 'Café', 'Plage', 'Pharmacie'],
  4, 3, 325, 'Penthouse',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Penthouse haut standing à La Marsa avec rooftop, séjour traversant et vue dégagée sur le littoral nord de Tunis.',
  ARRAY['Vue mer', 'Terrasse privée', 'Ascenseur privatif', 'Piscine commune', 'Suite parentale'],
  ARRAY['La Marsa', 'Terrasse', 'Vue mer'],
  true
),

(
  'Maison Familiale à Sousse',
  780000,
  'Vente',
  'Chott Mariem, Sousse',
  'Chott Mariem Sousse',
  ARRAY['École', 'Pharmacie', 'Supermarché', 'Plage'],
  4, 3, 260, 'Maison',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1519643381401-22c77e60520e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Maison familiale proche de la plage de Sousse avec jardin, cuisine ouverte et espaces extérieurs parfaits pour la vie de famille.',
  ARRAY['Jardin', 'Garage', 'Cuisine rénovée', 'Terrasse', 'Près des écoles'],
  ARRAY['Sousse', 'Famille', 'Proche plage'],
  false
),

(
  'Duplex Moderne à Sfax',
  420000,
  'Vente',
  'Sfax El Jadida, Sfax',
  'Sfax El Jadida Sfax',
  ARRAY['Centre commercial', 'Pharmacie', 'Café', 'Restaurant'],
  3, 2, 205, 'Maison de Ville',
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1600210492493-0946911123ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1605146769289-440113cc3d00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Duplex contemporain au cœur de Sfax avec double séjour, rooftop et finitions sobres adaptées à une clientèle urbaine.',
  ARRAY['Rooftop', 'Plan ouvert', 'Parquet', 'Proche commerces'],
  ARRAY['Sfax', 'Centre-ville', 'Duplex'],
  false
),

(
  'Riad Traditionnel à La Médina',
  650000,
  'Vente',
  'La Médina, Tunis',
  'La Medina Tunis',
  ARRAY['Souk', 'Mosquée', 'Restaurant', 'Musée'],
  5, 3, 280, 'Riad',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Authentique riad tunisien dans la Médina avec cour intérieure, terrasse couverte et architecture traditionnelle préservée.',
  ARRAY['Patio', 'Terrasse', 'Charme traditionnel', 'Proche sites historiques'],
  ARRAY['Médina', 'Traditionnel', 'Historique'],
  false
),

-- Featured Rentals
(
  'Appartement Vue Lac',
  3200,
  'Location',
  'Les Berges du Lac 2, Tunis',
  'Les Berges du Lac Tunis',
  ARRAY['Centre commercial', 'Café', 'Restaurant', 'Université'],
  3, 2, 168, 'Appartement',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Appartement meublé lumineux aux Berges du Lac 2 avec terrasse, cuisine équipée et accès rapide aux zones d''affaires de Tunis.',
  ARRAY['Vue dégagée', 'Résidence gardée', 'Parking', 'Cuisine équipée', 'Climatisation centrale'],
  ARRAY['Lac 2', 'Location', 'Meublé'],
  true
),

(
  'Villa à Louer à Hammamet Nord',
  6500,
  'Location',
  'Hammamet Nord, Nabeul',
  'Hammamet Nord Nabeul',
  ARRAY['Plage', 'Restaurant', 'Café', 'Centre commercial'],
  6, 5, 485, 'Villa',
  'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Grande villa de location saisonnière à Hammamet Nord avec piscine, jardin, espaces de réception et accès rapide aux plages.',
  ARRAY['Piscine', 'Jardin', 'Suite invités', 'Terrasse couverte', 'Proche plage'],
  ARRAY['Hammamet', 'Location', 'Piscine'],
  true
),

(
  'Studio Moderne à Tunis Centre',
  1800,
  'Location',
  'Centre-ville, Tunis',
  'Tunis Centre-ville',
  ARRAY['Transport public', 'Pharmacie', 'Restaurant', 'Supermarché'],
  1, 1, 42, 'Studio',
  'https://images.unsplash.com/photo-1493857671505-72967e2e2760?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1493857671505-72967e2e2760?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Studio compact et bien agencé au cœur de Tunis Centre avec accès à transports et commerces.',
  ARRAY['Climatisation', 'WiFi', 'Cuisine équipée', 'Lumineux'],
  ARRAY['Centre-ville', 'Studio', 'Compact'],
  false
),

(
  'Appartement Luxe à La Goulette',
  4500,
  'Location',
  'La Goulette, Tunis',
  'La Goulette Tunis',
  ARRAY['Plage', 'Restaurant', 'Café', 'Port'],
  3, 2, 195, 'Appartement',
  'https://images.unsplash.com/photo-1600607688632-694b22fa5607?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1600607688632-694b22fa5607?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Appartement de luxe avec vue sur la baie de La Goulette, meublé haut de gamme et services de conciergerie.',
  ARRAY['Vue baie', 'Ascenseur', 'Parking couvert', 'Concierge', 'Vue mer'],
  ARRAY['La Goulette', 'Luxe', 'Vue baie'],
  false
),

(
  'Maison Meublée à Sidi Bou Saïd',
  5200,
  'Location',
  'Sidi Bou Saïd, Tunis',
  'Sidi Bou Said Tunis',
  ARRAY['Plage', 'Café', 'Musée', 'Restaurant'],
  4, 2, 240, 'Maison',
  'https://images.unsplash.com/photo-1576508335224-a872281cbdda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1576508335224-a872281cbdda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1501707546566-f4ee2dada92d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Charmante maison dans le village pittoresque de Sidi Bou Saïd, décorée avec style méditerranéen.',
  ARRAY['Terrasse vue mer', 'Jardin', 'Accès plage', 'Climatisation'],
  ARRAY['Sidi Bou Saïd', 'Pittoresque', 'Vue mer'],
  true
),

-- Additional Sales
(
  'Terrain à Bâtir à Aïn Zaghouan',
  185000,
  'Vente',
  'Aïn Zaghouan, Zaghouan',
  'Ain Zaghouan Zaghouan',
  ARRAY['Commerces', 'Écoles', 'Mosque'],
  0, 0, 1200, 'Terrain',
  'https://images.unsplash.com/photo-1500517967411-481b6708fe67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1500517967411-481b6708fe67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Terrain constructible bien situé avec accès routes principales et viabilisation en cours.',
  ARRAY['Urbanisé', 'Accès route', 'Viabilisé'],
  ARRAY['Zaghouan', 'Terrain', 'Constructible'],
  false
),

(
  'Villa avec Piscine à Carthage',
  3200000,
  'Vente',
  'Carthage, Tunis',
  'Carthage Tunis',
  ARRAY['Golf', 'Restaurant', 'Plage', 'Écoles'],
  6, 5, 550, 'Villa',
  'https://images.unsplash.com/photo-1600596542815-ffad4c69c321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c69c321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1585299023132-f87db8ff0e2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Magnifique villa prestige à Carthage avec piscine, jardin aménagé et vue dominante.',
  ARRAY['Piscine 50m2', 'Jardin paysager', 'Sauna', 'Home cinema', 'Sécurité 24/7'],
  ARRAY['Carthage', 'Prestige', 'Piscine'],
  false
),

(
  'Appartement T3 à Montfleury',
  1250000,
  'Vente',
  'Montfleury, Tunis',
  'Montfleury Tunis',
  ARRAY['Supermarché', 'École', 'Pharmacie', 'Café'],
  3, 2, 145, 'Appartement',
  'https://images.unsplash.com/photo-1522399989546-3d1e7e2c131e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1522399989546-3d1e7e2c131e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://images.unsplash.com/photo-1524499591330-5c89b46ef584?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  ],
  'Appartement spacieux à Montfleury avec balcon, vue dégagée et proximité commerces.',
  ARRAY['Parking', 'Balcon', 'Lumineux', 'Ascenseur'],
  ARRAY['Montfleury', 'Résidentiel', 'Balcon'],
  false
);
