import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Package, Settings, Search, ShoppingBag, Info } from "lucide-react";

interface CjSettings {
  id: number;
  commission_pct: number;
  commission_fixed_azn: number;
  usd_to_azn: number;
  default_category: string | null;
  default_store_id: string | null;
  trend_auto_import: boolean;
  trend_import_limit: number;
}

export default function AdminCJManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CjSettings | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [orderStats, setOrderStats] = useState({ awaiting: 0, placed: 0, shipped: 0 });

  const loadAll = async () => {
    setLoading(true);
    const [{ data: s }, { count: pc }, { data: orders }] = await Promise.all([
      (supabase as any).from("cj_settings").select("*").eq("id", 1).maybeSingle(),
      (supabase as any).from("cj_products").select("*", { count: "exact", head: true }),
      (supabase as any).from("cj_orders").select("status"),
    ]);
    if (s) setSettings(s as CjSettings);
    setProductCount(pc || 0);
    const stats = { awaiting: 0, placed: 0, shipped: 0 };
    (orders || []).forEach((o: any) => {
      if (o.status === "awaiting_admin") stats.awaiting++;
      else if (o.status === "placed") stats.placed++;
      else if (o.status === "shipped" || o.status === "delivered") stats.shipped++;
    });
    setOrderStats(stats);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("cj_settings")
      .update({
        commission_pct: settings.commission_pct,
        commission_fixed_azn: settings.commission_fixed_azn,
        usd_to_azn: settings.usd_to_azn,
        default_category: settings.default_category,
        trend_auto_import: settings.trend_auto_import,
        trend_import_limit: settings.trend_import_limit,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast({ title: "Xəta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Yadda saxlanıldı", description: "CJ parametrləri yeniləndi" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const examplePrice = settings
    ? (10 * settings.usd_to_azn * (1 + settings.commission_pct / 100) + settings.commission_fixed_azn).toFixed(2)
    : "0";

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold mb-1">CJ Dropshipping API açarı tələb olunur</p>
            <p className="text-muted-foreground">
              Məhsulları idxal etmək və avtomatik sifariş vermək üçün{" "}
              <a href="https://developers.cjdropshipping.com" target="_blank" rel="noopener" className="text-primary underline">
                developers.cjdropshipping.com
              </a>{" "}
              saytında qeydiyyatdan keçin və API açarı alın. Açar hazır olduqda mənə deyin —{" "}
              təhlükəsiz şəkildə əlavə edəcəm və axtarış/idxal funksionallığı aktivləşəcək.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">İdxal olunmuş məhsul</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{orderStats.awaiting}</div>
            <p className="text-xs text-muted-foreground">Təsdiq gözləyən</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{orderStats.placed}</div>
            <p className="text-xs text-muted-foreground">CJ-də verilmiş</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{orderStats.shipped}</div>
            <p className="text-xs text-muted-foreground">Göndərilmiş/çatdırılmış</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings"><Settings className="h-3.5 w-3.5 mr-1" /> Parametrlər</TabsTrigger>
          <TabsTrigger value="import" disabled><Search className="h-3.5 w-3.5 mr-1" /> İdxal</TabsTrigger>
          <TabsTrigger value="products" disabled><Package className="h-3.5 w-3.5 mr-1" /> Məhsullar</TabsTrigger>
          <TabsTrigger value="orders" disabled><ShoppingBag className="h-3.5 w-3.5 mr-1" /> Sifarişlər</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Qiymət və avtomatlaşdırma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Komissiya (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.commission_pct}
                        onChange={(e) =>
                          setSettings({ ...settings, commission_pct: parseFloat(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">CJ qiymətinə faizlə əlavə</p>
                    </div>
                    <div>
                      <Label>Sabit əlavə (AZN)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.commission_fixed_azn}
                        onChange={(e) =>
                          setSettings({ ...settings, commission_fixed_azn: parseFloat(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">Hər məhsula sabit AZN əlavə</p>
                    </div>
                    <div>
                      <Label>USD → AZN məzənnə</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.usd_to_azn}
                        onChange={(e) =>
                          setSettings({ ...settings, usd_to_azn: parseFloat(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">Cari valyuta məzənnəsi</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="text-muted-foreground">Nümunə hesablama:</span>{" "}
                    CJ-də <b>10 USD</b> → saytda{" "}
                    <Badge variant="secondary" className="ml-1 text-base">{examplePrice} ₼</Badge>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Trend məhsulları avtomatik idxal et</Label>
                        <p className="text-xs text-muted-foreground">
                          Hər gün CJ-nin bestseller siyahısından məhsulları çəkir
                        </p>
                      </div>
                      <Switch
                        checked={settings.trend_auto_import}
                        onCheckedChange={(v) => setSettings({ ...settings, trend_auto_import: v })}
                      />
                    </div>
                    <div>
                      <Label>Gündəlik trend limiti</Label>
                      <Input
                        type="number"
                        value={settings.trend_import_limit}
                        onChange={(e) =>
                          setSettings({ ...settings, trend_import_limit: parseInt(e.target.value) || 0 })
                        }
                        className="max-w-[180px]"
                      />
                    </div>
                    <div>
                      <Label>Default kateqoriya (sayt slug)</Label>
                      <Input
                        value={settings.default_category || ""}
                        onChange={(e) => setSettings({ ...settings, default_category: e.target.value })}
                        placeholder="məs. elektronika"
                        className="max-w-[300px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        İdxal olunan məhsullar default olaraq bu kateqoriyaya düşür
                      </p>
                    </div>
                  </div>

                  <Button onClick={saveSettings} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Yadda saxla
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
