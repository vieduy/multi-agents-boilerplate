import { Session } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Create a new session — called once on page load */
export async function createSession(bearerToken?: string): Promise<Session> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (bearerToken) headers["Authorization"] = bearerToken;

    const res = await fetch(`${BASE_URL}/api/v1/sessions`, {
        method: "POST",
        headers,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to create session: ${err}`);
    }

    return res.json();
}

/** Check health of all registered agents */
export async function checkAllAgentsHealth(bearerToken?: string): Promise<{
    agents: Array<{
        agent_id: string;
        agent_name: string;
        healthy: boolean;
        status: string;
    }>;
    summary: {
        healthy: number;
        total: number;
    };
} | null> {
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (bearerToken) headers["Authorization"] = bearerToken;
        const res = await fetch(`${BASE_URL}/api/v1/agents/health`, {
            method: "GET",
            headers,
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/** Check health of a specific agent (legacy, prefer checkAllAgentsHealth) */
export async function checkAgentHealth(agentId: string, bearerToken?: string): Promise<boolean> {
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (bearerToken) headers["Authorization"] = bearerToken;
        const res = await fetch(`${BASE_URL}/api/v1/agents/${agentId}/health`, {
            method: "POST",
            headers,
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.healthy === true;
    } catch {
        return false;
    }
}
