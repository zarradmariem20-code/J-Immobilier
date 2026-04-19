import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, LocateFixed, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { approveListingWithBackend, clearListingsCache, getProperties } from "../../lib/api";
import { deriveLocationLabel, getCitiesForRegion, inferRegionCity, tunisiaRegionOptions } from "../data/locations";
import {
  getAdminSession,
  getListingSubmissions,
  updateListingSubmission,
  type ListingSubmission,
} from "../utils/storage";

type ListingFormState = {
  title: string;
  price: string;
  transactionType: "Vente" | "Location";
  region: string;
  city: string;
  location: string;
  mapLocationQuery: string;
  nearbyCommodities: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  description: string;
  fullName: string;
  email: string;
  phone: string;
  coverImage: string;
  gallery: string;
  features: string;
  tags: string;
  featured: boolean;
};

const emptyState: ListingFormState = {
  title: "",
  price: "",
  transactionType: "Vente",
  region: "",
  city: "",
  location: "",
  mapLocationQuery: "",
  nearbyCommodities: "",
  propertyType: "Appartement",
  bedrooms: "0",
  bathrooms: "0",
  area: "0",
  description: "",
  fullName: "",
  email: "",
  phone: "",
  coverImage: "",
  gallery: "",
  features: "",
  tags: "",
  featured: false,
};

function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFormState(item: ListingSubmission): ListingFormState {
  const inferredLocation = inferRegionCity({
    region: item.region,
    city: item.city,
    location: item.location,
    mapLocationQuery: item.mapLocationQuery,
  });

  return {
    title: item.title,
    price: String(item.price ?? ""),
    transactionType: item.transactionType,
    region: item.region ?? inferredLocation.region,
    city: item.city ?? inferredLocation.city,
    location: item.location,
    mapLocationQuery: item.mapLocationQuery ?? "",
    nearbyCommodities: (item.nearbyCommodities ?? []).join(", "),
    propertyType: item.propertyType,
    bedrooms: String(item.bedrooms ?? 0),
    bathrooms: String(item.bathrooms ?? 0),
    area: String(item.area ?? 0),
    description: item.description ?? "",
    fullName: item.fullName ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    coverImage: item.coverImage ?? "",
    gallery: (item.gallery ?? []).join("\n"),
    features: (item.features ?? []).join(", "),
    tags: (item.tags ?? []).join(", "),
    featured: Boolean(item.featured),
  };
}

