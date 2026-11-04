const router = require('express').Router();
const neo4j = require('neo4j-driver');
const { authenticate, authorize } = require('../auth');
const pool = require('../db');

function createDriver() {
  if (!process.env.NEO4J_URI || !process.env.NEO4J_PASSWORD) {
    throw new Error('Configure NEO4J_URI and NEO4J_PASSWORD in backend/.env.');
  }
  return neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD)
  );
}

router.get('/health', async (_req, res) => {
  let driver;
  try {
    driver = createDriver();
    await driver.verifyConnectivity();
    res.json({ success: true, connected: true, message: 'Neo4j connection successful.' });
  } catch (error) {
    res.status(503).json({ success: false, connected: false, message: error.message });
  } finally {
    if (driver) await driver.close();
  }
});

router.post('/sync', authenticate, authorize('admin'), async (_req, res) => {
  let driver;
  let session;
  try {
    driver = createDriver();
    session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    await session.run('CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (n:Supplier) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT warehouse_id IF NOT EXISTS FOR (n:Warehouse) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT product_id IF NOT EXISTS FOR (n:Product) REQUIRE n.id IS UNIQUE');

    const [[suppliers], [warehouses], [products], [supplierProducts], [stock]] = await Promise.all([
      pool.query('SELECT supplier_id, supplier_name, rating, is_active FROM supplier'),
      pool.query('SELECT warehouse_id, warehouse_name, location, capacity FROM warehouse'),
      pool.query('SELECT product_id, product_name, sku, unit_price, discontinued_flag FROM product'),
      pool.query('SELECT supplier_id, product_id, unit_cost, lead_time_days, is_preferred FROM supplier_product'),
      pool.query('SELECT product_id, warehouse_id, quantity_on_hand, reserved_quantity FROM inventory')
    ]);

    await session.executeWrite(async tx => {
      await tx.run(`UNWIND $rows AS row MERGE (s:Supplier {id: row.supplier_id})
        SET s.name=row.supplier_name, s.rating=row.rating, s.active=row.is_active`, { rows: suppliers });
      await tx.run(`UNWIND $rows AS row MERGE (w:Warehouse {id: row.warehouse_id})
        SET w.name=row.warehouse_name, w.location=row.location, w.capacity=row.capacity`, { rows: warehouses });
      await tx.run(`UNWIND $rows AS row MERGE (p:Product {id: row.product_id})
        SET p.name=row.product_name, p.sku=row.sku, p.unitPrice=row.unit_price,
            p.discontinued=row.discontinued_flag`, { rows: products });
      await tx.run(`UNWIND $rows AS row
        MATCH (s:Supplier {id: row.supplier_id}) MATCH (p:Product {id: row.product_id})
        MERGE (s)-[r:SUPPLIES]->(p)
        SET r.unitCost=row.unit_cost, r.leadTimeDays=row.lead_time_days,
            r.preferred=row.is_preferred`, { rows: supplierProducts });
      await tx.run(`UNWIND $rows AS row
        MATCH (p:Product {id: row.product_id}) MATCH (w:Warehouse {id: row.warehouse_id})
        MERGE (p)-[r:STORED_AT]->(w)
        SET r.onHand=row.quantity_on_hand, r.reserved=row.reserved_quantity,
            r.available=row.quantity_on_hand-row.reserved_quantity`, { rows: stock });
    });
    res.json({ success: true, message: 'MySQL data synchronized to Neo4j.', counts: {
      suppliers: suppliers.length, warehouses: warehouses.length, products: products.length,
      supplierRelationships: supplierProducts.length, stockRelationships: stock.length
    }});
  } catch (error) {
    console.error('Neo4j sync error:', error);
    res.status(503).json({ success: false, message: error.message });
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
});

router.get('/summary', async (_req, res) => {
  let driver;
  let session;
  try {
    driver = createDriver();
    session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    const result = await session.run(`
      OPTIONAL MATCH (s:Supplier) WITH count(s) AS suppliers
      OPTIONAL MATCH (w:Warehouse) WITH suppliers, count(w) AS warehouses
      OPTIONAL MATCH (p:Product) WITH suppliers, warehouses, count(p) AS products
      OPTIONAL MATCH ()-[r:SUPPLIES|STORED_AT]->()
      RETURN suppliers, warehouses, products, count(r) AS relationships`);
    const record = result.records[0];
    res.json({ success: true, connected: true, counts: {
      suppliers: record.get('suppliers').toNumber(),
      warehouses: record.get('warehouses').toNumber(),
      products: record.get('products').toNumber(),
      relationships: record.get('relationships').toNumber()
    }});
  } catch (error) {
    res.status(503).json({ success: false, connected: false, message: error.message });
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
});

router.get('/supplier-network', async (_req, res) => {
  let driver;
  let session;
  try {
    driver = createDriver();
    session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    const result = await session.run(`
      MATCH (s:Supplier)-[r:SUPPLIES]->(p:Product)
      RETURN s.name AS supplier, p.name AS product,
             r.unitCost AS unitCost, r.leadTimeDays AS leadTimeDays,
             r.preferred AS preferred ORDER BY supplier, product LIMIT 200`);
    res.json({ success: true, data: result.records.map(record => ({
      supplier: record.get('supplier'), product: record.get('product'),
      unitCost: record.get('unitCost'), leadTimeDays: record.get('leadTimeDays'),
      preferred: record.get('preferred')
    })) });
  } catch (error) {
    res.status(503).json({ success: false, message: error.message });
  } finally {
    if (session) await session.close();
    if (driver) await driver.close();
  }
});

module.exports = router;
