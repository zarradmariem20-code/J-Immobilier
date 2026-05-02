import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { dbPool } from "../lib/db.js";

type BureauSettings = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  mapQuery: string;
  latitude?: number;
  longitude?: number;
};

type SiteSettings = {
  brand: {
    companyName: string;
  };
  contact: {
    officeAddressLines: string[];
    officeMapQuery: string;
    primaryPhone: string;
    secondaryPhone: string;
    email: string;
    openingHours: string[];
  };
  bureaus: BureauSettings[];
  socialLinks: {
    facebook: string;
    instagram: string;
    tiktok: string;
  };
  announcementItems: string[];
};

const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    companyName: "Journal Immobilier",
  },
  contact: {
    officeAddressLines: ["Bouhsina", "Sousse, Tunisie"],
    officeMapQuery: "Bouhsina Sousse Tunisie",
    primaryPhone: "+216 97 222 822",
    secondaryPhone: "+216 27 037 037",
    email: "contact@journalimmobilier.tn",
    openingHours: [
      "Lundi - Vendredi : 8h30 - 18h00",
      "Samedi : 9h00 - 14h00",
      "Dimanche : Fermé",
    ],
  },
  bureaus: [
    {
      id: "main",
      name: "Bureau Principal",
      address: "Bouhsina, Sousse, Tunisie",
      phone: "+216 97 222 822",
      email: "contact@journalimmobilier.tn",
      mapQuery: "Bouhsina Sousse Tunisie",
      latitude: 35.8256,
      longitude: 10.6084,
    },
  ],
  socialLinks: {
    facebook: "https://www.facebook.com/profile.php?id=100054570723975&sk=followers",
    instagram: "https://www.instagram.com/journal_immobilier?igsh=Mzl3eDE2eHZneGlv",
    tiktok: "https://www.tiktok.com/@journal_immo2?is_from_webapp=1&sender_device=pc",
  },
  announcementItems: [
    "Nous publions votre bien sur Facebook, Instagram et TikTok",
    "Marketing r\u00e9seaux sociaux 100% gratuit pour votre annonce",
    "Visibilit\u00e9 renforc\u00e9e d\u00e8s la mise en ligne",
  ],
};

const router = Router();

