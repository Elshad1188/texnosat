import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, ShieldAlert } from "lucide-react";

const AdminAntispamManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wordsText, setWordsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("key", "antispam").maybeSingle();
      if (data?.value && Array.isArray((data.value as any)?.words)) {
        setWordsText((data.value as any).words.join(", "));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    // Parse words from comma-separated string
    const wordsArray = wordsText.split(",")
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);

    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "antispam").maybeSingle();
    
    const payload = { words: wordsArray };

    if (existing) {
      await supabase.from("site_settings").update({ value: payload as any, updated_by: user?.id }).eq("key", "antispam");
    } else {
      await supabase.from("site_settings").insert({ key: "antispam", value: payload as any, updated_by: user?.id });
    }
    
    toast({ title: "Antispam sözləri yadda saxlanıldı" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Antispam Sözlər (Söyüş / Təhqir filtri)
        </h3>
        <p className="text-xs text-muted-foreground">
          Burada daxil etdiyiniz sözlər şərhlərdə yoxlanılacaq. Kimsə bu sözləri yazmağa cəhd etdikdə, şərh ləğv ediləcək və sizə avtomatik bildiriş gələcək.
        </p>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Qadağan olunmuş sözlər (virgüllə ayırın)</Label>
          <Textarea 
            placeholder="məsələn: axmaq, pis söz 1, söyüş..." 
            value={wordsText}
            onChange={(e) => setWordsText(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Yadda Saxla
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminAntispamManager;
