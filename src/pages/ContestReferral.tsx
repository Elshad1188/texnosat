import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ContestReferral = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!code) return;
    const upper = code.toUpperCase();
    // Always store for later use during signup
    sessionStorage.setItem("contest_ref", upper);

    if (loading) return;

    if (!user) {
      // New visitor → send to signup with ref param
      navigate(`/auth?ref=${upper}`, { replace: true });
      return;
    }

    // Existing user → try to register the invite (will only succeed if account is fresh)
    (async () => {
      const { data } = await supabase.rpc("register_contest_invite", { _referral_code: upper });
      const res = data as any;
      if (res?.success) {
        toast({ title: "Dəvət qeydə alındı! 🎉", description: "Sizi dəvət edən şəxs reytinqdə yüksəldi." });
      }
      navigate("/contest", { replace: true });
    })();
  }, [code, user, loading, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default ContestReferral;
