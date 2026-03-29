import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, Plus, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { LoginModal } from "./LoginModal.tsx";
import { clearAuthSession, getAuthProfile, isUserLoggedIn, type AuthProfile } from "../utils/storage";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login">("login");
  const [isScrolled, setIsScrolled] = useState(false);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const handleAddListingClick = () => {
    if (authProfile) {
      navigate("/submit-listing");
      return;
    }

    setPendingRedirect("/submit-listing");
    setModalMode("login");
    setLoginModalOpen(true);
  };

  useEffect(() => {
    const handleOpenAuthModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: "login"; redirectTo?: string }>;
      setModalMode(customEvent.detail?.mode ?? "login");
      setPendingRedirect(customEvent.detail?.redirectTo ?? null);
      setLoginModalOpen(true);
    };

    window.addEventListener("open-auth-modal", handleOpenAuthModal);
    return () => window.removeEventListener("open-auth-modal", handleOpenAuthModal);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      setAuthProfile(isUserLoggedIn() ? getAuthProfile() : null);
    };

    syncAuth();
    window.addEventListener("auth-state-changed", syncAuth);
    return () => window.removeEventListener("auth-state-changed", syncAuth);
  }, []);

  useEffect(() => {
    if (!authProfile || !pendingRedirect) {
      return;
    }

    setLoginModalOpen(false);
    navigate(pendingRedirect);
    setPendingRedirect(null);
  }, [authProfile, navigate, pendingRedirect]);

  const isActive = (path: string) => location.pathname === path;
  const isHomePage = location.pathname === "/";

  const navLinks = [
    { path: "/", label: "Accueil" },
    { path: "/listings", label: "Annonces" },
    { path: "/about", label: "À Propos" },
    { path: "/contact", label: "Contact" },
  ];
  const userInitials = authProfile?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JI";
  return (
    <>
      <header
        style={{ zoom: "110%" }}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-sky-100/70 bg-[linear-gradient(180deg,rgba(219,234,254,0.72)_0%,rgba(239,246,255,0.46)_100%)] backdrop-blur-xl supports-[backdrop-filter]:bg-sky-50/45"
            : "border-b border-transparent bg-transparent backdrop-blur-0"
        }`}
      >
        <div className={isHomePage ? "max-w-7xl mx-auto px-0 sm:px-2 lg:px-4" : "mx-auto max-w-7xl px-2 sm:px-4 lg:px-6"}>
          <div className={isHomePage ? "grid min-h-10 grid-cols-[auto_1fr_auto] items-center gap-3 py-0" : "grid min-h-[78px] grid-cols-[auto_1fr_auto] items-center gap-4 py-2"}>
            <div className={isHomePage ? "-ml-5 sm:-ml-7 lg:-ml-8" : "-ml-3 sm:-ml-4 lg:-ml-5"}>
              <BrandLogo compact={false} />
            </div>

            <div className="hidden justify-center lg:flex">
              <nav className={`flex flex-nowrap items-center gap-2 rounded-full border border-sky-100/80 bg-white/60 shadow-sm whitespace-nowrap ${isHomePage ? "px-3 py-1" : "px-4 py-2"}`}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-full text-sm font-medium transition-all ${isHomePage ? "px-4 py-1" : "px-5 py-2"} ${
                    isActive(link.path)
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              </nav>
            </div>

            <div className="hidden items-center justify-end gap-2 md:flex">
              <button
                type="button"
                onClick={handleAddListingClick}
                className={`inline-flex items-center gap-2 rounded-full border border-slate-300 bg-transparent text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 ${isHomePage ? "px-4 py-1" : "px-5 py-2"}`}
              >
                <Plus className="h-4 w-4" />
                Ajouter mon annonce
              </button>
              {authProfile ? (
                <>
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-sm">
                    {userInitials}
                  </div>
                  <button
                    onClick={() => clearAuthSession()}
                    className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 ${isHomePage ? "px-3 py-1" : "px-4 py-2"}`}
                  >
                    <LogOut className="h-4 w-4" />
                    Deconnexion
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setPendingRedirect(null);
                    setModalMode("login");
                    setLoginModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border border-sky-100/80 bg-white/60 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-200 hover:text-sky-700 cursor-pointer ${isHomePage ? "px-4 py-1" : "px-5 py-2"}`}
                >
                  <UserRound className="h-4 w-4" />
                  Se connecter
                </button>
              )}
            </div>

            <button
              className="rounded-full border border-slate-200 p-2 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200/80 bg-white/95 md:hidden">
            <nav className="flex flex-col px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-2xl px-4 py-3 transition-colors ${
                    isActive(link.path)
                      ? "bg-slate-950 text-white"
                      : "text-slate-700"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAddListingClick();
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-transparent px-4 py-3 font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter mon annonce
              </button>
              {authProfile ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex justify-center">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                      {userInitials}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      clearAuthSession();
                      setMobileMenuOpen(false);
                    }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Deconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPendingRedirect(null);
                    setModalMode("login");
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 cursor-pointer"
                >
                  <UserRound className="h-4 w-4" />
                  Se connecter
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      <LoginModal
        isOpen={loginModalOpen}
        initialMode={modalMode}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
