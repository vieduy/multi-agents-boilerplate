"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface Props {
    onSend: (message: string) => void;
    disabled?: boolean;
    loading?: boolean;
}

export default function ChatInput({ onSend, disabled, loading }: Props) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        const trimmed = value.trim();
        if (!trimmed || disabled || loading) return;
        onSend(trimmed);
        setValue("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    };

    return (
        <div className="relative flex items-end gap-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 backdrop-blur-sm shadow-xl">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
                disabled={disabled || loading}
                rows={1}
                className={clsx(
                    "flex-1 bg-transparent text-slate-100 placeholder-slate-500",
                    "text-sm leading-relaxed resize-none outline-none",
                    "min-h-[24px] max-h-[160px] overflow-y-auto",
                    (disabled || loading) && "opacity-50 cursor-not-allowed"
                )}
            />
            <button
                onClick={handleSend}
                disabled={!value.trim() || disabled || loading}
                className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    value.trim() && !disabled && !loading
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-105"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                )}
            >
                {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Send size={16} />
                )}
            </button>
        </div>
    );
}
