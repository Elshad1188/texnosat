import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Categories from "@/components/Categories";
import StoresSlider from "@/components/StoresSlider";
import FeaturedListings from "@/components/FeaturedListings";
import BannerDisplay from "@/components/BannerDisplay";
import LatestBlogPosts from "@/components/LatestBlogPosts";
import Footer from "@/components/Footer";
import DealTypeTabs from "@/components/DealTypeTabs";
import SEOHead from "@/components/SEOHead";
import ContestBanner from "@/components/ContestBanner";
import ContestWinnersBanner from "@/components/ContestWinnersBanner";


const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead />
      <Header />
      <main>
        <HeroSection />
        <section className="container mx-auto px-4 -mt-2 mb-4">
          <DealTypeTabs variant="navigate" />
        </section>
        <Categories />
        <div className="container mx-auto px-4 mb-4">
          <ContestWinnersBanner />
          <ContestBanner />
        </div>
        <div className="container mx-auto px-4">
          <BannerDisplay position="home_top" />
        </div>
        <StoresSlider />
        <FeaturedListings />
        <LatestBlogPosts />
        <div className="container mx-auto px-4 pb-8">
          <BannerDisplay position="home_middle" />
        </div>
        
      </main>
      <Footer />
    </div>
  );
};

export default Index;
