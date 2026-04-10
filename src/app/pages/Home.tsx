import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Award, BadgeDollarSign, ChevronDown, Home as HomeIcon, KeyRound, Search, Star, TrendingUp, UserRound } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import editorialImageTwo from "../../assets/image1.jpeg";
import type { Property } from "../data/properties";
import { getCachedPublicProperties, getPublicPropertiesAsync } from "../utils/publicListings";
import { isUserLoggedIn } from "../utils/storage";
import { subscribeToPropertiesRealtime } from "../../lib/api";

export function Home() {
  const [publicProperties, setPublicProperties] = useState<Property[]>(() => getCachedPublicProperties());
  const featuredProperties = publicProperties.filter((p) => p.featured).slice(0, 6);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [transactionType, setTransactionType] = useState("Vente");
  const [typeOpen, setTypeOpen] = useState(false);
  const [activeReview, setActiveReview] = useState(0);
  const typeRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

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
    if (searchLocation.trim()) {
      params.set("q", searchLocation.trim());
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

  const openAuthModal = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "login" } }));
  };

  const openAddListingFlow = () => {
    if (isUserLoggedIn()) {
      navigate("/submit-listing");
      return;
    }

    window.dispatchEvent(new CustomEvent("open-auth-modal", {
      detail: { mode: "login", redirectTo: "/submit-listing" },
    }));
  };

  const clientReviews = [
    {
      name: "Meriem B.",
      city: "Tunis",
      role: "Locataire",
      quote: "J'ai récemment eu besoin d'aide pour finaliser ma recherche et tout a été beaucoup plus simple que prévu. L'accompagnement était clair, rapide et rassurant à chaque étape.",
      rating: 5,
      reviewCount: "3 avis",
      timeAgo: "Il y a 2 mois",
    },
    {
      name: "Walid K.",
      city: "Sousse",
      role: "Acheteur",
      quote: "Les annonces sont lisibles, les informations sont bien présentées et j'ai pu comparer plusieurs biens sans perdre de temps. On sent un vrai effort sur la clarté.",
      rating: 5,
      reviewCount: "5 avis",
      timeAgo: "Il y a 1 mois",
    },
    {
      name: "Nour A.",
      city: "La Marsa",
      role: "Investisseuse",
      quote: "Le rendu inspire confiance dès l'ouverture d'une annonce. Les visuels, les détails et le suivi donnent envie d'aller plus loin et de planifier une visite.",
      rating: 4,
      reviewCount: "4 avis",
      timeAgo: "Il y a 3 mois",
    },
  ];

  const getCubeTransform = (index: number) => {
    let offset = index - activeReview;
    const length = clientReviews.length;

    if (offset > length / 2) {
      offset -= length;
    }
    if (offset < -length / 2) {
      offset += length;
    }

    const rotate = -65 * offset;
    const translate = 100 * offset;
    const scale = offset === 0 ? 1 : 0.92;
    return `translateX(${translate}%) rotateY(${rotate}deg) scale(${scale})`;
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveReview((prev) => (prev + 1) % clientReviews.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [clientReviews.length]);


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
            className="relative z-[120] mt-5 grid w-full max-w-4xl gap-2 rounded-[18px] bg-white/95 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.28)] backdrop-blur-md sm:mt-6 sm:rounded-[22px] sm:p-2.5 lg:grid-cols-[1.4fr_1fr_auto]"
          >
            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Où ?</span>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchLocation}
                  onChange={(event) => setSearchLocation(event.target.value)}
                  className={fieldInputClass}
                  placeholder="Ville, quartier, région..."
                />
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
                    {Object.entries(propertyTypeGroups).map(([groupLabel, items]) => (
                      <div key={groupLabel} className="mb-1 last:mb-0">
                        <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                          {groupLabel}
                        </p>
                        {items.map((propertyType) => (
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
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a_0%,#0f3d63_64%,#0ea5e9_100%)] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] sm:rounded-[34px] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Propriétaire en Tunisie</p>
              <h3 className="mt-3 max-w-2xl font-serif text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">Publiez votre bien et recevez des demandes qualifiées</h3>
              <p className="mt-4 max-w-2xl text-sky-100">
                Déposez votre annonce en quelques étapes, ajoutez vos médias et laissez l'équipe valider avant mise en ligne.
              </p>
              <button
                type="button"
                onClick={openAddListingFlow}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-50"
              >
                Ajouter mon annonce
                <ArrowRight className="h-4 w-4" />
              </button>
              <img
                src="https://images.unsplash.com/photo-1560185007-5f0bb1866cab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900"
                alt="Propriétaire immobilier"
                className="mt-8 h-60 w-full rounded-2xl border border-white/20 object-cover"
              />
            </article>

            <div className="grid auto-rows-fr gap-6">
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700">Espace client</p>
                <h3 className="mt-3 font-serif text-2xl leading-tight text-slate-950 sm:text-3xl">À vendre ou à louer avec un suivi simple</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Connectez-vous pour sauvegarder vos favoris, comparer les biens et organiser vos visites.
                </p>
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-700"
                >
                  Ouvrir mon espace
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>

              <article className="rounded-[30px] border border-sky-100 bg-[linear-gradient(180deg,#f2f8ff_0%,#ffffff_100%)] p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Confiance</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Chaque annonce envoyée passe par une validation admin avant publication pour préserver la qualité du catalogue.
                </p>
              </article>
            </div>
          </div>

        </div>
      </section>

      <section className="py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex h-full lg:items-center">
              <div className="review-box-animate relative isolate min-h-[280px] w-full overflow-hidden rounded-[30px] border border-sky-100 bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_100%)] p-2.5 shadow-[0_16px_38px_rgba(15,23,42,0.10)] lg:h-[272px] [contain:paint] [perspective:1400px]">
                <div className="relative h-full overflow-hidden [transform-style:preserve-3d]">
                  {clientReviews.map((review, index) => (
                    <article
                      key={review.name}
                      className="absolute inset-0 flex h-full flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-5 text-slate-900 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
                      style={{
                        transform: getCubeTransform(index),
                        opacity: index === activeReview ? 1 : 0.35,
                        zIndex: index === activeReview ? 2 : 1,
                      }}
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Avis clients</p>
                      <div className="mt-5 flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-800">
                          <UserRound className="h-8 w-8 fill-current" />
                        </div>
                        <div>
                          <p className="font-serif text-[22px] font-semibold leading-none text-slate-950 md:text-[26px]">{review.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{review.reviewCount}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 text-amber-400">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={review.name + "-" + index}
                                  className={"h-5 w-5 " + (index < review.rating ? "fill-current" : "text-slate-200")}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-slate-400">{review.timeAgo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <p className="text-[15px] font-semibold text-slate-950">Client vérifié</p>
                        <blockquote className="mt-2 text-[15px] leading-8 text-slate-800 md:text-base">
                          {review.quote}
                        </blockquote>
                        <p className="mt-5 text-sm text-slate-500">{review.role} · {review.city}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative z-10 flex min-h-[260px] h-full flex-col rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_24px_64px_rgba(15,23,42,0.16)] sm:rounded-[30px] sm:p-7 lg:h-[316px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">À propos & contact</p>
                <h2 className="mt-3 font-serif text-[28px] font-semibold leading-[1.08] sm:text-[36px]">Découvrez l'agence et échangez directement avec notre équipe.</h2>
                <p className="mt-4 max-w-2xl text-slate-300">
                  Consultez notre approche, notre présence sur le marché tunisien et contactez-nous facilement pour poser une question, demander un accompagnement ou préparer votre projet immobilier.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  À propos
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
