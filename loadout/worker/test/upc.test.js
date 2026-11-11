import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { handleUpc, normalizeUpc, pickImages, mapLookup, LOOKUP_URL, MAX_PHOTO_BYTES, _resetUpcCache } from '../src/upc.js';

// Everything outbound goes through an injected fetch; the key set, the
// roster and the clock are injected too. No network.
const PROJECT = 'watchtower-6fbe1';
const ORIGIN = 'https://devriz.umbrellaautomation.com';
const NOW = Date.UTC(2026, 10, 11, 15, 0, 0);
const nowS = Math.floor(NOW / 1000);
const UPC = '012345678905';

const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify'],
);
const KEYS = [Object.assign(await crypto.subtle.exportKey('jwk', publicKey), { kid: 'k1', alg: 'RS256' })];
const b64url = bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)));
async function sign(uid = 'uid-w') {
  const head = enc({ alg: 'RS256', kid: 'k1', typ: 'JWT' });
  const body = enc({ aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: uid, iat: nowS - 10, exp: nowS + 3000, email: 'pat@umbrellaautomation.com', email_verified: true });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64url(new Uint8Array(sig));
}
const TOKEN = await sign();
const ROSTER = { 'uid-w': { role: 'warehouse', active: true }, 'uid-t': { role: 'tech', active: true } };

const env = { FIREBASE_PROJECT_ID: PROJECT, APP_ORIGINS: ORIGIN + ', https://other.example' };

const IMG1 = 'https://img.example/a.jpg';
const IMG2 = 'https://img.example/b.png';
const lookupBody = images => ({ code: 'OK', total: 1, items: [{ title: ' Example Switch 8-Port ', brand: 'Example', model: 'SW-8', images }] });

function jsonResp(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, headers) });
}
function imageResp(bytes, type = 'image/jpeg', extra = {}) {
  return new Response(bytes, { status: 200, headers: Object.assign({ 'Content-Type': type }, extra) });
}

// routes: { [url]: () => Response | throws }
function fakeFetch(routes) {
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const h = routes[String(url)];
    if (!h) throw new Error('unexpected fetch ' + url);
    return h();
  };
  f.calls = calls;
  return f;
}

function deps(routes, extra = {}) {
  return Object.assign({ fetch: fakeFetch(routes), now: () => NOW, keys: KEYS, getRoster: async uid => ROSTER[uid] || null, cache: null, timeoutMs: 1000 }, extra);
}
function get(path, { origin = ORIGIN, token = TOKEN, method = 'GET' } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = 'Bearer ' + token;
  headers.Cookie = 'session=should-not-travel';
  return new Request('https://loadout-worker.test' + path, { method, headers });
}
const lookupRoute = (body, status = 200, headers = { 'X-RateLimit-Remaining': '97' }) => ({ [LOOKUP_URL + UPC]: () => jsonResp(body, status, headers) });

test('upc: normalizeUpc', () => {
  assert.equal(normalizeUpc('012345678905'), '012345678905');
  assert.equal(normalizeUpc(' 0 12345 67890 5 '), '012345678905');
  assert.equal(normalizeUpc('0123-4567'), '01234567');
  assert.equal(normalizeUpc('4006381333931'), '4006381333931');
  assert.equal(normalizeUpc('10012345678902'), '10012345678902');
  for (const bad of ['', null, undefined, '1234567', '123456789', '12345678901', '123456789012345', '01234567890A', '0123.45678905']) {
    assert.throws(() => normalizeUpc(bad), e => e.status === 400 && e.message === 'That is not a UPC.', String(bad));
  }
});

test('upc: pickImages keeps http(s) only, drops duplicates, prefers https, caps at 4', () => {
  assert.deepEqual(pickImages([
    'javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x.example/a.jpg', 'not a url', 42, null,
    'http://img.example/a.jpg', 'https://img.example/a.jpg', 'https://img.example/a.jpg',
    'http://only-http.example/c.jpg', 'https://user:pw@img.example/d.jpg',
    'https://img.example/e.jpg', 'https://img.example/f.jpg', 'https://img.example/g.jpg',
  ]), ['https://img.example/a.jpg', 'https://img.example/e.jpg', 'https://img.example/f.jpg', 'https://img.example/g.jpg']);
  assert.deepEqual(pickImages(['http://only-http.example/c.jpg']), ['http://only-http.example/c.jpg']);
  assert.deepEqual(pickImages(undefined), []);
  assert.deepEqual(mapLookup({ code: 'OK', items: [] }), { found: false, title: null, brand: null, model: null, images: [] });
});

test('upc: lookup found maps the first item and reports the quota', async () => {
  _resetUpcCache();
  const d = deps(lookupRoute(lookupBody([IMG1, 'http://img.example/a.jpg', IMG2, 'x:y'])));
  const r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, d);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(r.headers.get('Vary'), 'Origin');
  assert.deepEqual(await r.json(), { ok: true, upc: UPC, found: true, title: 'Example Switch 8-Port', brand: 'Example', model: 'SW-8', photos: 2, remaining: 97, cached: false });
  // nothing of the caller travels: no Authorization, no cookie, fixed agent
  const init = d.fetch.calls[0].init;
  assert.equal(init.headers['User-Agent'], 'loadout-worker');
  assert.ok(!('Authorization' in init.headers) && !('Cookie' in init.headers));
  assert.ok(init.signal instanceof AbortSignal);
});

