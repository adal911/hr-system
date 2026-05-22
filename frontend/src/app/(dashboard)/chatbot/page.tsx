"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send,
  Bot,
  User,
  Loader2,
  Plus,
  MessageSquare,
  Trash2,
  FileText,
  Sparkles,
} from "lucide-react";

interface ChatSource {
  chunk_id: string;
  candidate_name: string;
  score: number;
}

interface ChatMessage {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

interface ChatSession {
  _id: string;
  document_id: string;
  candidate_name: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SessionDetail extends ChatSession {
  messages: ChatMessage[];
}

interface Resume {
  _id: string;
  candidate_name: string;
  file_type: string;
}

interface ChatResponse {
  query: string;
  response: string;
  sources: ChatSource[];
}

export default function ChatbotPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [showNewChat, setShowNewChat] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [creating, setCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.get<ChatSession[]>("/chatbot/sessions/", token);
      setSessions(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowNewChat(false);
    setMessages([]);

    try {
      const data = await api.get<SessionDetail>(
        `/chatbot/sessions/${sessionId}/`,
        token
      );
      setMessages(
        data.messages.map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load messages");
    }
  };

  const handleNewChat = async () => {
    setShowNewChat(true);
    setActiveSessionId(null);
    setMessages([]);

    if (resumes.length === 0) {
      try {
        const data = await api.get<Resume[]>("/resumes/", token);
        setResumes(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load resumes");
      }
    }
  };

  const createSession = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume");
      return;
    }

    setCreating(true);
    try {
      const data = await api.post<ChatSession>(
        "/chatbot/sessions/",
        { document_id: selectedResumeId },
        token
      );
      setSessions((prev) => [data, ...prev]);
      setActiveSessionId(data._id);
      setShowNewChat(false);
      setSelectedResumeId("");
      setMessages([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || sending || !activeSessionId) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setSending(true);

    try {
      const data = await api.post<ChatResponse>(
        `/chatbot/sessions/${activeSessionId}/messages/`,
        { query },
        token
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, sources: data.sources },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat session?")) return;

    try {
      await api.delete(`/chatbot/sessions/${sessionId}/`, token);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      toast.success("Session deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const activeSession = sessions.find((s) => s._id === activeSessionId);

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4 overflow-hidden">
      {/* Sessions sidebar */}
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 card-elevated">
        <div className="border-b border-border/60 p-3">
          <Button
            onClick={handleNewChat}
            className="w-full gap-1.5 shadow-md shadow-primary/15"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center px-3 py-8 text-center">
              <MessageSquare className="mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                No sessions yet.
                <br />
                Start a new chat to ground answers in a specific resume.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const isActive = activeSessionId === session._id;
                return (
                  <div
                    key={session._id}
                    onClick={() => openSession(session._id)}
                    className={`group flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      isActive
                        ? "bg-linear-to-br from-primary to-chart-4 text-primary-foreground"
                        : "bg-muted/60"
                    }`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {session.candidate_name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {session.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteSession(session._id, e)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 card-elevated">
        {activeSession && (
          <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-chart-4 text-sm font-semibold text-primary-foreground shadow">
              {activeSession.candidate_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{activeSession.candidate_name}</h2>
              <p className="truncate text-xs text-muted-foreground">
                <FileText className="mr-1 inline h-3 w-3" />
                Resume-grounded chat
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              RAG
            </span>
          </div>
        )}

        {/* New chat selector */}
        {showNewChat && !activeSessionId && (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/60 p-6">
              <div className="mb-4 flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-chart-4 text-primary-foreground shadow-md shadow-primary/20">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Start a new chat</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a resume to scope the conversation.
                </p>
              </div>

              <div className="space-y-3">
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select a resume…" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume._id} value={resume._id}>
                        {resume.candidate_name} ({resume.file_type.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={createSession}
                  disabled={!selectedResumeId || creating}
                  className="h-11 w-full gap-1.5 shadow-md shadow-primary/15"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Start chat
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!showNewChat && !activeSessionId && (
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-7 w-7" />
            </div>
            <p className="text-lg font-semibold">HR Data Room Assistant</p>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Pick a session from the left or start a new one to chat about a candidate&apos;s resume.
            </p>
            <Button onClick={handleNewChat} className="mt-5 gap-1.5 shadow-md shadow-primary/15">
              <Plus className="h-4 w-4" /> New chat
            </Button>
          </div>
        )}

        {/* Active conversation */}
        {activeSessionId && (
          <>
            <div className="flex-1 space-y-4 overflow-auto p-6">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Ask anything about {activeSession?.candidate_name}&apos;s resume.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-chart-4 text-primary-foreground shadow-md shadow-primary/20">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.role === "user" ? "order-first" : ""}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/60 bg-card"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Sources:
                        </span>
                        {[...new Set(msg.sources.map((s) => s.candidate_name))].map((name) => (
                          <span
                            key={name}
                            className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-chart-4 text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-border/60 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`Ask about ${activeSession?.candidate_name}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                  className="flex-1 h-11"
                />
                <Button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="h-11 gap-1.5 shadow-md shadow-primary/15"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
