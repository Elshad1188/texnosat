import { Plus, User, Heart, Menu, X, LogOut, Store, ShieldCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Texno<span className="text-primary">sat</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Ana səhifə
          </Link>
          <Link to="/products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Elanlar
          </Link>
          <Link to="/create-store" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Mağaza aç
          </Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Haqqımızda
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
            <Link to="/favorites"><Heart className="h-5 w-5" /></Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                <Link to="/messages"><MessageCircle className="h-5 w-5" /></Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                  <Link to="/admin"><ShieldCheck className="h-5 w-5 text-primary" /></Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
                <Link to="/profile"><User className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => signOut()}>
                <LogOut className="h-5 w-5" />
              </Button>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5" asChild>
                <Link to="/create-listing">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Elan yerləşdir</span>
                </Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/auth">
                <User className="h-4 w-4" />
                <span>Daxil ol</span>
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-card p-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-3">
            <Link to="/" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Ana səhifə</Link>
            <Link to="/products" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Elanlar</Link>
            <Link to="/create-store" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Mağaza aç</Link>
            <Link to="/favorites" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Seçilmişlər</Link>
            {user && <Link to="/messages" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Mesajlar</Link>}
            {isAdmin && <Link to="/admin" className="text-sm font-medium text-primary" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>}
            {!user && <Link to="/auth" className="text-sm font-medium text-primary" onClick={() => setMobileMenuOpen(false)}>Daxil ol</Link>}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
