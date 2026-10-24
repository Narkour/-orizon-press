const { readFileSync } = require('node:fs')
const { resolve, dirname } = require('node:path')
const ts = require('typescript')
const assert = require('node:assert/strict')

const calls = { create: 0, capture: 0, sign: 0 }
let storedSlug = 'children-of-the-stars'
const chain = {
  select() { return this }, eq() { return this }, limit() { return this },
  single: async () => ({ data: { book_slug: storedSlug, token_expires_at: '2099-01-01' } }),
  maybeSingle: async () => ({ data: { id: 'order', order_type: 'ebook' } }),
  insert: async () => ({ error: null }), update() { return this },
}
const db = { from: () => chain, auth: { getUser: async () => ({ data: { user: { email: 'reader@example.com' } } }) }, storage: { from: () => ({ createSignedUrl: async () => { calls.sign++; return { data: { signedUrl: 'test' } } } }) } }
function load(path) {
  const mod = { exports: {} }
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  function mockRequire(id) {
    if (id === '@paypal/paypal-server-sdk') return { Client: class {}, Environment: { Production: 'production' }, CheckoutPaymentIntent: { Capture: 'CAPTURE' }, OrdersController: class {
      async createOrder() { calls.create++; return { result: { id: 'paypal-order' } } }
      async getOrder() { return { result: { purchaseUnits: [{ customId: `${storedSlug}|reader@example.com|ebook` }] } } }
      async captureOrder() { calls.capture++; return { result: { status: 'COMPLETED' } } }
    } }
    if (id === '@supabase/supabase-js') return { createClient: () => db }
    if (id.includes('rate-limit')) return { rateLimit: () => true }
    if (id.includes('cors')) return { setCorsRestricted() {}, handleOptions: () => true }
    if (id.includes('distribution')) return load(resolve(dirname(path), id.replace(/\.js$/, '.ts')))
    return require(id)
  }
  new Function('require', 'module', 'exports', source)(mockRequire, mod, mod.exports)
  return mod.exports
}
const body = { bookSlug: 'children-of-the-stars', bookTitle: 'Children of the Stars', amount: '4.99', buyerEmail: 'reader@example.com', orderId: 'paypal-order' }
async function run(file, req) {
  const res = { code: 200, status(code) { this.code = code; return this }, json(value) { this.value = value; return this } }
  await load(resolve('api', file)).default({ headers: {}, query: {}, body: {}, ...req }, res)
  return res
}
;(async () => {
  assert.equal((await run('create-paypal-order.ts', { method: 'POST', body })).code, 409)
  assert.equal(calls.create, 0, 'paused ebook must not reach PayPal')
  assert.equal((await run('create-paypal-order.ts', { method: 'POST', body: { ...body, bookSlug: 'other-book' } })).code, 200)
  assert.equal((await run('create-paypal-order.ts', { method: 'POST', body: { ...body, orderType: 'audiobook' } })).code, 200)
  assert.equal((await run('capture-paypal-order.ts', { method: 'POST', body })).code, 409)
  assert.equal((await run('capture-paypal-order.ts', { method: 'POST', body: { ...body, bookSlug: 'other-book' } })).code, 409, 'stored PayPal identity must also be checked')
  assert.equal(calls.capture, 0, 'blocked orders must never be charged')
  assert.equal((await run('download-ebook.ts', { method: 'GET', query: { token: 'existing-token' } })).code, 409)
  assert.equal(calls.sign, 0, 'existing token must not yield a download')
  assert.equal((await run('my-library.ts', { method: 'POST', headers: { authorization: 'Bearer session' }, body })).code, 409)
  storedSlug = 'other-book'
  assert.equal((await run('capture-paypal-order.ts', { method: 'POST', body: { ...body, bookSlug: storedSlug } })).code, 200)
  console.log('PASS: paused checkout, pre-existing captures, forged slug, download tokens and re-download blocked; other titles and audiobook checkout preserved.')
})().catch(error => { console.error(error); process.exitCode = 1 })
