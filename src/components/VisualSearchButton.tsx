import { Camera, Loader2, X, ScanSearch } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VisualSearchButton = () => {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-16 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        title="Şəkillə axtar"
      >
        <ScanSearch className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-primary" />
              Vizual Axtarış
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Məhsulun şəklini yükləyin və ya kamera ilə çəkin — oxşar elanları tapaq.
            </p>

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
                  <span className="text-sm font-medium">Şəkil çək və ya yüklə</span>
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
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border border-border"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
