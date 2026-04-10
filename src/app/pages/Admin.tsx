import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  Clock3,
  Eye,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Check,
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
  syncListingSubmissionsFromDatabase,
  type AdminSession,
  type ListingSubmission,
} from "../utils/storage";
import { useLocation, useNavigate } from "react-router";
import { BrandLogo } from "../components/BrandLogo";
import { approveListingWithBackend, clearListingsCache, deleteListingWithBackend, getProperties, inactivateListingWithBackend, getVisits, getVisitsAnalytics, subscribeToPropertiesRealtime, updateVisit } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { VISIT_STATUS_LABELS, VISIT_STATUS_COLORS, formatVisitDate, formatVisitDateTime, isVisitOverdue } from "../data/visits";
import type { Visit } from "../../lib/database.types";

const statusChip: Record<ListingSubmission["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const statusLabel: Record<ListingSubmission["status"], string> = {
  pending: "En attente",
  approved: "Visible",
  rejected: "Invisible",
};

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toSafeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

const PAGE_SIZE = 10;

async function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs = 12000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Délai dépassé lors de la synchronisation Supabase."));
    }, timeoutMs);

    Promise.resolve(promiseLike)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function Admin() {
  const [items, setItems] = useState<ListingSubmission[]>(getListingSubmissions());
  const [publishedItems, setPublishedItems] = useState<ListingSubmission[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(false);
  const [publishError, setPublishError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const [adminSession, setAdminSessionState] = useState<AdminSession | null>(getAdminSession());
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ListingSubmission["status"]>("all");

  // Visits state
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsAnalytics, setVisitsAnalytics] = useState<any>(null);
  const [visitsWindow, setVisitsWindow] = useState<"today" | "7d" | "30d">("7d");
  const [visitsError, setVisitsError] = useState("");
  const [isVisitsRealtimeActive, setIsVisitsRealtimeActive] = useState(false);
  const [visitSortBy, setVisitSortBy] = useState<"date" | "status" | "property">("status");
  const [visitSortDirection, setVisitSortDirection] = useState<"asc" | "desc">("asc");
  const [visitStatusFilter, setVisitStatusFilter] = useState<"all" | string>("all");
  const [visitPropertyQuery, setVisitPropertyQuery] = useState("");
  const [isVisitSortPanelOpen, setIsVisitSortPanelOpen] = useState(false);
  const [visitActionMenuId, setVisitActionMenuId] = useState<number | null>(null);
  const [copiedPhoneVisitId, setCopiedPhoneVisitId] = useState<number | null>(null);
  const visitSortPanelRef = useRef<HTMLDivElement | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editFormData, setEditFormData] = useState({ status: "new", date: "", time: "", notes: "" });
    const [visitFormError, setVisitFormError] = useState("");
    const [visitFieldErrors, setVisitFieldErrors] = useState<{ date: string; time: string }>({ date: "", time: "" });
  const [contractType, setContractType] = useState<"vente" | "location">("vente");
  const [selectedCompletedVisitId, setSelectedCompletedVisitId] = useState("");
  const [contractCustomerName, setContractCustomerName] = useState("");
  const [contractOwnerName, setContractOwnerName] = useState("Proprietaire");
  const [contractAmount, setContractAmount] = useState("");
  const [contractRentPeriod, setContractRentPeriod] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [contractNotes, setContractNotes] = useState("");
  const [contractError, setContractError] = useState("");
  const [contractSuccess, setContractSuccess] = useState("");
  const [listingsPage, setListingsPage] = useState(1);
  const [visitsPage, setVisitsPage] = useState(1);
  const [dashboardTodoPage, setDashboardTodoPage] = useState(1);

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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!actionMenuId) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-action-menu-root]")) return;
      setActionMenuId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [actionMenuId]);

  useEffect(() => {
    const handleOutsideVisitAction = (event: MouseEvent) => {
      if (!visitActionMenuId) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-visit-action-menu-root]")) return;
      setVisitActionMenuId(null);
    };

    document.addEventListener("mousedown", handleOutsideVisitAction);
    return () => {
      document.removeEventListener("mousedown", handleOutsideVisitAction);
    };
  }, [visitActionMenuId]);

  useEffect(() => {
    const handleOutsidePanelClick = (event: MouseEvent) => {
      if (!isVisitSortPanelOpen) return;
      const target = event.target as Node | null;
      if (visitSortPanelRef.current && target && !visitSortPanelRef.current.contains(target)) {
        setIsVisitSortPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsidePanelClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsidePanelClick);
    };
  }, [isVisitSortPanelOpen]);

  const refreshPublished = async (forceRefresh = false) => {
    setLoadingPublished(true);
    try {
      if (forceRefresh) clearListingsCache();
      const rows = await withTimeout(getProperties({ forceRefresh, includeArchived: true }), 10000);
      const submissions = syncListingSubmissionsFromDatabase(rows ?? []);
      setItems(submissions);
      const linkedIds = new Set(
        submissions
          .map((item) => item.supabaseId)
          .filter((value): value is number => typeof value === "number"),
      );
      const externalPublished: ListingSubmission[] = (rows ?? [])
        .map((row: any) => {
          const normalizedId =
            typeof row?.id === "number"
              ? row.id
              : typeof row?.id === "string"
                ? Number.parseInt(row.id, 10)
                : Number.NaN;
          return { row, normalizedId };
        })
        .filter(({ normalizedId }) => Number.isFinite(normalizedId) && !linkedIds.has(normalizedId))
        .map(({ row, normalizedId }) => ({
          id: `db-${normalizedId}`,
          publicId: normalizedId,
          title: row.title ?? "Annonce publiée",
          price: Number(row.price ?? 0),
          transactionType: row.transaction_type === "Location" ? "Location" : "Vente",
          location: row.location ?? "-",
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
          supabaseId: normalizedId,
          status: row.status === "pending" ? "pending" : row.status === "archived" ? "rejected" : "approved",
          featured: row.status === "archived" ? false : Boolean(row.featured),
          createdAt: row.created_at ?? new Date().toISOString(),
          reviewedAt: row.created_at ?? new Date().toISOString(),
        }));
      setPublishedItems(
        [...externalPublished].sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
      );
      setPublishError("");
    } catch {
      // Keep current rows visible if refresh fails (network/backend transient issue).
      setPublishError("Impossible de synchroniser avec la base de données. Les annonces déjà chargées restent affichées.");
    } finally {
      setLoadingPublished(false);
    }
  };

  useEffect(() => {
    if (adminSession) {
      refreshPublished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  useEffect(() => {
    if (!adminSession) return;

    const unsubscribe = subscribeToPropertiesRealtime(() => {
      setItems(getListingSubmissions());
      refreshPublished(true);
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  const activeView: "dashboard" | "listings" | "contracts" | "visits" = useMemo(() => {
    if (location.pathname.startsWith("/admin/listings")) return "listings";
    if (location.pathname.startsWith("/admin/contracts") || location.pathname.startsWith("/admin/checklist")) return "contracts";
    if (location.pathname.startsWith("/admin/visits")) return "visits";
    return "listings";
  }, [location.pathname]);

  useEffect(() => {
    if (!adminSession) return;

    if (location.pathname === "/admin" || location.pathname.startsWith("/admin/dashboard")) {
      navigate("/admin/listings", { replace: true });
      return;
    }

    if (location.pathname.startsWith("/admin/checklist")) {
      navigate("/admin/contracts", { replace: true });
    }
  }, [adminSession, location.pathname, navigate]);

  useEffect(() => {
    if (!(adminSession && activeView === "listings")) return;

    const refreshListings = () => {
      setItems(getListingSubmissions());
      refreshPublished(false);
    };

    const intervalId = window.setInterval(refreshListings, 30000);
    window.addEventListener("focus", refreshListings);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshListings);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession, activeView]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (activeView === "listings") {
      const listingStatus = params.get("status");
      const listingQuery = params.get("q");
      if (listingStatus === "all" || listingStatus === "pending" || listingStatus === "approved" || listingStatus === "rejected") {
        setStatusFilter(listingStatus);
      }
      if (typeof listingQuery === "string") {
        setSearchTerm(listingQuery);
      }
    }

    if (activeView === "visits") {
      const visitStatus = params.get("visitStatus");
      const sortBy = params.get("visitSortBy");
      const sortDirection = params.get("visitSortDirection");
      const propertyQuery = params.get("visitProperty");

      if (typeof visitStatus === "string") {
        setVisitStatusFilter(visitStatus);
      }
      if (sortBy === "date" || sortBy === "status" || sortBy === "property") {
        setVisitSortBy(sortBy);
      }
      if (sortDirection === "asc" || sortDirection === "desc") {
        setVisitSortDirection(sortDirection);
      }
      if (typeof propertyQuery === "string") {
        setVisitPropertyQuery(propertyQuery);
      }
    }
  }, [activeView, location.search]);

  const loadVisitsData = useCallback(async (showLoader = true) => {
    if (showLoader) setVisitsLoading(true);
    try {
      const analyticsWindow = activeView === "visits" ? undefined : visitsWindow;
      const visitsWindowForList = activeView === "visits" || activeView === "dashboard" || activeView === "contracts" ? undefined : analyticsWindow;
      const [visitsData, analyticsData] = await Promise.all([
        getVisits({ limit: 100, window: visitsWindowForList }),
        getVisitsAnalytics(analyticsWindow),
      ]);
      setVisits(visitsData);
      setVisitsAnalytics(analyticsData);
      setVisitsError("");
    } catch (error) {
      setVisitsError("Erreur lors du chargement des visites.");
      console.error(error);
    } finally {
      if (showLoader) setVisitsLoading(false);
    }
  }, [activeView, visitsWindow]);

  // Load and keep visits fresh while the visits tab is active.
  useEffect(() => {
    const shouldLoadVisits = activeView === "visits" || activeView === "dashboard" || activeView === "listings" || activeView === "contracts";
    if (!(adminSession && shouldLoadVisits)) return;

    loadVisitsData(true);
    const shouldPoll = activeView !== "visits";
    const intervalId = shouldPoll
      ? window.setInterval(() => {
          loadVisitsData(false);
        }, 30000)
      : null;

    const handleFocusRefresh = () => {
      loadVisitsData(false);
    };

    window.addEventListener("focus", handleFocusRefresh);
    window.addEventListener("visit-request-created", handleFocusRefresh);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener("focus", handleFocusRefresh);
      window.removeEventListener("visit-request-created", handleFocusRefresh);
    };
  }, [adminSession, activeView, loadVisitsData]);

  // Realtime subscription for near-instant updates on visit inserts/updates/deletes.
  useEffect(() => {
    if (!(adminSession && activeView === "visits")) return;

    const channel = supabase
      .channel(`admin-visits-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        () => {
          loadVisitsData(false);
        },
      )
      .subscribe((status) => {
        setIsVisitsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      setIsVisitsRealtimeActive(false);
      supabase.removeChannel(channel);
    };
  }, [adminSession, activeView, loadVisitsData]);

  const allItems = useMemo(
    () => [...items, ...publishedItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items, publishedItems],
  );

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginPassword !== ADMIN_PASSWORD) {
      setLoginError("Mot de passe admin invalide.");
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

  const handleVisitUpdate = async () => {
    if (!editingVisit) return;
      setVisitFormError("");
      setVisitFieldErrors({ date: "", time: "" });

      if (!editFormData.date || !editFormData.time) {
        setVisitFormError("Veuillez renseigner tous les champs obligatoires avant d'accepter la visite.");
        setVisitFieldErrors({
          date: editFormData.date ? "" : "Date obligatoire",
          time: editFormData.time ? "" : "Heure obligatoire",
        });
      return;
    }

    const [, minutePart = ""] = editFormData.time.split(":");
    if (minutePart !== "00" && minutePart !== "30") {
        setVisitFormError("Veuillez sélectionner une heure avec un intervalle de 30 minutes (:00 ou :30).");
        setVisitFieldErrors({ date: "", time: "Heure invalide" });
      return;
    }

    const [hourPart = ""] = editFormData.time.split(":");
    const hourValue = Number.parseInt(hourPart, 10);
    if (!Number.isFinite(hourValue) || hourValue < 8 || hourValue > 18) {
        setVisitFormError("Veuillez sélectionner une heure entre 08:00 et 18:00.");
        setVisitFieldErrors({ date: "", time: "En dehors de la plage autorisée" });
      return;
    }

    try {
      await updateVisit(editingVisit.id, {
        visit_status: "scheduled",
        scheduled_date: editFormData.date || undefined,
        scheduled_time: editFormData.time || undefined,
        notes: editFormData.notes || undefined,
      });
      await loadVisitsData(false);
      setEditingVisit(null);
      setEditFormData({ status: "new", date: "", time: "", notes: "" });
      setVisitFormError("");
      setVisitFieldErrors({ date: "", time: "" });
    } catch (error) {
      console.error("Error updating visit:", error);
      setVisitFormError("Erreur lors de la mise à jour de la visite. Réessayez dans quelques instants.");
    }
  };

  const openPlanningModal = (visit: Visit) => {
    setEditingVisit(visit);
    setVisitFormError("");
    setVisitFieldErrors({ date: "", time: "" });
    setEditFormData({
      status: "scheduled",
      date: visit.scheduled_date || "",
      time: visit.scheduled_time || "",
      notes: visit.notes || "",
    });
  };

  const handleCancelVisit = async (visitId: number) => {
    try {
      await updateVisit(visitId, { visit_status: "rejected" });
      await loadVisitsData(false);
    } catch (error) {
      console.error("Error updating visit status:", error);
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  const metrics = useMemo(() => {
    const pending = allItems.filter((item) => item.status === "pending").length;
    const approved = allItems.filter((item) => item.status === "approved").length;
    const rejected = allItems.filter((item) => item.status === "rejected").length;
    const featured = allItems.filter((item) => item.featured).length;
    return { pending, approved, rejected, featured, total: allItems.length };
  }, [allItems]);

  const listingRates = useMemo(() => {
    const total = Math.max(1, metrics.total);
    return {
      pendingPct: (metrics.pending / total) * 100,
      approvedPct: (metrics.approved / total) * 100,
      rejectedPct: (metrics.rejected / total) * 100,
      featuredPct: (metrics.featured / total) * 100,
    };
  }, [metrics]);

  const displayedVisits = useMemo(() => {
    const statusOrder: Record<string, number> = {
      new: 0,
      scheduled: 1,
      completed: 2,
      rejected: 3,
    };

    const propertyNeedle = visitPropertyQuery.trim().toLowerCase();

    const filtered = visits.filter((visit) => {
      const matchesStatus = visitStatusFilter === "all" ? true : visit.visit_status === visitStatusFilter;
      const matchesProperty =
        propertyNeedle.length === 0
          ? true
          : visit.property_title.toLowerCase().includes(propertyNeedle)
            || String(visit.property_id ?? "").includes(propertyNeedle);
      return matchesStatus && matchesProperty;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (visitSortBy === "property") {
        return left.property_title.localeCompare(right.property_title, "fr", { sensitivity: "base" });
      }

      if (visitSortBy === "status") {
        const leftRank = statusOrder[left.visit_status] ?? 99;
        const rightRank = statusOrder[right.visit_status] ?? 99;
        return leftRank - rightRank;
      }

      const leftDate = left.scheduled_date ?? left.created_at ?? "";
      const rightDate = right.scheduled_date ?? right.created_at ?? "";
      return new Date(leftDate).getTime() - new Date(rightDate).getTime();
    });

    return visitSortDirection === "asc" ? sorted : sorted.reverse();
  }, [visits, visitPropertyQuery, visitSortBy, visitSortDirection, visitStatusFilter]);

  const visitsWindowLabel = useMemo(() => {
    if (visitsWindow === "today") return "Aujourd'hui";
    if (visitsWindow === "7d") return "7 derniers jours";
    return "30 derniers jours";
  }, [visitsWindow]);

  const visitsKpis = useMemo(() => {
    const metrics = visitsAnalytics?.metrics ?? {};
    const total = toSafeNumber(metrics.total_requests, visits.length);
    const newCount = toSafeNumber(metrics.new_count, 0);
    const scheduledCount = toSafeNumber(metrics.scheduled_count, 0);
    const completedCount = toSafeNumber(metrics.completed_count, 0);
    const rejectedCount = toSafeNumber(metrics.rejected_count, 0);
    const schedulingRate = toSafeNumber(metrics.scheduling_rate, total > 0 ? ((scheduledCount + completedCount) / total) * 100 : 0);
    const completionRate = toSafeNumber(metrics.completion_rate, total > 0 ? (completedCount / total) * 100 : 0);
    const sameDayRate = toSafeNumber(metrics.same_day_scheduling_rate, 0);
    const avgHoursToSchedule = toSafeNumber(metrics.avg_hours_to_schedule, 0);

    return {
      total,
      newCount,
      scheduledCount,
      completedCount,
      rejectedCount,
      schedulingRate,
      completionRate,
      sameDayRate,
      avgHoursToSchedule,
    };
  }, [visits, visitsAnalytics]);

  const topRequestedListings = useMemo(() => {
    const rows = Array.isArray(visitsAnalytics?.byProperty) ? visitsAnalytics.byProperty : [];
    return rows
      .map((row: any) => ({
        propertyId: toSafeNumber(row.property_id, 0),
        propertyTitle: String(row.property_title ?? "Bien immobilier"),
        count: toSafeNumber(row.count, 0),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [visitsAnalytics]);

  const completedVisits = useMemo(
    () => visits.filter((visit) => visit.visit_status === "completed"),
    [visits],
  );

  const selectedCompletedVisit = useMemo(
    () => completedVisits.find((visit) => String(visit.id) === selectedCompletedVisitId) ?? null,
    [completedVisits, selectedCompletedVisitId],
  );

  useEffect(() => {
    if (!selectedCompletedVisit) {
      return;
    }

    setContractCustomerName(selectedCompletedVisit.visitor_name ?? "");
    setContractAddress(selectedCompletedVisit.property_title ?? "");
    setContractError("");
    setContractSuccess("");
  }, [selectedCompletedVisit]);

  const buildContractContent = (
    mode: "vente" | "location",
    payload: {
      customerName: string;
      ownerName: string;
      amount: string;
      rentPeriod: string;
      address: string;
      notes: string;
      visit: Visit;
    },
  ) => {
    const contractLabel = mode === "vente" ? "عقد بيع عقار" : "عقد كراء عقار";
    const signedDate = new Date().toLocaleDateString("ar-TN");
    const visitDate = payload.visit.scheduled_date
      ? new Date(payload.visit.scheduled_date).toLocaleDateString("ar-TN")
      : "-";

    return `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; color: #0f172a; font-size: 13px; line-height: 1.8;">
        <h1 style="text-align:center; margin:0 0 12px; font-size: 28px;">${contractLabel}</h1>
        <div style="border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; background:#f8fafc; margin-bottom:14px;">
          <div><strong>تاريخ التحرير:</strong> ${signedDate}</div>
          <div><strong>مرجع الزيارة:</strong> #${payload.visit.id}</div>
          <div><strong>تاريخ الزيارة المكتملة:</strong> ${visitDate}</div>
        </div>

        <h2 style="font-size:18px; margin:0 0 8px;">أطراف العقد</h2>
        <div style="margin-bottom:10px;">المكري/البائع: <strong>${payload.ownerName}</strong></div>
        <div style="margin-bottom:14px;">الحريف: <strong>${payload.customerName}</strong></div>

        <h2 style="font-size:18px; margin:0 0 8px;">بيانات العقار</h2>
        <div style="margin-bottom:8px;">العقار: <strong>${payload.visit.property_title}</strong></div>
        <div style="margin-bottom:14px;">العنوان: <strong>${payload.address}</strong></div>

        <h2 style="font-size:18px; margin:0 0 8px;">الشروط المالية</h2>
        <div style="margin-bottom:8px;">${mode === "vente" ? "ثمن البيع" : "معلوم الكراء"}: <strong>${payload.amount} د.ت</strong></div>
        ${mode === "location" ? `<div style="margin-bottom:14px;">مدة الكراء: <strong>${payload.rentPeriod}</strong></div>` : "<div style='margin-bottom:14px;'></div>"}

        <h2 style="font-size:18px; margin:0 0 8px;">بنود عامة</h2>
        <ul style="margin:0 0 14px; padding-right:18px;">
          <li>يقر الطرفان بإتمام المعاينة الميدانية للعقار.</li>
          <li>${mode === "vente" ? "يلتزم البائع بنقل الملكية وفقا للقوانين الجاري بها العمل." : "يلتزم المكري بتسليم العقار للحريف وفق الشروط المتفق عليها."}</li>
          <li>تعتمد هذه الوثيقة كمسودة تعاقدية أولية إلى حين الإمضاء النهائي.</li>
        </ul>

        <h2 style="font-size:18px; margin:0 0 8px;">ملاحظات</h2>
        <div style="min-height:52px; border:1px dashed #cbd5e1; border-radius:10px; padding:8px 10px; margin-bottom:16px;">${payload.notes || "لا توجد ملاحظات إضافية"}</div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:18px; text-align:center;">
          <div style="border-top:1px solid #334155; padding-top:8px;">إمضاء الحريف</div>
          <div style="border-top:1px solid #334155; padding-top:8px;">إمضاء المالك</div>
          <div style="border-top:1px solid #334155; padding-top:8px;">إمضاء الإدارة</div>
        </div>
      </div>
    `;
  };

  const downloadPdfFromHtml = async (filename: string, htmlContent: string) => {
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      setContractError("Impossible d'ouvrir la fenetre d'impression. Autorisez les popups puis reessayez.");
      return;
    }

    const safeTitle = filename.replace(/\.pdf$/i, "");
    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${safeTitle}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Tahoma, Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; }
            .sheet { max-width: 794px; margin: 0 auto; padding: 0; }
          </style>
        </head>
        <body>
          <div class="sheet">${htmlContent}</div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadContractTemplate = (mode: "vente" | "location") => {
    const templateContent = buildContractContent(mode, {
      customerName: "اسم الحريف",
      ownerName: "اسم المالك",
      amount: "0",
      rentPeriod: "12 شهرا",
      address: "عنوان العقار",
      notes: "استكمال التفاصيل القانونية قبل الإمضاء النهائي.",
      visit: {
        id: 0,
        property_title: "عقار سكني",
        scheduled_date: new Date().toISOString().slice(0, 10),
      } as Visit,
    });

    void downloadPdfFromHtml(
      `modele-${mode}-${new Date().toISOString().slice(0, 10)}.pdf`,
      templateContent,
    );
  };

  const createCustomerContract = () => {
    setContractError("");
    setContractSuccess("");

    if (!selectedCompletedVisit) {
      setContractError("Selectionnez une visite completee pour creer un contrat.");
      return;
    }

    if (!contractCustomerName.trim() || !contractOwnerName.trim() || !contractAmount.trim() || !contractAddress.trim()) {
      setContractError("Tous les champs obligatoires doivent etre completes.");
      return;
    }

    if (contractType === "location" && !contractRentPeriod.trim()) {
      setContractError("Pour un contrat de location, la periode de location est obligatoire.");
      return;
    }

    const content = buildContractContent(contractType, {
      customerName: contractCustomerName.trim(),
      ownerName: contractOwnerName.trim(),
      amount: contractAmount.trim(),
      rentPeriod: contractRentPeriod.trim(),
      address: contractAddress.trim(),
      notes: contractNotes.trim(),
      visit: selectedCompletedVisit,
    });

    void downloadPdfFromHtml(
      `contrat-${contractType}-visite-${selectedCompletedVisit.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      content,
    );

    setContractSuccess("Contrat arabe genere. Dans la fenetre d'impression, choisissez 'Save as PDF'.");
  };

  const topViewedListing = topRequestedListings[0] ?? null;

  const trafficSeries = useMemo(() => {
    const timelineRows = Array.isArray(visitsAnalytics?.timeline) ? visitsAnalytics.timeline : [];
    const sortedRows = [...timelineRows].sort((left: any, right: any) => {
      const leftTime = new Date(String(left.date ?? "")).getTime();
      const rightTime = new Date(String(right.date ?? "")).getTime();
      return leftTime - rightTime;
    });

    const compact = sortedRows.slice(-7).map((row: any) => {
      const value = toSafeNumber(row.requests_count, 0);
      const label = new Date(String(row.date ?? "")).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      return { label, value };
    });

    if (compact.length === 0) {
      const fallback = ["J-6", "J-5", "J-4", "J-3", "J-2", "J-1", "Auj"];
      return fallback.map((label) => ({ label, value: 0, percent: 0 }));
    }

    const maxValue = Math.max(1, ...compact.map((entry) => entry.value));
    return compact.map((entry) => ({
      label: entry.label,
      value: entry.value,
      percent: (entry.value / maxValue) * 100,
    }));
  }, [visitsAnalytics]);

  const visitStatusBreakdown = useMemo(() => {
    const palette: Record<string, string> = {
      new: "#f59e0b",
      scheduled: "#3b82f6",
      completed: "#10b981",
      rejected: "#ef4444",
    };

    const rows = Array.isArray(visitsAnalytics?.byStatus) ? visitsAnalytics.byStatus : [];
    const normalized = rows.map((row: any) => {
      const status = String(row.visit_status ?? "new");
      return {
        key: status,
        label: VISIT_STATUS_LABELS[status as keyof typeof VISIT_STATUS_LABELS] ?? status,
        value: toSafeNumber(row.count, 0),
        color: palette[status] ?? "#64748b",
      };
    });

    if (normalized.length > 0) {
      return normalized;
    }

    return [
      { key: "new", label: VISIT_STATUS_LABELS.new, value: visitsKpis.newCount, color: "#f59e0b" },
      { key: "scheduled", label: VISIT_STATUS_LABELS.scheduled, value: visitsKpis.scheduledCount, color: "#3b82f6" },
      { key: "completed", label: VISIT_STATUS_LABELS.completed, value: visitsKpis.completedCount, color: "#10b981" },
      { key: "rejected", label: VISIT_STATUS_LABELS.rejected, value: visitsKpis.rejectedCount, color: "#ef4444" },
    ];
  }, [visitsAnalytics, visitsKpis.completedCount, visitsKpis.newCount, visitsKpis.rejectedCount, visitsKpis.scheduledCount]);

  const halfHourTimeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 8; hour <= 18; hour += 1) {
      options.push(`${String(hour).padStart(2, "0")}:00`);
      if (hour < 18) {
        options.push(`${String(hour).padStart(2, "0")}:30`);
      }
    }
    return options;
  }, []);

  const filteredItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return allItems.filter((item) => {
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
  }, [allItems, searchTerm, statusFilter]);

  const latestPending = useMemo(
    () => allItems.find((item) => item.status === "pending") ?? null,
    [allItems],
  );

  const recentActivity = useMemo(
    () => [...allItems].sort((left, right) => {
      const leftDate = new Date(left.reviewedAt ?? left.createdAt).getTime();
      const rightDate = new Date(right.reviewedAt ?? right.createdAt).getTime();
      return rightDate - leftDate;
    }).slice(0, 5),
    [allItems],
  );

  const dashboardInsights = useMemo(() => {
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const twoHoursMs = 2 * 60 * 60 * 1000;

    const pendingListings = allItems.filter((item) => item.status === "pending");
    const pendingOlderThan24h = pendingListings.filter((item) => {
      const createdAt = new Date(item.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt > twentyFourHoursMs;
    }).length;

    const reviewedItems = allItems.filter((item) => item.status === "approved" || item.status === "rejected");
    const reviewedWithin24h = reviewedItems.filter((item) => {
      const createdAt = new Date(item.createdAt).getTime();
      const reviewedAt = new Date(item.reviewedAt ?? item.createdAt).getTime();
      return Number.isFinite(createdAt) && Number.isFinite(reviewedAt) && reviewedAt - createdAt <= twentyFourHoursMs;
    }).length;
    const slaReviewRate = reviewedItems.length > 0 ? (reviewedWithin24h / reviewedItems.length) * 100 : 100;

    const newVisits = visits.filter((visit) => visit.visit_status === "new");
    const newVisitsOlderThan2h = newVisits.filter((visit) => {
      const createdAt = new Date(visit.created_at ?? "").getTime();
      return Number.isFinite(createdAt) && now - createdAt > twoHoursMs;
    }).length;

    const scheduledOverdue = visits.filter((visit) => {
      if (visit.visit_status !== "scheduled" || !visit.scheduled_date) {
        return false;
      }
      const scheduledAt = new Date(`${visit.scheduled_date}T${visit.scheduled_time ?? "00:00"}`).getTime();
      return Number.isFinite(scheduledAt) && scheduledAt < now;
    }).length;
    const conversionLeakCount = Math.max(0, visitsKpis.newCount - visitsKpis.scheduledCount - visitsKpis.completedCount);

    const upcoming48h = visits.filter((visit) => {
      if (visit.visit_status !== "scheduled" || !visit.scheduled_date) {
        return false;
      }

      const rawDate = String(visit.scheduled_date);
      const rawTime = String(visit.scheduled_time ?? "").trim();
      const normalizedTime = rawTime.length > 0 ? rawTime : "23:59";
      const scheduledInput = rawDate.includes("T") ? rawDate : `${rawDate}T${normalizedTime}`;
      const dateValue = new Date(scheduledInput).getTime();
      return Number.isFinite(dateValue) && dateValue >= now && dateValue <= now + fortyEightHoursMs;
    }).length;

    const upcoming24h = visits.filter((visit) => {
      if (visit.visit_status !== "scheduled" || !visit.scheduled_date) {
        return false;
      }

      const rawDate = String(visit.scheduled_date);
      const rawTime = String(visit.scheduled_time ?? "").trim();
      const normalizedTime = rawTime.length > 0 ? rawTime : "23:59";
      const scheduledInput = rawDate.includes("T") ? rawDate : `${rawDate}T${normalizedTime}`;
      const dateValue = new Date(scheduledInput).getTime();
      return Number.isFinite(dateValue) && dateValue >= now && dateValue <= now + 24 * 60 * 60 * 1000;
    }).length;

    const qualityAlerts = allItems.filter((item) => item.status === "approved" && (item.photoCount ?? 0) < 3).length;

    const scheduledOrCompletedByProperty = new Set(
      visits
        .filter((visit) => visit.visit_status === "scheduled" || visit.visit_status === "completed")
        .map((visit) => Number(visit.property_id))
        .filter((value) => Number.isFinite(value)),
    );

    const bestOpportunity = topRequestedListings.find((entry) => !scheduledOrCompletedByProperty.has(entry.propertyId)) ?? null;

    const pendingListingsList = pendingListings
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .slice(0, 5)
      .map((item) => {
        const createdAt = new Date(item.createdAt).getTime();
        const waitingHours = Number.isFinite(createdAt) ? Math.max(1, Math.floor((now - createdAt) / (60 * 60 * 1000))) : 0;
        return {
          id: `listing-${item.id}`,
          title: `Annonce en attente: ${item.title}`,
          priority: waitingHours >= 24 ? "Critique" : "Moyen",
          detail: `${item.location} • en attente depuis ${waitingHours}h`,
          route: `/admin/listings?status=pending&q=${encodeURIComponent(item.title)}`,
        };
      });

    const pendingVisitsList = newVisits
      .sort((left, right) => new Date(left.created_at ?? "").getTime() - new Date(right.created_at ?? "").getTime())
      .slice(0, 5)
      .map((visit) => {
        const createdAt = new Date(visit.created_at ?? "").getTime();
        const waitingHours = Number.isFinite(createdAt) ? Math.max(1, Math.floor((now - createdAt) / (60 * 60 * 1000))) : 0;
        return {
          id: `visit-${visit.id}`,
          title: `Visite en attente: ${visit.property_title}`,
          priority: waitingHours >= 2 ? "Critique" : "Moyen",
          detail: `${visit.visitor_name} • demandée il y a ${waitingHours}h`,
          route: `/admin/visits?visitStatus=new&visitProperty=${encodeURIComponent(visit.property_title)}`,
        };
      });

    const otherTodo = [
      {
        id: "urgent-visits",
        title: "Contacter les prospects chauds (vue globale)",
        priority: "Critique",
        detail: `${newVisitsOlderThan2h} demandes nouvelles en attente depuis plus de 2h`,
        route: "/admin/visits?visitStatus=new&visitSortBy=status&visitSortDirection=desc",
      },
      {
        id: "reschedule",
        title: "Replanifier les visites en retard",
        priority: "Moyen",
        detail: `${scheduledOverdue} visites programmées dépassées`,
        route: "/admin/visits?visitStatus=scheduled&visitSortBy=date&visitSortDirection=asc",
      },
      {
        id: "quality",
        title: "Renforcer la qualité des fiches",
        priority: "Moyen",
        detail: `${qualityAlerts} annonces visibles avec moins de 3 photos`,
        route: "/admin/listings?status=approved",
      },
    ];

    const todayTodo = [...pendingListingsList, ...pendingVisitsList, ...otherTodo];

    return {
      pendingOlderThan24h,
      newVisitsOlderThan2h,
      scheduledOverdue,
      slaReviewRate,
      conversionLeakCount,
      upcoming24h,
      upcoming48h,
      qualityAlerts,
      bestOpportunity,
      todayTodo,
    };
  }, [allItems, topRequestedListings, visits, visitsKpis.completedCount, visitsKpis.newCount, visitsKpis.scheduledCount]);

  const totalListingsPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE)),
    [filteredItems.length],
  );

  const paginatedListings = useMemo(() => {
    const startIndex = (listingsPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, listingsPage]);

  const selectedListings = useMemo(() => {
    const selectedIds = new Set(selectedListingIds);
    return allItems.filter((item) => selectedIds.has(item.id));
  }, [allItems, selectedListingIds]);

  const selectedListingsOnPageCount = useMemo(
    () => paginatedListings.filter((item) => selectedListingIds.includes(item.id)).length,
    [paginatedListings, selectedListingIds],
  );

  const areAllListingsOnPageSelected = paginatedListings.length > 0 && selectedListingsOnPageCount === paginatedListings.length;
  const canBulkApprove = selectedListings.some((item) => item.status !== "approved");
  const canBulkReject = selectedListings.some((item) => item.status !== "rejected");
  const canBulkSetPending = selectedListings.some((item) => !item.id.startsWith("db-") && item.status !== "pending");

  const totalVisitsPages = useMemo(
    () => Math.max(1, Math.ceil(displayedVisits.length / PAGE_SIZE)),
    [displayedVisits.length],
  );

  const paginatedVisits = useMemo(() => {
    const startIndex = (visitsPage - 1) * PAGE_SIZE;
    return displayedVisits.slice(startIndex, startIndex + PAGE_SIZE);
  }, [displayedVisits, visitsPage]);

  const totalDashboardTodoPages = useMemo(
    () => Math.max(1, Math.ceil(dashboardInsights.todayTodo.length / PAGE_SIZE)),
    [dashboardInsights.todayTodo.length],
  );

  const paginatedDashboardTodo = useMemo(() => {
    const startIndex = (dashboardTodoPage - 1) * PAGE_SIZE;
    return dashboardInsights.todayTodo.slice(startIndex, startIndex + PAGE_SIZE);
  }, [dashboardInsights.todayTodo, dashboardTodoPage]);

  useEffect(() => {
    setListingsPage(1);
  }, [searchTerm, statusFilter, activeView]);

  useEffect(() => {
    const availableIds = new Set(allItems.map((item) => item.id));
    setSelectedListingIds((current) => current.filter((id) => availableIds.has(id)));
  }, [allItems]);

  useEffect(() => {
    setVisitsPage(1);
  }, [visitPropertyQuery, visitSortBy, visitSortDirection, visitStatusFilter, activeView]);

  useEffect(() => {
    setDashboardTodoPage(1);
  }, [dashboardInsights.todayTodo.length, activeView]);

  useEffect(() => {
    setListingsPage((current) => Math.min(current, totalListingsPages));
  }, [totalListingsPages]);

  useEffect(() => {
    setVisitsPage((current) => Math.min(current, totalVisitsPages));
  }, [totalVisitsPages]);

  useEffect(() => {
    setDashboardTodoPage((current) => Math.min(current, totalDashboardTodoPages));
  }, [totalDashboardTodoPages]);

  const hasListingFiltersApplied = statusFilter !== "all" || searchTerm.trim().length > 0 || (activeView === "listings" && location.search.length > 0);
  const hasVisitFiltersApplied =
    visitStatusFilter !== "all"
    || visitPropertyQuery.trim().length > 0
    || visitSortBy !== "status"
    || visitSortDirection !== "asc"
    || (activeView === "visits" && location.search.length > 0);

  const clearListingFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    if (activeView === "listings" && location.search.length > 0) {
      navigate("/admin/listings", { replace: true });
    }
  };

  const clearVisitFilters = () => {
    setVisitSortBy("status");
    setVisitSortDirection("asc");
    setVisitStatusFilter("all");
    setVisitPropertyQuery("");
    setIsVisitSortPanelOpen(false);
    if (activeView === "visits" && location.search.length > 0) {
      navigate("/admin/visits", { replace: true });
    }
  };

  const toggleListingSelection = (id: string) => {
    setSelectedListingIds((current) => (
      current.includes(id)
        ? current.filter((entryId) => entryId !== id)
        : [...current, id]
    ));
  };

  const toggleSelectAllListingsOnPage = () => {
    const pageIds = paginatedListings.map((item) => item.id);

    setSelectedListingIds((current) => {
      if (pageIds.every((id) => current.includes(id))) {
        return current.filter((id) => !pageIds.includes(id));
      }

      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const clearSelectedListings = () => {
    setSelectedListingIds([]);
  };

  const handleBulkStatusUpdate = async (status: ListingSubmission["status"]) => {
    if (isBulkProcessing || selectedListings.length === 0) {
      return;
    }

    const eligibleIds = selectedListings
      .filter((item) => {
        if (status === "approved") {
          return item.status !== "approved";
        }
        if (status === "rejected") {
          return item.status !== "rejected";
        }
        return !item.id.startsWith("db-") && item.status !== "pending";
      })
      .map((item) => item.id);

    if (eligibleIds.length === 0) {
      return;
    }

    setActionError("");
    setActionMenuId(null);
    setIsBulkProcessing(true);

    try {
      for (const id of eligibleIds) {
        await updateStatus(id, status);
      }
      setSelectedListingIds((current) => current.filter((id) => !eligibleIds.includes(id)));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const updateStatus = async (id: string, status: ListingSubmission["status"]) => {
    const submission = allItems.find((item) => item.id === id);
    if (!submission) return;
    const isDbPublishedOnly = submission.id.startsWith("db-");

    setActionError("");
    setProcessingId(id);

    try {
      if (isDbPublishedOnly) {
        if (status === "rejected" && submission.supabaseId) {
          if (submission.status === "rejected") {
            setActionError("Cette annonce est deja suspendue.");
            return;
          }

          await withTimeout(inactivateListingWithBackend(submission.supabaseId));
          clearListingsCache();
          setPublishedItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "rejected",
                    featured: false,
                    reviewedAt: new Date().toISOString(),
                  }
                : item,
            ),
          );
        } else if (status === "approved") {
          if (submission.status === "approved") {
            setActionError("Cette annonce est deja publiee.");
            return;
          }

          const publishedId = await withTimeout(
            approveListingWithBackend({
              id: submission.id,
              title: submission.title,
              price: submission.price,
              transactionType: submission.transactionType,
              location: submission.location,
              mapLocationQuery: submission.mapLocationQuery || undefined,
              nearbyCommodities: submission.nearbyCommodities ?? [],
              propertyType: submission.propertyType,
              bedrooms: submission.bedrooms ?? 0,
              bathrooms: submission.bathrooms ?? 0,
              area: submission.area ?? 0,
              description: submission.description || undefined,
              coverImage: submission.coverImage || undefined,
              gallery: submission.gallery ?? [],
              videoUrl: submission.videoUrl || undefined,
              features: submission.features ?? [],
              tags: submission.tags ?? [],
              featured: submission.featured,
            }),
          );

          clearListingsCache();
          setPublishedItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    id: `db-${publishedId}`,
                    supabaseId: publishedId,
                    status: "approved",
                    reviewedAt: new Date().toISOString(),
                  }
                : item,
            ),
          );
        } else if (status === "pending") {
          setActionError("Impossible de remettre en attente une publication existante.");
        }
        return;
      }

      if (status === "approved") {
        // Approve locally first so UI never stays blocked waiting on network.
        updateListingSubmissionStatus(id, status, submission.supabaseId);
        setItems(getListingSubmissions());

        const freshSubmission = getListingSubmissions().find((item) => item.id === id) ?? submission;
        const publishedId = await approveListingWithBackend({
          id: freshSubmission.id,
          title: freshSubmission.title,
          price: freshSubmission.price,
          transactionType: freshSubmission.transactionType,
          location: freshSubmission.location,
          mapLocationQuery: freshSubmission.mapLocationQuery || undefined,
          nearbyCommodities: freshSubmission.nearbyCommodities ?? [],
          propertyType: freshSubmission.propertyType,
          bedrooms: freshSubmission.bedrooms ?? 0,
          bathrooms: freshSubmission.bathrooms ?? 0,
          area: freshSubmission.area ?? 0,
          description: freshSubmission.description || undefined,
          coverImage: freshSubmission.coverImage || undefined,
          gallery: freshSubmission.gallery ?? [],
          videoUrl: freshSubmission.videoUrl || undefined,
          features: freshSubmission.features ?? [],
          tags: freshSubmission.tags ?? [],
          featured: freshSubmission.featured,
          supabaseId: freshSubmission.supabaseId,
        });

        updateListingSubmissionStatus(id, status, publishedId);

        clearListingsCache();
        setItems(getListingSubmissions());
      } else if (status === "rejected" && submission.status === "approved" && submission.supabaseId) {
        // Inactivate locally first so listing disappears immediately from public merged sources.
        updateListingSubmissionStatus(id, status, submission.supabaseId);
        setItems(getListingSubmissions());

        await withTimeout(inactivateListingWithBackend(submission.supabaseId));
        clearListingsCache();
      } else {
        updateListingSubmissionStatus(id, status);
      }
    } catch (err: any) {
      const reason = err?.message ?? "Erreur inconnue";
      console.error("Erreur action admin:", err);
      if (status === "approved") {
        setActionError(`Annonce approuvée localement, mais non synchronisée sur Supabase: ${reason}`);
      } else {
        setActionError(`Impossible de traiter cette action: ${reason}`);
      }
    } finally {
      setProcessingId(null);
    }

    setItems(getListingSubmissions());
  };

  const toggleFeatured = async (id: string) => {
    const submission = allItems.find((item) => item.id === id);
    if (!submission) return;

    const isDbPublishedOnly = submission.id.startsWith("db-");

    if (isDbPublishedOnly && submission.supabaseId) {
      const newFeatured = !submission.featured;
      try {
        await supabase
          .from("properties")
          .update({ featured: newFeatured })
          .eq("id", submission.supabaseId);

        setPublishedItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, featured: newFeatured } : item)),
        );
        clearListingsCache();
      } catch (err) {
        console.error("Erreur mise a jour featured Supabase:", err);
      }
      return;
    }

    // Optimistically toggle in localStorage
    toggleListingFeatured(id);
    const newFeatured = !submission.featured;

    // If approved and published, sync featured flag on Supabase row
    if (submission.status === "approved" && submission.supabaseId) {
      try {
        await supabase
          .from("properties")
          .update({ featured: newFeatured })
          .eq("id", submission.supabaseId);
        clearListingsCache();
      } catch (err) {
        console.error("Erreur mise à jour featured Supabase:", err);
      }
    }

    setItems(getListingSubmissions());
  };

  const deleteListingItem = async (item: ListingSubmission) => {
    if (typeof item.supabaseId === "number" && Number.isFinite(item.supabaseId)) {
      setProcessingId(item.id);
      setActionError("");
      try {
        await withTimeout(deleteListingWithBackend(item.supabaseId), 12000, "La suppression backend a expiré.");
        clearListingsCache();
        setPublishedItems((prev) => prev.filter((entry) => entry.id !== item.id && entry.supabaseId !== item.supabaseId));
        deleteListingSubmission(item.id);
        setItems(getListingSubmissions());
      } catch (err: any) {
        const reason = err?.message ?? "Erreur inconnue";
        setActionError(`Impossible de supprimer cette publication de la base de données: ${reason}`);
      } finally {
        setProcessingId(null);
      }
      return;
    }

    deleteListingSubmission(item.id);
    setItems(getListingSubmissions());
  };

  const handleDelete = (item: ListingSubmission) => {
    const confirmed = window.confirm(
      `Supprimer définitivement l'annonce "${item.title}" de ${item.fullName} ? Cette action est irreversible.`,
    );

    if (!confirmed) {
      return;
    }

    void deleteListingItem(item);
  };

  const handleBulkDeleteSelected = async () => {
    if (isBulkProcessing || selectedListings.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement ${selectedListings.length} annonce(s) sélectionnée(s) ? Cette action est irreversible.`,
    );

    if (!confirmed) {
      return;
    }

    setActionError("");
    setActionMenuId(null);
    setIsBulkProcessing(true);

    try {
      for (const item of selectedListings) {
        await deleteListingItem(item);
      }
      setSelectedListingIds([]);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  if (!adminSession) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)] px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-md rounded-[28px] border border-sky-200/80 bg-white/80 p-6 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md sm:p-8">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Admin Only</p>
          <h1 className="mt-2 font-serif text-3xl text-slate-950 sm:text-4xl">Connexion admin</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Espace sécurisé de modération des annonces clients. Saisissez uniquement le mot de passe administrateur pour continuer.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleAdminLogin}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Mot de passe admin</label>
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
              Ouvrir l'espace admin
            </button>
          </form>

          <Link to="/" className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900">
            Retour au site public
          </Link>
        </div>
      </div>
    );
  }

  const donutGradient = (() => {
    const total = visitStatusBreakdown.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return "conic-gradient(#dbeafe 0 100%)";
    }

    let cursor = 0;
    const segments = visitStatusBreakdown
      .map((item) => {
        const start = cursor;
        const pct = (item.value / total) * 100;
        cursor += pct;
        return `${item.color} ${start}% ${cursor}%`;
      })
      .join(", ");

    return `conic-gradient(${segments})`;
  })();

  const weeklySeries = trafficSeries;

  const sidebarItems = [
    { key: "listings", label: "Annonces", icon: Clock3, path: "/admin/listings" },
    { key: "visits", label: "Visites", icon: CalendarDays, path: "/admin/visits" },
    { key: "contracts", label: "Contrats", icon: FileText, path: "/admin/contracts" },
  ] as const;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_38%,_#f4f7fb_100%)] text-slate-900">
      <style>{`
        @keyframes adminFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:px-8">
        <aside className="hidden min-h-[calc(100vh-2.5rem)] w-[250px] flex-col justify-between rounded-[22px] border border-sky-200/80 bg-white/72 px-4 py-4 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md lg:flex">
          <div>
            <div className="flex items-center justify-center rounded-2xl border border-slate-300/40 bg-white/80 px-3 py-3">
              <BrandLogo compact />
            </div>
            <div className="mt-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.key;

                return (
                  <button
                    key={item.key}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-950 text-white shadow"
                        : "text-slate-600 hover:bg-sky-50 hover:text-slate-900"
                    }`}
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-label={item.label}
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-white/15" : "bg-slate-100"}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50"
            aria-label="Deconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </aside>
        <main className="w-full flex-1 space-y-4 sm:space-y-5">
          <div className="relative overflow-hidden rounded-[28px] border border-sky-200/70 bg-[radial-gradient(circle_at_12%_18%,rgba(125,211,252,0.18),transparent_24%),radial-gradient(circle_at_86%_16%,rgba(56,189,248,0.22),transparent_22%),linear-gradient(135deg,#0f172a_0%,#123d63_42%,#0b6fa4_70%,#0ea5e9_100%)] p-4 text-white shadow-[0_22px_46px_rgba(14,30,60,0.30)] sm:p-6">
            <div className="pointer-events-none absolute -left-10 top-16 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
            <div className="pointer-events-none absolute right-8 top-0 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-16 bottom-2 h-44 w-44 rounded-full bg-sky-300/18 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.08)_100%)]" />
            <div className="pointer-events-none absolute right-6 top-6 h-20 w-32 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/8" />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Espace administration</p>
                <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
                  {activeView === "listings" && "Moderation des annonces"}
                  {activeView === "visits" && "Gestion des visites immobilières"}
                  {activeView === "contracts" && "Contrats clients"}
                </h1>
                <p className="mt-2 text-sm text-sky-100">Supervision, validation et pilotage des publications en temps reel.</p>
              </div>
              <div className="relative z-10 flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate("/submit-listing")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:flex-none"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter annonce
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:flex-none"
                >
                  <LogOut className="h-4 w-4" />
                  Deconnexion
                </button>
              </div>
            </div>

          </div>

          <div className="lg:hidden">
            <div className="-mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2 px-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeView === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activeView === "dashboard" && false && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[16px] border border-amber-200/80 bg-amber-50/80 p-4 ring-1 ring-amber-100/70 shadow-[0_8px_16px_rgba(180,83,9,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">Urgences du jour</div>
                  <div className="mt-2 text-3xl font-bold text-amber-900">{dashboardInsights.pendingOlderThan24h + dashboardInsights.newVisitsOlderThan2h}</div>
                  <div className="mt-1 text-xs text-amber-800/80">Annonces en retard + prospects sans retour</div>
                </div>
                <div className="rounded-[16px] border border-emerald-200/80 bg-emerald-50/80 p-4 ring-1 ring-emerald-100/70 shadow-[0_8px_16px_rgba(5,150,105,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">SLA moderation</div>
                  <div className="mt-2 text-3xl font-bold text-emerald-900">{dashboardInsights.slaReviewRate.toFixed(1)}%</div>
                  <div className="mt-1 text-xs text-emerald-800/80">Annonces revues en moins de 24h</div>
                </div>
                <div className="rounded-[16px] border border-rose-200/80 bg-rose-50/80 p-4 ring-1 ring-rose-100/70 shadow-[0_8px_16px_rgba(190,24,93,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-700">Fuite conversion</div>
                  <div className="mt-2 text-3xl font-bold text-rose-900">{dashboardInsights.conversionLeakCount}</div>
                  <div className="mt-1 text-xs text-rose-800/80">Leads non transformés en visites planifiées</div>
                </div>
                <div className="rounded-[16px] border border-blue-200/80 bg-blue-50/80 p-4 ring-1 ring-blue-100/70 shadow-[0_8px_16px_rgba(37,99,235,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Charge 48h</div>
                  <div className="mt-2 text-3xl font-bold text-blue-900">{dashboardInsights.upcoming48h + metrics.pending}</div>
                  <div className="mt-1 text-xs text-blue-800/80">Visites planifiées + annonces encore en file</div>
                </div>
                <div className="rounded-[16px] border border-violet-200/80 bg-violet-50/80 p-4 ring-1 ring-violet-100/70 shadow-[0_8px_16px_rgba(109,40,217,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-700">Qualité fiches</div>
                  <div className="mt-2 text-3xl font-bold text-violet-900">{dashboardInsights.qualityAlerts}</div>
                  <div className="mt-1 text-xs text-violet-800/80">Annonces visibles avec médias insuffisants</div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[22px] border border-sky-200/80 bg-white/85 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Things to do</p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-950">Priorités opérationnelles</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/visits")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                    >
                      Ouvrir visites
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {dashboardInsights.todayTodo.length === 0 ? (
                      <article className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3.5">
                        <p className="text-sm font-semibold text-slate-900">Aucune action prioritaire pour le moment.</p>
                      </article>
                    ) : (
                      paginatedDashboardTodo.map((todo, index) => (
                        <article key={todo.id} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3.5 sm:col-span-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{(dashboardTodoPage - 1) * PAGE_SIZE + index + 1}. {todo.title}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                                todo.priority === "Critique"
                                  ? "bg-rose-100 text-rose-700"
                                  : todo.priority === "Moyen"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {todo.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{todo.detail}</p>
                          <button
                            type="button"
                            onClick={() => navigate(todo.route)}
                            className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                          >
                            Ouvrir
                          </button>
                        </article>
                      ))
                    )}
                  </div>

                  {dashboardInsights.todayTodo.length > PAGE_SIZE && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      <span>Page {dashboardTodoPage} / {totalDashboardTodoPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDashboardTodoPage((current) => Math.max(1, current - 1))}
                          disabled={dashboardTodoPage === 1}
                          className="rounded-lg border border-slate-200 px-2 py-1 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Precedent
                        </button>
                        <button
                          type="button"
                          onClick={() => setDashboardTodoPage((current) => Math.min(totalDashboardTodoPages, current + 1))}
                          disabled={dashboardTodoPage === totalDashboardTodoPages}
                          className="rounded-lg border border-slate-200 px-2 py-1 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => navigate("/submit-listing")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Publier une annonce
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/listings?status=pending")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      Traiter la file annonces
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/dashboard")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                    >
                      Rafraichir tableau de bord
                    </button>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="rounded-[22px] border border-sky-200/80 bg-white/85 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Opportunité chaude</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">Annonce la plus demandée sans visite calée</h3>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{dashboardInsights.bestOpportunity?.propertyTitle ?? "Aucune opportunité détectée"}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {dashboardInsights.bestOpportunity ? `${dashboardInsights.bestOpportunity.count} demandes actives` : "Toutes les annonces demandées ont une suite."}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-sky-200/80 bg-white/85 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Blocages à lever</p>
                    <div className="mt-3 space-y-2.5">
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Visites imminentes</p>
                        <p className="mt-1 text-lg font-bold text-rose-900">{dashboardInsights.upcoming24h}</p>
                        <p className="mt-1 text-[11px] text-rose-700/80">Dans les 24 prochaines heures</p>
                        <button
                          type="button"
                          onClick={() => navigate("/admin/visits?visitStatus=scheduled&visitSortBy=date&visitSortDirection=asc")}
                          className="mt-2 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Voir
                        </button>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Nouvelles demandes non traitées</p>
                        <p className="mt-1 text-lg font-bold text-amber-900">{dashboardInsights.newVisitsOlderThan2h}</p>
                        <button
                          type="button"
                          onClick={() => navigate("/admin/visits?visitStatus=new&visitSortBy=status&visitSortDirection=desc")}
                          className="mt-2 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          Voir
                        </button>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Pending {">"} 24h</p>
                        <p className="mt-1 text-lg font-bold text-blue-900">{dashboardInsights.pendingOlderThan24h}</p>
                        <button
                          type="button"
                          onClick={() => navigate("/admin/listings?status=pending")}
                          className="mt-2 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Voir
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeView === "listings" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Parc d'annonces</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{metrics.total}</div>
                <div className="mt-1 text-xs text-slate-500">Total inventaire modéré</div>
              </div>
              <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">En attente</div>
                <div className="mt-2 text-3xl font-bold text-amber-700">{metrics.pending}</div>
                <div className="mt-1 text-xs text-slate-500">{listingRates.pendingPct.toFixed(1)}% du total</div>
              </div>
              <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-600">Invisibles</div>
                <div className="mt-2 text-3xl font-bold text-rose-700">{metrics.rejected}</div>
                <div className="mt-1 text-xs text-slate-500">{listingRates.rejectedPct.toFixed(1)}% du total</div>
              </div>
              <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">Visibles</div>
                <div className="mt-2 text-3xl font-bold text-emerald-700">{metrics.approved}</div>
                <div className="mt-1 text-xs text-slate-500">{listingRates.approvedPct.toFixed(1)}% du total</div>
              </div>
              <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Mises en avant</div>
                <div className="mt-2 text-3xl font-bold text-blue-700">{metrics.featured}</div>
                <div className="mt-1 text-xs text-slate-500">{listingRates.featuredPct.toFixed(1)}% du total</div>
              </div>
            </div>
          )}

          {activeView === "dashboard" && (
            <div className="space-y-5">
            <section className="rounded-[22px] border border-sky-200/80 bg-white/85 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">KPIs trafic & conversion</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Performance du site - {visitsWindowLabel}</h2>
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                  {[
                    { key: "today", label: "Aujourd'hui" },
                    { key: "7d", label: "7 jours" },
                    { key: "30d", label: "30 jours" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setVisitsWindow(option.key as "today" | "7d" | "30d")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        visitsWindow === option.key
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Visites web</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.total}</div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Leads entrants</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.newCount}</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Taux de planification</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.schedulingRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Same-day schedule</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.sameDayRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Temps moyen</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.avgHoursToSchedule.toFixed(1)}h</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 xl:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Top annonce la plus vue</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{topViewedListing?.propertyTitle ?? "Aucune donnée"}</div>
                  <div className="mt-1 text-sm text-slate-600">{topViewedListing ? `${topViewedListing.count} vues qualifiées` : "Aucune visite enregistrée"}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Completion</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.completionRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Demandes refusées</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.rejectedCount}</div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
            <section style={{ animation: "adminFadeUp 0.55s ease both", animationDelay: "400ms" }} className="relative overflow-hidden rounded-[22px] border border-sky-200/60 bg-[linear-gradient(155deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.96)_100%)] p-5 shadow-[0_16px_34px_rgba(14,116,144,0.12)]">
              <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-sky-200/18 blur-3xl" />
              <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-200/10 blur-3xl" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Performance</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Trafic quotidien qualifié</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{visitsWindowLabel}</span>
              </div>
              <div className="mt-5 grid grid-cols-7 gap-3">
                {weeklySeries.map((point) => (
                  <div key={point.label} className="flex flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-end rounded-2xl bg-[linear-gradient(180deg,rgba(14,116,144,0.07)_0%,rgba(59,130,246,0.04)_100%)] px-2 pb-2">
                      <div
                        className="w-full rounded-xl bg-[linear-gradient(180deg,#7dd3fc_0%,#3b82f6_45%,#1d4ed8_100%)] shadow-[0_4px_10px_rgba(59,130,246,0.28)] transition-all"
                        style={{ height: `${Math.max(10, point.percent)}%` }}
                        title={`${point.value} visites`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{point.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <div style={{ animation: "adminFadeUp 0.55s ease both", animationDelay: "480ms" }} className="relative overflow-hidden rounded-[22px] border border-sky-200/60 bg-[linear-gradient(150deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.95)_100%)] p-5 shadow-[0_16px_34px_rgba(14,116,144,0.12)]">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-200/18 blur-3xl" />
                <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Repartition</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Entonnoir de conversion</h2>
                <div className="mt-5 flex items-center gap-5">
                  <div
                    className="h-32 w-32 rounded-full border-[10px] border-white shadow-inner"
                    style={{ background: donutGradient }}
                  />
                  <div className="space-y-2">
                    {visitStatusBreakdown.map((row) => (
                      <div key={row.key} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="font-medium">{row.label}</span>
                        <span className="text-slate-500">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ animation: "adminFadeUp 0.55s ease both", animationDelay: "560ms" }} className="relative overflow-hidden rounded-[22px] border border-sky-200/60 bg-[linear-gradient(150deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.95)_100%)] p-5 shadow-[0_16px_34px_rgba(14,116,144,0.12)]">
                <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-blue-200/12 blur-3xl" />
                <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Top annonces vues</p>
                <div className="mt-3 space-y-2.5">
                  {topRequestedListings.length === 0 && <p className="text-sm text-slate-500">Aucune donnée de vue pour le moment.</p>}
                  {topRequestedListings.map((item, index) => (
                    <div key={`${item.propertyId}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.88)_0%,rgba(255,255,255,0.97)_100%)] px-3 py-2.5 pl-4 shadow-[inset_3px_0_0_rgba(56,189,248,0.55)]">
                      <p className="text-sm font-semibold text-slate-900">{item.propertyTitle}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.count} visites qualifiées</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            </div>
            </div>
          )}

          {activeView === "listings" && (
            <section className="rounded-[22px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md sm:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">File de moderation</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Liste des annonces soumises</h3>
              </div>
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:w-auto">
                <div className="relative w-full sm:min-w-[290px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher bien, client ou ville"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-xs font-semibold text-slate-700 placeholder:font-medium placeholder:text-slate-400 focus:border-sky-300 focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | ListingSubmission["status"])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-sky-300 focus:outline-none"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Visibles</option>
                  <option value="rejected">Invisibles</option>
                </select>
                <button
                  type="button"
                  onClick={clearListingFilters}
                  disabled={!hasListingFiltersApplied}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Effacer filtres
                </button>
              </div>
            </div>

            {actionError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                {actionError}
              </div>
            )}

            {selectedListingIds.length > 0 && (
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedListingIds.length} annonce(s) sélectionnée(s)
                  </p>
                  <p className="text-xs text-slate-500">Appliquez une action groupée à la sélection actuelle.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkStatusUpdate("approved")}
                    disabled={isBulkProcessing || !canBulkApprove}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    Rendre visibles
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatusUpdate("rejected")}
                    disabled={isBulkProcessing || !canBulkReject}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                  >
                    Rendre invisibles
                  </button>
                  {canBulkSetPending && (
                    <button
                      type="button"
                      onClick={() => handleBulkStatusUpdate("pending")}
                      disabled={isBulkProcessing}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remettre en attente
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBulkDeleteSelected}
                    disabled={isBulkProcessing}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                  >
                    Supprimer la sélection
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedListings}
                    disabled={isBulkProcessing}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Effacer la sélection
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 overflow-x-auto overflow-y-visible rounded-2xl border border-slate-200">
              <table className="min-w-[760px] w-full border-collapse bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="w-12 px-4 py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={areAllListingsOnPageSelected}
                        onChange={toggleSelectAllListingsOnPage}
                        disabled={paginatedListings.length === 0 || isBulkProcessing}
                        aria-label="Sélectionner toutes les annonces de la page"
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Annonce</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Prix</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPublished && allItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        Chargement des annonces...
                      </td>
                    </tr>
                  )}
                  {!loadingPublished && publishError && allItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-rose-600">
                        {publishError}
                      </td>
                    </tr>
                  )}
                  {!loadingPublished && !publishError && filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        {allItems.length === 0 ? "Aucune annonce pour le moment." : "Aucun resultat avec les filtres actuels."}
                      </td>
                    </tr>
                  )}
                  {paginatedListings.map((item) => {
                    const isDbExisting = item.id.startsWith("db-");
                    const isBusy = processingId === item.id;
                    const canEdit = true;
                    const canApprove = item.status !== "approved";
                    const canReject = item.status !== "rejected";
                    const canSetPending = !isDbExisting && item.status !== "pending";
                    const canToggleFeatured = item.status === "approved";
                    const canDelete = true;
                    const isSelected = selectedListingIds.includes(item.id);

                    return (
                      <tr key={item.id} className={`border-t border-slate-100 align-top transition ${isSelected ? "bg-sky-50/60" : "bg-white"}`}>
                        <td className="px-4 py-3.5 align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleListingSelection(item.id)}
                            disabled={isBulkProcessing || isBusy}
                            aria-label={`Sélectionner l'annonce ${item.title}`}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.location} - {item.propertyType}</p>
                          {item.featured && (
                            <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Mise en avant</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800">{item.fullName}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${statusChip[item.status]}`}>
                            {statusLabel[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{item.price.toLocaleString("fr-TN")} TND</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(item.reviewedAt ?? item.createdAt)}</td>
                        <td className="relative px-4 py-3.5" data-action-menu-root>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setActionMenuId((current) => (current === item.id ? null : item.id))}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>

                          {actionMenuId === item.id && (
                            <div className="absolute right-0 top-10 z-[9999] w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    navigate(`/admin/listings/${encodeURIComponent(item.id)}/edit`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                                >
                                  <Eye className="h-4 w-4 text-sky-600" />
                                  Modifier la fiche
                                </button>
                              )}

                              {canApprove && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    updateStatus(item.id, "approved");
                                  }}
                                  disabled={isBusy}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                  {isBusy ? "Traitement..." : item.status === "rejected" ? "Republier" : "Accepter"}
                                </button>
                              )}

                              {canReject && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    updateStatus(item.id, "rejected");
                                  }}
                                  disabled={isBusy}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                  {item.status === "approved" ? "Inactiver" : "Rejeter"}
                                </button>
                              )}

                              {canSetPending && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    updateStatus(item.id, "pending");
                                  }}
                                  disabled={isBusy}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                                  Remettre en attente
                                </button>
                              )}

                              {canToggleFeatured && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    toggleFeatured(item.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                  {item.featured ? "Retirer de la mise en avant" : "Mettre en avant"}
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    handleDelete(item);
                                  }}
                                  disabled={isBusy}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                  Supprimer definitivement
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredItems.length > PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <span>Page {listingsPage} / {totalListingsPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setListingsPage((current) => Math.max(1, current - 1))}
                      disabled={listingsPage === 1}
                      className="rounded-lg border border-slate-200 px-2 py-1 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Precedent
                    </button>
                    <button
                      type="button"
                      onClick={() => setListingsPage((current) => Math.min(totalListingsPages, current + 1))}
                      disabled={listingsPage === totalListingsPages}
                      className="rounded-lg border border-slate-200 px-2 py-1 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </div>
            </section>
          )}

          {activeView === "visits" && (
            <>
              {/* Visits Overview Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Demandes totales</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{visitsKpis.total}</div>
                </div>
                <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600">Nouvelles demandes</div>
                  <div className="mt-2 text-3xl font-bold text-amber-700">{visitsKpis.newCount}</div>
                </div>
                <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Programmées</div>
                  <div className="mt-2 text-3xl font-bold text-blue-700">{visitsKpis.scheduledCount}</div>
                </div>
                <div className="rounded-[16px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_8px_16px_rgba(14,116,144,0.08)] backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">Complétées</div>
                  <div className="mt-2 text-3xl font-bold text-emerald-700">{visitsKpis.completedCount}</div>
                </div>
              </div>

              {/* Visits Table */}
              <div className="rounded-[22px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md sm:p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Demandes de visite</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">Gestion des visites immobilières</h3>
                  </div>
                  <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:w-auto">
                    <div className="relative" ref={visitSortPanelRef}>
                      <button
                        type="button"
                        onClick={() => setIsVisitSortPanelOpen((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                      >
                        Trier & Filtrer
                        <span className="text-[10px] text-slate-500">{isVisitSortPanelOpen ? "▲" : "▼"}</span>
                      </button>

                      {isVisitSortPanelOpen && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_34px_rgba(14,116,144,0.14)]">
                          <div className="grid gap-2 md:grid-cols-2">
                            <select
                              value={visitSortBy}
                              onChange={(e) => setVisitSortBy(e.target.value as "date" | "status" | "property")}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-sky-300 focus:outline-none"
                            >
                              <option value="date">Trier par date</option>
                              <option value="status">Trier par statut</option>
                              <option value="property">Trier par propriété</option>
                            </select>

                            <select
                              value={visitSortDirection}
                              onChange={(e) => setVisitSortDirection(e.target.value as "asc" | "desc")}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-sky-300 focus:outline-none"
                            >
                              <option value="desc">Ordre décroissant</option>
                              <option value="asc">Ordre croissant</option>
                            </select>

                            <select
                              value={visitStatusFilter}
                              onChange={(e) => setVisitStatusFilter(e.target.value)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-sky-300 focus:outline-none"
                            >
                              <option value="all">Tous les statuts</option>
                              <option value="new">Nouvelle demande</option>
                              <option value="scheduled">Programmée</option>
                              <option value="completed">Complétée</option>
                              <option value="rejected">Annulée</option>
                            </select>

                            <input
                              type="text"
                              value={visitPropertyQuery}
                              onChange={(e) => setVisitPropertyQuery(e.target.value)}
                              placeholder="Rechercher propriété (nom ou ID)"
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 placeholder:font-medium placeholder:text-slate-400 focus:border-sky-300 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {visitsLoading && <div className="text-sm text-slate-500">Chargement...</div>}
                    <button
                      type="button"
                      onClick={clearVisitFilters}
                      disabled={!hasVisitFiltersApplied}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Effacer filtres
                    </button>
                  </div>
                </div>

                {visitsError && (
                  <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-200">
                    {visitsError}
                  </div>
                )}

                <div className="mt-4 overflow-visible rounded-2xl border border-slate-200">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full border-collapse bg-white text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Visiteur</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Propriété</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Statut</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Date programmée</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Contact</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedVisits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                            {visits.length === 0
                              ? "Aucune demande de visite pour le moment."
                              : "Aucun résultat avec les filtres actuels."}
                          </td>
                        </tr>
                      ) : (
                        paginatedVisits.map((visit: any) => (
                          <tr key={visit.id} className="border-t border-slate-100 align-top">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-medium text-slate-900">{visit.visitor_name}</span>
                              <span className="ml-2 text-xs text-slate-500">{visit.visitor_email}</span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{visit.property_title}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold border ${VISIT_STATUS_COLORS[visit.visit_status] || "bg-slate-100 text-slate-700"}`}>
                                {VISIT_STATUS_LABELS[visit.visit_status] || visit.visit_status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                              {formatVisitDateTime(visit.scheduled_date, visit.scheduled_time)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(visit.visitor_phone).catch(() => {});
                                  setCopiedPhoneVisitId(visit.id);
                                  window.setTimeout(() => {
                                    setCopiedPhoneVisitId((current) => (current === visit.id ? null : current));
                                  }, 1200);
                                }}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white transition ${
                                  copiedPhoneVisitId === visit.id
                                    ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                    : "border-slate-300 text-sky-600 hover:border-sky-300 hover:bg-sky-50"
                                }`}
                                aria-label="Copier le numéro"
                                title={copiedPhoneVisitId === visit.id ? "Numéro copié" : "Copier le numéro"}
                              >
                                {copiedPhoneVisitId === visit.id ? <Check className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="relative px-4 py-3.5 whitespace-nowrap" data-visit-action-menu-root>
                              <button
                                type="button"
                                onClick={() => setVisitActionMenuId((current) => (current === visit.id ? null : visit.id))}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                                aria-label="Actions visite"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {visitActionMenuId === visit.id && (
                                <div className="absolute right-0 top-10 z-[9999] w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                                  {visit.visit_status === "new" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVisitActionMenuId(null);
                                        openPlanningModal(visit);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                                    >
                                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                      Accepter
                                    </button>
                                  )}

                                  {visit.visit_status === "scheduled" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVisitActionMenuId(null);
                                        openPlanningModal(visit);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                    >
                                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                      Replanifier
                                    </button>
                                  )}

                                  {(visit.visit_status === "new" || visit.visit_status === "scheduled") && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVisitActionMenuId(null);
                                        handleCancelVisit(visit.id);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                    >
                                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                      Annuler
                                    </button>
                                  )}

                                  {(visit.visit_status === "completed" || visit.visit_status === "rejected") && (
                                    <p className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500">
                                      Aucune action disponible
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {displayedVisits.length > PAGE_SIZE && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    <span>Page {visitsPage} / {totalVisitsPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisitsPage((current) => Math.max(1, current - 1))}
                        disabled={visitsPage === 1}
                        className="rounded-lg border border-slate-200 px-2 py-1 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Precedent
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisitsPage((current) => Math.min(totalVisitsPages, current + 1))}
                        disabled={visitsPage === totalVisitsPages}
                        className="rounded-lg border border-slate-200 px-2 py-1 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Status Distribution */}
              {visitsAnalytics && visitsAnalytics.byStatus && visitsAnalytics.byStatus.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-sky-200/80 bg-white/80 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 mb-4">Répartition par statut</p>
                    <div className="space-y-2">
                      {visitsAnalytics.byStatus.map((status: any) => (
                        <div key={status.visit_status} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            {VISIT_STATUS_LABELS[status.visit_status] || status.visit_status}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 rounded-full h-2">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{
                                  width: `${Math.max(10, (status.count / Math.max(1, visits.length)) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 w-8 text-right">{status.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Properties */}
                  {visitsAnalytics.byProperty && visitsAnalytics.byProperty.length > 0 && (
                    <div className="rounded-[22px] border border-sky-200/80 bg-white/80 p-5 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 mb-4">Top propriétés</p>
                      <div className="space-y-2">
                        {visitsAnalytics.byProperty.slice(0, 5).map((prop: any) => (
                          <div key={prop.property_id} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 truncate flex-1">{prop.property_title}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{
                                    width: `${Math.max(10, (prop.count / Math.max(1, visitsAnalytics.byProperty[0]?.count || 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="font-bold text-slate-900 w-8 text-right">{prop.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Visit Modal */}
              {editingVisit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                  <div className="rounded-[22px] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-md w-full border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">
                      {editingVisit.visit_status === "new" ? "Accepter et planifier la visite" : "Replanifier la visite"}
                    </h2>

                    <div className="space-y-4">
                      {visitFormError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                          {visitFormError}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Visiteur</label>
                        <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{editingVisit.visitor_name}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Propriété</label>
                        <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{editingVisit.property_title}</div>
                      </div>

                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
                          Date de visite <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="date"
                          type="date"
                          value={editFormData.date}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, date: e.target.value });
                            setVisitFieldErrors((current) => ({ ...current, date: "" }));
                            setVisitFormError("");
                          }}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${visitFieldErrors.date ? "border-rose-400 focus:ring-rose-200" : "border-slate-300 focus:ring-blue-500"}`}
                        />
                        {visitFieldErrors.date && <p className="mt-1 text-xs font-semibold text-rose-600">{visitFieldErrors.date}</p>}
                      </div>

                      <div>
                        <label htmlFor="time" className="block text-sm font-medium text-slate-700 mb-1">
                          Heure de visite <span className="text-rose-600">*</span>
                        </label>
                        <select
                          id="time"
                          value={editFormData.time}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, time: e.target.value });
                            setVisitFieldErrors((current) => ({ ...current, time: "" }));
                            setVisitFormError("");
                          }}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${visitFieldErrors.time ? "border-rose-400 focus:ring-rose-200" : "border-slate-300 focus:ring-blue-500"}`}
                        >
                          <option value="">Choisir une heure</option>
                          {halfHourTimeOptions.map((timeOption) => (
                            <option key={timeOption} value={timeOption}>
                              {timeOption}
                            </option>
                          ))}
                        </select>
                        {visitFieldErrors.time && <p className="mt-1 text-xs font-semibold text-rose-600">{visitFieldErrors.time}</p>}
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                          placeholder="Notes internes..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>

                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-rose-600">* Champs obligatoires.</span> La visite passe automatiquement au statut <strong>Programmée</strong> après enregistrement.
                      </p>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVisit(null);
                          setEditFormData({ status: "new", date: "", time: "", notes: "" });
                          setVisitFormError("");
                          setVisitFieldErrors({ date: "", time: "" });
                        }}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleVisitUpdate}
                        className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition"
                      >
                        {editingVisit.visit_status === "new" ? "Accepter" : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeView === "contracts" && (
            <section className="rounded-[22px] border border-sky-200/80 bg-white/80 p-4 ring-1 ring-sky-100/70 shadow-[0_16px_34px_rgba(14,116,144,0.12)] backdrop-blur-md sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Contrats clients</p>

              <div className="mt-4 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">Modeles de contrats</h3>
                  <p className="mt-1 text-sm text-slate-600">Telechargez un modele PDF en arabe pour vente ou location.</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => downloadContractTemplate("vente")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                    >
                      <Download className="h-4 w-4" />
                      Modele PDF vente
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadContractTemplate("location")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                    >
                      <Download className="h-4 w-4" />
                      Modele PDF location
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-slate-600">
                    Les contrats clients sont disponibles uniquement apres une visite marquee comme <strong>completee</strong>.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-700" />
                    <h3 className="text-lg font-semibold text-slate-900">Creer un contrat client (PDF arabe)</h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Visite completee <span className="text-rose-600">*</span></label>
                      <select
                        value={selectedCompletedVisitId}
                        onChange={(event) => setSelectedCompletedVisitId(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      >
                        <option value="">Selectionner une visite completee</option>
                        {completedVisits.map((visit) => (
                          <option key={visit.id} value={String(visit.id)}>
                            #{visit.id} - {visit.visitor_name} - {visit.property_title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Type de contrat <span className="text-rose-600">*</span></label>
                      <select
                        value={contractType}
                        onChange={(event) => {
                          setContractType(event.target.value as "vente" | "location");
                          setContractError("");
                          setContractSuccess("");
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      >
                        <option value="vente">Vente</option>
                        <option value="location">Location</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Montant (TND) <span className="text-rose-600">*</span></label>
                      <input
                        type="text"
                        value={contractAmount}
                        onChange={(event) => setContractAmount(event.target.value)}
                        placeholder="Ex: 850000"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {contractType === "location" && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Periode de location <span className="text-rose-600">*</span></label>
                        <input
                          type="text"
                          value={contractRentPeriod}
                          onChange={(event) => setContractRentPeriod(event.target.value)}
                          placeholder="Ex: 12 mois"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Client <span className="text-rose-600">*</span></label>
                      <input
                        type="text"
                        value={contractCustomerName}
                        onChange={(event) => setContractCustomerName(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Proprietaire <span className="text-rose-600">*</span></label>
                      <input
                        type="text"
                        value={contractOwnerName}
                        onChange={(event) => setContractOwnerName(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse / designation du bien <span className="text-rose-600">*</span></label>
                      <input
                        type="text"
                        value={contractAddress}
                        onChange={(event) => setContractAddress(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Notes (optionnel)</label>
                      <textarea
                        value={contractNotes}
                        onChange={(event) => setContractNotes(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {contractError && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                      {contractError}
                    </div>
                  )}

                  {contractSuccess && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      {contractSuccess}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={createCustomerContract}
                      className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      <FileText className="h-4 w-4" />
                      Generer le contrat PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-rose-600">*</span> Champs obligatoires.
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
