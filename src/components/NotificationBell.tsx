import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const NotificationBell = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleNotificationClick = async (n: any) => {
    setSelectedNotification(n);
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  if (!user) return null;

  const typeIcons: Record<string, string> = {
    success: "✅",
    warning: "⚠️",
    info: "ℹ️",
    error: "❌",
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-3">
              <h3 className="text-sm font-semibold text-foreground">Bildirişlər</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={markAllRead}>
                  <CheckCheck className="h-3 w-3" /> Hamısını oxu
                </Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Bildiriş yoxdur</div>
            ) : (
              <div>
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start gap-2 border-b border-border p-3 transition-colors cursor-pointer hover:bg-accent/50 ${
                      n.is_read ? "opacity-60" : "bg-primary/5"
                    }`}
                  >
                    <span className="mt-0.5 text-sm">{typeIcons[n.type] || "📌"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      {n.message && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("az")}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!selectedNotification} onOpenChange={(v) => { if (!v) setSelectedNotification(null); }}>
        <DialogContent className="max-w-md rounded-2xl border-2 border-primary">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{typeIcons[selectedNotification?.type] || "📌"}</span>
              {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedNotification && new Date(selectedNotification.created_at).toLocaleString("az")}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {selectedNotification?.message || "Məzmun yoxdur"}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationBell;
