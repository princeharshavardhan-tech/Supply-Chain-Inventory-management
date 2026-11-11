-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: supply_chain_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `supply_chain_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `supply_chain_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `supply_chain_db`;

--
-- Table structure for table `adjustment_reason`
--

DROP TABLE IF EXISTS `adjustment_reason`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adjustment_reason` (
  `reason_id` int NOT NULL AUTO_INCREMENT,
  `reason_type` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`reason_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adjustment_reason`
--

LOCK TABLES `adjustment_reason` WRITE;
/*!40000 ALTER TABLE `adjustment_reason` DISABLE KEYS */;
INSERT INTO `adjustment_reason` VALUES (1,'Damage','Goods damaged in storage or transit'),(2,'Expiry','Products removed after expiry date'),(3,'Loss','Stock lost or stolen'),(4,'Correction','Stock count correction after physical audit'),(5,'Return','Customer return added back to stock'),(6,'Supplier Return','Defective goods returned to supplier'),(7,'Receipt','Goods received against a purchase order'),(8,'Dispatch','Goods dispatched against a sales order'),(9,'Transfer','Stock transferred between warehouses');
/*!40000 ALTER TABLE `adjustment_reason` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_managed_orders`
--

DROP TABLE IF EXISTS `app_managed_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_managed_orders` (
  `so_id` int NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`so_id`),
  KEY `fk_app_managed_order_user` (`created_by`),
  CONSTRAINT `fk_app_managed_order` FOREIGN KEY (`so_id`) REFERENCES `sales_order` (`so_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_managed_order_user` FOREIGN KEY (`created_by`) REFERENCES `app_users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_managed_orders`
--

LOCK TABLES `app_managed_orders` WRITE;
/*!40000 ALTER TABLE `app_managed_orders` DISABLE KEYS */;
INSERT INTO `app_managed_orders` VALUES (55,1,'2026-11-02 14:18:58'),(57,1,'2026-11-02 14:27:50');
/*!40000 ALTER TABLE `app_managed_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_order_reservations`
--

DROP TABLE IF EXISTS `app_order_reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_order_reservations` (
  `so_id` int NOT NULL,
  `inventory_id` int NOT NULL,
  `quantity` int NOT NULL,
  `released` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`so_id`,`inventory_id`),
  KEY `fk_app_order_reservation_inventory` (`inventory_id`),
  CONSTRAINT `fk_app_order_reservation_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`inventory_id`),
  CONSTRAINT `fk_app_order_reservation_order` FOREIGN KEY (`so_id`) REFERENCES `app_managed_orders` (`so_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_order_reservations`
--

LOCK TABLES `app_order_reservations` WRITE;
/*!40000 ALTER TABLE `app_order_reservations` DISABLE KEYS */;
INSERT INTO `app_order_reservations` VALUES (55,1,1,0),(57,64,30,0);
/*!40000 ALTER TABLE `app_order_reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `app_users`
--

DROP TABLE IF EXISTS `app_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(80) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','staff') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_users`
--

LOCK TABLES `app_users` WRITE;
/*!40000 ALTER TABLE `app_users` DISABLE KEYS */;
INSERT INTO `app_users` VALUES (1,'admin','$2a$12$LRF0zwfma.LOuwvJa1l/UeQbpI1duCS12XssFVDthxkfkjQe18t92','admin',1,'2026-11-02 07:25:27');
/*!40000 ALTER TABLE `app_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `parent_category_id` int DEFAULT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`category_id`),
  KEY `fk_category_parent` (`parent_category_id`),
  CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `category` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (1,NULL,'Groceries','Daily grocery products',1),(2,NULL,'Beverages','Drinks and beverages',1),(3,NULL,'Personal Care','Personal hygiene and care products',1),(4,1,'Dairy','Milk and dairy products',1),(5,1,'Snacks','Packaged snacks',1),(6,2,'Soft Drinks','Carbonated beverages',1),(7,1,'Staples','Rice, pulses, flour, sugar and oil',1),(8,1,'Instant Food','Ready-to-cook and instant food',1),(9,2,'Juices','Fruit juices and fruit drinks',1),(10,3,'Hair Care','Shampoo and conditioner',1),(11,3,'Oral Care','Toothpaste and toothbrushes',1),(12,3,'Skin Care','Soap and face care',1);
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `address` text,
  `customer_type` varchar(30) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone_number` (`phone_number`),
  CONSTRAINT `chk_customer_email` CHECK ((`email` like _utf8mb4'%_@_%._%')),
  CONSTRAINT `chk_customer_type` CHECK ((`customer_type` in (_utf8mb4'Retail',_utf8mb4'Wholesale',_utf8mb4'Corporate')))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
INSERT INTO `customer` VALUES (1,'Aarav Traders','aaravtraders@example.com','24, Koramangala, Bangalore','Wholesale','9845010371',1),(2,'Bangalore Mart','bangaloremart@example.com','28, Indiranagar, Bangalore','Retail','9845010742',1),(3,'Cityline Supermarket','citylinesupermarket@example.com','32, Jayanagar, Bangalore','Retail','9845011113',1),(4,'Daily Fresh Stores','dailyfreshstores@example.com','36, Whitefield, Bangalore','Retail','9845011484',1),(5,'Evergreen Grocers','evergreengrocers@example.com','40, Hebbal, Bangalore','Retail','9845011855',1),(6,'FreshBasket Retail','freshbasketretail@example.com','44, BTM Layout, Bangalore','Retail','9845012226',1),(7,'Green Valley Mart','greenvalleymart@example.com','48, Marathahalli, Bangalore','Retail','9845012597',1),(8,'Hosur Road Provisions','hosurroadprovisions@example.com','52, Malleshwaram, Bangalore','Wholesale','9845012968',1),(9,'Indiranagar Superstore','indiranagarsuperstor@example.com','56, Yelahanka, Bangalore','Retail','9845013339',1),(10,'JP Nagar Kirana','jpnagarkirana@example.com','60, HSR Layout, Bangalore','Retail','9845013710',1),(11,'Koramangala Corner Shop','koramangalacornersho@example.com','64, Koramangala, Bangalore','Retail','9845014081',1),(12,'Lakeview Hypermart','lakeviewhypermart@example.com','68, Indiranagar, Bangalore','Wholesale','9845014452',1),(13,'Malleshwaram Stores','malleshwaramstores@example.com','72, Jayanagar, Bangalore','Retail','9845014823',1),(14,'Namma Kirana','nammakirana@example.com','76, Whitefield, Bangalore','Retail','9845015194',1),(15,'Orion Mall Foods','orionmallfoods@example.com','80, Hebbal, Bangalore','Corporate','9845015565',1),(16,'Prestige Corporate Canteen','prestigecorporatecan@example.com','84, BTM Layout, Bangalore','Corporate','9845015936',1),(17,'Quick Pick Mart','quickpickmart@example.com','88, Marathahalli, Bangalore','Retail','9845016307',1),(18,'Rajajinagar Wholesale','rajajinagarwholesale@example.com','92, Malleshwaram, Bangalore','Wholesale','9845016678',0),(19,'Sai Provision Stores','saiprovisionstores@example.com','96, Yelahanka, Bangalore','Retail','9845017049',1),(20,'Tech Park Cafeteria','techparkcafeteria@example.com','100, HSR Layout, Bangalore','Corporate','9845017420',1),(21,'Urban Pantry','urbanpantry@example.com','104, Koramangala, Bangalore','Retail','9845017791',1),(22,'Vijayanagar Traders','vijayanagartraders@example.com','108, Indiranagar, Bangalore','Wholesale','9845018162',1),(23,'Whitefield Residency Club','whitefieldresidencyc@example.com','112, Jayanagar, Bangalore','Corporate','9845018533',1),(24,'Yelahanka Super Bazaar','yelahankasuperbazaar@example.com','116, Whitefield, Bangalore','Retail','9845018904',0),(25,'Zenith Hospitality','zenithhospitality@example.com','120, Hebbal, Bangalore','Corporate','9845019275',1);
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `demand_forecast`
--

DROP TABLE IF EXISTS `demand_forecast`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `demand_forecast` (
  `forecast_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `forecast_date` date NOT NULL,
  `forecasted_quantity` int NOT NULL,
  PRIMARY KEY (`forecast_id`),
  UNIQUE KEY `uq_demand_forecast` (`product_id`,`warehouse_id`,`forecast_date`),
  KEY `fk_demand_forecast_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_demand_forecast_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `fk_demand_forecast_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`warehouse_id`),
  CONSTRAINT `chk_forecast_quantity` CHECK ((`forecasted_quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `demand_forecast`
--

LOCK TABLES `demand_forecast` WRITE;
/*!40000 ALTER TABLE `demand_forecast` DISABLE KEYS */;
INSERT INTO `demand_forecast` VALUES (1,1,1,'2026-10-15',10),(2,1,2,'2026-10-15',13),(3,2,1,'2026-10-15',11),(4,3,2,'2026-10-15',10),(5,4,3,'2026-10-15',8),(6,5,1,'2026-10-15',10),(7,6,3,'2026-10-15',16),(8,7,5,'2026-10-15',11),(9,8,2,'2026-10-15',8),(10,9,4,'2026-10-15',7),(11,10,1,'2026-10-15',25),(12,11,3,'2026-10-15',13),(13,12,5,'2026-10-15',17),(14,13,2,'2026-10-15',9),(15,14,4,'2026-10-15',26),(16,15,1,'2026-10-15',10),(17,16,3,'2026-10-15',6),(18,17,5,'2026-10-15',24),(19,18,2,'2026-10-15',21),(20,19,4,'2026-10-15',7),(21,20,1,'2026-10-15',6),(22,21,3,'2026-10-15',9),(23,22,5,'2026-10-15',24),(24,23,2,'2026-10-15',9),(25,24,4,'2026-10-15',11);
/*!40000 ALTER TABLE `demand_forecast` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `demand_history`
--

DROP TABLE IF EXISTS `demand_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `demand_history` (
  `demand_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `demand_date` date NOT NULL,
  `quantity_demanded` int NOT NULL,
  `demand_trend` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`demand_id`),
  UNIQUE KEY `uq_demand_history` (`product_id`,`warehouse_id`,`demand_date`),
  KEY `fk_demand_history_warehouse` (`warehouse_id`),
  KEY `idx_demand_product_date` (`product_id`,`demand_date`),
  CONSTRAINT `fk_demand_history_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `fk_demand_history_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`warehouse_id`),
  CONSTRAINT `chk_demand_quantity` CHECK ((`quantity_demanded` >= 0)),
  CONSTRAINT `chk_demand_trend` CHECK ((`demand_trend` in (_utf8mb4'Increasing',_utf8mb4'Stable',_utf8mb4'Decreasing')))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `demand_history`
--

LOCK TABLES `demand_history` WRITE;
/*!40000 ALTER TABLE `demand_history` DISABLE KEYS */;
INSERT INTO `demand_history` VALUES (1,1,1,'2026-08-25',31,'Stable'),(2,1,1,'2026-09-10',28,'Stable'),(3,1,1,'2026-09-25',28,'Stable'),(4,1,2,'2026-08-25',25,'Stable'),(5,1,2,'2026-09-10',32,'Increasing'),(6,1,2,'2026-09-25',33,'Stable'),(7,2,1,'2026-08-25',7,'Stable'),(8,2,1,'2026-09-10',13,'Increasing'),(9,2,1,'2026-09-25',8,'Decreasing'),(10,3,2,'2026-08-25',23,'Stable'),(11,3,2,'2026-09-10',26,'Increasing'),(12,3,2,'2026-09-25',12,'Decreasing'),(13,4,3,'2026-08-25',23,'Stable'),(14,4,3,'2026-09-10',16,'Decreasing'),(15,4,3,'2026-09-25',9,'Decreasing'),(16,5,1,'2026-08-25',11,'Stable'),(17,5,1,'2026-09-10',7,'Decreasing'),(18,5,1,'2026-09-25',7,'Stable'),(19,6,3,'2026-08-25',18,'Stable'),(20,6,3,'2026-09-10',18,'Stable'),(21,6,3,'2026-09-25',20,'Increasing'),(22,7,5,'2026-08-25',15,'Stable'),(23,7,5,'2026-09-10',10,'Decreasing'),(24,7,5,'2026-09-25',14,'Increasing'),(25,8,2,'2026-08-25',21,'Stable'),(26,8,2,'2026-09-10',20,'Stable'),(27,8,2,'2026-09-25',12,'Decreasing'),(28,9,4,'2026-08-25',23,'Stable'),(29,9,4,'2026-09-10',13,'Decreasing'),(30,9,4,'2026-09-25',19,'Increasing');
/*!40000 ALTER TABLE `demand_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventory_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `quantity_on_hand` int NOT NULL DEFAULT '0',
  `reserved_quantity` int NOT NULL DEFAULT '0',
  `reorder_level` int NOT NULL DEFAULT '0',
  `min_stock_level` int NOT NULL DEFAULT '0',
  `max_stock_level` int NOT NULL DEFAULT '0',
  `location_slot` varchar(50) DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `uq_inventory_product_warehouse` (`product_id`,`warehouse_id`),
  KEY `idx_inventory_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `fk_inventory_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`warehouse_id`),
  CONSTRAINT `chk_inventory_max` CHECK ((`max_stock_level` >= `min_stock_level`)),
  CONSTRAINT `chk_inventory_min` CHECK ((`min_stock_level` >= 0)),
  CONSTRAINT `chk_inventory_on_hand` CHECK ((`quantity_on_hand` >= 0)),
  CONSTRAINT `chk_inventory_reorder` CHECK ((`reorder_level` >= 0)),
  CONSTRAINT `chk_inventory_reserved` CHECK ((`reserved_quantity` >= 0)),
  CONSTRAINT `chk_reserved_le_onhand` CHECK ((`reserved_quantity` <= `quantity_on_hand`))
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (1,1,1,80,11,100,50,500,'A-01','2026-11-02 14:18:58'),(2,1,2,100,20,150,100,800,'A-02','2026-11-02 06:10:49'),(3,2,1,25,5,50,30,300,'B-01','2026-11-02 06:10:49'),(4,3,2,900,50,150,100,1000,'C-01','2026-11-02 06:10:49'),(5,4,3,100,10,75,50,500,'D-01','2026-11-02 06:10:49'),(6,5,1,10,1,40,20,200,'A-11','2026-11-02 06:10:49'),(7,6,3,48,4,60,30,300,'C-11','2026-11-02 06:10:49'),(8,7,5,141,14,60,30,300,'E-11','2026-11-02 06:10:49'),(9,8,2,460,46,80,40,400,'B-11','2026-11-02 06:10:49'),(10,9,4,175,17,70,35,350,'D-11','2026-11-02 06:10:49'),(11,10,1,72,7,90,45,450,'A-12','2026-11-02 06:10:49'),(12,11,3,129,12,60,30,300,'C-12','2026-11-02 06:10:49'),(13,12,5,156,15,70,35,350,'E-12','2026-11-02 06:10:49'),(14,13,2,10,1,40,20,200,'B-12','2026-11-02 06:10:49'),(15,14,4,270,27,120,60,600,'D-12','2026-11-02 14:19:54'),(16,15,1,12,1,50,25,250,'A-13','2026-11-02 06:10:49'),(17,16,3,40,4,50,25,250,'C-13','2026-11-02 06:10:49'),(18,17,5,191,19,90,45,450,'E-13','2026-11-02 06:10:49'),(19,18,2,410,41,70,35,350,'B-13','2026-11-02 06:10:49'),(20,19,4,105,10,40,20,200,'D-13','2026-11-02 06:10:49'),(21,20,1,28,2,35,17,175,'A-14','2026-11-02 06:10:49'),(22,21,3,99,9,30,15,150,'C-14','2026-11-02 06:10:49'),(23,22,5,166,16,80,40,400,'E-14','2026-11-02 06:10:49'),(24,23,2,15,1,60,30,300,'B-14','2026-11-02 06:10:49'),(25,24,4,110,11,45,22,225,'D-14','2026-11-02 06:10:49'),(26,25,1,13,1,55,27,275,'A-15','2026-11-02 06:10:49'),(27,6,5,48,4,60,30,300,'E-15','2026-11-02 06:10:49'),(28,8,1,161,16,80,40,400,'A-16','2026-11-02 06:10:49'),(29,10,2,510,51,90,45,450,'B-15','2026-11-02 06:10:49'),(30,12,3,155,15,70,35,350,'C-15','2026-11-02 06:10:49'),(31,16,5,40,4,50,25,250,'E-16','2026-11-02 06:10:49'),(32,18,1,169,16,70,35,350,'A-17','2026-11-02 06:10:49'),(33,20,2,106,10,35,17,175,'B-16','2026-11-02 06:10:49'),(50,31,4,50,30,80,10,50,'any','2026-11-02 13:40:16'),(58,5,4,50,10,10,1,50,'any','2026-11-02 13:49:13'),(64,52,4,50,50,80,1,50,'h1','2026-11-02 14:27:50'),(65,25,4,50,50,10,1,50,'hi','2026-11-02 14:31:54');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `auto_stockout_risk` AFTER UPDATE ON `inventory` FOR EACH ROW BEGIN
    DECLARE v_score DECIMAL(5,2);

    IF (NEW.quantity_on_hand - NEW.reserved_quantity) <= NEW.min_stock_level
       AND NOT EXISTS (SELECT 1 FROM inventory_risk
                       WHERE inventory_id = NEW.inventory_id
                         AND risk_type = 'Stockout'
                         AND status = 'Open') THEN

        IF (NEW.quantity_on_hand - NEW.reserved_quantity) <= 0 THEN
            SET v_score = 100;
        ELSE
            SET v_score = 85;
        END IF;

        INSERT INTO inventory_risk
        (inventory_id, detected_date, risk_type, risk_level, risk_score, status, recommended_action, threshold_value)
        VALUES
        (NEW.inventory_id, CURDATE(), 'Stockout',
         IF(v_score >= 90, 'Critical', 'High'), v_score, 'Open',
         'Raise purchase order with preferred supplier', NEW.min_stock_level);
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `inventory_risk`
--

DROP TABLE IF EXISTS `inventory_risk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_risk` (
  `risk_id` int NOT NULL AUTO_INCREMENT,
  `inventory_id` int NOT NULL,
  `detected_date` date DEFAULT (curdate()),
  `risk_type` varchar(50) NOT NULL,
  `risk_level` varchar(20) NOT NULL,
  `risk_score` decimal(5,2) DEFAULT NULL,
  `status` varchar(30) NOT NULL,
  `recommended_action` text,
  `threshold_value` int DEFAULT NULL,
  PRIMARY KEY (`risk_id`),
  KEY `fk_inventory_risk_inventory` (`inventory_id`),
  KEY `idx_risk_status_level` (`status`,`risk_level`),
  CONSTRAINT `fk_inventory_risk_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`inventory_id`),
  CONSTRAINT `chk_risk_level` CHECK ((`risk_level` in (_utf8mb4'Low',_utf8mb4'Medium',_utf8mb4'High',_utf8mb4'Critical'))),
  CONSTRAINT `chk_risk_score` CHECK (((`risk_score` is null) or (`risk_score` between 0 and 100))),
  CONSTRAINT `chk_risk_status` CHECK ((`status` in (_utf8mb4'Open',_utf8mb4'Under Review',_utf8mb4'Resolved')))
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_risk`
--

LOCK TABLES `inventory_risk` WRITE;
/*!40000 ALTER TABLE `inventory_risk` DISABLE KEYS */;
INSERT INTO `inventory_risk` VALUES (1,1,'2026-09-03','Stockout','Medium',55.00,'Open','Raise purchase order with preferred supplier',100),(2,3,'2026-09-04','Stockout','High',85.00,'Under Review','Raise purchase order with preferred supplier',30),(3,6,'2026-09-05','Stockout','High',85.00,'Resolved','Raise purchase order with preferred supplier',20),(4,7,'2026-09-06','Stockout','Medium',55.00,'Open','Raise purchase order with preferred supplier',60),(5,9,'2026-09-07','Overstock','Medium',45.00,'Open','Pause purchasing and transfer surplus to other warehouse',400),(6,11,'2026-09-08','Stockout','Medium',55.00,'Under Review','Raise purchase order with preferred supplier',90),(7,14,'2026-09-09','Stockout','High',85.00,'Resolved','Raise purchase order with preferred supplier',20),(8,16,'2026-09-10','Stockout','High',85.00,'Open','Raise purchase order with preferred supplier',25),(9,17,'2026-09-11','Stockout','Medium',55.00,'Open','Raise purchase order with preferred supplier',50),(10,19,'2026-09-12','Overstock','Medium',45.00,'Under Review','Pause purchasing and transfer surplus to other warehouse',350),(11,21,'2026-09-13','Stockout','Medium',55.00,'Resolved','Raise purchase order with preferred supplier',35),(12,24,'2026-09-14','Stockout','High',85.00,'Open','Raise purchase order with preferred supplier',30),(13,26,'2026-09-15','Stockout','High',85.00,'Open','Raise purchase order with preferred supplier',27),(14,27,'2026-09-16','Stockout','Medium',55.00,'Under Review','Raise purchase order with preferred supplier',60),(15,29,'2026-09-17','Overstock','Medium',45.00,'Resolved','Pause purchasing and transfer surplus to other warehouse',450),(16,31,'2026-09-18','Stockout','Medium',55.00,'Open','Raise purchase order with preferred supplier',50),(17,2,'2026-09-19','Supplier Delay','Medium',60.00,'Open','Follow up with supplier on delayed purchase order',0),(18,6,'2026-09-20','Supplier Delay','Medium',60.00,'Open','Follow up with supplier on delayed purchase order',0),(19,2,'2026-11-02','Stockout','High',85.00,'Open','Raise purchase order with preferred supplier',100),(35,64,'2026-11-02','Stockout','Critical',100.00,'Open','Raise purchase order with preferred supplier',1);
/*!40000 ALTER TABLE `inventory_risk` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_item`
--

DROP TABLE IF EXISTS `po_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_item` (
  `po_item_id` int NOT NULL AUTO_INCREMENT,
  `po_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `line_total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`po_item_id`),
  KEY `fk_po_item_po` (`po_id`),
  KEY `fk_po_item_product` (`product_id`),
  CONSTRAINT `fk_po_item_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_order` (`po_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_po_item_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `chk_po_item_cost` CHECK ((`unit_cost` >= 0)),
  CONSTRAINT `chk_po_item_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_po_item_tax` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `chk_po_item_total` CHECK ((`line_total` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_item`
--

LOCK TABLES `po_item` WRITE;
/*!40000 ALTER TABLE `po_item` DISABLE KEYS */;
INSERT INTO `po_item` VALUES (1,1,12,260,42.86,557.18,11700.78),(2,1,10,270,30.90,417.15,8760.15),(3,2,4,60,16.34,49.02,1029.42),(4,3,6,60,114.27,342.81,7199.01),(5,4,18,290,29.58,428.91,9007.11),(6,5,8,270,39.55,533.93,11212.43),(7,6,16,250,85.85,1073.12,22535.62),(8,7,24,90,116.66,524.97,11024.37),(9,8,4,170,13.69,116.36,2443.66),(10,9,22,70,73.43,257.01,5397.11),(11,9,25,170,127.42,1083.07,22744.47),(12,10,5,100,459.66,2298.30,48264.30),(13,10,7,130,204.13,1326.85,27863.75),(14,11,9,140,100.47,703.29,14769.09),(15,11,6,190,114.43,1087.09,22828.79),(16,12,22,210,67.90,712.95,14971.95),(17,13,12,210,42.86,450.03,9450.63),(18,13,1,300,45.28,679.20,14263.20),(19,14,10,110,27.12,149.16,3132.36),(20,14,4,120,16.34,98.04,2058.84),(21,15,5,190,476.95,4531.03,95151.53),(22,16,18,50,29.58,73.95,1552.95),(23,16,16,160,76.20,609.60,12801.60),(24,17,7,220,214.27,2356.97,49496.37),(25,18,19,240,120.62,1447.44,30396.24),(26,19,24,280,116.66,1633.24,34298.04),(27,19,25,110,118.50,651.75,13686.75),(28,20,14,220,23.77,261.47,5490.87),(29,20,15,90,87.65,394.43,8282.93),(30,21,14,80,23.79,95.16,1998.36),(31,22,5,260,459.66,5975.58,125487.18),(32,22,1,60,48.36,145.08,3046.68),(33,23,6,250,114.43,1430.38,30037.88),(34,23,8,80,36.43,145.72,3060.12),(35,24,22,70,67.90,237.65,4990.65),(36,24,24,140,116.04,812.28,17057.88),(37,25,10,130,30.90,200.85,4217.85),(38,25,11,70,76.36,267.26,5612.46);
/*!40000 ALTER TABLE `po_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `uom_id` int NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `reorder_level` int NOT NULL DEFAULT '0',
  `created_date` date DEFAULT (curdate()),
  `discontinued_flag` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `fk_product_uom` (`uom_id`),
  KEY `idx_product_category` (`category_id`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  CONSTRAINT `fk_product_uom` FOREIGN KEY (`uom_id`) REFERENCES `uom` (`uom_id`),
  CONSTRAINT `chk_product_price` CHECK ((`unit_price` >= 0)),
  CONSTRAINT `chk_product_reorder` CHECK ((`reorder_level` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES (1,4,3,'Milk 1L','AMUL-MILK-1L','Amul','890100000001',65.00,100,'2026-07-05',0),(2,5,4,'Masala Chips','LAYS-MASALA-100','Lay\'s','890100000002',40.00,50,'2026-07-06',0),(3,6,3,'Cola 500ml','COKE-500ML','Coca Cola','890100000003',45.00,80,'2026-07-07',0),(4,5,4,'Instant Noodles','MAGGI-2MIN-70','Maggi','890100000004',20.00,75,'2026-07-08',0),(5,7,2,'Basmati Rice 5kg','INDGATE-BASMATI-5KG','India Gate','890100000005',620.00,40,'2026-07-09',0),(6,7,2,'Toor Dal 1kg','TATA-TOORDAL-1KG','Tata Sampann','890100000006',165.00,60,'2026-07-10',0),(7,7,2,'Wheat Atta 5kg','AASHIRVAAD-ATTA-5KG','Aashirvaad','890100000007',285.00,60,'2026-07-11',0),(8,7,2,'Sugar 1kg','MADHUR-SUGAR-1KG','Madhur','890100000008',52.00,80,'2026-07-12',0),(9,7,3,'Sunflower Oil 1L','FORTUNE-SUNOIL-1L','Fortune','890100000009',145.00,70,'2026-07-13',0),(10,4,4,'Curd 400g','NANDINI-CURD-400','Nandini','890100000010',38.00,90,'2026-07-14',0),(11,4,4,'Paneer 200g','AMUL-PANEER-200','Amul','890100000011',95.00,60,'2026-07-15',0),(12,4,4,'Butter 100g','AMUL-BUTTER-100','Amul','890100000012',58.00,70,'2026-07-16',0),(13,4,4,'Cheese Slices 200g','BRIT-CHEESE-200','Britannia','890100000013',140.00,40,'2026-07-17',0),(14,5,4,'Cream Biscuits 150g','BRIT-CREAMBISC-150','Britannia','890100000014',30.00,120,'2026-07-18',0),(15,5,1,'Dark Chocolate 80g','CADBURY-DARK-80','Cadbury','890100000015',120.00,50,'2026-07-19',0),(16,9,3,'Orange Juice 1L','REAL-ORANGE-1L','Real','890100000016',110.00,50,'2026-07-20',0),(17,9,3,'Mango Drink 600ml','FROOTI-MANGO-600','Frooti','890100000017',40.00,90,'2026-07-21',0),(18,6,3,'Lemon Soda 750ml','SPRITE-LEMON-750','Sprite','890100000018',40.00,70,'2026-07-22',0),(19,2,4,'Green Tea 25 Bags','TETLEY-GREENTEA-25','Tetley','890100000019',150.00,40,'2026-07-23',0),(20,10,1,'Anti-Dandruff Shampoo 340ml','HNS-SHAMPOO-340','Head & Shoulders','890100000020',320.00,35,'2026-07-24',0),(21,10,1,'Conditioner 180ml','DOVE-COND-180','Dove','890100000021',210.00,30,'2026-07-25',1),(22,11,1,'Toothpaste 150g','COLGATE-PASTE-150','Colgate','890100000022',95.00,80,'2026-07-26',0),(23,11,1,'Toothbrush Medium','ORALB-BRUSH-MED','Oral-B','890100000023',45.00,60,'2026-07-27',0),(24,12,1,'Face Wash 100g','HIMALAYA-FACEWASH-100','Himalaya','890100000024',150.00,45,'2026-07-28',0),(25,12,4,'Bathing Soap 4-Pack','DETTOL-SOAP-4PK','Dettol','890100000025',160.00,55,'2026-07-29',0),(31,4,3,'milk_item','50','brand','123456789',50.00,80,'2026-11-02',0),(52,4,3,'milk','1234','little','123456',20.00,40,'2026-11-02',0);
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order`
--

DROP TABLE IF EXISTS `purchase_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order` (
  `po_id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `po_date` date DEFAULT (curdate()),
  `expected_date` date DEFAULT NULL,
  `status` varchar(30) NOT NULL,
  `total_amount` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`po_id`),
  KEY `idx_purchase_supplier_date` (`supplier_id`,`po_date`),
  CONSTRAINT `fk_purchase_order_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`),
  CONSTRAINT `chk_po_status` CHECK ((`status` in (_utf8mb4'Draft',_utf8mb4'Ordered',_utf8mb4'Received',_utf8mb4'Cancelled'))),
  CONSTRAINT `chk_purchase_dates` CHECK (((`expected_date` is null) or (`expected_date` >= `po_date`))),
  CONSTRAINT `chk_purchase_total` CHECK ((`total_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order`
--

LOCK TABLES `purchase_order` WRITE;
/*!40000 ALTER TABLE `purchase_order` DISABLE KEYS */;
INSERT INTO `purchase_order` VALUES (1,1,'2026-08-05','2026-08-15','Received',20460.93),(2,2,'2026-08-07','2026-08-14','Received',1029.42),(3,3,'2026-08-09','2026-08-19','Received',7199.01),(4,4,'2026-08-11','2026-08-20','Received',9007.11),(5,5,'2026-08-13','2026-08-17','Received',11212.43),(6,6,'2026-08-15','2026-08-23','Received',22535.62),(7,7,'2026-08-17','2026-08-25','Received',11024.37),(8,8,'2026-08-19','2026-08-28','Received',2443.66),(9,9,'2026-08-21','2026-08-28','Received',28141.58),(10,10,'2026-08-23','2026-09-02','Received',76128.05),(11,11,'2026-08-25','2026-09-03','Received',37597.88),(12,12,'2026-08-27','2026-08-30','Received',14971.95),(13,1,'2026-08-29','2026-09-08','Received',23713.83),(14,2,'2026-08-31','2026-09-07','Ordered',5191.20),(15,3,'2026-09-02','2026-09-09','Ordered',95151.53),(16,4,'2026-09-04','2026-09-14','Ordered',14354.55),(17,5,'2026-09-06','2026-09-09','Ordered',49496.37),(18,6,'2026-09-08','2026-09-11','Ordered',30396.24),(19,7,'2026-09-10','2026-09-18','Ordered',47984.79),(20,8,'2026-09-12','2026-09-21','Draft',13773.80),(21,9,'2026-09-14','2026-09-24','Draft',1998.36),(22,10,'2026-09-16','2026-09-26','Draft',128533.86),(23,11,'2026-09-18','2026-09-26','Cancelled',33098.00),(24,12,'2026-09-20','2026-09-27','Cancelled',22048.53),(25,1,'2026-09-22','2026-10-02','Cancelled',9830.31);
/*!40000 ALTER TABLE `purchase_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order`
--

DROP TABLE IF EXISTS `sales_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order` (
  `so_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `order_date` date DEFAULT (curdate()),
  `required_date` date DEFAULT NULL,
  `status` varchar(30) NOT NULL,
  `total_amount` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`so_id`),
  KEY `fk_sales_order_warehouse` (`warehouse_id`),
  KEY `idx_sales_customer_date` (`customer_id`,`order_date`),
  CONSTRAINT `fk_sales_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `fk_sales_order_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse` (`warehouse_id`),
  CONSTRAINT `chk_sales_dates` CHECK (((`required_date` is null) or (`required_date` >= `order_date`))),
  CONSTRAINT `chk_sales_total` CHECK ((`total_amount` >= 0)),
  CONSTRAINT `chk_so_status` CHECK ((`status` in (_utf8mb4'Pending',_utf8mb4'Confirmed',_utf8mb4'Shipped',_utf8mb4'Delivered',_utf8mb4'Cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order`
--

LOCK TABLES `sales_order` WRITE;
/*!40000 ALTER TABLE `sales_order` DISABLE KEYS */;
INSERT INTO `sales_order` VALUES (1,8,4,'2026-08-07','2026-08-10','Delivered',189.00),(2,15,2,'2026-08-09','2026-08-12','Delivered',341.25),(3,22,5,'2026-08-12','2026-08-15','Delivered',987.53),(4,4,3,'2026-08-14','2026-08-21','Delivered',2268.00),(5,11,1,'2026-08-17','2026-08-24','Delivered',1008.00),(6,18,4,'2026-08-19','2026-08-26','Delivered',1047.38),(7,25,2,'2026-08-21','2026-08-24','Delivered',1092.00),(8,7,5,'2026-08-24','2026-08-27','Delivered',3843.00),(9,14,3,'2026-08-26','2026-08-31','Delivered',663.34),(10,21,1,'2026-08-29','2026-09-03','Delivered',252.00),(11,3,4,'2026-08-31','2026-09-04','Delivered',456.75),(12,10,2,'2026-09-02','2026-09-09','Delivered',44.89),(13,17,5,'2026-09-05','2026-09-09','Shipped',467.25),(14,24,3,'2026-09-07','2026-09-14','Shipped',698.25),(15,6,1,'2026-09-10','2026-09-16','Shipped',1055.36),(16,13,4,'2026-09-12','2026-09-16','Shipped',1674.75),(17,20,2,'2026-09-14','2026-09-21','Confirmed',285.60),(18,2,5,'2026-09-17','2026-09-20','Confirmed',359.10),(19,9,3,'2026-09-19','2026-09-25','Confirmed',969.15),(20,16,1,'2026-09-22','2026-09-29','Confirmed',5859.00),(21,23,4,'2026-09-24','2026-09-27','Pending',3142.12),(22,5,2,'2026-09-26','2026-10-01','Pending',750.75),(23,12,5,'2026-09-29','2026-10-03','Pending',3839.85),(24,19,3,'2026-10-01','2026-10-05','Cancelled',1084.28),(25,1,1,'2026-10-04','2026-10-09','Cancelled',2927.40),(26,1,1,'2026-10-04','2026-10-08','Pending',0.00),(55,1,1,'2026-11-02',NULL,'Pending',65.00),(57,2,4,'2026-11-02',NULL,'Pending',600.00);
/*!40000 ALTER TABLE `sales_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `so_item`
--

DROP TABLE IF EXISTS `so_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `so_item` (
  `so_item_id` int NOT NULL AUTO_INCREMENT,
  `so_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `line_total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`so_item_id`),
  KEY `fk_so_item_sales_order` (`so_id`),
  KEY `fk_so_item_product` (`product_id`),
  CONSTRAINT `fk_so_item_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `fk_so_item_sales_order` FOREIGN KEY (`so_id`) REFERENCES `sales_order` (`so_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_so_item_discount` CHECK ((`discount` >= 0)),
  CONSTRAINT `chk_so_item_price` CHECK ((`unit_price` >= 0)),
  CONSTRAINT `chk_so_item_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_so_item_tax` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `chk_so_item_total` CHECK ((`line_total` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `so_item`
--

LOCK TABLES `so_item` WRITE;
/*!40000 ALTER TABLE `so_item` DISABLE KEYS */;
INSERT INTO `so_item` VALUES (1,1,19,1,150.00,0.00,7.50,157.50),(2,1,14,1,30.00,0.00,1.50,31.50),(3,2,1,5,65.00,0.00,16.25,341.25),(4,3,16,9,110.00,49.50,47.03,987.53),(5,4,11,10,95.00,0.00,47.50,997.50),(6,4,16,11,110.00,0.00,60.50,1270.50),(7,5,25,6,160.00,0.00,48.00,1008.00),(8,6,24,7,150.00,52.50,49.88,1047.38),(9,7,18,5,40.00,0.00,10.00,210.00),(10,7,13,6,140.00,0.00,42.00,882.00),(11,8,7,12,285.00,0.00,171.00,3591.00),(12,8,17,6,40.00,0.00,12.00,252.00),(13,9,11,7,95.00,33.25,31.59,663.34),(14,10,18,6,40.00,0.00,12.00,252.00),(15,11,9,3,145.00,0.00,21.75,456.75),(16,12,3,1,45.00,2.25,2.14,44.89),(17,13,6,1,165.00,0.00,8.25,173.25),(18,13,17,7,40.00,0.00,14.00,294.00),(19,14,11,7,95.00,0.00,33.25,698.25),(20,15,10,11,38.00,20.90,19.86,416.96),(21,15,25,4,160.00,32.00,30.40,638.40),(22,16,9,11,145.00,0.00,79.75,1674.75),(23,17,18,3,40.00,0.00,6.00,126.00),(24,17,10,4,38.00,0.00,7.60,159.60),(25,18,17,9,40.00,18.00,17.10,359.10),(26,19,11,3,95.00,0.00,14.25,299.25),(27,19,12,11,58.00,0.00,31.90,669.90),(28,20,5,9,620.00,0.00,279.00,5859.00),(29,21,19,9,150.00,67.50,64.12,1346.62),(30,21,24,12,150.00,90.00,85.50,1795.50),(31,22,1,11,65.00,0.00,35.75,750.75),(32,23,7,11,285.00,0.00,156.75,3291.75),(33,23,12,9,58.00,0.00,26.10,548.10),(34,24,12,4,58.00,11.60,11.02,231.42),(35,24,11,9,95.00,42.75,40.61,852.86),(36,25,10,6,38.00,0.00,11.40,239.40),(37,25,20,8,320.00,0.00,128.00,2688.00),(38,26,1,5,65.00,0.00,16.25,341.25),(56,55,1,1,65.00,0.00,0.00,65.00),(58,57,52,30,20.00,0.00,0.00,600.00);
/*!40000 ALTER TABLE `so_item` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `check_stock_before_order` BEFORE INSERT ON `so_item` FOR EACH ROW BEGIN
    DECLARE v_warehouse INT;
    DECLARE v_available INT;

    SELECT warehouse_id INTO v_warehouse
    FROM sales_order
    WHERE so_id = NEW.so_id;

    SELECT COALESCE(SUM(quantity_on_hand - reserved_quantity), 0) INTO v_available
    FROM inventory
    WHERE product_id = NEW.product_id
      AND warehouse_id = v_warehouse;

    IF NEW.quantity > v_available THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock available in warehouse';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `stock_movement`
--

DROP TABLE IF EXISTS `stock_movement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movement` (
  `movement_id` int NOT NULL AUTO_INCREMENT,
  `inventory_id` int NOT NULL,
  `reason_id` int DEFAULT NULL,
  `movement_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `movement_type` varchar(30) NOT NULL,
  `quantity` int NOT NULL,
  `affects_inventory_flag` tinyint(1) DEFAULT '1',
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`movement_id`),
  KEY `fk_stock_movement_inventory` (`inventory_id`),
  KEY `fk_stock_movement_reason` (`reason_id`),
  CONSTRAINT `fk_stock_movement_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`inventory_id`),
  CONSTRAINT `fk_stock_movement_reason` FOREIGN KEY (`reason_id`) REFERENCES `adjustment_reason` (`reason_id`),
  CONSTRAINT `chk_movement_type` CHECK ((`movement_type` in (_utf8mb4'IN',_utf8mb4'OUT',_utf8mb4'TRANSFER_IN',_utf8mb4'TRANSFER_OUT',_utf8mb4'ADJUST_IN',_utf8mb4'ADJUST_OUT'))),
  CONSTRAINT `chk_stock_movement_quantity` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movement`
--

LOCK TABLES `stock_movement` WRITE;
/*!40000 ALTER TABLE `stock_movement` DISABLE KEYS */;
INSERT INTO `stock_movement` VALUES (1,4,7,'2026-08-12 05:30:00','PO',11,'IN',34,1,'wh_staff_1'),(2,7,8,'2026-08-14 06:30:00','SO',9,'OUT',56,1,'wh_staff_2'),(3,10,7,'2026-08-16 07:30:00','PO',8,'IN',55,1,'manager'),(4,13,8,'2026-08-18 08:30:00','SO',11,'OUT',42,1,'admin'),(5,16,9,'2026-08-20 09:30:00','TRANSFER',5,'TRANSFER_IN',17,1,'wh_staff_1'),(6,19,9,'2026-08-22 10:30:00','TRANSFER',3,'TRANSFER_OUT',45,1,'wh_staff_2'),(7,22,2,'2026-08-24 04:30:00','ADJUSTMENT',NULL,'ADJUST_OUT',14,1,'manager'),(8,25,5,'2026-08-26 05:30:00','ADJUSTMENT',NULL,'ADJUST_IN',5,1,'admin'),(9,28,8,'2026-08-28 06:30:00','SO',6,'OUT',57,1,'wh_staff_1'),(10,31,7,'2026-08-30 07:30:00','PO',9,'IN',49,1,'wh_staff_2'),(11,1,7,'2026-09-01 08:30:00','PO',7,'IN',55,1,'manager'),(12,4,8,'2026-09-03 09:30:00','SO',1,'OUT',45,1,'admin'),(13,7,7,'2026-09-05 10:30:00','PO',3,'IN',10,1,'wh_staff_1'),(14,10,8,'2026-09-07 04:30:00','SO',5,'OUT',28,1,'wh_staff_2'),(15,13,9,'2026-09-09 05:30:00','TRANSFER',9,'TRANSFER_IN',51,1,'manager'),(16,16,9,'2026-09-11 06:30:00','TRANSFER',5,'TRANSFER_OUT',13,1,'admin'),(17,19,3,'2026-09-13 07:30:00','ADJUSTMENT',NULL,'ADJUST_OUT',52,1,'wh_staff_1'),(18,22,4,'2026-09-15 08:30:00','ADJUSTMENT',NULL,'ADJUST_IN',6,1,'wh_staff_2'),(19,25,8,'2026-09-17 09:30:00','SO',9,'OUT',18,1,'manager'),(20,28,7,'2026-09-19 10:30:00','PO',12,'IN',42,1,'admin'),(21,31,7,'2026-09-21 04:30:00','PO',5,'IN',41,1,'wh_staff_1'),(22,1,8,'2026-09-23 05:30:00','SO',1,'OUT',30,1,'wh_staff_2'),(23,4,7,'2026-09-25 06:30:00','PO',7,'IN',39,1,'manager'),(24,7,8,'2026-09-27 07:30:00','SO',9,'OUT',56,1,'admin'),(25,10,9,'2026-09-29 08:30:00','TRANSFER',11,'TRANSFER_IN',47,1,'wh_staff_1'),(26,13,9,'2026-10-01 09:30:00','TRANSFER',3,'TRANSFER_OUT',37,1,'wh_staff_2'),(27,16,1,'2026-10-03 10:30:00','ADJUSTMENT',NULL,'ADJUST_OUT',10,1,'manager'),(28,19,4,'2026-10-05 04:30:00','ADJUSTMENT',NULL,'ADJUST_IN',51,1,'admin'),(29,22,8,'2026-10-07 05:30:00','SO',7,'OUT',26,1,'wh_staff_1'),(30,25,7,'2026-10-09 06:30:00','PO',9,'IN',21,1,'wh_staff_2'),(31,1,7,'2026-11-02 06:06:33','PO',1,'IN',50,1,'admin');
/*!40000 ALTER TABLE `stock_movement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfer`
--

DROP TABLE IF EXISTS `stock_transfer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transfer` (
  `transfer_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `from_warehouse_id` int NOT NULL,
  `to_warehouse_id` int NOT NULL,
  `quantity` int NOT NULL,
  `transfer_date` date DEFAULT (curdate()),
  PRIMARY KEY (`transfer_id`),
  KEY `fk_stock_transfer_product` (`product_id`),
  KEY `fk_stock_transfer_from_warehouse` (`from_warehouse_id`),
  KEY `fk_stock_transfer_to_warehouse` (`to_warehouse_id`),
  CONSTRAINT `fk_stock_transfer_from_warehouse` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse` (`warehouse_id`),
  CONSTRAINT `fk_stock_transfer_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `fk_stock_transfer_to_warehouse` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse` (`warehouse_id`),
  CONSTRAINT `chk_stock_transfer_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_stock_transfer_warehouses` CHECK ((`from_warehouse_id` <> `to_warehouse_id`))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfer`
--

LOCK TABLES `stock_transfer` WRITE;
/*!40000 ALTER TABLE `stock_transfer` DISABLE KEYS */;
INSERT INTO `stock_transfer` VALUES (1,2,1,2,29,'2026-08-19'),(2,4,3,4,12,'2026-08-23'),(3,6,3,4,57,'2026-08-27'),(4,8,2,3,47,'2026-08-31'),(5,10,1,2,52,'2026-09-04'),(6,12,5,1,60,'2026-09-08'),(7,14,4,5,22,'2026-09-12'),(8,16,3,4,20,'2026-09-16'),(9,18,2,3,28,'2026-09-20'),(10,20,1,2,28,'2026-09-24'),(11,22,5,1,44,'2026-09-28'),(12,24,4,5,28,'2026-10-02'),(13,6,5,1,32,'2026-10-06'),(14,10,2,3,18,'2026-10-10'),(15,16,5,1,34,'2026-10-14');
/*!40000 ALTER TABLE `stock_transfer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier` (
  `supplier_id` int NOT NULL AUTO_INCREMENT,
  `supplier_name` varchar(150) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `address` text,
  `rating` decimal(3,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`supplier_id`),
  CONSTRAINT `chk_supplier_rating` CHECK (((`rating` is null) or (`rating` between 0 and 5)))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier`
--

LOCK TABLES `supplier` WRITE;
/*!40000 ALTER TABLE `supplier` DISABLE KEYS */;
INSERT INTO `supplier` VALUES (1,'Sri Lakshmi Dairy Traders','Ramesh Gowda','sales@srilakshmidairytra.example.com','9900100237','13, Peenya Industrial Area, Bangalore',4.60,1),(2,'Bharat FMCG Distributors','Anita Rao','sales@bharatfmcgdistribu.example.com','9900100374','16, Jayanagar Industrial Area, Bangalore',4.40,1),(3,'Namma Foods Wholesale','Suresh Kumar','sales@nammafoodswholesal.example.com','9900100511','19, Rajajinagar Industrial Area, Bangalore',4.10,1),(4,'Metro Beverages Pvt Ltd','Farhan Sheikh','sales@metrobeveragespvtl.example.com','9900100648','22, Yeshwanthpur Industrial Area, Bangalore',4.70,1),(5,'Southern Staples Supply Co','Lakshmi Iyer','sales@southernstaplessup.example.com','9900100785','25, Bommanahalli Industrial Area, Bangalore',4.30,1),(6,'GreenLeaf Trading','Vivek Menon','sales@greenleaftrading.example.com','9900100922','28, Hebbal Industrial Area, Bangalore',3.90,1),(7,'Urban Care Products','Neha Kapoor','sales@urbancareproducts.example.com','9900101059','31, BTM Layout Industrial Area, Bangalore',4.50,1),(8,'Karnataka Snacks Hub','Prakash Shetty','sales@karnatakasnackshub.example.com','9900101196','34, Marathahalli Industrial Area, Bangalore',4.00,1),(9,'Prime Retail Supplies','Deepa Nair','sales@primeretailsupplie.example.com','9900101333','37, Malleshwaram Industrial Area, Bangalore',3.60,1),(10,'Silicon City Wholesalers','Arvind Reddy','sales@siliconcitywholesa.example.com','9900101470','40, Whitefield Industrial Area, Bangalore',4.80,1),(11,'Coastal Agro Foods','Joseph DSouza','sales@coastalagrofoods.example.com','9900101607','43, Banashankari Industrial Area, Bangalore',3.80,0),(12,'Sunrise Personal Care Distributors','Meena Pillai','sales@sunrisepersonalcar.example.com','9900101744','46, Indiranagar Industrial Area, Bangalore',4.20,1);
/*!40000 ALTER TABLE `supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_product`
--

DROP TABLE IF EXISTS `supplier_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_product` (
  `supplier_product_id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `product_id` int NOT NULL,
  `supplier_product_code` varchar(100) DEFAULT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `lead_time_days` int NOT NULL,
  `is_preferred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`supplier_product_id`),
  UNIQUE KEY `uq_supplier_product` (`supplier_id`,`product_id`),
  KEY `fk_supplier_product_product` (`product_id`),
  CONSTRAINT `fk_supplier_product_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  CONSTRAINT `fk_supplier_product_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`),
  CONSTRAINT `chk_supplier_product_cost` CHECK ((`unit_cost` >= 0)),
  CONSTRAINT `chk_supplier_product_lead_time` CHECK ((`lead_time_days` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_product`
--

LOCK TABLES `supplier_product` WRITE;
/*!40000 ALTER TABLE `supplier_product` DISABLE KEYS */;
INSERT INTO `supplier_product` VALUES (1,1,1,'SP-01-001',45.28,10,1),(2,1,10,'SP-01-010',30.90,3,1),(3,1,11,'SP-01-011',76.36,10,1),(4,1,12,'SP-01-012',42.86,10,1),(5,1,13,'SP-01-013',111.71,9,1),(6,2,1,'SP-02-001',51.03,9,0),(7,2,10,'SP-02-010',27.12,3,0),(8,2,11,'SP-02-011',66.07,3,0),(9,2,12,'SP-02-012',43.09,9,0),(10,2,13,'SP-02-013',108.52,5,0),(11,2,2,'SP-02-002',29.42,7,1),(12,2,4,'SP-02-004',16.34,7,1),(13,2,7,'SP-02-007',225.92,10,1),(14,3,5,'SP-03-005',476.95,7,1),(15,3,6,'SP-03-006',114.27,10,1),(16,3,7,'SP-03-007',205.46,9,0),(17,3,19,'SP-03-019',104.96,6,1),(18,3,3,'SP-03-003',30.76,7,1),(19,4,3,'SP-04-003',32.89,8,0),(20,4,16,'SP-04-016',76.20,10,1),(21,4,17,'SP-04-017',29.99,3,1),(22,4,18,'SP-04-018',29.58,9,1),(23,4,19,'SP-04-019',110.36,10,0),(24,5,5,'SP-05-005',444.05,8,0),(25,5,6,'SP-05-006',125.23,9,0),(26,5,7,'SP-05-007',214.27,2,0),(27,5,8,'SP-05-008',39.55,4,1),(28,5,9,'SP-05-009',115.21,10,1),(29,6,19,'SP-06-019',120.62,3,0),(30,6,16,'SP-06-016',85.85,8,0),(31,6,17,'SP-06-017',29.83,9,0),(32,6,6,'SP-06-006',132.63,3,0),(33,6,8,'SP-06-008',39.92,9,0),(34,7,20,'SP-07-020',247.81,10,1),(35,7,21,'SP-07-021',150.18,8,1),(36,7,22,'SP-07-022',73.51,6,1),(37,7,23,'SP-07-023',34.05,10,1),(38,7,24,'SP-07-024',116.66,8,1),(39,7,25,'SP-07-025',118.50,6,1),(40,8,2,'SP-08-002',31.86,2,0),(41,8,4,'SP-08-004',13.69,9,0),(42,8,14,'SP-08-014',23.77,9,1),(43,8,15,'SP-08-015',87.65,5,1),(44,9,3,'SP-09-003',32.24,9,0),(45,9,4,'SP-09-004',14.91,9,0),(46,9,14,'SP-09-014',23.79,10,0),(47,9,22,'SP-09-022',73.43,2,0),(48,9,25,'SP-09-025',127.42,7,0),(49,10,1,'SP-10-001',48.36,3,0),(50,10,5,'SP-10-005',459.66,10,0),(51,10,7,'SP-10-007',204.13,4,0),(52,10,16,'SP-10-016',89.70,9,0),(53,10,24,'SP-10-024',121.74,6,0),(54,11,5,'SP-11-005',500.00,7,0),(55,11,6,'SP-11-006',114.43,8,0),(56,11,8,'SP-11-008',36.43,2,0),(57,11,9,'SP-11-009',100.47,9,0),(58,12,20,'SP-12-020',243.61,3,0),(59,12,21,'SP-12-021',160.74,5,0),(60,12,22,'SP-12-022',67.90,2,0),(61,12,23,'SP-12-023',35.34,6,0),(62,12,24,'SP-12-024',116.04,7,0),(63,12,25,'SP-12-025',112.27,7,0);
/*!40000 ALTER TABLE `supplier_product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `uom`
--

DROP TABLE IF EXISTS `uom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uom` (
  `uom_id` int NOT NULL AUTO_INCREMENT,
  `base_uom_id` int DEFAULT NULL,
  `uom_name` varchar(50) NOT NULL,
  `uom_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`uom_id`),
  KEY `fk_uom_base` (`base_uom_id`),
  CONSTRAINT `fk_uom_base` FOREIGN KEY (`base_uom_id`) REFERENCES `uom` (`uom_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `uom`
--

LOCK TABLES `uom` WRITE;
/*!40000 ALTER TABLE `uom` DISABLE KEYS */;
INSERT INTO `uom` VALUES (1,NULL,'Piece','Count'),(2,NULL,'Kilogram','Weight'),(3,NULL,'Liter','Volume'),(4,NULL,'Pack','Count'),(5,2,'Gram','Weight'),(6,3,'Milliliter','Volume');
/*!40000 ALTER TABLE `uom` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_inventory_status`
--

DROP TABLE IF EXISTS `vw_inventory_status`;
/*!50001 DROP VIEW IF EXISTS `vw_inventory_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_inventory_status` AS SELECT 
 1 AS `inventory_id`,
 1 AS `product_name`,
 1 AS `warehouse_name`,
 1 AS `quantity_on_hand`,
 1 AS `reserved_quantity`,
 1 AS `available_quantity`,
 1 AS `reorder_level`,
 1 AS `stock_status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_sales_order_summary`
--

DROP TABLE IF EXISTS `vw_sales_order_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_sales_order_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_sales_order_summary` AS SELECT 
 1 AS `so_id`,
 1 AS `customer_name`,
 1 AS `warehouse_name`,
 1 AS `order_date`,
 1 AS `status`,
 1 AS `total_items`,
 1 AS `total_amount`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `warehouse`
--

DROP TABLE IF EXISTS `warehouse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse` (
  `warehouse_id` int NOT NULL AUTO_INCREMENT,
  `warehouse_name` varchar(100) NOT NULL,
  `location` varchar(150) NOT NULL,
  `capacity` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`warehouse_id`),
  CONSTRAINT `chk_warehouse_capacity` CHECK ((`capacity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse`
--

LOCK TABLES `warehouse` WRITE;
/*!40000 ALTER TABLE `warehouse` DISABLE KEYS */;
INSERT INTO `warehouse` VALUES (1,'HSR Fulfillment Center','HSR Layout, Bangalore',10000,1),(2,'Koramangala Fulfillment Center','Koramangala, Bangalore',12000,1),(3,'Whitefield Fulfillment Center','Whitefield, Bangalore',15000,1),(4,'Electronic City Distribution Hub','Electronic City, Bangalore',18000,1),(5,'Yelahanka Storage Depot','Yelahanka, Bangalore',9000,1);
/*!40000 ALTER TABLE `warehouse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'supply_chain_db'
--

--
-- Dumping routines for database 'supply_chain_db'
--
/*!50003 DROP PROCEDURE IF EXISTS `GetLowStock` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetLowStock`(IN wid INT)
BEGIN
    SELECT
        i.inventory_id,
        p.product_name,
        i.quantity_on_hand,
        i.reserved_quantity,
        (i.quantity_on_hand - i.reserved_quantity) AS available_quantity,
        i.reorder_level
    FROM inventory i
    JOIN product p ON i.product_id = p.product_id
    WHERE i.warehouse_id = wid
      AND (i.quantity_on_hand - i.reserved_quantity) <= i.reorder_level;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `GetSupplierProducts` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetSupplierProducts`(IN sid INT)
BEGIN
    SELECT
        s.supplier_name,
        p.product_name,
        sp.unit_cost,
        sp.lead_time_days,
        sp.is_preferred
    FROM supplier_product sp
    JOIN supplier s ON sp.supplier_id = s.supplier_id
    JOIN product p  ON sp.product_id = p.product_id
    WHERE sp.supplier_id = sid;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Current Database: `supply_chain_db`
--

USE `supply_chain_db`;

--
-- Final view structure for view `vw_inventory_status`
--

/*!50001 DROP VIEW IF EXISTS `vw_inventory_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_inventory_status` AS select `i`.`inventory_id` AS `inventory_id`,`p`.`product_name` AS `product_name`,`w`.`warehouse_name` AS `warehouse_name`,`i`.`quantity_on_hand` AS `quantity_on_hand`,`i`.`reserved_quantity` AS `reserved_quantity`,(`i`.`quantity_on_hand` - `i`.`reserved_quantity`) AS `available_quantity`,`i`.`reorder_level` AS `reorder_level`,(case when ((`i`.`quantity_on_hand` - `i`.`reserved_quantity`) <= `i`.`min_stock_level`) then 'Critical' when ((`i`.`quantity_on_hand` - `i`.`reserved_quantity`) <= `i`.`reorder_level`) then 'Low' when (`i`.`quantity_on_hand` > `i`.`max_stock_level`) then 'Overstock' else 'Healthy' end) AS `stock_status` from ((`inventory` `i` join `product` `p` on((`i`.`product_id` = `p`.`product_id`))) join `warehouse` `w` on((`i`.`warehouse_id` = `w`.`warehouse_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_sales_order_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_sales_order_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_sales_order_summary` AS select `s`.`so_id` AS `so_id`,`c`.`customer_name` AS `customer_name`,`w`.`warehouse_name` AS `warehouse_name`,`s`.`order_date` AS `order_date`,`s`.`status` AS `status`,count(`si`.`so_item_id`) AS `total_items`,`s`.`total_amount` AS `total_amount` from (((`sales_order` `s` join `customer` `c` on((`s`.`customer_id` = `c`.`customer_id`))) join `warehouse` `w` on((`s`.`warehouse_id` = `w`.`warehouse_id`))) join `so_item` `si` on((`s`.`so_id` = `si`.`so_id`))) group by `s`.`so_id`,`c`.`customer_name`,`w`.`warehouse_name`,`s`.`order_date`,`s`.`status`,`s`.`total_amount` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-06  7:47:14
