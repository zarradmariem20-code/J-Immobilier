import { Router } from "express";
import { dbPool } from "../lib/db.js";

const router = Router();

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop";
const VISIT_AUTOCOMPLETE_INTERVAL_MS = 60_000;
let lastVisitAutocompleteRunAt = 0;

async function maybeAutoCompleteVisits() {
  if (!dbPool) {
    return;
  }

  const now = Date.now();
  if (now - lastVisitAutocompleteRunAt < VISIT_AUTOCOMPLETE_INTERVAL_MS) {
    return;
  }

  lastVisitAutocompleteRunAt = now;
  await dbPool.query(`
    UPDATE visits
    SET visit_status = 'completed', updated_at = NOW()
    WHERE visit_status = 'scheduled'
      AND scheduled_date IS NOT NULL
      AND (
        scheduled_date < CURRENT_DATE
        OR (
          scheduled_date = CURRENT_DATE
          AND COALESCE(NULLIF(scheduled_time, ''), '00:00')::time <= CURRENT_TIME
        )
      )
  `);
}

type CreateSubmissionBody = {
  submission?: {
    title?: string;
    price?: number;
    transaction_type?: string;
    region?: string;
    city?: string;
    location?: string;
    map_location_query?: string;
    nearby_commodities?: string[];
    type?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    description?: string;
    image?: string;
    gallery?: string[];
    video_url?: string;
    features?: string[];
    tags?: string[];
    featured?: boolean;
    status?: string;
  };
};

type ApproveSubmissionBody = {
  submission?: {
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
  };
};

type InactivateSubmissionBody = {
  supabaseId?: number;
};

