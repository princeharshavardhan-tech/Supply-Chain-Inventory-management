const router = require('express').Router();
const pool = require('../db');

// Demand history and forecast are separate SQL datasets. This endpoint returns
// recent history and future forecasts without changing the supplied seed data.
router.get('/demand', async (req, res) => {
  try {
    const [history] = await pool.query(`
      SELECT dh.demand_id, p.product_name, w.warehouse_name,
             dh.demand_date, dh.quantity_demanded, dh.demand_trend
      FROM demand_history dh
      JOIN product p ON p.product_id = dh.product_id
      JOIN warehouse w ON w.warehouse_id = dh.warehouse_id
      ORDER BY dh.demand_date DESC LIMIT 100`);
    const [forecasts] = await pool.query(`
      SELECT df.forecast_id, p.product_name, w.warehouse_name,
             df.forecast_date, df.forecasted_quantity
      FROM demand_forecast df
      JOIN product p ON p.product_id = df.product_id
      JOIN warehouse w ON w.warehouse_id = df.warehouse_id
      ORDER BY df.forecast_date ASC LIMIT 100`);
    const [summary] = await pool.query(`
      SELECT p.product_id, p.product_name,
             COALESCE(SUM(dh.quantity_demanded), 0) AS historical_demand,
             COALESCE((SELECT SUM(df.forecasted_quantity)
                       FROM demand_forecast df
                       WHERE df.product_id = p.product_id), 0) AS forecast_demand
      FROM product p
      LEFT JOIN demand_history dh ON dh.product_id = p.product_id
      GROUP BY p.product_id, p.product_name
      ORDER BY historical_demand DESC LIMIT 15`);
    res.json({ success: true, history, forecasts, summary });
  } catch (error) {
    console.error('Demand analytics error:', error);
    res.status(500).json({ success: false, message: 'Could not load demand analysis.' });
  }
});

router.get('/risk-summary', async (_req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT COUNT(*) AS totalRisks,
             SUM(status = 'Open') AS openRisks,
             SUM(risk_level = 'Critical' AND status = 'Open') AS criticalRisks,
             SUM(risk_level = 'High' AND status = 'Open') AS highRisks
      FROM inventory_risk`);
    const [items] = await pool.query(`
      SELECT ir.risk_id, p.product_name, w.warehouse_name,
             ir.risk_type, ir.risk_level, ir.risk_score, ir.status,
             ir.detected_date, ir.recommended_action
      FROM inventory_risk ir
      JOIN inventory i ON i.inventory_id = ir.inventory_id
      JOIN product p ON p.product_id = i.product_id
      JOIN warehouse w ON w.warehouse_id = i.warehouse_id
      ORDER BY ir.detected_date DESC, ir.risk_score DESC LIMIT 100`);
    res.json({ success: true, totals, items });
  } catch (error) {
    console.error('Risk summary error:', error);
    res.status(500).json({ success: false, message: 'Could not load risk analysis.' });
  }
});

module.exports = router;
