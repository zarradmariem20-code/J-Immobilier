import { execFile } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpegStatic: string | null = require("ffmpeg-static");

function getFfmpegPath(): string {
  if (!ffmpegStatic) {
    throw new Error("FFmpeg binary not available. Install ffmpeg-static package.");
  }
  return ffmpegStatic;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    execFile(ffmpegPath, args, { timeout: 60_000 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`FFmpeg failed: ${error.message}\n${stderr}`));
        return;
      }
      resolve();
    });
  });
}

export async function generateVideoPreview(inputBuffer: Buffer, originalFilename: string): Promise<Buffer> {
  const ext = originalFilename.includes(".")
    ? originalFilename.split(".").pop()?.toLowerCase() || "mp4"
    : "mp4";

  const tmpInput = join(tmpdir(), `vid-in-${Date.now()}.${ext}`);
  const tmpOutput = join(tmpdir(), `vid-out-${Date.now()}.webm`);

  try {
    await writeFile(tmpInput, inputBuffer);

    await runFfmpeg([
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
    ]);

    const outputBuffer = await readFile(tmpOutput);
    return outputBuffer;
  } finally {
    await unlink(tmpInput).catch(() => {});
    await unlink(tmpOutput).catch(() => {});
  }
}
