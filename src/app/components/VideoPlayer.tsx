import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  label: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  startMuted?: boolean;
  preload?: "none" | "metadata" | "auto";
  fit?: "contain" | "cover";
  onAspectRatioChange?: (ratio: number | null) => void;
  onError?: () => void;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const safeSeconds = Math.floor(seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export function VideoPlayer({
  src,
  poster,
  label,
  className,
  autoPlay = true,
  loop = true,
  startMuted = true,
  preload = "metadata",
  fit = "contain",
  onAspectRatioChange,
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(startMuted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const objectFitClass = useMemo(() => (fit === "cover" ? "object-cover" : "object-contain"), [fit]);

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current !== null) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimer();
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2200);
  }, [clearHideControlsTimer]);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = isMuted;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        setIsPlaying(false);
      });
    }
  }, [isMuted]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      setShowControls(true);
      scheduleHideControls();
      attemptPlay();
      return;
    }

    video.pause();
    setShowControls(true);
    clearHideControlsTimer();
  }, [attemptPlay, clearHideControlsTimer, scheduleHideControls]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const enterFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const fullscreenVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => Promise<void>;
    };

    if (fullscreenVideo.requestFullscreen) {
      fullscreenVideo.requestFullscreen().catch(() => {});
      return;
    }

    if (fullscreenVideo.webkitRequestFullscreen) {
      fullscreenVideo.webkitRequestFullscreen().catch(() => {});
      return;
    }

    fullscreenVideo.webkitEnterFullscreen?.();
  }, []);

  useEffect(() => {
    setIsMuted(startMuted);
    setIsPlaying(false);
    setIsBuffering(true);
    setDuration(0);
    setCurrentTime(0);
    setShowControls(true);
    onAspectRatioChange?.(null);
    clearHideControlsTimer();
  }, [clearHideControlsTimer, onAspectRatioChange, src, startMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) {
      return;
    }

    const handleReady = () => {
      attemptPlay();
    };

    if (video.readyState >= 2) {
      attemptPlay();
    }

    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);

    return () => {
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
    };
  }, [attemptPlay, autoPlay, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => () => clearHideControlsTimer(), [clearHideControlsTimer]);

  return (
    <div
      className={`group relative h-full w-full overflow-hidden rounded-[inherit] bg-slate-950 ${className ?? ""}`}
      onPointerMove={() => {
        setShowControls(true);
        if (isPlaying) {
          scheduleHideControls();
        }
      }}
      onPointerDown={() => {
        setShowControls(true);
        clearHideControlsTimer();
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className={`block h-full w-full ${objectFitClass}`}
        aria-label={label}
        poster={poster}
        loop={loop}
        muted={isMuted}
        playsInline
        preload={preload}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        onClick={togglePlayback}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(video.duration || 0);
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            onAspectRatioChange?.(video.videoWidth / video.videoHeight);
          }
        }}
        onLoadedData={() => {
          setIsBuffering(false);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setShowControls(true);
          scheduleHideControls();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          clearHideControlsTimer();
        }}
        onWaiting={() => {
          setIsBuffering(true);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          scheduleHideControls();
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onDurationChange={(event) => {
          setDuration(event.currentTarget.duration || 0);
        }}
        onError={() => {
          setIsBuffering(false);
          setIsPlaying(false);
          onError?.();
        }}
      >
        Votre navigateur ne peut pas lire cette vidéo.
      </video>

      {isBuffering ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/12 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/72 px-3 py-2 text-sm font-medium text-white shadow-lg">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={togglePlayback}
        className={`absolute inset-0 z-10 transition ${showControls ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-label={isPlaying ? "Mettre en pause" : "Lire la vidéo"}
      >
        <span className="sr-only">{isPlaying ? "Mettre en pause" : "Lire la vidéo"}</span>
      </button>

      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/88 via-slate-950/36 to-transparent px-3 pb-3 pt-12 transition-opacity duration-200 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-sm transition hover:bg-white/24"
            aria-label={isPlaying ? "Mettre en pause" : "Lire la vidéo"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                const video = videoRef.current;
                if (!video) {
                  return;
                }
                const nextTime = Number(event.target.value);
                video.currentTime = nextTime;
                setCurrentTime(nextTime);
                setShowControls(true);
              }}
              className="h-2 w-full cursor-pointer accent-sky-500"
              aria-label="Progression de la vidéo"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-white/82">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-sm transition hover:bg-white/24"
            aria-label={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={enterFullscreen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur-sm transition hover:bg-white/24"
            aria-label="Ouvrir en plein écran"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}