test('upc: a repeat lookup comes from the cache and spends no quota', async () => {
  _resetUpcCache();
  const d = deps(lookupRoute(lookupBody([IMG1])));
  await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, d);
  const r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, d);
  const j = await r.json();
  assert.equal(j.cached, true);
  assert.equal(j.remaining, null);
  assert.equal(d.fetch.calls.length, 1);
});

test('upc: the Cache API copy is used when module memory is cold', async () => {
  _resetUpcCache();
  const store = new Map();
  const cache = { match: async k => (store.has(k.url) ? store.get(k.url).clone() : undefined), put: async (k, v) => { store.set(k.url, v); } };
  const waits = [];
  const d = deps(lookupRoute(lookupBody([IMG1])), { cache });
  await handleUpc(get('/upc/lookup?upc=' + UPC), env, { waitUntil: p => waits.push(p) }, d);
  await Promise.all(waits);
  assert.equal(store.size, 1);
  assert.equal(store.get('https://loadout-worker.test/__upc-cache/' + UPC).headers.get('Cache-Control'), 'max-age=86400');
  _resetUpcCache();
  const j = await (await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, d)).json();
  assert.equal(j.cached, true);
  assert.equal(j.photos, 1);
  assert.equal(d.fetch.calls.length, 1);
});

test('upc: not found, busy, unreachable, bad UPC', async () => {
  _resetUpcCache();
  let r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, deps(lookupRoute({ code: 'OK', total: 0, offset: 0, items: [] })));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, upc: UPC, found: false, title: null, brand: null, model: null, photos: 0, remaining: 97, cached: false });

  _resetUpcCache();
  r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, deps(lookupRoute({ code: 'EXCEED_LIMIT' }, 429, { 'X-RateLimit-Remaining': '0' })));
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { ok: false, error: 'busy' });

  _resetUpcCache();
  r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, deps({ [LOOKUP_URL + UPC]: () => { throw new TypeError('fetch failed'); } }));
  assert.equal(r.status, 502);
  assert.deepEqual(await r.json(), { ok: false, error: 'unreachable' });

  _resetUpcCache();
  r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, deps({ [LOOKUP_URL + UPC]: () => new Response('<html>oops', { status: 500 }) }));
  assert.equal(r.status, 502);

  _resetUpcCache();
  r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, deps({ [LOOKUP_URL + UPC]: () => jsonResp({ code: 'INVALID_UPC', message: 'Not a valid UPC code.' }, 400) }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).found, false);

  const d = deps({});
  r = await handleUpc(get('/upc/lookup?upc=12ab'), env, {}, d);
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { ok: false, error: 'That is not a UPC.' });
  assert.equal(d.fetch.calls.length, 0);
});

test('upc: a lookup that never answers times out as unreachable', async () => {
  _resetUpcCache();
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  const d = deps({}, { fetch: hang, timeoutMs: 20 });
  const r = await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, d);
  assert.equal(r.status, 502);
});

test('upc: signed-out and wrong-role callers are refused before any lookup', async () => {
  _resetUpcCache();
  let d = deps(lookupRoute(lookupBody([IMG1])));
  let r = await handleUpc(get('/upc/lookup?upc=' + UPC, { token: null }), env, {}, d);
  assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { ok: false, error: 'unauthorized' });
  r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=0', { token: await sign('uid-t') }), env, {}, d);
  assert.equal(r.status, 403);
  assert.deepEqual(await r.json(), { ok: false, error: 'forbidden' });
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(d.fetch.calls.length, 0);
});

test('upc: photo returns the bytes of entry i from the lookup list', async () => {
  _resetUpcCache();
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
  const d = deps(Object.assign(lookupRoute(lookupBody([IMG1, IMG2])), { [IMG2]: () => imageResp(bytes, 'image/png; charset=binary') }));
  const r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=1&url=https://evil.example/x.jpg'), env, {}, d);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Content-Type'), 'image/png');
  assert.equal(r.headers.get('Cache-Control'), 'private, max-age=3600');
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()), bytes);
  assert.deepEqual(d.fetch.calls.map(c => c.url), [LOOKUP_URL + UPC, IMG2]);
  const init = d.fetch.calls[1].init;
  assert.equal(init.redirect, 'follow');
  assert.equal(init.headers['User-Agent'], 'loadout-worker');
  assert.ok(!('Authorization' in init.headers) && !('Cookie' in init.headers) && !('Referer' in init.headers));
});

