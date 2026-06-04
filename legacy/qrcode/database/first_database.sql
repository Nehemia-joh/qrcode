/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: school_bus_tracking
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-1+b1 from Debian

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `attendance_records`
--

DROP TABLE IF EXISTS `attendance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `qr_code` varchar(100) NOT NULL,
  `bus_number` varchar(50) NOT NULL,
  `route_number` varchar(50) NOT NULL,
  `attendance_type` enum('morning_pickup','morning_drop','evening_pickup','evening_drop') NOT NULL,
  `attendance_time` datetime NOT NULL,
  `attendance_date` date NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `device_id` varchar(100) DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `recorded_by` varchar(100) DEFAULT NULL,
  `status` enum('present','absent','late','early') DEFAULT 'present',
  `notes` text DEFAULT NULL,
  `sync_status` enum('pending','synced') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `idx_student_date` (`student_id`,`attendance_date`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_sync_status` (`sync_status`),
  KEY `idx_bus_route` (`bus_number`,`route_number`),
  CONSTRAINT `attendance_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_records`
--

LOCK TABLES `attendance_records` WRITE;
/*!40000 ALTER TABLE `attendance_records` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `attendance_records` VALUES
(1,9,'STU2026D58903_QR','hyhhw','Main Route - East Zone','morning_pickup','2026-02-19 13:15:36','2026-02-19',NULL,NULL,'mobile_1771496135600',NULL,'mobile','present',NULL,'synced'),
(2,9,'STU2026D58903_QR','hyhhw','Main Route - East Zone','evening_drop','2026-02-19 13:16:45','2026-02-19',NULL,NULL,'mobile_1771496135600',NULL,'mobile','present',NULL,'synced'),
(3,9,'STU2026D58903_QR','hyhhw','Main Route - East Zone','morning_pickup','2026-02-19 13:35:00','2026-02-19',NULL,NULL,'mobile_1771496135600',NULL,'mobile','present',NULL,'synced'),
(4,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 16:21:26','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(5,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 16:21:28','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(6,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 16:21:36','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(7,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 16:22:45','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(8,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 16:22:56','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(9,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 16:44:49','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(10,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 16:44:56','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(11,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 16:45:54','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(12,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 16:46:08','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(13,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 17:07:14','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(14,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 17:19:19','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(15,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 17:19:29','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(16,11,'STU2026051B0B','BUS-101','','morning_pickup','2026-03-05 17:20:14','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(17,10,'STU2026BB0ACC','7277','','evening_pickup','2026-03-05 17:37:45','2026-03-05',NULL,NULL,'flutter_app_1772721496931',NULL,'mobile_sync','present',NULL,'synced'),
(18,9,'STU2026D58903','hyhhw','','evening_pickup','2026-03-05 17:38:00','2026-03-05',NULL,NULL,'flutter_app_1772721496931',NULL,'mobile_sync','present',NULL,'synced'),
(19,9,'STU2026D58903','hyhhw','','evening_pickup','2026-03-05 17:59:49','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(20,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 18:03:27','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(21,11,'STU2026051B0B','BUS-101','','evening_pickup','2026-03-05 18:05:01','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(22,10,'STU2026BB0ACC','7277','','evening_pickup','2026-03-05 18:05:05','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(23,11,'STU2026051B0B','BUS-101','','evening_pickup','2026-03-05 18:55:08','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(24,10,'STU2026BB0ACC','7277','','evening_pickup','2026-03-05 18:55:11','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(25,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 18:55:14','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile','present',NULL,'synced'),
(26,11,'STU2026051B0B','BUS-101','','morning_pickup','2026-03-05 19:27:44','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(27,10,'STU2026BB0ACC','7277','','morning_pickup','2026-03-05 19:27:51','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced'),
(28,9,'STU2026D58903','hyhhw','','morning_pickup','2026-03-05 19:27:59','2026-03-05',NULL,NULL,'flutter_app',NULL,'mobile_sync','present',NULL,'synced');
/*!40000 ALTER TABLE `attendance_records` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bus_routes`
--

DROP TABLE IF EXISTS `bus_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bus_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `route_name` varchar(100) NOT NULL,
  `route_number` varchar(50) NOT NULL,
  `bus_number` varchar(50) NOT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_phone` varchar(20) DEFAULT NULL,
  `morning_pickup_time` time DEFAULT NULL,
  `morning_drop_time` time DEFAULT NULL,
  `evening_pickup_time` time DEFAULT NULL,
  `evening_drop_time` time DEFAULT NULL,
  `capacity` int(11) DEFAULT 40,
  `current_students` int(11) DEFAULT 0,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_number` (`route_number`),
  UNIQUE KEY `bus_number` (`bus_number`),
  KEY `idx_route_number` (`route_number`),
  KEY `idx_bus_number` (`bus_number`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bus_routes`
--

LOCK TABLES `bus_routes` WRITE;
/*!40000 ALTER TABLE `bus_routes` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `bus_routes` VALUES
(1,'Main Route - East Zone','R001','BUS-101','John Driver','9876543210','07:00:00','08:00:00','14:30:00','15:30:00',40,7,'active','2026-01-15 16:52:58','2026-03-05 13:48:00'),
(2,'Secondary Route - West Zone','R002','BUS-102','Mike Conductor','9876543211','07:15:00','08:15:00','14:45:00','15:45:00',35,0,'active','2026-01-15 16:52:58','2026-01-15 16:52:58'),
(3,'North Zone Route','R003','BUS-103','Robert Driver','9876543212','07:30:00','08:30:00','15:00:00','16:00:00',40,1,'active','2026-01-15 16:52:58','2026-03-05 16:32:08'),
(4,'juier','trr','yyye-55','jhiw','2222','07:00:00','08:00:00','14:30:00','15:30:00',40,0,'active','2026-02-19 09:51:42','2026-02-19 09:51:42'),
(5,'juiegdw','887-yy','jhd-wyegw','hjyfdw','8888','07:00:00','08:00:00','14:30:00','15:30:00',40,1,'active','2026-02-19 09:52:49','2026-03-05 11:40:27');
/*!40000 ALTER TABLE `bus_routes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('cash','card','online','cheque') DEFAULT 'cash',
  `payment_for_month` varchar(20) DEFAULT NULL,
  `received_by` varchar(100) DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `student_qr_codes`
--

DROP TABLE IF EXISTS `student_qr_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_qr_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `qr_code` varchar(100) NOT NULL,
  `qr_data` text NOT NULL,
  `qr_image_path` varchar(500) DEFAULT NULL,
  `version` int(11) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `generated_at` timestamp NULL DEFAULT current_timestamp(),
  `last_used` datetime DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_code` (`qr_code`),
  KEY `idx_qr_code` (`qr_code`),
  KEY `idx_student_id` (`student_id`),
  CONSTRAINT `student_qr_codes_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_qr_codes`
--

LOCK TABLES `student_qr_codes` WRITE;
/*!40000 ALTER TABLE `student_qr_codes` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `student_qr_codes` VALUES
(1,4,'STU20265387E1_QR','{\"student_id\":\"STU20265387E1\",\"name\":\"Nehemia\",\"bus_number\":\"bus 11\",\"grade\":\"1\",\"timestamp\":1768496757}','qrcodes/qr_STU20265387E1_1768496757.png',1,1,'2026-01-15 17:05:57',NULL,0),
(2,5,'STU2026E8BADA_QR','{\"student_id\":\"STU2026E8BADA\",\"name\":\"hjrfysq\",\"bus_number\":\"444\",\"grade\":\"ded\",\"timestamp\":1771326958}','qrcodes/qr_STU2026E8BADA_1771326958.png',1,1,'2026-02-17 11:15:58',NULL,0),
(3,6,'STU2026B8FF5D_QR','{\"student_id\":\"STU2026B8FF5D\",\"name\":\"kjgsys\",\"bus_number\":\"bus 11\",\"grade\":\"jkgui\",\"timestamp\":1771327707}','qrcodes/qr_STU2026B8FF5D_1771327707.png',1,1,'2026-02-17 11:28:27',NULL,0),
(4,7,'STU2026DB12AF_QR','{\"student_id\":\"STU2026DB12AF\",\"name\":\"jhgdthqw\",\"bus_number\":\"weqwtyd\",\"grade\":\"hhhwh\",\"timestamp\":1771485293}','qrcodes/qr_STU2026DB12AF_1771485293.png',1,1,'2026-02-19 07:14:53',NULL,0),
(5,8,'STU2026391711_QR','{\"student_id\":\"STU2026391711\",\"name\":\"fdter\",\"bus_number\":\"BUS-101\",\"grade\":\"juuuu\",\"timestamp\":1771485955}','qrcodes/qr_STU2026391711_1771485955.png',1,1,'2026-02-19 07:25:55',NULL,0),
(6,9,'STU2026D58903_QR','STU2026D58903','qrcodes/qr_STU2026D58903_1771494381.png',1,1,'2026-02-19 09:46:21','2026-02-19 13:35:00',3),
(7,10,'STU2026BB0ACC_QR','STU2026BB0ACC','qrcodes/qr_STU2026BB0ACC_1772710827.png',1,1,'2026-03-05 11:40:27',NULL,0),
(8,11,'STU2026051B0B_QR','STU2026051B0B','qrcodes/qr_STU2026051B0B_1772718480.png',1,1,'2026-03-05 13:48:00',NULL,0),
(9,12,'STU2026860022_QR','STU2026860022','qrcodes/qr_STU2026860022_1772728328.png',1,1,'2026-03-05 16:32:08',NULL,0);
/*!40000 ALTER TABLE `student_qr_codes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` varchar(50) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `grade_class` varchar(50) DEFAULT NULL,
  `section` varchar(10) DEFAULT NULL,
  `father_name` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `bus_route_id` int(11) DEFAULT NULL,
  `bus_number` varchar(50) DEFAULT NULL,
  `morning_pickup` tinyint(1) DEFAULT 1,
  `evening_drop` tinyint(1) DEFAULT 1,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `amount_due` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('paid','partial','unpaid') DEFAULT 'unpaid',
  `photo_url` varchar(500) DEFAULT NULL,
  `status` enum('active','inactive','graduated') DEFAULT 'active',
  `registration_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`),
  KEY `bus_route_id` (`bus_route_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_bus_number` (`bus_number`),
  KEY `idx_status` (`status`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`bus_route_id`) REFERENCES `bus_routes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `students` VALUES
(1,'STU2024001','Rahul Sharma','5th','A','Vikram Sharma','Sunita Sharma',NULL,NULL,NULL,NULL,1,'BUS-101',1,1,5000.00,0.00,5000.00,'paid',NULL,'active','2026-01-15','2026-01-15 16:52:59','2026-01-15 16:52:59'),
(2,'STU2024002','Priya Patel','6th','B','Rajesh Patel','Mona Patel',NULL,NULL,NULL,NULL,1,'BUS-101',1,0,2500.00,0.00,5000.00,'partial',NULL,'active','2026-01-15','2026-01-15 16:52:59','2026-01-15 16:52:59'),
(3,'STU2024003','Amit Kumar','4th','C','Sanjay Kumar','Rekha Kumar',NULL,NULL,NULL,NULL,2,'BUS-102',0,1,0.00,0.00,5000.00,'unpaid',NULL,'active','2026-01-15','2026-01-15 16:52:59','2026-01-15 16:52:59'),
(4,'STU20265387E1','Nehemia','1','2','ddd','ddd','2026-01-14','male','888','ii',1,'bus 11',1,1,1000.00,1000.00,2000.00,'partial',NULL,'active','2026-01-15','2026-01-15 17:05:57','2026-01-15 17:05:57'),
(5,'STU2026E8BADA','hjrfysq','ded','eeee','dd','sss','2026-02-11','male','123333','gggg',1,'444',1,1,1.00,11.00,12.00,'paid',NULL,'active','2026-02-17','2026-02-17 11:15:58','2026-02-17 11:15:58'),
(6,'STU2026B8FF5D','kjgsys','jkgui','wew3','mjhfd','uti','2026-02-10','male','88888','555555',1,'bus 11',1,1,1000.00,1000.00,2000.00,'partial',NULL,'active','2026-02-17','2026-02-17 11:28:27','2026-02-17 11:28:27'),
(7,'STU2026DB12AF','jhgdthqw','hhhwh','hhw','2222','2222222','2026-02-27','female','33333333','ghfwt',1,'weqwtyd',1,1,22.00,200.00,222.00,'partial',NULL,'active','2026-02-19','2026-02-19 07:14:53','2026-02-19 07:14:53'),
(8,'STU2026391711','fdter','juuuu','77','iyu','yty','2026-02-27','male','7777','uiiu',1,'BUS-101',1,1,9.00,768.00,777.00,'partial',NULL,'active','2026-02-19','2026-02-19 07:25:55','2026-02-19 07:25:55'),
(9,'STU2026D58903','kjhyuf','ff','ww','hfy','hfd','2026-02-28','male','111111','rs',1,'hyhhw',1,1,2.00,20.00,22.00,'partial',NULL,'active','2026-02-19','2026-02-19 09:46:21','2026-02-19 09:46:21'),
(10,'STU2026BB0ACC','nam e','5','7','0778777777','776677777','2026-03-03','male','7726266626','juit7djhvfyd',5,'7277',1,1,50.00,50.00,100.00,'partial',NULL,'active','2026-03-05','2026-03-05 11:40:27','2026-03-05 11:40:27'),
(11,'STU2026051B0B','Erick kimaro','2','2','Aman','Leah','2026-03-19','male','1234567899','uiyfdrqw',1,'BUS-101',1,1,10.00,90.00,100.00,'partial',NULL,'active','2026-03-05','2026-03-05 13:48:00','2026-03-05 13:48:00'),
(12,'STU2026860022','Rashid Hamad','4','1','Name','nam','2026-03-12','female','7726266626','jyfcw',3,'BUS-103',1,1,100.00,0.00,100.00,'paid',NULL,'active','2026-03-05','2026-03-05 16:32:08','2026-03-05 16:32:08');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sync_logs`
--

DROP TABLE IF EXISTS `sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sync_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` varchar(100) NOT NULL,
  `sync_type` enum('students','attendance','both') NOT NULL,
  `records_count` int(11) DEFAULT 0,
  `sync_time` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('success','failed','partial') DEFAULT 'success',
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_sync_time` (`sync_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sync_logs`
--

LOCK TABLES `sync_logs` WRITE;
/*!40000 ALTER TABLE `sync_logs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sync_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` enum('admin','driver','conductor','parent') DEFAULT 'driver',
  `full_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `assigned_bus` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_assigned_bus` (`assigned_bus`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'admin','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin@schoolbus.com','admin','System Administrator',NULL,NULL,'active',NULL,'2026-01-15 16:52:58','2026-01-15 16:52:58');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-04-21 13:43:45
