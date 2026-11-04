require('dotenv').config();

if (process.env.ALLOW_DB_INTEGRATION_TESTS !== 'true') {
  console.error('Set ALLOW_DB_INTEGRATION_TESTS=true to run disposable database tests.');
  process.exit(1);
}

const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const pool = require('../src/db');

const apiBase = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const suffix = `${Date.now()}_${randomBytes(3).toString('hex')}`;
const usernames = [`test_staff_${suffix}`, `test_admin_${suffix}`];
const testPassword = randomBytes(24).toString('hex');
const cleanupErrors = [];
let productId;
let inventoryId;
let orderId;

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() };
}

function expectStatus(result, expected, operation) {
  assert.equal(result.status, expected, `${operation}: expected HTTP ${expected}, got ${result.status}`);
  assert.equal(result.body.success, expected < 400, `${operation}: unexpected API result`);
}

async function cleanup(query, values) {
  try {
    await pool.execute(query, values);
  } catch (error) {
    cleanupErrors.push(error.message);
  }
}

async function run() {
  try {
    const [[category]] = await pool.query('SELECT category_id FROM category WHERE is_active=TRUE ORDER BY category_id LIMIT 1');
    const [[uom]] = await pool.query('SELECT uom_id FROM uom ORDER BY uom_id LIMIT 1');
    const [[warehouse]] = await pool.query('SELECT warehouse_id FROM warehouse ORDER BY warehouse_id LIMIT 1');
    const [[customer]] = await pool.query('SELECT customer_id FROM customer ORDER BY customer_id LIMIT 1');
    const [[supplierProduct]] = await pool.query('SELECT supplier_id FROM supplier_product ORDER BY supplier_id LIMIT 1');
    assert.ok(category && uom && warehouse && customer && supplierProduct, 'Required category, unit, warehouse, customer, or supplier fixture is missing');

    for (const [index, role] of ['staff', 'admin'].entries()) {
      const passwordHash = await bcrypt.hash(testPassword, 10);
      await pool.execute(
        'INSERT INTO app_users (username,password_hash,role) VALUES (?,?,?)',
        [usernames[index], passwordHash, role]
      );
    }

    const staffLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: usernames[0], password: testPassword }
    });
    expectStatus(staffLogin, 200, 'staff login');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: usernames[1], password: testPassword }
    });
    expectStatus(adminLogin, 200, 'admin login');

    const health = await request('/api/health');
    expectStatus(health, 200, 'API/MySQL health');
    assert.equal(health.body.mysql, true, 'MySQL health check did not report connected');
    const readPaths = [
      '/api/dashboard/stats', '/api/manage/lookups', '/api/manage/products', '/api/manage/inventory',
      '/api/manage/inventory-lookups', '/api/manage/orders', '/api/manage/order-lookups', '/api/data/suppliers', '/api/data/warehouses',
      '/api/data/customers', '/api/data/orders', '/api/data/risks', '/api/data/transfers',
      '/api/analytics/demand', '/api/analytics/risk-summary'
    ];
    for (const path of readPaths) expectStatus(await request(path), 200, `read endpoint ${path}`);

    const demand = await request('/api/analytics/demand');
    assert.ok(Array.isArray(demand.body.history) && Array.isArray(demand.body.forecasts) && Array.isArray(demand.body.summary), 'Demand analytics response is incomplete');
    const riskSummary = await request('/api/analytics/risk-summary');
    assert.ok(riskSummary.body.totals && Array.isArray(riskSummary.body.items), 'Risk analytics response is incomplete');

    const [lowStockRows] = await pool.query('CALL GetLowStock(?)', [warehouse.warehouse_id]);
    const [supplierRows] = await pool.query('CALL GetSupplierProducts(?)', [supplierProduct.supplier_id]);
    assert.ok(Array.isArray(lowStockRows) && Array.isArray(supplierRows), 'Stored procedures did not return result sets');

    if (process.env.VERIFY_NEO4J === 'true') {
      for (const path of ['/api/neo4j/health', '/api/neo4j/summary', '/api/neo4j/supplier-network']) {
        expectStatus(await request(path), 200, `Neo4j endpoint ${path}`);
      }
    }

    const [[legacyCancelled]] = await pool.query("SELECT so_id FROM sales_order WHERE status='Cancelled' ORDER BY so_id LIMIT 1");
    if (legacyCancelled) {
      const deleteLegacyOrder = await request(`/api/manage/orders/${legacyCancelled.so_id}`, {
        method: 'DELETE',
        token: adminLogin.body.token
      });
      expectStatus(deleteLegacyOrder, 409, 'admin cannot delete an untracked historical order');
    }

    const sku = `IT-${suffix}`;
    const unauthenticatedProduct = await request('/api/manage/products', {
      method: 'POST',
      body: { category_id: category.category_id, uom_id: uom.uom_id, product_name: 'Unauthorized', sku, unit_price: 1, reorder_level: 1 }
    });
    expectStatus(unauthenticatedProduct, 401, 'unauthenticated product create is denied');

    const product = await request('/api/manage/products', {
      method: 'POST',
      token: staffLogin.body.token,
      body: {
        category_id: category.category_id,
        uom_id: uom.uom_id,
        product_name: `Integration test ${suffix}`,
        sku,
        unit_price: 1,
        reorder_level: 1
      }
    });
    productId = product.body.product_id;
    expectStatus(product, 201, 'staff creates product');
    assert.ok(productId, 'Product endpoint did not return an ID');

    const invalidProduct = await request('/api/manage/products', {
      method: 'POST',
      token: staffLogin.body.token,
      body: { category_id: category.category_id, uom_id: uom.uom_id, product_name: '', sku: `INVALID-${suffix}`, unit_price: -1, reorder_level: -1 }
    });
    expectStatus(invalidProduct, 400, 'invalid product details are rejected');

    const duplicateProduct = await request('/api/manage/products', {
      method: 'POST',
      token: staffLogin.body.token,
      body: {
        category_id: category.category_id,
        uom_id: uom.uom_id,
        product_name: `Duplicate integration test ${suffix}`,
        sku,
        unit_price: 1,
        reorder_level: 1
      }
    });
    expectStatus(duplicateProduct, 409, 'duplicate product SKU is rejected');

    const updateProduct = await request(`/api/manage/products/${productId}`, {
      method: 'PUT',
      token: staffLogin.body.token,
      body: {
        category_id: category.category_id,
        uom_id: uom.uom_id,
        product_name: `Updated integration test ${suffix}`,
        sku,
        unit_price: 2,
        reorder_level: 2
      }
    });
    expectStatus(updateProduct, 200, 'staff updates product');

    const inventoryBody = {
      product_id: productId,
      warehouse_id: warehouse.warehouse_id,
      quantity_on_hand: 10,
      reserved_quantity: 0,
      reorder_level: 1,
      min_stock_level: 1,
      max_stock_level: 100,
      location_slot: `IT-${suffix}`
    };
    const unauthenticatedInventory = await request('/api/manage/inventory', { method: 'POST', body: inventoryBody });
    expectStatus(unauthenticatedInventory, 401, 'unauthenticated inventory create is denied');
    const invalidInventory = await request('/api/manage/inventory', {
      method: 'POST',
      token: staffLogin.body.token,
      body: { ...inventoryBody, reserved_quantity: 11 }
    });
    expectStatus(invalidInventory, 400, 'inventory cannot reserve more than on-hand quantity');
    const createInventory = await request('/api/manage/inventory', {
      method: 'POST',
      token: staffLogin.body.token,
      body: inventoryBody
    });
    inventoryId = createInventory.body.inventory_id;
    expectStatus(createInventory, 201, 'staff creates inventory');
    assert.ok(inventoryId, 'Inventory endpoint did not return an ID');
    const inventoryLookups = await request('/api/manage/inventory-lookups');
    expectStatus(inventoryLookups, 200, 'inventory form lookups');
    assert.ok(inventoryLookups.body.existing.some(pair => pair.product_id === productId && pair.warehouse_id === warehouse.warehouse_id), 'Inventory lookups did not mark the created pair as occupied');
    const duplicateInventory = await request('/api/manage/inventory', {
      method: 'POST',
      token: staffLogin.body.token,
      body: inventoryBody
    });
    expectStatus(duplicateInventory, 409, 'duplicate product/warehouse inventory is rejected');
    const inventoryList = await request('/api/manage/inventory');
    expectStatus(inventoryList, 200, 'inventory listing');
    assert.ok(inventoryList.body.data.some(row => row.inventory_id === inventoryId), 'Created inventory was not listed');

    const invalidInventoryUpdate = await request(`/api/manage/inventory/${inventoryId}`, {
      method: 'PATCH',
      token: staffLogin.body.token,
      body: {
        quantity_on_hand: 1,
        reserved_quantity: 2,
        reorder_level: 1,
        min_stock_level: 1,
        max_stock_level: 100,
        location_slot: `IT-${suffix}`
      }
    });
    expectStatus(invalidInventoryUpdate, 400, 'invalid inventory quantity adjustment is rejected');

    const updateInventory = await request(`/api/manage/inventory/${inventoryId}`, {
      method: 'PATCH',
      token: staffLogin.body.token,
      body: {
        quantity_on_hand: 1,
        reserved_quantity: 0,
        reorder_level: 1,
        min_stock_level: 1,
        max_stock_level: 100,
        location_slot: `IT-${suffix}`
      }
    });
    expectStatus(updateInventory, 200, 'staff updates inventory');
    const orderLookups = await request('/api/manage/order-lookups');
    expectStatus(orderLookups, 200, 'order form stock lookups');
    const availableStock = orderLookups.body.stock.find(row => row.product_id === productId && row.warehouse_id === warehouse.warehouse_id);
    assert.equal(availableStock?.available_quantity, 1, 'Order form lookup did not report current available inventory');
    const [[risk]] = await pool.execute(
      "SELECT risk_id FROM inventory_risk WHERE inventory_id=? AND risk_type='Stockout' AND status='Open' LIMIT 1",
      [inventoryId]
    );
    assert.ok(risk, 'Inventory stock-risk trigger did not create an open risk');

    const triggerConnection = await pool.getConnection();
    let orderStockTriggerRejected = false;
    try {
      await triggerConnection.beginTransaction();
      const [triggerOrder] = await triggerConnection.execute(
        "INSERT INTO sales_order (customer_id,warehouse_id,status,total_amount) VALUES (?,?,\'Pending\',0)",
        [customer.customer_id, warehouse.warehouse_id]
      );
      try {
        await triggerConnection.execute(
          'INSERT INTO so_item (so_id,product_id,quantity,unit_price,line_total) VALUES (?,?,?,?,?)',
          [triggerOrder.insertId, productId, 2, 2, 4]
        );
      } catch (error) {
        assert.match(error.message, /Insufficient stock available in warehouse/);
        orderStockTriggerRejected = true;
      }
      assert.equal(orderStockTriggerRejected, true, 'Order stock trigger did not reject excess quantity');
    } finally {
      await triggerConnection.rollback();
      triggerConnection.release();
    }

    const [[orderDates]] = await pool.query(`
      SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d') AS past_date,
             DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d') AS future_date`);
    const orderBody = {
      customer_id: customer.customer_id,
      warehouse_id: warehouse.warehouse_id,
      required_date: orderDates.future_date,
      items: [{ product_id: productId, quantity: 1 }]
    };
    const unauthenticatedOrder = await request('/api/manage/orders', { method: 'POST', body: orderBody });
    expectStatus(unauthenticatedOrder, 401, 'unauthenticated order create is denied');
    const invalidOrder = await request('/api/manage/orders', {
      method: 'POST',
      token: staffLogin.body.token,
      body: { ...orderBody, items: [] }
    });
    expectStatus(invalidOrder, 400, 'order without line items is rejected');
    const pastDateOrder = await request('/api/manage/orders', {
      method: 'POST',
      token: staffLogin.body.token,
      body: { ...orderBody, required_date: orderDates.past_date }
    });
    expectStatus(pastDateOrder, 400, 'past required date is rejected');
    assert.match(pastDateOrder.body.message, /Required date cannot be earlier/);
    const malformedDateOrder = await request('/api/manage/orders', {
      method: 'POST',
      token: staffLogin.body.token,
      body: { ...orderBody, required_date: '2026-02-31' }
    });
    expectStatus(malformedDateOrder, 400, 'invalid calendar date is rejected');
    const duplicateOrderItems = await request('/api/manage/orders', {
      method: 'POST',
      token: staffLogin.body.token,
      body: { ...orderBody, items: [...orderBody.items, ...orderBody.items] }
    });
    expectStatus(duplicateOrderItems, 400, 'duplicate product lines are rejected');

    const insufficientOrder = await request('/api/manage/orders', {
      method: 'POST',
      token: staffLogin.body.token,
      body: {
        customer_id: customer.customer_id,
        warehouse_id: warehouse.warehouse_id,
        items: [{ product_id: productId, quantity: 2 }]
      }
    });
    expectStatus(insufficientOrder, 409, 'order cannot exceed available inventory');

    const createOrder = await request('/api/manage/orders', {
      method: 'POST',
      token: staffLogin.body.token,
      body: orderBody
    });
    orderId = createOrder.body.order_id;
    expectStatus(createOrder, 201, 'staff creates pending order');
    assert.equal(createOrder.body.total_amount, 2, 'Order total does not match product price and quantity');
    const [[orderMarker]] = await pool.execute('SELECT so_id FROM app_managed_orders WHERE so_id=?', [orderId]);
    const [[reservation]] = await pool.execute('SELECT quantity,released FROM app_order_reservations WHERE so_id=?', [orderId]);
    assert.ok(orderMarker, 'New order was not marked as application-managed');
    assert.equal(reservation.quantity, 1, 'Order reservation ledger quantity is incorrect');
    assert.equal(Boolean(reservation.released), false, 'New order reservation was marked released');
    const [[reservedStock]] = await pool.execute('SELECT reserved_quantity FROM inventory WHERE inventory_id=?', [inventoryId]);
    assert.equal(reservedStock.reserved_quantity, 1, 'Order creation did not reserve inventory');
    const adminDeletePendingOrder = await request(`/api/manage/orders/${orderId}`, {
      method: 'DELETE',
      token: adminLogin.body.token
    });
    expectStatus(adminDeletePendingOrder, 409, 'admin cannot delete a pending order');

    const cancelOrder = await request(`/api/manage/orders/${orderId}/cancel`, {
      method: 'POST',
      token: staffLogin.body.token
    });
    expectStatus(cancelOrder, 200, 'staff cancels pending order');
    const [[releasedStock]] = await pool.execute('SELECT reserved_quantity FROM inventory WHERE inventory_id=?', [inventoryId]);
    assert.equal(releasedStock.reserved_quantity, 0, 'Order cancellation did not release reserved inventory');
    const [[releasedReservation]] = await pool.execute('SELECT released FROM app_order_reservations WHERE so_id=?', [orderId]);
    assert.equal(Boolean(releasedReservation.released), true, 'Cancellation did not mark the reservation as released');
    const repeatedCancel = await request(`/api/manage/orders/${orderId}/cancel`, {
      method: 'POST',
      token: staffLogin.body.token
    });
    expectStatus(repeatedCancel, 409, 'cancelled order cannot be cancelled twice');

    const staffDeleteOrder = await request(`/api/manage/orders/${orderId}`, {
      method: 'DELETE',
      token: staffLogin.body.token
    });
    expectStatus(staffDeleteOrder, 403, 'staff order deletion is denied');
    const adminDeleteOrder = await request(`/api/manage/orders/${orderId}`, {
      method: 'DELETE',
      token: adminLogin.body.token
    });
    expectStatus(adminDeleteOrder, 200, 'admin deletes cancelled order');
    orderId = null;

    const staffDelete = await request(`/api/manage/products/${productId}`, {
      method: 'DELETE',
      token: staffLogin.body.token
    });
    expectStatus(staffDelete, 403, 'staff product delete is denied');

    const adminDelete = await request(`/api/manage/products/${productId}`, {
      method: 'DELETE',
      token: adminLogin.body.token
    });
    expectStatus(adminDelete, 409, 'admin delete is blocked by inventory foreign key');

    await cleanup('DELETE FROM inventory_risk WHERE inventory_id=?', [inventoryId]);
    await cleanup('DELETE FROM inventory WHERE inventory_id=?', [inventoryId]);
    inventoryId = null;
    const finalDelete = await request(`/api/manage/products/${productId}`, {
      method: 'DELETE',
      token: adminLogin.body.token
    });
    expectStatus(finalDelete, 200, 'admin deletes unreferenced product');
    productId = null;

    console.log(`Passed: ${readPaths.length} MySQL read routes, analytics, stored procedures, auth/roles, product create/update, inventory create/update, triggers, order reservation/cancellation/deletion, and legacy protection${process.env.VERIFY_NEO4J === 'true' ? ', Neo4j endpoints' : ''}.`);
  } finally {
    if (orderId) {
      await cleanup('DELETE FROM so_item WHERE so_id=?', [orderId]);
      await cleanup('DELETE FROM sales_order WHERE so_id=?', [orderId]);
    }
    if (inventoryId) {
      await cleanup('DELETE FROM inventory_risk WHERE inventory_id=?', [inventoryId]);
      await cleanup('DELETE FROM inventory WHERE inventory_id=?', [inventoryId]);
    }
    if (productId) await cleanup('DELETE FROM product WHERE product_id=?', [productId]);
    if (usernames.length) {
      await cleanup(`DELETE FROM app_users WHERE username IN (${usernames.map(() => '?').join(',')})`, usernames);
    }
    await pool.end();
    if (cleanupErrors.length) {
      console.error(`Temporary data cleanup failed for ${cleanupErrors.length} operation(s).`);
      process.exitCode = 1;
    }
  }
}

run().catch(error => {
  console.error(`CRUD integration test failed: ${error.message}`);
  process.exitCode = 1;
});