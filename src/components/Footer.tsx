import { Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <span className="font-display text-lg font-bold text-primary-foreground">T</span>
              </div>
              <span className="font-display text-xl font-bold">
                Texno<span className="text-primary">sat</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-secondary-foreground/60">
              Azərbaycanın ən etibarlı elektronika al-sat platforması.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">Kateqoriyalar</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li><Link to="/products?category=telefonlar" className="hover:text-primary">Telefonlar</Link></li>
              <li><Link to="/products?category=noutbuklar" className="hover:text-primary">Noutbuklar</Link></li>
              <li><Link to="/products?category=plansetler" className="hover:text-primary">Planşetlər</Link></li>
              <li><Link to="/products?category=aksesuarlar" className="hover:text-primary">Aksesuarlar</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">Şirkət</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li><Link to="/about" className="hover:text-primary">Haqqımızda</Link></li>
              <li><a href="#" className="hover:text-primary">Qaydalar</a></li>
              <li><a href="#" className="hover:text-primary">Məxfilik</a></li>
              <li><a href="#" className="hover:text-primary">Əlaqə</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">Əlaqə</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +994 50 123 45 67</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> info@texnosat.az</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Bakı, Azərbaycan</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-secondary-foreground/10 pt-6 text-center text-xs text-secondary-foreground/40">
          © 2026 Texnosat. Bütün hüquqlar qorunur.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
