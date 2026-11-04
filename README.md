# Supply Chain Inventory Risk & Demand Analysis System

A supply-chain operations dashboard for the PES University DBMS mini project. It uses Next.js for the web app, Express for the API, MySQL for operational and analytical data, and optionally Neo4j for the supplier/product/warehouse graph.

## Important
- Requires the existing project MySQL schema and seed data. This repository does not include the academic schema/seed SQL.
- **Do not rerun the Review 2 seed SQL**: it contains `TRUNCATE` statements and can erase/reset project records.
- The app adds only three application-owned tables: `app_users`, `app_managed_orders`, and `app_order_reservations`.
- Never commit `backend/.env` or `frontend/.env.local`; they contain local credentials/configuration.

## Folder structure

```text
SupplyChainProject/
├── backend/
│   ├── src/
│   │   ├── routes/       # auth, dashboard, data, Neo4j health
│   │   ├── scripts/      # admin account setup
│   │   ├── auth.js
│   │   ├── db.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/app/          # Next.js dashboard
│   ├── package.json
│   └── .env.local.example
└── database/app_setup.sql
```

## 1. Prerequisites and database

- Node.js 20 LTS (20.9 or later) and npm.
- MySQL 8, running and containing the project's `supply_chain_db` schema, tables, views, procedures, triggers, and seed records.
- Neo4j is optional. Only needed for the graph view and MySQL-to-Neo4j synchronization.

Do not use the project seed/reset SQL as part of normal app startup. Confirm the database name and credentials with the project owner. The API health check verifies connectivity but does not create the academic schema.

## 2. Backend setup (Windows PowerShell)

Open a terminal in `SupplyChainProject/backend`:

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

Install the application tables and start the API:

```powershell
npm run create-admin -- admin YOUR_UNIQUE_PASSWORD
npm run dev
```

The bootstrap command creates/updates the admin account and the three application-owned tables. Use a password of at least 10 characters. Command arguments may be saved in shell history; rotate the password before sharing the machine or project. Keep this terminal running. Verify `http://localhost:5000/api/health` returns `{"success":true,"mysql":true}`.

## 3. Frontend setup

Open a second terminal in `SupplyChainProject/frontend`:

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_URL` is the backend base URL, without a trailing `/api`. The example points to `http://localhost:5000`. Open the URL printed by Next.js, normally `http://localhost:3000`; if that port is busy, Next.js may use `3001`, which is included in the example CORS origins.

For a different backend port, set `PORT` in `backend/.env`, set the matching `NEXT_PUBLIC_API_URL` in `frontend/.env.local`, and include the frontend origin in `CLIENT_ORIGIN`; then restart both processes. For example, the current workspace has used frontend `3001` with API `5002`.

## 4. Accounts and sign-in

Sign in on the dashboard using the admin username/password provided to `create-admin`. Passwords are bcrypt-hashed. The login endpoint is `POST http://localhost:5000/api/auth/login` with JSON:

```json
{"username":"admin","password":"YOUR_UNIQUE_PASSWORD"}
```

The endpoint returns a JWT. Admin and staff roles are enforced by the API. This project has no staff-registration screen or staff-creation CLI; use an administrator account unless a staff account has been provisioned by the team. Product deletion, deleting cancelled app-created orders, and Neo4j synchronization are admin-only.

## 5. Use the dashboard

- **Overview:** live MySQL totals, recent orders, stock attention, and inventory chart.
- **Products:** add/edit products; admins can delete unreferenced products. Referenced products should be discontinued instead.
- **Inventory:** choose **Add inventory**, select a product/warehouse pair without an existing stock row, and enter quantities/thresholds. Use **Update stock** for existing rows. Stock changes run in a transaction and can invoke the stock-risk trigger.
- **Orders:** choose **New order**, select customer and warehouse first, then choose from products with stock there. The form shows available stock and caps quantity. Order creation reserves stock; cancelling a pending order releases it. Admin deletion of a cancelled order is optional. Historical seeded orders remain view-only.
- **Risk analysis** and **Demand analysis:** read the existing MySQL risk/history/forecast data.
- **Graph database:** optional. Check connection, then admins can sync MySQL data to Neo4j.

Required dates cannot be earlier than today. If stock changes after the form loads, the API rechecks within a transaction and may reject the order with an insufficient-stock message; refresh and choose a lower quantity.

## API Reference

