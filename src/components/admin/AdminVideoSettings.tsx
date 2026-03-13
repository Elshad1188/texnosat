import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Save } from "lucide-react";

const AdminVideoSettings = () => {
  const { toast } = useToast();
  const [maxDuration, setMaxDuration] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "video_settings").maybeSingle();
      if (data?.value && typeof data.value === "object" && "max_duration" in (data.value as any)) {
        setMaxDuration((data.value as any).max_duration);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "video_settings").maybeSingle();
    if (existing) {
      await supabase.from("site_settings").update({ value: { max_duration: maxDuration } as any }).eq("key", "video_settings");
    } else {
      await supabase.from("site_settings").insert({ key: "video_settings", value: { max_duration: maxDuration } as any });
    }
    toast({ title: "Video tənzimləmələri saxlanıldı" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Video Tənzimləmələri</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxDur">Maksimum video müddəti (saniyə)</Label>
        <Input id="maxDur" type="number" min={5} max={300} value={maxDuration} onChange={e => setMaxDuration(Number(e.target.value))} className="max-w-xs" />
        <p className="text-xs text-muted-foreground">İstifadəçilər bu müddətdən uzun video yükləyə bilməyəcəklər</p>
      </div>
      <Button onClick={save} disabled={saving} size="sm">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Saxla
      </Button>
    </div>
  );
};

export default AdminVideoSettings;
