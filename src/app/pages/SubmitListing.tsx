import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, User, Building2, ImagePlus, X, Video, MapPin, Tag, LocateFixed } from "lucide-react";
import { useNavigate } from "react-router";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { LoginModal } from "../components/LoginModal";
import { supabase } from "../../lib/supabase";
import { createSubmission, updateSubmissionMedia, uploadAllMedia } from "../../lib/api";
import { createListingSubmission, getAuthProfile, isUserLoggedIn } from "../utils/storage";

const nearbyCommodityOptions = [
  "Ecoles",
  "Universite",
  "Pharmacie",
  "Hopital",
  "Clinique",
  "Supermarche",
  "Centre commercial",
  "Cafe",
  "Restaurant",
  "Transport public",
  "Plage",
  "Parc",
];

const quartierOptionsByCity: Record<string, string[]> = {
  Tunis: ["Lac 1", "Lac 2", "Menzah", "Ennasr", "Montplaisir"],
  "La Marsa": ["Sidi Abdelaziz", "Marsa Plage", "Marsa Ville", "Gammarth", "Bhar Lazreg"],
  Sousse: ["Khzema", "Sahloul", "Khezama Est", "Riadh", "Corniche"],
  Sfax: ["Sakiet Ezzit", "Sakiet Eddaier", "El Ain", "Bab Bhar", "Thyna"],
  Hammamet: ["Yasmine Hammamet", "Mrezga", "Centre Ville", "Baraket Sahel", "Nabeul Nord"],
};

const propertyTypesByTransaction: Record<"Vente" | "Location", string[]> = {
  Vente: ["Terrain", "Villa", "Appartement", "Local commercial", "Usine", "Immeuble", "Terrain agricole", "Bureau"],
  Location: ["Appartement", "Villa", "Surface", "Bureau", "Usine"],
};

const characteristicOptions = [
  "Haut standing",
  "Neuf",
  "Meublé",
  "Vue mer",
  "Balcon",
  "Terrasse",
  "Sécurisé",
  "Parking",
];

const equipmentOptions = [
  "Chauffage central",
  "Climatiseur",
  "Cuisine équipée",
  "Jardin",
  "Piscine",
  "Ascenseur",
  "Caméra de surveillance",
  "Fibre optique",
];

function formatPriceInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 9);
}

