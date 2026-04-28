import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import StaticPage from "./pages/StaticPage";
import Balance from "./pages/Balance";
import NotFound from "./pages/NotFound";
import ModeratorPanel from "./pages/ModeratorPanel";
import Support from "./pages/Support";
import MobileBottomNav from "./components/MobileBottomNav";
import MobileTopSearch from "./components/MobileTopSearch";

import FirebaseInit from "./components/FirebaseInit";
import PaymentResult from "./pages/PaymentResult";
import { CompareProvider } from "@/contexts/CompareContext";
import ChatBot from "./components/ChatBot";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Reels from "./pages/Reels";
import SpinWin from "./pages/SpinWin";
import Orders from "./pages/Orders";
import ComparePage from "./pages/ComparePage";
import CompareBar from "./components/CompareBar";
import SpinWheelPopup from "./components/SpinWheelPopup";
import { usePlatformMode } from "@/hooks/usePlatformMode";

const queryClient = new QueryClient();

import SplashScreen from "./components/SplashScreen";
import { useTheme } from "@/contexts/ThemeContext";
import { useChatPresence } from "@/hooks/useChatPresence";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AppWrapper = () => {
  const { isLoaded } = useTheme();
  const { showReels, showSpinWin, showOrders, showCompare } = usePlatformMode();
  useChatPresence();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  return (
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
        <Route path="/mod" element={<ModeratorPanel />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/support" element={<Support />} />
        <Route path="/page/:slug" element={<StaticPage />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        {showReels && <Route path="/reels" element={<Reels />} />}
        {showSpinWin && <Route path="/spin-win" element={<SpinWin />} />}
        {showOrders && <Route path="/orders" element={<Orders />} />}
        {showCompare && <Route path="/compare" element={<ComparePage />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showCompare && <CompareBar />}
      {showSpinWin && <SpinWheelPopup />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CompareProvider>
          <AuthProvider>
            <LanguageProvider>
              <ThemeProvider>
                <ScrollToTop />
                <AppWrapper />
                <MobileBottomNav />
                <MobileTopSearch />
                <ChatBot />
                <FirebaseInit />
              </ThemeProvider>
            </LanguageProvider>
          </AuthProvider>
        </CompareProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
