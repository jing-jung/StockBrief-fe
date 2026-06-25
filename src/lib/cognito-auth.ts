"use client";

export interface AuthSession {
  accessToken: string;
  idToken?: string;
  expiresAt: number;
}

const AUTH_SESSION_KEY = "stockbrief_auth_session_v1";
const PKCE_KEY = "stockbrief_cognito_pkce_v1";
const AUTH_CHANGED_EVENT = "stockbrief_auth_changed";

interface PkceState {
  verifier: string;
  state: string;
}

interface CognitoConfig {
  clientId: string;
  hostedUiDomain: string;
  redirectUri: string;
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) {
      clearAuthSession();
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      ...(typeof parsed.idToken === "string" ? { idToken: parsed.idToken } : {}),
    };
  } catch {
    clearAuthSession();
    return null;
  }
}

export function readApiAuthToken(): string | null {
  const session = readAuthSession();
  return session?.idToken ?? session?.accessToken ?? null;
}

import { clearRiskProfileCookie } from "./preference-cookie";

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  clearRiskProfileCookie();
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export function subscribeAuthSession(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_SESSION_KEY) callback();
  };
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function isCognitoConfigured(): boolean {
  return readConfig() !== null;
}

export async function startCognitoAuth(mode: "login" | "signup"): Promise<void> {
  const config = readConfig();
  if (!config) {
    throw new Error("Cognito Hosted UI configuration is missing.");
  }

  const verifier = randomString(64);
  const state = randomString(32);
  const challenge = await codeChallenge(verifier);
  const pkce: PkceState = { verifier, state };
  window.sessionStorage.setItem(PKCE_KEY, JSON.stringify(pkce));

  const params = new URLSearchParams({
    client_id: config.clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  if (mode === "signup") {
    params.set("screen_hint", "signup");
  }

  window.location.assign(`${normalizedDomain(config.hostedUiDomain)}/oauth2/authorize?${params.toString()}`);
}

export async function completeCognitoCallback(code: string, state: string): Promise<void> {
  const config = readConfig();
  const pkce = readPkceState();
  if (!config || !pkce || pkce.state !== state) {
    throw new Error("Stored Cognito sign-in state does not match this callback.");
  }

  const response = await fetch(`${normalizedDomain(config.hostedUiDomain)}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: pkce.verifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Cognito token exchange failed.");
  }

  const payload = (await response.json()) as {
    access_token?: string;
    id_token?: string;
    expires_in?: number;
  };
  if (!payload.access_token) {
    throw new Error("Cognito token response did not include an access token.");
  }

  const expiresInSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  const session: AuthSession = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    ...(payload.id_token ? { idToken: payload.id_token } : {}),
  };

  window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  window.sessionStorage.removeItem(PKCE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function readConfig(): CognitoConfig | null {
  const clientId = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID;
  const hostedUiDomain = process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN;
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;
  if (!clientId || !hostedUiDomain || !redirectUri) return null;
  return { clientId, hostedUiDomain, redirectUri };
}

function readPkceState(): PkceState | null {
  const raw = window.sessionStorage.getItem(PKCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PkceState>;
    if (typeof parsed.verifier !== "string" || typeof parsed.state !== "string") return null;
    return { verifier: parsed.verifier, state: parsed.state };
  } catch {
    return null;
  }
}

function normalizedDomain(domain: string): string {
  if (domain.startsWith("https://")) return domain.replace(/\/$/, "");
  return `https://${domain.replace(/\/$/, "")}`;
}

function randomString(length: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function codeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
