import { useState, useRef, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle, XCircle, Loader2, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BulkRow {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  status?: "ok" | "error";
  error?: string;
}

interface BulkListingUploadProps {
  storeId: string;
}

const SAMPLE_CSV = `title,description,price,category,condition,location
iPhone 15 Pro 256GB,Tam işlək vəziyyətdə yeni kimi,1500,smartfonlar,Yeni kimi,Bakı
Samsung Galaxy S24,Qutusu açılmayıb orijinal,1200,smartfonlar,Yeni,Sumqayıt
MacBook Air M2,16GB RAM 512GB SSD,2200,noutbuklar,Yeni kimi,Gəncə`;

const parseCSV = (text: string): BulkRow[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // skip header
  return lines.slice(1).map((line) => {
    // Handle quoted values like "a,b" in CSV
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return {
      title: cols[0] || "",
      description: cols[1] || "",
      price: cols[2] || "",
      category: cols[3] || "",
      condition: cols[4] || "Yeni",
      location: cols[5] || "Bakı",
    };
  }).filter(r => r.title);
};

const BulkListingUpload = ({ storeId }: BulkListingUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "numune_elanlar.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const validated = parsed.map(row => {
        if (!row.title) return { ...row, status: "error" as const, error: "Başlıq boşdur" };
        if (!row.price || isNaN(Number(row.price))) return { ...row, status: "error" as const, error: "Qiymət düzgün deyil" };
        if (!row.category) return { ...row, status: "error" as const, error: "Kateqoriya boşdur" };
        return { ...row, status: "ok" as const };
      });
      setRows(validated);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!user || !storeId) return;
    const valid = rows.filter(r => r.status === "ok");
    if (valid.length === 0) {
      toast({ title: "Düzgün elan tapılmadı", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const inserts = valid.map(r => ({
        title: r.title,
        description: r.description,
        price: parseFloat(r.price),
        category: r.category,
        condition: r.condition || "Yeni",
        location: r.location || "Bakı",
        store_id: storeId,
        user_id: user.id,
        is_active: true,
        image_urls: [],
      }));
      const { error } = await supabase.from("listings").insert(inserts);
      if (error) throw error;
      setDone(true);
      setRows([]);
      toast({ title: `${valid.length} elan uğurla yükləndi!` });
    } catch (err: any) {
      toast({ title: "Xəta", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const validCount = rows.filter(r => r.status === "ok").length;
  const errorCount = rows.filter(r => r.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Info card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">CSV formatında toplu yükləmə</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nümunə faylı yükləyin, öz məlumatlarınızla doldurun və yenidən sayta yükləyin.
              Lazım olan sütunlar: <code className="rounded bg-muted px-1 py-0.5 text-[10px]">title, description, price, category, condition, location</code>
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-2 h-8 text-xs"
              onClick={downloadSample}
            >
              <Download className="h-3.5 w-3.5" />
              Nümunə CSV faylını yüklə
            </Button>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">CSV faylını seçin</p>
        <p className="text-xs text-muted-foreground mt-0.5">Klikləyin və ya faylı buraya sürükləyin</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Önizləmə</span>
              {validCount > 0 && (
                <Badge className="bg-green-500/20 text-green-600 border-0 text-[10px]">{validCount} hazır</Badge>
              )}
              {errorCount > 0 && (
                <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">{errorCount} xəta</Badge>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading || validCount === 0}
              className="gap-1.5 bg-gradient-primary text-primary-foreground h-8 text-xs"
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Yüklənir...</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> {validCount} elanı yüklə</>
              )}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-6">#</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Başlıq</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Qiymət</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Kateqoriya</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vəziyyət</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Bölgə</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-6"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${row.status === "error" ? "bg-destructive/5" : ""}`}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium max-w-[160px] truncate">{row.title}</td>
                    <td className="px-3 py-2">{row.price} ₼</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.condition}</td>
                    <td className="px-3 py-2">{row.location}</td>
                    <td className="px-3 py-2">
                      {row.status === "ok" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span title={row.error}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/5 border-t border-border">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-[11px] text-destructive">
                {errorCount} sətirdə xəta var. Bu elanlar yüklənməyəcək.
              </p>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Elanlar uğurla yükləndi! Mağaza elanları bölməsini yeniləyin.
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkListingUpload;
