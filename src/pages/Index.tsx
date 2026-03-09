import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Categories from "@/components/Categories";
import FeaturedListings from "@/components/FeaturedListings";
import BannerDisplay from "@/components/BannerDisplay";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <div className="container mx-auto px-4 mt-4">
          <BannerDisplay position="home_top" />
        </div>
        <Categories />
        <div className="container mx-auto px-4">
          <BannerDisplay position="home_middle" />
        </div>
        <FeaturedListings />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
