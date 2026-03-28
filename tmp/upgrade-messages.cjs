const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Messages.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  `Check, CheckCheck, Store, Trash2, MoreVertical } from "lucide-react";`,
  `Check, CheckCheck, Store, Trash2, MoreVertical, Paperclip, Mic } from "lucide-react";`
);

// 2. Types
content = content.replace(
  `  is_read: boolean | null;`,
  `  is_read: boolean | null;\n  is_delivered: boolean | null;\n  image_url: string | null;\n  audio_url: string | null;`
);

// 3. States & Ref definitions
content = content.replace(
  `  const messagesEndRef = useRef<HTMLDivElement>(null);`,
  `  const messagesEndRef = useRef<HTMLDivElement>(null);\n  const [isTyping, setIsTyping] = useState(false);\n  const [uploadingMedia, setUploadingMedia] = useState(false);\n  const [isRecording, setIsRecording] = useState(false);\n  const fileInputRef = useRef<HTMLInputElement>(null);\n  const mediaRecorderRef = useRef<MediaRecorder | null>(null);\n  const audioChunksRef = useRef<Blob[]>([]);`
);

// 4. Media Handlers
const mediaFunctions = `
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConvoId) return;
    try {
      setUploadingMedia(true);
      const ext = file.name.split('.').pop();
      const fileName = \`\${Math.random()}.\${ext}\`;
      const filePath = \`\${user.id}/\${fileName}\`;
      const { error: uploadError } = await supabase.storage.from("chat_media").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(filePath);
      
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: "Fotoşəkil",
        image_url: publicUrl,
      });
      if (msgErr) throw msgErr;
    } catch (err: any) {
      toast({ title: "Şəkil göndərilmədi", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = uploadAudio;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Mikrofona icazə lazımdır", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const uploadAudio = async () => {
    if (!user || !activeConvoId) return;
    try {
      setUploadingMedia(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const fileName = \`\${Math.random()}.webm\`;
      const filePath = \`\${user.id}/\${fileName}\`;
      const { error: uploadError } = await supabase.storage.from("chat_media").upload(filePath, audioBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(filePath);
      
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: activeConvoId,
        sender_id: user.id,
        content: "Səsli mesaj",
        audio_url: publicUrl,
      });
      if (msgErr) throw msgErr;
    } catch (err: any) {
      toast({ title: "Səs göndərilmədi", variant: "destructive" });
    } finally {
      setUploadingMedia(false);
    }
  };
`;
content = content.replace(
  `  const removeMessageFromCache = (messageId: string) => {`,
  mediaFunctions + `\n  const removeMessageFromCache = (messageId: string) => {`
);

// 5. Broadcast Subscribe
content = content.replace(
  `      .on("postgres_changes", {`,
  `      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== user?.id) {
          setIsTyping(true);
          clearTimeout((window as any).typingTimer);
          (window as any).typingTimer = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .on("postgres_changes", {`
);

// 6. Sidebar Online Truncate Update
const isOnlineCheck = `\n  const isOnline = activeConvo?.profile?.last_seen && (Date.now() - new Date(activeConvo.profile.last_seen).getTime() < 120000);`;
content = content.replace(
  `  const activeConvo = conversations.find((c: any) => c.id === activeConvoId);`,
  `  const activeConvo = conversations.find((c: any) => c.id === activeConvoId);` + isOnlineCheck
);

// 7. Header UI
content = content.replace(
  `                    {activeConvo.listing && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activeConvo.listing.title}
                      </p>
                    )}`,
  `                    {isTyping ? (
                      <p className="text-xs text-primary font-medium animate-pulse">Yazır...</p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">
                        {activeConvo.isStore && activeConvo.listing ? activeConvo.listing.title : (
                          isOnline ? <span className="text-green-500 font-medium">Onlayn</span> : activeConvo.profile?.last_seen ? <span>Son görülmə: {formatTime(activeConvo.profile.last_seen)}</span> : "Oflayn"
                        )}
                      </p>
                    )}`
);

// 8. Ticks in sidebar
content = content.replace(
  `                              {c.lastMsg.is_read ? (
                                <CheckCheck className="inline h-3 w-3 text-sky-500" />
                              ) : (
                                <Check className="inline h-3 w-3 text-muted-foreground" />
                              )}`,
  `                              {c.lastMsg.is_read ? (
                                <CheckCheck className="inline h-3 w-3 text-sky-500" />
                              ) : c.lastMsg.is_delivered ? (
                                <CheckCheck className="inline h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Check className="inline h-3 w-3 text-muted-foreground" />
                              )}`
);

// 9. Input & Appendages UI
content = content.replace(
  `                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Mesaj yazın..."
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!messageText.trim() || sendMessage.isPending}
                      className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>`,
  `                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }}
                    className="flex items-center gap-2"
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <Button type="button" size="icon" variant="ghost" className="text-muted-foreground shrink-0 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}>
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Input
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        supabase.channel(\`messages-\${activeConvoId}\`).send({ type: "broadcast", event: "typing", payload: { user_id: user.id } }).catch(()=>{});
                      }}
                      placeholder={isRecording ? "Səs yazılır..." : uploadingMedia ? "Yüklənir..." : "Mesaj yazın..."}
                      className="flex-1 rounded-full px-4"
                      disabled={isRecording || uploadingMedia}
                    />
                    {messageText.trim() ? (
                      <Button type="submit" size="icon" disabled={sendMessage.isPending || uploadingMedia} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shrink-0 rounded-full shadow-md">
                        <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" size="icon" variant={isRecording ? "destructive" : "secondary"} className={\`shrink-0 rounded-full shadow-md \${isRecording ? "animate-pulse" : ""}\`} onClick={isRecording ? stopRecording : startRecording} disabled={uploadingMedia}>
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                  </form>`
);

// 10. Bubble UI Media and Ticks
content = content.replace(
  `                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            <div className={\`flex items-center justify-end gap-1 mt-1 \${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}\`}>
                              <span className="text-[10px]">
                                {new Date(m.created_at).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMine && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-0.5 ml-1 cursor-help">
                                      {m.is_read ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-sky-300 fill-sky-300/20" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 opacity-70" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-[10px]">
                                      {m.is_read ? "Oxundu" : "Göndərildi"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>`,
  `                            {m.image_url && (
                              <div className="mb-2 w-48 sm:w-64 overflow-hidden rounded-lg bg-black/5">
                                <img src={m.image_url} alt="Şəkil" className="w-full h-auto object-cover" />
                              </div>
                            )}
                            {m.audio_url && (
                              <div className="mb-2 w-48 sm:w-64">
                                <audio controls src={m.audio_url} className="h-10 w-full" />
                              </div>
                            )}
                            {m.content && m.content !== "Fotoşəkil" && m.content !== "Səsli mesaj" && (
                              <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            )}
                            <div className={\`flex items-center justify-end gap-1 mt-1 \${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}\`}>
                              <span className="text-[10px]">
                                {new Date(m.created_at).toLocaleTimeString("az", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMine && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-0.5 ml-1 cursor-help">
                                      {m.is_read ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-sky-300 fill-sky-300/20" />
                                      ) : m.is_delivered ? (
                                        <CheckCheck className="h-3.5 w-3.5 opacity-80" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 opacity-70" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-[10px]">
                                      {m.is_read ? "Oxundu" : m.is_delivered ? "Çatdı" : "Göndərildi"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Messages.tsx successfully updated!');
