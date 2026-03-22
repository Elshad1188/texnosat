import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

const SplashScreen = () => {
  const { theme } = useTheme();
  const [show, setShow] = useState(true);

  // Allow a minimum display time for better UX
  useEffect(() => {
    // Prevent scrolling while splash is active
    document.body.style.overflow = 'hidden';

    // Hide the static HTML splash once React takes over
    const initialSplash = document.getElementById("initial-splash");
    if (initialSplash) {
      initialSplash.style.opacity = "0";
      setTimeout(() => {
        if (initialSplash.parentNode) {
          initialSplash.remove();
        }
      }, 400);
    }

    return () => {
      // Re-enable scrolling when splash is removed
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary transition-opacity duration-500">
      <div className="animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <span className="font-display text-4xl font-bold text-white tracking-tight">
              {theme.logo_text_main ?? "Texno"}
              <span className="opacity-80">
                {theme.logo_text_accent ?? "sat"}
              </span>
            </span>
          </div>
        </div>
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
