
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Trophy, 
  Sparkles, 
  RotateCw, 
  Info, 
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";

interface SpinPrize {
  id: string;
  label: string;
  amount: number;
  chance: number;
  color: string;
}

const SpinWin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinPrize | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [canSpinAgain, setCanSpinAgain] = useState(false);
  
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: prizes = [], isLoading: prizesLoading } = useQuery({
    queryKey: ["active-prizes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("spin_prizes")
        .select("*")
        .eq("is_active", true);
      return (data || []) as SpinPrize[];
    },
  });

  const canSpin = () => {
    if (canSpinAgain) return true;
    if (!profile?.last_spin_at) return true;
    const lastSpin = new Date(profile.last_spin_at).getTime();
    const now = new Date().getTime();
    return now - lastSpin >= 24 * 60 * 60 * 1000;
  };

  const getTimeRemaining = () => {
    if (!profile?.last_spin_at) return null;
    const nextSpin = new Date(profile.last_spin_at).getTime() + 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const diff = nextSpin - now;
    if (diff <= 0) return null;
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}s ${m}d`;
  };

  const spin = async () => {
    if (isSpinning || !canSpin()) return;
    if (!user) {
        toast({ title: "Zəhmət olmasa daxil olun", variant: "destructive" });
        return;
    }

    setIsSpinning(true);
    setCanSpinAgain(false);
    
    // Choose result based on weights (chance)
    const totalWeight = prizes.reduce((acc, p) => acc + p.chance, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      if (random < prize.chance) {
        selectedPrize = prize;
        break;
      }
      random -= prize.chance;
    }

    // Calculate rotation — land clearly inside the segment (avoid edges)
    // Segment i occupies [i*segmentAngle, (i+1)*segmentAngle) clockwise from top in the SVG.
    // CSS rotate(R deg) clockwise: needle (fixed at top) points at angle (360 - R%360) on the wheel.
    // For the needle to land on segment i, we need: R%360 = 360 - i*segmentAngle - offset
    const prizeIndex = prizes.indexOf(selectedPrize);
    const segmentAngle = 360 / prizes.length;
    const extraSpins = 5 + Math.floor(Math.random() * 5);
    const safeOffset = segmentAngle * 0.25 + Math.random() * segmentAngle * 0.5;
    // Calculate the exact final angle we want, then compute delta from current rotation
    const desiredFinalAngle = ((360 - prizeIndex * segmentAngle - safeOffset) % 360 + 360) % 360;
    const currentAngle = ((rotation % 360) + 360) % 360;
    const delta = ((desiredFinalAngle - currentAngle) % 360 + 360) % 360;
    const targetRotation = rotation + extraSpins * 360 + delta;
    
    setRotation(targetRotation);

    // Call RPC to process win after animation
    setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("process_spin_win", {
          _prize_id: selectedPrize.id
        });
        
        if (error) throw error;
        
        const res = data as any;
        if (res.success) {
          if (res.can_spin_again) {
            setCanSpinAgain(true);
            toast({
              title: "Yenidən cəhd edin!",
              description: "Bu dəfə bəxtiniz gətirmədi, amma dərhal yenidən fırlada bilərsiniz.",
            });
            setResult(null);
            setShowResultModal(false);
          } else {
            setResult(selectedPrize);
            setShowResultModal(true);
            queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
          }
        } else {
          toast({ title: "Xəta", description: res.error, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "Xəta", description: err.message, variant: "destructive" });
      } finally {
        setIsSpinning(false);
      }
    }, 5000); // Wait for animation to finish
  };

  if (prizesLoading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-lg px-4 py-8 flex flex-col items-center text-center">
        <div className="mb-8 opacity-0 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            HƏR GÜN HƏDİYYƏ QAZAN
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Hədiyyə Çarxı</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Hər 24 saatda bir dəfə çarxı fırladaraq balansınıza hədiyyə məbləğlər qazana bilərsiniz.
          </p>
        </div>

        {/* Wheel Container */}
        <div className="relative mb-12">
          {/* Needle/Indicator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="w-8 h-8 bg-foreground rounded-full border-4 border-background shadow-lg flex items-center justify-center">
                <div className="w-2 h-6 bg-primary rounded-full transform -translate-y-1" />
            </div>
          </div>

          {/* Exterior Ring */}
          <div className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full border-[12px] border-foreground/5 shadow-2xl relative overflow-hidden bg-background p-2">
            <div 
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner flex items-center justify-center"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transition: "transform 5s cubic-bezier(0.12, 0, 0.1, 1)",
                transformOrigin: "center center"
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {prizes.map((prize, i) => {
                  const angle = 360 / prizes.length;
                  const rotationAngle = i * angle;
                  return (
                    <g key={prize.id} transform={`rotate(${rotationAngle} 50 50)`}>
                      <path
                        d={`M 50 50 L 50 0 A 50 50 0 0 1 ${50 + 50 * Math.sin((angle * Math.PI) / 180)} ${50 - 50 * Math.cos((angle * Math.PI) / 180)} Z`}
                        fill={prize.color}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="0.5"
                      />
                      <text
                        x="50"
                        y="20"
                        fill="white"
                        fontSize="4"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${angle / 2} 50 50)`}
                        style={{ userSelect: "none" }}
                      >
                        {prize.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {/* Center Cap */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-4 border-foreground/5 shadow-lg flex items-center justify-center z-10">
                <div className="w-6 h-6 rounded-full bg-gradient-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <div className="w-full space-y-4">
          <Button 
            onClick={spin}
            disabled={isSpinning || !canSpin()}
            size="lg"
            className="w-full h-14 text-lg font-bold bg-gradient-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg relative overflow-hidden group"
          >
            {isSpinning ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : !canSpin() ? (
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 opacity-60" />
                NÖVBƏTİ ŞANS: {getTimeRemaining()}
              </span>
            ) : (
              <span className="flex items-center gap-2 uppercase tracking-wide">
                <RotateCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                İNDİ FIRLAT
              </span>
            )}
            
            {/* Animated Shine Effect */}
            <div className="absolute top-0 -left-full w-1/2 h-full bg-white/20 skew-x-[45deg] group-hover:left-[150%] transition-all duration-1000" />
          </Button>

          {!canSpin() && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 py-2 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5" />
                Hər 24 saatda bir dəfə iştirak edə bilərsiniz
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-6">
            <div className="text-center">
                <div className="text-sm font-bold text-foreground">{(profile as any)?.balance || 0} ₼</div>
                <div className="text-[10px] text-muted-foreground uppercase">MÖVCUD BALANS</div>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
                <div className="text-sm font-bold text-foreground">{prizes.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase">HƏDİYYƏ NÖVÜ</div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-left w-full max-w-sm mx-auto p-4 rounded-2xl bg-muted/30 border border-border/50">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2 uppercase tracking-tight">
                <Info className="h-4 w-4" /> Necə işləyir?
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex gap-2">
                    <span className="font-bold text-primary">•</span> 
                    Hər gün (24 saatdan bir) 1 fırlatma şansınız var.
                </li>
                <li className="flex gap-2">
                    <span className="font-bold text-primary">•</span> 
                    Qazandığınız məbləğ dərhal balansınıza əlavə olunur.
                </li>
                <li className="flex gap-2">
                    <span className="font-bold text-primary">•</span> 
                    Bu balansdan elanlarınızı VIP, Premium və ya Təcili etmək üçün istifadə edə bilərsiniz.
                </li>
            </ul>
        </div>
      </main>

      {/* Success Modal */}
      {showResultModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="bg-card w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden border border-border animate-in zoom-in-95 duration-300"
          >
            {/* Confetti-like decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-primary" />
            
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">TƏBRİKLƏR! 🎉</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Siz çarxı fırladaraq hədiyyə qazandınız:
            </p>
            
            <div className="bg-muted p-6 rounded-2xl mb-8 border border-border/50">
              <div className="text-4xl font-black text-foreground">{result.label}</div>
              <div className="text-[10px] text-primary font-bold mt-1 tracking-widest uppercase">Balansınıza əlavə edildi</div>
            </div>
            
            <Button 
              onClick={() => setShowResultModal(false)}
              className="w-full h-12 bg-foreground text-background font-bold rounded-2xl"
            >
              BAĞLA
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SpinWin;
