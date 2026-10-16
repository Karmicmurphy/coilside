// Server-side Cloudflare Access verification for the two-person COILSIDE team.
// The public Worker currently has an Everyone/Bypass rule. Until Cloudflare Access
// authenticates the Worker and these bindings are configured, all D1/R2 API
// routes must fail closed instead of trusting caller-provided identity headers.
import { getCoilsideCloudBindings } from "@/lib/cloud-server";

export type TeamRole = "owner" | "sean";
export type TeamAuth =
  | { ok: true; role: TeamRole; email: string }
  | { ok: false; status: number; error: string };

type AccessClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  email?: string;
};

function base64UrlBytes(input: string): Uint8Array<ArrayBuffer> {
  if (!/^[a-zA-Z0-9_-]+$/.test(input)) throw new Error("Malformed token");
  const decoded = atob(input.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
  return bytes;
}

function decodePart<T>(encoded: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(encoded))) as T;
}

export async function authenticateTeam(request: Request): Promise<TeamAuth> {
  const env = getCoilsideCloudBindings();
  const issuer = env.COILSIDE_ACCESS_ISSUER?.trim().replace(/\/$/, "");
  const audience = env.COILSIDE_ACCESS_AUD?.trim();
  const ownerEmail = env.COILSIDE_OWNER_EMAIL?.trim().toLowerCase();
  const seanEmail = env.COILSIDE_SEAN_EMAIL?.trim().toLowerCase();

  if (!issuer || !issuer.startsWith("https://") || !audience || !ownerEmail || !seanEmail || ownerEmail === seanEmail) {
    return { ok: false, status: 503, error: "Team access is not configured yet. Local records remain available." };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token || token.length > 12000) {
    return { ok: false, status: 401, error: "Cloudflare Access sign-in required." };
  }

  try {
    const pieces = token.split(".");
    if (pieces.length !== 3) throw new Error("Malformed token");
    const header = decodePart<{ alg?: string; kid?: string }>(pieces[0]);
    const claims = decodePart<AccessClaims>(pieces[1]);
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== "RS256" || !header.kid ||
        claims.iss !== issuer ||
        !(typeof claims.aud === "string" ? claims.aud === audience : claims.aud?.includes(audience)) ||
        typeof claims.exp !== "number" || claims.exp <= now ||
        (typeof claims.nbf === "number" && claims.nbf > now)) {
      throw new Error("Invalid Access claims");
    }

    const jwksResponse = await fetch(`${issuer}/cdn-cgi/access/certs`, { cache: "no-store" });
    if (!jwksResponse.ok) throw new Error("Access key lookup failed");
    const jwks = await jwksResponse.json() as { keys?: Array<JsonWebKey & { kid?: string }> };
    const jwk = jwks.keys?.find((item) => item.kid === header.kid && item.kty === "RSA");
    if (!jwk) throw new Error("Unrecognized signing key");
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, base64UrlBytes(pieces[2]), new TextEncoder().encode(`${pieces[0]}.${pieces[1]}`)
    );
    if (!verified) throw new Error("Invalid signature");
    const email = claims.email?.trim().toLowerCase();
    if (email === ownerEmail) return { ok: true, role: "owner", email };
    if (email === seanEmail) return { ok: true, role: "sean", email };
    return { ok: false, status: 403, error: "This account is not a COILSIDE team member." };
  } catch {
    return { ok: false, status: 401, error: "Cloudflare Access verification failed. Sign in again." };
  }
}
