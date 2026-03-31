import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { supabase } from "../../lib/supabase";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { LoginModal } from "../components/LoginModal";

export default function LoginPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Removed automatic redirect after login. Stay on the same screen.

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f8fbff] to-[#f3f6fb]">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <LoginModal isOpen={open} onClose={() => setOpen(false)} />
      </main>
      <Footer />
    </div>
  );
}
