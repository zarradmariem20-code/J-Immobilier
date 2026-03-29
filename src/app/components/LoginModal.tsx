import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Facebook, RefreshCw, X } from "lucide-react";
import { getAuthProfile, isUserLoggedIn, setAuthSession, type AuthProfile } from "../utils/storage";

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

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [email, setEmail] = useState("");
  const [otpStep, setOtpStep] = useState<"identifier" | "otp">("identifier");
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSocialLogin = (provider: "google" | "facebook") => {
    const providerLabel = provider === "google" ? "Google" : "Facebook";
    setAuthSession({
      name: authProfile?.name || deriveNameFromEmail(email) || `Utilisateur ${providerLabel}`,
      email: email.trim() || undefined,
      provider,
    });
    onClose();
    resetForm();
  };

  const startOtpFlow = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidEmail(email.trim())) {
      setAuthError("Merci de saisir une adresse email valide.");
      return;
    }

    setAuthError("");
    setOtpCode("");
    setOtpStep("otp");
    setOtpHint(`Un code de verification a ete envoye a ${email.trim()}.`);
  };

  const verifyOtpAndLogin = (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setAuthError("Entrez un code OTP valide de 6 chiffres.");
      return;
    }

    setAuthError("");
    setIsLoading(true);

    setTimeout(() => {
      setAuthSession({
        name: authProfile?.name || deriveNameFromEmail(email),
        email: email.trim(),
        provider: "email",
      });
      setIsLoading(false);
      onClose();
      resetForm();
    }, 650);
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal((
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-h-[90vh] max-w-2xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl">
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
                  className="w-full rounded-[16px] bg-slate-950 px-4 py-3 font-semibold text-white shadow-[0_10px_20px_rgba(2,6,23,0.24)] transition-all duration-200 hover:bg-[linear-gradient(135deg,#020617_0%,#0f172a_58%,#0369a1_100%)]"
                >
                  Continuer
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
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#ea4335] shadow-sm">
                      G
                    </span>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("facebook")}
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1877f2] text-sm font-bold text-white shadow-sm">
                      <Facebook className="h-3.5 w-3.5 fill-current" />
                    </span>
                    Facebook
                  </button>
                </div>
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
                  <p className="mt-2 text-xs text-slate-500">Code de test: 123456 (simulation locale)</p>
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
                    onClick={() => {
                      setAuthError("");
                      setOtpHint(`Un nouveau code a ete envoye a ${email.trim()}.`);
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
