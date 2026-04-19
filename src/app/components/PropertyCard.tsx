import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Bed, Bath, Heart, Maximize, MapPin } from "lucide-react";
import { Property } from "../data/properties";
import { formatPrice } from "../utils/format";
import { getFavoriteIds, hasActiveAuthSession, toggleFavoriteId } from "../utils/storage";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVideoBroken, setIsVideoBroken] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const showcaseVideoSrc = property.videoUrl?.trim() || null;
  const fallbackImageSrc = [property.gallery?.[0], property.image]
    .map((item) => item?.trim() || "")
    .find((item) => item.length > 0) || null;

  useEffect(() => {
    setIsFavorite(getFavoriteIds().includes(property.id));
  }, [property.id]);

  useEffect(() => {
    setIsVideoBroken(false);
  }, [showcaseVideoSrc]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverCapability = () => setIsHoverCapable(mediaQuery.matches);

    updateHoverCapability();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateHoverCapability);
      return () => mediaQuery.removeEventListener("change", updateHoverCapability);
    }

    mediaQuery.addListener(updateHoverCapability);
    return () => mediaQuery.removeListener(updateHoverCapability);
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.6);
      },
      {
        threshold: [0.25, 0.6, 0.85],
      }
    );

    observer.observe(article);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showcaseVideoSrc || isVideoBroken) {
      return;
    }

    const shouldPlay = isHoverCapable ? isHovered : isVisible;

    if (shouldPlay) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Ignore autoplay interruptions from the browser.
        });
      }
      return;
    }

    video.pause();
  }, [isHoverCapable, isHovered, isVisible, isVideoBroken, showcaseVideoSrc]);

  const shouldPlayVideo = Boolean(showcaseVideoSrc && !isVideoBroken && (isHoverCapable ? isHovered : isVisible));

  const handleFavoriteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!(await hasActiveAuthSession())) {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "login" } }));
      return;
    }

    setIsFavorite(toggleFavoriteId(property.id).includes(property.id));
  };

  return (
    <article
      ref={articleRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group overflow-hidden rounded-[20px] border border-white/60 bg-white shadow-[0_18px_34px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:rounded-[28px]"
    >
      <div className="relative h-64 overflow-hidden sm:h-64 lg:h-80">
        <Link to={`/property/${property.id}`} target="_blank" rel="noopener noreferrer">
          {showcaseVideoSrc && !isVideoBroken ? (
            <video
              ref={videoRef}
              src={showcaseVideoSrc}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loop
              muted
              playsInline
              preload="metadata"
              onLoadedData={(event) => {
                const video = event.currentTarget;
                if (!shouldPlayVideo && video.currentTime === 0) {
                  try {
                    video.currentTime = 0.05;
                  } catch {
                    // Ignore browsers that disallow seeking before enough data is buffered.
                  }
                }
              }}
              onError={() => setIsVideoBroken(true)}
            >
              Votre navigateur ne peut pas lire cette vidéo.
            </video>
          ) : fallbackImageSrc ? (
            <img
              src={fallbackImageSrc}
              alt={property.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-sm font-semibold text-slate-500">
              Aucun aperçu disponible
            </div>
          )}
        </Link>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5 sm:p-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <div className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3 sm:text-xs sm:tracking-[0.18em] ${property.transactionType === "Location" ? "bg-amber-300 text-slate-950" : "bg-emerald-300 text-slate-950"}`}>
              {property.transactionType}
            </div>
          </div>
          <button
            type="button"
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            onClick={handleFavoriteClick}
            className={`rounded-full p-2.5 backdrop-blur transition sm:p-3 ${
              isFavorite
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "bg-white/90 text-slate-700 hover:bg-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
      <div className="p-2.5 sm:p-5">
        <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-1.5">
          <Link to={`/property/${property.id}`} className="min-w-0 pr-0 sm:pr-4" target="_blank" rel="noopener noreferrer">
            <h3 className="line-clamp-1 min-h-[1.25rem] text-sm font-semibold leading-tight text-slate-950 sm:line-clamp-2 sm:min-h-[3.5rem] sm:text-xl">{property.title}</h3>
          </Link>
          <p className="shrink-0 whitespace-nowrap text-left text-sm font-bold text-sky-700 sm:text-right sm:text-lg">
            {formatPrice(property.price, property.transactionType)}
          </p>
        </div>
        <div className="mb-1.5 flex items-center gap-1 text-slate-500 sm:mb-3">
          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="line-clamp-1 text-[11px] sm:text-sm">{property.location}</span>
        </div>
        <p className="mb-1.5 line-clamp-1 text-[11px] leading-4 text-slate-600 sm:mb-3 sm:line-clamp-2 sm:text-sm sm:leading-6">{property.description}</p>
        <div className="flex w-full items-center justify-center text-slate-700">
          <div className="flex flex-1 items-center justify-center gap-1">
            <Bed className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[11px] sm:text-sm">{property.bedrooms} Ch.</span>
          </div>
          <span className="px-1 text-slate-300 sm:px-2">|</span>
          <div className="flex flex-1 items-center justify-center gap-1">
            <Bath className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[11px] sm:text-sm">{property.bathrooms} SdB</span>
          </div>
          <span className="px-1 text-slate-300 sm:px-2">|</span>
          <div className="flex flex-1 items-center justify-center gap-1">
            <Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[11px] sm:text-sm">{property.area} m²</span>
          </div>
        </div>
        <Link
          to={`/property/${property.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700 sm:mt-4 sm:w-auto sm:px-4 sm:text-sm"
        >
          Voir le détail
        </Link>
      </div>
    </article>
  );
}