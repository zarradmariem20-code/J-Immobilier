import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { VideoPlayer } from "../components/VideoPlayer";
import { ArrowLeft, Bed, Bath, Maximize, MapPin, Check, Heart, CalendarDays, ChevronLeft, ChevronRight, Expand, Share2, Flag, MessageCircle, PhoneCall, PlayCircle, X } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { formatPrice } from "../utils/format";
import { getFavoriteIds, hasActiveAuthSession, isUserLoggedIn, toggleFavoriteId } from "../utils/storage";
import { PropertyCard } from "../components/PropertyCard";
import type { Property } from "../data/properties";
import { LoginModal } from "../components/LoginModal.tsx";
import facebookLogo from "../../assets/Facebook_Logo.png";
import instagramLogo from "../../assets/insta.avif";
import tiktokLogo from "../../assets/tiktok-.webp";
import { createReport, createVisit, getProperty, subscribeToPropertiesRealtime, toggleFavorite } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { getCachedPublicProperties, getPublicPropertiesAsync } from "../utils/publicListings";
import { companyName, companyPhoneDisplay, companyPrimaryPhoneRaw, companyWhatsAppPhoneRaw } from "../utils/company";

type MediaItem =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string };

const companySocialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=100054570723975&sk=followers",
    logoSrc: facebookLogo,
    buttonClass: "border-slate-200 bg-[#f3f7ff] hover:bg-[#e9f1ff]",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/journal_immobilier?igsh=Mzl3eDE2eHZneGlv",
    logoSrc: instagramLogo,
    buttonClass: "border-slate-200 bg-[#fff4fb] hover:bg-[#ffe9f6]",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@journal_immo2?is_from_webapp=1&sender_device=pc",
    logoSrc: tiktokLogo,
    buttonClass: "border-slate-200 bg-[#f5f7fa] hover:bg-slate-100",
  },
];

