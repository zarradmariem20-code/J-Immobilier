import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Facebook, RefreshCw, X } from "lucide-react";
import { getAuthProfile, isUserLoggedIn, setAuthSession, type AuthProfile } from "../utils/storage";
import { supabase } from "../../lib/supabase";

interface LoginModalProps {
  isOpen: boolean;
  initialMode?: "login" | "listing";
  onClose: () => void;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function deriveNameFromEmail(value: string) {
  const localPart = value.split("@")[0] || "Utilisateur";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(" ") || "Utilisateur";
}

function getProvider(user: any): "email" | "google" | "facebook" {
  const provider = user?.app_metadata?.provider;
  const providers = user?.app_metadata?.providers;

  if (provider === "google" || (Array.isArray(providers) && providers.includes("google"))) {
    return "google";
  }

  if (provider === "facebook" || (Array.isArray(providers) && providers.includes("facebook"))) {
    return "facebook";
  }

  return "email";
}

function getDisplayName(user: any, fallbackEmail: string) {
  return user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email
    || fallbackEmail
    || "Utilisateur";
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [email, setEmail] = useState("");
  const [otpStep, setOtpStep] = useState<"identifier" | "otp">("identifier");
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [providerAvailability, setProviderAvailability] = useState({
    google: true,
    facebook: true,
  });

  const resetForm = () => {
    setEmail("");
    setOtpStep("identifier");
    setOtpCode("");
    setAuthError("");
    setOtpHint("");
    setIsLoading(false);
  };

  useEffect(() => {
    const syncAuth = () => {
      setAuthProfile(isUserLoggedIn() ? getAuthProfile() : null);
    };

    syncAuth();
    window.addEventListener("auth-state-changed", syncAuth);
    return () => window.removeEventListener("auth-state-changed", syncAuth);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProviderAvailability = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const settings = await response.json();

        if (!isMounted) {
          return;
        }

        setProviderAvailability({
          google: Boolean(settings?.external?.google),
          facebook: Boolean(settings?.external?.facebook),
        });
      } catch {
        // Keep the buttons enabled if the settings endpoint is unavailable.
      }
    };

    loadProviderAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOtpStep("identifier");
      setOtpCode("");
      setAuthError("");
      setOtpHint("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    const providerLabel = provider === "facebook" ? "Facebook" : "Google";

    if (!providerAvailability[provider]) {
      setAuthError(`La connexion ${providerLabel} n'est pas encore active pour cette application.`);
      return;
    }

    try {
      // Store the current path for post-auth redirect
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem("postAuthRedirect", currentPath);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + "/auth-handler",
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
          scopes: provider === "facebook" ? "email public_profile" : undefined,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (/provider is not enabled|unsupported provider/i.test(message)) {
        setAuthError(`La connexion ${providerLabel} n'est pas activée côté serveur.`);
        return;
      }

      setAuthError(message
        ? `Erreur lors de la connexion avec ${providerLabel} : ${message}`
        : `Erreur lors de la connexion avec ${providerLabel}.`);
    }
  };

  const requestEmailOtp = async () => {
    const trimmedEmail = email.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw error;
    }

    setOtpCode("");
    setOtpStep("otp");
    setOtpHint(`Un code de verification a ete envoye a ${trimmedEmail}.`);
  };

  const startOtpFlow = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidEmail(email.trim())) {
      setAuthError("Merci de saisir une adresse email valide.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    try {
      await requestEmailOtp();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setAuthError(message || "Impossible d'envoyer le code OTP pour le moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtpAndLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setAuthError("Entrez un code OTP valide de 6 chiffres.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "email",
      });

      if (error) {
        throw error;
      }

      const user = data.user ?? data.session?.user;
      setAuthSession({
        name: getDisplayName(user, email.trim()) || authProfile?.name || deriveNameFromEmail(email),
        email: user?.email ?? email.trim(),
        provider: getProvider(user),
      });
      onClose();
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setAuthError(message || "Code OTP invalide ou expire.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal((
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="relative w-full max-h-[90vh] max-w-2xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="relative bg-[linear-gradient(180deg,#e8f2ff_0%,#f7faff_100%)] px-6 pb-16 pt-6">
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Building2 className="h-8 w-8 text-sky-700" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-bold text-slate-950">Connexion ou inscription</h2>
          <p className="mt-2 text-center text-slate-600">
            Utilisez votre email avec un code OTP, ou connectez-vous via Google ou Facebook.
          </p>
        </div>

        <div className="-mt-10 rounded-t-[28px] border-t border-slate-200 bg-white px-6 pb-6 pt-5">
          <div className="mx-auto w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
            {otpStep === "identifier" ? (
              <form onSubmit={startOtpFlow} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Adresse email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
                    placeholder="exemple@email.com"
                  />
                </div>

                {authError && <p className="text-sm font-semibold text-rose-600">{authError}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-[16px] bg-slate-950 px-4 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.24)] transition-all duration-200 hover:bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] disabled:opacity-70"
                >
                  {isLoading ? "Envoi..." : "Continuer"}
                </button>

                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ou</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    disabled={!providerAvailability.google}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#ea4335] shadow-sm">
                      G
                    </span>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("facebook")}
                    disabled={!providerAvailability.facebook}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1877f2] text-sm font-bold text-white shadow-sm">
                      <Facebook className="h-3.5 w-3.5 fill-current" />
                    </span>
                    {providerAvailability.facebook ? "Facebook" : "Facebook indisponible"}
                  </button>
                </div>

                {!providerAvailability.facebook && (
                  <p className="text-xs font-medium text-amber-600">
                    Facebook n&apos;est pas encore configuré dans Supabase pour ce projet.
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={verifyOtpAndLogin} className="space-y-4">
                <p className="text-sm text-slate-600">{otpHint}</p>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Code OTP</label>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    className="w-full rounded-[16px] border border-slate-300 bg-slate-50 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
                    placeholder="000000"
                  />
                  <p className="mt-2 text-xs text-slate-500">Saisissez le code recu par email pour finaliser la connexion.</p>
                </div>

                {authError && <p className="text-sm font-semibold text-rose-600">{authError}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-[16px] bg-slate-950 px-4 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.24)] transition-all duration-200 hover:bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] disabled:opacity-70"
                >
                  {isLoading ? "Verification..." : "Verifier et continuer"}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("identifier");
                      setOtpCode("");
                      setAuthError("");
                    }}
                    className="font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Modifier l'email
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setAuthError("");
                      setIsLoading(true);
                      try {
                        await requestEmailOtp();
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "";
                        setAuthError(message || "Impossible de renvoyer le code OTP.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renvoyer le code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
