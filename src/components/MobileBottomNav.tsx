import { Home, Heart, Plus, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

const MobileBottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (y < 80) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-mobile", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
      if (!convos || convos.length === 0) return 0;
      const { data } = await supabase
        .from("messages")
        .select("id")
        .in("conversation_id", convos.map(c => c.id))
        .eq("is_read", false)
        .neq("sender_id", user.id);
      return data?.length || 0;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: t("mobilenav.home") },
    { path: "/favorites", icon: Heart, label: t("mobilenav.favorites") },
    { path: "/create-listing", icon: Plus, label: t("mobilenav.add"), isCenter: true },
    { path: "/messages", icon: MessageCircle, label: t("mobilenav.messages"), badge: unreadCount },
    { path: user ? "/profile" : "/auth", icon: User, label: t("mobilenav.profile") },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border 2xl:hidden transition-transform duration-300 ease-out will-change-transform",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item.path);

          if (item.isCenter) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -mt-4 flex flex-col items-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-md shadow-primary/25 transition-transform active:scale-90">
                  <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
                </div>
                <span className="mt-0.5 text-[9px] font-semibold text-primary leading-none">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[3rem]"
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium leading-none transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
