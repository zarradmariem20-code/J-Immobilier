import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router";
import {
  clearAdminSession,
  deleteListingSubmission,
  getAdminSession,
  getListingSubmissions,
  setAdminSession,
  toggleListingFeatured,
  updateListingSubmissionStatus,
  type AdminSession,
  type ListingSubmission,
} from "../utils/storage";

const statusChip: Record<ListingSubmission["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const statusLabel: Record<ListingSubmission["status"], string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
};

const adminChecklist = [
  "Vérifier que le titre, le type de bien et la localisation sont cohérents.",
  "Contrôler les coordonnées du client avant publication.",
  "Valider le prix, le nombre de médias et la qualité de la description.",
  "N'activer la mise en avant que pour une annonce déjà approuvée.",
];

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function Admin() {
  const [items, setItems] = useState<ListingSubmission[]>(getListingSubmissions());
  const [adminSession, setAdminSessionState] = useState<AdminSession | null>(getAdminSession());
  const [loginEmail, setLoginEmail] = useState("admin@tawla.tn");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ListingSubmission["status"]>("all");

  const ADMIN_EMAIL = "admin@tawla.tn";
  const ADMIN_PASSWORD = "Admin@2026";

  useEffect(() => {
    const syncAll = () => {
      setItems(getListingSubmissions());
      setAdminSessionState(getAdminSession());
    };

    syncAll();
    window.addEventListener("listings-updated", syncAll);
    window.addEventListener("auth-state-changed", syncAll);
    return () => {
      window.removeEventListener("listings-updated", syncAll);
      window.removeEventListener("auth-state-changed", syncAll);
    };
  }, []);

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginEmail.trim().toLowerCase() !== ADMIN_EMAIL || loginPassword !== ADMIN_PASSWORD) {
      setLoginError("Identifiants admin invalides.");
      return;
    }

    setLoginError("");
    setAdminSession({
      email: ADMIN_EMAIL,
      name: "Admin Tawla",
    });
    setAdminSessionState(getAdminSession());
    setLoginPassword("");
  };

  const handleLogout = () => {
    clearAdminSession();
    setAdminSessionState(null);
  };

  const metrics = useMemo(() => {
    const pending = items.filter((item) => item.status === "pending").length;
    const approved = items.filter((item) => item.status === "approved").length;
    const rejected = items.filter((item) => item.status === "rejected").length;
    const featured = items.filter((item) => item.featured).length;
    return { pending, approved, rejected, featured, total: items.length };
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;
      const matchesSearch =
        needle.length === 0
          ? true
          : [item.title, item.location, item.propertyType, item.fullName, item.email]
              .join(" ")
              .toLowerCase()
              .includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [items, searchTerm, statusFilter]);

  const latestPending = useMemo(
    () => items.find((item) => item.status === "pending") ?? null,
    [items],
  );

  const recentActivity = useMemo(
    () => [...items].sort((left, right) => {
      const leftDate = new Date(left.reviewedAt ?? left.createdAt).getTime();
      const rightDate = new Date(right.reviewedAt ?? right.createdAt).getTime();
      return rightDate - leftDate;
    }).slice(0, 5),
    [items],
  );

  const updateStatus = (id: string, status: ListingSubmission["status"]) => {
    updateListingSubmissionStatus(id, status);
    setItems(getListingSubmissions());
  };

  const toggleFeatured = (id: string) => {
    toggleListingFeatured(id);
    setItems(getListingSubmissions());
  };

  const handleDelete = (item: ListingSubmission) => {
    const confirmed = window.confirm(
      `Supprimer définitivement l'annonce "${item.title}" de ${item.fullName} ? Cette action est irreversible.`,
    );

    if (!confirmed) {
      return;
    }

    deleteListingSubmission(item.id);
    setItems(getListingSubmissions());
  };

  if (!adminSession) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f1f6ff_0%,#e8f0fb_100%)] px-4 py-10">
        <div className="mx-auto max-w-md rounded-[32px] border border-sky-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Admin Only</p>
          <h1 className="mt-2 font-serif text-4xl text-slate-950">Connexion admin</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Espace sécurisé de modération des annonces clients. Seul l'administrateur peut approuver la publication.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleAdminLogin}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email admin</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Mot de passe</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                placeholder="Mot de passe admin"
              />
            </div>
            {loginError && <p className="text-sm font-semibold text-rose-600">{loginError}</p>}
            <button
              type="submit"
              className="w-full rounded-[16px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-4 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.24)] transition hover:brightness-110"
            >
              Ouvrir le dashboard admin
            </button>
          </form>

          <Link to="/" className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900">
            Retour au site public
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6fd_100%)]">
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-sky-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Administration</p>
                <h1 className="mt-3 font-serif text-4xl text-slate-950">Validation des annonces clients</h1>
                <p className="mt-3 max-w-3xl text-slate-600">
                  Les annonces soumises arrivent ici. L'admin approuve, rejette ou met en avant chaque bien avant publication.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                  <LayoutDashboard className="h-4 w-4" />
                  {adminSession.name}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion admin
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3 text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-sky-700" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Checklist obligatoire</h2>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {adminChecklist.map((rule) => (
                    <div key={rule} className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
                      {rule}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-sky-100 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Session admin</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{adminSession.email}</p>
                <p className="mt-1 text-sm text-slate-600">Connecté depuis {formatDate(adminSession.loggedAt)}</p>
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
                  {latestPending ? (
                    <>
                      <p className="font-semibold text-slate-900">Priorité actuelle</p>
                      <p className="mt-1">{latestPending.title}</p>
                      <p className="mt-1 text-slate-500">Soumise le {formatDate(latestPending.createdAt)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">File traitée</p>
                      <p className="mt-1">Aucune annonce en attente pour le moment.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{metrics.pending}</p>
              <p className="text-sm text-slate-500">En attente</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{metrics.approved}</p>
              <p className="text-sm text-slate-500">Approuvées</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <XCircle className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{metrics.rejected}</p>
              <p className="text-sm text-slate-500">Rejetées</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Eye className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{metrics.featured}</p>
              <p className="text-sm text-slate-500">Mises en avant</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{metrics.total}</p>
              <p className="text-sm text-slate-500">Total reçu</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_0.55fr]">
            <div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher par bien, client, email ou ville"
                      className="w-full rounded-[18px] border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "all" | ListingSubmission["status"])}
                      className="rounded-[18px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="pending">En attente</option>
                      <option value="approved">Approuvées</option>
                      <option value="rejected">Rejetées</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setItems(getListingSubmissions());
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Réinitialiser
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">{filteredItems.length} annonce(s) affichée(s) sur {metrics.total}.</p>
              </div>

              <div className="mt-4 space-y-4">
            {filteredItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-slate-500">
                {items.length === 0 ? "Aucune annonce client pour le moment." : "Aucun résultat avec les filtres actuels."}
              </div>
            )}

            {filteredItems.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusChip[item.status]}`}>
                        {statusLabel[item.status]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {item.transactionType}
                      </span>
                      {item.featured && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Mise en avant</span>
                      )}
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.location} • {item.propertyType}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-500">
                      <span>Soumise le {formatDate(item.createdAt)}</span>
                      <span>Dernière revue {formatDate(item.reviewedAt)}</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-sky-700">{item.price.toLocaleString("fr-TN")} TND</p>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:min-w-[240px]">
                    <p><span className="font-semibold text-slate-900">Client:</span> {item.fullName}</p>
                    <p className="mt-1"><span className="font-semibold text-slate-900">Email:</span> {item.email}</p>
                    <p className="mt-1"><span className="font-semibold text-slate-900">Téléphone:</span> {item.phone}</p>
                    <p className="mt-1"><span className="font-semibold text-slate-900">Photos:</span> {item.photoCount}</p>
                    <p className="mt-1"><span className="font-semibold text-slate-900">Vidéo:</span> {item.hasVideo ? "Oui" : "Non"}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "approved")}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approuver
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "rejected")}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Rejeter
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "pending")}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Clock3 className="h-4 w-4" />
                    Remettre en attente
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFeatured(item.id)}
                    disabled={item.status !== "approved"}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    {item.featured ? "Retirer de la mise en avant" : "Mettre en avant"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer définitivement
                  </button>
                </div>
              </article>
            ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Activité récente</p>
                <div className="mt-4 space-y-3">
                  {recentActivity.length === 0 && <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>}
                  {recentActivity.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.fullName} • {item.location}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusChip[item.status]}`}>
                          {statusLabel[item.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(item.reviewedAt ?? item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Règles de publication</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Une annonce n'est visible sur le site public qu'après passage au statut approuvé.</p>
                  <p>La mise en avant est réservée aux annonces approuvées pour éviter toute publication prioritaire non validée.</p>
                  <p>Chaque changement de statut enregistre automatiquement une date de revue pour le suivi interne.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