router.get("/properties", async (req, res) => {
  const limitRaw = req.query.limit;
  const includeArchived = req.query.includeArchived === "true";
  const region = typeof req.query.region === "string" && req.query.region.trim().length > 0 ? req.query.region.trim() : null;
  const city = typeof req.query.city === "string" && req.query.city.trim().length > 0 ? req.query.city.trim() : null;
  const parsedLimit =
    typeof limitRaw === "string" && limitRaw.trim().length > 0
      ? Number.parseInt(limitRaw, 10)
      : Number.NaN;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (!includeArchived) {
      conditions.push("status = 'active'");
    }

    if (region) {
      params.push(region);
      conditions.push(`region = $${params.length}`);
    }

    if (city) {
      params.push(city);
      conditions.push(`city = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitClause = limit ? `LIMIT $${params.length + 1}` : "";
    if (limit) {
      params.push(limit);
    }

    const queryText = `
      SELECT
        id,
        title,
        price,
        transaction_type,
        region,
        city,
        location,
        map_location_query,
        nearby_commodities,
        bedrooms,
        bathrooms,
        area,
        type,
        image,
        gallery,
        video_url,
        description,
        features,
        tags,
        featured,
        status,
        created_at
      FROM properties
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause}
    `;

    const result = await dbPool.query(queryText, params);
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Backend properties fetch failed." });
  }
});

router.post("/submissions/create", async (req, res) => {
  const body = req.body as CreateSubmissionBody;
  const submission = body?.submission;

  if (!submission) {
    return res.status(400).json({ error: "Missing submission payload." });
  }

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const safeStatus = submission.status === "active" ? "active" : "pending";
    const image = submission.image || submission.gallery?.[0] || FALLBACK_IMAGE;
    const gallery = submission.gallery && submission.gallery.length > 0 ? submission.gallery : [image];

    const insertResult = await dbPool.query(
      `
      INSERT INTO properties (
        title,
        price,
        transaction_type,
        region,
        city,
        location,
        map_location_query,
        nearby_commodities,
        type,
        bedrooms,
        bathrooms,
        area,
        description,
        image,
        gallery,
        video_url,
        features,
        tags,
        featured,
        status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
      RETURNING *
      `,
      [
        submission.title || "Annonce immobilière",
        submission.price ?? 0,
        submission.transaction_type || "Vente",
        submission.region?.trim() || null,
        submission.city?.trim() || null,
        submission.location || "Emplacement non précisé",
        submission.map_location_query || null,
        submission.nearby_commodities ?? [],
        submission.type || "Bien immobilier",
        submission.bedrooms ?? 0,
        submission.bathrooms ?? 0,
        submission.area ?? 0,
        submission.description || null,
        image,
        gallery,
        submission.video_url || null,
        submission.features ?? [],
        submission.tags ?? [],
        safeStatus === "active" ? Boolean(submission.featured) : false,
        safeStatus,
      ],
    );

    return res.status(201).json({ data: insertResult.rows[0] ?? null });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Backend submission creation failed." });
  }
});

router.patch("/submissions/:supabaseId/media", async (req, res) => {
  const supabaseId = Number.parseInt(req.params.supabaseId, 10);

  if (!Number.isFinite(supabaseId)) {
    return res.status(400).json({ error: "Invalid property id." });
  }

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const rawImage = typeof req.body?.image === "string" ? req.body.image.trim() : "";
    const gallery = Array.isArray(req.body?.gallery)
      ? req.body.gallery.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const videoUrl = typeof req.body?.video_url === "string" && req.body.video_url.trim().length > 0
      ? req.body.video_url.trim()
      : null;

    if (!rawImage && gallery.length === 0 && !videoUrl) {
      return res.status(400).json({ error: "No media payload provided." });
    }

    const image = rawImage || gallery[0] || FALLBACK_IMAGE;
    const mediaGallery = gallery.length > 0 ? gallery : [image];

    const updateResult = await dbPool.query(
      `
      UPDATE properties
      SET image = $1, gallery = $2, video_url = $3
      WHERE id = $4
      RETURNING *
      `,
      [image, mediaGallery, videoUrl, supabaseId],
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Property not found for media update." });
    }

    return res.json({ data: updateResult.rows[0] ?? null });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Backend media update failed." });
  }
});

router.post("/submissions/approve", async (req, res) => {
  const body = req.body as ApproveSubmissionBody;
  const submission = body?.submission;

  if (!submission) {
    return res.status(400).json({ error: "Missing submission payload." });
  }

  if (!submission.title || !submission.transactionType || !submission.location || !submission.propertyType) {
    return res.status(400).json({ error: "Missing required fields for approval." });
  }

  const image = submission.coverImage || submission.gallery?.[0] || FALLBACK_IMAGE;
  const gallery = submission.gallery && submission.gallery.length > 0 ? submission.gallery : [image];

  const propertyPayload = {
    title: submission.title,
    price: submission.price,
    transaction_type: submission.transactionType,
    region: submission.region?.trim() || null,
    city: submission.city?.trim() || null,
    location: submission.location,
    map_location_query: submission.mapLocationQuery || null,
    nearby_commodities: submission.nearbyCommodities ?? [],
    type: submission.propertyType,
    bedrooms: submission.bedrooms ?? 0,
    bathrooms: submission.bathrooms ?? 0,
    area: submission.area ?? 0,
    description: submission.description || null,
    image,
    gallery,
    video_url: submission.videoUrl || null,
    features: submission.features ?? [],
    tags: submission.tags ?? [],
    featured: submission.featured ?? false,
  };

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    if (typeof submission.supabaseId === "number") {
      const updateQuery = `
        UPDATE properties
        SET
          title = $1,
          price = $2,
          transaction_type = $3,
          region = $4,
          city = $5,
          location = $6,
          map_location_query = $7,
          nearby_commodities = $8,
          type = $9,
          bedrooms = $10,
          bathrooms = $11,
          area = $12,
          description = $13,
          image = $14,
          gallery = $15,
          video_url = $16,
          features = $17,
          tags = $18,
          featured = $19,
          status = 'active'
        WHERE id = $20
        RETURNING id
      `;

      const updateResult = await dbPool.query<{ id: number | string }>(updateQuery, [
        propertyPayload.title,
        propertyPayload.price,
        propertyPayload.transaction_type,
        propertyPayload.region,
        propertyPayload.city,
        propertyPayload.location,
        propertyPayload.map_location_query,
        propertyPayload.nearby_commodities,
        propertyPayload.type,
        propertyPayload.bedrooms,
        propertyPayload.bathrooms,
        propertyPayload.area,
        propertyPayload.description,
        propertyPayload.image,
        propertyPayload.gallery,
        propertyPayload.video_url,
        propertyPayload.features,
        propertyPayload.tags,
        propertyPayload.featured,
        submission.supabaseId,
      ]);

      if (updateResult.rowCount === 0) {
        return res.status(404).json({ error: "Property not found for update." });
      }

      // Keep denormalized visit snapshots aligned when property data changes from Annonces.
      await dbPool.query(
        `
        UPDATE visits
        SET property_title = $1, updated_at = NOW()
        WHERE property_id = $2
        `,
        [propertyPayload.title, submission.supabaseId],
      );

      // Keep existing visit notifications consistent with latest property title.
      await dbPool.query(
        `
        UPDATE notifications n
        SET
          title = CASE
            WHEN v.visit_status = 'scheduled' THEN 'Visite planifiée'
            WHEN v.visit_status = 'rejected' THEN 'Demande de visite refusée'
            WHEN v.visit_status = 'completed' THEN 'Visite complétée'
            ELSE 'Mise à jour de votre visite'
          END,
          message = CASE
            WHEN v.visit_status = 'scheduled' THEN 'Votre visite pour "' || $1 || '" est planifiée.'
            WHEN v.visit_status = 'rejected' THEN 'Votre demande de visite pour "' || $1 || '" n''a pas pu être acceptée pour le moment.'
            WHEN v.visit_status = 'completed' THEN 'Votre visite pour "' || $1 || '" est marquée comme complétée.'
            ELSE 'Votre demande pour "' || $1 || '" a été mise à jour.'
          END
        FROM visits v
        WHERE n.visit_id = v.id
          AND n.type = 'visit'
          AND v.property_id = $2
        `,
        [propertyPayload.title, submission.supabaseId],
      );

      return res.json({ id: submission.supabaseId });
    }

    const insertQuery = `
      INSERT INTO properties (
        title,
        price,
        transaction_type,
        region,
        city,
        location,
        map_location_query,
        nearby_commodities,
        type,
        bedrooms,
        bathrooms,
        area,
        description,
        image,
        gallery,
        video_url,
        features,
        tags,
        featured,
        status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active'
      )
      RETURNING id
    `;

    const insertResult = await dbPool.query<{ id: number | string }>(insertQuery, [
      propertyPayload.title,
      propertyPayload.price,
      propertyPayload.transaction_type,
      propertyPayload.region,
      propertyPayload.city,
      propertyPayload.location,
      propertyPayload.map_location_query,
      propertyPayload.nearby_commodities,
      propertyPayload.type,
      propertyPayload.bedrooms,
      propertyPayload.bathrooms,
      propertyPayload.area,
      propertyPayload.description,
      propertyPayload.image,
      propertyPayload.gallery,
      propertyPayload.video_url,
      propertyPayload.features,
      propertyPayload.tags,
      propertyPayload.featured,
    ]);

    const rawInsertedId = insertResult.rows[0]?.id;
    const insertedId =
      typeof rawInsertedId === "number"
        ? rawInsertedId
        : typeof rawInsertedId === "string"
          ? Number.parseInt(rawInsertedId, 10)
          : Number.NaN;

    if (!Number.isFinite(insertedId)) {
      return res.status(500).json({ error: "Supabase response missing inserted id." });
    }

    return res.status(201).json({ id: insertedId });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Backend approval failed." });
  }
});

router.post("/submissions/inactivate", async (req, res) => {
  const body = req.body as InactivateSubmissionBody;
  const supabaseId = body?.supabaseId;

  if (!Number.isFinite(supabaseId)) {
    return res.status(400).json({ error: "Missing or invalid supabaseId." });
  }

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const archiveResult = await dbPool.query<{ id: number | string }>(
      "UPDATE properties SET status = 'archived', featured = false WHERE id = $1 RETURNING id",
      [supabaseId],
    );

    if (archiveResult.rowCount === 0) {
      return res.status(404).json({ error: "Property not found for inactivation." });
    }

    return res.json({ id: supabaseId });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Backend inactivation failed." });
  }
});

router.delete("/submissions/:supabaseId", async (req, res) => {
  const supabaseId = Number.parseInt(req.params.supabaseId, 10);

  if (!Number.isFinite(supabaseId)) {
    return res.status(400).json({ error: "Missing or invalid supabaseId." });
  }

  if (!dbPool) {
    return res.status(500).json({
      error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
    });
  }

  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
      DELETE FROM notifications
      WHERE visit_id IN (
        SELECT id
        FROM visits
        WHERE property_id = $1
      )
      `,
      [supabaseId],
    );
    await client.query("DELETE FROM visits WHERE property_id = $1", [supabaseId]);

    const deleteResult = await client.query<{ id: number | string }>(
      "DELETE FROM properties WHERE id = $1 RETURNING id",
      [supabaseId],
    );

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Property not found for deletion." });
    }

    await client.query("COMMIT");
    return res.json({ id: supabaseId });
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }

    return res.status(500).json({ error: error?.message || "Backend deletion failed." });
  } finally {
    client.release();
  }
});

