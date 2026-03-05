"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

const SECRETS_API_URL = process.env.NEXT_PUBLIC_SECRETS_API_URL || "/secrets-api";
const OAUTH_CALLBACK_URL = process.env.NEXT_PUBLIC_OAUTH_CALLBACK_URL || "";

export default function OAuthAuthorizePage() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            const userId = searchParams.get("user_id");
            const secretKey = searchParams.get("secret_key");
            const scopesParam = searchParams.get("scopes");
            const provider = searchParams.get("provider") || "microsoft";

            if (!userId || !secretKey || !scopesParam) {
                setError("Missing required parameters (user_id, secret_key, scopes).");
                return;
            }

            const scopes = scopesParam.split(",").filter(Boolean);
            const redirectUri = OAUTH_CALLBACK_URL || `${window.location.origin}/oauth/callback`;

            // Store context for the callback page
            sessionStorage.setItem("oauth_context", JSON.stringify({
                provider,
                userId,
                secretKey,
            }));

            try {
                const response = await fetch(`${SECRETS_API_URL}/oauth/${provider}/authorize`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: userId,
                        secret_key: secretKey,
                        scopes,
                        redirect_uri: redirectUri,
                        provider,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.text();
                    setError(`Failed to generate authorization URL: ${errData}`);
                    return;
                }

                const data = await response.json();
                const authUrl = data.auth_url;

                if (!authUrl) {
                    setError("No authorization URL returned from server.");
                    return;
                }

                window.location.href = authUrl;
            } catch (err) {
                setError(`Failed to connect to authorization service: ${err instanceof Error ? err.message : String(err)}`);
            }
        };

        initAuth();
    }, [searchParams]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-red-300 mb-2">Authorization Error</h2>
                    <p className="text-sm text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.close()}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                <Loader2 size={40} className="text-indigo-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-lg font-semibold text-slate-200 mb-2">Redirecting to Authorization</h2>
                <p className="text-sm text-slate-400">
                    You will be redirected to sign in and grant permissions...
                </p>
            </div>
        </div>
    );
}
