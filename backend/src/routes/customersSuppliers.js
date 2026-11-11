const router = require('express').Router();
const pool = require('../db');
const { authenticate, authorize } = require('../auth');

// --- CUSTOMERS ---

// Customer list with most recent first
router.get('/customers', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT customer_id, customer_name, email, phone_number, customer_type, address, is_active
      FROM customer
      ORDER BY customer_id DESC LIMIT 500`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create customer (admin or staff)
router.post('/customers', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const { customer_name, email, phone_number, address, customer_type } = req.body || {};
  if (!customer_name?.trim()) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required (e.g. name@domain.com).' });
  }
  const allowedTypes = ['Retail', 'Wholesale', 'Corporate'];
  const validCustomerType = allowedTypes.includes(customer_type) ? customer_type : 'Retail';
  const trimmedPhone = phone_number?.trim() || null;
  const trimmedAddress = address?.trim() || null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO customer (customer_name, email, address, customer_type, phone_number, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [customer_name.trim(), trimmedEmail, trimmedAddress, validCustomerType, trimmedPhone]
    );
    res.status(201).json({ success: true, message: 'Customer created successfully.', customer_id: result.insertId });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A customer with this email or phone number already exists.' });
    }
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not create customer.' });
  }
});

// Update customer (admin or staff)
router.put('/customers/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid customer ID.' });
  const { customer_name, email, phone_number, address, customer_type, is_active } = req.body || {};
  if (!customer_name?.trim()) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }
  const trimmedEmail = email?.trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }
  const allowedTypes = ['Retail', 'Wholesale', 'Corporate'];
  const validCustomerType = allowedTypes.includes(customer_type) ? customer_type : 'Retail';
  const trimmedPhone = phone_number?.trim() || null;
  const trimmedAddress = address?.trim() || null;
  const activeFlag = is_active === undefined ? 1 : (is_active ? 1 : 0);

  try {
    const [result] = await pool.execute(
      `UPDATE customer SET customer_name=?, email=?, address=?, customer_type=?, phone_number=?, is_active=?
       WHERE customer_id=?`,
      [customer_name.trim(), trimmedEmail, trimmedAddress, validCustomerType, trimmedPhone, activeFlag, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (error) {
    console.error('Update customer error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A customer with this email or phone number already exists.' });
    }
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not update customer.' });
  }
});

// Delete customer (admin only)
router.delete('/customers/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid customer ID.' });
  try {
    const [result] = await pool.execute('DELETE FROM customer WHERE customer_id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (error) {
    res.status(409).json({ success: false, message: 'This customer has sales orders and cannot be deleted.' });
  }
});

// --- SUPPLIERS ---

// Supplier list with most recent first
router.get('/suppliers', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT supplier_id, supplier_name, contact_person, email, phone_number, address, rating, is_active
      FROM supplier
      ORDER BY supplier_id DESC LIMIT 500`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create supplier (admin or staff)
router.post('/suppliers', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const { supplier_name, contact_person, email, phone_number, address, rating } = req.body || {};
  if (!supplier_name?.trim()) {
    return res.status(400).json({ success: false, message: 'Supplier name is required.' });
  }
  let validRating = null;
  if (rating !== undefined && rating !== '' && rating !== null) {
    const numRating = Number(rating);
    if (Number.isNaN(numRating) || numRating < 0 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 0 and 5.' });
    }
    validRating = Number(numRating.toFixed(2));
  }
  const trimmedEmail = email?.trim() || null;
  const trimmedContact = contact_person?.trim() || null;
  const trimmedPhone = phone_number?.trim() || null;
  const trimmedAddress = address?.trim() || null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO supplier (supplier_name, contact_person, email, phone_number, address, rating, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [supplier_name.trim(), trimmedContact, trimmedEmail, trimmedPhone, trimmedAddress, validRating]
    );
    res.status(201).json({ success: true, message: 'Supplier created successfully.', supplier_id: result.insertId });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not create supplier.' });
  }
});

// Update supplier (admin or staff)
router.put('/suppliers/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid supplier ID.' });
  const { supplier_name, contact_person, email, phone_number, address, rating, is_active } = req.body || {};
  if (!supplier_name?.trim()) {
    return res.status(400).json({ success: false, message: 'Supplier name is required.' });
  }
  let validRating = null;
  if (rating !== undefined && rating !== '' && rating !== null) {
    const numRating = Number(rating);
    if (Number.isNaN(numRating) || numRating < 0 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 0 and 5.' });
    }
    validRating = Number(numRating.toFixed(2));
  }
  const trimmedEmail = email?.trim() || null;
  const trimmedContact = contact_person?.trim() || null;
  const trimmedPhone = phone_number?.trim() || null;
  const trimmedAddress = address?.trim() || null;
  const activeFlag = is_active === undefined ? 1 : (is_active ? 1 : 0);

  try {
    const [result] = await pool.execute(
      `UPDATE supplier SET supplier_name=?, contact_person=?, email=?, phone_number=?, address=?, rating=?, is_active=?
       WHERE supplier_id=?`,
      [supplier_name.trim(), trimmedContact, trimmedEmail, trimmedPhone, trimmedAddress, validRating, activeFlag, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, message: 'Supplier updated successfully.' });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not update supplier.' });
  }
});

