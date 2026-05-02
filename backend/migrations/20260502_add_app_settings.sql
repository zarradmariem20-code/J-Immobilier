CREATE TABLE IF NOT EXISTS app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_email TEXT,
  admin_password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id, data, admin_email)
VALUES (
  TRUE,
  '{
    "brand": { "companyName": "Journal Immobilier" },
    "contact": {
      "officeAddressLines": ["Bouhsina", "Sousse, Tunisie"],
      "officeMapQuery": "Bouhsina Sousse Tunisie",
      "primaryPhone": "+216 97 222 822",
      "secondaryPhone": "+216 27 037 037",
      "email": "contact@journalimmobilier.tn",
      "openingHours": [
        "Lundi - Vendredi : 8h30 - 18h00",
        "Samedi : 9h00 - 14h00",
        "Dimanche : Fermé"
      ]
    },
    "bureaus": [
      {
        "id": "main",
        "name": "Bureau Principal",
        "address": "Bouhsina, Sousse, Tunisie",
        "phone": "+216 97 222 822",
        "email": "contact@journalimmobilier.tn",
        "mapQuery": "Bouhsina Sousse Tunisie",
        "latitude": 35.8256,
        "longitude": 10.6084
      }
    ],
    "socialLinks": {
      "facebook": "https://www.facebook.com/profile.php?id=100054570723975&sk=followers",
      "instagram": "https://www.instagram.com/journal_immobilier?igsh=Mzl3eDE2eHZneGlv",
      "tiktok": "https://www.tiktok.com/@journal_immo2?is_from_webapp=1&sender_device=pc"
    }
  }'::jsonb,
  'contact@journalimmobilier.tn'
)
ON CONFLICT (id) DO NOTHING;
