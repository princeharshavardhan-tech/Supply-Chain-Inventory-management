# Supply Chain Inventory & Demand Management: Complete System Guide

This document provides a comprehensive explanation of every page, component, API endpoint, database operation, button trigger, and cross-page cascading effect across the entire Supply Chain Management system.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["Next.js 15 Client (Browser)"]
        UI["React 19 Dashboard UI"]
        State["Client State & JWT (localStorage)"]
    end

    subgraph Server["Express REST API (Port 5000)"]
        AuthMid["JWT Auth & Role Authorization"]
        Routes["API Route Handlers"]
    end

    subgraph Storage["Databases"]
        MySQL[("MySQL 8 (supply_chain_db)
        Tables, Views, Procedures, Triggers")]
        Neo4j[("Neo4j Graph Database
        (Suppliers, Products, Warehouses)")]
    end

    UI <-->|HTTP JSON + Bearer JWT| Server
    Server <-->|mysql2 Pool & Transactions| MySQL
    Server <-->|Neo4j Bolt Driver (Admin Sync)| Neo4j
    MySQL -.->|Triggers: auto_stockout_risk,
    check_stock_before_order| MySQL
```

### Authentication & Roles
- **Public (Unauthenticated):** View-only access to records across all tabs.
- **Staff:** Can create products, add and update inventory stock, add customers, add suppliers, and create or cancel pending sales orders.
- **Admin:** All Staff capabilities PLUS product deletion, customer deletion, supplier deletion, cancelled order deletion, and Neo4j graph synchronization.

---

## 2. Global Topbar & Navigation

### Topbar Controls
- **User Status Badge:** Displays the logged-in username and role (`admin` or `staff`).
- **Login Button (`LogIn` icon):** Opens the authentication modal. Submits credentials to `POST /api/auth/login`. On success, stores JWT token and user info in `localStorage` (`sc_token`, `sc_user`) and refreshes permissions across all buttons.
- **Logout Button (`LogOut` icon):** Clears `localStorage` and resets the UI to public view-only mode.
- **Refresh Button (`RefreshCw` icon):**
  - **Triggers:** Calls `load()` (`GET /api/dashboard/stats`) and `loadRows(section)` simultaneously.
  - **Effect:** Re-fetches current database counts, recent orders, inventory attention list, and the active page's table rows.

### Search Functionality
- **Value-Based Search Engine:** Checks cell values only (ignoring JSON schema keys). Typing common letters (`a`, `p`, `c`), numbers, or words (`name`, `wholesaler`, `critical`) precisely filters rows matching those values instead of matching JSON key names.
- **Multi-Word Search:** Splitting terms allows composite searches like `"Milk Dairy"` or `"Aarav Wholesale"`.
- **Search Placement:** Present on operational record tables (`Products`, `Inventory`, `Customers`, `Suppliers`, `Orders`, `Warehouses`, `Risk analysis`). Cleanly excluded from analytical/system pages (`Overview`, `Demand analysis`, `Graph database`) where raw row searching is not applicable.

---

## 3. Page-by-Page Deep Dive

---

### Page 1: Overview

#### Purpose
The executive operations dashboard. Provides live KPIs across all core entities, urgent inventory alerts, recent orders, and stock distribution visualizations.

#### Data Fetching
- **Endpoint:** `GET /api/dashboard/stats`
- **Tables & Views Queried:**
  - `product` (count of total products)
  - `warehouse` (count of total warehouses)
  - `supplier` (count of total suppliers)
  - `customer` (count of total customers)
  - `inventory` (count of total inventory records)
  - `sales_order` (count of total sales orders)
  - `inventory_risk` (count of open risks where `status = 'Open'`)
  - `vw_inventory_status` (count of low/critical stock rows where status is `'Low'` or `'Critical'`)
  - `vw_sales_order_summary` (7 most recent orders)
  - `vw_inventory_status` (8 stock records requiring attention)

#### UI Controls & Buttons
- **Stat Cards (8 Total):** Products, Warehouses, Suppliers, Customers, Inventory records, Sales orders, Low / critical stock, Open inventory risks.
- **Attention Required Table:** Shows products with status `'Critical'`, `'Low'`, or `'Overstock'` sorted by available quantity ascending.
- **Recent Sales Orders Table:** Shows newest sales orders with status pills and formatted currency in INR (₹).
- **Inventory Health Snapshot Chart:** Responsive bar chart plotting available quantities for the top attention items using Recharts.

#### Cascading Effects on Other Pages
- Read-only dashboard reflecting updates triggered from all other pages.

---

### Page 2: Products

#### Purpose
Catalogs all sellable goods, SKUs, brands, barcodes, pricing, and reorder levels.

#### Data Fetching
- **Endpoint:** `GET /api/manage/products`
- **Tables Queried:** `product p` joined with `category c` and `uom u` (Unit of Measure), ordered by `product_id DESC`.
- **Lookups Endpoint:** `GET /api/manage/lookups` (fetches active categories and units of measure for dropdown forms).

#### UI Controls & Button Triggers
1. **Search Input:**
   - Filters products by Name, SKU, Category, Brand, Barcode, or Price.
2. **Add Product Button (`Plus` icon):**
   - Opens the product creation modal.
   - Requires Staff or Admin authentication.
3. **Save Product (Modal Submit):**
   - **Method/Route:** `POST /api/manage/products` (or `PUT /api/manage/products/:id` when editing).
   - **Payload:** `{ category_id, uom_id, product_name, sku, brand, barcode, unit_price, reorder_level }`.
   - **Database Action:** Validates non-negative price and reorder level. Inserts row into `product`. Enforces unique SKU and barcode.
4. **Edit Product Button (`Edit` icon):**
   - Populates modal with existing record details for update.
5. **Delete Product Button (`Trash2` icon):**
   - **Method/Route:** `DELETE /api/manage/products/:id` (Admin only).
   - **Database Action:** Deletes the product. If foreign key dependencies exist (linked in `inventory`, `supplier_product`, or `so_item`), MySQL blocks deletion with HTTP 409 conflict.

#### Cascading Effects to Other Pages
- **Overview:** Increments/decrements `totalProducts` KPI card.
- **Inventory Page:** New product immediately becomes selectable in the **Add Inventory** modal dropdown.
- **Orders Page:** Once stocked in inventory, new product appears in the **New Order** item picker.
- **Demand Analysis:** Total demand summary includes the product.
- **Graph Database:** Next Neo4j sync creates a corresponding `(:Product)` node.

---

### Page 3: Inventory

#### Purpose
Tracks multi-warehouse stock distribution, on-hand counts, reserved quantities, available stock, and storage slot locations.

#### Data Fetching
- **Endpoint:** `GET /api/manage/inventory`
- **Tables Queried:** `inventory i` joined with `product p` and `warehouse w`.
- **Calculated Column:** `available_quantity = (quantity_on_hand - reserved_quantity)`.
- **Lookups Endpoint:** `GET /api/manage/inventory-lookups` (fetches active products, warehouses, and existing product-warehouse pairs).

#### UI Controls & Button Triggers
1. **Search Input:**
   - Real-time search across Product name, SKU, Warehouse name, and Location slot.
2. **Add Inventory Button (`Plus` icon):**
   - Opens creation modal. Automatically disables product-warehouse pairs that already have inventory to prevent duplicate entries.
   - **Method/Route:** `POST /api/manage/inventory`
   - **Payload:** `{ product_id, warehouse_id, quantity_on_hand, reserved_quantity, reorder_level, min_stock_level, max_stock_level, location_slot }`.
   - **Database Action:** Inside a transaction with row locks, inserts into `inventory`.
3. **Update Stock Button (`Edit` icon):**
   - Opens the stock adjustment modal.
   - **Method/Route:** `PATCH /api/manage/inventory/:id`
   - **Payload:** Updated stock levels and location slot.
   - **Database Action:**
     - Validates `reserved_quantity <= quantity_on_hand` and `max_stock_level >= min_stock_level`.
     - Executes transaction to update the inventory row.
     - **Database Trigger Fired:** `auto_stockout_risk` AFTER UPDATE trigger executes:
       - If `available_quantity <= min_stock_level`, automatically inserts a risk record into `inventory_risk` (Score 100 / Critical if available <= 0; Score 85 / High if available <= min).

#### Cascading Effects to Other Pages
- **Overview:**
  - Updates `inventoryRecords` stat.
  - Recalculates `lowStock` count.
  - Updates the **Attention required** table and **Inventory health snapshot** chart.
- **Orders Page:**
  - When creating orders, product quantity ceiling is directly bound by `available_quantity`.
- **Risk Analysis Page:**
  - When inventory update drives stock below minimum, the `auto_stockout_risk` trigger automatically populates the Risk Analysis page with a new Open risk item!
- **Graph Database:**
  - Next Neo4j sync updates the `[:STORED_AT]` relationship with new available and reserved quantities.

---

### Page 4: Warehouses

#### Purpose
Maintains storage facilities, distribution center locations, storage capacities, and operational statuses.

#### Data Fetching
- **Endpoint:** `GET /api/data/warehouses`
- **Tables Queried:** `SELECT * FROM warehouse ORDER BY warehouse_name DESC`.

#### UI Controls & Button Triggers
- **Search Input:** Filters warehouse records by warehouse name, location, address, or capacity.

#### Cascading Effects to Other Pages
- Referenced across Inventory, Orders, Demand History, and Neo4j graph nodes `(:Warehouse)`.

---

### Page 5: Suppliers

#### Purpose
Manages vendors, manufacturing partners, contact personnel, commercial ratings, and supplier reliability.

#### Data Fetching
- **Endpoint:** `GET /api/manage/suppliers` (with fallback to `GET /api/data/suppliers`).
- **Tables Queried:** `SELECT supplier_id, supplier_name, contact_person, email, phone_number, address, rating, is_active FROM supplier ORDER BY supplier_id DESC`.

#### UI Controls & Button Triggers
1. **Search Input:**
   - Filters suppliers by name, contact person, email, phone number, address, or rating.
2. **View Supplied Products Button (`Package` icon):**
   - Calls `GET /api/manage/suppliers/:id/products` which executes stored procedure `CALL GetSupplierProducts(?)`.
   - Opens a modal listing all products supplied by that vendor, their unit cost, lead time days, and preferred supplier status.
3. **Add Supplier Button (`Plus` icon):**
   - Opens supplier creation modal.
   - **Method/Route:** `POST /api/manage/suppliers`
   - **Payload:** `{ supplier_name, contact_person, email, phone_number, address, rating }`.
   - **Database Action:** Enforces `rating` between 0.00 and 5.00. Inserts into `supplier` table.
4. **Edit Supplier Button (`Edit` icon):**
   - **Method/Route:** `PUT /api/manage/suppliers/:id`.
   - Updates supplier details.
5. **Delete Supplier Button (`Trash2` icon - Admin Only):**
   - **Method/Route:** `DELETE /api/manage/suppliers/:id`.
   - Checks if supplier supplies products (`supplier_product`) or has purchase orders (`purchase_order`). If referenced, blocks with HTTP 409 conflict.

#### Cascading Effects to Other Pages
- **Overview:** Increments `totalSuppliers` count on dashboard.
- **Supplier Products Page:** New supplier is immediately available for product linking.
- **Graph Database:** Next Neo4j sync reads the new supplier and creates a `(:Supplier)` node with rating and active status properties.

---

### Page 6: Supplier Products (Connecting Suppliers to Products)

#### Purpose
Implements the relational link between `supplier` and `product` via the `supplier_product` table as defined in `backup.sql`. Tracks unit costs, delivery lead time days, vendor product codes, and preferred vendor flags.

#### Data Fetching
- **Endpoint:** `GET /api/manage/supplier-products`
- **Tables Queried:** `supplier_product sp` joined with `supplier s` and `product p`.
- **Lookups Endpoint:** `GET /api/manage/supplier-product-lookups` (fetches active suppliers, products, and existing pairs).

#### UI Controls & Button Triggers
1. **Search Input:**
   - Filters records by supplier name, product name, SKU, vendor product code, or preferred status.
2. **Link Product Button (`Plus` icon):**
   - Opens product-linking modal.
   - **Method/Route:** `POST /api/manage/supplier-products`
   - **Payload:** `{ supplier_id, product_id, supplier_product_code, unit_cost, lead_time_days, is_preferred }`.
   - **Database Action:** Inserts into `supplier_product`. Enforces `UNIQUE KEY uq_supplier_product (supplier_id, product_id)`, `unit_cost >= 0`, `lead_time_days >= 0`.
3. **Edit Link Button (`Edit` icon):**
   - **Method/Route:** `PUT /api/manage/supplier-products/:id`.
   - Updates unit cost, lead time, vendor product code, and preferred status.
4. **Unlink Button (`Trash2` icon - Admin Only):**
   - **Method/Route:** `DELETE /api/manage/supplier-products/:id`.
   - Unlinks product from supplier.

#### Cascading Effects to Other Pages
- **Suppliers Page:** Reflected in the "View supplied products" modal (`CALL GetSupplierProducts(?)`).
- **Graph Database:** Synced into Neo4j as `(:Supplier)-[:SUPPLIES]->(:Product)` with `unit_cost` and `lead_time_days`.

---

### Page 7: Customers

#### Purpose
Maintains client entities, wholesale distributors, retail stores, corporate clients, contact info, and delivery addresses.

#### Data Fetching
- **Endpoint:** `GET /api/manage/customers` (with fallback to `GET /api/data/customers`).
- **Tables Queried:** `SELECT customer_id, customer_name, email, phone_number, customer_type, address, is_active FROM customer ORDER BY customer_id DESC`.

#### UI Controls & Button Triggers
1. **Search Input:**
   - Filters customers by name, email, phone, customer type (`Retail`, `Wholesale`, `Corporate`), or address.
2. **Add Customer Button (`Plus` icon):**
   - Opens customer creation modal.
   - **Method/Route:** `POST /api/manage/customers`
   - **Payload:** `{ customer_name, email, phone_number, customer_type, address }`.
   - **Database Action:**
     - Enforces email regex format satisfying MySQL check constraint `email LIKE '%_@_%._%'`.
     - Enforces customer type constraint (`Retail`, `Wholesale`, `Corporate`).
     - Checks uniqueness of email and phone number (`ER_DUP_ENTRY`).
     - Inserts into `customer` table.
3. **Edit Customer Button (`Edit` icon):**
   - **Method/Route:** `PUT /api/manage/customers/:id`.
   - Updates customer details.
4. **Delete Customer Button (`Trash2` icon - Admin Only):**
   - **Method/Route:** `DELETE /api/manage/customers/:id`.
   - Checks if customer has existing sales orders (`sales_order`). If referenced, blocks with HTTP 409 conflict to maintain relational integrity.

#### Cascading Effects to Other Pages
- **Overview:** Increments `totalCustomers` count on dashboard.
- **Orders Page:** The newly created customer is **immediately available** in the Customer dropdown of the **New Order** modal (`GET /api/manage/order-lookups` queries `SELECT customer_id, customer_name FROM customer ORDER BY customer_name`).

---

### Page 8: Orders (Sales Orders)

#### Purpose
End-to-end sales order management: customer order entry, warehouse stock reservation, order cancellation, and order audit ledger.

#### Data Fetching
- **Endpoint:** `GET /api/manage/orders`
- **Tables Queried:** `vw_sales_order_summary summary` joined with `app_managed_orders managed`.
- **Lookups Endpoint:** `GET /api/manage/order-lookups` (fetches customers, warehouses, active products, and live available stock per warehouse).

#### UI Controls & Button Triggers
1. **Search Input:**
   - Real-time search by Order ID (e.g. `#101` or `101`), Customer name, Warehouse name, Status (`Pending`, `Cancelled`), or Amount.
2. **New Order Button (`Plus` icon):**
   - Opens order creation modal.
   - Flow:
     1. User selects customer and warehouse.
     2. Warehouse selection filters product list to only products having available stock at that warehouse.
     3. Setting order item quantity is capped at `available_quantity`.
     4. Date validation prevents selecting dates earlier than today.
   - **Method/Route:** `POST /api/manage/orders`
   - **Payload:** `{ customer_id, warehouse_id, required_date, items: [{ product_id, quantity }] }`.
   - **Database Action (Atomic Transaction):**
     - Locks inventory rows with `SELECT ... FOR UPDATE`.
     - Re-verifies stock availability on the server to prevent race conditions.
     - Inserts row into `sales_order` with status `'Pending'`.
     - Records creating user in `app_managed_orders`.
     - Inserts lines into `so_item` (calculates `line_total = quantity * unit_price`).
     - **Database Trigger Fired:** `check_stock_before_order` verifies available stock before insert.
     - Updates `inventory.reserved_quantity = reserved_quantity + quantity`.
     - Logs allocation in `app_order_reservations`.
     - Commits transaction.
3. **Cancel Pending Order (`X` icon):**
   - **Method/Route:** `POST /api/manage/orders/:id/cancel`
   - **Database Action (Atomic Transaction):**
     - Locks order and reservation ledger.
     - Decrements `inventory.reserved_quantity = reserved_quantity - quantity`.
     - Sets reservation `released = TRUE`.
     - Updates `sales_order.status = 'Cancelled'`.
     - Commits transaction.
4. **Delete Cancelled Order (`Trash2` icon - Admin Only):**
   - **Method/Route:** `DELETE /api/manage/orders/:id`
   - **Database Action:** Deletes order items and order row for app-managed cancelled orders.

#### Cascading Effects to Other Pages
- **Overview:**
  - Increments `salesOrders` count.
  - New order immediately appears in **Recent sales orders** table.
  - If reserving stock reduces available quantity to Low/Critical, updates **Attention required** table and **Low / critical stock** count!
- **Inventory Page:**
  - `reserved_quantity` increases and `available_quantity` decreases by the ordered amount for that warehouse!
  - If cancelled, reserved quantity is immediately restored and available stock increases back!
- **Risk Analysis Page:**
  - If order reservation drives available quantity below minimum stock, the stock-risk trigger evaluates the new stock and opens a risk entry.

---

### Page 9: Risk Analysis

#### Purpose
Proactive operational risk monitoring. Tracks stockout risks, safety stock breaches, risk levels (`Critical`, `High`), and recommended actions.

#### Data Fetching
- **Endpoint:** `GET /api/analytics/risk-summary`
- **Tables Queried:** `inventory_risk ir` joined with `inventory i`, `product p`, and `warehouse w`.
- **Aggregations:** Counts total risks, open risks, critical risks (`risk_level = 'Critical' AND status = 'Open'`), and high risks.

#### UI Controls & Button Triggers
- **Search Input:** Filters risks in real-time by Product name, Warehouse name, Risk type (`Stockout`), Risk level (`Critical`, `High`), Status (`Open`, `Resolved`), or Recommended action.

#### Cascading Effects to Other Pages
- Display reflects stock changes made via Inventory adjustments or Order stock reservations.

---

### Page 10: Demand Analysis

#### Purpose
Analytical review comparing historical product consumption trends against forecasted demand projections.

#### Data Fetching
- **Endpoint:** `GET /api/analytics/demand`
- **Tables Queried:**
  - `demand_history` (100 newest demand events)
  - `demand_forecast` (100 upcoming forecast records)
  - Aggregated product summary query (sums `quantity_demanded` and `forecasted_quantity` by product).

#### UI Content & Tables
- **Demand Summary by Product:** Aggregated table comparing total historical demand vs forecasted demand for top products.
- **Recent Demand History:** Chronological record of demand events by date, product, warehouse, and demand trend.
- *(Clean analytical layout with search removed to maintain focus on reporting)*.

---

### Page 11: Graph Database (Neo4j)

#### Purpose
Multi-tier supply chain relationship exploration modeling supplier dependencies and product warehouse distribution as a property graph.

#### Data Fetching
- **Endpoint:** `GET /api/neo4j/summary`
- **Graph Queries (Cypher):** Counts `(:Supplier)`, `(:Warehouse)`, and `(:Product)` nodes and `[:SUPPLIES]` and `[:STORED_AT]` relationships.

#### UI Controls & Button Triggers
1. **Connection Status Pill:** Displays `'Connected'` (Green) or `'Not connected'` (Red).
2. **Check Connection Button:** Queries Neo4j driver health.
3. **Sync MySQL → Neo4j Button (Admin Only):**
   - **Method/Route:** `POST /api/neo4j/sync`
   - **Backend Action:**
     - Enforces uniqueness constraints on `Supplier.id`, `Product.id`, `Warehouse.id`.
     - Reads all suppliers, warehouses, products, supplier-product links, and inventory records from MySQL.
     - Runs transactional Cypher `MERGE` queries:
       ```cypher
       MERGE (s:Supplier {id: row.supplier_id})
       SET s.name = row.supplier_name, s.rating = row.rating, s.active = row.is_active

       MERGE (p:Product {id: row.product_id})
       MERGE (w:Warehouse {id: row.warehouse_id})

       MERGE (s)-[r:SUPPLIES]->(p)
       SET r.unit_cost = row.unit_cost, r.lead_time_days = row.lead_time_days, r.preferred = row.is_preferred

       MERGE (p)-[r:STORED_AT]->(w)
       SET r.quantity_on_hand = row.quantity_on_hand, r.reserved = row.reserved_quantity, r.available = row.available
       ```
     - Reports sync counts: suppliers, products, warehouses, and total graph relationships.

#### Cascading Effects to Other Pages
- Captures new products, new suppliers, and updated inventory levels into the graph database.

---

## 4. Trigger & Cross-Page Impact Matrix

| User Action | Page Where Triggered | Database Operations | Affected Other Pages |
| :--- | :--- | :--- | :--- |
| **Add Product** | `Products` | `INSERT INTO product` | - **Overview**: `totalProducts` KPI increments.<br>- **Inventory**: Product appears in Add Inventory dropdown.<br>- **Orders**: Available in order line picker once stocked.<br>- **Graph**: Synced as `(:Product)` node. |
| **Add Inventory** | `Inventory` | `INSERT INTO inventory` | - **Overview**: `inventoryRecords` KPI increments.<br>- **Orders**: Makes stock available for new orders.<br>- **Risk**: `auto_stockout_risk` trigger checks threshold.<br>- **Graph**: Synced as `[:STORED_AT]` relationship. |
| **Update Stock** | `Inventory` | `UPDATE inventory`, fires trigger `auto_stockout_risk` | - **Overview**: Updates Low/Critical KPI & Attention table.<br>- **Orders**: Adjusts max allowed order quantities.<br>- **Risk Analysis**: Automatically creates open risk row if stock falls below minimum level. |
| **Add Customer** | `Customers` | `INSERT INTO customer` | - **Overview**: `totalCustomers` KPI increments.<br>- **Orders**: Customer appears **immediately** in New Order dropdown. |
| **Add Supplier** | `Suppliers` | `INSERT INTO supplier` | - **Overview**: `totalSuppliers` KPI increments.<br>- **Supplier Products**: Supplier selectable in Link Product dropdown.<br>- **Graph**: Synced as `(:Supplier)` node on next graph sync. |
| **View Supplied Products** | `Suppliers` | Stored Procedure: `CALL GetSupplierProducts(?)` | - **Suppliers**: Opens modal showing all products supplied by this vendor with cost and lead times. |
| **Link Product to Supplier** | `Supplier Products` | `INSERT INTO supplier_product` | - **Suppliers**: Visible in View Products modal (`GetSupplierProducts`).<br>- **Graph**: Synced as `[:SUPPLIES]` relationship.<br>- **Risk**: Preferred vendor identified for procurement. |
| **Create Order** | `Orders` | Transaction: `INSERT INTO sales_order`, `so_item`, updates `inventory.reserved_quantity`, fires `check_stock_before_order` | - **Overview**: `salesOrders` KPI increments, appears in recent orders table.<br>- **Inventory**: Increases `reserved_quantity`, decreases `available_quantity`.<br>- **Risk Analysis**: If stock becomes critical, triggers risk entry. |
| **Cancel Order** | `Orders` | Transaction: Decrements `inventory.reserved_quantity`, releases reservation, sets status `Cancelled` | - **Overview**: Status updates in recent orders table.<br>- **Inventory**: Restores `available_quantity` for that warehouse.<br>- **Orders**: Stock immediately becomes available for reordering. |
| **Sync Neo4j** | `Graph database` | Cypher `MERGE` across all MySQL entities | - **Graph database**: Updates node counts, edge counts, and relationship stats. |

---

## 5. Security & Verification Summary

- All database mutations use parameterized prepared statements (`?` placeholders) and connection pooling (`mysql2/promise`) to eliminate SQL injection vulnerabilities.
- State modifications check JWT tokens and role authorizations before performing database work.
- Multi-table modifications (such as inventory updates with triggers, order creations with stock reservation ledgers, and order cancellations) execute within strict database transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`).
- Production frontend build and unit test suites pass with 100% success.

