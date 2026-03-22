import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useIsAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!error && data === true);
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};

export const useIsAdminOrMod = () => {
  const { user } = useAuth();
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPrivileged(false);
      setLoading(false);
      return;
    }

    const checkPrivilege = async () => {
      const { data: adminData, error: adminError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!adminError && adminData === true) {
        setIsPrivileged(true);
        setLoading(false);
        return;
      }

      const { data: modData, error: modError } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "moderator",
      });
      setIsPrivileged(!modError && modData === true);
      setLoading(false);
    };

    checkPrivilege();
  }, [user]);

  return { isPrivileged, loading };
};
