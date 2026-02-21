import { Search, Plus, User, Heart, ShoppingCart, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

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
            Məhsullar
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
                <Link to="/profile"><User className="h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => signOut()}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
              <Link to="/auth"><User className="h-5 w-5" /></Link>
            </Button>
          )}
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5" asChild>
            <Link to="/products">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Məhsullara bax</span>
            </Link>
          </Button>
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
            <Link to="/products" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Məhsullar</Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Haqqımızda</Link>
            <Link to="/favorites" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Seçilmişlər</Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
