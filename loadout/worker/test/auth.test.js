import test from 'node:test';
import assert from 'node:assert/strict';
import { requireStaff, verifyIdToken, rosterRole, maxAgeSeconds, _resetKeyCache, JWKS_URL } from '../src/auth.js';

// A key pair made here stands in for Google's; nothing touches the network.
const PROJECT = 'watchtower-6fbe1';
const NOW = Date.UTC(2026, 10, 11, 15, 0, 0);
const nowS = Math.floor(NOW / 1000);

const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify'],
);
const other = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify'],
);
const jwk = Object.assign(await crypto.subtle.exportKey('jwk', publicKey), { kid: 'k1', alg: 'RS256', use: 'sig' });
const KEYS = [jwk];

const b64url = bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)));

async function sign(claims = {}, { kid = 'k1', alg = 'RS256', key = privateKey } = {}) {
  const head = enc({ alg, kid, typ: 'JWT' });
  const body = enc(Object.assign({
    aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: 'uid-1', iat: nowS - 100, exp: nowS + 3000,
    email: 'pat@umbrellaautomation.com', email_verified: true,
  }, claims));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64url(new Uint8Array(sig));
}

const env = { FIREBASE_PROJECT_ID: PROJECT };
const req = token => new Request('https://w.test/upc/lookup', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
const roster = docs => async uid => (uid in docs ? docs[uid] : null);
const deps = (docs = { 'uid-1': { role: 'warehouse', active: true } }) => ({ keys: KEYS, now: () => NOW, getRoster: roster(docs), fetch: () => { throw new Error('no network in tests'); } });

async function status(p) {
  try { await p; return 200; } catch (e) { return e.status; }
}

test('auth: a token signed with the current key and a warehouse roster doc passes', async () => {
  const who = await requireStaff(req(await sign()), env, deps());
  assert.deepEqual(who, { uid: 'uid-1', email: 'pat@umbrellaautomation.com', role: 'warehouse' });
  const admin = await requireStaff(req(await sign()), env, deps({ 'uid-1': { role: 'admin' } }));
  assert.equal(admin.role, 'admin'); // active missing counts as active, like the rules
});

test('auth: missing, malformed and wrongly signed tokens are 401', async () => {
  assert.equal(await status(requireStaff(req(null), env, deps())), 401);
  assert.equal(await status(requireStaff(req('abc'), env, deps())), 401);
  assert.equal(await status(requireStaff(new Request('https://w.test/', { headers: { Authorization: 'Basic x' } }), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({ aud: 'another-project' })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({ iss: 'https://securetoken.google.com/another-project' })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({ exp: nowS - 61 })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({ iat: nowS + 600 })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({ sub: '' })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({}, { key: other.privateKey })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({}, { kid: 'unknown' })), env, deps())), 401);
  assert.equal(await status(requireStaff(req(await sign({}, { alg: 'HS256' })), env, deps())), 401);
  // a token whose body was edited after signing
  const t = (await sign()).split('.');
  t[1] = enc({ aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: 'uid-2', iat: nowS, exp: nowS + 100 });
  assert.equal(await status(requireStaff(req(t.join('.')), env, deps())), 401);
});

test('auth: exp inside the 60 s leeway still passes', async () => {
  assert.equal(await status(requireStaff(req(await sign({ exp: nowS - 30 })), env, deps())), 200);
});

test('auth: roster missing, inactive, tech and accounting are 403', async () => {
  const t = await sign();
  assert.equal(await status(requireStaff(req(t), env, deps({}))), 403);
  assert.equal(await status(requireStaff(req(t), env, deps({ 'uid-1': { role: 'admin', active: false } }))), 403);
  assert.equal(await status(requireStaff(req(t), env, deps({ 'uid-1': { role: 'tech', active: true } }))), 403);
  assert.equal(await status(requireStaff(req(t), env, deps({ 'uid-1': { role: 'accounting', active: true } }))), 403);
  assert.equal(await status(requireStaff(req(t), env, deps({ 'uid-1': { active: true } }))), 403); // no role = tech
});

test('auth: an unverified or off-domain address is 403 before the roster is read', async () => {
  let read = 0;
  const d = Object.assign(deps(), { getRoster: async () => { read++; return { role: 'admin' }; } });
  assert.equal(await status(requireStaff(req(await sign({ email_verified: false })), env, d)), 403);
  assert.equal(await status(requireStaff(req(await sign({ email: 'pat@gmail.com' })), env, d)), 403);
  assert.equal(read, 0);
});

test('auth: rosterRole mirrors loadoutRole()', () => {
  assert.equal(rosterRole(null), null);
  assert.equal(rosterRole({}), 'tech');
  assert.equal(rosterRole({ role: 'admin', active: false }), 'none');
  assert.equal(rosterRole({ role: 'warehouse', active: true }), 'warehouse');
});

test('auth: Google keys are fetched once and kept for max-age', async () => {
  _resetKeyCache();
  let calls = 0;
  let clock = NOW;
  const fetchKeys = async url => {
    calls++;
    assert.equal(url, JWKS_URL);
    return new Response(JSON.stringify({ keys: KEYS }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=20000, must-revalidate' } });
  };
  const d = { fetch: fetchKeys, now: () => clock, getRoster: roster({ 'uid-1': { role: 'admin' } }) };
  await requireStaff(req(await sign()), env, d);
  await requireStaff(req(await sign()), env, d);
  assert.equal(calls, 1);
  clock = NOW + 20001 * 1000;
  // the token itself has expired by now, but the keys are fetched again first
  await assert.rejects(verifyIdToken(await sign(), PROJECT, d), e => e.status === 401);
  assert.equal(calls, 2);
  _resetKeyCache();
});

test('auth: keys that cannot be fetched are a 502, not a 401', async () => {
  _resetKeyCache();
  const d = { fetch: async () => { throw new TypeError('network'); }, now: () => NOW, getRoster: roster({}) };
  assert.equal(await status(requireStaff(req(await sign()), env, d)), 502);
  _resetKeyCache();
});

test('auth: maxAgeSeconds', () => {
  assert.equal(maxAgeSeconds('public, max-age=19523, must-revalidate, no-transform'), 19523);
  assert.equal(maxAgeSeconds('no-cache'), null);
  assert.equal(maxAgeSeconds(null), null);
});
