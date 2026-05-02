import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import MapLocationPicker from "../components/MapLocationPicker";
import {
  type BureauSettings,
  type SiteSettings,
  getAdminSettings,
  saveAdminSettings,
  updateAdminPassword,
} from "../../lib/api";

function emptyBureau(): BureauSettings {
  return {
    id: `bureau-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    address: "",
    phone: "",
    email: "",
    mapQuery: "",
    latitude: undefined,
    longitude: undefined,
  };
}

function bureauMapQuery(bureau: BureauSettings): string {
  if (bureau.mapQuery?.trim()) return bureau.mapQuery.trim();
  if (typeof bureau.latitude === "number" && typeof bureau.longitude === "number") {
    return `${bureau.latitude},${bureau.longitude}`;
  }
  return bureau.address || "Tunisie";
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    hasPassword: false,
    loading: false,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const payload = await getAdminSettings();
        if (!mounted) return;
        setSettings(payload.data);
        setAdminEmail(payload.adminEmail);
        setPasswordState((prev) => ({ ...prev, hasPassword: payload.hasPassword }));
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Impossible de charger les paramètres.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const canSave = useMemo(() => {
    if (!settings) return false;
    return Boolean(settings.contact.email.trim() && settings.contact.primaryPhone.trim());
  }, [settings]);

  const updateSettings = (updater: (prev: SiteSettings) => SiteSettings) => {
    setSettings((prev) => (prev ? updater(prev) : prev));
    setFeedback("");
    setError("");
  };

  const updateBureau = (index: number, updater: (bureau: BureauSettings) => BureauSettings) => {
    updateSettings((prev) => ({
      ...prev,
      bureaus: prev.bureaus.map((bureau, bureauIndex) =>
        bureauIndex === index ? updater(bureau) : bureau,
      ),
    }));
  };

  const addBureau = () => {
    updateSettings((prev) => ({ ...prev, bureaus: [...prev.bureaus, emptyBureau()] }));
  };

  const removeBureau = (index: number) => {
    updateSettings((prev) => ({
      ...prev,
      bureaus: prev.bureaus.filter((_, bureauIndex) => bureauIndex !== index),
    }));
  };

  const saveSettings = async () => {
    if (!settings || !canSave) return;

    try {
      setSaving(true);
      setError("");
      const payload = await saveAdminSettings(settings, adminEmail.trim() || settings.contact.email);
      setSettings(payload.data);
      setAdminEmail(payload.adminEmail);
      setFeedback("Paramètres enregistrés avec succès.");
    } catch (err: any) {
      setError(err?.message || "Impossible d'enregistrer les paramètres.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (passwordState.newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setError("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }

    try {
      setPasswordState((prev) => ({ ...prev, loading: true }));
      setError("");
      await updateAdminPassword(passwordState.currentPassword, passwordState.newPassword);
      setFeedback("Mot de passe administrateur mis à jour.");
      setPasswordState((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        hasPassword: true,
      }));
    } catch (err: any) {
      setError(err?.message || "Impossible de modifier le mot de passe.");
    } finally {
      setPasswordState((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-700 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Chargement des paramètres...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Paramètres de l'agence</h1>
        <Link to="/admin/contracts" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Retour aux contrats
        </Link>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {feedback && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Coordonnées principales</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">Nom de la marque</span>
              <input
                value={settings.brand.companyName}
                onChange={(e) => updateSettings((prev) => ({ ...prev, brand: { ...prev.brand, companyName: e.target.value } }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">Email de contact</span>
              <input
                type="email"
                value={settings.contact.email}
                onChange={(e) => updateSettings((prev) => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">Téléphone principal</span>
              <input
                value={settings.contact.primaryPhone}
                onChange={(e) => updateSettings((prev) => ({ ...prev, contact: { ...prev.contact, primaryPhone: e.target.value } }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">Téléphone secondaire</span>
              <input
                value={settings.contact.secondaryPhone}
                onChange={(e) => updateSettings((prev) => ({ ...prev, contact: { ...prev.contact, secondaryPhone: e.target.value } }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-600">Adresse principale (une ligne par champ)</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={settings.contact.officeAddressLines[0] ?? ""}
                onChange={(e) => {
                  const lines = [...settings.contact.officeAddressLines];
                  lines[0] = e.target.value;
                  updateSettings((prev) => ({ ...prev, contact: { ...prev.contact, officeAddressLines: lines } }));
                }}
                className="rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="Ligne 1"
              />
              <input
                value={settings.contact.officeAddressLines[1] ?? ""}
                onChange={(e) => {
                  const lines = [...settings.contact.officeAddressLines];
                  lines[1] = e.target.value;
                  updateSettings((prev) => ({ ...prev, contact: { ...prev.contact, officeAddressLines: lines } }));
                }}
                className="rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="Ligne 2"
              />
            </div>
          </label>

          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-600">Localisation carte principale (query Google Maps)</span>
            <input
              value={settings.contact.officeMapQuery}
              onChange={(e) => updateSettings((prev) => ({ ...prev, contact: { ...prev.contact, officeMapQuery: e.target.value } }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              placeholder="Bouhsina Sousse Tunisie ou 35.8256,10.6084"
            />
          </label>

          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-600">Horaires (une ligne = un horaire)</span>
            <textarea
              rows={4}
              value={settings.contact.openingHours.join("\n")}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  contact: {
                    ...prev.contact,
                    openingHours: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                  },
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Bureaux secondaires</h2>
            <button type="button" onClick={addBureau} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Ajouter un bureau
            </button>
          </div>

          <div className="mt-4 space-y-5">
            {settings.bureaus.map((bureau, index) => (
              <article key={bureau.id || index} className="rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={bureau.name}
                    onChange={(e) => updateBureau(index, (current) => ({ ...current, name: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5"
                    placeholder="Nom du bureau"
                  />
                  <input
                    value={bureau.phone}
                    onChange={(e) => updateBureau(index, (current) => ({ ...current, phone: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5"
                    placeholder="Téléphone"
                  />
                  <input
                    value={bureau.email ?? ""}
                    onChange={(e) => updateBureau(index, (current) => ({ ...current, email: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5"
                    placeholder="Email"
                  />
                  <input
                    value={bureau.address}
                    onChange={(e) => updateBureau(index, (current) => ({ ...current, address: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5"
                    placeholder="Adresse"
                  />
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-sm font-medium text-slate-600">Localisation sur la carte</p>
                  <MapLocationPicker
                    latitude={bureau.latitude}
                    longitude={bureau.longitude}
                    onChange={(lat, lng) =>
                      updateBureau(index, (current) => ({
                        ...current,
                        latitude: lat,
                        longitude: lng,
                        mapQuery: `${lat},${lng}`,
                      }))
                    }
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => removeBureau(index)} className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    Supprimer ce bureau
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Réseaux sociaux</h2>
          <p className="mt-1 text-sm text-slate-600">Liens affichés dans le pied de page et sur la page de contact.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">Facebook</span>
              <input
                type="url"
                value={settings.socialLinks.facebook}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, facebook: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="https://facebook.com/..."
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">Instagram</span>
              <input
                type="url"
                value={settings.socialLinks.instagram}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, instagram: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="https://instagram.com/..."
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-600">TikTok</span>
              <input
                type="url"
                value={settings.socialLinks.tiktok}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, tiktok: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="https://tiktok.com/@..."
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Barre d'annonces</h2>
          <p className="mt-1 text-sm text-slate-600">
            Textes défilant dans la barre sombre en haut de toutes les pages.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {(settings.announcementItems ?? []).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      announcementItems: prev.announcementItems.map((it, i) =>
                        i === index ? e.target.value : it,
                      ),
                    }))
                  }
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Message d'annonce..."
                />
                <button
                  type="button"
                  onClick={() =>
                    updateSettings((prev) => ({
                      ...prev,
                      announcementItems: prev.announcementItems.filter((_, i) => i !== index),
                    }))
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                  aria-label="Supprimer"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateSettings((prev) => ({
                  ...prev,
                  announcementItems: [...(prev.announcementItems ?? []), ""],
                }))
              }
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              + Ajouter un message
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Sécurité administrateur</h2>
          <p className="mt-1 text-sm text-slate-600">
            {passwordState.hasPassword ? "Un mot de passe admin est déjà configuré." : "Aucun mot de passe admin n'est encore configuré."}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 sm:col-span-2"
              placeholder="Email administrateur"
            />
            <input
              type="password"
              value={passwordState.currentPassword}
              onChange={(e) => setPasswordState((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5"
              placeholder="Mot de passe actuel"
            />
            <input
              type="password"
              value={passwordState.newPassword}
              onChange={(e) => setPasswordState((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5"
              placeholder="Nouveau mot de passe"
            />
            <input
              type="password"
              value={passwordState.confirmPassword}
              onChange={(e) => setPasswordState((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 sm:col-span-2"
              placeholder="Confirmer le nouveau mot de passe"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={savePassword}
              disabled={passwordState.loading}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordState.loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </button>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveSettings}
            disabled={!canSave || saving}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
