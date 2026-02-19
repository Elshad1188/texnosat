import ListingCard from "./ListingCard";
import { products } from "@/data/products";
import { useNavigate } from "react-router-dom";

const FeaturedListings = () => {
  const navigate = useNavigate();
  const featured = products.slice(0, 8);

  return (
    <section className="bg-muted/50 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Son elanlar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ən yeni elektronika elanları</p>
          </div>
          <button onClick={() => navigate("/products")} className="text-sm font-medium text-primary hover:underline">
            Hamısına bax →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((product) => (
            <ListingCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={`${product.price.toLocaleString()} ${product.currency}`}
              location={product.location}
              time={product.time}
              image={product.image}
              condition={product.condition}
              isPremium={product.isPremium}
              isUrgent={product.isUrgent}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedListings;
