import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Award, BadgeDollarSign, Bookmark, ChevronDown, Clapperboard, Heart, Home as HomeIcon, Images, KeyRound, MessageCircle, Play, Search, Send, TrendingUp } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import { getCitiesForRegion, tunisiaRegionOptions } from "../data/locations";
import editorialImageTwo from "../../assets/image1.jpeg";
import socialPreviewImage from "../../assets/image2.jpg";
import ownerHeroImage from "../../assets/image.png";
import brandWordmark from "../../assets/tawla2.png";
import facebookLogo from "../../assets/Facebook_Logo.png";
import instagramLogo from "../../assets/insta.avif";
import tiktokLogo from "../../assets/tiktok-.webp";
import type { Property } from "../data/properties";
import { getCachedPublicProperties, getPublicPropertiesAsync } from "../utils/publicListings";
import { hasActiveAuthSession } from "../utils/storage";
import { subscribeToPropertiesRealtime } from "../../lib/api";

export function Home() {
  const [publicProperties, setPublicProperties] = useState<Property[]>(() => getCachedPublicProperties());
  const featuredProperties = publicProperties.filter((p) => p.featured).slice(0, 6);
  const [searchRegion, setSearchRegion] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [transactionType, setTransactionType] = useState("Vente");
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const cityOptions = getCitiesForRegion(searchRegion);

  const propertyTypesByTransaction = {
    Vente: {
      Habitation: ["Appartement", "Villa", "Terrain"],
      Commercial: ["Local commercial", "Bureau", "Immeuble", "Terrain agricole", "Usine"],
    },
    Location: {
      Habitation: ["Appartement", "Villa"],
      Commercial: ["Surface", "Bureau", "Usine"],
    },
  };
  const propertyTypeGroups = transactionType === "Location" ? propertyTypesByTransaction.Location : propertyTypesByTransaction.Vente;
  const propertyTypeOptions = Object.values(propertyTypeGroups).flat();
  const loadPublicProperties = useCallback(async () => {
    try {
      const res = await getPublicPropertiesAsync();
      setPublicProperties(res);
    } catch {
      setPublicProperties([]);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Keep initial hero composition consistent on first open.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    loadPublicProperties();
  }, [loadPublicProperties]);

  useEffect(() => {
    const handleFocusRefresh = () => {
      loadPublicProperties();
    };

    const unsubscribe = subscribeToPropertiesRealtime(() => {
      loadPublicProperties();
    });

    window.addEventListener("focus", handleFocusRefresh);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocusRefresh);
    };
  }, [loadPublicProperties]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (searchRegion) {
      params.set("region", searchRegion);
    }
    if (searchCity) {
      params.set("city", searchCity);
    }
    if (searchType && searchType !== "all") {
      params.set("type", searchType);
    }
    if (transactionType !== "all") {
      params.set("transaction", transactionType);
    }

    navigate(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const fieldCardClass = "rounded-[14px] border border-slate-200/80 bg-white px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition hover:border-sky-200";
  const fieldLabelClass = "mb-1 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] leading-none text-slate-500";
  const fieldInputClass = "h-6 w-full border-0 bg-transparent p-0 text-[14px] font-medium text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis placeholder:font-normal placeholder:text-slate-400 focus:outline-none";
  const getSelectTriggerClass = (hasValue: boolean) => `${fieldInputClass} appearance-none pr-7 ${hasValue ? "text-slate-900" : "text-slate-500"}`;

  const openAuthModal = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "login" } }));
  };

  const openAddListingFlow = async () => {
    if (await hasActiveAuthSession()) {
      navigate("/submit-listing");
      return;
    }

    window.dispatchEvent(new CustomEvent("open-auth-modal", {
      detail: { mode: "login", redirectTo: "/submit-listing" },
    }));
  };

  const socialShowcaseLinks = [
    {
      label: "Facebook",
      href: "https://www.facebook.com/profile.php?id=100054570723975&sk=followers",
      logoSrc: facebookLogo,
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/journal_immobilier?igsh=Mzl3eDE2eHZneGlv",
      logoSrc: instagramLogo,
    },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/@journal_immo2?is_from_webapp=1&sender_device=pc",
      logoSrc: tiktokLogo,
    },
  ];

  return (
    <div
      className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)]"
    >
      <Header />
      <section className="relative overflow-visible border-b border-slate-200 bg-slate-950">
        <div className="absolute inset-0">
          <img src={editorialImageTwo} alt="Immobilier Tunisie" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.38)_0%,rgba(2,6,23,0.72)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[360px] max-w-6xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:min-h-[480px] lg:px-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
            {[
              { value: "Vente", label: "À vendre", icon: BadgeDollarSign },
              { value: "Location", label: "À louer", icon: KeyRound },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setTransactionType(item.value);
                    setSearchType("all");
                    setTypeOpen(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    transactionType === item.value
                      ? "bg-[#0c4a7f] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={handleSearch}
            className="relative z-[120] mt-5 grid w-full max-w-5xl gap-2 rounded-[18px] bg-white/95 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.28)] backdrop-blur-md sm:mt-6 sm:rounded-[22px] sm:p-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-2.5"
          >
            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Region</span>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={searchRegion}
                  onChange={(event) => {
                    setSearchRegion(event.target.value);
                    setSearchCity("");
                  }}
                  className={`${getSelectTriggerClass(Boolean(searchRegion))} pl-7`}
                >
                  <option value="">Toutes les regions</option>
                  {tunisiaRegionOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Ville</span>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={searchCity}
                  onChange={(event) => setSearchCity(event.target.value)}
                  disabled={!searchRegion}
                  className={`${getSelectTriggerClass(Boolean(searchCity))} pl-7 disabled:cursor-not-allowed disabled:text-slate-400`}
                >
                  <option value="">{searchRegion ? "Toutes les villes" : "Choisissez une region"}</option>
                  {cityOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Type de bien</span>
              <div className="relative" ref={typeRef}>
                <button
                  type="button"
                  onClick={() => setTypeOpen((prev) => !prev)}
                  className={`${fieldInputClass} flex items-center justify-between pr-1 text-left`}
                >
                  <span className={searchType && searchType !== "all" ? "text-slate-900" : "text-slate-400"}>
                    {searchType && searchType !== "all"
                      ? searchType
                      : transactionType === "Vente"
                        ? "Biens à vendre"
                        : "Biens à louer"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${typeOpen ? "rotate-180" : "rotate-0"}`} />
                </button>
                {typeOpen && (
                  <div className="absolute left-0 right-0 top-full z-[160] mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchType("all");
                        setTypeOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        searchType === "all" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Tous les types
                    </button>
                    {propertyTypeOptions.map((propertyType) => (
                      <button
                        key={propertyType}
                        type="button"
                        onClick={() => {
                          setSearchType(propertyType);
                          setTypeOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                          searchType === propertyType ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {propertyType}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <button
              type="submit"
              className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#0c4a7f_0%,#1f5f96_100%)] px-5 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(12,74,127,0.35)] transition hover:brightness-110"
            >
              <Search className="h-4 w-4" />
              Chercher
            </button>
          </form>

        </div>
      </section>

      

            <section className="py-10 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 md:mb-12 md:flex-row md:items-start md:justify-between md:gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Sélection premium</p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold text-slate-950 md:mt-3 md:text-4xl">Des annonces mieux organisées et plus engageantes</h2>
                    <p className="mt-2 max-w-2xl text-slate-600 md:mt-3">
                Chaque bien présente des visuels plus riches, une lecture plus claire et une mise en valeur pensée pour déclencher l'intérêt plus vite.
              </p>
            </div>
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 self-start rounded-full bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-5 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.35)] transition hover:brightness-110 md:mt-12"
            >
              Voir toutes les propriétés
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[34px] border border-sky-100/80 bg-[linear-gradient(135deg,#f8fbff_0%,#eef7ff_42%,#fdfefe_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:px-7 sm:py-8 lg:px-8 lg:py-9">
            <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="absolute -right-12 bottom-0 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="order-2 max-w-xl lg:order-1">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Diffusion réseaux sociaux</p>
                <h2 className="mt-3 font-serif text-[32px] font-semibold leading-[1.02] text-slate-950 sm:text-[40px]">
                  Une annonce pensée pour le site, puis adaptée aux réseaux.
                </h2>
                <p className="mt-5 text-[15px] leading-7 text-slate-600 sm:text-base">
                  Photos, vidéos et accroches retravaillées pour donner plus de visibilité à votre bien.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                    <Clapperboard className="h-4 w-4 text-sky-700" />
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Contenu</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">Photos fortes et formats courts.</p>
                  </div>
                  <div className="rounded-[20px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                    <TrendingUp className="h-4 w-4 text-sky-700" />
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Ciblage</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">Pensé pour le mobile et le scroll rapide.</p>
                  </div>
                  <div className="rounded-[20px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                    <Images className="h-4 w-4 text-sky-700" />
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Image</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">Une présentation plus premium dès le départ.</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openAddListingFlow}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
                  >
                    Confier mon annonce
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-5 py-3 font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Parler à l'équipe
                  </Link>
                </div>
              </div>

              <div className="order-1 relative min-h-[520px] sm:min-h-[620px] lg:order-2 lg:min-h-[620px]">
                <div className="social-showcase-phone social-showcase-glow relative z-20 mx-auto w-[min(100%,340px)] overflow-hidden rounded-[34px] border border-slate-200/70 bg-white p-3 shadow-[0_30px_80px_rgba(15,23,42,0.24)] lg:absolute lg:right-[90px] lg:top-3">
                  <div className="flex items-center justify-between px-1 pb-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#0f3d63_64%,#0ea5e9_100%)] p-2.5 shadow-[0_10px_24px_rgba(14,165,233,0.28)]">
                        <img src={brandWordmark} alt="Journal Immobilier" className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">journal_immobilier</p>
                        <p className="text-xs text-slate-500">Publication sponsorisée</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      Reel
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[26px] bg-slate-950">
                    <img
                      src={socialPreviewImage}
                      alt="Aperçu de diffusion immobilière sur les réseaux sociaux"
                      className="h-[400px] w-full object-cover sm:h-[470px]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.08)_42%,rgba(2,6,23,0.78)_100%)]" />
                    <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
                      <div className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                        Villa moderne
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-sm">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Sousse • Visuel premium</p>
                      <h3 className="mt-2 max-w-[16rem] text-2xl font-semibold leading-tight text-white sm:text-[28px]">
                        Un visuel qui arrête le scroll.
                      </h3>
                      <p className="mt-2 max-w-[17rem] text-sm leading-6 text-slate-200">
                        Hero photo et formats courts pour les réseaux.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 pb-1 pt-3">
                    <div className="flex items-center gap-4 text-slate-800">
                      <Heart className="h-5 w-5 fill-current text-rose-500" />
                      <MessageCircle className="h-5 w-5" />
                      <Send className="h-5 w-5" />
                    </div>
                    <Bookmark className="h-5 w-5 text-slate-800" />
                  </div>
                  <div className="px-1 pb-2">
                    <p className="text-sm font-semibold text-slate-950">Visibilité multi-plateforme</p>
                    <p className="mt-1 line-clamp-1 whitespace-nowrap text-sm leading-6 text-slate-600">
                      Reels et stories pour mieux valoriser le bien.
                    </p>
                  </div>
                </div>

                <div className="social-showcase-drift absolute left-0 top-10 z-10 w-[170px] rounded-[22px] bg-slate-950 p-3 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)] sm:top-8 sm:w-[230px] sm:rounded-[26px] sm:p-4 lg:left-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">Formats diffusés</p>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 sm:py-2.5 sm:text-sm">Story verticale</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 sm:py-2.5 sm:text-sm">Reel vidéo court</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 sm:py-2.5 sm:text-sm">Post carrousel</div>
                  </div>
                </div>

                <div className="social-showcase-float absolute bottom-5 right-0 z-30 w-[190px] rounded-[20px] border border-sky-100 bg-white/92 p-3 shadow-[0_20px_45px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:bottom-6 sm:right-6 sm:w-[260px] sm:rounded-[24px] sm:p-4 lg:right-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Canaux activés</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {socialShowcaseLinks.map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-slate-800 sm:px-3 sm:py-1.5 sm:text-sm"
                      >
                        <img src={item.logoSrc} alt={item.label} className="h-4 w-4 rounded-full object-cover" />
                        {item.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                    Un rendu plus graphique avant le premier message.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] border border-sky-100/80 bg-[linear-gradient(135deg,#f7fbff_0%,#eef7ff_46%,#ffffff_100%)] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:p-6 lg:p-7">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="absolute right-0 top-10 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-stretch">
              <article className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,#0f172a_0%,#12385a_56%,#1496d4_100%)] p-5 text-white shadow-[0_30px_70px_rgba(15,23,42,0.22)] sm:p-7 lg:p-8">
                <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex flex-col gap-6">
                  <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100 backdrop-blur-sm">
                      <HomeIcon className="h-3.5 w-3.5" />
                      Propriétaire en Tunisie
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                      <Award className="h-3.5 w-3.5" />
                      Validation admin
                    </span>
                  </div>

                  <div className="text-center lg:max-w-[46rem] lg:text-left">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-sky-200/90">Diffusion encadrée</p>
                    <h3 className="mt-3 font-serif text-[clamp(1.9rem,6vw,3.4rem)] leading-[1.05] tracking-[-0.025em] text-white">
                      Confiez votre bien a notre equipe pour une mise en ligne plus claire.
                    </h3>
                  </div>

                  <div className="relative mx-auto w-full max-w-[34rem] sm:max-w-[36rem] lg:max-w-[35rem]">
                    <div className="absolute -left-5 top-4 z-10 w-[11rem] rounded-[20px] border border-white/15 bg-slate-950/35 px-3 py-2.5 text-white shadow-[0_18px_34px_rgba(2,6,23,0.18)] backdrop-blur-md sm:-left-6 sm:top-5 sm:w-auto sm:rounded-[22px] sm:px-4 sm:py-3 lg:-left-8 lg:top-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Gain de temps</p>
                      <p className="mt-1 text-sm font-semibold">Un seul envoi, diffusion cadrée.</p>
                    </div>
                    <img
                      src={ownerHeroImage}
                      alt="Propriétaire immobilier"
                      className="h-72 w-full rounded-[26px] border border-white/15 object-cover shadow-[0_24px_50px_rgba(2,6,23,0.20)] sm:h-80 lg:h-[390px]"
                    />
                    <div className="absolute -right-5 bottom-4 left-8 rounded-[20px] border border-white/15 bg-black/25 px-4 py-3 text-white backdrop-blur-md sm:-right-6 sm:bottom-5 sm:left-10 lg:-right-8 lg:bottom-6 lg:left-14">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Présentation premium</p>
                      <p className="mt-1 text-sm leading-6 text-slate-100">Photos, vidéo et validation réunies dans un même parcours.</p>
                    </div>
                  </div>

                  <div className="text-center lg:max-w-[34rem] lg:text-left">
                    <p className="text-[14px] leading-6 text-sky-100/95 sm:text-[15px] sm:leading-7">
                      Vous envoyez vos medias, nous cadrons la presentation avant publication.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:items-start">
                    <button
                      type="button"
                      onClick={openAddListingFlow}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-50"
                    >
                      Ajouter mon annonce
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm">
                      Mise en ligne accompagnée
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid gap-5 lg:grid-rows-[auto_auto_auto]">
                <article className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
                  <div className="absolute -right-8 top-0 h-28 w-28 rounded-full bg-sky-100/80 blur-2xl" />
                  <div className="relative">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <HomeIcon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.26em] text-sky-700">Espace client</p>
                    <h3 className="mt-3 font-serif text-2xl leading-tight text-slate-950 sm:text-[32px]">À vendre ou à louer avec un suivi simple</h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                      Connectez-vous pour sauvegarder vos favoris, comparer les biens et organiser vos visites.
                    </p>
                    <button
                      type="button"
                      onClick={openAuthModal}
                      className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
                    >
                      Ouvrir mon espace
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
                  <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-sky-100/80 blur-2xl" />
                  <div className="relative">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <Heart className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Favoris</p>
                    <p className="mt-3 max-w-sm text-sm leading-7 text-slate-700">
                      Gardez vos biens preferes a portee de main et revenez dessus quand vous voulez.
                    </p>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#eff7ff_0%,#ffffff_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-sky-100 sm:p-6">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-100/90 blur-2xl" />
                  <div className="relative">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.16)]">
                      <Award className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Confiance</p>
                    <p className="mt-3 max-w-sm text-sm leading-7 text-slate-700">
                      Chaque annonce passe par une validation admin avant publication pour préserver la qualité du catalogue.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
