import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bed, Bath, Heart, Maximize, MapPin, PlayCircle } from "lucide-react";
import { Property } from "../data/properties";
import { formatPrice } from "../utils/format";
import { getFavoriteIds, isUserLoggedIn, toggleFavoriteId } from "../utils/storage";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVideoBroken, setIsVideoBroken] = useState(false);
  const showcaseVideoSrc = property.videoUrl?.trim() || null;
  const highlightBadges = Array.from(new Set([...(property.tags ?? []), ...(property.features ?? [])])).slice(0, 3);

  useEffect(() => {
    setIsFavorite(getFavoriteIds().includes(property.id));
  }, [property.id]);

  useEffect(() => {
    setIsVideoBroken(false);
  }, [showcaseVideoSrc]);

  const handleFavoriteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isUserLoggedIn()) {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "login" } }));
      return;
    }

    setIsFavorite(toggleFavoriteId(property.id).includes(property.id));
  };

  return (
    <article className="group overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
      <div className="relative h-64 overflow-hidden sm:h-80">
        <Link to={`/property/${property.id}`} target="_blank" rel="noopener noreferrer">
          {showcaseVideoSrc && !isVideoBroken ? (
            <video
              key={showcaseVideoSrc}
              src={showcaseVideoSrc}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              onError={() => setIsVideoBroken(true)}
            >
              Votre navigateur ne peut pas lire cette vidéo.
            </video>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center text-sm font-semibold text-white">
              <PlayCircle className="h-8 w-8 text-sky-300" />
              <span>Vidéo indisponible</span>
            </div>
          )}
        </Link>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="flex flex-wrap gap-2">
            <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${property.transactionType === "Location" ? "bg-amber-300 text-slate-950" : "bg-emerald-300 text-slate-950"}`}>
              {property.transactionType}
            </div>
          </div>
          <button
            type="button"
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            onClick={handleFavoriteClick}
            className={`rounded-full p-3 backdrop-blur transition ${
              isFavorite
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                : "bg-white/90 text-slate-700 hover:bg-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-1.5 flex items-start justify-between">
          <Link to={`/property/${property.id}`} className="pr-4" target="_blank" rel="noopener noreferrer">
            <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-tight text-slate-950">{property.title}</h3>
          </Link>
          <p className="shrink-0 whitespace-nowrap text-right text-lg font-bold text-sky-700">
            {formatPrice(property.price, property.transactionType)}
          </p>
        </div>
        <div className="mb-3 flex items-center gap-1 text-slate-500">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{property.location}</span>
        </div>
        <p className="mb-3 line-clamp-1 text-sm leading-6 text-slate-600">{property.description}</p>
        {highlightBadges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {highlightBadges.map((badge) => (
              <span key={badge} className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="flex w-full items-center justify-center text-slate-700">
          <div className="flex flex-1 items-center justify-center gap-1.5">
            <Bed className="h-4 w-4" />
            <span className="text-sm">{property.bedrooms} Ch.</span>
          </div>
          <span className="px-2 text-slate-300">|</span>
          <div className="flex flex-1 items-center justify-center gap-1.5">
            <Bath className="h-4 w-4" />
            <span className="text-sm">{property.bathrooms} SdB</span>
          </div>
          <span className="px-2 text-slate-300">|</span>
          <div className="flex flex-1 items-center justify-center gap-1.5">
            <Maximize className="h-4 w-4" />
            <span className="text-sm">{property.area} m²</span>
          </div>
        </div>
        <Link
          to={`/property/${property.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
        >
          Voir le détail
        </Link>
      </div>
    </article>
  );
}