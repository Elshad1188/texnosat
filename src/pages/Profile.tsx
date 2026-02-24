import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
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
import { User, Package, Store, Star, Edit2, Save, Eye, MapPin, Phone, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
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
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8 overflow-hidden">
          <div className="h-24 bg-gradient-primary" />
          <CardContent className="-mt-12 flex flex-col items-center gap-4 pb-6 sm:flex-row sm:items-end sm:px-8">
            <Avatar className="h-24 w-24 border-4 border-card shadow-card">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl font-bold">
                {(profile?.full_name || user.email)?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "İstifadəçi"}</h1>
                <Badge className={levelColor}>{level}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                {profile?.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>}
                {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(profile?.created_at || "").toLocaleDateString("az-AZ")}</span>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div><p className="text-2xl font-bold text-foreground">{listings.length}</p><p className="text-xs text-muted-foreground">Elan</p></div>
              <div><p className="text-2xl font-bold text-foreground">{avgRating}</p><p className="text-xs text-muted-foreground">Reytinq</p></div>
              <div><p className="text-2xl font-bold text-foreground">{reviews.length}</p><p className="text-xs text-muted-foreground">Rəy</p></div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="listings" className="gap-1.5"><Package className="h-4 w-4" />Elanlarım</TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5"><Store className="h-4 w-4" />Mağazalarım</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-4 w-4" />Rəylər</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Edit2 className="h-4 w-4" />Tənzimləmələr</TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {listings.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Package className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p>Hələ elan yerləşdirməmisiniz.</p>
                <Button className="mt-4 bg-gradient-primary text-primary-foreground" asChild><Link to="/create-listing">Elan yerləşdir</Link></Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <Card key={l.id} className="overflow-hidden transition-shadow hover:shadow-card-hover">
                    <Link to={`/product/${l.id}`}>
                      {l.image_urls?.[0] ? (
                        <img src={l.image_urls[0]} alt={l.title} className="h-40 w-full object-cover" />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-muted"><Package className="h-10 w-10 text-muted-foreground/40" /></div>
                      )}
                    </Link>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${l.id}`} className="font-semibold text-foreground hover:text-primary line-clamp-1">{l.title}</Link>
                        <Badge variant={l.is_active ? "default" : "secondary"} className="shrink-0 text-xs">
                          {l.is_active ? "Aktiv" : "Deaktiv"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-lg font-bold text-primary">{l.price} {l.currency}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{l.views_count}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.location}</span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {l.is_premium && <Badge className="bg-primary/10 text-primary text-xs">Premium</Badge>}
                        {l.is_urgent && <Badge variant="destructive" className="text-xs">Təcili</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Stores Tab */}
          <TabsContent value="stores">
            {stores.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Store className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p>Hələ mağaza yaratmamısınız.</p>
                <Button className="mt-4 bg-gradient-primary text-primary-foreground" asChild><Link to="/create-store">Mağaza yarat</Link></Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {stores.map((s) => (
                  <Card key={s.id} className="overflow-hidden">
                    {s.cover_url && <img src={s.cover_url} alt={s.name} className="h-32 w-full object-cover" />}
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={s.logo_url || ""} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">{s.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{s.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{s.description || "Açıqlama yoxdur"}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {s.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>}
                          {s.is_premium && <Badge className="bg-primary/10 text-primary text-xs">Premium</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Star className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p>Hələ rəy almamısınız.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{r.comment || "Şərh yoxdur"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at || "").toLocaleDateString("az-AZ")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profil məlumatları</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>E-poçt</Label>
                  <Input value={user.email || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Ad Soyad</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!editing} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editing} placeholder="+994 XX XXX XX XX" />
                </div>
                <div className="space-y-2">
                  <Label>Şəhər</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!editing} />
                </div>
                <Separator />
                <div className="flex gap-3">
                  {editing ? (
                    <>
                      <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="bg-gradient-primary text-primary-foreground gap-1.5">
                        <Save className="h-4 w-4" />Yadda saxla
                      </Button>
                      <Button variant="outline" onClick={() => { setEditing(false); setFullName(profile?.full_name || ""); setPhone(profile?.phone || ""); setCity(profile?.city || ""); }}>
                        Ləğv et
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setEditing(true)} className="gap-1.5"><Edit2 className="h-4 w-4" />Redaktə et</Button>
                  )}
                </div>
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
