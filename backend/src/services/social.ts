/**
 * Social media posting service.
 * Supports Facebook (Graph API), Instagram (Graph API via FB page), and TikTok (Content Posting API).
 *
 * Required environment variables in backend/.env.local:
 *   META_PAGE_ACCESS_TOKEN  – long-lived page access token
 *   META_PAGE_ID            – numeric Facebook page ID
 *   META_IG_BUSINESS_ID     – Instagram Business account ID (linked to the page)
 *   TIKTOK_ACCESS_TOKEN     – TikTok for Business access token
 */

export interface SocialPostPayload {
  title: string;
  description: string | null;
  price: number;
  transactionType: string;
  propertyType: string;
  location: string;
  imageUrl?: string;
  videoUrl?: string;
  propertyId: number;
}

export interface SocialPostOptions {
  postToFacebook?: boolean;
  postToInstagram?: boolean;
  postToTikTok?: boolean;
}

export interface SocialPostResults {
  facebook?: { success: boolean; postId?: string; error?: string };
  instagram?: { success: boolean; postId?: string; error?: string };
  tiktok?: { success: boolean; postId?: string; error?: string };
}

function buildListingUrl(propertyId: number): string {
  const base = (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
  return `${base}/property/${propertyId}`;
}

function buildCaption(payload: SocialPostPayload): string {
  const priceLabel =
    payload.transactionType === "Location"
      ? `${payload.price.toLocaleString("fr-TN")} TND/mois`
      : `${payload.price.toLocaleString("fr-TN")} TND`;

  const listingUrl = buildListingUrl(payload.propertyId);

  const parts: string[] = [
    `🏠 ${payload.title}`,
    `💰 Prix : ${priceLabel}`,
    `📍 ${payload.location}`,
  ];

  if (payload.description) {
    parts.push(`\n${payload.description.slice(0, 300)}`);
  }

  parts.push(`\n🔗 ${listingUrl}`);

  const typeTag = payload.propertyType.toLowerCase().replace(/\s+/g, "");
  const locationTag = payload.location.split(",")[0].trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  parts.push(`\n#immobilier #tunisie #${typeTag}${locationTag ? ` #${locationTag}` : ""}`);

  return parts.join("\n");
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

export async function postToFacebook(payload: SocialPostPayload): Promise<{ postId: string }> {
  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error("META_PAGE_ID or META_PAGE_ACCESS_TOKEN not configured.");
  }

  const caption = buildCaption(payload);
  const listingUrl = buildListingUrl(payload.propertyId);

  if (payload.imageUrl) {
    // Photo post via /photos — published to the feed automatically
    const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: payload.imageUrl,
        caption,
        access_token: accessToken,
      }),
    });

    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) {
      throw new Error(data?.error?.message ?? "Facebook photo post failed.");
    }

    return { postId: data.post_id ?? data.id };
  }

  // Text + link feed post (no image available)
  const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      link: listingUrl,
      access_token: accessToken,
    }),
  });

  const data = (await resp.json()) as any;
  if (!resp.ok || data.error) {
    throw new Error(data?.error?.message ?? "Facebook feed post failed.");
  }

  return { postId: data.id };
}

// ─── Instagram ────────────────────────────────────────────────────────────────

export async function postToInstagram(payload: SocialPostPayload): Promise<{ postId: string }> {
  const igUserId = process.env.META_IG_BUSINESS_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    throw new Error("META_IG_BUSINESS_ID or META_PAGE_ACCESS_TOKEN not configured.");
  }

  if (!payload.imageUrl) {
    throw new Error("Instagram requires an image URL to post.");
  }

  const caption = buildCaption(payload);

  // Step 1: create a media container
  const containerResp = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: payload.imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  const containerData = (await containerResp.json()) as any;
  if (!containerResp.ok || containerData.error) {
    throw new Error(containerData?.error?.message ?? "Instagram media container creation failed.");
  }

  const creationId = containerData.id as string;

  // Step 2: publish the container
  const publishResp = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });

  const publishData = (await publishResp.json()) as any;
  if (!publishResp.ok || publishData.error) {
    throw new Error(publishData?.error?.message ?? "Instagram media publish failed.");
  }

  return { postId: publishData.id };
}

// ─── TikTok ───────────────────────────────────────────────────────────────────

export async function postToTikTok(payload: SocialPostPayload): Promise<{ postId: string }> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("TIKTOK_ACCESS_TOKEN not configured.");
  }

  const caption = buildCaption(payload);

  if (payload.videoUrl) {
    // Video post via PULL_FROM_URL (TikTok Content Posting API v2)
    const resp = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        post_info: {
          title: payload.title.slice(0, 150),
          description: caption.slice(0, 2200),
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: payload.videoUrl,
        },
      }),
    });

    const data = (await resp.json()) as any;
    if (!resp.ok || data.error?.code !== "ok") {
      throw new Error(data?.error?.message ?? "TikTok video post failed.");
    }

    return { postId: data.data?.publish_id ?? "unknown" };
  }

  if (payload.imageUrl) {
    // Photo post via Content Posting API
    const resp = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        post_info: {
          title: payload.title.slice(0, 150),
          description: caption.slice(0, 2200),
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: [payload.imageUrl],
          photo_cover_index: 0,
          media_type: "PHOTO",
        },
      }),
    });

    const data = (await resp.json()) as any;
    if (!resp.ok || data.error?.code !== "ok") {
      throw new Error(data?.error?.message ?? "TikTok photo post failed.");
    }

    return { postId: data.data?.publish_id ?? "unknown" };
  }

  throw new Error("TikTok requires an image or video URL to post.");
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export async function postListingToSocial(
  payload: SocialPostPayload,
  options: SocialPostOptions,
): Promise<SocialPostResults> {
  const results: SocialPostResults = {};
  const tasks: Promise<void>[] = [];

  if (options.postToFacebook) {
    tasks.push(
      postToFacebook(payload)
        .then((r) => {
          results.facebook = { success: true, postId: r.postId };
        })
        .catch((err: unknown) => {
          results.facebook = { success: false, error: (err as Error)?.message ?? "Unknown error" };
          console.error("[social] Facebook post failed:", err);
        }),
    );
  }

  if (options.postToInstagram) {
    tasks.push(
      postToInstagram(payload)
        .then((r) => {
          results.instagram = { success: true, postId: r.postId };
        })
        .catch((err: unknown) => {
          results.instagram = { success: false, error: (err as Error)?.message ?? "Unknown error" };
          console.error("[social] Instagram post failed:", err);
        }),
    );
  }

  if (options.postToTikTok) {
    tasks.push(
      postToTikTok(payload)
        .then((r) => {
          results.tiktok = { success: true, postId: r.postId };
        })
        .catch((err: unknown) => {
          results.tiktok = { success: false, error: (err as Error)?.message ?? "Unknown error" };
          console.error("[social] TikTok post failed:", err);
        }),
    );
  }

  await Promise.all(tasks);
  return results;
}
