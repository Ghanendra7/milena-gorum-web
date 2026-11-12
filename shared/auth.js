const SESSION_COOKIE_NAME = "mg_uploader_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Bytes(text) {
  const data = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export async function timingSafeEqualStrings(a, b) {
  const [hashA, hashB] = await Promise.all([sha256Bytes(a), sha256Bytes(b)]);
  let diff = 0;
  for (let i = 0; i < hashA.length; i += 1) {
    diff |= hashA[i] ^ hashB[i];
  }
  return diff === 0;
}

async function getHmacKey(secret) {
  const keyData = await sha256Bytes(`mg-uploader-hmac:${secret}`);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload, secret) {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export async function createSessionCookieHeader(env, request) {
  const secret = env.SESSION_SECRET || env.UPLOADER_PASSWORD;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  const sig = await signPayload(payload, secret);
  const token = `${payload}.${sig}`;
  const isHttps = new URL(request.url).protocol === "https:";

  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");
}

export function clearSessionCookieHeader(request) {
  const isHttps = new URL(request.url).protocol === "https:";
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    ...(isHttps ? ["Secure"] : []),
  ].join("; ");
}

export async function isAuthenticated(request, env) {
  if (!env.UPLOADER_PASSWORD) return false;

  const headerPassword = request.headers.get("X-Uploader-Password");
  if (headerPassword) {
    return timingSafeEqualStrings(headerPassword, env.UPLOADER_PASSWORD);
  }

  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return false;

  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;

  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const secret = env.SESSION_SECRET || env.UPLOADER_PASSWORD;
  const expectedSig = await signPayload(payload, secret);
  return timingSafeEqualStrings(sig, expectedSig);
}

export async function requireAuth(request, env) {
  if (!env.UPLOADER_PASSWORD) {
    return jsonError(
      "Server misconfiguration: UPLOADER_PASSWORD environment variable is not set.",
      500
    );
  }
  const ok = await isAuthenticated(request, env);
  if (!ok) {
    return jsonError("Authentication required.", 401);
  }
  return null;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function jsonError(message, status = 400, details = undefined) {
  const body = details !== undefined ? { error: message, details } : { error: message };
  return jsonResponse(body, status);
}

