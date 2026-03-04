const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import { ToolCall } from "@/types";

export interface StreamCallbacks {
    onChunk: (text: string) => void;
    onAgent?: (agentId: string, route: string) => void;
    onToolCall?: (toolCall: ToolCall) => void;
    onDone: () => void;
    onError: (err: Error) => void;
}

/**
 * Streams a query to POST /api/v1/route using SSE.
 * Handles both plain text chunks and JSON event-stream chunks.
 */
export async function streamRoute(
    query: string,
    sessionId: string | undefined,
    callbacks: StreamCallbacks,
    bearerToken?: string,
    stream: boolean = true
): Promise<void> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
    };
    if (bearerToken) headers["Authorization"] = bearerToken;

    const body: Record<string, unknown> = {
        query,
        stream,
    };
    if (sessionId) body.session_id = sessionId;

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}/api/v1/route`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
    } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        return;
    }

    if (!response.ok) {
        const errText = await response.text();
        callbacks.onError(new Error(`HTTP ${response.status}: ${errText}`));
        return;
    }

    const contentType = response.headers.get("content-type") || "";
    const isSSE = contentType.includes("text/event-stream");

    /**
     * Extracts text from the backend's response envelope.
     * Returns:
     * - { text: string, skip: false } if text is found.
     * - { text: null, skip: true, toolCall?: ToolCall } if it's metadata or a tool call.
     * - { text: null, skip: false } if unrecognized.
     */
    function parseResponse(data: Record<string, unknown>): { text: string | null; skip: boolean; toolCall?: ToolCall } {
        try {
            const agentResponse = data?.agent_response as Record<string, unknown> | undefined;
            const result = agentResponse?.result as Record<string, unknown> | undefined;
            const output = result?.output as Array<Record<string, unknown>> | undefined;

            // 1. Check for standard nested text OR tool calls
            if (output?.length) {
                for (const item of output) {
                    if (item?.type === "tool_call" && item.tool_call) {
                        const tc = item.tool_call as any;
                        return {
                            text: null,
                            skip: true,
                            toolCall: {
                                id: tc.id,
                                name: tc.function?.name || "unknown",
                                arguments: tc.function?.arguments || "{}",
                                status: "running"
                            }
                        };
                    }

                    if (item?.type === "tool_call_result" && item.tool_call_result) {
                        const res = item.tool_call_result as any;
                        return {
                            text: null,
                            skip: true,
                            toolCall: {
                                id: res.id,
                                name: "", // will be merged in state
                                arguments: "",
                                result: res.content || res.output || "{}",
                                status: "success"
                            }
                        };
                    }

                    const content = item?.content as Array<Record<string, unknown>> | undefined;
                    if (content?.length) {
                        for (const c of content) {
                            if (c?.text && typeof c.text === "string") return { text: c.text, skip: false };
                        }
                    }
                    if (item?.text && typeof item.text === "string") return { text: item.text, skip: false };
                }
            }

            // 2. Check for non-stream mode response (agent_response.result.response)
            if (result?.response && typeof result.response === "string") {
                return { text: result.response, skip: false };
            }

            // 3. Check for agent errors
            if (agentResponse?.status === "error") {
                const err = result?.error as Record<string, unknown> | undefined;
                const msg = err?.message ?? result?.data;
                if (msg) return { text: `⚠️ ${JSON.stringify(msg)}`, skip: false };
            }

            // 4. Fallback text keys (common in LLM APIs)
            const fallbackText = data?.output ?? data?.content ?? data?.text ?? data?.message ??
                (data as any)?.choices?.[0]?.delta?.content ?? (data as any)?.delta;
            if (fallbackText && typeof fallbackText === "string") {
                return { text: fallbackText, skip: false };
            }

            // 5. Identify metadata that should be skipped (not displayed)
            // If it's a valid JSON object but doesn't have text or tool call, it's likely metadata
            // We skip objects that have known metadata keys OR objects that simply don't have recognized content
            const isKnownMetadata = data?.question || data?.route || data?.method || data?.session_id || data?.start_time || data?.end_time;
            if (isKnownMetadata || (!output && !agentResponse && !fallbackText)) {
                return { text: null, skip: true };
            }
        } catch {
            // fall through
        }
        return { text: null, skip: false };
    }

    if (!isSSE || !response.body) {
        // Non-streaming fallback: parse as JSON
        const data = await response.json();
        const { text, skip, toolCall } = parseResponse(data);

        // Update agent/route info
        const route = data?.route ?? (data?.agent_response as any)?.route;
        const agentId = data?.agent_id ?? (data?.agent_response as any)?.agent_id;
        const agentName = data?.agent_name ?? (data?.agent_response as any)?.agent_name;
        if (route && typeof route === "string") {
            callbacks.onAgent?.(agentId || route, route);
        } else if (agentId && typeof agentId === "string") {
            // Metadata-only event (no route but has agent info)
            callbacks.onAgent?.(agentId, route || "unknown");
        }

        if (toolCall) callbacks.onToolCall?.(toolCall);

        if (skip) {
            callbacks.onDone();
            return;
        }

        if (text) {
            callbacks.onChunk(text);
        } else {
            // Only show raw JSON if it's NOT a metadata object we recognize
            const isMetadata = data?.question || data?.route || data?.method || data?.session_id;
            if (!isMetadata) {
                callbacks.onChunk(JSON.stringify(data, null, 2));
            }
        }

        callbacks.onDone();
        return;
    }


    // SSE streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === ":") continue;

                // Strip "data: " prefix if present
                let raw = trimmed;
                if (trimmed.startsWith("data:")) {
                    raw = trimmed.slice(5).trim();
                } else if (trimmed.startsWith("event:") || trimmed.startsWith("id:")) {
                    continue;
                }

                if (raw === "[DONE]") {
                    callbacks.onDone();
                    return;
                }

                // Split multiple JSON objects or JSON mixed with text
                let current = raw;
                while (current.length > 0) {
                    if (current.startsWith("{")) {
                        // Greedy JSON object matching
                        let depth = 0;
                        let endPos = -1;
                        for (let i = 0; i < current.length; i++) {
                            if (current[i] === "{") depth++;
                            else if (current[i] === "}") {
                                depth--;
                                if (depth === 0) {
                                    endPos = i;
                                    break;
                                }
                            }
                        }

                        if (endPos !== -1) {
                            const jsonStr = current.slice(0, endPos + 1);
                            const remaining = current.slice(endPos + 1).trim();

                            try {
                                const parsed = JSON.parse(jsonStr);
                                const { text, skip, toolCall } = parseResponse(parsed);

                                if (toolCall) callbacks.onToolCall?.(toolCall);
                                if (!skip && text) callbacks.onChunk(text);

                                // Metadata update - extract both agent_id and route
                                const route = parsed?.route ?? (parsed?.agent_response as any)?.route;
                                const agentId = parsed?.agent_id ?? (parsed?.agent_response as any)?.agent_id;
                                const agentName = parsed?.agent_name ?? (parsed?.agent_response as any)?.agent_name;
                                if (route && typeof route === "string") {
                                    callbacks.onAgent?.(agentId || route, route);
                                } else if (agentId && typeof agentId === "string") {
                                    // Metadata-only event (no route but has agent info)
                                    callbacks.onAgent?.(agentId, route || "unknown");
                                }
                            } catch {
                                // If it looked like JSON but failed, treat as text
                                callbacks.onChunk(jsonStr);
                            }

                            current = remaining;
                            continue;
                        }
                    }

                    // Not JSON at start, or JSON matching failed
                    // Look for the next { to split text from a following JSON object
                    const nextBrace = current.indexOf("{");
                    if (nextBrace === -1) {
                        callbacks.onChunk(current);
                        break;
                    } else if (nextBrace > 0) {
                        callbacks.onChunk(current.slice(0, nextBrace));
                        current = current.slice(nextBrace).trim();
                    } else {
                        // nextBrace is 0 but we failed depth match above? 
                        // Just treat as text to avoid infinite loop
                        callbacks.onChunk(current);
                        break;
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
        callbacks.onDone();
    }
}
