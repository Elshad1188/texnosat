import { Plus, User, Heart, Menu, X, LogOut, Store, ShieldCheck, MessageCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "@/components/NotificationBell";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("header-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Texno<span className="text-primary">sat</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Ana səhifə
          </Link>
          <Link to="/products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Elanlar
          </Link>
          <Link to="/stores" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Mağazalar
          </Link>
          <Link to="/create-store" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Mağaza aç
          </Link>
          <Link to="/page/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Haqqımızda
          </Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <Link to="/balance" className="hidden md:flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors">
              <Wallet className="h-4 w-4 text-primary" />
              <BalanceDisplay userId={user.id} />
            </Link>
          )}
          <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
            <Link to="/favorites"><Heart className="h-5 w-5" /></Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" className="hidden md:flex relative" asChild>
                <Link to="/messages">
                  <MessageCircle className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                  <Link to="/admin"><ShieldCheck className="h-5 w-5 text-primary" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                <Link to="/profile"><User className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => signOut()}>
                <LogOut className="h-5 w-5" />
              </Button>
              
              <NotificationBell />
              
              <Button className="hidden md:flex bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5" asChild>
                <Link to="/create-listing">
                  <Plus className="h-4 w-4" />
                  <span>Elan yerləşdir</span>
                </Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/auth">
                <User className="h-4 w-4" />
                <span>Daxil ol</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
