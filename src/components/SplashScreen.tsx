import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

const SplashScreen = () => {
  const { theme } = useTheme();
  const [show, setShow] = useState(true);

  // Allow a minimum display time for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      // We don't hide it here, the parent will unmount it
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary transition-opacity duration-500">
      <div className="animate-in fade-in zoom-in duration-700">
        {(theme as any).logo_url ? (
          <img 
            src={(theme as any).logo_url} 
            alt="Logo" 
            className="h-20 w-auto object-contain brightness-0 invert" 
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl animate-pulse">
              <span className="font-display text-4xl font-bold text-white">
                {theme.logo_icon ?? "T"}
              </span>
            </div>
            <div className="text-center">
              <span className="font-display text-3xl font-bold text-white tracking-tight">
                {theme.logo_text_main ?? "Texno"}
                <span className="opacity-80">
                  {theme.logo_text_accent ?? "sat"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Loading bar or spinner could go here */}
      <div className="absolute bottom-12">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-full origin-left animate-progress bg-white" />
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
