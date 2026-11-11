# Supply Chain Inventory Risk & Demand Analysis System

A supply-chain operations dashboard for the PES University DBMS mini project. It uses Next.js for the web app, Express for the API, MySQL for operational and analytical data, and optionally Neo4j for the supplier/product/warehouse graph.

> **Documentation Guides:**
> - **[Page-by-Page System & Database Explanation](docs/PAGE_BY_PAGE_EXPLANATION.md)**: Dedicated reference explaining exactly what each page does, how to use it, what SQL queries it executes, what triggers/procedures are fired, from where it fetches data, and how changes cascade across other pages and tables.
> - **[Complete System Architecture Explanation](docs/SYSTEM_EXPLANATION.md)**: Full architecture, schema relationships, and API contract specifications.

---

## Important
- Requires the existing project MySQL schema and seed data. This repository does not include the academic schema/seed SQL.
- **Do not rerun the Review 2 seed SQL**: it contains `TRUNCATE` statements and can erase/reset project records.
- The app adds only three application-owned tables: `app_users`, `app_managed_orders`, and `app_order_reservations`.
- Never commit `backend/.env` or `frontend/.env.local`; they contain local credentials/configuration.

---

## Folder Structure

```text
SupplyChainProject/
├── backend/
│   ├── src/
│   │   ├── routes/       # auth, dashboard, analytics, data, productsInventory, orders, customersSuppliers, neo4j
│   │   ├── scripts/      # admin account setup (createAdmin.js)
│   │   ├── auth.js       # JWT authentication & role-based authorization
│   │   ├── db.js         # MySQL connection pool
│   │   └── server.js     # Express app entry point
│   ├── test/             # Unit tests (auth, customers/suppliers) and integration tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js dashboard pages and global CSS
│   │   └── components/   # InventoryControls, OrderControls
│   ├── .env.local.example
│   └── package.json
├── database/
│   └── app_setup.sql     # Application-owned tables
└── docs/
    ├── SYSTEM_EXPLANATION.md   # Deep-dive of each page, API fetch, trigger, and cross-page effects
    ├── TECHNICAL_WALKTHROUGH.md
    └── FINAL_REPORT.md
```

---

## 1. Prerequisites and Database

- Node.js 20 LTS (or Node.js 24) and npm.
- MySQL 8, running and containing the project's `supply_chain_db` schema, tables, views, procedures, triggers, and seed records.
- Neo4j is optional. Only needed for the graph view and MySQL-to-Neo4j synchronization.

Do not use the project seed/reset SQL as part of normal app startup. Confirm the database name and credentials with the project owner. The API health check verifies connectivity but does not create the academic schema.

---

## 2. Backend Setup (Windows PowerShell)

Open a terminal in `backend`:

```powershell
npm install
Copy-Item .env.example .env
```

Open `backend/.env` and set your actual MySQL password. Example:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:3000,http://localhost:3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=supply_chain_db
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
```

Generate a JWT secret, for example with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, and use the output as `JWT_SECRET`. Replace all example credentials with your own values. Do not commit `.env` or share its contents.

Install the application tables and create the administrator account:

```powershell
npm run create-admin -- admin YOUR_UNIQUE_PASSWORD
npm run dev
```

The bootstrap command creates/updates the admin account and the three application-owned tables. Use a password of at least 10 characters. Keep this terminal running. Verify `http://localhost:5000/api/health` returns `{"success":true,"mysql":true}`.

---

## 3. Frontend Setup

Open a second terminal in `frontend`:

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_URL` is the backend base URL, without a trailing `/api`. The default points to `http://localhost:5000`. Open the URL printed by Next.js, normally `http://localhost:3000` (or `3001`).

---

## 4. Accounts and Sign-In

Sign in on the dashboard using the admin username/password provided to `create-admin`. Passwords are bcrypt-hashed. The login endpoint is `POST http://localhost:5000/api/auth/login` with JSON:

```json
{"username":"admin","password":"YOUR_UNIQUE_PASSWORD"}
```