function mapDbRowToListing(row: any): ListingSubmission {
  const inferredLocation = inferRegionCity({
    region: row.region,
    city: row.city,
    location: row.location,
    mapLocationQuery: row.map_location_query,
  });

  return {
    id: `db-${row.id}`,
    publicId: Number(row.id),
    title: row.title ?? "Annonce publiée",
    price: Number(row.price ?? 0),
    transactionType: row.transaction_type === "Location" ? "Location" : "Vente",
    region: row.region ?? inferredLocation.region,
    city: row.city ?? inferredLocation.city,
    location: row.location ?? "",
    mapLocationQuery: row.map_location_query ?? "",
    nearbyCommodities: Array.isArray(row.nearby_commodities) ? row.nearby_commodities : [],
    propertyType: row.type ?? "Bien",
    description: row.description ?? "",
    fullName: "Publication directe",
    email: "-",
    phone: "-",
    photoCount: Array.isArray(row.gallery) ? row.gallery.length : 0,
    hasVideo: Boolean(row.video_url),
    videoUrl: row.video_url ?? undefined,
    coverImage: row.image ?? undefined,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    bedrooms: Number(row.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    area: Number(row.area ?? 0),
    features: Array.isArray(row.features) ? row.features : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    supabaseId: Number(row.id),
    status: "approved",
    featured: Boolean(row.featured),
    createdAt: row.created_at ?? new Date().toISOString(),
    reviewedAt: row.created_at ?? new Date().toISOString(),
  };
}

export function AdminEditListing() {
  const navigate = useNavigate();
  const params = useParams();
  const listingId = decodeURIComponent(params.listingId ?? "");
  const adminSession = useMemo(() => getAdminSession(), []);
  const [listing, setListing] = useState<ListingSubmission | null>(null);
  const [formState, setFormState] = useState<ListingFormState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const cityOptions = getCitiesForRegion(formState.region);
  const galleryPreviewUrls = useMemo(() => {
    const previewUrls = splitList(formState.gallery);

    if (formState.coverImage.trim().length > 0 && !previewUrls.includes(formState.coverImage.trim())) {
      previewUrls.unshift(formState.coverImage.trim());
    }

    return previewUrls;
  }, [formState.coverImage, formState.gallery]);
  const videoPreviewUrl = listing?.videoUrl?.trim() || "";

  useEffect(() => {
    if (!adminSession) {
      navigate("/admin");
    }
  }, [adminSession, navigate]);

  useEffect(() => {
    const loadListing = async () => {
      setLoading(true);
      setError("");

      const localItem = getListingSubmissions().find((item) => item.id === listingId);
      if (localItem) {
        setListing(localItem);
        setFormState(toFormState(localItem));
        setLoading(false);
        return;
      }

      if (listingId.startsWith("db-")) {
        try {
          const rows = await getProperties({ forceRefresh: true });
          const dbId = Number(listingId.replace("db-", ""));
          const row = rows.find((entry: any) => Number(entry?.id) === dbId);

          if (row) {
            const mapped = mapDbRowToListing(row);
            setListing(mapped);
            setFormState(toFormState(mapped));
          } else {
            setError("Annonce introuvable.");
          }
        } catch {
          setError("Impossible de charger cette annonce.");
        } finally {
          setLoading(false);
        }
        return;
      }

      setError("Annonce introuvable.");
      setLoading(false);
    };

    if (listingId) {
      loadListing();
    }
  }, [listingId]);

  const updateField = <K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("La geolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    setError("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateField("mapLocationQuery", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsLocating(false);
      },
      () => {
        setError("Impossible d'acceder a votre position.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listing) return;

    const gallery = splitList(formState.gallery);
    const coverImage = gallery[0] || listing.coverImage || "";
    const features = splitList(formState.features);
    const tags = splitList(formState.tags);
    const nearbyCommodities = splitList(formState.nearbyCommodities);
    const parsedPrice = Number(formState.price);
    const parsedBedrooms = Number(formState.bedrooms);
    const parsedBathrooms = Number(formState.bathrooms);
    const parsedArea = Number(formState.area);

    if (!formState.title.trim() || !formState.region.trim() || !formState.city.trim() || !formState.propertyType.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Merci de renseigner les champs obligatoires du bien.");
      return;
    }

    const derivedLocation = deriveLocationLabel(formState.region, formState.city, formState.location);

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const backendId = await approveListingWithBackend({
        id: listing.id,
        title: formState.title.trim(),
        price: parsedPrice,
        transactionType: formState.transactionType,
        region: formState.region.trim(),
        city: formState.city.trim(),
        location: derivedLocation,
        mapLocationQuery: formState.mapLocationQuery.trim() || undefined,
        nearbyCommodities,
        propertyType: formState.propertyType.trim(),
        bedrooms: Number.isFinite(parsedBedrooms) ? parsedBedrooms : 0,
        bathrooms: Number.isFinite(parsedBathrooms) ? parsedBathrooms : 0,
        area: Number.isFinite(parsedArea) ? parsedArea : 0,
        description: formState.description.trim() || undefined,
        coverImage: coverImage || undefined,
        gallery,
        videoUrl: listing.videoUrl || undefined,
        features,
        tags,
        featured: formState.featured,
        supabaseId: typeof listing.supabaseId === "number" ? listing.supabaseId : undefined,
      });

      if (!listing.id.startsWith("db-")) {
        updateListingSubmission(listing.id, {
          title: formState.title.trim(),
          price: parsedPrice,
          transactionType: formState.transactionType,
          region: formState.region.trim(),
          city: formState.city.trim(),
          location: derivedLocation,
          mapLocationQuery: formState.mapLocationQuery.trim(),
          nearbyCommodities,
          propertyType: formState.propertyType.trim(),
          bedrooms: Number.isFinite(parsedBedrooms) ? parsedBedrooms : 0,
          bathrooms: Number.isFinite(parsedBathrooms) ? parsedBathrooms : 0,
          area: Number.isFinite(parsedArea) ? parsedArea : 0,
          description: formState.description.trim(),
          fullName: formState.fullName.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          coverImage: coverImage || undefined,
          gallery,
          photoCount: gallery.length,
          features,
          tags,
          featured: formState.featured,
          supabaseId: backendId,
        });
      }

      clearListingsCache();
      setSuccess("Annonce mise a jour avec succes.");
      window.setTimeout(() => {
        navigate("/admin/listings");
      }, 700);
    } catch (err: any) {
      setError(err?.message ?? "Impossible d'enregistrer les modifications.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)] px-6 py-10 text-sky-700">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-[24px] border border-sky-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#0f3d63_55%,#0ea5e9_100%)] p-5 text-white shadow-[0_18px_38px_rgba(14,30,60,0.28)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Edition admin</p>
              <h1 className="mt-2 font-serif text-3xl text-white">Modifier l'annonce</h1>
              <p className="mt-2 text-sm text-sky-100">Mettez a jour tous les champs du bien sur une page dediee.</p>
            </div>
            <Link to="/admin/listings" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Retour a la liste
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[22px] border border-sky-200/80 bg-white/80 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Informations du bien</p>
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Titre</label>
                  <input value={formState.title} onChange={(e) => updateField("title", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Transaction</label>
                    <select value={formState.transactionType} onChange={(e) => updateField("transactionType", e.target.value as "Vente" | "Location")} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none">
                      <option value="Vente">Vente</option>
                      <option value="Location">Location</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Type de bien</label>
                    <input value={formState.propertyType} onChange={(e) => updateField("propertyType", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Region</label>
                    <select value={formState.region} onChange={(e) => setFormState((current) => ({ ...current, region: e.target.value, city: "", location: deriveLocationLabel(e.target.value, "", current.location) }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none">
                      <option value="">Selectionner une region</option>
                      {tunisiaRegionOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ville</label>
                    <select value={formState.city} onChange={(e) => setFormState((current) => ({ ...current, city: e.target.value, location: deriveLocationLabel(current.region, e.target.value, current.location) }))} disabled={!formState.region} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60">
                      <option value="">{formState.region ? "Selectionner une ville" : "Choisissez d'abord une region"}</option>
                      {cityOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Localisation affichee</label>
                    <input value={deriveLocationLabel(formState.region, formState.city, formState.location)} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Map / adresse precise</label>
                    <div className="relative">
                      <input value={formState.mapLocationQuery} onChange={(e) => updateField("mapLocationQuery", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                      <button type="button" onClick={handleUseCurrentLocation} disabled={isLocating} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-sky-700 transition hover:bg-sky-100 hover:text-sky-900 disabled:opacity-60">
                        <LocateFixed className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Prix</label>
                    <input value={formState.price} onChange={(e) => updateField("price", e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Chambres</label>
                    <input value={formState.bedrooms} onChange={(e) => updateField("bedrooms", e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Salles de bain</label>
                    <input value={formState.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Surface</label>
                    <input value={formState.area} onChange={(e) => updateField("area", e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Description</label>
                  <textarea value={formState.description} onChange={(e) => updateField("description", e.target.value)} rows={5} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[22px] border border-sky-200/80 bg-white/80 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Contact & options</p>
                <div className="mt-4 grid gap-3">
                  <input value={formState.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Nom complet" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  <input value={formState.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  <input value={formState.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Telephone" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={formState.featured} onChange={(e) => updateField("featured", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    Mise en avant
                  </label>
                </div>
              </div>

              <div className="rounded-[22px] border border-sky-200/80 bg-white/80 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Media & taxonomie</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-slate-600">
                    La vidéo publiée s'affiche directement sur le site. Utilisez seulement la galerie comme secours si besoin.
                  </div>
                  {(galleryPreviewUrls.length > 0 || videoPreviewUrl) && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aperçu des médias</p>

                      {videoPreviewUrl && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                          <video
                            key={videoPreviewUrl}
                            src={videoPreviewUrl}
                            controls
                            preload="metadata"
                            className="h-auto max-h-[320px] w-full bg-slate-950 object-contain"
                          />
                        </div>
                      )}

                      {galleryPreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {galleryPreviewUrls.map((url, index) => (
                            <div key={`${url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                              <img
                                src={url}
                                alt={`Media ${index + 1}`}
                                className="h-32 w-full object-cover"
                                loading="lazy"
                              />
                              <div className="border-t border-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-500">
                                {index === 0 ? "Image principale" : `Galerie ${index + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Galerie URLs (une par ligne)</label>
                    <textarea value={formState.gallery} onChange={(e) => updateField("gallery", e.target.value)} rows={6} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  </div>
                  <textarea value={formState.nearbyCommodities} onChange={(e) => updateField("nearbyCommodities", e.target.value)} rows={3} placeholder="Commodites, separees par virgules" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  <input value={formState.features} onChange={(e) => updateField("features", e.target.value)} placeholder="Caracteristiques, separees par virgules" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                  <input value={formState.tags} onChange={(e) => updateField("tags", e.target.value)} placeholder="Tags, separes par virgules" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none" />
                </div>
              </div>
            </section>
          </div>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div>}

          <div className="flex justify-end">
            <button type="submit" disabled={saving || !listing} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60">
              {saving ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}