import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function AuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Try to get the last visited path from storage
      let redirectPath = localStorage.getItem("postAuthRedirect") || sessionStorage.getItem("postAuthRedirect");
      if (!redirectPath || redirectPath === "/auth-handler") {
        redirectPath = "/";
      }
      if (session) {
        navigate(redirectPath);
      } else {
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
