
import { Link, useLocation, useNavigate } from "react-router";
import { Bell, Building2, ChevronDown, Heart, Languages, LogOut, Menu, MessageCircle, Plus, Settings, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { LoginModal } from "./LoginModal.tsx";
import { clearAuthSession } from "../utils/storage";
import { supabase } from "../../lib/supabase";
import { getPublicSiteSettings } from "../../lib/api";
import facebookLogo from "../../assets/Facebook_Logo.png";
import instagramLogo from "../../assets/insta.avif";
import tiktokLogo from "../../assets/tiktok-.webp";

// Module-level cache so re-mounting Header on navigation never flashes
let _cachedUser: any = null;
let _authInitialized = false;

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login">("login");
  const [isScrolled, setIsScrolled] = useState(false);
  const [authProfile, setAuthProfile] = useState<any>(() => _cachedUser);
  const [authReady, setAuthReady] = useState(() => _authInitialized);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const pendingRedirectRef = useRef<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [announcementItems, setAnnouncementItems] = useState<string[]>([
    "Nous publions votre bien sur Facebook, Instagram et TikTok",
    "Marketing réseaux sociaux 100% gratuit pour votre annonce",
    "Visibilité renforcée dès la mise en ligne",
  ]);

  useEffect(() => {
    getPublicSiteSettings().then((s) => {
      if (s.announcementItems?.length) setAnnouncementItems(s.announcementItems);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unlockBodyScroll = () => {
      if (typeof document !== "undefined" && document.body.style.overflow === "hidden") {
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("focus", unlockBodyScroll);
    window.addEventListener("pageshow", unlockBodyScroll);

    return () => {
      window.removeEventListener("focus", unlockBodyScroll);
      window.removeEventListener("pageshow", unlockBodyScroll);
    };
  }, []);

  useEffect(() => {
    pendingRedirectRef.current = pendingRedirect;
  }, [pendingRedirect]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearAuthSession();
    _cachedUser = null;
    setAuthProfile(null);
    navigate("/");
  };

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
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        _cachedUser = user;
        _authInitialized = true;
        setAuthProfile(user);
        // If just logged in via modal and a redirect is pending, just close modal and clear redirect (no navigation)
        if (user && pendingRedirectRef.current) {
          setPendingRedirect(null);
          setLoginModalOpen(false);
        }
      } finally {
        _authInitialized = true;
        setAuthReady(true);
      }
    };

    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      _cachedUser = user;
      _authInitialized = true;
      setAuthProfile(user);
      setAuthReady(true);
      if (user && pendingRedirectRef.current) {
        setPendingRedirect(null);
        setLoginModalOpen(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Removed effect that auto-navigates after login. Now, after login, user stays on the same screen.

  const isActive = (path: string) => {
    const cleanPath = path.split("?")[0];
    if (cleanPath === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(cleanPath);
  };
  const navLinks = [
    { path: "/listings", label: "Annonces", icon: Building2 },
    { path: "/contact", label: "Contactez nous", icon: MessageCircle },
  ];
  const userName = authProfile?.user_metadata?.full_name || authProfile?.phone || authProfile?.email || "Utilisateur";
  const userInitials = userName
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JI";
  const avatarUrl = authProfile?.user_metadata?.avatar_url || null;

  const userMenuItems = [
    { label: "Notifications", path: "/account/notifications", icon: Bell },
    { label: "Favoris", path: "/favorites", icon: Heart },
    { label: "Messages", path: "/messages", icon: MessageCircle },
    { label: "Profils", path: "/account", icon: UserRound },
    { type: "divider" as const },
    { label: "Parametres du compte", path: "/account/settings", icon: Settings },
    { label: "Langue", path: "/account/language", icon: Languages },
  ];

  const handleMenuSignOut = async () => {
    await handleSignOut();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <style>{`
        @keyframes headerAnnouncementLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes headerBarShimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
      <div className="sticky top-0 z-50">
        {/* Announcement bar */}
        <section
          className="relative overflow-hidden border-b border-white/10 py-2"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background: "linear-gradient(105deg, transparent 30%, rgba(99,179,237,0.45) 50%, transparent 70%)",
              backgroundSize: "800px 100%",
              animation: "headerBarShimmer 4s linear infinite",
            }}
          />
          <div className="overflow-hidden">
            <div className="flex w-max whitespace-nowrap">
              {[0, 1].map((trackIdx) => (
                <div
                  key={trackIdx}
                  className="flex shrink-0 items-center"
                  style={{ animation: "headerAnnouncementLoop 28s linear infinite" }}
                  aria-hidden={trackIdx === 1 ? "true" : undefined}
                >
                  {announcementItems.map((message, index) => (
                    <span
                      key={`${trackIdx}-${index}`}
                      className="inline-flex items-center gap-2.5 px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-white sm:text-[11.5px]"
                    >
                      {index === 0 && (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <img src={facebookLogo} alt="" className="h-3 w-3 rounded-sm object-cover sm:h-3.5 sm:w-3.5" />
                          <img src={instagramLogo} alt="" className="h-3 w-3 rounded-sm object-cover sm:h-3.5 sm:w-3.5" />
                          <img src={tiktokLogo} alt="" className="h-3 w-3 rounded-sm object-cover sm:h-3.5 sm:w-3.5" />
                        </span>
                      )}
                      {index !== 0 && (
                        <span
                          className="inline-block h-1 w-1 rounded-full"
                          style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)" }}
                        />
                      )}
                      <span style={{ background: "linear-gradient(90deg, #e2e8f0, #bae6fd, #e2e8f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {message}
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <header
          className={`border-b border-slate-200 border-t-2 border-t-[#1f5f96] bg-white/95 backdrop-blur-xl transition-all duration-300 ${
            isScrolled ? "shadow-[0_8px_30px_rgba(15,23,42,0.08)]" : "shadow-none"
          }`}
        >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex min-h-[60px] items-center gap-3 sm:min-h-[72px] sm:gap-6">
            <div className="min-w-0 flex-shrink">
              <BrandLogo compact={false} />
            </div>

            <div className="hidden flex-1 items-center justify-end lg:flex">
              <nav className="flex items-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={handleAddListingClick}
                  className="inline-flex items-center gap-2 rounded-full border border-[#1f5f96] bg-[#eef5fb] px-4 py-2 text-sm font-semibold text-[#1f5f96] transition hover:bg-[#1f5f96] hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Publier
                </button>

                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      to={link.path}
                      className={`ml-6 inline-flex items-center gap-2 text-[15px] font-medium transition-colors ${
                        isActive(link.path) ? "text-[#1f5f96]" : "text-slate-600 hover:text-[#1f5f96]"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-[#1f5f96]" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}

                {authReady ? (authProfile ? (
                  <div className="relative ml-10" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-[15px] font-medium text-slate-600 transition hover:text-[#1f5f96]"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-slate-300" />
                    ) : (
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#eef5fb] text-[#1f5f96]">
                        <UserRound className="h-4 w-4" />
                      </div>
                    )}
                    <span className="max-w-[120px] truncate">{userName}</span>
                    <ChevronDown className={`h-4 w-4 transition ${userMenuOpen ? "rotate-180" : "rotate-0"}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
                      {userMenuItems.map((item, index) => {
                        if ("type" in item && item.type === "divider") {
                          return <div key={`divider-${index}`} className="my-2 h-px bg-slate-200" />;
                        }

                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => {
                              navigate(item.path);
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </button>
                        );
                      })}

                      <div className="my-2 h-px bg-slate-200" />
                      <button
                        type="button"
                        onClick={handleMenuSignOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Deconnexion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPendingRedirect(null);
                    setModalMode("login");
                    setLoginModalOpen(true);
                  }}
                  className="ml-10 inline-flex items-center gap-2 text-[15px] font-medium text-slate-600 transition hover:text-[#1f5f96] cursor-pointer"
                >
                  <UserRound className="h-4 w-4 text-[#1f5f96]" />
                  Se connecter
                </button>
              )) : (
                <div className="ml-10 h-8 w-[124px]" aria-hidden="true" />
              )}
              </nav>
            </div>

            <button
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#8db1d2] bg-[#eef5fb] p-0 text-[#1f5f96] shadow-sm sm:h-11 sm:w-11 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200/80 bg-white/95 md:hidden">
            <nav className="flex flex-col px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.path}`}
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

              {authReady ? (authProfile ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                      {userInitials}
                    </div>
                    <p className="max-w-[220px] truncate text-sm font-semibold text-slate-900">{userName}</p>
                  </div>

                  {userMenuItems.map((item, index) => {
                    if ("type" in item && item.type === "divider") {
                      return <div key={`mobile-divider-${index}`} className="my-2 h-px bg-slate-200" />;
                    }

                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => {
                          navigate(item.path);
                          setMobileMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}

                  <div className="my-2 h-px bg-slate-200" />
                  <button
                    onClick={handleMenuSignOut}
                    className="w-full inline-flex items-center justify-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
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
              )) : (
                <div className="mt-3 h-11 w-full rounded-2xl border border-transparent" aria-hidden="true" />
              )}
            </nav>
          </div>
        )}
      </header>
      </div>
      <LoginModal
        isOpen={loginModalOpen}
        initialMode={modalMode}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
