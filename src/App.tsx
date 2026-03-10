import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import SellerProfile from "./pages/SellerProfile";
import CreateListing from "./pages/CreateListing";
import CreateStore from "./pages/CreateStore";
import Stores from "./pages/Stores";
import StoreDashboard from "./pages/StoreDashboard";
import StoreDetail from "./pages/StoreDetail";
import AdminPanel from "./pages/AdminPanel";
import Auth from "./pages/Auth";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import StaticPage from "./pages/StaticPage";
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ScrollToTop />
            <div className="pb-16 md:pb-0">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/seller/:id" element={<SellerProfile />} />
                <Route path="/create-listing" element={<CreateListing />} />
                <Route path="/create-store" element={<CreateStore />} />
                <Route path="/stores" element={<Stores />} />
                <Route path="/store/:id" element={<StoreDetail />} />
                <Route path="/store-dashboard" element={<StoreDashboard />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/page/:slug" element={<StaticPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <MobileBottomNav />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
