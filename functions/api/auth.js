import {
  clearSessionCookieHeader,
  createSessionCookieHeader,
  isAuthenticated,
  jsonError,
  jsonResponse,
  timingSafeEqualStrings,
} from "../../shared/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.UPLOADER_PASSWORD) {
    return jsonError(
      "Server misconfiguration: UPLOADER_PASSWORD environment variable is not set.",
      500
    );
  }
  const authenticated = await isAuthenticated(request, env);
  return jsonResponse({ authenticated });
}

export async function onRequestPost({ request, env }) {
  if (!env.UPLOADER_PASSWORD) {
    return jsonError(
      "Server misconfiguration: UPLOADER_PASSWORD environment variable is not set.",
      500
    );
  }

  let body = null;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return jsonError("Password is required.", 400);
  }

  const matches = await timingSafeEqualStrings(password, env.UPLOADER_PASSWORD);
  if (!matches) {
    return jsonError("Invalid password.", 401);
  }

  const cookie = await createSessionCookieHeader(env, request);
  return jsonResponse(
    { authenticated: true },
    200,
    { "Set-Cookie": cookie }
  );
}

export async function onRequestDelete({ request }) {
  return jsonResponse(
    { authenticated: false },
    200,
    { "Set-Cookie": clearSessionCookieHeader(request) }
  );
}

