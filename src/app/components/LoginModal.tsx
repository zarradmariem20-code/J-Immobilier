import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Mail, RefreshCw, X } from "lucide-react";
import { getAuthProfile, isUserLoggedIn, setAuthSession, type AuthProfile } from "../utils/storage";
import { supabase } from "../../lib/supabase";

const DEFAULT_PRODUCTION_APP_URL = "https://j-immobilier.vercel.app";
const OTP_LENGTH = 6;
function resolveAuthRedirectBase() {
  const configuredAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL ?? "").trim();
  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return DEFAULT_PRODUCTION_APP_URL;
  }

  const { origin, hostname } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  return isLocalHost ? origin : DEFAULT_PRODUCTION_APP_URL;
}

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

function getEmailOtpErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (/535 Authentication credentials invalid/i.test(message)) {
    return "La configuration SMTP de Supabase est invalide. Verifiez l'hote, le nom d'utilisateur et le mot de passe dans Authentication > SMTP Settings.";
  }

  if (/Error sending magic link email/i.test(message)) {
    return "Supabase n'a pas pu envoyer l'email OTP. Verifiez votre configuration SMTP dans Authentication > SMTP Settings.";
  }

  if (/Email address not authorized/i.test(message)) {
    return "Cette adresse email n'est pas autorisee par le fournisseur email actuel. Configurez un vrai SMTP pour envoyer des OTP a tous les utilisateurs.";
  }

  return message || "Impossible d'envoyer le code OTP par email pour le moment.";
}

function getProvider(user: any): "email" | "google" | "facebook" | "phone" {
  const provider = user?.app_metadata?.provider;
  const providers = user?.app_metadata?.providers;

  if (provider === "google" || (Array.isArray(providers) && providers.includes("google"))) {
    return "google";
  }

  if (provider === "facebook" || (Array.isArray(providers) && providers.includes("facebook"))) {
    return "facebook";
  }

  if (provider === "phone" || (Array.isArray(providers) && providers.includes("phone")) || user?.phone) {
    return "phone";
  }

  return "email";
}

function getDisplayName(user: any, fallbackIdentifier: string) {
  return user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.phone
    || user?.email
    || fallbackIdentifier
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
  });
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpDigits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => otpCode[index] ?? ""),
    [otpCode],
  );

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
    if (otpStep !== "otp") {
      return;
    }

    const firstEmptyIndex = otpDigits.findIndex((digit) => digit === "");
    const targetIndex = firstEmptyIndex === -1 ? OTP_LENGTH - 1 : firstEmptyIndex;
    otpInputRefs.current[targetIndex]?.focus();
  }, [otpDigits, otpStep]);

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

  const handleSocialLogin = async (provider: "google") => {
    const providerLabel = "Google";

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
          redirectTo: `${resolveAuthRedirectBase()}/auth-handler`,
          queryParams: { prompt: "select_account" },
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

  const updateOtpCodeAt = (index: number, replacement: string) => {
    const nextDigits = [...otpDigits];

    replacement.slice(0, OTP_LENGTH - index).split("").forEach((digit, offset) => {
      nextDigits[index + offset] = digit;
    });

    const nextCode = nextDigits.join("").slice(0, OTP_LENGTH);
    setOtpCode(nextCode);

    const nextFocusIndex = Math.min(index + Math.max(replacement.length, 1), OTP_LENGTH - 1);
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  const handleOtpInputChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = "";
      setOtpCode(nextDigits.join("").slice(0, OTP_LENGTH));
      return;
    }

    updateOtpCodeAt(index, digits);
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (!pastedDigits) {
      return;
    }

    setOtpCode(pastedDigits);
    otpInputRefs.current[Math.min(pastedDigits.length, OTP_LENGTH) - 1]?.focus();
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
      setAuthError(getEmailOtpErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtpAndLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otpCode.trim())) {
      setAuthError(`Entrez un code OTP valide de ${OTP_LENGTH} chiffres.`);
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
        name: getDisplayName(user, email.trim()) || authProfile?.name || deriveNameFromEmail(email.trim()),
        email: user?.email ?? email.trim(),
        phone: user?.phone ?? undefined,
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
            Utilisez votre adresse email avec un code OTP, ou connectez-vous via Google.
          </p>
        </div>

        <div className="-mt-10 rounded-t-[28px] border-t border-slate-200 bg-white px-6 pb-6 pt-5">
          <div className="mx-auto w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
            {otpStep === "identifier" ? (
              <form onSubmit={startOtpFlow} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Adresse email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-[16px] border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
                      placeholder="exemple@email.com"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Le compte est cree automatiquement lors de la premiere verification du code.</p>
                </div>

                {authError && <p className="text-sm font-semibold text-rose-600">{authError}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-[16px] bg-slate-950 px-4 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.24)] transition-all duration-200 hover:bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)] disabled:opacity-70"
                >
                  {isLoading ? "Envoi..." : "Continuer par email"}
                </button>

                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ou</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    disabled={!providerAvailability.google}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#ea4335] shadow-sm">
                      G
                    </span>
                    Google
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={verifyOtpAndLogin} className="space-y-4">
                <p className="text-sm text-slate-600">{otpHint}</p>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Code OTP</label>
                  <div className="grid grid-cols-6 gap-2 sm:gap-3">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={`otp-digit-${index}`}
                        ref={(element) => {
                          otpInputRefs.current[index] = element;
                        }}
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        pattern="[0-9]*"
                        maxLength={OTP_LENGTH}
                        value={digit}
                        onChange={(event) => handleOtpInputChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        className="h-14 w-full rounded-[16px] border border-slate-300 bg-slate-50 text-center text-xl font-semibold text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
                        aria-label={`Chiffre ${index + 1} du code OTP`}
                      />
                    ))}
                  </div>
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
                    disabled={isLoading}
                    onClick={async () => {
                      setAuthError("");
                      setIsLoading(true);
                      try {
                        await requestEmailOtp();
                      } catch (error) {
                        setAuthError(getEmailOtpErrorMessage(error));
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
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
