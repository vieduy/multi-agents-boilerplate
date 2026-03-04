"use client";

import { useEffect, useRef, useState } from "react";
import { ToolCall } from "@/types";
import { clsx } from "clsx";
import {
    Wrench,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    XCircle,
    Loader2,
    Terminal
} from "lucide-react";

interface Props {
    toolCall: ToolCall;
}

export default function ToolCallCard({ toolCall }: Props) {
    // Start expanded when running so arguments are immediately visible
    const [isExpanded, setIsExpanded] = useState(toolCall.status === "running");
    const prevStatusRef = useRef(toolCall.status);

    useEffect(() => {
        const prev = prevStatusRef.current;
        if (prev === "running" && toolCall.status !== "running") {
            // Auto-collapse when execution completes
            setIsExpanded(false);
        } else if (toolCall.status === "running" && prev !== "running") {
            // Auto-expand when a new call starts
            setIsExpanded(true);
        }
        prevStatusRef.current = toolCall.status;
    }, [toolCall.status]);

    const getStatusIcon = () => {
        switch (toolCall.status) {
            case "running":
                return <Loader2 size={14} className="animate-spin text-amber-400" />;
            case "success":
                return <CheckCircle2 size={14} className="text-emerald-400" />;
            case "error":
                return <XCircle size={14} className="text-red-400" />;
            default:
                return <Terminal size={14} className="text-slate-400" />;
        }
    };

    const getStatusLabel = () => {
        switch (toolCall.status) {
            case "running": return "Calling...";
            case "success": return "Done";
            case "error": return "Failed";
            default: return "";
        }
    };

    return (
        <div
            className={clsx(
                "mb-2 rounded-xl border bg-slate-900/40 backdrop-blur-sm overflow-hidden transition-all duration-200",
                toolCall.status === "running" ? "border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.05)]" :
                    toolCall.status === "error" ? "border-red-500/30" : "border-slate-700/50"
            )}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-800/40 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Wrench size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-mono font-medium text-slate-300 truncate">
                        {toolCall.name}
                    </span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                            {getStatusLabel()}
                        </span>
                        {getStatusIcon()}
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </div>
            </div>

            {/* Details (Collapsible) */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-700/30 space-y-3">
                    {/* Arguments */}
                    <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-tight mb-1.5 flex items-center gap-1">
                            <span>Arguments</span>
                        </div>
                        <pre className="text-[11px] font-mono p-2 rounded-lg bg-slate-950/80 border border-slate-700/50 text-slate-400 overflow-x-auto">
                            {JSON.stringify(JSON.parse(toolCall.arguments || "{}"), null, 2)}
                        </pre>
                    </div>

                    {/* Result */}
                    {toolCall.result && (
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-tight mb-1.5">
                                Result
                            </div>
                            <pre className={clsx(
                                "text-[11px] font-mono p-2 rounded-lg border overflow-x-auto",
                                toolCall.status === "error" ? "bg-red-500/5 border-red-500/20 text-red-300" : "bg-slate-950/80 border-slate-700/50 text-emerald-300/80"
                            )}>
                                {typeof JSON.parse(toolCall.result) === 'string'
                                    ? JSON.parse(toolCall.result)
                                    : JSON.stringify(JSON.parse(toolCall.result), null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
