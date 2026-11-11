const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'unit-test-secret-with-enough-length';

const router = require('../src/routes/purchaseOrders');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function getHandler(method, path) {
  const route = router.stack.find(
    s => s.route && s.route.path === path && s.route.methods[method.toLowerCase()]
  );
  if (!route) throw new Error(`Route ${method} ${path} not found`);
  return route.route.stack[route.route.stack.length - 1].handle;
}

test('POST /purchase-orders validates supplier_id', async () => {
  const handler = getHandler('POST', '/purchase-orders');
  const req = { body: { supplier_id: 0, items: [{ product_id: 1, quantity: 10, unit_cost: 50 }] } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /valid supplier is required/i);
});

test('POST /purchase-orders requires at least one product item', async () => {
  const handler = getHandler('POST', '/purchase-orders');
  const req = { body: { supplier_id: 1, items: [] } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /At least one product item is required/i);
});

test('POST /purchase-orders validates item quantity is positive', async () => {
  const handler = getHandler('POST', '/purchase-orders');
  const req = { body: { supplier_id: 1, items: [{ product_id: 1, quantity: -5, unit_cost: 50 }] } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Quantity must be a positive integer/i);
});

test('POST /purchase-orders validates non-negative unit cost', async () => {
  const handler = getHandler('POST', '/purchase-orders');
  const req = { body: { supplier_id: 1, items: [{ product_id: 1, quantity: 5, unit_cost: -10 }] } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Unit cost must be non-negative/i);
});

