"use client";

import { ChatMessage } from "@/types";
import { clsx } from "clsx";
import { User, Bot, Sparkles, Loader2 } from "lucide-react";
import ToolCallCard from "./ToolCall";

const AGENT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    "qa-agent": {
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/30",
        text: "text-indigo-300",
        icon: "🔍",
    },
    "meeting-agent": {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-300",
        icon: "📅",
    },
    default: {
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        text: "text-violet-300",
        icon: "🤖",
    },
};

function getAgentStyle(agentId?: string) {
    if (!agentId) return AGENT_COLORS.default;
    return AGENT_COLORS[agentId] ?? AGENT_COLORS.default;
}

interface Props {
    message: ChatMessage;
}

export default function ChatMessageBubble({ message }: Props) {
    const isUser = message.role === "user";
    const style = getAgentStyle(message.agentId);

    const isAssistant = message.role === "assistant";
    const hasTools = (message.toolCalls?.length ?? 0) > 0;
    const hasRunningTools = message.toolCalls?.some(tc => tc.status === "running") ?? false;
    // Show text bubble only once tools are done (or there are no tools at all)
    const showTextBubble = !hasRunningTools && (!!message.content || !hasTools);
    // Show "generating" indicator when tools are all done but text hasn't arrived yet
    const showGenerating = hasTools && !hasRunningTools && message.streaming && !message.content;

    return (
        <div
            className={clsx(
                "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                !isAssistant ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={clsx(
                    "flex max-w-[95%] sm:max-w-[85%] gap-2 sm:gap-3 px-1",
                    !isAssistant ? "flex-row-reverse" : "flex-row"
                )}
            >
                {/* Avatar */}
                <div
                    className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md",
                        !isAssistant
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 border border-slate-700 text-slate-300"
                    )}
                >
                    {!isAssistant ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Content */}
                <div className={clsx("flex flex-col gap-1", !isAssistant ? "items-end" : "items-start")}>
                    {/* Agent Badge (if assistant) */}
                    {isAssistant && (message.agentName || message.route) && (
                        <div className="flex items-center gap-2 mb-0.5 ml-1">
                            <div className={clsx(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                message.route === "meeting"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            )}>
                                <Sparkles size={10} />
                                <span>{message.agentName || "Agent"}</span>
                                {message.route && (
                                    <>
                                        <span className="opacity-30">•</span>
                                        <span className="opacity-80">{message.route}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tool Calls */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="w-full max-w-xs sm:max-w-sm ml-1 mb-1">
                            {message.toolCalls.map((tc) => (
                                <ToolCallCard key={tc.id} toolCall={tc} />
                            ))}
                        </div>
                    )}

                    {/* Generating indicator — tools done, waiting for text response */}
                    {showGenerating && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/40 text-xs text-slate-400 ml-1">
                            <Loader2 size={12} className="animate-spin text-indigo-400" />
                            <span>Generating response…</span>
                        </div>
                    )}

                    {/* Message Bubble — hidden while tools are executing */}
                    {showTextBubble && (
                        <div
                            className={clsx(
                                "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                !isAssistant
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none backdrop-blur-sm"
                            )}
                        >
                            {message.content || (message.streaming ? "" : "...")}
                            {message.streaming && (
                                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                            )}
                        </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-600 font-medium px-2 mt-1 uppercase tracking-tighter">
                        {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}
