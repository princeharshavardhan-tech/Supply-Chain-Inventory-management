const router=require('express').Router();
const pool=require('../db');
router.get('/stats',async(req,res)=>{try{
 const [[stats]]=await pool.query(`SELECT
 (SELECT COUNT(*) FROM product) AS totalProducts,
 (SELECT COUNT(*) FROM warehouse) AS totalWarehouses,
 (SELECT COUNT(*) FROM supplier) AS totalSuppliers,
 (SELECT COUNT(*) FROM customer) AS totalCustomers,
 (SELECT COUNT(*) FROM inventory) AS inventoryRecords,
 (SELECT COUNT(*) FROM sales_order) AS salesOrders,
 (SELECT COUNT(*) FROM inventory_risk WHERE status COLLATE utf8mb4_unicode_ci='Open' COLLATE utf8mb4_unicode_ci) AS openRisks,
 (SELECT COUNT(*) FROM vw_inventory_status WHERE stock_status COLLATE utf8mb4_unicode_ci IN ('Low' COLLATE utf8mb4_unicode_ci,'Critical' COLLATE utf8mb4_unicode_ci)) AS lowStock`);
 const [orders]=await pool.query(`SELECT so_id,customer_name,warehouse_name,order_date,status,total_items,total_amount FROM vw_sales_order_summary ORDER BY order_date DESC LIMIT 7`);
 const [stock]=await pool.query(`SELECT inventory_id,product_name,warehouse_name,available_quantity,reorder_level,stock_status FROM vw_inventory_status WHERE stock_status COLLATE utf8mb4_unicode_ci IN ('Low' COLLATE utf8mb4_unicode_ci,'Critical' COLLATE utf8mb4_unicode_ci,'Overstock' COLLATE utf8mb4_unicode_ci) ORDER BY available_quantity ASC LIMIT 8`);
 res.json({success:true,stats,orders,stock});
 }catch(e){console.error('Dashboard API:',e);res.status(500).json({success:false,message:e.message});}});
module.exports=router;
