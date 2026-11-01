import { Camera, Loader2, X, ScanSearch } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const VisualSearchButton = () => {
  const { language } = useLanguage();
  const ru = language === "ru";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Şəkil 5MB-dan böyük olmamalıdır");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string) => {
    setLoading(true);
    setDescription("");
    try {
      const { data, error } = await supabase.functions.invoke("visual-search", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      setDescription(data.description || "");

      const params = new URLSearchParams();
      if (data.keywords) params.set("search", data.keywords);
      if (data.category) params.set("category", data.category);

      setOpen(false);
      setPreview(null);
      navigate(`/products?${params.toString()}`);
      toast.success("Oxşar məhsullar axtarılır...");
    } catch (err) {
      console.error(err);
      toast.error("Şəkil analiz edilə bilmədi. Yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setDescription("");
    setLoading(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-11 shrink-0 rounded-md border border-border bg-muted/30 text-foreground hover:bg-accent hover:text-primary [&_svg]:size-5"
        aria-label={ru ? "Поиск по фото" : "Şəkillə axtar"}
        title={ru ? "Поиск по фото" : "Şəkillə axtar"}
      >
        <ScanSearch className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-primary" />
              {ru ? "Поиск по фото" : "Şəkillə axtarış"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!preview ? (
              <div className="flex flex-col gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button
                  variant="outline"
                  className="h-32 border-dashed border-2 flex flex-col gap-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">{ru ? "Снять или загрузить фото" : "Şəkil çək və ya yüklə"}</span>
                </Button>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={preview}
                  alt="Yüklənmiş şəkil"
                  className="w-full max-h-64 object-contain rounded-xl border border-border"
                />
                {!loading && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={ru ? "Удалить фото" : "Şəkli sil"}
                    onClick={reset}
                    className="absolute top-2 right-2 h-10 w-10 rounded-md bg-background/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <span className="text-sm font-medium text-foreground">Analiz edilir...</span>
                  </div>
                )}
                {description && !loading && (
                  <p className="mt-2 text-sm text-muted-foreground text-center">{description}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VisualSearchButton;
