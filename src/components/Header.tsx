import { Search, Plus, User, MessageCircle, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="font-display text-lg font-bold text-primary-foreground">T</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Texno<span className="text-primary">sat</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Kateqoriyalar
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Mağazalar
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Haqqımızda
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <User className="h-5 w-5" />
          </Button>
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Elan yerləşdir</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <a href="#" className="text-sm font-medium text-muted-foreground">Kateqoriyalar</a>
            <a href="#" className="text-sm font-medium text-muted-foreground">Mağazalar</a>
            <a href="#" className="text-sm font-medium text-muted-foreground">Haqqımızda</a>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <User className="h-4 w-4" /> Daxil ol
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
