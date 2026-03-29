import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  Info
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ModerationToolbarProps {
  id: string;
  type: "listing" | "store";
  currentStatus: string;
  onSuccess?: () => void;
  userId?: string;
  title?: string;
}

const ModerationToolbar = ({ id, type, currentStatus, onSuccess, userId, title }: ModerationToolbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const updateStatus = async (status: "approved" | "rejected", reason?: string) => {
    setLoading(true);
    try {
      const table = type === "listing" ? "listings" : "stores";
      const updates: any = { status };
      
      if (reason) updates.rejection_reason = reason;
      if (status === "approved") updates.is_active = true;
      if (status === "rejected") updates.is_active = false;

      const { error } = await supabase.from(table).update(updates).eq("id", id);
      
      if (error) throw error;

      // Send notification if userId and title are provided
      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: status === "approved" ? "success" : "warning",
          title: status === "approved" 
            ? (type === "listing" ? "Elanınız təsdiqləndi" : "Mağazanız təsdiqləndi")
            : (type === "listing" ? "Elanınız rədd edildi" : "Mağazanız rədd edildi"),
          message: status === "approved" 
            ? `"${title || (type === 'listing' ? 'Elan' : 'Mağaza')}" ${status === 'approved' ? 'təsdiqləndi və yayımlandı' : 'rədd edildi'}.`
            : `"${title || (type === 'listing' ? 'Elan' : 'Mağaza')}" rədd edildi. Səbəb: ${reason || "Qaydalar pozulub"}`,
          link: type === "listing" ? `/product/${id}` : `/store/${id}`,
        });
      }

      toast({ 
        title: status === "approved" ? "Təsdiqləndi" : "Rədd edildi",
        description: `İstifadəçiyə bildiriş göndərildi.`
      });

      if (onSuccess) {
        onSuccess();
      } else {
        // Default behavior: go back to admin panel
        navigate("/admin?tab=moderation");
      }
    } catch (error: any) {
      toast({ 
        title: "Xəta baş verdi", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
      setPopoverOpen(false);
    }
  };

  const statusLabel = {
    pending: { label: "Gözləmədə", color: "bg-amber-500/20 text-amber-600" },
    approved: { label: "Təsdiqlənib", color: "bg-green-500/20 text-green-600" },
    rejected: { label: "Rədd edilib", color: "bg-destructive/20 text-destructive" },
  }[currentStatus] || { label: currentStatus, color: "bg-muted text-muted-foreground" };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] border-b border-primary/20 bg-background/95 backdrop-blur-md shadow-lg py-2.5 px-4 animate-in fade-in slide-in-from-top duration-300">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 gap-1.5 px-2 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => navigate("/admin?tab=moderation")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline font-semibold">Geri</span>
          </Button>
          
          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 leading-none mb-1">
              Moderasiya Paneli
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate max-w-[120px] sm:max-w-[200px]">
                {type === "listing" ? "Elan" : "Mağaza"} ID: {id.slice(0, 8)}
              </span>
              <Badge className={`${statusLabel.color} border-0 text-[10px] h-4.5 px-1.5 font-bold`}>
                {statusLabel.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStatus !== "approved" && (
            <Button 
              size="sm" 
              disabled={loading}
              className="h-9 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm shadow-green-600/20"
              onClick={() => updateStatus("approved")}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              <span className="hidden xs:inline">Təsdiq et</span>
            </Button>
          )}

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                size="sm" 
                variant={currentStatus === "rejected" ? "outline" : "destructive"}
                disabled={loading}
                className="h-9 gap-1.5 font-bold shadow-sm"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Rədd et</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Rədd etmə səbəbi
                </div>
                <Textarea 
                  placeholder="Məsələn: Yanlış məlumatlar, qeyri-etik şəkil..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="min-h-[80px] text-xs resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setPopoverOpen(false)}>Ləğv et</Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => updateStatus("rejected", rejectReason)}
                    disabled={!rejectReason.trim() || loading}
                  >
                    Təsdiqlə
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="hidden lg:flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg bg-primary/5 text-[11px] text-primary font-medium">
            <Info className="h-3.5 w-3.5" />
            Admin, buna yalnız siz baxırsınız
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationToolbar;
