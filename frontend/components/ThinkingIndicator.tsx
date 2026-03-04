"use client";

export default function ThinkingIndicator() {
    return (
        <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700/60 border border-slate-600/50 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">🤖</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-lg">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 mr-1">Routing</span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    );
}
