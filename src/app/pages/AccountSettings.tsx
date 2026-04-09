import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Settings2 } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { supabase } from "../../lib/supabase";

export default function AccountSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);
    };

    fetchUser();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-slate-900">
            <Settings2 className="h-5 w-5 text-sky-600" />
            <h1 className="text-2xl font-semibold">Parametres du compte</h1>
          </div>

          {user ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Email</p>
                <p className="mt-1 font-medium text-slate-900">{user.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Nom</p>
                <p className="mt-1 font-medium text-slate-900">{user.user_metadata?.full_name || user.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Provider</p>
                <p className="mt-1 font-medium text-slate-900">{user.app_metadata?.provider || "email"}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">Chargement...</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