interface SubmissionReceipt {
  id: number | string;
  title: string;
  sentAt: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function getCachedAuthUser() {
  const cachedProfile = isUserLoggedIn() ? getAuthProfile() : null;

  if (!cachedProfile) {
    return null;
  }

  return {
    email: cachedProfile.email ?? "",
    user_metadata: {
      full_name: cachedProfile.name ?? cachedProfile.email ?? "",
    },
  };
}

export function SubmitListing() {
  const navigate = useNavigate();
  const [authProfile, setAuthProfile] = useState<any>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [transactionType, setTransactionType] = useState<"" | "Vente" | "Location">("");
  const [city, setCity] = useState("");
  const [quartier, setQuartier] = useState("");
  const [mapLocationQuery, setMapLocationQuery] = useState("");
  const [nearbyCommodities, setNearbyCommodities] = useState<string[]>([]);
  const [nearbyDetailsInput, setNearbyDetailsInput] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [featuresInput, setFeaturesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [listingTitle, setListingTitle] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [formError, setFormError] = useState("");
  const [submissionNotice, setSubmissionNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<SubmissionReceipt | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const quartierOptions = quartierOptionsByCity[city] ?? [];
  const allPropertyTypes = Array.from(new Set([
    ...propertyTypesByTransaction.Vente,
    ...propertyTypesByTransaction.Location,
  ]));
  const availablePropertyTypes = transactionType ? propertyTypesByTransaction[transactionType] : allPropertyTypes;

  useEffect(() => {
    let isMounted = true;

    const applyResolvedUser = (user: any | null) => {
      if (!isMounted) {
        return;
      }

      setAuthProfile(user);
      setLoading(false);
    };

    const cachedUser = getCachedAuthUser();
    if (cachedUser) {
      applyResolvedUser(cachedUser);
    }

    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        applyResolvedUser(user ?? cachedUser ?? null);
      } catch {
        applyResolvedUser(cachedUser ?? null);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyResolvedUser(session?.user ?? getCachedAuthUser());
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
        <span className="text-lg text-sky-700 animate-pulse">Chargement...</span>
      </div>
    );
  }

  const getVideoDuration = (file: File) =>
    new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("VIDEO_READ_ERROR"));
      };
      video.src = url;
    });

  const handlePhotosChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    const merged = [...photos, ...incoming].slice(0, 7);
    if (photos.length + incoming.length > 7) {
      setPhotoError("Maximum 7 photos autorisees.");
    } else {
      setPhotoError("");
    }
    setPhotos(merged);
    setPhotoPreviews(merged.map((f) => URL.createObjectURL(f)));
    event.target.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
    if (newPhotos.length <= 7) setPhotoError("");
  };

  const handleVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      setVideoFile(null);
      setVideoPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setVideoError("");
      return;
    }

    try {
      const duration = await getVideoDuration(selected);
      if (duration > 120) {
        setVideoFile(null);
        setVideoPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
        setVideoError("Maximum 2 minutes pour la video.");
        return;
      }

      setVideoError("");
      setVideoFile(selected);
      const nextPreviewUrl = URL.createObjectURL(selected);
      setVideoPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return nextPreviewUrl;
      });
    } catch {
      setVideoFile(null);
      setVideoPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      setVideoError("Impossible de lire la video. Merci de reessayer.");
    }

    event.target.value = "";
  };

  const toggleNearbyCommodity = (commodity: string) => {
    setNearbyCommodities((current) =>
      current.includes(commodity)
        ? current.filter((item) => item !== commodity)
        : [...current, commodity],
    );
  };

  const toggleCharacteristic = (value: string) => {
    setSelectedCharacteristics((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const toggleEquipment = (value: string) => {
    setSelectedEquipment((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError("La geolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    setFormError("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapLocationQuery(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsLocating(false);
      },
      () => {
        setFormError("Impossible d'acceder a votre position. Verifiez les permissions de localisation.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const resetListingFields = () => {
    setListingTitle("");
    setListingPrice("");
    setBedrooms("");
    setBathrooms("");
    setArea("");
    setSelectedCharacteristics([]);
    setSelectedEquipment([]);
    setFeaturesInput("");
    setTagsInput("");
    setNearbyDetailsInput("");
    setIsFeatured(false);
    setListingDescription("");
    setQuartier("");
    setMapLocationQuery("");
    setNearbyCommodities([]);
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviews([]);
    setVideoFile(null);
    setVideoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setPhotoError("");
    setVideoError("");
    setFormError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!authProfile) {
      setFormError("Vous devez etre connecte pour publier.");
      return;
    }

    const resolvedFullName = String(
      fullName
      || authProfile.user_metadata?.full_name
      || authProfile.email
      || "Utilisateur"
    ).trim();
    const resolvedEmail = String(email || authProfile.email || "annonce@journal-immobilier.tn").trim();

    if (photos.length > 7) {
      setPhotoError("Maximum 7 photos autorisees.");
      return;
    }

    if (videoError) {
      return;
    }

    setFormError("");
    setSubmissionNotice("");
    setIsLoading(true);

    try {
      const parsedPrice = Number(listingPrice || 0);
      const parsedBedrooms = Number(bedrooms || 0);
      const parsedBathrooms = Number(bathrooms || 0);
      const parsedArea = Number(area || 0);

      const normalizedTransactionType = (transactionType || "Vente") as "Vente" | "Location";

      const parseList = (value: string) =>
        value
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean);

      const combinedFeatures = Array.from(new Set([
        ...selectedCharacteristics,
        ...parseList(featuresInput),
      ]));
      const combinedEquipment = Array.from(new Set([
        ...selectedEquipment,
        ...parseList(tagsInput),
      ]));
      const combinedNearbyCommodities = Array.from(new Set([
        ...nearbyCommodities,
        ...parseList(nearbyDetailsInput),
      ]));

      const dbLocation = mapLocationQuery.trim() || [quartier.trim(), city.trim()].filter(Boolean).join(", ") || "Emplacement non precise";
      const fallbackTitle = listingTitle.trim() || "Annonce immobiliere";
      const fallbackType = propertyType || "Bien immobilier";
      const fallbackDescription = listingDescription.trim() || "Annonce en attente de validation.";

      const remotePending = await withTimeout(
        createSubmission({
          title: fallbackTitle,
          price: parsedPrice,
          transaction_type: normalizedTransactionType,
          location: dbLocation,
          map_location_query: mapLocationQuery.trim() || quartier.trim() || city.trim() || null,
          nearby_commodities: combinedNearbyCommodities,
          type: fallbackType,
          bedrooms: parsedBedrooms,
          bathrooms: parsedBathrooms,
          area: parsedArea,
          description: fallbackDescription,
          image: "",
          gallery: [],
          video_url: null,
          features: combinedFeatures,
          tags: combinedEquipment,
          featured: false,
          status: "pending",
        }),
        20000,
        "L'envoi vers l'administration prend trop de temps. Merci de reessayer."
      );

      if (!remotePending || typeof remotePending.id !== "number") {
        throw new Error("Annonce non transmise à l'administration.");
      }

      let photoUrls: string[] = [];
      let videoUrl: string | null = null;

      if (photos.length > 0 || videoFile) {
        try {
          const mediaResult = await withTimeout(
            uploadAllMedia(photos, videoFile),
            180000,
            "L'envoi des médias prend trop de temps. Merci de réessayer et de garder la page ouverte jusqu'à la fin."
          );

          photoUrls = mediaResult.photoUrls;
          videoUrl = mediaResult.videoUrl;

          if (videoFile && !videoUrl) {
            throw new Error("La vidéo n'a pas pu être enregistrée. Merci de réessayer.");
          }

          if (photoUrls.length > 0 || videoUrl) {
            await withTimeout(
              updateSubmissionMedia(remotePending.id, {
                image: photoUrls[0] || remotePending.image || "",
                gallery: photoUrls,
                video_url: videoUrl,
              }),
              15000,
              "L'annonce a bien ete envoyee, mais l'ajout des medias prend trop de temps."
            );
          }
        } catch (mediaError) {
          console.error("Listing media upload failed:", mediaError);
          setSubmissionNotice(
            "L'annonce a bien ete envoyee a l'administration, mais les medias n'ont pas pu etre ajoutes automatiquement."
          );
        }
      }

      const created = createListingSubmission({
        title: fallbackTitle,
        price: parsedPrice,
        transactionType: normalizedTransactionType,
        location: dbLocation,
        mapLocationQuery: mapLocationQuery.trim() || quartier.trim() || city.trim() || dbLocation,
        nearbyCommodities: combinedNearbyCommodities,
        propertyType: fallbackType,
        description: fallbackDescription,
        fullName: resolvedFullName,
        email: resolvedEmail,
        phone: phone.trim() || "Non renseigne",
        photoCount: photoUrls.length,
        hasVideo: Boolean(videoUrl),
        videoUrl: videoUrl ?? undefined,
        coverImage: photoUrls[0] || remotePending.image,
        gallery: photoUrls.length > 0 ? photoUrls : remotePending.gallery,
        bedrooms: parsedBedrooms,
        bathrooms: parsedBathrooms,
        area: parsedArea,
        features: combinedFeatures,
        tags: combinedEquipment,
        supabaseId: remotePending.id,
      });

      setSubmissionReceipt({
        id: "id" in created ? created.id : created.publicId,
        title: created.title,
        sentAt: new Date().toISOString(),
      });
      resetListingFields();
    } catch (error) {
      console.error("Submit listing failed:", error);
      setFormError(error instanceof Error ? error.message : "Échec de la soumission.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7fb]">
      <Header />

      <section className="flex-1 py-4 sm:py-5">
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          {!authProfile ? (
            <div className="rounded-2xl border border-sky-100 bg-white p-6 text-center shadow-sm sm:p-8">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-2xl text-slate-900 sm:text-3xl">Connexion requise</h2>
              <p className="mt-2 text-sm text-slate-500">
                Connectez-vous pour acceder au formulaire de depot d'annonce.
              </p>
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Se connecter <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {formError}
                </div>
              )}

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f5f96] text-white shadow-sm">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Publier une annonce immobiliere</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Votre annonce sera envoyee pour validation avant d'etre visible sur le site.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nom complet</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Telephone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex : 97 222 822"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Tag className="h-4 w-4 text-[#1f5f96]" />
                  <p className="text-sm font-semibold">Type de transaction & bien</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Type de transaction</label>
                    <select
                      value={transactionType}
                      onChange={(e) => {
                        setTransactionType(e.target.value as "" | "Vente" | "Location");
                        setPropertyType("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:bg-white focus:outline-none"
                    >
                      <option value="">Sélectionnez</option>
                      <option value="Vente">Vente</option>
                      <option value="Location">Location</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Type de bien</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:bg-white focus:outline-none"
                    >
                      <option value="">Sélectionnez le type de bien</option>
                      {availablePropertyTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Building2 className="h-4 w-4 text-[#1f5f96]" />
                  <p className="text-sm font-semibold">Informations principales</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Titre de l'annonce</label>
                    <input
                      type="text"
                      value={listingTitle}
                      onChange={(e) => setListingTitle(e.target.value)}
                      placeholder="Ex: Magnifique appartement 3 pieces avec vue mer"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Description</label>
                    <textarea
                      value={listingDescription}
                      onChange={(e) => setListingDescription(e.target.value)}
                      rows={4}
                      placeholder="Decrivez votre bien immobilier en detail..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 focus:border-[#1f5f96] focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Building2 className="h-4 w-4 text-[#1f5f96]" />
                  <p className="text-sm font-semibold">Caracteristiques</p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Prix (TND)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(formatPriceInput(e.target.value))}
                      placeholder="250000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Surface (m²)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={area}
                      onChange={(e) => setArea(formatPriceInput(e.target.value))}
                      placeholder="75"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Chambres</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(formatPriceInput(e.target.value))}
                      placeholder="3"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Salles de bain</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(formatPriceInput(e.target.value))}
                      placeholder="2"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <MapPin className="h-4 w-4 text-[#1f5f96]" />
                  <p className="text-sm font-semibold">Localisation</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Ville</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Tunis"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Quartier</label>
                    <input
                      type="text"
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      placeholder="Ex: Lac 2"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Adresse</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={mapLocationQuery}
                        onChange={(e) => setMapLocationQuery(e.target.value)}
                        placeholder="12 Rue de la Republique"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        aria-label="Utiliser ma position"
                        title={isLocating ? "Localisation en cours..." : "Utiliser ma position"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#1f5f96] transition hover:bg-[#eef5fb] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LocateFixed className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-[#1f5f96]" />
                  <p className="text-sm font-semibold">Caractéristiques, équipements & à proximité</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Caractéristiques</label>
                    <div className="flex flex-wrap gap-2">
                      {characteristicOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleCharacteristic(item)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            selectedCharacteristics.includes(item)
                              ? "border-[#1f5f96] bg-[#1f5f96] text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-[#1f5f96]/40"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={featuresInput}
                      onChange={(e) => setFeaturesInput(e.target.value)}
                      rows={4}
                      placeholder="Ajoutez d'autres caractéristiques... Ex: vue dégagée, deux balcons, résidence très calme"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Équipements</label>
                    <div className="flex flex-wrap gap-2">
                      {equipmentOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleEquipment(item)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            selectedEquipment.includes(item)
                              ? "border-[#1f5f96] bg-[#1f5f96] text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-[#1f5f96]/40"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      rows={4}
                      placeholder="Précisez les équipements... Ex: 2 climatiseurs, chauffage central, cuisine équipée"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">À proximité</label>
                    <div className="flex flex-wrap gap-2">
                      {nearbyCommodityOptions.map((commodity) => (
                        <button
                          key={commodity}
                          type="button"
                          onClick={() => toggleNearbyCommodity(commodity)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            nearbyCommodities.includes(commodity)
                              ? "border-[#1f5f96] bg-[#1f5f96] text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-[#1f5f96]/40"
                          }`}
                        >
                          {commodity}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={nearbyDetailsInput}
                      onChange={(e) => setNearbyDetailsInput(e.target.value)}
                      rows={4}
                      placeholder="Écrivez ce qui est à proximité... Ex: plage à 5 min, école, métro, centre commercial"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#1f5f96] focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <ImagePlus className="h-4 w-4 text-[#1f5f96]" />
                  <p className="text-sm font-semibold">Photos & videos du bien</p>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-[#cfe0ef] bg-[linear-gradient(180deg,rgba(232,241,249,0.95)_0%,#ffffff_100%)] p-5">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f1f9] text-[#1f5f96]">
                        <ImagePlus className="h-5 w-5" />
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f1f9] text-[#1f5f96]">
                        <Video className="h-5 w-5" />
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">Cliquez pour ajouter des photos ou videos</p>
                    <p className="mt-1 text-xs text-slate-500">Ajoutez jusqu'a 7 photos et une video de 2 minutes maximum.</p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1f5f96] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#184a77]">
                        <ImagePlus className="h-4 w-4" />
                        Ajouter des photos
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
                      </label>

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#cfe0ef] bg-white px-4 py-2 text-sm font-semibold text-[#1f5f96] transition hover:border-[#1f5f96] hover:bg-[#e8f1f9]">
                        <Video className="h-4 w-4" />
                        Ajouter une video
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-600">Photos du bien</label>
                        <span className="text-xs text-slate-400">{photos.length} / 7</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {photoPreviews.map((src, i) => (
                          <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-[#d9e6f2] bg-slate-100">
                            <img src={src} alt={`photo ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {photoError && <p className="mt-2 text-xs font-semibold text-rose-600">{photoError}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <Video className="h-3 w-3 text-[#1f5f96]" /> Video <span className="font-normal text-slate-400">(optionnel, max 2 min)</span>
                      </label>
                      {videoFile ? (
                        <div className="space-y-2 overflow-hidden rounded-xl border border-[#d9e6f2] bg-white p-2.5">
                          {videoPreviewUrl && (
                            <video controls preload="metadata" className="max-h-40 w-full rounded-lg border border-slate-200 bg-black">
                              <source src={videoPreviewUrl} type={videoFile.type || "video/mp4"} />
                            </video>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-slate-700">{videoFile.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setVideoFile(null);
                                setVideoPreviewUrl((current) => {
                                  if (current) {
                                    URL.revokeObjectURL(current);
                                  }
                                  return null;
                                });
                                setVideoError("");
                              }}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#d9e6f2] bg-[#eef5fb] px-3 py-3 text-sm text-[#1f5f96]">
                          Aucune video ajoutee pour le moment.
                        </div>
                      )}
                      {videoError && <p className="text-xs font-semibold text-rose-600">{videoError}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 sm:w-auto"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || Boolean(submissionReceipt)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0369a1_0%,#2563eb_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
                >
                  {submissionReceipt ? "Envoyee ✓" : isLoading ? "Envoi en cours..." : "Envoyer pour validation"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {submissionReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_28px_60px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-serif text-2xl text-slate-950 sm:text-3xl">Annonce envoyee avec succes</h2>
            <p className="mt-2 text-slate-600">
              Votre annonce a bien ete transmise pour validation. Elle sera publiee sur le site apres verification.
            </p>

            {submissionNotice && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {submissionNotice}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Reference:</span> {submissionReceipt.id}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Titre:</span> {submissionReceipt.title}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Envoyee le:</span> {formatDateTime(submissionReceipt.sentAt)}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSubmissionReceipt(null)}
                className="inline-flex items-center justify-center rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
              >
                Deposer une autre annonce
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmissionReceipt(null);
                  navigate("/listings");
                }}
                className="inline-flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-4 py-3 font-semibold text-white transition hover:brightness-110"
              >
                Voir les annonces
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal isOpen={loginModalOpen} initialMode="login" onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}

