"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SECRETS_API_URL = process.env.NEXT_PUBLIC_SECRETS_API_URL || "/secrets-api";
const OAUTH_CALLBACK_URL = process.env.NEXT_PUBLIC_OAUTH_CALLBACK_URL || "";

type CallbackState = "processing" | "success" | "error";

export default function OAuthCallbackPage() {
    const searchParams = useSearchParams();
    const [state, setState] = useState<CallbackState>("processing");
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code");
            const oauthState = searchParams.get("state");
            const error = searchParams.get("error");
            const errorDescription = searchParams.get("error_description");

            if (error) {
                setErrorMessage(errorDescription || `OAuth error: ${error}`);
                setState("error");
                window.opener?.postMessage({ type: "oauth_error", error }, "*");
                return;
            }

            if (!code || !oauthState) {
                setErrorMessage("Missing authorization code or state parameter.");
                setState("error");
                window.opener?.postMessage({ type: "oauth_error", error: "missing_params" }, "*");
                return;
            }

            // Recover context stored by the authorize page
            let provider = "microsoft";
            try {
                const ctx = sessionStorage.getItem("oauth_context");
                if (ctx) {
                    const parsed = JSON.parse(ctx);
                    provider = parsed.provider || "microsoft";
                    sessionStorage.removeItem("oauth_context");
                }
            } catch { /* use default */ }

            const redirectUri = OAUTH_CALLBACK_URL || `${window.location.origin}/oauth/callback`;

            try {
                const response = await fetch(`${SECRETS_API_URL}/oauth/${provider}/callback`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code,
                        state: oauthState,
                        redirect_uri: redirectUri,
                        provider,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.text();
                    setErrorMessage(`Token exchange failed: ${errData}`);
                    setState("error");
                    window.opener?.postMessage({ type: "oauth_error", error: "exchange_failed" }, "*");
                    return;
                }

                setState("success");
                window.opener?.postMessage({ type: "oauth_success" }, "*");

                setTimeout(() => window.close(), 2000);
            } catch (err) {
                setErrorMessage(`Failed to complete authorization: ${err instanceof Error ? err.message : String(err)}`);
                setState("error");
                window.opener?.postMessage({ type: "oauth_error", error: "network_error" }, "*");
            }
        };

        handleCallback();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                {state === "processing" && (
                    <>
                        <Loader2 size={40} className="text-indigo-400 mx-auto mb-4 animate-spin" />
                        <h2 className="text-lg font-semibold text-slate-200 mb-2">Processing Authorization</h2>
                        <p className="text-sm text-slate-400">
                            Exchanging authorization code for access token...
                        </p>
                    </>
                )}

                {state === "success" && (
                    <>
                        <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-emerald-300 mb-2">Permission Granted!</h2>
                        <p className="text-sm text-slate-400">
                            Authorization successful. This window will close automatically.
                        </p>
                    </>
                )}

                {state === "error" && (
                    <>
                        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-red-300 mb-2">Authorization Failed</h2>
                        <p className="text-sm text-slate-400 mb-4">{errorMessage}</p>
                        <button
                            onClick={() => window.close()}
                            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                        >
                            Close Window
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
