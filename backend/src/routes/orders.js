const router = require('express').Router();
const pool = require('../db');
const { authenticate, authorize } = require('../auth');

router.get('/orders', async (_req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT summary.*, EXISTS(
        SELECT 1 FROM app_managed_orders managed WHERE managed.so_id=summary.so_id
      ) AS managed
      FROM vw_sales_order_summary summary
      ORDER BY summary.order_date DESC LIMIT 500`);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not load sales orders.' });
  }
});

router.get('/order-lookups', async (_req, res) => {
  try {
    const [[customers], [warehouses], [products], [stock]] = await Promise.all([
      pool.query('SELECT customer_id, customer_name FROM customer ORDER BY customer_name'),
      pool.query('SELECT warehouse_id, warehouse_name FROM warehouse ORDER BY warehouse_name'),
      pool.query('SELECT product_id, product_name, sku, unit_price FROM product WHERE discontinued_flag=FALSE ORDER BY product_name'),
      pool.query(`SELECT product_id, warehouse_id, GREATEST(quantity_on_hand-reserved_quantity,0) AS available_quantity FROM inventory`)
    ]);
    res.json({ success: true, customers, warehouses, products, stock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not load order form options.' });
  }
});

router.post('/orders', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const customerId = Number(req.body?.customer_id);
  const warehouseId = Number(req.body?.warehouse_id);
  const items = req.body?.items;
  const requiredDate = req.body?.required_date || null;
  if (!Number.isInteger(customerId) || customerId < 1 || !Number.isInteger(warehouseId) || warehouseId < 1 ||
      !Array.isArray(items) || items.length < 1 || items.length > 100 ||
      (requiredDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(requiredDate))) {
    return res.status(400).json({ success: false, message: 'Customer, warehouse, at least one item, and a valid optional required date are required.' });
  }
  if (requiredDate) {
    const parsedDate = new Date(`${requiredDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== requiredDate) {
      return res.status(400).json({ success: false, message: 'Enter a valid required date.' });
    }
  }

  const normalizedItems = items.map(item => ({ productId: Number(item?.product_id), quantity: Number(item?.quantity) }));
  const productIds = normalizedItems.map(item => item.productId);
  if (normalizedItems.some(item => !Number.isInteger(item.productId) || item.productId < 1 || !Number.isInteger(item.quantity) || item.quantity < 1) ||
      new Set(productIds).size !== productIds.length) {
    return res.status(400).json({ success: false, message: 'Each order item must have a unique product and a positive whole-number quantity.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [[customer]] = await connection.execute('SELECT customer_id FROM customer WHERE customer_id=?', [customerId]);
    const [[warehouse]] = await connection.execute('SELECT warehouse_id FROM warehouse WHERE warehouse_id=?', [warehouseId]);
    if (!customer || !warehouse) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Select an existing customer and warehouse.' });
    }
    if (requiredDate) {
      const [[dateCheck]] = await connection.execute('SELECT ? >= CURDATE() AS valid_required_date', [requiredDate]);
      if (!dateCheck.valid_required_date) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Required date cannot be earlier than the order date.' });
      }
    }

    const [products] = await connection.query(
      `SELECT product_id, unit_price FROM product
       WHERE discontinued_flag=FALSE AND product_id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );
    if (products.length !== productIds.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'One or more products do not exist or are discontinued.' });
    }

    const [inventory] = await connection.query(
      `SELECT inventory_id, product_id, quantity_on_hand, reserved_quantity
       FROM inventory WHERE warehouse_id=? AND product_id IN (${productIds.map(() => '?').join(',')})
       ORDER BY product_id FOR UPDATE`,
      [warehouseId, ...productIds]
    );
    const inventoryByProduct = new Map(inventory.map(row => [row.product_id, row]));
    const productById = new Map(products.map(row => [row.product_id, row]));
    for (const item of normalizedItems) {
      const stock = inventoryByProduct.get(item.productId);
      if (!stock || item.quantity > stock.quantity_on_hand - stock.reserved_quantity) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Insufficient available stock for one or more items.' });
      }
    }

    const lineTotals = normalizedItems.map(item => Number((item.quantity * productById.get(item.productId).unit_price).toFixed(2)));
    const totalAmount = Number(lineTotals.reduce((sum, lineTotal) => sum + lineTotal, 0).toFixed(2));
    const [orderResult] = await connection.execute(
      'INSERT INTO sales_order (customer_id,warehouse_id,required_date,status,total_amount) VALUES (?,?,?,\'Pending\',?)',
      [customerId, warehouseId, requiredDate, totalAmount]
    );
    await connection.execute('INSERT INTO app_managed_orders (so_id,created_by) VALUES (?,?)', [orderResult.insertId, req.user.id]);

    for (const [index, item] of normalizedItems.entries()) {
      const product = productById.get(item.productId);
      const lineTotal = lineTotals[index];
      await connection.execute(
        'INSERT INTO so_item (so_id,product_id,quantity,unit_price,discount,tax_amount,line_total) VALUES (?,?,?,?,0,0,?)',
        [orderResult.insertId, item.productId, item.quantity, product.unit_price, lineTotal]
      );
      const stock = inventoryByProduct.get(item.productId);
      await connection.execute(
        'UPDATE inventory SET reserved_quantity=reserved_quantity+? WHERE inventory_id=?',
        [item.quantity, stock.inventory_id]
      );
      await connection.execute(
        'INSERT INTO app_order_reservations (so_id,inventory_id,quantity) VALUES (?,?,?)',
        [orderResult.insertId, stock.inventory_id, item.quantity]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Pending order created and stock reserved.', order_id: orderResult.insertId, total_amount: totalAmount });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create order error:', error);
    res.status(error.sqlState === '45000' ? 409 : 400).json({
      success: false,
      message: error.sqlState === '45000' ? error.sqlMessage : error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ? 'Required date cannot be earlier than the order date.' : 'Could not create order.'
    });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/orders/:id/cancel', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId < 1) return res.status(400).json({ success: false, message: 'Invalid order ID.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [[order]] = await connection.execute('SELECT so_id, warehouse_id, status FROM sales_order WHERE so_id=? FOR UPDATE', [orderId]);
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.status !== 'Pending') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Only pending orders can be cancelled.' });
    }

    const [[managedOrder]] = await connection.execute('SELECT so_id FROM app_managed_orders WHERE so_id=? FOR UPDATE', [orderId]);
    const [reservations] = await connection.execute(
      'SELECT inventory_id,quantity,released FROM app_order_reservations WHERE so_id=? FOR UPDATE',
      [orderId]
    );
    if (!managedOrder || !reservations.length || reservations.some(reservation => reservation.released)) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Only orders with active application-managed reservations can be cancelled.' });
    }

    const inventoryIds = reservations.map(reservation => reservation.inventory_id);
    const [inventory] = await connection.query(
      `SELECT inventory_id,reserved_quantity FROM inventory
       WHERE inventory_id IN (${inventoryIds.map(() => '?').join(',')}) FOR UPDATE`,
      inventoryIds
    );
    const inventoryById = new Map(inventory.map(row => [row.inventory_id, row]));
    for (const reservation of reservations) {
      const stock = inventoryById.get(reservation.inventory_id);
      if (!stock || stock.reserved_quantity < reservation.quantity) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Reserved stock is inconsistent; order was not cancelled.' });
      }
      await connection.execute('UPDATE inventory SET reserved_quantity=reserved_quantity-? WHERE inventory_id=?', [reservation.quantity, stock.inventory_id]);
    }

    await connection.execute('UPDATE app_order_reservations SET released=TRUE WHERE so_id=?', [orderId]);
    await connection.execute('UPDATE sales_order SET status=\'Cancelled\' WHERE so_id=?', [orderId]);
    await connection.commit();
    res.json({ success: true, message: 'Order cancelled and reserved stock released.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Cancel order error:', error);
    res.status(400).json({ success: false, message: 'Could not cancel order.' });
  } finally {
    if (connection) connection.release();
  }
});

router.delete('/orders/:id', authenticate, authorize('admin'), async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId < 1) return res.status(400).json({ success: false, message: 'Invalid order ID.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [[order]] = await connection.execute('SELECT so_id, status FROM sales_order WHERE so_id=? FOR UPDATE', [orderId]);
    if (!order) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (order.status !== 'Cancelled') {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Only cancelled orders can be deleted.' });
    }
    const [[managedOrder]] = await connection.execute('SELECT so_id FROM app_managed_orders WHERE so_id=? FOR UPDATE', [orderId]);
    if (!managedOrder) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Only application-managed orders can be deleted.' });
    }
    await connection.execute('DELETE FROM so_item WHERE so_id=?', [orderId]);
    await connection.execute('DELETE FROM sales_order WHERE so_id=?', [orderId]);
    await connection.commit();
    res.json({ success: true, message: 'Cancelled order deleted.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Delete order error:', error);
    res.status(409).json({ success: false, message: 'Could not delete order.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
