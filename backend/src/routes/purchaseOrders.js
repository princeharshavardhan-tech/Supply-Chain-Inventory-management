const router = require('express').Router();
const pool = require('../db');
const { authenticate, authorize } = require('../auth');

// 1. Get all purchase orders with supplier information and item count
router.get('/purchase-orders', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT po.po_id, po.supplier_id, s.supplier_name, s.email AS supplier_email,
             s.phone_number AS supplier_phone, po.po_date, po.expected_date,
             po.status, po.total_amount,
             COUNT(poi.po_item_id) AS total_items
      FROM purchase_order po
      JOIN supplier s ON s.supplier_id = po.supplier_id
      LEFT JOIN po_item poi ON poi.po_id = po.po_id
      GROUP BY po.po_id, po.supplier_id, s.supplier_name, s.email, s.phone_number,
               po.po_date, po.expected_date, po.status, po.total_amount
      ORDER BY po.po_id DESC LIMIT 500`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get line items for a specific purchase order
router.get('/purchase-orders/:id/items', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  try {
    const [rows] = await pool.query(`
      SELECT poi.po_item_id, poi.po_id, poi.product_id,
             p.product_name, p.sku, p.brand,
             poi.quantity, poi.unit_cost, poi.tax_amount, poi.line_total
      FROM po_item poi
      JOIN product p ON p.product_id = poi.product_id
      WHERE poi.po_id = ?
      ORDER BY poi.po_item_id ASC`, [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get PO items error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Dropdown lookups for creating a purchase order (suppliers + products linked to them)
router.get('/purchase-order-lookups', async (_req, res) => {
  try {
    const [[suppliers], [supplierProducts], [allProducts]] = await Promise.all([
      pool.query('SELECT supplier_id, supplier_name, rating, phone_number, email FROM supplier WHERE is_active = 1 ORDER BY supplier_name'),
      pool.query(`
        SELECT sp.supplier_id, sp.product_id, p.product_name, p.sku,
               sp.unit_cost, sp.lead_time_days, sp.is_preferred
        FROM supplier_product sp
        JOIN product p ON p.product_id = sp.product_id
        WHERE p.discontinued_flag = 0
        ORDER BY sp.is_preferred DESC, p.product_name ASC`),
      pool.query('SELECT product_id, product_name, sku, unit_price FROM product WHERE discontinued_flag = 0 ORDER BY product_name')
    ]);
    res.json({ success: true, suppliers, supplierProducts, allProducts });
  } catch (error) {
    console.error('Purchase order lookups error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Create a purchase order with items (Staff / Admin)
router.post('/purchase-orders', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const { supplier_id, expected_date, items } = req.body || {};
  const supplierId = Number(supplier_id);
  if (!Number.isInteger(supplierId) || supplierId < 1) {
    return res.status(400).json({ success: false, message: 'A valid supplier is required.' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, message: 'At least one product item is required.' });
  }

  // Sanitize and validate items
  const cleanItems = [];
  for (const it of items) {
    const pid = Number(it.product_id);
    const qty = Number(it.quantity);
    const cost = Number(it.unit_cost);
    if (!Number.isInteger(pid) || pid < 1) {
      return res.status(400).json({ success: false, message: 'Invalid product selected.' });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
    }
    if (Number.isNaN(cost) || cost < 0) {
      return res.status(400).json({ success: false, message: 'Unit cost must be non-negative.' });
    }
    const tax = Number((cost * qty * 0.05).toFixed(2)); // Standard 5% GST on supply goods
    const lineTotal = Number((cost * qty + tax).toFixed(2));
    cleanItems.push({ product_id: pid, quantity: qty, unit_cost: cost, tax_amount: tax, line_total: lineTotal });
  }

  const grandTotal = cleanItems.reduce((acc, cur) => acc + cur.line_total, 0);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [poResult] = await conn.execute(
      `INSERT INTO purchase_order (supplier_id, po_date, expected_date, status, total_amount)
       VALUES (?, CURDATE(), ?, 'Ordered', ?)`,
      [supplierId, expected_date || null, grandTotal]
    );
    const poId = poResult.insertId;

    for (const item of cleanItems) {
      await conn.execute(
        `INSERT INTO po_item (po_id, product_id, quantity, unit_cost, tax_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [poId, item.product_id, item.quantity, item.unit_cost, item.tax_amount, item.line_total]
      );
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: `Purchase Order #${poId} created successfully for ₹${grandTotal.toFixed(2)}.`,
      po_id: poId
    });
  } catch (error) {
    await conn.rollback();
    console.error('Create purchase order error:', error);
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not create purchase order.' });
  } finally {
    conn.release();
  }
});

// 5. Update purchase order status (Cancel or Receive)
router.post('/purchase-orders/:id/cancel', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  try {
    const [result] = await pool.execute(
      `UPDATE purchase_order SET status = 'Cancelled' WHERE po_id = ? AND status IN ('Draft', 'Ordered')`,
      [id]
    );
    if (!result.affectedRows) return res.status(400).json({ success: false, message: 'Cannot cancel this purchase order.' });
    res.json({ success: true, message: `Purchase Order #${id} cancelled.` });
  } catch (error) {
    console.error('Cancel PO error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/purchase-orders/:id/receive', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  try {
    const [result] = await pool.execute(
      `UPDATE purchase_order SET status = 'Received' WHERE po_id = ? AND status = 'Ordered'`,
      [id]
    );
    if (!result.affectedRows) return res.status(400).json({ success: false, message: 'Only ordered purchase orders can be marked received.' });
    res.json({ success: true, message: `Purchase Order #${id} marked as Received.` });
  } catch (error) {
    console.error('Receive PO error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Delete purchase order (Admin only, only if Draft or Cancelled)
router.delete('/purchase-orders/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid PO ID' });
  try {
    const [result] = await pool.execute(
      `DELETE FROM purchase_order WHERE po_id = ? AND status IN ('Draft', 'Cancelled')`,
      [id]
    );
    if (!result.affectedRows) return res.status(400).json({ success: false, message: 'Can only delete Draft or Cancelled purchase orders.' });
    res.json({ success: true, message: `Purchase Order #${id} deleted.` });
  } catch (error) {
    console.error('Delete PO error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

