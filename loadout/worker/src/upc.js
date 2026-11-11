// Photo from a UPC (0.3.0, PLAN 21.4).
//
//   GET /upc/lookup?upc=     name, brand, model, how many photos
//   GET /upc/photo?upc=&i=   the bytes of photo i from that UPC's own lookup
//
// Both answer only to the app's origins (APP_ORIGINS) and only to a signed-in
// admin or warehouse person (src/auth.js). A browser cannot call the lookup
// service itself (it allows only its own site), so the app asks here.
//
// The photo route never takes a URL from the request: it re-reads the
// lookup for that UPC and fetches entry i of that list, so the worker cannot
// be used to fetch arbitrary addresses. Nothing is stored except the Cache
// API copy of each lookup (24 h), which saves the shared 100-a-day quota.

import { requireStaff, HttpError } from './auth.js';

export const LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup?upc=';
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const TIMEOUT_MS = 10_000;
export const LOOKUP_TTL_S = 24 * 3600;
const UA = 'loadout-worker';
const PHOTO_TYPES = new Map([
  ['image/jpeg', 'image/jpeg'], ['image/jpg', 'image/jpeg'], ['image/pjpeg', 'image/jpeg'],
  ['image/png', 'image/png'], ['image/webp', 'image/webp'], ['image/gif', 'image/gif'],
]);

// ---------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------

export function appOrigins(env) {
  return String(env.APP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
}

// The request's Origin when it is exactly on the list, else null. A request
// with no Origin is refused too: the app always sends one (cross-origin).
export function allowedOrigin(request, env) {
  const o = request.headers.get('Origin');
  return o && appOrigins(env).includes(o) ? o : null;
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {}) });
}

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------

// Spaces and dashes are dropped (a UPC copied from a label often has them);
// anything else that is not a digit makes it not a UPC.
export function normalizeUpc(s) {
  const t = String(s == null ? '' : s).replace(/[\s-]/g, '');
  if (!/^\d+$/.test(t) || ![8, 12, 13, 14].includes(t.length)) throw new HttpError(400, 'That is not a UPC.');
  return t;
}

// ---------------------------------------------------------------------
// Mapping the service's answer
// ---------------------------------------------------------------------

function cleanText(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, 300) : null;
}

// http(s) only, no credentials in the URL, no duplicates (an http copy of
// an https URL counts as a duplicate), https first, at most 4.
export function pickImages(list) {
  const byRest = new Map(); // URL without its scheme -> href, https wins
  for (const raw of Array.isArray(list) ? list : []) {
    if (typeof raw !== 'string') continue;
    let u;
    try { u = new URL(raw.trim()); } catch { continue; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
    if (u.username || u.password) continue;
    const rest = u.href.slice(u.protocol.length);
    const had = byRest.get(rest);
    if (!had || (u.protocol === 'https:' && had.startsWith('http:'))) byRest.set(rest, u.href);
  }
  const all = [...byRest.values()];
  return all.filter(h => h.startsWith('https:')).concat(all.filter(h => h.startsWith('http:'))).slice(0, MAX_PHOTOS);
}

export function mapLookup(body) {
  const item = body && Array.isArray(body.items) ? body.items.find(x => x && typeof x === 'object') : null;
  if (!item) return { found: false, title: null, brand: null, model: null, images: [] };
  return { found: true, title: cleanText(item.title), brand: cleanText(item.brand), model: cleanText(item.model), images: pickImages(item.images) };
}

function remainingOf(resp) {
  const v = resp.headers.get('X-RateLimit-Remaining');
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------
// Outbound fetch with a timeout and nothing of the caller's attached
// ---------------------------------------------------------------------

async function timed(deps, url, init, work) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), deps.timeoutMs);
  try {
    const resp = await deps.fetch(url, Object.assign({ signal: ac.signal }, init));
    return await work(resp);
  } finally {
    clearTimeout(timer);
  }
}

const unreachable = () => new HttpError(502, 'unreachable');

