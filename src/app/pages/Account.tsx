import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function Account() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
      } else {
        setUser(user);
      }
    };
    fetchUser();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 mt-12 mb-12 border border-slate-100">
          <h1 className="text-2xl font-bold mb-6 text-slate-900">Mon compte</h1>
          {user ? (
            <div className="space-y-3">
              {user.user_metadata?.avatar_url && (
                <div className="flex justify-center mb-4">
                  <img src={user.user_metadata.avatar_url} alt="avatar" className="h-20 w-20 rounded-full border border-slate-200 object-cover" />
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-700">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Nom:</span> {user.user_metadata?.full_name || user.email}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Provider:</span> {user.app_metadata?.provider}
              </div>
            </div>
          ) : (
            <p>Chargement des informations...</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
