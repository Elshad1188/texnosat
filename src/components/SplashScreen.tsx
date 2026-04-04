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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500"
      style={{ background: 'linear-gradient(180deg, #1a0a3e 0%, #1e3a5f 40%, #00b4d8 100%)' }}>
      <div className="animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center gap-6">
          <img src="/app-icon.png" alt="elan24" className="w-24 h-24 rounded-2xl shadow-2xl" />
          <div className="text-center">
            <span className="font-display text-4xl font-bold text-white tracking-tight">
              elan<span className="text-emerald-400">24</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-12">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-full origin-left animate-progress bg-white/80" />
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
