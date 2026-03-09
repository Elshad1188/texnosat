import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Send, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminNotificationSender = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [sending, setSending] = useState(false);

  const sendToAllUsers = async () => {
    if (!title.trim()) {
      toast({ title: "Xəta", description: "Başlıq daxil edin", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id");

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        toast({ title: "Xəta", description: "İstifadəçi tapılmadı", variant: "destructive" });
        return;
      }

      // Create notifications for all users
      const notifications = profiles.map((p) => ({
        user_id: p.user_id,
        title: title.trim(),
        message: message.trim() || null,
        link: link.trim() || null,
        type,
        is_read: false,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) throw insertError;

      toast({
        title: "Bildiriş göndərildi",
        description: `${profiles.length} istifadəçiyə bildiriş göndərildi`,
      });

      // Clear form
      setTitle("");
      setMessage("");
      setLink("");
      setType("info");
    } catch (error: any) {
      console.error("Error sending notifications:", error);
      toast({
        title: "Xəta",
        description: error.message || "Bildiriş göndərilmədi",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Bildiriş Göndər
        </CardTitle>
        <CardDescription>
          Bütün istifadəçilərə bildiriş göndərin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Bu bildiriş bütün qeydiyyatlı istifadəçilərə göndəriləcək
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-sm">Başlıq *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bildiriş başlığı"
            className="h-9 text-sm"
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message" className="text-sm">Mesaj</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Əlavə açıqlama (İstəyə bağlı)"
            className="min-h-20 resize-none text-sm"
            maxLength={500}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="link" className="text-sm">Link (İstəyə bağlı)</Label>
          <Input
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/products veya https://example.com"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-sm">Növ</Label>
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Məlumat</SelectItem>
              <SelectItem value="success">Uğurlu</SelectItem>
              <SelectItem value="warning">Xəbərdarlıq</SelectItem>
              <SelectItem value="error">Xəta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={sendToAllUsers}
          disabled={sending || !title.trim()}
          className="w-full bg-gradient-primary text-primary-foreground gap-2 h-9"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Göndərilir...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Hamısına Göndər
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminNotificationSender;
