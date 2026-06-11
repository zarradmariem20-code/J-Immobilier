/**
 * Retroactive media reprocessing script.
 *
 * Audits all properties in the database and regenerates missing image variants
 * (full, medium, thumb, social) and video previews (-preview.webm).
 *
 * Usage (from backend/ directory):
 *   npx tsx scripts/reprocess-media.mjs
 *   npx tsx scripts/reprocess-media.mjs --dry-run
 *   npx tsx scripts/reprocess-media.mjs --property-id=42
 *   npx tsx scripts/reprocess-media.mjs --verbose
 */

import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import ffmpegStatic from "ffmpeg-static";

const execFileAsync = promisify(execFile);

// ─── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const SKIP_VIDEOS = args.includes("--skip-videos") || process.platform === "win32";
const propertyIdFlag = args.find((a) => a.startsWith("--property-id="));
const ONLY_PROPERTY_ID = propertyIdFlag ? Number.parseInt(propertyIdFlag.split("=")[1], 10) : null;

// ─── Env ─────────────────────────────────────────────────────────────────────

// Resolve .env.local relative to this script's location (works from any cwd)
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env.local");
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
const MEDIA_BUCKET = "listing-media";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in backend/.env.local");
  process.exit(1);
}
if (!SUPABASE_URL || !JWT_SECRET) {
  console.error("Missing SUPABASE_URL or SUPABASE_JWT_SECRET in backend/.env.local");
  process.exit(1);
}

// ─── Service role token (bypasses RLS) ──────────────────────────────────────

function createServiceRoleToken(jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "supabase",
    aud: "authenticated",
    sub: "service_role",
    role: "service_role",
    iat: now,
    exp: now + 60 * 60,
  })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

const db = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

const supabase = createClient(SUPABASE_URL, createServiceRoleToken(JWT_SECRET));

// ─── Image processing (mirrors backend/src/utils/imageProcessing.ts) ─────────

