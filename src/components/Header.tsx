import { Plus, User, Heart, Menu, X, LogOut, Store, ShieldCheck, MessageCircle, Wallet, Phone, Mail, MapPin, FileText, FolderTree, Play, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const Header = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-general-header"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "general").maybeSingle();
      return data?.value as any || {};
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["menu-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("pages").select("slug, title").eq("is_published", true);
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name, slug").eq("is_active", true).is("parent_id", null).order("sort_order").limit(8);
      return data || [];
    },
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

  const phone = siteSettings?.contact_phone || "+994 50 123 45 67";
  const email = siteSettings?.contact_email || "info@texnosat.az";
  const address = siteSettings?.contact_address || "Bakı, Azərbaycan";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Hamburger Menu */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
              <div className="p-4">
                <Link to="/" className="flex items-center gap-2" onClick={() => setSheetOpen(false)}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                    <span className="font-display text-lg font-bold text-primary-foreground">T</span>
                  </div>
                  <span className="font-display text-xl font-bold text-foreground">
                    Texno<span className="text-primary">sat</span>
                  </span>
                </Link>
              </div>

              <Separator />

              {/* Nav links */}
              <div className="p-4 space-y-1">
                {[
                  { to: "/", label: "Ana səhifə", icon: Home },
                  { to: "/products", label: "Elanlar", icon: FolderTree },
                  { to: "/stores", label: "Mağazalar", icon: Store },
                  { to: "/reels", label: "Reels", icon: Play },
                  { to: "/create-store", label: "Mağaza aç", icon: Store },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted">
                    <ShieldCheck className="h-4 w-4" /> Admin Paneli
                  </Link>
                )}
              </div>

              <Separator />

              {/* Categories */}
              <div className="p-4">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kateqoriyalar</h4>
                <div className="space-y-1">
                  {categories.map((c: any) => (
                    <Link key={c.slug} to={`/products?category=${c.slug}`} onClick={() => setSheetOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Pages */}
              <div className="p-4">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Məlumat</h4>
                <div className="space-y-1">
                  {pages.length > 0 ? pages.map((p: any) => (
                    <Link key={p.slug} to={`/page/${p.slug}`} onClick={() => setSheetOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                      {p.title}
                    </Link>
                  )) : (
                    <>
                      <Link to="/page/about" onClick={() => setSheetOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted">Haqqımızda</Link>
                      <Link to="/page/rules" onClick={() => setSheetOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted">Qaydalar</Link>
                      <Link to="/page/privacy" onClick={() => setSheetOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted">Məxfilik</Link>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contact */}
              <div className="p-4">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Əlaqə</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {address}</div>
                </div>
              </div>

              {/* Footer text */}
              <div className="p-4 pt-0">
                <p className="text-[10px] text-muted-foreground/50">
                  {siteSettings?.footer_text || "© 2026 Texnosat. Bütün hüquqlar qorunur."}
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="font-display text-lg font-bold text-primary-foreground">T</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Texno<span className="text-primary">sat</span>
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Ana səhifə</Link>
          <Link to="/products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Elanlar</Link>
          <Link to="/stores" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Mağazalar</Link>
          <Link to="/create-store" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Mağaza aç</Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80">
              <ShieldCheck className="h-4 w-4" /> Admin
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

const BalanceDisplay = ({ userId }: { userId: string }) => {
  const { data: profile } = useQuery({
    queryKey: ["profile-balance", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance").eq("user_id", userId).single();
      return data;
    },
  });
  return <span>{Number((profile as any)?.balance || 0).toFixed(2)} ₼</span>;
};

export default Header;
