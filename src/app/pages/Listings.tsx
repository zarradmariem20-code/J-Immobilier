import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import { ChevronDown, Search } from "lucide-react";
import type { Property } from "../data/properties";
import { getProperties } from "../../lib/api";

export function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterType, setFilterType] = useState<string>(searchParams.get("type") ?? "all");
  const [transactionType, setTransactionType] = useState<string>(searchParams.get("transaction") ?? "all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("q") ?? "");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement | null>(null);
  const budgetRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterBarRef = useRef<HTMLElement | null>(null);
  const [filterActsAsHeader, setFilterActsAsHeader] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) setTypeOpen(false);
      if (budgetRef.current && !budgetRef.current.contains(event.target as Node)) setBudgetOpen(false);
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!filterBarRef.current) {
        return;
      }

      const top = filterBarRef.current.getBoundingClientRect().top;
      setFilterActsAsHeader(top <= 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const fieldCardClass = "rounded-[12px] border border-slate-200/80 bg-white/80 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-sky-200";
  const fieldLabelClass = "mb-1 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] leading-none text-slate-500";
  const fieldInputClass = "h-6 w-full border-0 bg-transparent p-0 text-[14px] font-medium text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis placeholder:font-normal placeholder:text-slate-400 focus:outline-none";

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
    setSearchParams(params, { replace: true });
  }, [filterType, searchTerm, setSearchParams, transactionType]);

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

    getProperties({ limit: 100 })
      .then((res) => setAllProperties(res.data.map(mapProperty)))
      .catch(() => setAllProperties([]));
  }, []);

  const filteredProperties = allProperties.filter((property) => {
    const matchesSearch =
      searchTerm.trim().length === 0 ||
      `${property.title} ${property.location} ${property.type} ${property.tags.join(" ")}`
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (filterType !== "all" && property.type !== filterType) {
      return false;
    }
    if (transactionType !== "all" && property.transactionType !== transactionType) {
      return false;
    }
    if (priceRange !== "all") {
      const price = property.price;
      if (transactionType === "Location" || property.transactionType === "Location") {
        if (priceRange === "under1m" && price >= 2000) return false;
        if (priceRange === "1m-2m" && (price < 2000 || price >= 5000)) return false;
        if (priceRange === "over2m" && price < 5000) return false;
      } else {
        if (priceRange === "under1m" && price >= 500000) return false;
        if (priceRange === "1m-2m" && (price < 500000 || price >= 1200000)) return false;
        if (priceRange === "over2m" && price < 1200000) return false;
      }
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
    if (left.featured === right.featured) {
      return left.id - right.id;
    }
    return left.featured ? -1 : 1;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className={`sticky top-0 z-[60] transition-all duration-300 ${filterActsAsHeader ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
        <Header />
      </div>

      <section className="bg-[linear-gradient(135deg,#0f172a_0%,#0f3d63_55%,#0ea5e9_100%)] text-white py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">Catalogue premium</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold mb-4">Annonces immobilières</h1>
          <p className="max-w-3xl text-lg text-sky-100">
            Recherche, tri et filtrage réunis sur une même vue pour le marché tunisien, avec sélection vente ou location.
          </p>
        </div>
      </section>

      <section
        ref={filterBarRef}
        className={`border-b bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_100%)] py-5 transition-all duration-300 ${filterActsAsHeader ? "sticky top-0 z-[70] shadow-[0_14px_26px_rgba(15,23,42,0.12)]" : "relative z-40"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-2 rounded-[18px] border border-sky-200/80 bg-white/72 p-2 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md xl:grid-cols-[1.25fr_0.78fr_0.9fr_0.8fr_0.8fr_auto]">

            {/* Localisation */}
            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Localisation</span>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={fieldInputClass}
                  placeholder="Tunis, Nabeul, Sousse, Sfax..."
                />
              </div>
            </label>

            {/* Type de bien */}
            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Type de bien</span>
              <div className="relative" ref={typeRef}>
                <button
                  type="button"
                  onClick={() => setTypeOpen((prev) => !prev)}
                  className={`${fieldInputClass} flex items-center justify-between pr-1 text-left`}
                >
                  <span className={filterType === "all" ? "text-slate-400" : "text-slate-900"}>
                    {filterType === "all" ? "Tous les types" : filterType}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${typeOpen ? "rotate-180" : "rotate-0"}`} />
                </button>
                {typeOpen && (
                  <div className="absolute left-0 right-0 top-full z-[80] mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                    {[{ value: "all", label: "Tous les types" }, "Appartement", "Maison", "Villa", "Commercial", "Terrain"].map((item) => {
                      const val = typeof item === "string" ? item : item.value;
                      const lbl = typeof item === "string" ? item : item.label;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => { setFilterType(val); setTypeOpen(false); }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${filterType === val ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>

            {/* Transaction */}
            <div className={fieldCardClass}>
              <span className={fieldLabelClass}>Transaction</span>
              <div className="flex gap-0.5 rounded-full bg-slate-100/80 p-0.5">
                {[
                  { value: "all", label: "Toutes" },
                  { value: "Vente", label: "Vente" },
                  { value: "Location", label: "Location" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTransactionType(item.value)}
                    className={`flex-1 rounded-full px-2 py-1 text-xs font-semibold transition ${transactionType === item.value ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Budget</span>
              <div className="relative" ref={budgetRef}>
                <button
                  type="button"
                  onClick={() => setBudgetOpen((prev) => !prev)}
                  className={`${fieldInputClass} flex items-center justify-between pr-1 text-left`}
                >
                  <span className={priceRange === "all" ? "text-slate-400" : "text-slate-900"}>
                    {priceRange === "all" ? "Tous les prix" : priceRange === "under1m" ? "Entrée de gamme" : priceRange === "1m-2m" ? "Milieu de gamme" : "Haut de gamme"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${budgetOpen ? "rotate-180" : "rotate-0"}`} />
                </button>
                {budgetOpen && (
                  <div className="absolute left-0 right-0 top-full z-[80] mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                    {[
                      { value: "all", label: "Tous les prix" },
                      { value: "under1m", label: "Entrée de gamme" },
                      { value: "1m-2m", label: "Milieu de gamme" },
                      { value: "over2m", label: "Haut de gamme" },
                    ].map((item) => (
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

            {/* Tri */}
            <label className={fieldCardClass}>
              <span className={fieldLabelClass}>Tri</span>
              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => setSortOpen((prev) => !prev)}
                  className={`${fieldInputClass} flex items-center justify-between pr-1 text-left`}
                >
                  <span className="text-slate-900">
                    {sortBy === "featured" ? "Mettre en avant" : sortBy === "price-asc" ? "Prix croissant" : sortBy === "price-desc" ? "Prix décroissant" : "Surface décroissante"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${sortOpen ? "rotate-180" : "rotate-0"}`} />
                </button>
                {sortOpen && (
                  <div className="absolute left-0 right-0 top-full z-[80] mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                    {[
                      { value: "featured", label: "Mettre en avant" },
                      { value: "price-asc", label: "Prix croissant" },
                      { value: "price-desc", label: "Prix décroissant" },
                      { value: "area-desc", label: "Surface décroissante" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => { setSortBy(item.value); setSortOpen(false); }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${sortBy === item.value ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            {/* Réinitialiser */}
            <button
              type="button"
              onClick={() => {
                setFilterType("all");
                setTransactionType("all");
                setPriceRange("all");
                setSearchTerm("");
                setSortBy("featured");
              }}
              className="inline-flex min-h-[52px] items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-5 font-semibold text-sm text-white shadow-[0_10px_20px_rgba(2,6,23,0.35)] transition hover:brightness-110"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-0 flex-grow py-12 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredProperties.length > 0 ? (
            <>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-600">
                  Affichage de {filteredProperties.length} {filteredProperties.length === 1 ? 'propriété' : 'propriétés'}
                </p>
                <p className="text-sm text-slate-500">Astuce: utilisez l'icône cœur pour constituer une sélection rapide.</p>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 py-16 text-center shadow-sm">
              <p className="text-lg text-slate-600">Aucune propriété ne correspond à vos filtres.</p>
              <button
                onClick={() => {
                  setFilterType("all");
                  setTransactionType("all");
                  setPriceRange("all");
                  setSearchTerm("");
                  setSortBy("featured");
                }}
                className="mt-4 font-semibold text-sky-700 hover:text-sky-800"
              >
                Réinitialiser les Filtres
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
