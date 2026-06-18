#!/usr/bin/env node
/** Smoke test: expiração de cotação Uber (sem rede). */
import assert from 'node:assert/strict';

const QUOTE_EXPIRY_BUFFER_MS = 60_000;

function isUberQuoteExpired(expires, now = Date.now()) {
  if (!expires) return false;
  const t = Date.parse(expires);
  if (Number.isNaN(t)) return false;
  return t <= now + QUOTE_EXPIRY_BUFFER_MS;
}

function isUberQuoteUsable(quote) {
  return Boolean(quote.enabled && quote.quote_id && !isUberQuoteExpired(quote.expires));
}

const future = new Date(Date.now() + 5 * 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();
const soon = new Date(Date.now() + QUOTE_EXPIRY_BUFFER_MS - 1000).toISOString();

assert.equal(isUberQuoteExpired(future), false);
assert.equal(isUberQuoteExpired(past), true);
assert.equal(isUberQuoteExpired(soon), true);
assert.equal(isUberQuoteUsable({ enabled: true, quote_id: 'q1', expires: future }), true);
assert.equal(isUberQuoteUsable({ enabled: true, quote_id: 'q1', expires: past }), false);

console.log('uber quote lifecycle tests OK');
