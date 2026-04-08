"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="typing-dot w-2 h-2 rounded-full bg-white/60" />
      <div className="typing-dot w-2 h-2 rounded-full bg-white/60" />
      <div className="typing-dot w-2 h-2 rounded-full bg-white/60" />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-[2px] px-5 py-3.5 ${
          isUser
            ? "bg-white/20 backdrop-blur-md border border-white/20 text-white"
            : "bg-white/10 backdrop-blur-md border border-white/10 text-white/90"
        }`}
      >
        {!isUser && (
          <span className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-sans">
            Novera AI
          </span>
        )}
        <div className="prose-chat text-sm font-light leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Check Ollama status on mount
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const res = await fetch("/api/chat", { method: "GET" });
        const data = await res.json();
        setOllamaStatus(data.status === "ok" ? "online" : "offline");
      } catch {
        setOllamaStatus("offline");
      }
    };
    checkOllama();
    const interval = setInterval(checkOllama, 10000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I apologize, but I encountered an error: ${errorMessage}. Please ensure Ollama is running and try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="relative w-full h-screen min-h-[700px] flex flex-col overflow-hidden">
      {/* Background - same as NOVERA hero */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/46011e44-1f9d-4c5e-b716-300b8ce1381e_3840w.jpg"
          alt="Luxury Interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 fade-in-up">
        <div>
          <h1 className="text-white font-serif text-2xl tracking-tight">
            Novera
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-white/50 font-sans">
            AI Assistant
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              ollamaStatus === "online"
                ? "bg-emerald-400"
                : ollamaStatus === "offline"
                ? "bg-red-400"
                : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-[10px] uppercase tracking-widest text-white/50 font-sans">
            {ollamaStatus === "online"
              ? "Ollama Connected"
              : ollamaStatus === "offline"
              ? "Ollama Offline"
              : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Chat Area */}
      <div className="relative z-10 flex-1 overflow-y-auto chat-scroll px-6 md:px-12 py-4">
        <div className="max-w-[900px] mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center fade-in-up">
              <h2 className="text-4xl md:text-6xl lg:text-7xl text-white font-serif tracking-tight leading-[1.1] mb-6">
                <span className="block">How can I</span>
                <span className="block">assist you?</span>
              </h2>
              <p className="text-white/60 text-sm md:text-base font-sans font-light max-w-lg mb-8">
                Powered by Ollama. Ask me anything and I will respond in real
                time.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  "Explain quantum computing",
                  "Write a haiku about design",
                  "Help me brainstorm ideas",
                  "Tell me about Montreal",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-[10px] uppercase tracking-widest bg-white/10 backdrop-blur-md border border-white/20 text-white/70 px-4 py-2 rounded-[2px] hover:bg-white/20 hover:text-white transition-all duration-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isLoading &&
            messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start mb-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[2px]">
                  <TypingIndicator />
                </div>
              </div>
            )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="relative z-10 px-6 md:px-12 pb-8 pt-4 fade-in-up">
        <div className="max-w-[900px] mx-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2px] px-6 py-4 flex items-end gap-4">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm font-light placeholder:text-white/40 resize-none outline-none max-h-32 leading-relaxed"
              style={{
                height: "auto",
                minHeight: "24px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height =
                  Math.min(target.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="text-[10px] uppercase tracking-widest bg-white text-primary px-6 py-2.5 rounded-[2px] font-medium hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
          <p className="text-center text-white/30 text-[10px] uppercase tracking-widest mt-4 font-sans">
            Press Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      </div>
    </main>
  );
}