// The service's answer for one UPC: { data: {found,title,brand,model,images}, remaining }.
export async function fetchLookup(upc, deps) {
  try {
    return await timed(deps, LOOKUP_URL + upc, { method: 'GET', headers: { 'User-Agent': UA, Accept: 'application/json' }, redirect: 'follow' }, async resp => {
      const remaining = remainingOf(resp);
      if (resp.status === 429) throw new HttpError(429, 'busy');
      let body = null;
      try { body = await resp.json(); } catch { body = null; }
      const code = body && typeof body.code === 'string' ? body.code : '';
      if (resp.ok && code === 'OK') return { data: mapLookup(body), remaining };
      // The service answers a well-formed UPC it has never seen with 200 and
      // no items, and one that fails its check digit with INVALID_UPC.
      if ((resp.status === 400 || resp.status === 404) && /^(INVALID_UPC|NOT_FOUND)$/.test(code)) {
        return { data: mapLookup(null), remaining };
      }
      if (code === 'EXCEED_LIMIT' || code === 'TOO_FAST') throw new HttpError(429, 'busy');
      throw unreachable();
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw unreachable();
  }
}

// ---------------------------------------------------------------------
// Cache: module memory first (same isolate), then the Cache API
// ---------------------------------------------------------------------

const MEM_MAX = 200;
const mem = new Map();

export function _resetUpcCache() {
  mem.clear();
}

function cacheKey(request, upc) {
  return new Request(new URL('/__upc-cache/' + upc, request.url).href, { method: 'GET' });
}

async function cacheGet(request, upc, deps) {
  const hit = mem.get(upc);
  if (hit && hit.expiresAt > deps.now()) return hit.data;
  if (hit) mem.delete(upc);
  if (!deps.cache) return null;
  try {
    const r = await deps.cache.match(cacheKey(request, upc));
    if (!r) return null;
    const data = await r.json();
    memPut(upc, data, deps);
    return data;
  } catch {
    return null;
  }
}

function memPut(upc, data, deps) {
  mem.delete(upc);
  mem.set(upc, { data, expiresAt: deps.now() + LOOKUP_TTL_S * 1000 });
  while (mem.size > MEM_MAX) mem.delete(mem.keys().next().value);
}

function cachePut(request, upc, data, deps, ctx) {
  memPut(upc, data, deps);
  if (!deps.cache) return;
  const resp = new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + LOOKUP_TTL_S } });
  const p = Promise.resolve().then(() => deps.cache.put(cacheKey(request, upc), resp)).catch(() => {});
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p);
}

async function lookup(request, upc, deps, ctx) {
  const cached = await cacheGet(request, upc, deps);
  if (cached) return { data: cached, remaining: null, cached: true };
  const r = await fetchLookup(upc, deps);
  cachePut(request, upc, r.data, deps, ctx);
  return { data: r.data, remaining: r.remaining, cached: false };
}

// ---------------------------------------------------------------------
// Photo bytes
// ---------------------------------------------------------------------

const photoGone = () => new HttpError(502, 'photo_unavailable');

export async function fetchPhoto(url, deps) {
  try {
    return await timed(deps, url, { method: 'GET', headers: { 'User-Agent': UA, Accept: 'image/jpeg, image/png, image/webp, image/gif' }, redirect: 'follow' }, async resp => {
      if (!resp.ok || !resp.body) throw photoGone();
      const type = PHOTO_TYPES.get(String(resp.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase());
      if (!type) throw photoGone();
      const len = Number(resp.headers.get('Content-Length'));
      if (Number.isFinite(len) && len > MAX_PHOTO_BYTES) throw photoGone();
      const reader = resp.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_PHOTO_BYTES) {
          try { await reader.cancel(); } catch { /* already closed */ }
          throw photoGone();
        }
        chunks.push(value);
      }
      if (!total) throw photoGone();
      const bytes = new Uint8Array(total);
      let at = 0;
      for (const c of chunks) { bytes.set(c, at); at += c.byteLength; }
      return { bytes, type };
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw photoGone();
  }
}

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------

function withDefaults(deps = {}) {
  return Object.assign({
    fetch: (...a) => fetch(...a),
    now: () => Date.now(),
    cache: typeof caches !== 'undefined' && caches.default ? caches.default : null,
    timeoutMs: TIMEOUT_MS,
  }, deps);
}

export async function handleUpc(request, env, ctx, deps) {
  const d = withDefaults(deps);
  const origin = allowedOrigin(request, env);
  if (!origin) return json({ ok: false, error: 'origin_not_allowed' }, 403, { Vary: 'Origin' });
  const cors = corsHeaders(origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET') return json({ ok: false, error: 'Use GET' }, 405, Object.assign({ Allow: 'GET, OPTIONS' }, cors));

  const url = new URL(request.url);
  try {
    await requireStaff(request, env, d);
    const upc = normalizeUpc(url.searchParams.get('upc'));

    if (url.pathname === '/upc/lookup') {
      const r = await lookup(request, upc, d, ctx);
      return json({
        ok: true, upc, found: r.data.found, title: r.data.title, brand: r.data.brand, model: r.data.model,
        photos: Math.min(MAX_PHOTOS, r.data.images.length), remaining: r.remaining, cached: r.cached,
      }, 200, Object.assign({ 'Cache-Control': 'private, no-store' }, cors));
    }

    const iRaw = url.searchParams.get('i');
    if (iRaw == null || !/^\d$/.test(iRaw)) throw new HttpError(400, 'bad_index');
    const i = Number(iRaw);
    const r = await lookup(request, upc, d, ctx);
    const src = r.data.images[i];
    if (i >= MAX_PHOTOS || !src) throw new HttpError(404, 'no_such_photo');
    const photo = await fetchPhoto(src, d);
    return new Response(photo.bytes, {
      status: 200,
      headers: Object.assign({
        'Content-Type': photo.type,
        'Content-Length': String(photo.bytes.byteLength),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      }, cors),
    });
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.code }, e.status, cors);
    console.error('upc route error:', e && e.stack ? e.stack : e);
    return json({ ok: false, error: 'server_error' }, 500, cors);
  }
}
