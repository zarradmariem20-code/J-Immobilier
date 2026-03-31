import { FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Bed, Bath, Maximize, MapPin, Check, Heart, CalendarDays, ChevronLeft, ChevronRight, Expand, Share2, Flag, MessageCircle, PhoneCall, Home, Sparkles, ThumbsUp, ThumbsDown, PlayCircle, X } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { formatPrice } from "../utils/format";
import { getFavoriteIds, toggleFavoriteId } from "../utils/storage";
import { PropertyCard } from "../components/PropertyCard";
import type { Property } from "../data/properties";
import { LoginModal } from "../components/LoginModal.tsx";
import showcaseVideo from "../../assets/AQNXnnPnKdMQ5estjhWkd2IhZaaZUHAtL8ze9gnFvSqh433mUscb0yB9S4Q55Hlyye5VU9-jXyE7nhUVsrLwPLB9rtniZUy_xRrGkMY.mp4";
import { createInquiry, createReport, getProperties, getProperty, toggleFavorite } from "../../lib/api";

type MediaItem =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string };

export function PropertyDetail() {
  const { id } = useParams();
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const showcaseVideoSrc = property?.id === 1 ? showcaseVideo : null;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const mediaItems: MediaItem[] = property
    ? [
        ...(showcaseVideoSrc ? [{ kind: "video" as const, src: showcaseVideoSrc }] : []),
        ...property.gallery.map((image) => ({ kind: "image" as const, src: image })),
      ]
    : [];
  const [activeMedia, setActiveMedia] = useState<MediaItem>(
    showcaseVideoSrc ? { kind: "video", src: showcaseVideoSrc } : { kind: "image", src: property?.image ?? "" }
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: property ? `Bonjour, je souhaite organiser une visite pour ${property.title}.` : "",
  });
  const [submitMessage, setSubmitMessage] = useState("");
  const activeMediaIndex = mediaItems.findIndex((item) => item.kind === activeMedia.kind && item.src === activeMedia.src);

  const handleContactClick = (type: "whatsapp" | "call") => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      return;
    }
    if (isMobile) {
      const phone = "+21695123456";
      if (type === "whatsapp") {
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}`, "_blank");
      } else if (type === "call") {
        window.location.href = `tel:${phone}`;
      }
      return;
    }
    setIsContactModalOpen(true);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const mapProperty = (item: Awaited<ReturnType<typeof getProperties>>["data"][number]): Property => ({
      id: item.id,
      title: item.title,
      price: item.price,
      transactionType: item.transaction_type,
      location: item.location,
      mapLocationQuery: item.map_location_query,
      nearbyCommodities: item.nearby_commodities,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      area: item.area,
      type: item.property_type,
      image: item.cover_image_url,
      gallery: item.gallery_urls,
      description: item.description ?? "",
      features: item.features ?? [],
      tags: item.tags ?? [],
      featured: item.featured,
    });

    getProperties({ limit: 8 })
      .then((res) => setAllProperties(res.data.map(mapProperty)))
      .catch(() => setAllProperties([]));

    if (id) {
      getProperty(Number(id))
        .then((item) => setProperty(mapProperty(item)))
        .catch(() => setProperty(null));
    }
  }, [id]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await import("../../lib/supabase").then(m => m.supabase.auth.getUser());
      setIsLoggedIn(!!user);
    };
    fetchUser();
    const { data: listener } = require("../../lib/supabase").supabase.auth.onAuthStateChange(fetchUser);
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loginModalOpen) return;
    const fetchUser = async () => {
      const { data: { user } } = await import("../../lib/supabase").then(m => m.supabase.auth.getUser());
      if (user) {
        setIsLoggedIn(true);
        setLoginModalOpen(false);
        setIsContactModalOpen(true);
      }
    };
    fetchUser();
    const { data: listener } = require("../../lib/supabase").supabase.auth.onAuthStateChange(fetchUser);
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loginModalOpen]);

  useEffect(() => {
    if (!property) {
      return;
    }

    setActiveMedia(showcaseVideoSrc ? { kind: "video", src: showcaseVideoSrc } : { kind: "image", src: property.image });
    setIsFavorite(getFavoriteIds().includes(property.id));
    setFormState({
      fullName: "",
      email: "",
      phone: "",
      message: `Bonjour, je souhaite organiser une visite pour ${property.title}.`,
    });
    setSubmitMessage("");
  }, [property, showcaseVideoSrc]);

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-black mb-4">Propriété Non Trouvée</h2>
            <Link to="/listings" className="text-blue-600 hover:text-blue-700">
              Retour aux Annonces
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedProperties = allProperties.filter((item) => item.id !== property.id).slice(0, 3);

  const handlePrevImage = () => {
    if (!property) {
      return;
    }

    if (!mediaItems.length) {
      return;
    }

    const currentIndex = activeMediaIndex >= 0 ? activeMediaIndex : 0;
    const nextIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
    setActiveMedia(mediaItems[nextIndex]);
  };

  const handleNextImage = () => {
    if (!property) {
      return;
    }

    if (!mediaItems.length) {
      return;
    }

    const currentIndex = activeMediaIndex >= 0 ? activeMediaIndex : 0;
    const nextIndex = (currentIndex + 1) % mediaItems.length;
    setActiveMedia(mediaItems[nextIndex]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.fullName || !formState.email || !formState.phone) {
      setSubmitMessage("Merci de compléter votre nom, email et téléphone avant d'envoyer la demande.");
      return;
    }

    await createInquiry({
      property_id: property.id,
      property_title: property.title,
      full_name: formState.fullName,
      email: formState.email,
      phone: formState.phone,
      message: formState.message,
    });

    setSubmitMessage("Votre demande a été enregistrée. L'agence peut maintenant vous recontacter avec toutes les informations nécessaires.");
    setFormState({
      fullName: "",
      email: "",
      phone: "",
      message: `Bonjour, je souhaite organiser une visite pour ${property.title}.`,
    });
  };

  const valuationMin = Math.round(property.price * 0.95);
  const valuationMax = Math.round(property.price * 1.12);
  const valuationPosition = Math.max(8, Math.min(92, ((property.price - valuationMin) / (valuationMax - valuationMin)) * 100));
  const locationQuery = property.mapLocationQuery || property.location;
  const displayLocation = property.location
    .replace(/les berges du lac 2,?\s*/i, "")
    .replace(/,\s*,/g, ",")
    .replace(/^,\s*/g, "")
    .trim() || property.location;
  const displayMapLocation = locationQuery
    .replace(/les berges du lac 2,?\s*/i, "")
    .replace(/,\s*,/g, ",")
    .replace(/^,\s*/g, "")
    .trim() || locationQuery;
  const nearbyCommodities = property.nearbyCommodities?.length
    ? property.nearbyCommodities
    : ["Écoles", "Supermarché", "Transport", "Pharmacie", "Restaurants"];
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`;

  const formatCompactCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M TND`;
    }
    if (value >= 1_000) {
      return `${Math.round(value / 1_000)}K TND`;
    }
    return `${value} TND`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_62%,#f3f6fb_100%)] pt-6 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>Accueil</span>
            <span>›</span>
            <span>{property.location.split(",").slice(-1)[0]?.trim() || property.location}</span>
            <span>›</span>
            <span className="max-w-[280px] truncate">{property.title}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.65fr_0.95fr]">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#f8fafc_0%,#eef3f8_100%)] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <div className="relative h-[380px] overflow-hidden rounded-[20px] bg-white border border-slate-200/40 md:h-[480px]">
                {activeMedia.kind === "video" ? (
                  <video
                    className="h-full w-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    poster={property.image}
                  >
                    <source src={activeMedia.src} type="video/mp4" />
                  </video>
                ) : (
                  <ImageWithFallback
                    src={activeMedia.src}
                    alt={property.title}
                    className="h-full w-full object-contain"
                  />
                )}

                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 backdrop-blur-sm p-3 text-slate-900 shadow-lg transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 border border-white/50"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 backdrop-blur-sm p-3 text-slate-900 shadow-lg transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 border border-white/50"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                {activeMedia.kind === "image" && (
                  <button
                    type="button"
                    onClick={() => setIsFullscreenOpen(true)}
                    className="absolute right-4 top-4 rounded-full bg-white/95 backdrop-blur-sm p-2.5 text-slate-900 shadow-lg transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 border border-white/50"
                    aria-label="Agrandir l'image"
                  >
                    <Expand className="h-4 w-4" />
                  </button>
                )}

                <div className="absolute bottom-4 right-4 rounded-[10px] bg-black/40 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white border border-white/20">
                  {Math.max(1, activeMediaIndex + 1)} / {mediaItems.length}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2.5 overflow-x-auto rounded-[16px] bg-gradient-to-r from-slate-100 to-slate-50 p-3 border border-slate-200/50">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.kind}-${item.src}-${index}`}
                    type="button"
                    onClick={() => setActiveMedia(item)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-[12px] border transition-all duration-200 ${
                      activeMedia.kind === item.kind && activeMedia.src === item.src ? "border-sky-400 ring-2 ring-sky-300/40 shadow-lg" : "border-slate-300 hover:border-slate-400 hover:shadow-md"
                    }`}
                  >
                    {item.kind === "video" ? (
                      <div className="relative h-full w-full bg-slate-800">
                        <ImageWithFallback src={property.image} alt={`${property.title} video`} className="h-full w-full object-cover opacity-70" />
                        <span className="absolute inset-0 flex items-center justify-center text-white">
                          <PlayCircle className="h-6 w-6" />
                        </span>
                      </div>
                    ) : (
                      <ImageWithFallback src={item.src} alt={property.title} className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!isUserLoggedIn()) {
                      setLoginModalOpen(true);
                      return;
                    }
                    await toggleFavorite(property.id).catch(() => {});
                    setIsFavorite(toggleFavoriteId(property.id).includes(property.id));
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 font-semibold transition ${
                    isFavorite
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">Sauvegarder</span>
                </button>
                <button type="button" onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator.share({ title: property.title, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).catch(() => {});
                    setSubmitMessage("Le lien de l'annonce a été copié.");
                  }
                }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition hover:border-slate-300">
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Partager</span>
                </button>
                <button type="button" onClick={async () => {
                  if (!isUserLoggedIn()) {
                    setLoginModalOpen(true);
                    return;
                  }
                  await createReport({ property_id: property.id, reason: "wrong_info", description: `Signalement depuis la fiche ${property.title}` }).catch(() => {});
                  setSubmitMessage("Le signalement a été envoyé à l'administrateur.");
                }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition hover:border-slate-300">
                  <Flag className="h-4 w-4" />
                  <span className="hidden sm:inline">Signaler</span>
                </button>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
                <p className="text-4xl font-bold text-slate-950">{formatPrice(property.price, property.transactionType)}</p>
                <p className="mt-1 text-sm text-slate-500">{property.type} • {displayLocation}</p>

                <div className="mt-5 flex items-center gap-4 border-y border-slate-200 py-4 text-slate-700">
                  <span className="inline-flex items-center gap-1.5 text-sm"><Bed className="h-4 w-4" /> {property.bedrooms} Ch.</span>
                  <span className="inline-flex items-center gap-1.5 text-sm"><Bath className="h-4 w-4" /> {property.bathrooms} SdB</span>
                  <span className="inline-flex items-center gap-1.5 text-sm"><Maximize className="h-4 w-4" /> {property.area} m²</span>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">{property.title}</h3>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {displayLocation}</p>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">Propriétaire</p>
                  <p className={`text-base font-semibold text-slate-900 transition-all duration-300 ${!isLoggedIn ? "blur-sm select-none" : ""}`}>
                    Ahmed Ben Salah
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleContactClick("whatsapp")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </button>
                  <button type="button" onClick={() => handleContactClick("call")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-4 py-3 font-semibold text-sky-700 transition hover:bg-sky-100">
                    <PhoneCall className="h-4 w-4" /> Appeler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-2 bg-[linear-gradient(180deg,#f3f6fb_0%,#edf3fb_100%)] pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {property.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h1 className="font-serif text-4xl font-semibold text-black mb-2">{property.title}</h1>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-5 w-5" />
                      <span className="text-lg">{displayLocation}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-sky-700">
                      {formatPrice(property.price, property.transactionType)}
                    </p>
                    <span className="text-gray-500 text-sm">{property.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-8 py-6 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Bed className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-semibold text-black">{property.bedrooms}</p>
                      <p className="text-sm text-gray-600">Chambres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-semibold text-black">{property.bathrooms}</p>
                      <p className="text-sm text-gray-600">Salles de Bain</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-semibold text-black">{property.area}</p>
                      <p className="text-sm text-gray-600">m²</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h2 className="text-xl font-semibold text-black mb-3">Description</h2>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <h2 className="text-xl font-semibold text-black mb-4">Caractéristiques & Équipements</h2>
                <div className="grid grid-cols-2 gap-3">
                  {property.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="bg-blue-100 rounded-full p-1">
                        <Check className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] bg-slate-950 p-8 text-white shadow-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Localisation & commodités</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold">Repérez le bien et les services à proximité</h2>

                <p className="mt-3 text-sm text-slate-300">
                  Vérifiez cette localisation avec la description fournie par le propriétaire avant de planifier une visite.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
                  <iframe
                    title="Carte de localisation"
                    src={mapEmbedUrl}
                    className="h-64 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {nearbyCommodities.map((item) => (
                    <span key={item} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-sky-100">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 shadow-lg">
                <h2 className="text-3xl font-semibold text-slate-950">Estimation du bien</h2>
                <p className="mt-1 text-slate-500">Prédiction assistée par IA (module à connecter)</p>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                  <div className="relative h-24">
                    <div className="absolute left-0 right-0 top-11 h-[3px] rounded-full bg-slate-300" />

                    <div
                      className="absolute top-0 -translate-x-1/2"
                      style={{ left: `${valuationPosition}%` }}
                    >
                      <div className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
                        Ce bien: {formatCompactCurrency(property.price)}
                      </div>
                      <div className="mt-1 flex justify-center text-sky-700">
                        <Home className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="absolute left-0 top-[54px] text-sm text-slate-700">
                      <p className="font-semibold">{formatCompactCurrency(valuationMin)}</p>
                      <p className="text-slate-500">Minimum</p>
                    </div>
                    <div className="absolute right-0 top-[54px] text-right text-sm text-slate-700">
                      <p className="font-semibold">{formatCompactCurrency(valuationMax)}</p>
                      <p className="text-slate-500">Maximum</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3">
                    <p className="inline-flex items-center gap-2 text-slate-700">
                      <Sparkles className="h-4 w-4 text-sky-700" />
                      Cette fourchette est basée sur des biens similaires dans cette zone.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Utile ?</span>
                      <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
                        <ThumbsUp className="h-4 w-4" />
                      </button>
                      <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-[32px] p-8 shadow-lg sticky top-28">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
                    <CalendarDays className="h-6 w-6 text-sky-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-black">Planifier une visite</h3>
                    <p className="text-sm text-slate-500">La demande est sauvegardée dans le navigateur.</p>
                  </div>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom Complet
                    </label>
                    <input
                      type="text"
                      value={formState.fullName}
                      onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="jean@exemple.fr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="+216 20 123 456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      value={formState.message}
                      onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Je suis intéressé par cette propriété..."
                    ></textarea>
                  </div>
                  {submitMessage && (
                    <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
                      {submitMessage}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-sky-700 text-white py-3 rounded-lg font-semibold hover:bg-sky-800 transition-colors"
                  >
                    Demander des Informations
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">À découvrir aussi</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-slate-950">Biens similaires</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {relatedProperties.map((item) => (
                <PropertyCard key={item.id} property={item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {isFullscreenOpen && activeMedia.kind === "image" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setIsFullscreenOpen(false)}
        >
          <div className="relative h-full w-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsFullscreenOpen(false)}
              className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30 backdrop-blur-sm"
              aria-label="Fermer"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/30 backdrop-blur-sm md:left-6"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/30 backdrop-blur-sm md:right-6"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            <ImageWithFallback
              src={activeMedia.src}
              alt={property?.title || "Image en plein écran"}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {isContactModalOpen && isUserLoggedIn() && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => setIsContactModalOpen(false)}
        >
          <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="relative bg-[linear-gradient(180deg,#e8f2ff_0%,#f7faff_100%)] px-6 pb-6 pt-6">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-center text-xl font-bold text-slate-950">Contacter le propriétaire</h2>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Nom</p>
                <p className="text-lg font-bold text-slate-950">Ahmed Ben Salah</p>
              </div>

              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Téléphone</p>
                <p className="text-lg font-bold text-slate-950 font-mono">+216 95 123 456</p>
                <p className="mt-1 text-xs text-slate-500">Réponse rapide garantie</p>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href="https://wa.me/21695123456"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-[12px] bg-emerald-50 px-4 py-2 text-center font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  WhatsApp
                </a>
                <a
                  href="tel:+21695123456"
                  className="flex-1 rounded-[12px] bg-sky-50 px-4 py-2 text-center font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  Appeler
                </a>
              </div>

              <button
                onClick={() => setIsContactModalOpen(false)}
                className="w-full rounded-[12px] bg-slate-100 px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
