import { Home, Heart, Plus, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

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
    { path: "/", icon: Home, label: "Ana səhifə" },
    { path: "/favorites", icon: Heart, label: "Seçilmişlər" },
    { path: "/create-listing", icon: Plus, label: "Əlavə et", isCenter: true },
    { path: "/messages", icon: MessageCircle, label: "Mesajlar", badge: unreadCount },
    { path: user ? "/profile" : "/auth", icon: User, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl md:hidden">
      <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          
          if (item.isCenter) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -mt-5 flex flex-col items-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-lg shadow-primary/30 transition-transform active:scale-95">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="mt-0.5 text-[10px] font-medium text-primary">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center py-2 px-3"
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
