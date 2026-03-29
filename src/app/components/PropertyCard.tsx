import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bed, Bath, Heart, Maximize, MapPin } from "lucide-react";
import { Property } from "../data/properties";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatPrice } from "../utils/format";
import { getFavoriteIds, isUserLoggedIn, toggleFavoriteId } from "../utils/storage";
import showcaseVideo from "../../assets/AQNXnnPnKdMQ5estjhWkd2IhZaaZUHAtL8ze9gnFvSqh433mUscb0yB9S4Q55Hlyye5VU9-jXyE7nhUVsrLwPLB9rtniZUy_xRrGkMY.mp4";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const showcaseVideoSrc = property.id === 1 ? showcaseVideo : null;

  useEffect(() => {
    setIsFavorite(getFavoriteIds().includes(property.id));
  }, [property.id]);

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
      <div className="relative h-80 overflow-hidden">
        <Link to={`/property/${property.id}`}>
          {showcaseVideoSrc ? (
            <video
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              poster={property.image}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            >
              <source src={showcaseVideoSrc} type="video/mp4" />
            </video>
          ) : (
            <ImageWithFallback
              src={property.image}
              alt={property.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
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
      <div className="p-5">
        <div className="mb-1.5 flex items-start justify-between">
          <Link to={`/property/${property.id}`} className="pr-4">
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
        <p className="mb-4 line-clamp-1 text-sm leading-6 text-slate-600">{property.description}</p>
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
          className="mt-4 inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
        >
          Voir le détail
        </Link>
      </div>
    </article>
  );
}