- `GET /api/health` — MySQL health check
- `POST /api/auth/login` — application login
- `GET /api/dashboard/stats` — dashboard KPIs, recent orders, inventory attention list
- `GET /api/data/products`
- `GET /api/data/inventory`
- `GET /api/data/suppliers`
- `GET /api/data/warehouses`
- `GET /api/data/customers`
- `GET /api/data/orders`
- `GET /api/data/risks`
- `GET /api/data/transfers`
- `GET /api/manage/products` and `GET /api/manage/inventory`
- `POST/PUT/DELETE /api/manage/products` (JWT; delete admin-only)
- `POST /api/manage/inventory` (JWT; create stock record)
- `PATCH /api/manage/inventory/:id` (JWT)
- `GET /api/manage/order-lookups` and `POST /api/manage/orders` (JWT; create pending order and reserve stock)
- `POST /api/manage/orders/:id/cancel` (JWT; pending orders only, releases reserved stock)
- `DELETE /api/manage/orders/:id` (JWT; admin-only, cancelled orders only)
- `GET /api/manage/lookups`
- `GET /api/neo4j/health` — optional Neo4j connectivity check
- `POST /api/neo4j/sync` — admin-only MySQL-to-Neo4j synchronization; creates uniqueness constraints as part of the sync

List endpoints accept `?limit=100` (maximum 500).

## Optional Neo4j Setup

Install and start Neo4j Desktop/Server, create a database, then configure the following in `backend/.env` using your own local credentials:

```env
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=YOUR_NEO4J_PASSWORD
NEO4J_DATABASE=neo4j
```

Restart the backend and open `http://localhost:5000/api/neo4j/health`. Sign in as an administrator and use **Graph database → Sync MySQL → Neo4j**. The sync creates uniqueness constraints and synchronizes the MySQL supplier, product, warehouse, supplier-product, and inventory data. Never commit or share the real Neo4j password.

## Detailed Product and Inventory Routes

- `GET /api/manage/lookups` returns active categories and units for the product form.
- `GET /api/manage/products` lists products with category and unit names.
- `POST /api/manage/products` creates a product (admin/staff JWT required).
- `PUT /api/manage/products/:id` updates a product (admin/staff JWT required).
- `DELETE /api/manage/products/:id` deletes a product (admin JWT required). Products referenced by inventory or orders are protected by foreign keys; discontinue them instead.
- `GET /api/manage/inventory` lists stock by product and warehouse.
- `PATCH /api/manage/inventory/:id` adjusts stock (admin/staff JWT required). The API validates quantities and commits the update in a transaction. The existing `auto_stockout_risk` trigger evaluates the updated inventory.
- `POST /api/manage/inventory` adds a product/warehouse stock record (admin/staff JWT required). Duplicate product/warehouse pairs and invalid stock quantities are rejected.

The frontend includes product listing/search, product add/edit, admin-only delete, inventory listing/create/adjustment, and order create/cancel controls. Use the admin account created in [Accounts and sign-in](#4-accounts-and-sign-in). Do not rerun the seed SQL.

## Sales Order Workflow

- Admin/staff can create a `Pending` order with one or more products. After choosing a warehouse, the form shows available stock for each product and caps quantity at that amount. The API locks inventory rows, revalidates availability, inserts order lines, and reserves stock within a transaction.
- Required dates must be today or later; the form prevents past dates and the API returns a clear validation error before the database constraint is reached.
- The database `check_stock_before_order` trigger independently rejects an order line that exceeds available stock.
- Admin/staff can cancel a pending order; cancellation releases its reservations in a transaction.
- Only admins can delete cancelled orders. Confirmed, shipped, and delivered orders cannot be edited or deleted by this workflow.
- The Add Inventory form filters out product/warehouse pairs that already have a stock record; the API still rejects duplicates if the data changes concurrently.
- Order create/cancel/delete and stock reservation were integration-tested using temporary rows; all fixtures were removed afterward.

## Test and Verification

Implemented: authenticated dashboard login, admin/staff JWT middleware, product create/update and admin-only delete, transactional inventory updates, pending sales-order creation/cancellation and admin deletion of cancelled orders, demand/risk APIs, Neo4j health/summary/network and admin synchronization, and a responsive Next.js dashboard.

The verification snapshot from 2026-11-02 found 18 project tables plus 3 application tables (`app_users`, `app_managed_orders`, and `app_order_reservations`), 2 views, 2 stored procedures, 2 triggers, and 25 project foreign-key relationships. Counts will change as project data changes.

`npm test` runs auth/role middleware unit tests. To run the complete suite against the configured MySQL database and a running API:

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