// Visit management routes
router.get("/visits", async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const status = req.query.status as string | undefined;
    const propertyId = req.query.propertyId as string | undefined;
    const windowFilter = req.query.window as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const windowCondition =
      windowFilter === "today"
        ? " AND created_at >= DATE_TRUNC('day', NOW())"
        : windowFilter === "7d"
          ? " AND created_at >= NOW() - INTERVAL '7 days'"
          : windowFilter === "30d"
            ? " AND created_at >= NOW() - INTERVAL '30 days'"
            : "";

    await maybeAutoCompleteVisits();

    let query = "SELECT * FROM visits WHERE 1=1";
    const params: any[] = [];

    query += windowCondition;

    if (status) {
      query += ` AND visit_status = $${params.length + 1}`;
      params.push(status);
    }

    if (propertyId) {
      query += ` AND property_id = $${params.length + 1}`;
      params.push(parseInt(propertyId, 10));
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await dbPool.query(query, params);
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to fetch visits." });
  }
});

router.get("/visits/analytics", async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const windowFilter = req.query.window as string | undefined;
    const windowCondition =
      windowFilter === "today"
        ? "created_at >= DATE_TRUNC('day', NOW())"
        : windowFilter === "7d"
          ? "created_at >= NOW() - INTERVAL '7 days'"
          : "created_at >= NOW() - INTERVAL '30 days'";

    await maybeAutoCompleteVisits();

    // Get visits by property (top properties by visit count)
    const byPropertyQuery = `
      SELECT property_title, property_id, COUNT(*) as count
      FROM visits
      WHERE ${windowCondition}
      GROUP BY property_id, property_title
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get visits by status
    const byStatusQuery = `
      SELECT visit_status, COUNT(*) as count
      FROM visits
      WHERE ${windowCondition}
      GROUP BY visit_status
    `;

    // Get visits timeline grouped by creation date for selected window.
    const timelineQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as requests_count,
        COUNT(CASE WHEN visit_status = 'scheduled' THEN 1 END)::int as scheduled_count,
        COUNT(CASE WHEN visit_status = 'completed' THEN 1 END)::int as completed_count
      FROM visits
      WHERE ${windowCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get response metrics
    const metricsQuery = `
      SELECT
        COUNT(*)::int as total_requests,
        COUNT(CASE WHEN visit_status = 'new' THEN 1 END)::int as new_count,
        COUNT(CASE WHEN visit_status = 'scheduled' THEN 1 END)::int as scheduled_count,
        COUNT(CASE WHEN visit_status = 'completed' THEN 1 END)::int as completed_count,
        COUNT(CASE WHEN visit_status = 'rejected' THEN 1 END)::int as rejected_count,
        ROUND(
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(CASE WHEN visit_status IN ('scheduled', 'completed') THEN 1 END)::numeric / COUNT(*)::numeric) * 100
          END,
          1
        ) as scheduling_rate,
        ROUND(
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(CASE WHEN visit_status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric) * 100
          END,
          1
        ) as completion_rate,
        ROUND(
          CASE
            WHEN COUNT(CASE WHEN visit_status IN ('scheduled', 'completed') THEN 1 END) = 0 THEN 0
            ELSE (
              COUNT(
                CASE
                  WHEN visit_status IN ('scheduled', 'completed')
                    AND scheduled_date IS NOT NULL
                    AND DATE(created_at) = scheduled_date
                  THEN 1
                END
              )::numeric
              /
              COUNT(CASE WHEN visit_status IN ('scheduled', 'completed') THEN 1 END)::numeric
            ) * 100
          END,
          1
        ) as same_day_scheduling_rate,
        ROUND(
          AVG(
            CASE
              WHEN scheduled_date IS NOT NULL
              THEN EXTRACT(EPOCH FROM ((scheduled_date::timestamp + COALESCE(NULLIF(scheduled_time, ''), '00:00')::time) - created_at)) / 3600
            END
          )::numeric,
          1
        ) as avg_hours_to_schedule
      FROM visits
      WHERE ${windowCondition}
    `;

    const [byProperty, byStatus, timeline, metrics] = await Promise.all([
      dbPool.query(byPropertyQuery),
      dbPool.query(byStatusQuery),
      dbPool.query(timelineQuery),
      dbPool.query(metricsQuery),
    ]);

    return res.json({
      byProperty: byProperty.rows,
      byStatus: byStatus.rows,
      timeline: timeline.rows,
      metrics: metrics.rows[0],
      window: windowFilter === "today" || windowFilter === "7d" || windowFilter === "30d" ? windowFilter : "30d",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to fetch analytics." });
  }
});

router.post("/visits", async (req, res) => {
  const body = req.body as {
    inquiry_id?: number;
    property_id?: number;
    property_title?: string;
    visitor_name?: string;
    visitor_email?: string;
    visitor_phone?: string;
    requested_date?: string;
  };

  if (
    !Number.isFinite(body.property_id) ||
    !body.property_title ||
    !body.visitor_name ||
    !body.visitor_email ||
    !body.visitor_phone
  ) {
    return res.status(400).json({ error: "Missing required fields for visit creation." });
  }

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const insertQuery = `
      INSERT INTO visits (
        inquiry_id,
        property_id,
        property_title,
        visitor_name,
        visitor_email,
        visitor_phone,
        requested_date,
        visit_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
      RETURNING id, created_at
    `;

    const inquiryId = Number.isFinite(body.inquiry_id) ? Number(body.inquiry_id) : Date.now();

    const result = await dbPool.query<{ id: number; created_at: string }>(insertQuery, [
      inquiryId,
      body.property_id,
      body.property_title,
      body.visitor_name,
      body.visitor_email,
      body.visitor_phone,
      body.requested_date || null,
    ]);

    const visit = result.rows[0];
    return res.status(201).json(visit);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to create visit." });
  }
});

router.patch("/visits/:visitId", async (req, res) => {
  const visitId = parseInt(req.params.visitId, 10);
  const body = req.body as {
    visit_status?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    notes?: string;
  };

  if (!Number.isFinite(visitId)) {
    return res.status(400).json({ error: "Invalid visit ID." });
  }

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const existingResult = await dbPool.query<{
      id: number;
      visitor_email: string;
      visitor_name: string;
      property_title: string;
      visit_status: string;
      scheduled_date: string | null;
      scheduled_time: string | null;
    }>(
      `
      SELECT id, visitor_email, visitor_name, property_title, visit_status, scheduled_date, scheduled_time
      FROM visits
      WHERE id = $1
      `,
      [visitId],
    );

    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Visit not found." });
    }

    const existingVisit = existingResult.rows[0];

    if (existingVisit.visit_status === "completed" && body.visit_status === "rejected") {
      return res.status(400).json({ error: "Une visite complétée ne peut plus être annulée." });
    }

    if (body.visit_status === "scheduled" && (!body.scheduled_date || !body.scheduled_time)) {
      return res.status(400).json({ error: "Date et heure sont obligatoires pour planifier une visite." });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.visit_status) {
      updates.push(`visit_status = $${paramIndex}`);
      params.push(body.visit_status);
      paramIndex++;
    }

    if (body.scheduled_date) {
      updates.push(`scheduled_date = $${paramIndex}`);
      params.push(body.scheduled_date);
      paramIndex++;
    }

    if (body.scheduled_time) {
      updates.push(`scheduled_time = $${paramIndex}`);
      params.push(body.scheduled_time);
      paramIndex++;
    }

    if (!body.visit_status && body.scheduled_date && body.scheduled_time) {
      updates.push(`visit_status = $${paramIndex}`);
      params.push("scheduled");
      paramIndex++;
    }

    if (body.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(body.notes);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: "No fields to update." });
    }

    params.push(visitId);
    const updateQuery = `
      UPDATE visits
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await dbPool.query<{
      id: number;
      visitor_email: string;
      visitor_name: string;
      property_title: string;
      visit_status: string;
      scheduled_date: string | null;
      scheduled_time: string | null;
    }>(updateQuery, params);

    if (result.rowCount === 0) return res.status(404).json({ error: "Visit not found." });

    const updatedVisit = result.rows[0];
    const statusChanged = updatedVisit.visit_status !== existingVisit.visit_status;

    if (statusChanged && (updatedVisit.visit_status === "scheduled" || updatedVisit.visit_status === "rejected")) {
      let title = "Mise à jour de votre visite";
      let message = `Votre demande pour \"${updatedVisit.property_title}\" a été mise à jour.`;

      if (updatedVisit.visit_status === "scheduled") {
        const datePart = updatedVisit.scheduled_date
          ? new Date(updatedVisit.scheduled_date).toLocaleDateString("fr-FR")
          : null;
        const timePart = updatedVisit.scheduled_time || null;
        const scheduleText = datePart
          ? ` le ${datePart}${timePart ? ` à ${timePart}` : ""}`
          : "";

        title = "Visite planifiée";
        message = `Votre visite pour \"${updatedVisit.property_title}\" est planifiée${scheduleText}.`;
      }

      if (updatedVisit.visit_status === "rejected") {
        title = "Demande de visite refusée";
        message = `Votre demande de visite pour \"${updatedVisit.property_title}\" n'a pas pu être acceptée pour le moment.`;
      }

      await dbPool.query(
        `
        INSERT INTO notifications (recipient_email, visit_id, type, title, message)
        VALUES ($1, $2, 'visit', $3, $4)
        `,
        [updatedVisit.visitor_email, updatedVisit.id, title, message],
      );
    }

    return res.json(updatedVisit);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to update visit." });
  }
});

router.delete("/visits/:visitId", async (req, res) => {
  const visitId = parseInt(req.params.visitId, 10);

  if (!Number.isFinite(visitId)) {
    return res.status(400).json({ error: "Invalid visit ID." });
  }

  try {
    if (!dbPool) {
      return res.status(500).json({
        error: "Backend DB not configured. Add DATABASE_URL to backend/.env.local and restart backend.",
      });
    }

    const deleteResult = await dbPool.query("DELETE FROM visits WHERE id = $1 RETURNING id", [visitId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: "Visit not found." });
    }

    return res.json({ id: visitId });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to delete visit." });
  }
});

export default router;
