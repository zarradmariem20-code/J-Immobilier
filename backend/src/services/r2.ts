import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrlBase: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

let cachedConfig: R2Config | null = null;
let cachedClient: S3Client | null = null;

export function isR2Configured() {
  return [
    process.env.R2_ACCOUNT_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.R2_BUCKET_NAME,
    process.env.R2_PUBLIC_URL,
  ].every((value) => Boolean(value?.trim()));
}

function getR2Config(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    accountId: getRequiredEnv("R2_ACCOUNT_ID"),
    accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: getRequiredEnv("R2_BUCKET_NAME"),
    publicUrlBase: getRequiredEnv("R2_PUBLIC_URL").replace(/\/$/, ""),
  };

  return cachedConfig;
}

function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export async function generateVideoUploadUrl(originalFilename: string, contentType: string) {
  const config = getR2Config();
  const r2 = getR2Client();
  const extension = originalFilename.includes(".")
    ? originalFilename.split(".").pop()?.toLowerCase() || "mp4"
    : "mp4";
  const key = `videos/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
  const publicUrl = `${config.publicUrlBase}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteR2Object(key: string) {
  const config = getR2Config();
  const r2 = getR2Client();
  await r2.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
}