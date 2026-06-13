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
  socialImageUrl?: string;
  gallery?: string[];
  socialGallery?: string[];
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

async function fbCreatePhotoMedia(
  pageId: string, url: string, accessToken: string, published: boolean,
): Promise<string> {
  const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, published, access_token: accessToken }),
  });
  const data = (await resp.json()) as any;
  if (!resp.ok || data.error) {
    throw new Error(data?.error?.message ?? "Facebook photo creation failed.");
  }
  return data.id;
}

async function fbCreateFeedPost(
  pageId: string, caption: string, mediaIds: string[], listingUrl: string, accessToken: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    message: caption,
    access_token: accessToken,
  };
  if (mediaIds.length > 0) {
    body.attached_media = mediaIds.map((id) => ({ media_fbid: id }));
  } else {
    body.link = listingUrl;
  }
  const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await resp.json()) as any;
  if (!resp.ok || data.error) {
    throw new Error(data?.error?.message ?? "Facebook feed post failed.");
  }
  return data.id;
}

export async function postToFacebook(payload: SocialPostPayload): Promise<{ postId: string }> {
  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error("META_PAGE_ID or META_PAGE_ACCESS_TOKEN not configured.");
  }

  const caption = buildCaption(payload);
  const listingUrl = buildListingUrl(payload.propertyId);

  // Video post
  if (payload.videoUrl) {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: payload.videoUrl,
        description: caption,
        access_token: accessToken,
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) {
      throw new Error(data?.error?.message ?? "Facebook video post failed.");
    }
    return { postId: data.id };
  }

  // Multiple images → carousel feed post
  const images = payload.socialGallery?.length
    ? payload.socialGallery
    : payload.socialImageUrl
      ? [payload.socialImageUrl]
      : payload.gallery?.length
        ? payload.gallery
        : payload.imageUrl
          ? [payload.imageUrl]
          : [];

  if (images.length >= 2) {
    const mediaIds: string[] = [];
    for (const url of images.slice(0, 10)) {
      try {
        const id = await fbCreatePhotoMedia(pageId, url, accessToken, false);
        mediaIds.push(id);
      } catch (err) {
        console.error("[social] Failed to create FB media for", url, err);
      }
    }
    if (mediaIds.length > 0) {
      const postId = await fbCreateFeedPost(pageId, caption, mediaIds, listingUrl, accessToken);
      return { postId };
    }
  }

  // Single image → photo post
  if (images.length === 1) {
    const postId = await fbCreatePhotoMedia(pageId, images[0], accessToken, true);
    return { postId };
  }

  // Text + link feed post
  const postId = await fbCreateFeedPost(pageId, caption, [], listingUrl, accessToken);
  return { postId };
}

// ─── Instagram ────────────────────────────────────────────────────────────────

async function igCreateItemContainer(
  igUserId: string, imageUrl: string, accessToken: string,
): Promise<string> {
  const resp = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      is_carousel_item: true,
      access_token: accessToken,
    }),
  });
  const data = (await resp.json()) as any;
  if (!resp.ok || data.error) {
    throw new Error(data?.error?.message ?? "Instagram carousel item creation failed.");
  }
  return data.id;
}

async function igCreateAndPublish(
  igUserId: string, body: Record<string, unknown>, accessToken: string,
): Promise<string> {
  const containerResp = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const containerData = (await containerResp.json()) as any;
  if (!containerResp.ok || containerData.error) {
    throw new Error(containerData?.error?.message ?? "Instagram container creation failed.");
  }

  const publishResp = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: accessToken,
    }),
  });
  const publishData = (await publishResp.json()) as any;
  if (!publishResp.ok || publishData.error) {
    throw new Error(publishData?.error?.message ?? "Instagram media publish failed.");
  }
  return publishData.id;
}

export async function postToInstagram(payload: SocialPostPayload): Promise<{ postId: string }> {
  const igUserId = process.env.META_IG_BUSINESS_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    throw new Error("META_IG_BUSINESS_ID or META_PAGE_ACCESS_TOKEN not configured.");
  }

  const caption = buildCaption(payload);

  // Video post
  if (payload.videoUrl) {
    return igCreateAndPublish(igUserId, {
      media_type: "VIDEO",
      video_url: payload.videoUrl,
      caption,
      access_token: accessToken,
    }, accessToken);
  }

  // Carousel (multiple images)
  const images = payload.socialGallery?.length
    ? payload.socialGallery
    : payload.socialImageUrl
      ? [payload.socialImageUrl]
      : payload.gallery?.length
        ? payload.gallery
        : payload.imageUrl
          ? [payload.imageUrl]
          : [];

  if (images.length >= 2) {
    const children: string[] = [];
    for (const url of images.slice(0, 10)) {
      try {
        const id = await igCreateItemContainer(igUserId, url, accessToken);
        children.push(id);
      } catch (err) {
        console.error("[social] Failed to create IG carousel item for", url, err);
      }
    }
    if (children.length >= 2) {
      return igCreateAndPublish(igUserId, {
        media_type: "CAROUSEL",
        children,
        caption,
        access_token: accessToken,
      }, accessToken);
    }
    if (children.length === 1) {
      images.length = 1; // fall through to single image
    }
  }

  if (!images[0]) {
    throw new Error("Instagram requires an image URL to post.");
  }

  // Single image
  return igCreateAndPublish(igUserId, {
    image_url: images[0],
    caption,
    access_token: accessToken,
  }, accessToken);
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
