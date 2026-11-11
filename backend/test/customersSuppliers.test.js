const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'unit-test-secret-with-enough-length';

const router = require('../src/routes/customersSuppliers');

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

// Find route handler in express router stack
function getHandler(method, path) {
  const route = router.stack.find(
    s => s.route && s.route.path === path && s.route.methods[method.toLowerCase()]
  );
  if (!route) throw new Error(`Route ${method} ${path} not found`);
  // Last middleware in route.stack is the actual handler
  return route.route.stack[route.route.stack.length - 1].handle;
}

test('POST /customers validates customer_name', async () => {
  const handler = getHandler('POST', '/customers');
  const req = { body: { customer_name: '', email: 'valid@example.com' } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Customer name is required/i);
});

test('POST /customers validates email format', async () => {
  const handler = getHandler('POST', '/customers');
  const req = { body: { customer_name: 'Test Customer', email: 'invalid-email' } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /valid email address is required/i);
});

test('POST /suppliers validates supplier_name', async () => {
  const handler = getHandler('POST', '/suppliers');
  const req = { body: { supplier_name: '  ' } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Supplier name is required/i);
});

test('POST /suppliers validates rating between 0 and 5', async () => {
  const handler = getHandler('POST', '/suppliers');
  const req = { body: { supplier_name: 'Good Vendor', rating: 6.5 } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Rating must be between 0 and 5/i);
});

test('POST /supplier-products validates supplier_id and product_id', async () => {
  const handler = getHandler('POST', '/supplier-products');
  const req = { body: { supplier_id: 0, product_id: 1, unit_cost: 10, lead_time_days: 5 } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Valid supplier and product are required/i);
});

test('POST /supplier-products validates non-negative unit_cost', async () => {
  const handler = getHandler('POST', '/supplier-products');
  const req = { body: { supplier_id: 1, product_id: 2, unit_cost: -5, lead_time_days: 5 } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Unit cost must be a non-negative number/i);
});

test('POST /supplier-products validates non-negative lead_time_days', async () => {
  const handler = getHandler('POST', '/supplier-products');
  const req = { body: { supplier_id: 1, product_id: 2, unit_cost: 50, lead_time_days: -1 } };
  const res = createMockRes();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Lead time must be a non-negative whole number/i);
});

