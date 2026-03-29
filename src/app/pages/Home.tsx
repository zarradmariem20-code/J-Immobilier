import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Award, ChevronDown, Home as HomeIcon, Search, Star, TrendingUp, UserRound } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import editorialImage from "../../assets/image.png";
import editorialImageTwo from "../../assets/image1.jpeg";
import editorialImageThree from "../../assets/image2.jpg";
import { getPublicProperties } from "../utils/publicListings";
import { isUserLoggedIn } from "../utils/storage";

export function Home() {
  const [publicProperties, setPublicProperties] = useState(getPublicProperties());
  const featuredProperties = publicProperties.filter((p) => p.featured).slice(0, 6);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchDistrict, setSearchDistrict] = useState("");
  const [searchType, setSearchType] = useState("");
  const [transactionType, setTransactionType] = useState("Vente");
  const [regionOpen, setRegionOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [activeReview, setActiveReview] = useState(0);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const districtRef = useRef<HTMLDivElement | null>(null);
  const typeRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const regions = [
    "Tunis",
    "Ariana",
    "Ben Arous",
    "Manouba",
    "La Marsa",
    "Hammamet",
    "Nabeul",
    "Sousse",
    "Sfax",
    "Gabès",
    "Gafsa",
    "Jendouba",
    "Kairouan",
    "Kasserine",
    "Kebili",
    "Médenine",
    "Monastir",
    "Sidi Bouzid",
    "Siliana",
    "Tataouine",
    "Tozeur",
  ];

  const propertyTypes = ["Appartement", "Maison", "Villa", "Commercial", "Terrain"];

  const districtByRegion: Record<string, Array<{ segment: string; items: string[] }>> = {
    Tunis: [
      { segment: "Grand Tunis", items: ["Ennasr", "Menzah 6", "Menzah 9", "Mutuelleville", "Lafayette-Montplaisir", "Le Bardo", "Lac 1", "Lac 2"] },
      { segment: "Banlieue Nord", items: ["La Marsa", "Gammarth", "Carthage", "Sidi Bou Saïd", "La Soukra"] },
    ],
    Ariana: [
      { segment: "Ariana Ville", items: ["Ariana Ville", "Menzah 8", "Raoued", "Ennasr 2", "Sokra"] },
    ],
    "Ben Arous": [
      { segment: "Ben Arous", items: ["Ben Arous", "Mégrine", "Radès", "Ezzahra", "Hammam Lif"] },
    ],
    Manouba: [
      { segment: "Manouba", items: ["Manouba", "Denden", "Oued Ellil", "Borj El Amri", "Jedaida"] },
    ],
    Nabeul: [
      { segment: "Cap Bon", items: ["Nabeul Centre", "Hammamet Nord", "Yasmine Hammamet", "Kélibia", "Dar Chaabane"] },
    ],
    Sousse: [
      { segment: "Sousse Ville", items: ["Sousse Centre", "Khzema", "Sahloul", "Chott Meriem", "Hergla"] },
    ],
    Monastir: [
      { segment: "Monastir Ville", items: ["Monastir Centre", "Skanes", "Sahline", "Ksar Hellal", "Bekalta"] },
    ],
    Sfax: [
      { segment: "Sfax Ville", items: ["Sfax Centre", "Sakiet Ezzit", "Sakiet Eddaier", "Route Gremda", "Route Tunis"] },
    ],
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) {
        setRegionOpen(false);
      }
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setDistrictOpen(false);
      }
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
    const syncListings = () => setPublicProperties(getPublicProperties());
    window.addEventListener("listings-updated", syncListings);
    return () => window.removeEventListener("listings-updated", syncListings);
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (searchLocation.trim()) {
      params.set("q", searchLocation.trim());
    }
    if (searchDistrict.trim()) {
      params.set("district", searchDistrict.trim());
    }
    if (searchType && searchType !== "all") {
      params.set("type", searchType);
    }
    if (transactionType !== "all") {
      params.set("transaction", transactionType);
    }

    navigate(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const editorialPhotos = [
    editorialImageTwo,
    editorialImage,
    editorialImageThree,
  ];

  const fieldCardClass = "rounded-[12px] border border-white/80 bg-white/80 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-sky-200";
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

  const districtSegments = districtByRegion[searchLocation] ?? [
    { segment: "Exemple quartiers", items: ["Nabeul Centre", "Hammamet Nord", "Khzema"] },
  ];

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
      style={{ zoom: "110%" }}
      className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)]"
    >
      <Header />
      <section className="relative overflow-hidden px-4 pb-20 pt-[5px] sm:px-6 lg:px-8 lg:pb-24 lg:pt-[5px]">
        <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10 pt-2 lg:pt-3">
            <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-tight text-slate-950 md:text-6xl">
              Trouvez votre bien en Tunisie avec une sélection plus nette et plus moderne.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Explorez Tunis, La Marsa, Hammamet, Sousse ou Sfax avec une recherche plus simple, des filtres clairs et des biens adaptés au marché tunisien.
            </p>
            <div className="mt-7 space-y-2.5">
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                {[
                  { value: "Vente", label: "Acheter" },
                  { value: "Location", label: "Louer" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTransactionType(item.value)}
                    className={`text-lg font-bold transition ${transactionType === item.value ? "text-slate-950 border-b-2 border-slate-950 pb-2" : "text-slate-400"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <form
                onSubmit={handleSearch}
                className="grid max-w-3xl gap-2 rounded-[18px] border border-sky-200/80 bg-white/72 p-2 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.16)] backdrop-blur-md sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Région</span>
                  <div className="relative" ref={regionRef}>
                    <button
                      type="button"
                      onClick={() => setRegionOpen((prev) => !prev)}
                      className={`${fieldInputClass} flex items-center justify-between pr-1 text-left`}
                    >
                      <span className={searchLocation ? "text-slate-900" : "text-slate-400"}>
                        {searchLocation || "Nabeul"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${regionOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {regionOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                        {regions.map((region) => (
                          <button
                            key={region}
                            type="button"
                            onClick={() => {
                              setSearchLocation(region);
                              setSearchDistrict("");
                              setRegionOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                              searchLocation === region ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {region}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Quartier</span>
                  <div className="relative" ref={districtRef}>
                    <button
                      type="button"
                      onClick={() => setDistrictOpen((prev) => !prev)}
                      className={`${fieldInputClass} flex items-center justify-between pr-1 text-left`}
                    >
                      <span className={searchDistrict ? "text-slate-900" : "text-slate-400"}>
                        {searchDistrict || "Nabeul Centre"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${districtOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {districtOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                        {districtSegments.map((group) => (
                          <div key={group.segment} className="mb-1 last:mb-0">
                            <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              {group.segment}
                            </p>
                            {group.items.map((district) => (
                              <button
                                key={district}
                                type="button"
                                onClick={() => {
                                  setSearchDistrict(district);
                                  setDistrictOpen(false);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                                  searchDistrict === district ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {district}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
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
                      <span className={searchType ? "text-slate-900" : "text-slate-400"}>
                        {searchType || "Appartement"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${typeOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {typeOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
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
                        {propertyTypes.map((propertyType) => (
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
                  className="inline-flex h-full min-h-[52px] items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-4 py-2 font-semibold text-white text-sm shadow-[0_10px_20px_rgba(2,6,23,0.35)] transition hover:brightness-110"
                >
                  <Search className="h-4 w-4" />
                  Chercher
                </button>
              </form>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
                  <HomeIcon className="h-6 w-6 text-sky-700" />
                </div>
                <p className="text-3xl font-bold text-slate-950">500+</p>
                <p className="mt-1 text-sm text-slate-500">Propriétés listées</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
                  <TrendingUp className="h-6 w-6 text-sky-700" />
                </div>
                <p className="text-3xl font-bold text-slate-950">1000+</p>
                <p className="mt-1 text-sm text-slate-500">Clients satisfaits</p>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
                  <Award className="h-6 w-6 text-sky-700" />
                </div>
                <p className="text-3xl font-bold text-slate-950">15+</p>
                <p className="mt-1 text-sm text-slate-500">Ans d'expérience</p>
              </div>
            </div>
          </div>

          <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <div className="space-y-4 md:pt-0">
              <div className="overflow-hidden rounded-[32px] border border-white/50 shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
                <ImageWithFallback src={editorialPhotos[0]} alt="Villa contemporaine" className="h-72 w-full object-cover" />
              </div>
              <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Sélection éditoriale</p>
                <p className="mt-3 font-serif text-2xl">Des biens qui évoquent La Marsa, Gammarth, Hammamet et les régions les plus recherchées.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[32px] border border-white/50 shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
                <ImageWithFallback src={editorialPhotos[1]} alt="Intérieur lumineux" className="h-96 w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-[32px] border border-white/50 shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
                <ImageWithFallback src={editorialPhotos[2]} alt="Salon design" className="h-56 w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      

      <section className="py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Sélection premium</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold text-slate-950">Des annonces mieux organisées et plus engageantes</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
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
            <article className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(145deg,#0f172a_0%,#0f3d63_64%,#0ea5e9_100%)] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Propriétaire en Tunisie</p>
              <h3 className="mt-3 max-w-2xl font-serif text-5xl leading-[1.1]">Publiez votre bien et recevez des demandes qualifiées</h3>
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
              <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700">Espace client</p>
                <h3 className="mt-3 font-serif text-3xl leading-tight text-slate-950">Acheter ou louer avec un suivi simple</h3>
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
            <div className="relative z-10 flex min-h-[300px] h-full flex-col rounded-[30px] bg-slate-950 p-7 text-white shadow-[0_24px_64px_rgba(15,23,42,0.16)] lg:h-[316px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">À propos & contact</p>
                <h2 className="mt-3 font-serif text-[36px] font-semibold leading-[1.08]">Découvrez l'agence et échangez directement avec notre équipe.</h2>
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
