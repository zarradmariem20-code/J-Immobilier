import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../lib/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export default function Notifications() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  const loadNotifications = async (email: string) => {
    if (!email) return;

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("*")
      .ilike("recipient_email", email)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Impossible de charger vos notifications pour le moment.");
      return;
    }

    setItems(data ?? []);
    setError("");
  };

  const markAsRead = async (id: number) => {
    const previous = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updateError) {
      setItems(previous);
      setError("Impossible de mettre à jour la notification.");
    }
  };

  const markAllAsRead = async () => {
    if (!userEmail || unreadCount === 0) return;

    const previous = items;
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .ilike("recipient_email", userEmail)
      .eq("is_read", false);

    if (updateError) {
      setItems(previous);
      setError("Impossible de marquer toutes les notifications comme lues.");
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        navigate("/login");
        return;
      }

      setUserEmail(user.email);
      await loadNotifications(user.email);
      setLoading(false);
    };

    initialize();
  }, [navigate]);

  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase
      .channel(`user-notifications-${userEmail}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadNotifications(userEmail),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Bell className="h-5 w-5 text-sky-600" />
              <h1 className="text-2xl font-semibold">Centre de notifications</h1>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadNotifications(userEmail)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Actualiser
              </button>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer lu
              </button>
            </div>
          </div>

          {loading ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Chargement des notifications...
            </p>
          ) : error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Aucune notification pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    item.is_read
                      ? "border-slate-200 bg-slate-50"
                      : "border-sky-200 bg-sky-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(item.id)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                        >
                          Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
