// Minimal OpenID Connect provider that behaves like Google for end-to-end tests.
// Implements /auth (consent page), /token (code + PKCE S256 + client secret), /jwks.
// Never used by the app unless GOOGLE_AUTH_URL/GOOGLE_TOKEN_URL/GOOGLE_JWKS_URL/GOOGLE_ISSUER point here.
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

const PORT = Number(process.env.MOCK_GOOGLE_PORT ?? 4455);
const ISSUER = `http://localhost:${PORT}`;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "nova-test-client";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "nova-test-secret";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
const codes = new Map();

const read = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, ISSUER);
    if (url.pathname === "/jwks") return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ keys: [jwk] }));

    if (url.pathname === "/auth") {
      const q = url.searchParams;
      if (q.get("client_id") !== CLIENT_ID || q.get("code_challenge_method") !== "S256" || !q.get("code_challenge")) return res.writeHead(400).end("bad request");
      // GET shows a consent form; POST (the form) issues the code.
      if (req.method === "GET") {
        const hint = q.get("login_hint") ?? "";
        return res.writeHead(200, { "Content-Type": "text/html" }).end(`<!doctype html><title>Sign in – Google (test)</title>
<form method="post"><h1>Choose an account</h1>
<label>Email <input name="email" value="${hint}"></label><label>Name <input name="name" value="Test Google User"></label>
<label><input type="checkbox" name="verified" checked> email verified</label>
<button name="action" value="allow">Continue</button><button name="action" value="deny">Cancel</button></form>`);
      }
      const form = new URLSearchParams(await read(req));
      const redirect = new URL(q.get("redirect_uri"));
      redirect.searchParams.set("state", q.get("state"));
      if (form.get("action") === "deny") {
        redirect.searchParams.set("error", "access_denied");
      } else {
        const code = randomBytes(16).toString("hex");
        const email = form.get("email");
        codes.set(code, { email, name: form.get("name"), verified: form.get("verified") === "on", nonce: q.get("nonce"), challenge: q.get("code_challenge"), redirectUri: q.get("redirect_uri"), sub: "g-" + createHash("sha256").update(email).digest("hex").slice(0, 16) });
        redirect.searchParams.set("code", code);
      }
      return res.writeHead(302, { Location: redirect.toString() }).end();
    }

    if (url.pathname === "/token" && req.method === "POST") {
      const b = new URLSearchParams(await read(req));
      const c = codes.get(b.get("code"));
      codes.delete(b.get("code"));
      const verifierOk = c && createHash("sha256").update(b.get("code_verifier") ?? "").digest("base64url") === c.challenge;
      if (!c || !verifierOk || b.get("client_id") !== CLIENT_ID || b.get("client_secret") !== CLIENT_SECRET || b.get("redirect_uri") !== c.redirectUri) {
        return res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "invalid_grant" }));
      }
      const idToken = await new SignJWT({ email: c.email, email_verified: c.verified, name: c.name, nonce: c.nonce, picture: null })
        .setProtectedHeader({ alg: "RS256", kid: "test-key" })
        .setIssuer(ISSUER).setAudience(CLIENT_ID).setSubject(c.sub).setIssuedAt().setExpirationTime("10m")
        .sign(privateKey);
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ access_token: randomBytes(12).toString("hex"), id_token: idToken, expires_in: 3599, token_type: "Bearer", scope: "openid email profile" }));
    }
    res.writeHead(404).end();
  })
  .listen(PORT, () => console.log(`mock google on ${ISSUER}`));
