const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'unit-test-secret-with-enough-length';

const { authenticate, authorize } = require('../src/auth');

function response() {
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

function requestWithToken(token) {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} };
}

test('authentication rejects missing and invalid bearer tokens', () => {
  for (const token of [null, 'not-a-token']) {
    const req = requestWithToken(token);
    const res = response();
    let continued = false;

    authenticate(req, res, () => { continued = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(continued, false);
  }
});

test('authentication attaches verified user claims', () => {
  const token = jwt.sign({ id: 7, username: 'staff-user', role: 'staff' }, process.env.JWT_SECRET);
  const req = requestWithToken(token);
  const res = response();
  let continued = false;

  authenticate(req, res, () => { continued = true; });

  assert.equal(continued, true);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.role, 'staff');
});

test('authorization allows permitted roles and rejects others', () => {
  const allowedRequest = { user: { role: 'admin' } };
  let continued = false;
  authorize('admin')(allowedRequest, response(), () => { continued = true; });
  assert.equal(continued, true);

  const deniedResponse = response();
  authorize('admin')({ user: { role: 'staff' } }, deniedResponse, () => {});
  assert.equal(deniedResponse.statusCode, 403);
  assert.equal(deniedResponse.body.success, false);
});