"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { AgentInfo, ChatMessage } from "@/types";
import { createSession, checkAllAgentsHealth } from "@/lib/api";
import { streamRoute } from "@/lib/sse";
import ChatMessageBubble from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import AgentStatusPanel from "@/components/AgentStatusPanel";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { BotMessageSquare, Sparkles, Menu, X } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

// Static agent definitions from your multi-agent.example.yaml
const STATIC_AGENTS: AgentInfo[] = [
  {
    id: "qa-agent",
    name: "QA Agent",
    description: "Tra cứu quy trình, chính sách VNG",
    capabilities: ["chat"],
  },
  {
    id: "meeting-agent",
    name: "Meeting Agent",
    description: "Tạo cuộc họp, thêm thành viên, quản lý cuộc họp",
    capabilities: ["create_meeting", "add_members", "manage_meeting"],
  },
];

// Route → agent ID mapping (mirrors route_to_agent in config)
const ROUTE_TO_AGENT: Record<string, string> = {
  meeting: "meeting-agent",
  "general-chatbot": "qa-agent",
  "system-capabilities": "qa-agent",
  default: "qa-agent",
};

function ChatPageContent() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>(STATIC_AGENTS);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loadingSession, setLoadingSession] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [isStreamingEnabled, setIsStreamingEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`agent_messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Restore messages when session is loaded
  useEffect(() => {
    if (sessionId) {
      const savedMessages = localStorage.getItem(`agent_messages_${sessionId}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const restored = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(restored);
          console.log("Restored", restored.length, "messages for session:", sessionId);
        } catch (error) {
          console.error("Failed to restore messages:", error);
        }
      }
    }
  }, [sessionId]);

  // Poll agent health every 30s
  const pollHealth = useCallback(async () => {
    try {
      const healthData = await checkAllAgentsHealth(accessToken || undefined);

      if (!healthData) {
        // If health check fails, mark all agents as having unknown health
        console.warn("Health check returned no data");
        setAgents(STATIC_AGENTS.map(a => ({ ...a, healthy: undefined })));
        return;
      }

      // Create a map of agent_id to health status
      const healthMap = new Map(
        healthData.agents.map(a => [a.agent_id, a.healthy])
      );

      // Update agents with health status from backend
      const updated = STATIC_AGENTS.map(a => ({
        ...a,
        healthy: healthMap.get(a.id) ?? undefined,
      }));

      setAgents(updated);
    } catch (error) {
      console.error("Health check failed:", error);
      // If health check fails, mark all agents as having unknown health
      setAgents(STATIC_AGENTS.map(a => ({ ...a, healthy: undefined })));
    }
  }, [accessToken]);

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 30_000);
    return () => clearInterval(interval);
  }, [pollHealth]);

  // Initialize or restore session on mount
  useEffect(() => {
    const initSession = async () => {
      setLoadingSession(true);
      try {
        // Try to restore existing session from localStorage
        const savedSessionId = localStorage.getItem("agent_session_id");

        if (savedSessionId) {
          console.log("Restoring session:", savedSessionId);
          setSessionId(savedSessionId);
          return;
        }

        // No saved session, create a new one
        console.log("Creating new session...");
        const session = await createSession(accessToken || undefined);
        setSessionId(session.session_id);
        localStorage.setItem("agent_session_id", session.session_id);
        setMessages([]);
      } catch (error) {
        console.error("Session initialization failed:", error);
        // If backend unreachable, create a local session ID
        const localSessionId = uuidv4();
        setSessionId(localSessionId);
        localStorage.setItem("agent_session_id", localSessionId);
        setMessages([]);
      } finally {
        setLoadingSession(false);
      }
    };

    initSession();
  }, []); // Run once on mount

  // Create new session (called by "New Session" button)
  const startNewSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      // Clear old messages for previous session
      if (sessionId) {
        localStorage.removeItem(`agent_messages_${sessionId}`);
      }

      const session = await createSession(accessToken || undefined);
      setSessionId(session.session_id);
      localStorage.setItem("agent_session_id", session.session_id);
      setMessages([]);
    } catch {
      // Clear old messages for previous session
      if (sessionId) {
        localStorage.removeItem(`agent_messages_${sessionId}`);
      }

      // If backend unreachable, create a local session ID
      const localSessionId = uuidv4();
      setSessionId(localSessionId);
      localStorage.setItem("agent_session_id", localSessionId);
      setMessages([]);
    } finally {
      setLoadingSession(false);
    }
  }, [accessToken, sessionId]);

  const handleSend = useCallback(
    async (text: string) => {
      if (streaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);

      // Placeholder assistant message
      const assistantId = uuidv4();
      let resolvedAgentId: string | undefined;
      let resolvedAgentName: string | undefined;
      let resolvedRoute: string | undefined;

      const placeholderMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: isStreamingEnabled,
        timestamp: new Date(),
        toolCalls: [],
      };

      await streamRoute(text, sessionId, {
        onChunk(chunk) {
          setThinking(false);
          setStreaming(true);
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === assistantId);
            if (!exists) {
              return [
                ...prev,
                { ...placeholderMsg, content: chunk, agentId: resolvedAgentId, agentName: resolvedAgentName, route: resolvedRoute },
              ];
            }
            return prev.map((m) => {
              if (m.id !== assistantId) return m;
              // Text arriving means the agent is done executing tools.
              // Transition any still-running tools to "success" so the text bubble can appear.
              const toolCalls = m.toolCalls?.map((tc) =>
                tc.status === "running" ? { ...tc, status: "success" as const } : tc
              );
              return { ...m, content: isStreamingEnabled ? m.content + chunk : chunk, toolCalls };
            });
          });
        },
        onAgent(agentId, route) {
          resolvedAgentId = agentId || ROUTE_TO_AGENT[route] || "qa-agent";
          resolvedRoute = route;
          resolvedAgentName =
            STATIC_AGENTS.find((a) => a.id === resolvedAgentId)?.name ??
            agentId;
          // Update message metadata
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, agentId: resolvedAgentId, agentName: resolvedAgentName, route }
                : m
            )
          );
        },
        onToolCall(tc) {
          setThinking(false);
          setStreaming(true);
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === assistantId);
            if (!exists) {
              // Eagerly insert the assistant message so the tool call is visible immediately
              return [
                ...prev,
                {
                  ...placeholderMsg,
                  toolCalls: [tc],
                  agentId: resolvedAgentId,
                  agentName: resolvedAgentName,
                  route: resolvedRoute,
                },
              ];
            }
            return prev.map((m) => {
              if (m.id !== assistantId) return m;
              const calls = [...(m.toolCalls || [])];
              const existingIdx = calls.findIndex(c => c.id === tc.id);
              if (existingIdx >= 0) {
                // Merge/update existing call
                calls[existingIdx] = {
                  ...calls[existingIdx],
                  ...tc,
                  // Don't overwrite name/args if already set
                  name: tc.name || calls[existingIdx].name,
                  arguments: tc.arguments || calls[existingIdx].arguments,
                  result: tc.result !== undefined ? tc.result : calls[existingIdx].result,
                  status: tc.status || calls[existingIdx].status,
                };
              } else {
                calls.push(tc);
              }
              return { ...m, toolCalls: calls };
            });
          });
        },
        onDone() {
          setThinking(false);
          setStreaming(false);
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              // Finalize any tools still marked running — the stream is over
              const toolCalls = m.toolCalls?.map((tc) =>
                tc.status === "running" ? { ...tc, status: "success" as const } : tc
              );
              return {
                ...m,
                streaming: false,
                toolCalls,
                agentId: m.agentId ?? resolvedAgentId,
                agentName: m.agentName ?? resolvedAgentName,
                route: m.route ?? resolvedRoute,
              };
            })
          );
        },
        onError(err) {
          setThinking(false);
          setStreaming(false);
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== assistantId),
            {
              id: assistantId,
              role: "assistant",
              content: `⚠️ Error: ${err.message}`,
              streaming: false,
              timestamp: new Date(),
            },
          ]);
        },
      }, accessToken || undefined, isStreamingEnabled);
    },
    [sessionId, streaming, isStreamingEnabled, accessToken]
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BotMessageSquare size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-white">VNG Multi-Agent</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Powered by Agent Router</p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-xs text-indigo-400 hidden sm:inline">
              {agents.filter((a) => a.healthy).length}/{agents.length} agents online
            </span>
            <span className="text-xs text-indigo-400 sm:hidden">
              {agents.filter((a) => a.healthy).length}/{agents.length}
            </span>
          </div>
        </header>

        {/* Chat messages */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-1">
          {messages.length === 0 && !thinking && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                <BotMessageSquare size={32} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-300 mb-1">
                  Xin chào! Tôi có thể giúp gì cho bạn?
                </h2>
                <p className="text-sm text-slate-500 max-w-sm">
                  Hỏi về quy trình VNG, đặt phòng họp, hoặc bất kỳ điều gì bạn cần.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  "Tôi muốn đặt phòng họp",
                  "Quy trình xin nghỉ phép là gì?",
                  "Bạn có thể làm gì?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}

          {thinking && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </main>

        {/* Input bar */}
        <footer className="px-4 sm:px-6 py-4 border-t border-slate-800/60 bg-slate-900/30 backdrop-blur-sm flex-shrink-0">
          <ChatInput
            onSend={handleSend}
            disabled={loadingSession}
            loading={streaming || thinking}
          />
          <p className="text-center text-xs text-slate-600 mt-2 hidden sm:block">
            Enter to send · Shift+Enter for new line
          </p>
        </footer>
      </div>

      {/* Right panel - desktop */}
      <div className="hidden lg:block lg:w-72 flex-shrink-0 border-l border-slate-800/60 bg-slate-900/30 backdrop-blur-sm p-4 overflow-y-auto">
        <AgentStatusPanel
          agents={agents}
          sessionId={sessionId}
          onNewSession={startNewSession}
          loadingSession={loadingSession}
          streamingEnabled={isStreamingEnabled}
          onToggleStreaming={setIsStreamingEnabled}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="lg:hidden fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800/60 z-50 overflow-y-auto p-4 animate-in slide-in-from-right duration-300">
            <AgentStatusPanel
              agents={agents}
              sessionId={sessionId}
              onNewSession={startNewSession}
              loadingSession={loadingSession}
              streamingEnabled={isStreamingEnabled}
              onToggleStreaming={setIsStreamingEnabled}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