function safeString(value: unknown, fallback: string, max = 300): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function normalizeSettings(input: any): SiteSettings {
  const brand = {
    companyName: safeString(input?.brand?.companyName, DEFAULT_SETTINGS.brand.companyName, 120),
  };

  const officeAddressLines = Array.isArray(input?.contact?.officeAddressLines)
    ? input.contact.officeAddressLines
        .filter((line: unknown) => typeof line === "string")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .slice(0, 5)
    : DEFAULT_SETTINGS.contact.officeAddressLines;

  const openingHours = Array.isArray(input?.contact?.openingHours)
    ? input.contact.openingHours
        .filter((line: unknown) => typeof line === "string")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .slice(0, 10)
    : DEFAULT_SETTINGS.contact.openingHours;

  const contact = {
    officeAddressLines: officeAddressLines.length > 0 ? officeAddressLines : DEFAULT_SETTINGS.contact.officeAddressLines,
    officeMapQuery: safeString(input?.contact?.officeMapQuery, DEFAULT_SETTINGS.contact.officeMapQuery, 220),
    primaryPhone: safeString(input?.contact?.primaryPhone, DEFAULT_SETTINGS.contact.primaryPhone, 40),
    secondaryPhone: safeString(input?.contact?.secondaryPhone, DEFAULT_SETTINGS.contact.secondaryPhone, 40),
    email: safeString(input?.contact?.email, DEFAULT_SETTINGS.contact.email, 120),
    openingHours: openingHours.length > 0 ? openingHours : DEFAULT_SETTINGS.contact.openingHours,
  };

  const bureaus: BureauSettings[] = Array.isArray(input?.bureaus)
    ? input.bureaus.slice(0, 20).map((bureau: any, index: number) => ({
        id: safeString(bureau?.id, `bureau-${index + 1}`, 80),
        name: safeString(bureau?.name, `Bureau ${index + 1}`, 120),
        address: safeString(bureau?.address, "", 240),
        phone: safeString(bureau?.phone, "", 60),
        email: safeString(bureau?.email, "", 120),
        mapQuery: safeString(bureau?.mapQuery, "", 220),
        latitude: safeNumber(bureau?.latitude),
        longitude: safeNumber(bureau?.longitude),
      }))
    : DEFAULT_SETTINGS.bureaus;

  const normalizedBureaus = bureaus
    .filter((bureau) => bureau.name || bureau.address || bureau.phone || bureau.mapQuery)
    .map((bureau) => ({
      ...bureau,
      mapQuery:
        bureau.mapQuery ||
        (bureau.latitude !== undefined && bureau.longitude !== undefined
          ? `${bureau.latitude},${bureau.longitude}`
          : bureau.address),
    }));

  const socialLinks = {
    facebook: safeString(input?.socialLinks?.facebook, DEFAULT_SETTINGS.socialLinks.facebook, 300),
    instagram: safeString(input?.socialLinks?.instagram, DEFAULT_SETTINGS.socialLinks.instagram, 300),
    tiktok: safeString(input?.socialLinks?.tiktok, DEFAULT_SETTINGS.socialLinks.tiktok, 300),
  };

  const announcementItems: string[] = Array.isArray(input?.announcementItems)
    ? input.announcementItems
        .filter((item: unknown) => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    : DEFAULT_SETTINGS.announcementItems;

  return {
    brand,
    contact,
    bureaus: normalizedBureaus.length > 0 ? normalizedBureaus : DEFAULT_SETTINGS.bureaus,
    socialLinks,
    announcementItems: announcementItems.length > 0 ? announcementItems : DEFAULT_SETTINGS.announcementItems,
  };
}

async function ensureSettingsTable() {
  if (!dbPool) return;

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      admin_email TEXT,
      admin_password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getOrCreateSettingsRow() {
  if (!dbPool) {
    return {
      data: DEFAULT_SETTINGS,
      adminEmail: DEFAULT_SETTINGS.contact.email,
      adminPasswordHash: null as string | null,
      updatedAt: new Date().toISOString(),
    };
  }

  await ensureSettingsTable();

  const existing = await dbPool.query(
    `SELECT data, admin_email, admin_password_hash, updated_at FROM app_settings WHERE id = TRUE LIMIT 1`,
  );

  if (existing.rowCount && existing.rows[0]) {
    const row = existing.rows[0];
    return {
      data: normalizeSettings(row.data),
      adminEmail: typeof row.admin_email === "string" ? row.admin_email : DEFAULT_SETTINGS.contact.email,
      adminPasswordHash: typeof row.admin_password_hash === "string" ? row.admin_password_hash : null,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date().toISOString(),
    };
  }

  await dbPool.query(
    `
      INSERT INTO app_settings (id, data, admin_email)
      VALUES (TRUE, $1::jsonb, $2)
      ON CONFLICT (id) DO NOTHING
    `,
    [JSON.stringify(DEFAULT_SETTINGS), DEFAULT_SETTINGS.contact.email],
  );

  return {
    data: DEFAULT_SETTINGS,
    adminEmail: DEFAULT_SETTINGS.contact.email,
    adminPasswordHash: null as string | null,
    updatedAt: new Date().toISOString(),
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [salt, savedHash] = encoded.split(":");
  if (!salt || !savedHash) return false;
  const attemptedHash = scryptSync(password, salt, 64).toString("hex");
  const savedBuffer = Buffer.from(savedHash, "hex");
  const attemptedBuffer = Buffer.from(attemptedHash, "hex");
  if (savedBuffer.length !== attemptedBuffer.length) return false;
  return timingSafeEqual(savedBuffer, attemptedBuffer);
}

router.get("/settings", async (_req, res) => {
  try {
    const row = await getOrCreateSettingsRow();
    return res.json({
      data: row.data,
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    console.error("Failed to fetch public settings", error);
    return res.status(500).json({ error: "Impossible de charger les paramètres publics." });
  }
});

router.get("/admin/settings", async (_req, res) => {
  try {
    const row = await getOrCreateSettingsRow();
    return res.json({
      data: row.data,
      adminEmail: row.adminEmail,
      hasPassword: Boolean(row.adminPasswordHash),
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    console.error("Failed to fetch admin settings", error);
    return res.status(500).json({ error: "Impossible de charger les paramètres admin." });
  }
});

router.put("/admin/settings", async (req, res) => {
  try {
    const nextSettings = normalizeSettings(req.body?.data ?? req.body ?? {});
    const adminEmail = safeString(req.body?.adminEmail, nextSettings.contact.email, 120);

    if (!dbPool) {
      return res.json({
        data: nextSettings,
        adminEmail,
        updatedAt: new Date().toISOString(),
      });
    }

    await ensureSettingsTable();

    const result = await dbPool.query(
      `
        INSERT INTO app_settings (id, data, admin_email, updated_at)
        VALUES (TRUE, $1::jsonb, $2, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          data = EXCLUDED.data,
          admin_email = EXCLUDED.admin_email,
          updated_at = NOW()
        RETURNING updated_at
      `,
      [JSON.stringify(nextSettings), adminEmail],
    );

    return res.json({
      data: nextSettings,
      adminEmail,
      updatedAt:
        result.rows[0]?.updated_at instanceof Date
          ? result.rows[0].updated_at.toISOString()
          : new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to save admin settings", error);
    return res.status(500).json({ error: "Impossible d'enregistrer les paramètres." });
  }
});

router.put("/admin/settings/password", async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (newPassword.trim().length < 8) {
    return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  }

  try {
    const row = await getOrCreateSettingsRow();

    if (row.adminPasswordHash && !verifyPassword(currentPassword, row.adminPasswordHash)) {
      return res.status(400).json({ error: "Le mot de passe actuel est incorrect." });
    }

    const nextHash = hashPassword(newPassword.trim());

    if (!dbPool) {
      return res.json({ success: true, updatedAt: new Date().toISOString() });
    }

    await ensureSettingsTable();

    const result = await dbPool.query(
      `
        INSERT INTO app_settings (id, data, admin_password_hash, updated_at)
        VALUES (TRUE, $1::jsonb, $2, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          admin_password_hash = EXCLUDED.admin_password_hash,
          updated_at = NOW()
        RETURNING updated_at
      `,
      [JSON.stringify(row.data), nextHash],
    );

    return res.json({
      success: true,
      updatedAt:
        result.rows[0]?.updated_at instanceof Date
          ? result.rows[0].updated_at.toISOString()
          : new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update admin password", error);
    return res.status(500).json({ error: "Impossible de changer le mot de passe." });
  }
});

export default router;
