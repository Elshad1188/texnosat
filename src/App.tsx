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
import Reels from "./pages/Reels";
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
import SpinWin from "./pages/SpinWin";
import NotFound from "./pages/NotFound";
import ModeratorPanel from "./pages/ModeratorPanel";
import Orders from "./pages/Orders";
import Support from "./pages/Support";
import MobileBottomNav from "./components/MobileBottomNav";
import AppDownloadBanner from "./components/AppDownloadBanner";
import FirebaseInit from "./components/FirebaseInit";
import { CompareProvider } from "@/contexts/CompareContext";
import CompareBar from "./components/CompareBar";
import ComparePage from "./pages/ComparePage";
import PaymentResult from "./pages/PaymentResult";
import ChatBot from "./components/ChatBot";
import SpinWheelPopup from "./components/SpinWheelPopup";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

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
        <Route path="/reels" element={<Reels />} />
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
        <Route path="/spin-win" element={<SpinWin />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/support" element={<Support />} />
        <Route path="/page/:slug" element={<StaticPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
            <ThemeProvider>
              <ScrollToTop />
              <AppWrapper />
              <CompareBar />
              <MobileBottomNav />
              <ChatBot />
              <SpinWheelPopup />
              <AppDownloadBanner />
              <FirebaseInit />
            </ThemeProvider>
          </AuthProvider>
        </CompareProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