test('upc: photo refuses an index out of range or malformed', async () => {
  _resetUpcCache();
  const d = deps(lookupRoute(lookupBody([IMG1])));
  let r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=1'), env, {}, d);
  assert.equal(r.status, 404);
  assert.deepEqual(await r.json(), { ok: false, error: 'no_such_photo' });
  r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=4'), env, {}, d);
  assert.equal(r.status, 404);
  for (const i of ['', '-1', '1.5', '10', 'x', '0x0']) {
    r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=' + i), env, {}, d);
    assert.equal(r.status, 400, 'i=' + i);
    assert.deepEqual(await r.json(), { ok: false, error: 'bad_index' });
  }
  r = await handleUpc(get('/upc/photo?upc=' + UPC), env, {}, d);
  assert.equal(r.status, 400);
  // only the lookup went out, never an image
  assert.deepEqual(d.fetch.calls.map(c => c.url), [LOOKUP_URL + UPC]);
});

test('upc: photo refuses a non-image, svg, an oversized body and a failed fetch', async () => {
  const cases = [
    ['text/html', () => imageResp('<html>', 'text/html')],
    ['svg', () => imageResp('<svg/>', 'image/svg+xml')],
    ['no type', () => new Response(new Uint8Array([1]), { status: 200 })],
    ['big by header', () => imageResp(new Uint8Array(10), 'image/jpeg', { 'Content-Length': String(MAX_PHOTO_BYTES + 1) })],
    ['big by bytes', () => imageResp(new Uint8Array(MAX_PHOTO_BYTES + 1), 'image/jpeg')],
    ['404', () => new Response('gone', { status: 404, headers: { 'Content-Type': 'image/jpeg' } })],
    ['network', () => { throw new TypeError('fetch failed'); }],
    ['empty', () => imageResp(new Uint8Array(0), 'image/jpeg')],
  ];
  for (const [name, h] of cases) {
    _resetUpcCache();
    const d = deps(Object.assign(lookupRoute(lookupBody([IMG1])), { [IMG1]: h }));
    const r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=0'), env, {}, d);
    assert.equal(r.status, 502, name);
    assert.deepEqual(await r.json(), { ok: false, error: 'photo_unavailable' }, name);
  }
});

test('upc: a body that streams past 5 MB with a false Content-Length is cut off', async () => {
  _resetUpcCache();
  let pulled = 0;
  const stream = new ReadableStream({
    pull(c) { pulled++; c.enqueue(new Uint8Array(1024 * 1024)); if (pulled > 50) c.close(); },
  });
  const d = deps(Object.assign(lookupRoute(lookupBody([IMG1])), { [IMG1]: () => new Response(stream, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '100' } }) }));
  const r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=0'), env, {}, d);
  assert.equal(r.status, 502);
  assert.ok(pulled <= 8, 'stopped reading early, pulled ' + pulled);
});

test('upc: photo after a lookup reuses the cached list', async () => {
  _resetUpcCache();
  const d = deps(Object.assign(lookupRoute(lookupBody([IMG1])), { [IMG1]: () => imageResp(new Uint8Array([1, 2]), 'image/webp') }));
  await handleUpc(get('/upc/lookup?upc=' + UPC), env, {}, d);
  const r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=0'), env, {}, d);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Content-Type'), 'image/webp');
  assert.deepEqual(d.fetch.calls.map(c => c.url), [LOOKUP_URL + UPC, IMG1]);
});

test('upc: photo passes busy through when the lookup is exhausted', async () => {
  _resetUpcCache();
  const d = deps(lookupRoute({ code: 'EXCEED_LIMIT' }, 429));
  const r = await handleUpc(get('/upc/photo?upc=' + UPC + '&i=0'), env, {}, d);
  assert.equal(r.status, 429);
});

// CORS through the real router; none of these reach auth or the network.
const call = (path, init) => worker.fetch(new Request('https://loadout-worker.test' + path, init), env, {});

test('cors: OPTIONS from a listed origin is 204 with the allow headers', async () => {
  for (const o of [ORIGIN, 'https://other.example']) {
    const r = await call('/upc/lookup?upc=' + UPC, { method: 'OPTIONS', headers: { Origin: o, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), o);
    assert.equal(r.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
    assert.equal(r.headers.get('Access-Control-Allow-Headers'), 'Authorization');
    assert.equal(r.headers.get('Access-Control-Max-Age'), '600');
    assert.equal(r.headers.get('Vary'), 'Origin');
  }
});

test('cors: another origin, a near miss, or no origin is 403 before anything else', async () => {
  for (const o of ['https://evil.example', ORIGIN + '/', 'http://devriz.umbrellaautomation.com', 'https://devriz.umbrellaautomation.com.evil.example', null]) {
    const headers = o ? { Origin: o } : {};
    for (const method of ['GET', 'OPTIONS']) {
      const r = await call('/upc/photo?upc=' + UPC + '&i=0', { method, headers });
      assert.equal(r.status, 403, method + ' ' + o);
      assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
      assert.deepEqual(await r.json(), { ok: false, error: 'origin_not_allowed' });
    }
  }
});

test('cors: a listed origin with POST is 405; Zapier and health send no CORS headers', async () => {
  let r = await call('/upc/lookup?upc=' + UPC, { method: 'POST', headers: { Origin: ORIGIN } });
  assert.equal(r.status, 405);
  r = await call('/health', { headers: { Origin: ORIGIN } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
  assert.deepEqual((await r.json()).upc, { configured: false, origins: 2 });
});
