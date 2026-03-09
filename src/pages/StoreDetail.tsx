import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Store, MapPin, Phone, Clock, Crown, MessageCircle, Loader2, ArrowLeft, Send
} from "lucide-react";

const StoreDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });

  const { data: store, isLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["store-listings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("store_id", id)
        .eq("is_active", true)
        .order("is_premium", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Müraciət üçün daxil olun", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!form.name || !form.phone || !form.message) {
      toast({ title: "Bütün sahələri doldurun", variant: "destructive" });
      return;
    }
    if (!store) return;

    setSending(true);
    try {
      // Create or find conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", store.user_id)
        .is("listing_id", null)
        .maybeSingle();

      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({ buyer_id: user.id, seller_id: store.user_id })
          .select("id")
          .single();
        if (error) throw error;
        conversationId = newConvo.id;
      }

      // Send inquiry message
      const msgContent = `📦 Mağaza müraciəti\n\nAd: ${form.name}\nTelefon: ${form.phone}\n\nMəlumat:\n${form.message}`;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: msgContent,
      });

      toast({ title: "Müraciət göndərildi!" });
      setForm({ name: "", phone: "", message: "" });
      setInquiryOpen(false);
    } catch (err: any) {
      toast({ title: "Xəta baş verdi", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex flex-col items-center py-32 text-center">
          <Store className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Mağaza tapılmadı</p>
          <Button asChild className="mt-6">
            <Link to="/stores">Mağazalara qayıt</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Çardağ / Cover Banner */}
      <div className="relative h-48 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background sm:h-64">
        {store.cover_url && (
          <img src={store.cover_url} alt="Cover" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <main className="container mx-auto px-4">
        {/* Store Info Card */}
        <div className="relative -mt-16 mb-8 rounded-xl border border-border bg-card p-6 shadow-lg">
          <Link to="/stores" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Logo */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-muted shadow-md">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{store.name}</h1>
                {store.is_premium && (
                  <Badge className="gap-1 bg-gradient-primary text-primary-foreground">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>

              {store.description && (
                <p className="mt-2 text-sm text-muted-foreground">{store.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {store.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {store.city}
                    {store.address && `, ${store.address}`}
                  </span>
                )}
                {store.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> {store.phone}
                  </span>
                )}
                {store.working_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {store.working_hours}
                  </span>
                )}
              </div>

              <Button
                className="mt-4 gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90"
                onClick={() => setInquiryOpen(!inquiryOpen)}
              >
                <MessageCircle className="h-4 w-4" />
                Mağazaya müraciət
              </Button>
            </div>
          </div>

          {/* Inquiry Form */}
          {inquiryOpen && (
            <form onSubmit={handleInquiry} className="mt-6 space-y-4 border-t border-border pt-6">
              <h3 className="font-display text-lg font-semibold text-foreground">Müraciət formu</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Adınız *</Label>
                  <Input
                    placeholder="Ad Soyad"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon *</Label>
                  <Input
                    placeholder="+994 50 000 0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mesajınız *</Label>
                <Textarea
                  placeholder="Nə barədə məlumat almaq istəyirsiniz?"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Göndər
              </Button>
            </form>
          )}
        </div>

        {/* Store Listings */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Mağaza elanları ({listings.length})
          </h2>

          {listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">Bu mağazada hələ elan yoxdur</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={`${listing.price} ${listing.currency}`}
                  location={listing.location}
                  time={new Date(listing.created_at).toLocaleDateString("az-AZ")}
                  image={listing.image_urls?.[0] || "/placeholder.svg"}
                  condition={listing.condition}
                  isPremium={listing.is_premium}
                  isUrgent={listing.is_urgent}
                  storeId={store?.id}
                  storeName={store?.name}
                  storeLogo={store?.logo_url}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StoreDetail;
