import ListingCard from "./ListingCard";

const listings = [
  {
    title: "iPhone 15 Pro Max 256GB - Yeni kimi",
    price: "2,100 ₼",
    location: "Bakı",
    time: "2 saat əvvəl",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop",
    isPremium: true,
  },
  {
    title: "Mercedes-Benz C200 2021 - Tam paket",
    price: "45,000 ₼",
    location: "Bakı",
    time: "5 saat əvvəl",
    image: "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400&h=300&fit=crop",
    isPremium: true,
  },
  {
    title: "3 otaqlı mənzil, 90m² - Nəsimi rayonu",
    price: "185,000 ₼",
    location: "Bakı",
    time: "1 gün əvvəl",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop",
  },
  {
    title: "MacBook Pro M3 14-inch - Qutusu ilə",
    price: "3,400 ₼",
    location: "Sumqayıt",
    time: "3 saat əvvəl",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    isUrgent: true,
  },
  {
    title: "Samsung Galaxy S24 Ultra - Yeni",
    price: "1,850 ₼",
    location: "Gəncə",
    time: "6 saat əvvəl",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=300&fit=crop",
  },
  {
    title: "IKEA divanı - əla vəziyyətdə",
    price: "450 ₼",
    location: "Bakı",
    time: "1 gün əvvəl",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
  },
  {
    title: "Nike Air Max 90 - Original, 42 ölçü",
    price: "120 ₼",
    location: "Bakı",
    time: "4 saat əvvəl",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
    isUrgent: true,
  },
  {
    title: "PlayStation 5 + 3 oyun",
    price: "950 ₼",
    location: "Bakı",
    time: "8 saat əvvəl",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=300&fit=crop",
    isPremium: true,
  },
];

const FeaturedListings = () => {
  return (
    <section className="bg-muted/50 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Son elanlar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ən yeni əlavə olunan elanlar</p>
          </div>
          <a href="#" className="text-sm font-medium text-primary hover:underline">
            Hamısına bax →
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing, i) => (
            <ListingCard key={i} {...listing} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedListings;
