import { useEffect, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { getSavedInquiries, type SavedInquiry } from "../utils/storage";
import { supabase } from "../../lib/supabase";

export default function Messages() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<SavedInquiry[]>([]);

  useEffect(() => {
    const ensureAuthAndLoad = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setInquiries(getSavedInquiries());
    };

    ensureAuthAndLoad();

    const sync = () => setInquiries(getSavedInquiries());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-slate-900">
            <MessageCircleMore className="h-5 w-5 text-sky-600" />
            <h1 className="text-2xl font-semibold">Messages</h1>
          </div>

          {inquiries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Aucun message enregistre pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {inquiries.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.propertyTitle || "Annonce"}</p>
                    <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{item.fullName} · {item.email} · {item.phone}</p>
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
