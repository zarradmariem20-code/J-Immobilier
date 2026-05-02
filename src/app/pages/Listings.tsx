import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import { getCitiesForRegion, tunisiaRegionOptions } from "../data/locations";
import { ArrowLeft, BadgeDollarSign, Bath, BedDouble, Building2, ChevronDown, House, KeyRound, LandPlot, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import type { Property } from "../data/properties";
import { getCachedPublicProperties, getPublicPropertiesAsync, hasCachedPublicProperties } from "../utils/publicListings";
import { subscribeToPropertiesRealtime } from "../../lib/api";

const propertyTypesByTransaction = {
  Vente: {
    residential: ["Appartement", "Villa", "Immeuble"],
    business: ["Local commercial", "Bureau", "Usine"],
    land: ["Terrain", "Terrain agricole"],
  },
  Location: {
    residential: ["Appartement", "Villa"],
    business: ["Surface", "Bureau", "Usine"],
    land: [],
  },
};

function normalizePropertyCategory(value: string) {
  if (value === "Habitation") return "residential";
  if (value === "Commercial") return "business";
  if (value === "Terrain") return "land";
  return value;
}

const propertyTypesWithRoomFilters = new Set(["Appartement", "Villa", "Immeuble"]);

export function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedPerPage = Number.parseInt(searchParams.get("perPage") ?? "25", 10);
  const initialPerPage = [25, 50, 100].includes(parsedPerPage) ? parsedPerPage : 25;
  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const initialPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [filterType, setFilterType] = useState<string>(searchParams.get("type") ?? "all");
  const [transactionType, setTransactionType] = useState<string>(searchParams.get("transaction") ?? "all");
  const [selectedRegion, setSelectedRegion] = useState<string>(searchParams.get("region") ?? "all");
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get("city") ?? "all");
  const [propertyCategory, setPropertyCategory] = useState<string>(normalizePropertyCategory(searchParams.get("category") ?? "all"));
  const [priceRange, setPriceRange] = useState<string>(searchParams.get("price") ?? "all");
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("q") ?? "");
  const [bedroomFilter, setBedroomFilter] = useState<string>(searchParams.get("bedrooms") ?? "all");
  const [bathroomFilter, setBathroomFilter] = useState<string>(searchParams.get("bathrooms") ?? "all");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") ?? "newest");
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get("featured") === "1");
  const [recentOnly, setRecentOnly] = useState(searchParams.get("recent") === "1");
  const [listingsPerPage, setListingsPerPage] = useState<number>(initialPerPage);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [allProperties, setAllProperties] = useState<Property[]>(() => getCachedPublicProperties());
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const transactionRef = useRef<HTMLDivElement | null>(null);
  const typeRef = useRef<HTMLDivElement | null>(null);
  const budgetRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterBarRef = useRef<HTMLElement | null>(null);
  const [filterActsAsHeader, setFilterActsAsHeader] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !hasCachedPublicProperties());

  const combinedPropertyGroups = {
    residential: Array.from(new Set([...propertyTypesByTransaction.Vente.residential, ...propertyTypesByTransaction.Location.residential])),
    business: Array.from(new Set([...propertyTypesByTransaction.Vente.business, ...propertyTypesByTransaction.Location.business])),
    land: Array.from(new Set([...propertyTypesByTransaction.Vente.land, ...propertyTypesByTransaction.Location.land])),
  };

  const basePropertyGroups = transactionType === "Vente"
    ? propertyTypesByTransaction.Vente
    : transactionType === "Location"
      ? propertyTypesByTransaction.Location
      : combinedPropertyGroups;

  const availablePropertyGroups = propertyCategory === "all"
    ? basePropertyGroups
    : { [propertyCategory]: basePropertyGroups[propertyCategory as keyof typeof basePropertyGroups] ?? [] };

  const availablePropertyTypes = Object.values(availablePropertyGroups).flat();
  const saleBudgetOptions = [
    { value: "all", label: "Budget" },
    { value: "sale-under-150k", label: "Moins de 150 000 DT" },
    { value: "sale-150k-300k", label: "150 000 – 300 000 DT" },
    { value: "sale-300k-600k", label: "300 000 – 600 000 DT" },
    { value: "sale-600k-1m", label: "600 000 DT – 1M DT" },
    { value: "sale-over-1m", label: "1M DT et +" },
  ];
  const rentalBudgetOptions = [
    { value: "all", label: "Budget" },
    { value: "rent-under-800", label: "Moins de 800 DT/mois" },
    { value: "rent-800-1500", label: "800 – 1 500 DT/mois" },
    { value: "rent-1500-3000", label: "1 500 – 3 000 DT/mois" },
    { value: "rent-over-3000", label: "3 000 DT/mois et +" },
  ];
  const mixedBudgetOptions = [
    { value: "all", label: "Budget" },
    { value: "sale-under-300k", label: "Achat jusqu'à 300 000 DT" },
    { value: "sale-over-300k", label: "Achat 300 000 DT et +" },
    { value: "rent-under-1500", label: "Location jusqu'à 1 500 DT/mois" },
    { value: "rent-over-1500", label: "Location 1 500 DT/mois et +" },
  ];
  const budgetOptions = transactionType === "Vente"
    ? saleBudgetOptions
    : transactionType === "Location"
      ? rentalBudgetOptions
      : mixedBudgetOptions;
  const transactionOptions = [
    { value: "all", label: "Vente / Location", icon: Sparkles },
    { value: "Vente", label: "À vendre", icon: BadgeDollarSign },
    { value: "Location", label: "À louer", icon: KeyRound },
  ] as const;
  const selectedBudgetLabel = budgetOptions.find((item) => item.value === priceRange)?.label ?? "Tous les budgets";
  const selectedTransaction = transactionOptions.find((item) => item.value === transactionType) ?? transactionOptions[0];
  const cityOptions = selectedRegion !== "all" ? getCitiesForRegion(selectedRegion) : [];
  const getSelectTextClass = (hasValue: boolean) => hasValue ? "text-slate-900" : "text-slate-500";
  const showRoomFilters = propertyTypesWithRoomFilters.has(filterType);

  const loadAllProperties = useCallback(async (withLoader = true) => {
    if (withLoader && allProperties.length === 0 && !hasCachedPublicProperties()) {
      setIsLoading(true);
    }

    try {
      const res = await getPublicPropertiesAsync();
      setAllProperties(res);
    } catch {
      setAllProperties((current) => current);
    } finally {
      setIsLoading(false);
    }
  }, [allProperties.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transactionRef.current && !transactionRef.current.contains(event.target as Node)) setTransactionOpen(false);
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) setTypeOpen(false);
      if (budgetRef.current && !budgetRef.current.contains(event.target as Node)) setBudgetOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let frameId = 0;

    const updateStickyState = () => {
      if (!filterBarRef.current) {
        frameId = 0;
        return;
      }

      const filterTop = filterBarRef.current.offsetTop;
      const filterHeight = filterBarRef.current.offsetHeight;
      const isDesktop = window.innerWidth >= 640;
      const stickyStart = isDesktop
        ? Math.max(filterTop - 92, 24)
        : Math.max(filterTop + filterHeight - 96, 24);
      const stickyRelease = Math.max(stickyStart - (isDesktop ? 28 : 12), 0);

      setFilterActsAsHeader((previous) => {
        const next = previous ? window.scrollY >= stickyRelease : window.scrollY >= stickyStart;
        return previous === next ? previous : next;
      });
      frameId = 0;
    };

    const handleScroll = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(updateStickyState);
    };

    updateStickyState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const handleMobileFiltersFocus = () => {
    filterBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fieldCardClass = "min-w-0 rounded-[10px] border border-slate-200/80 bg-white/80 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-sky-200 sm:flex-1 sm:rounded-[12px] sm:px-3";
  const fieldLabelClass = "mb-1 block whitespace-nowrap text-center text-[9px] font-semibold uppercase tracking-[0.14em] leading-none text-slate-500 sm:text-[10px] sm:tracking-[0.16em]";
  const fieldInputClass = "h-5 w-full border-0 bg-transparent p-0 text-[13px] font-medium text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis placeholder:font-normal placeholder:text-slate-400 focus:outline-none sm:h-6 sm:text-[14px]";

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }
    if (filterType !== "all") {
      params.set("type", filterType);
    }
    if (transactionType !== "all") {
      params.set("transaction", transactionType);
    }
    if (selectedRegion !== "all") {
      params.set("region", selectedRegion);
    }
    if (selectedCity !== "all") {
      params.set("city", selectedCity);
    }
    if (propertyCategory !== "all") {
      params.set("category", propertyCategory);
    }
    if (bedroomFilter !== "all") {
      params.set("bedrooms", bedroomFilter);
    }
    if (bathroomFilter !== "all") {
      params.set("bathrooms", bathroomFilter);
    }
    if (priceRange !== "all") {
      params.set("price", priceRange);
    }
    if (sortBy !== "newest") {
      params.set("sort", sortBy);
    }
    if (featuredOnly) {
      params.set("featured", "1");
    }
    if (recentOnly) {
      params.set("recent", "1");
    }
    if (listingsPerPage !== 25) {
      params.set("perPage", String(listingsPerPage));
    }
    if (currentPage > 1) {
      params.set("page", String(currentPage));
    }
    setSearchParams(params, { replace: true });
  }, [bathroomFilter, bedroomFilter, currentPage, featuredOnly, filterType, listingsPerPage, priceRange, propertyCategory, recentOnly, searchTerm, selectedCity, selectedRegion, setSearchParams, sortBy, transactionType]);

  useEffect(() => {
    loadAllProperties(true);
  }, [loadAllProperties]);

  useEffect(() => {
    if (showRoomFilters) {
      return;
    }

    if (bedroomFilter !== "all") {
      setBedroomFilter("all");
    }

    if (bathroomFilter !== "all") {
      setBathroomFilter("all");
    }
  }, [bathroomFilter, bedroomFilter, showRoomFilters]);

  useEffect(() => {
    const unsubscribe = subscribeToPropertiesRealtime(() => {
      loadAllProperties(false);
    });
    return () => {
      unsubscribe();
    };
  }, [loadAllProperties]);

  const recentPropertyIds = new Set([...allProperties].sort((a, b) => b.id - a.id).slice(0, 8).map((property) => property.id));
  const getPropertyCategory = (type: string) => {
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes("terrain")) {
      return "land";
    }
    if (["local commercial", "bureau", "usine", "surface"].includes(normalizedType)) {
      return "business";
    }
    return "residential";
  };

  const filteredProperties = allProperties.filter((property) => {
    const matchesSearch =
      searchTerm.trim().length === 0 ||
      `${property.title} ${property.location} ${property.type} ${property.tags.join(" ")}`
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (selectedRegion !== "all" && property.region !== selectedRegion) {
      return false;
    }

    if (selectedCity !== "all" && property.city !== selectedCity) {
      return false;
    }

    if (propertyCategory !== "all" && getPropertyCategory(property.type) !== propertyCategory) {
      return false;
    }

    if (filterType !== "all") {
      const matchesType = filterType === "Local commercial"
        ? property.type === "Local commercial" || property.type === "Commercial"
        : property.type === filterType;

      if (!matchesType) {
        return false;
      }
    }

    if (transactionType !== "all" && property.transactionType !== transactionType) {
      return false;
    }

    if (bedroomFilter !== "all" && property.bedrooms < Number(bedroomFilter)) {
      return false;
    }

    if (bathroomFilter !== "all" && property.bathrooms < Number(bathroomFilter)) {
      return false;
    }

    if (featuredOnly && !property.featured) {
      return false;
    }

    if (recentOnly && !recentPropertyIds.has(property.id)) {
      return false;
    }

    if (priceRange !== "all") {
      const price = property.price;
      const isRental = property.transactionType === "Location";

      if (priceRange === "sale-under-150k" && (!(!isRental && price < 150000))) return false;
      if (priceRange === "sale-150k-300k" && (!(!isRental && price >= 150000 && price < 300000))) return false;
      if (priceRange === "sale-300k-600k" && (!(!isRental && price >= 300000 && price < 600000))) return false;
      if (priceRange === "sale-600k-1m" && (!(!isRental && price >= 600000 && price < 1000000))) return false;
      if (priceRange === "sale-over-1m" && (!(!isRental && price >= 1000000))) return false;
      if (priceRange === "sale-under-300k" && (!(!isRental && price < 300000))) return false;
      if (priceRange === "sale-over-300k" && (!(!isRental && price >= 300000))) return false;
      if (priceRange === "rent-under-800" && (!(isRental && price < 800))) return false;
      if (priceRange === "rent-800-1500" && (!(isRental && price >= 800 && price < 1500))) return false;
      if (priceRange === "rent-1500-3000" && (!(isRental && price >= 1500 && price < 3000))) return false;
      if (priceRange === "rent-over-3000" && (!(isRental && price >= 3000))) return false;
      if (priceRange === "rent-under-1500" && (!(isRental && price < 1500))) return false;
      if (priceRange === "rent-over-1500" && (!(isRental && price >= 1500))) return false;
    }

    return true;
  }).sort((left, right) => {
    if (sortBy === "price-asc") {
      return left.price - right.price;
    }
    if (sortBy === "price-desc") {
      return right.price - left.price;
    }
    if (sortBy === "area-desc") {
      return right.area - left.area;
    }
    if (sortBy === "featured") {
      if (left.featured === right.featured) {
        return right.id - left.id;
      }
      return left.featured ? -1 : 1;
    }
    return right.id - left.id;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / listingsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * listingsPerPage;
  const endIndex = startIndex + listingsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [bathroomFilter, bedroomFilter, featuredOnly, filterType, listingsPerPage, priceRange, propertyCategory, recentOnly, searchTerm, selectedCity, selectedRegion, sortBy, transactionType]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className={`relative z-[60] transition-[transform,opacity] duration-300 ${filterActsAsHeader ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
        <Header />
      </div>

      <section className="bg-[linear-gradient(135deg,#0f172a_0%,#0f3d63_55%,#0ea5e9_100%)] py-8 text-white sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200 sm:text-sm sm:tracking-[0.28em]">Catalogue premium</p>
          <h1 className="mb-2 mt-2 font-serif text-[34px] font-semibold leading-[1.02] sm:mt-3 sm:mb-4 sm:text-5xl">Annonces immobilières</h1>
          <p className="max-w-3xl text-sm leading-6 text-sky-100 sm:text-lg sm:leading-7">
            Recherche, tri et filtrage réunis sur une même vue pour le marché tunisien, avec sélection vente ou location.
          </p>
        </div>
      </section>

      {filterActsAsHeader && (
        <div className="sticky top-0 z-[70] border-b bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_100%)] py-3 shadow-[0_14px_26px_rgba(15,23,42,0.12)] sm:hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid h-16 grid-cols-[1fr_auto] gap-2 rounded-[14px] border border-sky-200/80 bg-white/85 p-2 ring-1 ring-sky-100/70 shadow-[0_8px_20px_rgba(14,116,144,0.12)] backdrop-blur-md">
              <label className="flex items-center gap-2 rounded-[10px] border border-slate-200/90 bg-white px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-full w-full border-0 bg-transparent p-0 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  placeholder="Titre, ville ou reference..."
                />
              </label>
              <button
                type="button"
                onClick={handleMobileFiltersFocus}
                className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
              </button>
            </div>
          </div>
        </div>
      )}

      <section
        ref={filterBarRef}
        className={`relative z-40 border-b bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_100%)] py-3 transition-[box-shadow,background-color] duration-300 sm:sticky sm:top-0 sm:z-[70] sm:py-5 ${filterActsAsHeader ? "shadow-[0_14px_26px_rgba(15,23,42,0.12)]" : ""}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[14px] border border-sky-200/80 bg-white/72 p-1.5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md sm:rounded-[18px] sm:p-2">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-nowrap">
                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Recherche</span>
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className={fieldInputClass}
                      placeholder="Titre ou reference"
                    />
                  </div>
                </label>

                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Region</span>
                  <select
                    value={selectedRegion}
                    onChange={(event) => {
                      setSelectedRegion(event.target.value);
                      setSelectedCity("all");
                    }}
                    className={`${fieldInputClass} appearance-none ${getSelectTextClass(selectedRegion !== "all")}`}
                  >
                    <option value="all">Toutes les regions</option>
                    {tunisiaRegionOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Ville</span>
                  <select
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                    disabled={selectedRegion === "all"}
                    className={`${fieldInputClass} appearance-none ${getSelectTextClass(selectedCity !== "all")} disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60`}
                  >
                    <option value="all">{selectedRegion === "all" ? "Choisir une region" : "Toutes les villes"}</option>
                    {cityOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Transaction</span>
                  <div className="relative min-w-0" ref={transactionRef}>
                    <button
                      type="button"
                      onClick={() => setTransactionOpen((prev) => !prev)}
                      className={`${fieldInputClass} min-w-0 flex items-center justify-between gap-2 pr-1 text-left`}
                    >
                      <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                        <selectedTransaction.icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <span className={transactionType === "all" ? "truncate text-slate-500" : "truncate text-slate-900"}>
                          {selectedTransaction.label}
                        </span>
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${transactionOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {transactionOpen && (
                      <div className="absolute left-0 right-0 top-full z-[140] mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                        {transactionOptions.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                setTransactionType(item.value);
                                setPropertyCategory("all");
                                setFilterType("all");
                                setPriceRange("all");
                                setTransactionOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${transactionType === item.value ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </label>

                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Type de bien</span>
                  <div className="relative min-w-0" ref={typeRef}>
                    <button
                      type="button"
                      onClick={() => setTypeOpen((prev) => !prev)}
                      className={`${fieldInputClass} min-w-0 flex items-center justify-between gap-2 pr-1 text-left`}
                    >
                      <span className={filterType === "all" ? "block min-w-0 truncate text-slate-500" : "block min-w-0 truncate text-slate-900"}>
                        {filterType === "all" ? "Type de bien" : filterType}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${typeOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {typeOpen && (
                      <div className="modern-scrollbar absolute left-0 right-0 top-full z-[140] mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                        <button
                          type="button"
                          onClick={() => { setFilterType("all"); setTypeOpen(false); }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${filterType === "all" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                        >
                          Type de bien
                        </button>
                        {availablePropertyTypes.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => { setFilterType(item); setTypeOpen(false); }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${filterType === item ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>

                {showRoomFilters ? (
                  <>
                    <label className={fieldCardClass}>
                      <span className={fieldLabelClass}>Chambres</span>
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-slate-400" />
                        <select
                          value={bedroomFilter}
                          onChange={(event) => setBedroomFilter(event.target.value)}
                          className={`${fieldInputClass} appearance-none ${getSelectTextClass(bedroomFilter !== "all")}`}
                          style={{ color: bedroomFilter === "all" ? "#94a3b8" : "#0f172a" }}
                        >
                          <option value="all">Chambres</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                          <option value="5">5+</option>
                        </select>
                      </div>
                    </label>

                    <label className={fieldCardClass}>
                      <span className={fieldLabelClass}>Salles de bain</span>
                      <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4 text-slate-400" />
                        <select
                          value={bathroomFilter}
                          onChange={(event) => setBathroomFilter(event.target.value)}
                          className={`${fieldInputClass} appearance-none ${getSelectTextClass(bathroomFilter !== "all")}`}
                          style={{ color: bathroomFilter === "all" ? "#94a3b8" : "#0f172a" }}
                        >
                          <option value="all">Salles de bain</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                        </select>
                      </div>
                    </label>
                  </>
                ) : null}

                <label className={fieldCardClass}>
                  <span className={fieldLabelClass}>Budget</span>
                  <div className="relative min-w-0" ref={budgetRef}>
                    <button
                      type="button"
                      onClick={() => setBudgetOpen((prev) => !prev)}
                      className={`${fieldInputClass} min-w-0 flex items-center justify-between gap-2 pr-1 text-left`}
                    >
                      <span className={priceRange === "all" ? "block min-w-0 truncate text-slate-500" : "block min-w-0 truncate text-slate-900"}>
                        {selectedBudgetLabel}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${budgetOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {budgetOpen && (
                      <div className="absolute left-0 right-0 top-full z-[140] mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                        {budgetOptions.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => { setPriceRange(item.value); setBudgetOpen(false); }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${priceRange === item.value ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>

                </div>

                <button
                  type="button"
                  aria-label="Rechercher"
                  onClick={() => window.scrollTo({ top: 320, behavior: "smooth" })}
                  className="inline-flex min-h-[56px] w-full items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#1f5f96_0%,#174a75_100%)] px-4 text-white shadow-[0_10px_20px_rgba(31,95,150,0.28)] transition hover:brightness-110 sm:ml-auto sm:w-[96px] sm:flex-none"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-0 flex-grow py-12 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <>
              <div className="mb-6">
                <p className="text-slate-500">Chargement des annonces...</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`listing-skeleton-${index}`}
                    className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-[24px] sm:p-4"
                  >
                    <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-200/70" />
                    <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-slate-200/70" />
                    <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200/70" />
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="h-8 animate-pulse rounded-xl bg-slate-200/70" />
                      <div className="h-8 animate-pulse rounded-xl bg-slate-200/70" />
                      <div className="h-8 animate-pulse rounded-xl bg-slate-200/70" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : filteredProperties.length > 0 ? (
            <>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-600">
                  Affichage de {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} sur {filteredProperties.length} {filteredProperties.length === 1 ? "propriété" : "propriétés"}
                </p>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <span className="text-slate-500">Par page</span>
                    <span className="relative inline-flex items-center">
                      <select
                        value={String(listingsPerPage)}
                        onChange={(event) => setListingsPerPage(Number(event.target.value))}
                        className="appearance-none border-0 bg-transparent p-0 pr-5 font-semibold text-slate-900 outline-none focus:outline-none focus-visible:outline-none"
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-400" />
                    </span>
                  </label>

                  <div className="relative self-start sm:self-auto" ref={sortRef}>
                    <button
                      type="button"
                      onClick={() => setSortOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                    >
                      Trier
                      <span className="hidden text-slate-400 sm:inline">
                        · {sortBy === "featured" ? "Mise en avant" : sortBy === "price-asc" ? "Prix croissant" : sortBy === "price-desc" ? "Prix décroissant" : sortBy === "area-desc" ? "Surface décroissante" : "Plus récentes"}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition ${sortOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>

                    {sortOpen && (
                      <div className="absolute right-0 top-full z-[140] mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                        {[
                          { value: "newest", label: "Plus récentes" },
                          { value: "featured", label: "Mise en avant" },
                          { value: "price-asc", label: "Prix croissant" },
                          { value: "price-desc", label: "Prix décroissant" },
                          { value: "area-desc", label: "Surface décroissante" },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setSortBy(item.value);
                              setSortOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${sortBy === item.value ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {paginatedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Page précédente
                  </button>
                  <p className="text-sm text-slate-600">
                    Page {safeCurrentPage} / {totalPages}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Page suivante
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 py-16 text-center shadow-sm">
              <p className="text-lg text-slate-600">
                {allProperties.length === 0 ? "Aucune annonce disponible pour le moment." : "Aucune propriété ne correspond à vos filtres."}
              </p>
              {allProperties.length > 0 && (
                <button
                  onClick={() => {
                    setFilterType("all");
                    setTransactionType("all");
                    setSelectedRegion("all");
                    setSelectedCity("all");
                    setPropertyCategory("all");
                    setPriceRange("all");
                    setSearchTerm("");
                    setBedroomFilter("all");
                    setBathroomFilter("all");
                    setSortBy("newest");
                    setFeaturedOnly(false);
                    setRecentOnly(false);
                  }}
                  className="mt-4 font-semibold text-sky-700 hover:text-sky-800"
                >
                  Réinitialiser les Filtres
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
