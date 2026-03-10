import { useState } from "react";
import ListingBoostDialog from "@/components/ListingBoostDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { User, Package, Store, Star, Edit2, Save, Eye, MapPin, Phone, Calendar, LogOut, ShieldCheck, Settings, Wallet } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Profile = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCity(data.city || "");
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["my-stores", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewed_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["regions-profile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("regions")
        .select("name")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("name", { ascending: true });
      return data || [];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, city })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setEditing(false);
      toast({ title: "Profil yeniləndi" });
    },
    onError: () => toast({ title: "Xəta baş verdi", variant: "destructive" }),
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const level = reviews.length >= 50 ? "VIP Satıcı" : reviews.length >= 20 ? "Etibarlı" : reviews.length >= 5 ? "Aktiv" : "Yeni";
  const levelColor = level === "VIP Satıcı" ? "bg-primary text-primary-foreground" : level === "Etibarlı" ? "bg-green-600 text-white" : level === "Aktiv" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-20 bg-gradient-primary" />
          <CardContent className="relative px-4 pb-5 pt-0 sm:px-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
              <Avatar className="-mt-10 h-20 w-20 border-4 border-card shadow-card sm:h-24 sm:w-24">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xl font-bold">
                  {(profile?.full_name || user.email)?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col items-center gap-1.5 sm:flex-row">
                  <h1 className="text-xl font-bold text-foreground sm:text-2xl">{profile?.full_name || "İstifadəçi"}</h1>
                  <Badge className={levelColor + " text-[10px]"}>{level}</Badge>
                  {isAdmin && (
                    <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
                  {profile?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.city}</span>}
                  {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</span>}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(profile?.created_at || "").toLocaleDateString("az-AZ")}</span>
                </div>
                {isAdmin && (
                  <div className="mt-3 flex justify-center sm:justify-start">
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground gap-1.5 h-8 text-xs" asChild>
                      <Link to="/admin">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin Paneli
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-center">
                <Link to="/balance" className="text-center hover:opacity-80 transition-opacity">
                  <p className="text-xl font-bold text-primary">{Number((profile as any)?.balance || 0).toFixed(2)} ₼</p>
                  <p className="text-[10px] text-muted-foreground">Balans</p>
                </Link>
                <div><p className="text-xl font-bold text-foreground">{listings.length}</p><p className="text-[10px] text-muted-foreground">Elan</p></div>
                <div><p className="text-xl font-bold text-foreground">{avgRating}</p><p className="text-[10px] text-muted-foreground">Reytinq</p></div>
                <div><p className="text-xl font-bold text-foreground">{reviews.length}</p><p className="text-[10px] text-muted-foreground">Rəy</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="listings" className="space-y-4">
          <TabsList className="w-full overflow-x-auto justify-start">
            <TabsTrigger value="listings" className="gap-1 text-xs sm:text-sm"><Package className="h-3.5 w-3.5" />Elanlarım</TabsTrigger>
            <TabsTrigger value="stores" className="gap-1 text-xs sm:text-sm"><Store className="h-3.5 w-3.5" />Mağazalar</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1 text-xs sm:text-sm"><Star className="h-3.5 w-3.5" />Rəylər</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm"><Edit2 className="h-3.5 w-3.5" />Tənzimləmələr</TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            {listings.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Hələ elan yerləşdirməmisiniz.</p>
                <Button className="mt-4 bg-gradient-primary text-primary-foreground text-sm" asChild><Link to="/create-listing">Elan yerləşdir</Link></Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <Card key={l.id} className="overflow-hidden transition-shadow hover:shadow-card-hover">
                    <Link to={`/product/${l.id}`}>
                      {l.image_urls?.[0] ? (
                        <img src={l.image_urls[0]} alt={l.title} className="h-36 w-full object-cover" />
                      ) : (
                        <div className="flex h-36 items-center justify-center bg-muted"><Package className="h-8 w-8 text-muted-foreground/40" /></div>
                      )}
                    </Link>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${l.id}`} className="text-sm font-semibold text-foreground hover:text-primary line-clamp-1">{l.title}</Link>
                        <Badge variant={l.is_active ? "default" : "secondary"} className="shrink-0 text-[10px]">
                          {l.is_active ? "Aktiv" : "Deaktiv"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-base font-bold text-primary">{l.price} {l.currency}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{l.views_count}</span>
                        <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{l.location}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stores">
            {stores.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                <Store className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Hələ mağaza yaratmamısınız.</p>
                <Button className="mt-4 bg-gradient-primary text-primary-foreground text-sm" asChild><Link to="/create-store">Mağaza yarat</Link></Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {stores.map((s) => (
                  <Card key={s.id} className="overflow-hidden">
                    {s.cover_url && <img src={s.cover_url} alt={s.name} className="h-28 w-full object-cover" />}
                    <CardContent className="flex items-center gap-3 p-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={s.logo_url || ""} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-sm">{s.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{s.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{s.description || "Açıqlama yoxdur"}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                          <Link to="/store-dashboard"><Settings className="h-3.5 w-3.5" />İdarə et</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                <Star className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Hələ rəy almamısınız.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-start gap-3 p-3">
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{r.comment || "Şərh yoxdur"}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(r.created_at || "").toLocaleDateString("az-AZ")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Profil məlumatları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">E-poçt</Label>
                  <Input value={user.email || ""} disabled className="bg-muted h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ad Soyad</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!editing} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editing} placeholder="+994 XX XXX XX XX" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bölgə</Label>
                  <Select value={city || undefined} onValueChange={setCity} disabled={!editing}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Bölgə seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {city && !regions.some((r: { name: string }) => r.name === city) && (
                        <SelectItem value={city}>{city}</SelectItem>
                      )}
                      {regions.map((region: { name: string }) => (
                        <SelectItem key={region.name} value={region.name}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button size="sm" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="bg-gradient-primary text-primary-foreground gap-1">
                        <Save className="h-3.5 w-3.5" />Yadda saxla
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); setFullName(profile?.full_name || ""); setPhone(profile?.phone || ""); setCity(profile?.city || ""); }}>
                        Ləğv et
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1"><Edit2 className="h-3.5 w-3.5" />Redaktə et</Button>
                  )}
                </div>

                <Separator />
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 border-primary/30 text-primary"
                    asChild
                  >
                    <Link to="/admin">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Admin Panel
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full gap-1.5"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Hesabdan çıx
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
