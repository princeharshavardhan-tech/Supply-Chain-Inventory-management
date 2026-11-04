const router = require('express').Router();
const pool = require('../db');
const { authenticate, authorize } = require('../auth');

// Lookup values used by the product form.
router.get('/lookups', async (_req, res) => {
  try {
    const [[categories], [uoms]] = await Promise.all([
      pool.query('SELECT category_id, category_name FROM category WHERE is_active = TRUE ORDER BY category_name'),
      pool.query('SELECT uom_id, uom_name FROM uom ORDER BY uom_name')
    ]);
    res.json({ success: true, categories, uoms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not load product form options' });
  }
});

// Product list with category and unit names.
router.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.product_id, p.category_id, c.category_name, p.uom_id, u.uom_name,
             p.product_name, p.sku, p.brand, p.barcode, p.unit_price,
             p.reorder_level, p.created_date, p.discontinued_flag
      FROM product p
      JOIN category c ON c.category_id = p.category_id
      JOIN uom u ON u.uom_id = p.uom_id
      ORDER BY p.product_id DESC LIMIT 500`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/products', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const { category_id, uom_id, product_name, sku, brand, barcode, unit_price, reorder_level } = req.body || {};
  if (!category_id || !uom_id || !product_name?.trim() || !sku?.trim() || unit_price === undefined || Number(unit_price) < 0 || !Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0) {
    return res.status(400).json({ success: false, message: 'Category, unit, product name, SKU, non-negative price and non-negative reorder level are required.' });
  }
  try {
    const [result] = await pool.execute(`INSERT INTO product
      (category_id, uom_id, product_name, sku, brand, barcode, unit_price, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Number(category_id), Number(uom_id), product_name.trim(), sku.trim(), brand?.trim() || null, barcode?.trim() || null, Number(unit_price), Number(reorder_level)]);
    res.status(201).json({ success: true, message: 'Product created', product_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({ success: false, message: error.code === 'ER_DUP_ENTRY' ? 'SKU or barcode already exists.' : error.sqlMessage || 'Could not create product.' });
  }
});

router.put('/products/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  const { category_id, uom_id, product_name, sku, brand, barcode, unit_price, reorder_level, discontinued_flag } = req.body || {};
  if (!Number.isInteger(id) || id < 1 || !category_id || !uom_id || !product_name?.trim() || !sku?.trim() || unit_price === undefined || Number(unit_price) < 0 || !Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0) {
    return res.status(400).json({ success: false, message: 'Valid product details are required.' });
  }
  try {
    const [result] = await pool.execute(`UPDATE product SET category_id=?, uom_id=?, product_name=?, sku=?, brand=?, barcode=?, unit_price=?, reorder_level=?, discontinued_flag=? WHERE product_id=?`,
      [Number(category_id), Number(uom_id), product_name.trim(), sku.trim(), brand?.trim() || null, barcode?.trim() || null, Number(unit_price), Number(reorder_level), Boolean(discontinued_flag), id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error(error);
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({ success: false, message: error.code === 'ER_DUP_ENTRY' ? 'SKU or barcode already exists.' : error.sqlMessage || 'Could not update product.' });
  }
});

router.delete('/products/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid product ID.' });
  try {
    const [result] = await pool.execute('DELETE FROM product WHERE product_id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(409).json({ success: false, message: 'This product is referenced by inventory or orders and cannot be deleted. Mark it discontinued instead.' });
  }
});

router.post('/inventory', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const productId = Number(req.body?.product_id);
  const warehouseId = Number(req.body?.warehouse_id);
  const values = [
    req.body?.quantity_on_hand,
    req.body?.reserved_quantity ?? 0,
    req.body?.reorder_level ?? 0,
    req.body?.min_stock_level ?? 0,
    req.body?.max_stock_level ?? 0
  ].map(Number);
  const [quantityOnHand, reservedQuantity, reorderLevel, minStockLevel, maxStockLevel] = values;
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(warehouseId) || warehouseId < 1 ||
      values.some(value => !Number.isInteger(value) || value < 0) || reservedQuantity > quantityOnHand || maxStockLevel < minStockLevel) {
    return res.status(400).json({ success: false, message: 'Select a product and warehouse. Stock values must be non-negative whole numbers, reserved stock cannot exceed on-hand stock, and max stock must be at least min stock.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [[product]] = await connection.execute('SELECT product_id FROM product WHERE product_id=? AND discontinued_flag=FALSE FOR UPDATE', [productId]);
    const [[warehouse]] = await connection.execute('SELECT warehouse_id FROM warehouse WHERE warehouse_id=? FOR UPDATE', [warehouseId]);
    if (!product || !warehouse) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Select an existing active product and warehouse.' });
    }

    const [result] = await connection.execute(
      `INSERT INTO inventory
       (product_id,warehouse_id,quantity_on_hand,reserved_quantity,reorder_level,min_stock_level,max_stock_level,location_slot)
       VALUES (?,?,?,?,?,?,?,?)`,
      [productId, warehouseId, quantityOnHand, reservedQuantity, reorderLevel, minStockLevel, maxStockLevel, req.body?.location_slot?.trim() || null]
    );
    await connection.commit();
    res.status(201).json({ success: true, message: 'Inventory record created.', inventory_id: result.insertId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Inventory already exists for this product and warehouse.' : error.sqlMessage || 'Could not create inventory record.'
    });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/inventory-lookups', async (_req, res) => {
  try {
    const [[products], [warehouses], [existing]] = await Promise.all([
      pool.query('SELECT product_id, product_name, sku FROM product WHERE discontinued_flag=FALSE ORDER BY product_name'),
      pool.query('SELECT warehouse_id, warehouse_name FROM warehouse ORDER BY warehouse_name'),
      pool.query('SELECT product_id, warehouse_id FROM inventory')
    ]);
    res.json({ success: true, products, warehouses, existing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not load inventory form options.' });
  }
});

// Inventory list; available quantity is calculated from on-hand less reserved.
router.get('/inventory', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.inventory_id, i.product_id, p.product_name, p.sku,
             i.warehouse_id, w.warehouse_name, i.quantity_on_hand,
             i.reserved_quantity, (i.quantity_on_hand-i.reserved_quantity) AS available_quantity,
             i.reorder_level, i.min_stock_level, i.max_stock_level,
             i.location_slot, i.last_updated
      FROM inventory i JOIN product p ON p.product_id=i.product_id
      JOIN warehouse w ON w.warehouse_id=i.warehouse_id
      ORDER BY p.product_name, w.warehouse_name LIMIT 500`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Staff/admin can adjust quantities. The existing AFTER UPDATE trigger creates risk records.
router.patch('/inventory/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  const { quantity_on_hand, reserved_quantity, reorder_level, min_stock_level, max_stock_level, location_slot } = req.body || {};
  const values = [quantity_on_hand, reserved_quantity, reorder_level, min_stock_level, max_stock_level].map(Number);
  if (!Number.isInteger(id) || id < 1 || values.some(v => !Number.isInteger(v) || v < 0) || values[1] > values[0] || values[4] < values[3]) {
    return res.status(400).json({ success: false, message: 'Enter non-negative whole numbers. Reserved stock cannot exceed on-hand stock, and max stock must be at least min stock.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(`UPDATE inventory SET quantity_on_hand=?, reserved_quantity=?, reorder_level=?, min_stock_level=?, max_stock_level=?, location_slot=? WHERE inventory_id=?`,
      [...values, location_slot?.trim() || null, id]);
    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    }
    await conn.commit();
    res.json({ success: true, message: 'Inventory updated. Stock-risk trigger evaluated the new quantity.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not update inventory.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
