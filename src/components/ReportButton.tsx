import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Flag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const reasons = [
  "Saxta elan",
  "Uyğunsuz məzmun",
  "Saxtakarlıq/Fırıldaq",
  "Dublikat elan",
  "Yanlış kateqoriya",
  "Digər",
];

interface ReportButtonProps {
  targetType: "listing" | "user" | "store" | "review";
  targetId: string;
  variant?: "ghost" | "outline";
  size?: "sm" | "icon";
}

const ReportButton = ({ targetType, targetId, variant = "ghost", size = "sm" }: ReportButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!reason) { toast({ title: "Səbəb seçin", variant: "destructive" }); return; }
    
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description || null,
    });
    
    if (error) {
      toast({ title: "Xəta", variant: "destructive" });
    } else {
      toast({ title: "Şikayətiniz göndərildi", description: "Ən qısa zamanda nəzərdən keçiriləcək." });
      setOpen(false);
      setReason("");
      setDescription("");
    }
    setSubmitting(false);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className="gap-1 text-muted-foreground hover:text-destructive">
        <Flag className="h-3.5 w-3.5" />
        {size !== "icon" && <span className="text-xs">Şikayət</span>}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Flag className="h-4 w-4 text-destructive" /> Şikayət bildir
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Səbəb seçin" /></SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Əlavə izahat (istəyə bağlı)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={submit} disabled={submitting} className="gap-1">
                  <Flag className="h-3.5 w-3.5" /> {submitting ? "Göndərilir..." : "Göndər"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Ləğv</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;
