USE supply_chain_db;

-- Run once. This does not truncate or replace your existing project data.
CREATE TABLE IF NOT EXISTS app_users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_managed_orders (
  so_id INT PRIMARY KEY,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_managed_order FOREIGN KEY (so_id) REFERENCES sales_order(so_id) ON DELETE CASCADE,
  CONSTRAINT fk_app_managed_order_user FOREIGN KEY (created_by) REFERENCES app_users(user_id)
);

CREATE TABLE IF NOT EXISTS app_order_reservations (
  so_id INT NOT NULL,
  inventory_id INT NOT NULL,
  quantity INT NOT NULL,
  released BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (so_id, inventory_id),
  CONSTRAINT fk_app_order_reservation_order FOREIGN KEY (so_id) REFERENCES app_managed_orders(so_id) ON DELETE CASCADE,
  CONSTRAINT fk_app_order_reservation_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id),
  CONSTRAINT chk_app_order_reservation_quantity CHECK (quantity > 0)
);

-- The inventory.last_updated column was added during setup in this project.
-- If your database does not have it, run this separately:
-- ALTER TABLE inventory ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
