#!/usr/bin/env node
/** Smoke test: deep links de notificação (sem DB). */
import assert from 'node:assert/strict';

function str(d, key) {
  const v = d[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function notificationHref(n, role = 'cliente') {
  const d = n.data ?? {};
  if (role === 'assistencia') {
    switch (n.type) {
      case 'request':
        return str(d, 'request_id') ? `/(shop)/solicitacao/${d.request_id}` : '/(shop)/(tabs)/orcamentos';
      case 'message':
        return str(d, 'request_id') ? `/(shop)/conversa/${d.request_id}` : '/(shop)/(tabs)/mensagens';
      case 'payment':
        return str(d, 'order_id') ? `/(shop)/os/${d.order_id}` : '/(shop)/(tabs)/ordens';
      default:
        return null;
    }
  }
  switch (n.type) {
    case 'order': {
      const requestId = str(d, 'request_id');
      return requestId ? `/(client)/pedido/${requestId}` : '/(client)/(tabs)/pedidos';
    }
    case 'message': {
      const requestId = str(d, 'request_id');
      const shopId = str(d, 'shop_id');
      if (requestId && shopId) {
        return `/(client)/chat/${requestId}?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent('Assistência')}`;
      }
      return '/(client)/(tabs)/pedidos';
    }
    case 'product_order': {
      const orderId = str(d, 'product_order_id') ?? str(d, 'order_id');
      return orderId ? `/(client)/pedido-produto/${orderId}` : '/(client)/(tabs)/pedidos';
    }
    case 'listing_interest':
      return str(d, 'listing_id')
        ? str(d, 'buyer_id')
          ? `/(client)/anuncio-chat/${d.listing_id}?buyerId=${encodeURIComponent(d.buyer_id)}`
          : `/(client)/anuncio/${d.listing_id}`
        : '/(client)/vitrine';
    case 'listing_message': {
      const listingId = str(d, 'listing_id');
      const buyerId = str(d, 'buyer_id');
      if (listingId && buyerId) {
        return `/(client)/anuncio-chat/${listingId}?buyerId=${encodeURIComponent(buyerId)}`;
      }
      return listingId ? `/(client)/anuncio-chat/${listingId}` : '/(client)/vitrine';
    }
    case 'delivery_update': {
      const orderId = str(d, 'product_order_id');
      return orderId ? `/(client)/pedido-produto/${orderId}` : '/(client)/(tabs)/pedidos';
    }
    default:
      return null;
  }
}

const row = (type, data) => ({ id: '1', title: 't', body: 'b', type, data, read_at: null, created_at: '' });

assert.equal(
  notificationHref(row('order', { order_id: 'os-1', request_id: 'req-1' })),
  '/(client)/pedido/req-1',
);

assert.equal(
  notificationHref(row('message', { request_id: 'req-1', shop_id: 'shop-1' })),
  '/(client)/chat/req-1?shopId=shop-1&shopName=Assist%C3%AAncia',
);

assert.equal(
  notificationHref(row('product_order', { order_id: 'po-1' })),
  '/(client)/pedido-produto/po-1',
);

assert.equal(
  notificationHref(row('payment', { order_id: 'os-9' }), 'assistencia'),
  '/(shop)/os/os-9',
);

assert.equal(
  notificationHref(row('listing_message', { listing_id: 'lst-1', buyer_id: 'buy-1' })),
  '/(client)/anuncio-chat/lst-1?buyerId=buy-1',
);

assert.equal(
  notificationHref(row('listing_interest', { listing_id: 'lst-2', buyer_id: 'buy-2' })),
  '/(client)/anuncio-chat/lst-2?buyerId=buy-2',
);

assert.equal(
  notificationHref(row('delivery_update', { product_order_id: 'po-uber-1' })),
  '/(client)/pedido-produto/po-uber-1',
);

console.log('notification href tests OK');
