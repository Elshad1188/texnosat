import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, MapPin, Clock, Star, Phone, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { products } from "@/data/products";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">Məhsul tapılmadı</h2>
          <Button variant="outline" onClick={() => navigate("/products")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Məhsullara qayıt
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const similar = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Geri qayıt
        </button>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Image */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden rounded-2xl bg-muted">
              <img src={product.image} alt={product.title} className="aspect-[4/3] w-full object-cover" />
              <div className="absolute left-3 top-3 flex gap-1.5">
                {product.isPremium && <Badge className="bg-gradient-primary text-primary-foreground border-0">Premium</Badge>}
                {product.isUrgent && <Badge variant="destructive">Təcili</Badge>}
                <Badge variant="secondary">{product.condition}</Badge>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">{product.title}</h1>
            <p className="mt-3 font-display text-3xl font-bold text-primary">
              {product.price.toLocaleString()} {product.currency}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {product.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {product.time}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => setLiked(!liked)}
                variant="outline"
                className="gap-1.5"
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />
                {liked ? "Seçilmişlərdə" : "Seçilmişlərə əlavə et"}
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Seller */}
            <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{product.seller.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span>{product.seller.rating}</span>
                    <span>·</span>
                    <span>{product.seller.memberSince}-dən üzv</span>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2"
                  onClick={() => setShowPhone(!showPhone)}
                >
                  <Phone className="h-4 w-4" />
                  {showPhone ? product.seller.phone : "Nömrəni göstər"}
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Mesaj yaz
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h3 className="font-display text-sm font-semibold text-foreground">Təsvir</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </div>
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-display text-xl font-bold text-foreground">Oxşar məhsullar</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {similar.map((p) => (
                <ListingCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  price={`${p.price.toLocaleString()} ${p.currency}`}
                  location={p.location}
                  time={p.time}
                  image={p.image}
                  condition={p.condition}
                  isPremium={p.isPremium}
                  isUrgent={p.isUrgent}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
