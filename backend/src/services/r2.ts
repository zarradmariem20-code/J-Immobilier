import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

const accountId = getRequiredEnv("R2_ACCOUNT_ID");
const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
const bucketName = getRequiredEnv("R2_BUCKET_NAME");
const publicUrlBase = getRequiredEnv("R2_PUBLIC_URL").replace(/\/$/, "");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function generateVideoUploadUrl(originalFilename: string, contentType: string) {
  const extension = originalFilename.includes(".")
    ? originalFilename.split(".").pop()?.toLowerCase() || "mp4"
    : "mp4";
  const key = `videos/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
  const publicUrl = `${publicUrlBase}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteR2Object(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}