The endpoint returns a signed JWT. Admin and staff roles are enforced by the API:
- **Public (Unauthenticated):** View-only access across all tabs.
- **Staff:** Add/edit products, add/update inventory, add/edit customers, add/edit suppliers, and create/cancel pending orders.
- **Admin:** All Staff abilities PLUS product deletion, customer deletion, supplier deletion, cancelled order deletion, and Neo4j synchronization.

---

## 5. Use the Dashboard

- **Overview:** Live MySQL totals, recent orders, stock attention list, and inventory snapshot chart.
- **Products:** Add and edit products; search across all product attributes. Admins can delete unreferenced products.
- **Inventory:** Add new stock records (automatically prevents duplicate product/warehouse pairs) and update stock levels. Adjustments trigger the `auto_stockout_risk` MySQL trigger.
- **Customers:** Add and edit customers with email and customer-type validation; search customers by name, phone, email, or type. Newly added customers immediately appear in the **New order** modal customer dropdown.
- **Suppliers:** Add and edit suppliers with rating validation (0-5); search suppliers by name, contact person, or address.
- **Orders:** Search orders by Order ID (`#101`), Customer, Warehouse, Date, Status, or Amount. Click **New order** to choose customer, warehouse, and products with available stock; order creation automatically reserves inventory. Staff/Admin can cancel pending orders to release reservations.
- **Warehouses:** View and search storage facilities and distribution centers.
- **Risk Analysis:** View and search stockout risk records created automatically by MySQL database triggers.
- **Demand Analysis:** Analytics reporting showing historical vs forecasted demand by product and demand trends.
- **Graph Database:** Check Neo4j connectivity and synchronize MySQL entities (Suppliers, Products, Warehouses, Relationships) to Neo4j.

---

## Search Functionality

The search engine performs **value-based matching**:
- Checks only table cell values, ignoring JSON schema keys so typing letters (`a`, `p`, `c`) or words (`name`, `status`) filters records accurately.
- Supports multi-word matching (e.g. `"Milk Dairy"` or `"Aarav Wholesale"`).
- Search is available on all operational tables (`Products`, `Inventory`, `Customers`, `Suppliers`, `Orders`, `Warehouses`, `Risk analysis`) and cleanly removed from analytical/system panels (`Overview`, `Demand analysis`, `Graph database`).

---

## API Reference

### Health & Auth
- `GET /api/health` — MySQL connectivity check
- `POST /api/auth/login` — Application sign-in, returns JWT token

### Dashboard & Analytics
- `GET /api/dashboard/stats` — Dashboard KPI stats, recent orders, inventory attention list
- `GET /api/analytics/demand` — Demand history, forecasts, and product summary
- `GET /api/analytics/risk-summary` — Inventory risk counts and risk records

### Product & Inventory Management
- `GET /api/manage/lookups` — Active categories and units of measure
- `GET /api/manage/products` — Product list
- `POST /api/manage/products` — Create product (Staff/Admin JWT)
- `PUT /api/manage/products/:id` — Update product (Staff/Admin JWT)
- `DELETE /api/manage/products/:id` — Delete product (Admin JWT)
- `GET /api/manage/inventory-lookups` — Products, warehouses, and existing pairs
- `GET /api/manage/inventory` — Inventory list with calculated available stock
- `POST /api/manage/inventory` — Create inventory record (Staff/Admin JWT)
- `PATCH /api/manage/inventory/:id` — Update stock levels (Staff/Admin JWT; fires risk trigger)

### Customer & Supplier Management
- `GET /api/manage/customers` — Customer list (most recent first)
- `POST /api/manage/customers` — Create customer (Staff/Admin JWT)
- `PUT /api/manage/customers/:id` — Update customer (Staff/Admin JWT)
- `DELETE /api/manage/customers/:id` — Delete customer (Admin JWT; blocks if orders exist)
- `GET /api/manage/suppliers` — Supplier list (most recent first)
- `POST /api/manage/suppliers` — Create supplier (Staff/Admin JWT)
- `PUT /api/manage/suppliers/:id` — Update supplier (Staff/Admin JWT)
- `DELETE /api/manage/suppliers/:id` — Delete supplier (Admin JWT; blocks if referenced)

