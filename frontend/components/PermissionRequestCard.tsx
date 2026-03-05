"use client";

import { useState } from "react";
import { PermissionRequest } from "@/types";
import { ShieldCheck, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Props {
    permission: PermissionRequest;
    onAuthorized?: () => void;
}

type AuthState = "idle" | "authorizing" | "success" | "error";

const PROVIDER_LABELS: Record<string, string> = {
    microsoft: "Microsoft",
    google: "Google",
};

const PROVIDER_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
    microsoft: { bg: "bg-blue-500/10", border: "border-blue-500/30", accent: "text-blue-400" },
    google: { bg: "bg-red-500/10", border: "border-red-500/30", accent: "text-red-400" },
};

export default function PermissionRequestCard({ permission, onAuthorized }: Props) {
    const [authState, setAuthState] = useState<AuthState>("idle");

    const colors = PROVIDER_COLORS[permission.provider] ?? PROVIDER_COLORS.microsoft;
    const providerLabel = PROVIDER_LABELS[permission.provider] ?? permission.provider;

    const handleAuthorize = () => {
        setAuthState("authorizing");

        const popup = window.open(
            permission.consentUrl,
            "oauth_consent",
            "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "oauth_success") {
                setAuthState("success");
                popup?.close();
                window.removeEventListener("message", handleMessage);
                onAuthorized?.();
            } else if (event.data?.type === "oauth_error") {
                setAuthState("error");
                popup?.close();
                window.removeEventListener("message", handleMessage);
            }
        };

        window.addEventListener("message", handleMessage);

        const pollTimer = setInterval(() => {
            if (popup?.closed) {
                clearInterval(pollTimer);
                window.removeEventListener("message", handleMessage);
                if (authState === "authorizing") {
                    setAuthState("idle");
                }
            }
        }, 500);
    };

    if (authState === "success") {
        return (
            <div className="mb-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Permission granted successfully</span>
                </div>
                <p className="text-xs text-emerald-300/70 mt-1 ml-6">
                    Retrying your request...
                </p>
            </div>
        );
    }

    return (
        <div className={`mb-2 rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm overflow-hidden`}>
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={18} className={colors.accent} />
                    <span className="text-sm font-semibold text-slate-200">
                        Permission Required
                    </span>
                </div>
                <p className="text-sm text-slate-300">
                    {permission.icon && <span className="mr-1">{permission.icon}</span>}
                    {permission.displayName || permission.message}
                </p>
                {permission.description && (
                    <p className="text-xs text-slate-400 mt-1">
                        {permission.description}
                    </p>
                )}
            </div>

            {/* Scopes */}
            {permission.scopes.length > 0 && (
                <div className="px-4 py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-tight mb-1.5">
                        Requested permissions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {permission.scopes.map((scope) => (
                            <span
                                key={scope}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 font-mono"
                            >
                                {scope}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4 pt-2 flex items-center gap-2">
                <button
                    onClick={handleAuthorize}
                    disabled={authState === "authorizing"}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${authState === "authorizing"
                            ? "bg-slate-700 text-slate-400 cursor-wait"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                        }
                    `}
                >
                    {authState === "authorizing" ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Waiting for authorization...
                        </>
                    ) : authState === "error" ? (
                        <>
                            <XCircle size={14} />
                            Retry Authorization
                        </>
                    ) : (
                        <>
                            <ExternalLink size={14} />
                            Authorize with {providerLabel}
                        </>
                    )}
                </button>

                {authState === "error" && (
                    <span className="text-xs text-red-400">Authorization failed. Please try again.</span>
                )}
            </div>
        </div>
    );
}