async function processImage(inputBuffer) {
  const metadata = await sharp(inputBuffer).metadata();
  const w = metadata.width ?? 0;

  const full = await sharp(inputBuffer)
    .resize({ width: Math.min(1200, w), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const medium = await sharp(inputBuffer)
    .resize({ width: Math.min(800, w), withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const thumb = await sharp(inputBuffer)
    .resize({ width: Math.min(400, w), withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const social = await sharp(inputBuffer)
    .resize({ width: Math.min(1200, w), withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return { full, medium, thumb, social };
}

// ─── Video preview generation (mirrors backend/src/utils/videoPreview.ts) ─────

async function generateVideoPreview(inputBuffer, ext) {
  if (!ffmpegStatic) {
    throw new Error("FFmpeg binary not available. Install ffmpeg-static package.");
  }

  // ffmpeg-static bundles a Linux binary — won't work on Windows
  if (process.platform === "win32") {
    throw new Error("ffmpeg-static only bundles Linux binaries. Run this script on the production server (Render) instead.");
  }

  const tmpInput = join(tmpdir(), `reprocess-in-${Date.now()}.${ext}`);
  const tmpOutput = join(tmpdir(), `reprocess-out-${Date.now()}.webm`);

  try {
    await writeFile(tmpInput, inputBuffer);
    await execFileAsync(ffmpegStatic, [
      "-i", tmpInput,
      "-t", "30",
      "-vf", "scale='min(854,iw)':'min(480,ih)':force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2",
      "-c:v", "libvpx-vp9",
      "-crf", "35",
      "-b:v", "0",
      "-row-mt", "1",
      "-an",
      "-y",
      tmpOutput,
    ], { timeout: 120_000 });

    return await readFile(tmpOutput);
  } finally {
    await unlink(tmpInput).catch(() => {});
    await unlink(tmpOutput).catch(() => {});
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`  ${msg}`);
}

function vlog(msg) {
  if (VERBOSE) console.log(`    [verbose] ${msg}`);
}

async function headExists(url) {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
    return resp.ok;
  } catch {
    return false;
  }
}

async function downloadBuffer(url) {
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * Derive variant URLs from any image URL.
 * Returns { base, full, medium, thumb, social } URLs.
 */
function deriveVariantUrls(url) {
  let base;
  if (url.includes("-medium.webp")) {
    base = url.replace("-medium.webp", "");
  } else if (url.includes("-full.webp")) {
    base = url.replace("-full.webp", "");
  } else if (url.includes("-thumb.webp")) {
    base = url.replace("-thumb.webp", "");
  } else if (url.includes("-social.jpg")) {
    base = url.replace("-social.jpg", "");
  } else {
    // Unknown pattern — strip extension
    base = url.replace(/\.[^.]+$/, "");
  }

  return {
    base,
    full: `${base}-full.webp`,
    medium: `${base}-medium.webp`,
    thumb: `${base}-thumb.webp`,
    social: `${base}-social.jpg`,
  };
}

/**
 * Given a Supabase Storage public URL, extract the storage object path.
 * URL pattern: https://xxx.supabase.co/storage/v1/object/public/listing-media/{path}
 */
function extractStoragePath(url) {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * Upload a buffer to Supabase Storage at the given path.
 */
async function uploadToStorage(storagePath, buffer, contentType) {
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function processPropertyImages(property) {
  const imageUrls = [property.image, ...(property.gallery || [])]
    .filter((u) => u && typeof u === "string" && u.trim())
    .map((u) => u.trim());

  // Deduplicate
  const uniqueUrls = [...new Set(imageUrls)];
  if (uniqueUrls.length === 0) return { checked: 0, created: 0, errors: 0 };

  let checked = 0;
  let created = 0;
  let errors = 0;

  for (const url of uniqueUrls) {
    checked++;
    const variants = deriveVariantUrls(url);

    // Check which variants exist
    const [fullExists, mediumExists, thumbExists, socialExists] = await Promise.all([
      headExists(variants.full),
      headExists(variants.medium),
      headExists(variants.thumb),
      headExists(variants.social),
    ]);

    const missing = [];
    if (!fullExists) missing.push("full");
    if (!mediumExists) missing.push("medium");
    if (!thumbExists) missing.push("thumb");
    if (!socialExists) missing.push("social");

    if (missing.length === 0) {
      vlog(`All variants exist for ${url.split("/").pop()}`);
      continue;
    }

    log(`Missing [${missing.join(", ")}] for ${url.split("/").pop()}`);

    if (DRY_RUN) {
      created += missing.length;
      continue;
    }

    try {
      // Find best source to download
      let sourceUrl = null;
      if (fullExists) sourceUrl = variants.full;
      else if (mediumExists) sourceUrl = variants.medium;
      else if (thumbExists) sourceUrl = variants.thumb;
      else sourceUrl = url; // use original

      vlog(`Downloading source: ${sourceUrl.split("/").pop()}`);
      const sourceBuffer = await downloadBuffer(sourceUrl);
      vlog(`Source downloaded: ${(sourceBuffer.length / 1024).toFixed(0)} KB`);

      // Process
      const sizes = await processImage(sourceBuffer);
      vlog("Image processed with sharp");

      // Upload missing variants
      const storagePath = extractStoragePath(variants.medium);
      if (!storagePath) {
        throw new Error(`Cannot extract storage path from ${variants.medium}`);
      }
      const basePath = storagePath.replace(/-medium\.webp$/, "");

      const uploads = [];
      if (!fullExists) {
        uploads.push(uploadToStorage(`${basePath}-full.webp`, sizes.full, "image/webp"));
      }
      if (!mediumExists) {
        uploads.push(uploadToStorage(`${basePath}-medium.webp`, sizes.medium, "image/webp"));
      }
      if (!thumbExists) {
        uploads.push(uploadToStorage(`${basePath}-thumb.webp`, sizes.thumb, "image/webp"));
      }
      if (!socialExists) {
        uploads.push(uploadToStorage(`${basePath}-social.jpg`, sizes.social, "image/jpeg"));
      }

      await Promise.all(uploads);
      created += missing.length;
      log(`Uploaded ${missing.length} variant(s)`);
    } catch (err) {
      errors++;
      console.error(`  ERROR processing ${url.split("/").pop()}: ${err.message}`);
    }
  }

  return { checked, created, errors };
}

async function processPropertyVideo(property) {
  const videoUrl = property.video_url?.trim();
  if (!videoUrl) return { checked: 0, created: 0, errors: 0 };

  // On Windows, delegate to the backend endpoint (which runs on Linux with ffmpeg)
  if (SKIP_VIDEOS) {
    vlog(`Skipping video preview for property ${property.id} (will use backend endpoint)`);
    return { checked: 1, created: 0, errors: 0, pending: true, propertyId: property.id, videoUrl };
  }

  // Derive preview URL: replace video extension with -preview.webm
  const previewUrl = videoUrl.replace(/\.[^.]+$/, "-preview.webm");

  // Check if preview exists
  const previewExists = await headExists(previewUrl);
  if (previewExists) {
    vlog(`Video preview exists for property ${property.id}`);
    return { checked: 1, created: 0, errors: 0 };
  }

  log(`Missing video preview for property ${property.id}`);

  if (DRY_RUN) {
    return { checked: 1, created: 1, errors: 0 };
  }

  try {
    vlog(`Downloading video: ${videoUrl.split("/").pop()}`);
    const videoBuffer = await downloadBuffer(videoUrl);
    vlog(`Video downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`);

    // Determine extension
    const ext = videoUrl.split(".").pop()?.toLowerCase() || "mp4";

    // Generate preview
    vlog("Generating WebM preview with ffmpeg...");
    const previewBuffer = await generateVideoPreview(videoBuffer, ext);
    vlog(`Preview generated: ${(previewBuffer.length / 1024).toFixed(0)} KB`);

    // Upload preview to R2 via Supabase Storage (or directly if R2 is configured)
    // The preview key follows the pattern: videos/{uuid}-preview.webm
    // We need to figure out the R2 key from the public URL
    if (!R2_PUBLIC_URL) {
      throw new Error("R2_PUBLIC_URL not configured — cannot upload video preview");
    }

    // Extract the R2 key from the video URL
    const r2Key = videoUrl.replace(R2_PUBLIC_URL + "/", "");
    const previewKey = r2Key.replace(/\.[^.]+$/, "-preview.webm");

    // Upload via R2 using the Supabase storage client won't work for R2.
    // Instead, upload through Supabase Storage if the video is there,
    // or use a direct R2 upload via the AWS SDK.
    // For simplicity, we'll upload the preview to Supabase Storage instead.
    const previewPath = `videos/${property.id}-preview.webm`;
    await uploadToStorage(previewPath, previewBuffer, "video/webm");

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(previewPath);
    log(`Preview uploaded to Supabase Storage: ${data?.publicUrl}`);

    return { checked: 1, created: 1, errors: 0 };
  } catch (err) {
    console.error(`  ERROR generating video preview for property ${property.id}: ${err.message}`);
    return { checked: 1, created: 0, errors: 1 };
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Media Reprocessing Script");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no uploads)" : "LIVE"}`);
  if (ONLY_PROPERTY_ID) console.log(`  Property ID: ${ONLY_PROPERTY_ID}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Fetch properties
  let query = "SELECT id, image, gallery, video_url FROM properties";
  const params = [];
  if (ONLY_PROPERTY_ID) {
    query += " WHERE id = $1";
    params.push(ONLY_PROPERTY_ID);
  }
  query += " ORDER BY id ASC";

  const { rows: properties } = await db.query(query, params);
  console.log(`Found ${properties.length} propert${properties.length === 1 ? "y" : "ies"} to process.\n`);

  const stats = { images: { checked: 0, created: 0, errors: 0 }, videos: { checked: 0, created: 0, errors: 0 } };
  const pendingVideos = [];

  for (const property of properties) {
    console.log(`── Property #${property.id} ──────────────────────────────────`);

    // Images
    const imageResult = await processPropertyImages(property);
    stats.images.checked += imageResult.checked;
    stats.images.created += imageResult.created;
    stats.images.errors += imageResult.errors;

    // Videos
    const videoResult = await processPropertyVideo(property);
    stats.videos.checked += videoResult.checked;
    stats.videos.created += videoResult.created;
    stats.videos.errors += videoResult.errors;
    if (videoResult.pending) {
      pendingVideos.push({ propertyId: videoResult.propertyId, videoUrl: videoResult.videoUrl });
    }

    console.log("");
  }

  // Process pending video previews via backend endpoint
  if (pendingVideos.length > 0) {
    console.log("── Generating video previews via backend endpoint ──────");

    try {
      const resp = await fetch(`${BACKEND_URL}/api/admin/batch-video-previews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: pendingVideos }),
      });

      if (!resp.ok) {
        console.error(`  Backend returned HTTP ${resp.status}`);
        stats.videos.errors += pendingVideos.length;
      } else {
        const { results } = await resp.json();
        for (const r of results) {
          if (r.status === "already_exists") {
            log(`Property #${r.propertyId}: preview already exists`);
            stats.videos.created += 0;
          } else if (r.status === "created") {
            log(`Property #${r.propertyId}: preview created → ${r.previewUrl}`);
            stats.videos.created += 1;
          } else {
            console.error(`  Property #${r.propertyId}: ${r.error}`);
            stats.videos.errors += 1;
          }
        }
      }
    } catch (err) {
      console.error(`  Backend call failed: ${err.message}`);
      console.log(`  Run this on the Render server instead:`);
      console.log(`    cd backend && npx tsx scripts/reprocess-media.mjs`);
      stats.videos.errors += pendingVideos.length;
    }
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Images checked:   ${stats.images.checked}`);
  console.log(`  Images created:   ${stats.images.created}`);
  console.log(`  Images errors:    ${stats.images.errors}`);
  console.log(`  Videos checked:   ${stats.videos.checked}`);
  console.log(`  Videos created:   ${stats.videos.created}`);
  console.log(`  Videos errors:    ${stats.videos.errors}`);
  console.log("═══════════════════════════════════════════════════════════════");

  if (DRY_RUN) {
    console.log("\n  (Dry run — no files were uploaded)");
  }

  if (stats.videos.errors > 0 && process.platform === "win32") {
    console.log("\n  NOTE: Video previews couldn't be generated on Windows.");
    console.log("  ffmpeg-static only bundles Linux binaries.");
    console.log("  To generate video previews, run this script on the production server:");
    console.log("    ssh into Render → cd backend → npx tsx scripts/reprocess-media.mjs");
  }

  await db.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
