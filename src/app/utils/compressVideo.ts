import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.6";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<boolean> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }
  if (ffmpegInstance.loaded) {
    return ffmpegInstance;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm");
      await ffmpegInstance!.load({ coreURL, wasmURL });
      return true;
    })();
  }
  await loadPromise;
  return ffmpegInstance;
}

export type CompressionProgressCallback = (progress: number, stage: string) => void;

const COMPRESS_THRESHOLD_BYTES = 10 * 1024 * 1024;

export async function compressVideo(
  file: File,
  onProgress?: CompressionProgressCallback,
): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES) {
    onProgress?.(100, "Fichier deja compressé");
    return file;
  }

  onProgress?.(0, "Chargement du compresseur...");

  const ffmpeg = await getFFmpeg();

  onProgress?.(5, "Lecture du fichier...");

  const inputName = `input${file.name.substring(file.name.lastIndexOf(".")) || ".mp4"}`;
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.(10, "Compression video...");

  ffmpeg.on("progress", ({ progress }) => {
    const scaled = 10 + Math.round(progress * 80);
    onProgress?.(Math.min(scaled, 90), "Compression video...");
  });

  const exitCode = await ffmpeg.exec([
    "-i",
    inputName,
    "-c:v",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "fast",
    "-vf",
    "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
    "-c:a",
    "aac",
    "-b:a",
    "64k",
    "-movflags",
    "+faststart",
    "-y",
    outputName,
  ]);

  if (exitCode !== 0) {
    throw new Error("La compression video a echoue.");
  }

  onProgress?.(95, "Finalisation...");

  const raw = await ffmpeg.readFile(outputName);
  const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".mp4"), {
    type: "video/mp4",
  });

  onProgress?.(100, "Compression terminee");

  return compressed;
}
