import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Music, Loader2, Sparkles, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Song } from "@/data/mockSongs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  songs?: Song[];
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySong?: (song: Song) => void;
}

const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MOCK_SONGS: Song[] = [
  { id: "1", youtubeId: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", artist: "Rick Astley", album: "Whenever You Need Somebody", cover: "", duration: 213, votes: 12, isDownloaded: false },
  { id: "2", youtubeId: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", cover: "", duration: 354, votes: 8, isDownloaded: false },
  { id: "3", youtubeId: "hTWKbfoikeg", title: "Smells Like Teen Spirit", artist: "Nirvana", album: "Nevermind", cover: "", duration: 301, votes: 15, isDownloaded: false },
  { id: "4", youtubeId: "YQHsXMglC9A", title: "Hello", artist: "Adele", album: "25", cover: "", duration: 295, votes: 5, isDownloaded: false },
  { id: "5", youtubeId: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", album: "Vida", cover: "", duration: 282, votes: 20, isDownloaded: false },
  { id: "6", youtubeId: "RgKAFK5djSk", title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth", album: "Furious 7", cover: "", duration: 237, votes: 3, isDownloaded: false },
  { id: "7", youtubeId: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran", album: "÷", cover: "", duration: 234, votes: 9, isDownloaded: false },
  { id: "8", youtubeId: "CevxZvSJLk8", title: "Roar", artist: "Katy Perry", album: "Prism", cover: "", duration: 224, votes: 7, isDownloaded: false },
];

const SYSTEM_PROMPT = `Você é Xerife, um assistente amigável e conversacional do Xerife Hub, um app de música.

Sobre você:
- Você é acolhedor, humorado e adora conversar sobre música
- Você pode falar sobre qualquer assunto, não apenas música
- Use emojis com moderação para deixar a conversa mais divertida
- Seja natural e conversacional, como um amigo
- Se o usuário perguntar sobre música, seja útil e sugira músicas do catálogo

Catálogo de músicas disponíveis:
${MOCK_SONGS.map(s => `• "${s.title}" - ${s.artist} (${s.album})`).join('\n')}

Quando o usuário mencionar uma música ou artista, você pode sugerir que ele toque a música. Você pode buscar músicas por:
- Nome da música ou artista
- Descrição ou sentimento
- Trecho de letra
- Gênero ou década

Responda de forma natural e concisa. Se não souber algo, seja honesto mas ofereça ajuda do que puder.`;

const AIChat = ({ isOpen, onClose, onPlaySong }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o Xerife, seu assistente musical! 🎵\n\nPosso te ajudar a encontrar músicas, mas também posso conversar sobre qualquer assunto que você quiser.\n\nO que você gostaria de ouvir ou聊聊 sobre hoje?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{role: string; content: string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const searchLocalSongs = (query: string): Song[] => {
    const q = query.toLowerCase();
    const keywords = q.split(/\s+/);
    
    return MOCK_SONGS.filter(song => {
      const searchText = `${song.title} ${song.artist} ${song.album}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword));
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const newHistory = [...conversationHistory, { role: "user", content: input.trim() }];

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newHistory.slice(-10),
            { role: "user", content: input.trim() }
          ],
          temperature: 0.8,
          max_tokens: 1024,
          top_p: 0.9,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Groq API error:", errorData);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || 
        "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?";

      setConversationHistory([...newHistory, { role: "assistant", content: assistantContent }]);

      const localSongs = searchLocalSongs(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        songs: localSongs.length > 0 ? localSongs : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Chat error:", error);
      
      const localSongs = searchLocalSongs(input);
      
      if (localSongs.length > 0) {
        const songList = localSongs.map(s => `• "${s.title}" - ${s.artist}`).join("\n");
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Encontrei estas músicas no catálogo que talvez você goste! 🎵\n\n${songList}\n\nQuer que eu toque alguma?`,
          songs: localSongs
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Ops! Tive um probleminha de conexão aqui. 😅\n\nTente novamente ou me pergunta de outra forma!"
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Conversa limpa! 🧹\n\nSobre o que você quer conversar agora?"
    }]);
    setConversationHistory([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full h-[85vh] sm:h-[75vh] sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Xerife AI</h2>
                  <p className="text-[10px] text-muted-foreground">Powered by Groq</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-colors"
                  title="Limpar conversa"
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-card to-card/50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={16} className="text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary/80 text-foreground rounded-bl-md backdrop-blur-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.songs && msg.songs.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-wrap gap-2 mt-2"
                      >
                        {msg.songs.map((song) => (
                          <button
                            key={song.id}
                            onClick={() => onPlaySong?.(song)}
                            className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-full text-xs font-medium text-primary transition-all hover:scale-105 active:scale-95"
                          >
                            <Music size={14} />
                            <span className="max-w-[120px] truncate">{song.title}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5 justify-start"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-secondary/80 backdrop-blur-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {!input && messages.length > 1 && (
              <div className="px-4 py-2 border-t border-border/50 bg-card/50">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {["Tocar algo relaxante", "Músicas anos 80", "Rock clássico", "Sugira algo novo"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="flex-shrink-0 px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border bg-card/95 backdrop-blur-md">
              <div className="flex items-center gap-3 bg-secondary/50 hover:bg-secondary rounded-full px-4 py-2 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Conversar com Xerife AI..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="text-primary-foreground animate-spin" />
                  ) : (
                    <Send size={16} className="text-primary-foreground" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Xerife AI pode cometer erros. Considere verificar informações importantes.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIChat;
