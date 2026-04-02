import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Loader2, Bot, User, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ message: userMsg.content, history: messages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              const text = assistantText;
              setMessages(prev =>
                prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m)
              );
            }
          } catch {
            // partial json, wait for more
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // If no content was streamed, show fallback
      if (!assistantText) {
        setMessages(prev =>
          prev.map((m, i) => i === prev.length - 1 ? { ...m, content: "Bağışlayın, cavab verə bilmədim." } : m)
        );
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Bağışlayın, xəta baş verdi. Zəhmət olmasa yenidən cəhd edin." }]);
    }
    setLoading(false);
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all md:bottom-6"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-16 right-3 z-50 flex h-[480px] w-[340px] flex-col rounded-2xl border border-border bg-card shadow-2xl md:bottom-4 md:right-4 md:w-[380px]">
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
              <div>
                <h3 className="text-sm font-bold text-primary-foreground">Elan24 Köməkçi</h3>
                <p className="text-[10px] text-primary-foreground/70">Sizə necə kömək edə bilərəm?</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10" onClick={() => { setOpen(false); navigate("/support"); }} title="Dəstək sorğusu">
                <LifeBuoy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <Bot className="h-10 w-10 text-primary/30 mb-3" />
                <p className="text-sm text-muted-foreground">Salam! 👋</p>
                <p className="text-xs text-muted-foreground mt-1">Sayt haqqında hər hansı sualınız varsa soruşun</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {["Elan necə yerləşdirim?", "Mağaza necə açım?", "Premium nədir?", "Balans necə artırım?", "Sifariş necə verim?", "Çarx çevirmə nədir?"].map((q) => (
                    <button key={q} className="rounded-full border border-border px-3 py-1.5 text-[11px] text-foreground hover:bg-muted transition-colors" onClick={() => setInput(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-xs dark:prose-invert max-w-none [&>*]:m-0 [&>*+*]:mt-1">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Mesaj yazın..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[36px] max-h-[80px] resize-none text-xs"
              />
              <Button size="icon" className="h-9 w-9 shrink-0 bg-gradient-primary text-primary-foreground" onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