// Delete supplier (admin only)
router.delete('/suppliers/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid supplier ID.' });
  try {
    const [result] = await pool.execute('DELETE FROM supplier WHERE supplier_id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (error) {
    res.status(409).json({ success: false, message: 'This supplier supplies products or has purchase orders and cannot be deleted.' });
  }
});

// --- SUPPLIER PRODUCTS (Connecting Suppliers to Products) ---

// 1. Get all supplier-product links (with supplier and product details)
router.get('/supplier-products', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sp.supplier_product_id, sp.supplier_id, s.supplier_name,
             sp.product_id, p.product_name, p.sku, p.brand,
             sp.supplier_product_code, sp.unit_cost, sp.lead_time_days, sp.is_preferred
      FROM supplier_product sp
      JOIN supplier s ON s.supplier_id = sp.supplier_id
      JOIN product p ON p.product_id = sp.product_id
      ORDER BY s.supplier_name, p.product_name LIMIT 500`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get supplier-products error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get products for a single supplier (calls stored procedure GetSupplierProducts)
router.get('/suppliers/:id/products', async (req, res) => {
  const sid = Number(req.params.id);
  if (!Number.isInteger(sid) || sid < 1) return res.status(400).json({ success: false, message: 'Invalid supplier ID.' });
  try {
    const [resultSets] = await pool.query('CALL GetSupplierProducts(?)', [sid]);
    const rows = Array.isArray(resultSets[0]) ? resultSets[0] : resultSets;
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Call GetSupplierProducts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Dropdown lookups for linking supplier and product
router.get('/supplier-product-lookups', async (_req, res) => {
  try {
    const [[suppliers], [products], [existing]] = await Promise.all([
      pool.query('SELECT supplier_id, supplier_name FROM supplier WHERE is_active=1 ORDER BY supplier_name'),
      pool.query('SELECT product_id, product_name, sku FROM product WHERE discontinued_flag=0 ORDER BY product_name'),
      pool.query('SELECT supplier_id, product_id FROM supplier_product')
    ]);
    res.json({ success: true, suppliers, products, existing });
  } catch (error) {
    console.error('Supplier product lookups error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Create link between supplier and product
router.post('/supplier-products', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const supplierId = Number(req.body?.supplier_id);
  const productId = Number(req.body?.product_id);
  const unitCost = Number(req.body?.unit_cost);
  const leadTimeDays = Number(req.body?.lead_time_days);
  const isPreferred = Boolean(req.body?.is_preferred);
  const supplierProductCode = req.body?.supplier_product_code?.trim() || null;

  if (!Number.isInteger(supplierId) || supplierId < 1 || !Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ success: false, message: 'Valid supplier and product are required.' });
  }
  if (Number.isNaN(unitCost) || unitCost < 0) {
    return res.status(400).json({ success: false, message: 'Unit cost must be a non-negative number.' });
  }
  if (!Number.isInteger(leadTimeDays) || leadTimeDays < 0) {
    return res.status(400).json({ success: false, message: 'Lead time must be a non-negative whole number of days.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO supplier_product (supplier_id, product_id, supplier_product_code, unit_cost, lead_time_days, is_preferred)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [supplierId, productId, supplierProductCode, unitCost, leadTimeDays, isPreferred ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Product linked to supplier successfully.', supplier_product_id: result.insertId });
  } catch (error) {
    console.error('Create supplier-product error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This product is already linked to this supplier.' });
    }
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not link product to supplier.' });
  }
});

// 5. Update supplier-product link
router.put('/supplier-products/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid supplier-product ID.' });

  const unitCost = Number(req.body?.unit_cost);
  const leadTimeDays = Number(req.body?.lead_time_days);
  const isPreferred = Boolean(req.body?.is_preferred);
  const supplierProductCode = req.body?.supplier_product_code?.trim() || null;

  if (Number.isNaN(unitCost) || unitCost < 0) {
    return res.status(400).json({ success: false, message: 'Unit cost must be a non-negative number.' });
  }
  if (!Number.isInteger(leadTimeDays) || leadTimeDays < 0) {
    return res.status(400).json({ success: false, message: 'Lead time must be a non-negative whole number of days.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE supplier_product
       SET supplier_product_code=?, unit_cost=?, lead_time_days=?, is_preferred=?
       WHERE supplier_product_id=?`,
      [supplierProductCode, unitCost, leadTimeDays, isPreferred ? 1 : 0, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Supplier-product record not found.' });
    res.json({ success: true, message: 'Supplier-product relationship updated successfully.' });
  } catch (error) {
    console.error('Update supplier-product error:', error);
    res.status(400).json({ success: false, message: error.sqlMessage || 'Could not update record.' });
  }
});

// 6. Delete supplier-product link (unlink)
router.delete('/supplier-products/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid ID.' });
  try {
    const [result] = await pool.execute('DELETE FROM supplier_product WHERE supplier_product_id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Record not found.' });
    res.json({ success: true, message: 'Product unlinked from supplier.' });
  } catch (error) {
    console.error('Delete supplier-product error:', error);
    res.status(500).json({ success: false, message: error.sqlMessage || 'Could not delete record.' });
  }
});

module.exports = router;

