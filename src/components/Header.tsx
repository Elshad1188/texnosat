import { Plus, User, Heart, Menu, X, LogOut, Store, ShieldCheck, MessageCircle, Wallet, Phone, Mail, MapPin, FileText, FolderTree, Play, Home, CircuitBoard, Trophy, BookOpen, Smartphone, Apple, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { iconMap } from "@/lib/icons";
import { useTranslation } from "react-i18next";
import { usePlatformMode } from "@/hooks/usePlatformMode";

const Header = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { isAdmin } = useIsAdmin();
  const { showReels, showSpinWin, showOrders, showCompare } = usePlatformMode();
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
      const { data } = await supabase.from("categories").select("name, slug, icon").eq("is_active", true).is("parent_id", null).order("sort_order").limit(8);
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
  const email = siteSettings?.contact_email || "info@elan24.az";
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
                  <span className="font-display text-xl font-bold text-foreground">
                    {theme.logo_text_main ?? "Elan"}
                    <span className="text-primary" style={{ color: theme.logo_color ? theme.logo_color : undefined }}>
                      {theme.logo_text_accent ?? "24"}
                    </span>
                  </span>
                </Link>
              </div>

              <Separator />

              {/* Nav links */}
              <div className="p-4 space-y-1">
                {[
                  { to: "/", label: t("nav.home"), icon: Home },
                  { to: "/products", label: t("nav.products"), icon: FolderTree },
                  { to: "/stores", label: t("nav.stores"), icon: Store },
                  { to: "/blog", label: t("nav.blog"), icon: BookOpen },
                  { to: "/create-store", label: t("nav.create_store"), icon: Store },
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
                    <ShieldCheck className="h-4 w-4" /> {t("nav.admin")}
                  </Link>
                )}
              </div>

              <Separator />

              {/* Categories */}
              <div className="p-4">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("categories.title")}</h4>
                <div className="space-y-1">
                  {categories.map((c: any) => {
                    const Icon = iconMap[c.icon] || CircuitBoard;
                    return (
                      <Link key={c.slug} to={`/products?category=${c.slug}`} onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        {c.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <Separator />

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
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("footer.contact")}</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {address}</div>
                </div>
              </div>

              {/* Footer text */}
              <div className="p-4 pt-0">
                <p className="text-[10px] text-muted-foreground/50">
                  {siteSettings?.footer_text || "© 2026 Elan24. Bütün hüquqlar qorunur."}
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-bold text-foreground transition-colors hover:text-primary">
              {theme.logo_text_main ?? "Elan"}
              <span className="text-primary" style={{ color: theme.logo_color ? theme.logo_color : undefined }}>
                {theme.logo_text_accent ?? "24"}
              </span>
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 2xl:flex">
          <Link to="/" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t("nav.home")}</Link>
          <Link to="/products" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t("nav.products")}</Link>
          <Link to="/stores" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t("nav.stores")}</Link>
          <Link to="/blog" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t("nav.blog")}</Link>
          {showReels && <Link to="/reels" className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><Play className="h-3.5 w-3.5" />Reels</Link>}
          {showSpinWin && <Link to="/spin-win" className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><Trophy className="h-3.5 w-3.5" />Çarx</Link>}
          {showOrders && user && <Link to="/orders" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Sifarişlər</Link>}
          {showCompare && <Link to="/compare" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Müqayisə</Link>}
          <Link to="/create-store" className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{t("nav.create_store")}</Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary transition-colors hover:text-primary/80">
              <ShieldCheck className="h-4 w-4" /> {t("nav.admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user && (
            <Link to="/balance" className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-accent transition-colors">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <BalanceDisplay userId={user.id} />
            </Link>
          )}
          {user ? (
            <>
              <Button variant="ghost" size="icon" className="hidden 2xl:flex relative" asChild>
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
                <Button variant="ghost" size="icon" className="hidden 2xl:flex" asChild>
                  <Link to="/admin"><ShieldCheck className="h-5 w-5 text-primary" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="hidden 2xl:flex" asChild>
                <Link to="/profile"><User className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="hidden 2xl:flex" onClick={() => signOut()}>
                <LogOut className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
                <Link to="/favorites"><Heart className="h-5 w-5" /></Link>
              </Button>
              
              <NotificationBell />
              
              <Button size="icon" className="2xl:hidden bg-gradient-primary text-primary-foreground hover:opacity-90" asChild>
                <Link to="/create-listing" aria-label={t("nav.create_listing")}>
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              <Button className="hidden 2xl:flex bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5 whitespace-nowrap" asChild>
                <Link to="/create-listing">
                  <Plus className="h-4 w-4" />
                  <span>{t("nav.create_listing")}</span>
                </Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/auth">
                <User className="h-4 w-4" />
                <span>{t("nav.login")}</span>
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
