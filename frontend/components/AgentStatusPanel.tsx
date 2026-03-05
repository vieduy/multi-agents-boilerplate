"use client";

import { AgentInfo } from "@/types";
import { clsx } from "clsx";
import { RefreshCw, Wifi, WifiOff, Hash, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const AGENT_META: Record<string, { icon: string; color: string }> = {
    "qa-agent": { icon: "🔍", color: "text-indigo-400" },
    "meeting-agent": { icon: "📅", color: "text-emerald-400" },
    default: { icon: "🤖", color: "text-violet-400" },
};

interface Props {
    agents: AgentInfo[];
    sessionId?: string;
    onNewSession: () => void;
    loadingSession?: boolean;
    streamingEnabled: boolean;
    onToggleStreaming: (enabled: boolean) => void;
}

export default function AgentStatusPanel({
    agents,
    sessionId,
    onNewSession,
    loadingSession,
    streamingEnabled,
    onToggleStreaming,
}: Props) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <aside className="flex flex-col gap-3 sm:gap-4 w-full">
            {/* User Profile section */}
            {user && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                            <User size={18} className="text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user.full_name || user.email}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 bg-slate-700/60 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-600/40 hover:border-red-500/30"
                    >
                        <LogOut size={12} />
                        Đăng xuất
                    </button>
                </div>
            )}

            {/* Settings section */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                    Settings
                </h2>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-700/40">
                    <div className="flex items-center gap-2">
                        <RefreshCw size={14} className={clsx("text-indigo-400", streamingEnabled && "animate-spin-slow")} />
                        <span className="text-sm text-slate-300">Streaming</span>
                    </div>
                    <button
                        onClick={() => onToggleStreaming(!streamingEnabled)}
                        className={clsx(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 outline-none",
                            streamingEnabled ? "bg-indigo-600" : "bg-slate-700"
                        )}
                    >
                        <span
                            className={clsx(
                                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200",
                                streamingEnabled ? "translate-x-5" : "translate-x-0.5"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* Agents section */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">
                    Agents
                </h2>
                <div className="flex flex-col gap-2 sm:gap-3">
                    {agents.map((agent) => {
                        const meta = AGENT_META[agent.id] ?? AGENT_META.default;
                        return (
                            <div
                                key={agent.id}
                                className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-900/50 border border-slate-700/40"
                            >
                                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5">{meta.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx("text-sm font-medium", meta.color)}>
                                            {agent.name}
                                        </span>
                                        {agent.healthy === undefined ? null : agent.healthy ? (
                                            <Wifi size={11} className="text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <WifiOff size={11} className="text-red-400 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                        {agent.description}
                                    </p>
                                    {agent.capabilities.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {agent.capabilities.map((cap) => (
                                                <span
                                                    key={cap}
                                                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-400 font-mono"
                                                >
                                                    {cap}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Session section */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">
                    Session
                </h2>
                {sessionId ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700/40 mb-3">
                        <Hash size={12} className="text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-400 font-mono truncate">{sessionId}</span>
                    </div>
                ) : (
                    <div className="h-8 rounded-lg bg-slate-900/50 border border-slate-700/40 mb-3 animate-pulse" />
                )}
                <button
                    onClick={onNewSession}
                    disabled={loadingSession}
                    className={clsx(
                        "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200",
                        "bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 hover:text-white border border-slate-600/40",
                        loadingSession && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <RefreshCw size={12} className={clsx(loadingSession && "animate-spin")} />
                    New Session
                </button>
            </div>
        </aside>
    );
}
