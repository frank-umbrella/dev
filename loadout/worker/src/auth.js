// Signed-in staff check for the app-facing routes (0.3.0, PLAN 21.4).
//
// The app sends the person's Firebase ID token as `Authorization: Bearer
// <jwt>`. The worker checks it with WebCrypto against Google's published
// keys (no library), then reads the person's roster document with the
// service account and lets through only admin and warehouse, the same roles
// that loadoutWriter() in watchtower/firestore.rules allows to change the
// catalog.

import { getAccessToken, getDoc, SCOPE_DATASTORE } from './firestore.js';

export const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
export const STAFF_ROLES = ['admin', 'warehouse'];
// Same test as isMSPAdmin() in the rules: a verified address on the domain.
const STAFF_EMAIL = /@umbrellaautomation\.com$/i;
const LEEWAY_S = 60;
const DEFAULT_KEYS_TTL_S = 3600;

export class HttpError extends Error {
  constructor(status, code, detail) {
    super(detail || code);
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------
// Google's signing keys, cached in module memory for the response's max-age
// ---------------------------------------------------------------------

let keyCache = { keys: null, expiresAt: 0 };

export function _resetKeyCache() {
  keyCache = { keys: null, expiresAt: 0 };
}

export function maxAgeSeconds(cacheControl) {
  const m = /(?:^|,)\s*max-age\s*=\s*(\d+)/i.exec(cacheControl || '');
  return m ? Number(m[1]) : null;
}

async function importJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

export async function importKeySet(jwks) {
  const keys = new Map();
  for (const k of jwks || []) {
    if (!k || k.kty !== 'RSA' || !k.kid || !k.n || !k.e) continue;
    if (k.alg && k.alg !== 'RS256') continue;
    keys.set(k.kid, await importJwk(k));
  }
  return keys;
}

async function signingKeys(deps) {
  if (deps.keys) return importKeySet(deps.keys);
  const now = deps.now();
  if (keyCache.keys && keyCache.expiresAt > now) return keyCache.keys;
  let resp;
  try {
    resp = await deps.fetch(JWKS_URL, { headers: { 'User-Agent': 'loadout-worker' } });
  } catch {
    throw new HttpError(502, 'keys_unreachable', 'Could not fetch the sign-in keys');
  }
  if (!resp.ok) throw new HttpError(502, 'keys_unreachable', 'Sign-in keys answered ' + resp.status);
  const body = await resp.json();
  const keys = await importKeySet(body && body.keys);
  const ttl = maxAgeSeconds(resp.headers.get('Cache-Control'));
  keyCache = { keys, expiresAt: now + Math.max(60, ttl == null ? DEFAULT_KEYS_TTL_S : ttl) * 1000 };
  return keys;
}

// ---------------------------------------------------------------------
// Token verification
// ---------------------------------------------------------------------

export function b64urlToBytes(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('not base64url');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson(part) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
}

const bad = detail => new HttpError(401, 'unauthorized', detail);

// Returns the token's claims, or throws a 401 HttpError.
export async function verifyIdToken(jwt, projectId, deps) {
  const parts = typeof jwt === 'string' ? jwt.split('.') : [];
  if (parts.length !== 3) throw bad('Token is not a JWT');
  let header, payload, sig;
  try {
    header = decodeJson(parts[0]);
    payload = decodeJson(parts[1]);
    sig = b64urlToBytes(parts[2]);
  } catch {
    throw bad('Token does not decode');
  }
  if (!header || header.alg !== 'RS256') throw bad('Token algorithm is not RS256');
  if (typeof header.kid !== 'string' || !header.kid) throw bad('Token has no key id');

  const keys = await signingKeys(deps);
  const key = keys.get(header.kid);
  if (!key) throw bad('Token key id is not one of Google\'s current keys');
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw bad('Token signature does not verify');

  const nowS = Math.floor(deps.now() / 1000);
  if (!payload || typeof payload !== 'object') throw bad('Token has no claims');
  if (payload.aud !== projectId) throw bad('Token is for another project');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw bad('Token issuer is wrong');
  if (typeof payload.exp !== 'number' || payload.exp + LEEWAY_S <= nowS) throw bad('Token has expired');
  if (typeof payload.iat !== 'number' || payload.iat - LEEWAY_S > nowS) throw bad('Token is issued in the future');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw bad('Token has no subject');
  return payload;
}

// ---------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------

// Roster doc id is the Firebase uid (index.html writes loadout_users/{uid}
// on first sign-in; the rules read the same path).
async function readRoster(env, uid) {
  const token = await getAccessToken(env, SCOPE_DATASTORE);
  return getDoc(env, token, 'loadout_users/' + encodeURIComponent(uid));
}

// Mirrors loadoutRole(): active defaults to true, role defaults to tech.
export function rosterRole(doc) {
  if (!doc) return null;
  if ((doc.active === undefined || doc.active === null ? true : doc.active) !== true) return 'none';
  return doc.role || 'tech';
}

function withDefaults(deps = {}) {
  return {
    fetch: deps.fetch || ((...a) => fetch(...a)),
    now: deps.now || (() => Date.now()),
    keys: deps.keys || null,
    getRoster: deps.getRoster || null,
  };
}

// { uid, email, role } for an active admin or warehouse person on the
// roster; otherwise throws an HttpError (401 token, 403 roster, 502/503
// when the worker itself cannot check).
export async function requireStaff(request, env, deps) {
  const d = withDefaults(deps);
  if (!env.FIREBASE_PROJECT_ID) throw new HttpError(503, 'not_configured', 'FIREBASE_PROJECT_ID is not set');
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('Authorization') || '');
  if (!m) throw bad('No sign-in token');
  const claims = await verifyIdToken(m[1], env.FIREBASE_PROJECT_ID, d);

  const email = typeof claims.email === 'string' ? claims.email : '';
  if (claims.email_verified !== true || !STAFF_EMAIL.test(email)) throw new HttpError(403, 'forbidden', 'Not a verified staff address');

  let doc;
  if (d.getRoster) {
    doc = await d.getRoster(claims.sub);
  } else {
    if (!env.FIREBASE_SERVICE_ACCOUNT) throw new HttpError(503, 'not_configured', 'FIREBASE_SERVICE_ACCOUNT is not set');
    try {
      doc = await readRoster(env, claims.sub);
    } catch (e) {
      throw new HttpError(502, 'roster_unreachable', String(e && e.message ? e.message : e));
    }
  }
  const role = rosterRole(doc);
  if (!role) throw new HttpError(403, 'forbidden', 'Not on the roster');
  if (!STAFF_ROLES.includes(role)) throw new HttpError(403, 'forbidden', 'Role ' + role + ' cannot look up photos');
  return { uid: claims.sub, email, role };
}
