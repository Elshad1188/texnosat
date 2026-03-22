import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ThemeColors {
  primary_h: number;
  primary_s: number;
  primary_l: number;
  secondary_h: number;
  secondary_s: number;
  secondary_l: number;
  accent_h: number;
  accent_s: number;
  accent_l: number;
  background_h: number;
  background_s: number;
  background_l: number;
  card_h: number;
  card_s: number;
  card_l: number;
  radius: number;
  logo_text_main?: string;
  logo_text_accent?: string;
  logo_icon?: string;
  logo_color?: string;
}

const defaultTheme: ThemeColors = {
  primary_h: 24, primary_s: 95, primary_l: 53,
  secondary_h: 220, secondary_s: 60, secondary_l: 18,
  accent_h: 24, accent_s: 80, accent_l: 95,
  background_h: 30, background_s: 25, background_l: 97,
  card_h: 0, card_s: 0, card_l: 100,
  radius: 0.75,
  logo_text_main: "Texno",
  logo_text_accent: "sat",
  logo_icon: "T",
  logo_color: "",
};

interface ThemeContextType {
  theme: ThemeColors;
  isLoaded: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({ theme: defaultTheme, isLoaded: false, refreshTheme: async () => {} });

export const useTheme = () => useContext(ThemeContext);

function applyTheme(t: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--primary", `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
  root.style.setProperty("--ring", `${t.primary_h} ${t.primary_s}% ${t.primary_l}%`);
  root.style.setProperty("--secondary", `${t.secondary_h} ${t.secondary_s}% ${t.secondary_l}%`);
  root.style.setProperty("--secondary-foreground", `0 0% 98%`);
  root.style.setProperty("--accent", `${t.accent_h} ${t.accent_s}% ${t.accent_l}%`);
  root.style.setProperty("--accent-foreground", `${t.accent_h} ${t.primary_s}% 40%`);
  root.style.setProperty("--background", `${t.background_h} ${t.background_s}% ${t.background_l}%`);
  root.style.setProperty("--foreground", `220 30% 12%`);
  root.style.setProperty("--card", `${t.card_h} ${t.card_s}% ${t.card_l}%`);
  root.style.setProperty("--card-foreground", `220 30% 12%`);
  root.style.setProperty("--popover", `${t.card_h} ${t.card_s}% ${t.card_l}%`);
  root.style.setProperty("--popover-foreground", `220 30% 12%`);
  root.style.setProperty("--muted", `${t.background_h} 15% 92%`);
  root.style.setProperty("--muted-foreground", `220 10% 46%`);
  root.style.setProperty("--border", `${t.background_h} 15% 88%`);
  root.style.setProperty("--input", `${t.background_h} 15% 88%`);
  root.style.setProperty("--radius", `${t.radius}rem`);
  // Update gradients
  root.style.setProperty("--gradient-hero", `linear-gradient(135deg, hsl(${t.secondary_h}, ${t.secondary_s}%, ${t.secondary_l}%) 0%, hsl(${t.secondary_h}, ${t.secondary_s - 10}%, ${t.secondary_l + 10}%) 50%, hsl(${t.primary_h}, 70%, 40%) 100%)`);
  root.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${t.primary_h}, ${t.primary_s}%, ${t.primary_l}%) 0%, hsl(${t.primary_h + 8}, ${t.primary_s}%, ${t.primary_l + 2}%) 100%)`);
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeColors>(defaultTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshTheme = async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "theme")
        .single();
      if (data?.value) {
        const t = data.value as unknown as ThemeColors;
        setTheme(t);
        applyTheme(t);
      }
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    refreshTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLoaded, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
