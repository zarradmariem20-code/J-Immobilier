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

const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^paste_/i,
  /^paste-your-/i,
  /^example/i,
  /^pub-xxxx/i,
  /changeme/i,
];

function isPlaceholderValue(value: string) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function getInvalidR2ValueReason(name: string, value: string, env: NodeJS.ProcessEnv) {
  const trimmedValue = value.trim();

  if (isPlaceholderValue(trimmedValue)) {
    return "placeholder";
  }

  if (name === "R2_PUBLIC_URL") {
    if (!/^https:\/\//i.test(trimmedValue)) {
      return "invalid-public-url";
    }

    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return "url";
  }

  if (name === "R2_ACCESS_KEY_ID") {
    if (trimmedValue === env.R2_ACCOUNT_ID?.trim()) {
      return "matches-account-id";
    }

    if (trimmedValue.length < 12) {
      return "too-short";
    }
  }

  if (name === "R2_SECRET_ACCESS_KEY" && trimmedValue.length < 20) {
    return "too-short";
  }

  return null;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const invalidReason = getInvalidR2ValueReason(name, value, process.env);
  if (invalidReason) {
    throw new Error(`Environment variable ${name} is invalid (${invalidReason}).`);
  }

  return value.trim();
}

let cachedConfig: R2Config | null = null;
let cachedClient: S3Client | null = null;

export function isR2Configured() {
  const requiredEntries: Array<[string, string | undefined]> = [
    ["R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET_NAME", process.env.R2_BUCKET_NAME],
    ["R2_PUBLIC_URL", process.env.R2_PUBLIC_URL],
  ];

  return requiredEntries.every(([name, value]) => {
    if (!value?.trim()) {
      return false;
    }

    return !getInvalidR2ValueReason(name, value, process.env);
  });
}

export function getR2ConfigurationIssue() {
  const requiredValues: Record<string, string | undefined> = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  };

  for (const [name, rawValue] of Object.entries(requiredValues)) {
    const value = rawValue?.trim();
    if (!value) {
      return `Le serveur n'a pas la variable ${name}.`;
    }

    const invalidReason = getInvalidR2ValueReason(name, value, process.env);
    if (invalidReason === "placeholder") {
      return `Le serveur utilise encore une valeur de placeholder pour ${name}.`;
    }

    if (invalidReason === "matches-account-id") {
      return `${name} contient actuellement l'Account ID Cloudflare, pas la vraie Access Key.`;
    }

    if (invalidReason === "url") {
      return `${name} contient une URL alors qu'une valeur R2 brute est attendue.`;
    }

    if (invalidReason) {
      return `La variable ${name} est invalide (${invalidReason}).`;
    }
  }

  return null;
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

function buildVideoObjectKey(originalFilename: string) {
  const extension = originalFilename.includes(".")
    ? originalFilename.split(".").pop()?.toLowerCase() || "mp4"
    : "mp4";

  return `videos/${randomUUID()}.${extension}`;
}

export async function generateVideoUploadUrl(originalFilename: string, contentType: string) {
  const config = getR2Config();
  const r2 = getR2Client();
  const key = buildVideoObjectKey(originalFilename);

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

export async function uploadVideoBuffer(originalFilename: string, contentType: string, body: Uint8Array) {
  const config = getR2Config();
  const r2 = getR2Client();
  const key = buildVideoObjectKey(originalFilename);

  await r2.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return {
    publicUrl: `${config.publicUrlBase}/${key}`,
    key,
  };
}

export async function deleteR2Object(key: string) {
  const config = getR2Config();
  const r2 = getR2Client();
  await r2.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
}