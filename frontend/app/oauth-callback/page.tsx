"use client";

/**
 * Alternative callback route at /oauth-callback (hyphenated).
 * Re-exports the same handler as /oauth/callback so both paths work.
 */
export { default } from "@/app/oauth/callback/page";
