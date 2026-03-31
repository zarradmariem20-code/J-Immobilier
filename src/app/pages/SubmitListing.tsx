import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { LoginModal } from "../components/LoginModal";
import { supabase } from "../../lib/supabase";
import { createSubmission, uploadAllMedia } from "../../lib/api";

function formatPriceInput(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 9);
}

interface SubmissionReceipt {
  id: string;
  title: string;
  sentAt: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SubmitListing() {
  const navigate = useNavigate();
  const [authProfile, setAuthProfile] = useState<any>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [transactionType, setTransactionType] = useState<"Vente" | "Location">("Vente");
  const [city, setCity] = useState("Tunis");
  const [mapLocationQuery, setMapLocationQuery] = useState("");
  const [nearbyCommoditiesInput, setNearbyCommoditiesInput] = useState("");
  const [propertyType, setPropertyType] = useState("Appartement");
  const [listingTitle, setListingTitle] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<SubmissionReceipt | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthProfile(user);
      setLoading(false);
      if (!user) {
        navigate("/login");
      }
    };
    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange(fetchUser);
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!authProfile) return;
    setFullName((prev) => prev || authProfile.user_metadata?.full_name || authProfile.email || "");
    setEmail((prev) => prev || authProfile.email || "");
  }, [authProfile]);

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
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 7) {
      setPhotoError("Maximum 7 photos autorisees.");
      setPhotos(selected.slice(0, 7));
      return;
    }
    setPhotoError("");
    setPhotos(selected);
                    <div>
                      <label className="block mb-1 text-sm font-semibold text-slate-700">Ville</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-sm font-semibold text-slate-700">Type de bien</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                      >
                        <option>Appartement</option>
                        <option>Maison</option>
                        <option>Villa</option>
                        <option>Commercial</option>
                        <option>Terrain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-sm font-semibold text-slate-700">Type de transaction</label>
                      <select
                        value={transactionType}
                        onChange={(e) => setTransactionType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                      >
                        <option value="Vente">Vente</option>
                        <option value="Location">Location</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-semibold text-slate-700">Titre de l'annonce</label>
                    <input
                      type="text"
                      value={listingTitle}
                      onChange={(e) => setListingTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-semibold text-slate-700">Prix</label>
                    <input
                      type="text"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(formatPriceInput(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-semibold text-slate-700">Description</label>
                    <textarea
                      value={listingDescription}
                      onChange={(e) => setListingDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition min-h-[100px]"
                      required
                    />
                  </div>
                  {/* ...existing code for media uploads, etc... */}
                  <button
                    type="submit"
                    className="w-full rounded-full bg-sky-700 px-6 py-3 text-white font-semibold shadow-lg hover:bg-sky-800 transition text-lg mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? "Envoi en cours..." : "Soumettre l'annonce"}
                  </button>
                </form>
              )}
            </div>
          </main>
          <Footer />
        </div>
      );
  const handleVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      setVideoFile(null);
      setVideoError("");
      return;
    }

    try {
      const duration = await getVideoDuration(selected);
      if (duration > 60) {
        setVideoFile(null);
        setVideoError("Maximum 1 minute pour la video.");
        return;
      }

      setVideoError("");
      setVideoFile(selected);
    } catch {
      setVideoFile(null);
      setVideoError("Impossible de lire la video. Merci de reessayer.");
    }
  };

  const resetListingFields = () => {
    setListingTitle("");
    setListingPrice("");
    setListingDescription("");
    setMapLocationQuery("");
    setNearbyCommoditiesInput("");
    setPhotos([]);
    setVideoFile(null);
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

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setFormError("Merci de renseigner vos coordonnees completes.");
      return;
    }

    if (photos.length > 7) {
      setPhotoError("Maximum 7 photos autorisees.");
      return;
    }

    if (videoError) {
      return;
    }

    setFormError("");
    setIsLoading(true);

    try {
      const { photoUrls, videoUrl } = await uploadAllMedia(photos, videoFile);
      const created = await createSubmission({
        title: listingTitle.trim(),
        price: Number(listingPrice || 0),
        transaction_type: transactionType,
        region: city,
        location: city,
        map_location_query: mapLocationQuery.trim(),
        nearby_commodities: nearbyCommoditiesInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        property_type: propertyType,
        bedrooms: 3,
        bathrooms: 2,
        area: 150,
        description: listingDescription.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cover_image_url: photoUrls[0] ?? "",
        photo_urls: photoUrls,
        video_url: videoUrl,
      });

      setSubmissionReceipt({
        id: created.id,
        title: created.title,
        sentAt: new Date().toISOString(),
      });
      resetListingFields();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Échec de la soumission.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)]">
      <Header />

      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="mb-6 border-b border-slate-100 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Proprietaire</p>
              <h1 className="mt-2 font-serif text-4xl text-slate-950">Ajouter mon annonce</h1>
              <p className="mt-2 text-slate-600">
                Remplissez ce formulaire complet. L'annonce sera ensuite revue par l'administration avant publication.
              </p>
            </div>
            {!authProfile ? (
              <div className="space-y-6">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <LockKeyhole className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-serif text-4xl text-slate-950">Connexion requise</h2>
                  <p className="mt-3 max-w-2xl text-slate-600">
                    Pour publier votre bien, connectez-vous d'abord. Le formulaire complet d'annonce apparaitra ensuite sur cette page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-5 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.28)] transition hover:brightness-110"
                >
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {formError}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Informations proprietaire</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Nom complet</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Telephone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                        placeholder="Ex: 12 345 678"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Informations du bien</p>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Type d'annonce</label>
                    <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => setTransactionType("Vente")}
                        className={`rounded-[12px] px-4 py-2 text-sm font-semibold transition ${
                          transactionType === "Vente"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Vente
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionType("Location")}
                        className={`rounded-[12px] px-4 py-2 text-sm font-semibold transition ${
                          transactionType === "Location"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Location
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Titre de l'annonce</label>
                    <input
                      type="text"
                      value={listingTitle}
                      onChange={(e) => setListingTitle(e.target.value)}
                      required
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                      placeholder="Ex: Villa vue mer a Gammarth"
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Ville</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:outline-none"
                      >
                        <option>Tunis</option>
                        <option>La Marsa</option>
                        <option>Sousse</option>
                        <option>Sfax</option>
                        <option>Hammamet</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Type de bien</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:outline-none"
                      >
                        <option>Appartement</option>
                        <option>Maison</option>
                        <option>Villa</option>
                        <option>Commercial</option>
                        <option>Terrain</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Localisation carte (adresse ou quartier precis)</label>
                    <input
                      type="text"
                      value={mapLocationQuery}
                      onChange={(e) => setMapLocationQuery(e.target.value)}
                      required
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                      placeholder="Ex: Rue du Lac Biwa, Les Berges du Lac 2, Tunis"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Commodites a proximite (separees par virgules)</label>
                    <input
                      type="text"
                      value={nearbyCommoditiesInput}
                      onChange={(e) => setNearbyCommoditiesInput(e.target.value)}
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                      placeholder="Ex: Ecoles, Pharmacie, Cafe, Supermarche"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {transactionType === "Location" ? "Loyer (TND / mois)" : "Prix (TND)"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(formatPriceInput(e.target.value))}
                      required
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                      placeholder="Ex: 950000"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                    <textarea
                      value={listingDescription}
                      onChange={(e) => setListingDescription(e.target.value)}
                      required
                      rows={5}
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 focus:border-sky-500 focus:bg-white focus:outline-none"
                      placeholder="Decrivez votre bien: surface, chambres, localisation, atouts..."
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Medias</p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Photos du bien</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotosChange}
                        className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                      />
                      <p className="mt-2 text-xs font-semibold text-rose-600">Maximum 7 photos.</p>
                      {photos.length > 0 && <p className="mt-1 text-xs text-slate-500">{photos.length} photo(s) selectionnee(s).</p>}
                      {photoError && <p className="mt-1 text-xs font-semibold text-rose-600">{photoError}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Video du bien</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                      />
                      <p className="mt-2 text-xs font-semibold text-rose-600">Maximum 1 minute pour la video.</p>
                      {videoFile && <p className="mt-1 text-xs text-slate-500">Video selectionnee: {videoFile.name}</p>}
                      {videoError && <p className="mt-1 text-xs font-semibold text-rose-600">{videoError}</p>}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-4 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.24)] transition hover:brightness-110 disabled:opacity-70"
                >
                  {isLoading ? "Envoi en cours..." : "Envoyer mon annonce"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />

      {submissionReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-100 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.22)]">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-serif text-3xl text-slate-950">Annonce envoyee</h2>
            <p className="mt-2 text-slate-600">
              Votre annonce a bien ete transmise a l'administration. Elle sera visible sur le site apres validation.
            </p>

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

