import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Bot, Link2, Copy, Settings, Trash2 } from "lucide-react";

interface TelegramBotTabProps {
  storeId: string;
}

const TelegramBotTab = ({ storeId }: TelegramBotTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: botSettings, isLoading } = useQuery({
    queryKey: ["telegram-bot-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("telegram_bot_settings" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const botLink = `https://t.me/Elan24_bot?start=${user?.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(botLink);
    toast({ title: "Kopyalandı", description: "Bot linki kopyalandı" });
  };

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      if (botSettings) {
        await supabase
          .from("telegram_bot_settings" as any)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", botSettings.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-bot-settings"] });
      toast({ title: "Yeniləndi" });
    },
  });

  const deleteSettings = useMutation({
    mutationFn: async () => {
      if (botSettings) {
        await supabase
          .from("telegram_bot_settings" as any)
          .delete()
          .eq("id", botSettings.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-bot-settings"] });
      toast({ title: "Bot bağlantısı silindi" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            Telegram Bot İnteqrasiyası
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-2">Necə işləyir?</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Aşağıdakı linkə basaraq Telegram botunu açın</li>
              <li>Botda /start düyməsinə basın — hesabınız avtomatik bağlanacaq</li>
              <li>Mağaza seçin: /store 1</li>
              <li>Qiymət əlavəsi təyin edin: /markup faiz 20</li>
              <li>Qrupdan məhsul mesajını bota forward edin — elan avtomatik yaradılacaq!</li>
            </ol>
          </div>

          {/* Bot Link */}
          <div>
            <Label className="text-xs">Bot Linki</Label>
            <div className="flex gap-2 mt-1">
              <Input value={botLink} readOnly className="text-xs" />
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1 shrink-0">
                <Copy className="h-3.5 w-3.5" /> Kopyala
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Bu linkə basaraq Telegram-da botu açın. Hesabınız avtomatik bağlanacaq.
            </p>
          </div>

          {/* Status */}
          {botSettings ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <Link2 className="h-3 w-3 mr-1" /> Bağlıdır
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Chat ID: {botSettings.telegram_chat_id}
                </span>
              </div>

              {/* Markup Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Əlavə tipi</Label>
                  <Select
                    value={botSettings.markup_type}
                    onValueChange={(v) => updateSettings.mutate({ markup_type: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Faizlə (%)</SelectItem>
                      <SelectItem value="fixed">Sabit (₼)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Əlavə dəyəri</Label>
                  <Input
                    type="number"
                    value={botSettings.markup_value}
                    onChange={(e) => updateSettings.mutate({ markup_value: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Defolt kateqoriya</Label>
                <Input
                  value={botSettings.target_category}
                  onChange={(e) => updateSettings.mutate({ target_category: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Defolt bölgə</Label>
                <Input
                  value={botSettings.target_location}
                  onChange={(e) => updateSettings.mutate({ target_location: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => deleteSettings.mutate()}
              >
                <Trash2 className="h-3.5 w-3.5" /> Bağlantını sil
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Bot hələ bağlanmayıb</p>
              <p className="text-xs mt-1">Yuxarıdakı linkə basaraq botu Telegram-da açın</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot Commands Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" /> Bot Komandaları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {[
              { cmd: "/start", desc: "Botu aktivləşdir və hesabı bağla" },
              { cmd: "/store [nömrə]", desc: "Mağaza seçin" },
              { cmd: "/markup faiz 20", desc: "20% qiymət əlavəsi" },
              { cmd: "/markup sabit 10", desc: "10₼ sabit əlavə" },
              { cmd: "/category [slug]", desc: "Kateqoriya dəyiş" },
              { cmd: "/settings", desc: "Cari parametrləri göstər" },
            ].map((item) => (
              <div key={item.cmd} className="flex gap-2">
                <code className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono shrink-0">{item.cmd}</code>
                <span className="text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramBotTab;