### Orders Management
- `GET /api/manage/orders` — Sales orders with app-managed indicator
- `GET /api/manage/order-lookups` — Customers, warehouses, products, and available stock
- `POST /api/manage/orders` — Create pending order and reserve inventory (Staff/Admin JWT)
- `POST /api/manage/orders/:id/cancel` — Cancel pending order and release reserved stock (Staff/Admin JWT)
- `DELETE /api/manage/orders/:id` — Delete cancelled order (Admin JWT)

### Read-Only Project Resources
- `GET /api/data/:resource` — Generic listing (`warehouses`, `transfers`, etc.)

### Neo4j Graph
- `GET /api/neo4j/health` — Neo4j connection check
- `GET /api/neo4j/summary` — Graph node and relationship counts
- `GET /api/neo4j/supplier-network` — Graph network data
- `POST /api/neo4j/sync` — Synchronize MySQL data to Neo4j (Admin JWT)

---

## Testing

Run unit tests (auth and customer/supplier validation):
```powershell
cd backend
npm test
```

Build the frontend to verify types and compilation:
```powershell
$env:ALLOW_DB_INTEGRATION_TESTS='true'
$env:API_BASE_URL='http://localhost:5000'
$env:VERIFY_NEO4J='true'
npm run test:all
Remove-Item Env:ALLOW_DB_INTEGRATION_TESTS,Env:API_BASE_URL,Env:VERIFY_NEO4J
```

Run the integration suite only against a development/test database: it creates disposable accounts, products, inventory, orders, and risks, then verifies their cleanup. Omit `VERIFY_NEO4J` if Neo4j is not running. Set `API_BASE_URL` to match `PORT` if you use a non-default API port. The project schema is external to this starter; `database/app_setup.sql` creates only the three application-owned tables and does not replace project tables.

## Demand and Risk Analytics

- `GET /api/analytics/demand` returns recent demand history, forecast records, and a per-product historical-versus-forecast summary.
- `GET /api/analytics/risk-summary` returns risk totals and inventory-linked risk details.

The Next.js navigation includes **Demand analysis** and displays the demand summary alongside historical demand records.

## Neo4j Graph Model

Neo4j is the project's second database paradigm. The graph model represents:

- `(Supplier)-[:SUPPLIES]->(Product)` using the `supplier_product` relationship table.
- `(Product)-[:STORED_AT]->(Warehouse)` using the `inventory` table.

Configure `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, and optionally `NEO4J_DATABASE` in `backend/.env`. Start the Neo4j database, sign in to the web application as an administrator, open **Graph database**, and choose **Sync MySQL → Neo4j**. The sync is repeatable: it uses MERGE and unique constraints, so it updates matching graph nodes and relationships instead of creating duplicates.

Endpoints:
- `GET /api/neo4j/health`
- `GET /api/neo4j/summary`
- `GET /api/neo4j/supplier-network`
- `POST /api/neo4j/sync` (admin JWT required)

If Neo4j is unavailable, MySQL-backed modules continue to work; graph health and synchronization will be unavailable until Neo4j is started.

## Submission Notes

Verified in the current environment: MySQL health, dashboard, product/inventory/order reads, demand and risk analytics, Neo4j connectivity/summary/supplier network, backend syntax, frontend lint/build, and 3 auth/role unit tests. The live database reports 96 graph relationships.

For a reviewer-facing explanation of the architecture, schema, data flow, formulas, triggers, and transactions, see [the technical walkthrough](docs/TECHNICAL_WALKTHROUGH.md). Still required for submission: add team names and individual contributions; rotate the setup admin password; and commit from the team's Git repository. Screenshots are saved in `docs/`. The active starter directory is not itself a Git repository, so no commits were created. See [the final report](docs/FINAL_REPORT.md) for the ER diagram and verification evidence.
#   S u p p l y - C h a i n - I n v e n t o r y - m a n a g e m e n t 
 
 