export function PropertyDetail() {
  const { id } = useParams();
  const numericPropertyId = Number(id);
  const [allProperties, setAllProperties] = useState<Property[]>(() => getCachedPublicProperties());
  const [property, setProperty] = useState<Property | null>(() => {
    if (!Number.isFinite(numericPropertyId)) {
      return null;
    }

    return getCachedPublicProperties().find((entry) => entry.id === numericPropertyId) ?? null;
  });
  const [isPropertyLoading, setIsPropertyLoading] = useState(() => !Number.isFinite(numericPropertyId) ? false : !getCachedPublicProperties().some((entry) => entry.id === numericPropertyId));
  const propertyVideoSrc = property?.videoUrl?.trim() || null;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const coverImage = property?.image?.trim() ?? "";
  const galleryImages = useMemo(
    () => property?.gallery.filter((image): image is string => Boolean(image && image.trim())) ?? [],
    [property]
  );
  const mediaItems: MediaItem[] = useMemo(
    () => (propertyVideoSrc ? [{ kind: "video" as const, src: propertyVideoSrc }] : []),
    [propertyVideoSrc]
  );
  const [activeMedia, setActiveMedia] = useState<MediaItem>(
    propertyVideoSrc
      ? { kind: "video", src: propertyVideoSrc }
      : { kind: "video", src: "" }
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: property ? `Bonjour, je souhaite organiser une visite pour ${property.title}.` : "",
  });
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitMessageKind, setSubmitMessageKind] = useState<"info" | "success" | "error">("info");
  const [successPulse, setSuccessPulse] = useState(false);
  const [isActiveVideoBroken, setIsActiveVideoBroken] = useState(false);
  const [activeVideoAspectRatio, setActiveVideoAspectRatio] = useState<number | null>(null);
  const activeMediaIndex = mediaItems.findIndex((item) => item.kind === activeMedia.kind && item.src === activeMedia.src);
  const isPlayableActiveVideo = activeMedia.kind === "video" && Boolean(activeMedia.src) && !isActiveVideoBroken;

  const applyAuthUser = (user: any | null) => {
    if (!user) {
      setIsLoggedIn(false);
      setUserProfile({ fullName: "", email: "", phone: "" });
      return;
    }

    const metadata = user.user_metadata ?? {};
    const fullName = String(metadata.full_name ?? metadata.name ?? metadata.fullName ?? "");
    const email = String(user.email ?? metadata.email ?? "");
    const phone = String(metadata.phone ?? metadata.phone_number ?? metadata.phoneNumber ?? "");

    setIsLoggedIn(true);
    setUserProfile({ fullName, email, phone });
    setFormState((current) => ({
      ...current,
      fullName: current.fullName || fullName,
      email: current.email || email,
      phone: current.phone || phone,
    }));
  };

  const handleContactClick = (type: "whatsapp" | "call") => {
    if (!isLoggedIn) {
      setLoginModalOpen(true);
      return;
    }
    if (isMobile) {
      const phone = companyPrimaryPhoneRaw;
      if (type === "whatsapp") {
        window.open(`https://wa.me/${companyWhatsAppPhoneRaw.replace(/\D/g, "")}`, "_blank");
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

  const mapProperty = useCallback((item: any): Property => ({
    id: Number(item.id ?? 0),
    title: String(item.title ?? "Annonce immobilière"),
    price: Number(item.price ?? 0),
    transactionType: item.transaction_type === "Location" ? "Location" : "Vente",
    location: String(item.location ?? "Emplacement non précisé"),
    mapLocationQuery: item.map_location_query ? String(item.map_location_query) : undefined,
    nearbyCommodities: Array.isArray(item.nearby_commodities) ? item.nearby_commodities : [],
    bedrooms: Number(item.bedrooms ?? 0),
    bathrooms: Number(item.bathrooms ?? 0),
    area: Number(item.area ?? 0),
    type: String(item.type ?? "Bien immobilier"),
    image: String(item.image ?? ""),
    gallery: Array.isArray(item.gallery) ? item.gallery : [],
    videoUrl: item.video_url ? String(item.video_url) : undefined,
    description: String(item.description ?? ""),
    features: Array.isArray(item.features) ? item.features : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    featured: Boolean(item.featured),
  }), []);

  const loadPropertyData = useCallback(async (showLoader = true) => {
    const propertyId = Number(id);

    if (showLoader && !property) {
      setIsPropertyLoading(true);
    }

    try {
      const publicRows = await getPublicPropertiesAsync({ forceRefresh: false });
      setAllProperties(publicRows);

      if (!Number.isFinite(propertyId)) {
        setProperty(null);
        return;
      }

      try {
        const item = await getProperty(propertyId, { forceRefresh: false });
        const mappedItem = mapProperty(item);
        const fromPublic = publicRows.find((entry) => Number(entry.id) === propertyId) ?? null;

        setProperty({
          ...(fromPublic ?? mappedItem),
          ...mappedItem,
          videoUrl: mappedItem.videoUrl || fromPublic?.videoUrl,
          image: mappedItem.image || fromPublic?.image || "",
          gallery: mappedItem.gallery?.length ? mappedItem.gallery : fromPublic?.gallery ?? [],
        });
      } catch {
        const fromPublic = publicRows.find((entry) => Number(entry.id) === propertyId) ?? property ?? null;
        setProperty(fromPublic);
      }
    } catch {
      if (!property) {
        const cachedProperty = Number.isFinite(propertyId)
          ? getCachedPublicProperties().find((entry) => entry.id === propertyId) ?? null
          : null;
        setAllProperties((current) => current.length ? current : getCachedPublicProperties());
        setProperty(cachedProperty);
      }
    } finally {
      setIsPropertyLoading(false);
    }
  }, [id, mapProperty, property]);

  useEffect(() => {
    loadPropertyData(true);
  }, [loadPropertyData]);

  useEffect(() => {
    const handleFocusRefresh = () => {
      loadPropertyData(false);
    };

    const unsubscribe = subscribeToPropertiesRealtime(() => {
      loadPropertyData(false);
    });

    window.addEventListener("focus", handleFocusRefresh);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocusRefresh);
    };
  }, [loadPropertyData]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      applyAuthUser(user);
    };
    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loginModalOpen) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        applyAuthUser(user);
        setLoginModalOpen(false);
        setIsContactModalOpen(true);
      }
    };
    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (user) {
        applyAuthUser(user);
        setLoginModalOpen(false);
        setIsContactModalOpen(true);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loginModalOpen]);

  useEffect(() => {
    if (!property) {
      return;
    }

    if (mediaItems.length) {
      setActiveMedia(mediaItems[0]);
    } else {
      setActiveMedia({ kind: "video", src: "" });
    }
    setIsActiveVideoBroken(false);
    setActiveVideoAspectRatio(null);
    setIsFavorite(getFavoriteIds().includes(property.id));
    setFormState({
      fullName: isLoggedIn ? userProfile.fullName : "",
      email: isLoggedIn ? userProfile.email : "",
      phone: isLoggedIn ? userProfile.phone : "",
      message: `Bonjour, je souhaite organiser une visite pour ${property.title}.`,
    });
    setSubmitMessage("");
    setSubmitMessageKind("info");
    setSuccessPulse(false);
  }, [property, mediaItems, coverImage, isLoggedIn, userProfile.email, userProfile.fullName, userProfile.phone]);

  if (isPropertyLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <p className="text-slate-600">Chargement de la propriété...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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

    if (isLoggedIn && !formState.phone) {
      setSubmitMessageKind("error");
      setSubmitMessage("Merci d'ajouter votre numéro de téléphone avant d'envoyer la demande.");
      return;
    }

    if (!isLoggedIn && (!formState.fullName || !formState.email || !formState.phone)) {
      setSubmitMessageKind("error");
      setSubmitMessage("Merci de compléter votre nom, email et téléphone avant d'envoyer la demande.");
      return;
    }

    try {
      await createVisit({
        inquiry_id: Date.now(),
        property_id: property.id,
        property_title: property.title,
        visitor_name: isLoggedIn ? (userProfile.fullName || formState.fullName || "Utilisateur connecté") : formState.fullName,
        visitor_email: isLoggedIn ? (userProfile.email || formState.email || "utilisateur-connecte@journal-immobilier.tn") : formState.email,
        visitor_phone: formState.phone,
        requested_date: formState.message,
      });

      setSubmitMessageKind("success");
      setSubmitMessage("Demande envoyée. Un conseiller vous contacte très vite pour confirmer votre visite.");
      setSuccessPulse(true);
      window.setTimeout(() => setSuccessPulse(false), 1400);
      window.dispatchEvent(new CustomEvent("visit-request-created"));

      setFormState({
        fullName: isLoggedIn ? userProfile.fullName : "",
        email: isLoggedIn ? userProfile.email : "",
        phone: isLoggedIn ? userProfile.phone : "",
        message: `Bonjour, je souhaite organiser une visite pour ${property.title}.`,
      });
    } catch {
      setSubmitMessageKind("error");
      setSubmitMessage("Impossible d'envoyer la demande pour le moment. Réessayez dans quelques instants.");
    }
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
  const mapExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;

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
      <style>{`
        @keyframes visitSuccessPop {
          0% { opacity: 0; transform: translateY(10px) scale(0.98); }
          70% { opacity: 1; transform: translateY(0) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes visitButtonPulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.35); }
          100% { box-shadow: 0 0 0 20px rgba(22, 163, 74, 0); }
        }
      `}</style>
      <Header />
      
      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_62%,#f3f6fb_100%)] pt-6 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/listings"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux annonces
          </Link>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>Accueil</span>
            <span>›</span>
            <span>{property.location.split(",").slice(-1)[0]?.trim() || property.location}</span>
            <span>›</span>
            <span className="max-w-[280px] truncate">{property.title}</span>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.65fr_0.95fr]">
            <div className="rounded-[24px] bg-[linear-gradient(135deg,#f8fafc_0%,#eef3f8_100%)] p-3 sm:rounded-[28px] sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <div
                className={`relative overflow-hidden rounded-[18px] border border-slate-200/40 ${isPlayableActiveVideo ? "mx-auto w-full max-w-[360px] bg-slate-950 sm:max-w-[420px] md:max-w-[520px]" : "h-[240px] bg-white sm:h-[380px] md:h-[480px]"}`}
                style={isPlayableActiveVideo ? { aspectRatio: activeVideoAspectRatio ?? "9 / 16" } : undefined}
              >
                {isPlayableActiveVideo ? (
                  <VideoPlayer
                    src={activeMedia.src}
                    label={property.title}
                    preload="auto"
                    fit="contain"
                    onAspectRatioChange={setActiveVideoAspectRatio}
                    onError={() => setIsActiveVideoBroken(true)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white">
                    <PlayCircle className="h-12 w-12 text-sky-300" />
                    <div>
                      <p className="text-base font-semibold">Vidéo indisponible</p>
                      <p className="mt-1 text-sm text-slate-300">Cette annonce s'affiche uniquement avec sa vidéo.</p>
                    </div>
                  </div>
                )}

                {mediaItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-3 top-3 rounded-full bg-white/95 backdrop-blur-sm p-2.5 text-slate-900 shadow-lg transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 border border-white/50 sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:p-3"
                      aria-label="Image précédente"
                    >
                      <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-3 top-3 rounded-full bg-white/95 backdrop-blur-sm p-2.5 text-slate-900 shadow-lg transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 border border-white/50 sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:p-3"
                      aria-label="Image suivante"
                    >
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </>
                )}
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

                {activeMedia.kind === "video" && isActiveVideoBroken && (
                  <div className="absolute left-4 top-4 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
                    Vidéo indisponible
                  </div>
                )}

                {mediaItems.length > 0 && (
                  <div className="absolute right-3 top-14 rounded-[10px] bg-black/55 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white border border-white/20 sm:right-4 sm:top-auto sm:bottom-4 sm:px-4 sm:py-2 sm:text-sm">
                    {Math.max(1, activeMediaIndex + 1)} / {mediaItems.length}
                  </div>
                )}
              </div>

              {mediaItems.length > 1 && (
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
              )}
            </div>

            <div className="space-y-3 lg:sticky lg:top-24 lg:self-start lg:space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await hasActiveAuthSession())) {
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
                    setSubmitMessageKind("info");
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
                  setSubmitMessageKind("info");
                  setSubmitMessage("Le signalement a été envoyé à l'administrateur.");
                }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700 transition hover:border-slate-300">
                  <Flag className="h-4 w-4" />
                  <span className="hidden sm:inline">Signaler</span>
                </button>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:p-6">
                <div className="hidden sm:block">
                  <p className="text-2xl font-bold leading-none text-slate-950 sm:text-4xl">{formatPrice(property.price, property.transactionType)}</p>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">{property.type} • {displayLocation}</p>

                  <div className="mt-4 grid gap-2 border-y border-slate-200 py-3 text-slate-700 sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm"><Bed className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {property.bedrooms} Ch.</span>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm"><Bath className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {property.bathrooms} SdB</span>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm"><Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {property.area} m²</span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-slate-900 sm:mt-5 sm:text-lg">{property.title}</h3>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 sm:text-sm"><MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {displayLocation}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                  <button type="button" onClick={() => handleContactClick("whatsapp")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:px-4 sm:py-3">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </button>
                  <button type="button" onClick={() => handleContactClick("call")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 sm:px-4 sm:py-3">
                    <PhoneCall className="h-4 w-4" /> Appeler
                  </button>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 sm:text-xs">Suivez-nous</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">Retrouvez l'agence sur Facebook, Instagram et TikTok.</p>
                  </div>
                  <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
                    {companySocialLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 sm:h-11 sm:w-11 sm:rounded-full"
                        aria-label={item.label}
                        title={item.label}
                      >
                        <img
                          src={item.logoSrc}
                          alt={item.label}
                          className="h-5 w-5 object-contain sm:h-6 sm:w-6"
                        />
                      </a>
                    ))}
                  </div>
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
              <div className="bg-white rounded-[24px] p-5 shadow-lg sm:rounded-[32px] sm:p-8">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="mb-2 font-serif text-3xl font-semibold text-black sm:text-4xl">{property.title}</h1>
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

                <div className="flex flex-wrap items-center gap-5 py-6 border-t border-gray-200 sm:gap-8">
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

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="bg-white rounded-[32px] p-8 shadow-lg">
                  <h2 className="text-xl font-semibold text-black mb-4">Caractéristiques du bien</h2>
                  {property.features.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {property.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="bg-blue-100 rounded-full p-1">
                            <Check className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Aucune caractéristique supplémentaire renseignée pour ce bien.</p>
                  )}
                </div>

                <div className="bg-white rounded-[32px] p-8 shadow-lg">
                  <h2 className="text-xl font-semibold text-black mb-4">Équipements & confort</h2>
                  {property.tags.length ? (
                    <div className="flex flex-wrap gap-2">
                      {property.tags.map((item) => (
                        <span key={item} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-800">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Aucun équipement particulier n'a été renseigné.</p>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.14),transparent_22%),linear-gradient(160deg,#020617_0%,#081225_48%,#0b1730_100%)] p-5 text-white shadow-[0_28px_70px_rgba(2,6,23,0.34)] sm:p-8">
                <div className="pointer-events-none absolute -left-10 top-16 h-36 w-36 rounded-full bg-cyan-300/10 blur-3xl" />
                <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-sky-400/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">Localisation & commodités</p>
                    <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-[2.15rem]">Repérez le bien et les services à proximité</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
                      Vérifiez cette localisation avec la description fournie par le propriétaire avant de planifier une visite.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:w-[19rem] lg:grid-cols-1">
                    <div className="rounded-[20px] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">Adresse repérée</p>
                      <p className="mt-2 inline-flex items-start gap-2 text-sm font-medium text-white">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-300" />
                        <span>{displayMapLocation}</span>
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">Services signalés</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{nearbyCommodities.length}</p>
                      <p className="text-xs text-slate-300">Repères utiles autour du bien</p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200">Carte interactive</p>
                      <p className="mt-1 text-sm font-medium text-white">{displayMapLocation}</p>
                    </div>
                    <a
                      href={mapExternalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-sky-300/30 bg-sky-400/12 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-400/20"
                    >
                      Ouvrir dans Maps
                    </a>
                  </div>

                  <div className="relative">
                    <iframe
                      title="Carte de localisation"
                      src={mapEmbedUrl}
                      className="h-[18rem] w-full sm:h-[21rem]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,23,0.28)_100%)]" />
                  </div>
                </div>

                <div className="relative z-10 mt-5 flex flex-wrap gap-2.5">
                  {nearbyCommodities.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-300/16 bg-white/8 px-3.5 py-2 text-sm font-medium text-sky-50 backdrop-blur-sm"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_38px_rgba(15,23,42,0.12)] sm:top-28 sm:rounded-[32px] sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
                    <CalendarDays className="h-6 w-6 text-sky-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-black">Planifier une visite</h3>
                    <p className="text-sm text-slate-500">
                      {isLoggedIn
                        ? "Vous êtes connecté. Renseignez votre téléphone pour confirmer la visite."
                        : "Renseignez vos coordonnées pour recevoir une proposition de créneau."}
                    </p>
                  </div>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {isLoggedIn && (
                    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Compte connecté
                    </div>
                  )}
                  {!isLoggedIn && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom Complet
                        </label>
                        <input
                          type="text"
                          value={formState.fullName}
                          onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="jean@exemple.fr"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Ex : +216 97 222 822"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (optionnel)
                    </label>
                    <textarea
                      rows={4}
                      value={formState.message}
                      onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Je suis intéressé par cette propriété..."
                    ></textarea>
                  </div>
                  {submitMessage && (
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${{
                        success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
                        error: "border border-rose-200 bg-rose-50 text-rose-700",
                        info: "border border-sky-200 bg-sky-50 text-sky-800",
                      }[submitMessageKind]}`}
                      style={submitMessageKind === "success" ? { animation: "visitSuccessPop 560ms ease both" } : undefined}
                    >
                      {submitMessage}
                    </div>
                  )}
                  <button
                    type="submit"
                    className={`w-full rounded-xl py-3 font-semibold text-white transition-all ${
                      successPulse
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-sky-700 hover:bg-sky-800"
                    }`}
                    style={successPulse ? { animation: "visitButtonPulse 900ms ease-out" } : undefined}
                  >
                    {successPulse ? "Demande envoyée" : "Envoyer ma demande de visite"}
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
                <p className="text-lg font-bold text-slate-950">{companyName}</p>
              </div>

              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Téléphone</p>
                <p className="text-lg font-bold text-slate-950 font-mono">{companyPhoneDisplay}</p>
                <p className="mt-1 text-xs text-slate-500">Réponse rapide garantie</p>
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href={`https://wa.me/${companyWhatsAppPhoneRaw.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-[12px] bg-emerald-50 px-4 py-2 text-center font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  WhatsApp
                </a>
                <a
                  href={`tel:${companyPrimaryPhoneRaw}`}
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
