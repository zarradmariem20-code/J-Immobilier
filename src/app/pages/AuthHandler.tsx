import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { clearAuthSession, setAuthSession } from "../utils/storage";

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

function getDisplayName(user: any) {
  return user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "Utilisateur";
}

export default function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const currentUrl = new URL(window.location.href);
      const authCode = currentUrl.searchParams.get("code");
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      // Support implicit/hash OAuth callback and clear sensitive fragments from the URL.
      if (hashAccessToken && hashRefreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });

        if (error) {
          clearAuthSession();
          navigate("/login");
          return;
        }

        window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}`);
      }

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) {
          clearAuthSession();
          navigate("/login");
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      // Try to get the last visited path from storage
      let redirectPath = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect");
      if (!redirectPath || redirectPath === "/auth-handler") {
        redirectPath = "/";
      }
      if (session) {
        const user = session.user;
        setAuthSession({
          name: getDisplayName(user),
          email: user.email,
          provider: getProvider(user),
        });
        navigate(redirectPath);
      } else {
        clearAuthSession();
        navigate("/");
      }
      // Clean up after redirect
      localStorage.removeItem("postAuthRedirect");
      sessionStorage.removeItem("postAuthRedirect");
    };
    checkSession();
  }, [navigate]);

  return <div>Authenticating...</div>;
}
