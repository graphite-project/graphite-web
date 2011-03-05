CREATE DATABASE IF NOT EXISTS GridfiltersDemo;
USE GridfiltersDemo;

--
-- Definition of table `demo`
--

DROP TABLE IF EXISTS `demo`;
CREATE TABLE `demo` (
  `id` int(10) unsigned NOT NULL auto_increment,
  `price` float NOT NULL,
  `company` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  `size` varchar(45) NOT NULL,
  `visible` tinyint(1) NOT NULL,
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=latin1;

--
-- Dumping data for table `demo`
--

INSERT INTO `demo` (`id`,`price`,`company`,`date`,`size`,`visible`) VALUES 
 (1,71.72,'3m Co','2007-09-01 00:00:00','large',1),
 (2,29.01,'Aloca Inc','2007-08-01 00:00:00','medium',0),
 (3,83.81,'Altria Group Inc','2007-08-03 00:00:00','large',0),
 (4,52.55,'American Express Company','2008-01-04 00:00:00','extra large',1),
 (5,64.13,'American International Group Inc.','2008-03-04 00:00:00','small',1),
 (6,31.61,'AT&T Inc.','2008-02-01 00:00:00','extra large',0),
 (7,75.43,'Boeing Co.','2008-01-01 00:00:00','large',1),
 (8,67.27,'Caterpillar Inc.','2007-12-03 00:00:00','medium',1),
 (9,49.37,'Citigroup, Inc.','2007-11-24 00:00:00','large',1),
 (10,40.48,'E.I. du Pont de Nemours and Company','2007-05-09 00:00:00','extra large',0),
 (11,68.1,'Exxon Mobile Corp','2007-12-12 00:00:00','large',1),
 (12,34.14,'General Electric Company','2008-06-16 00:00:00','extra large',1),
 (13,30.27,'General Motors Corporation','2006-12-07 00:00:00','medium',1),
 (14,36.53,'Hewlett-Packard Co.','2007-05-13 00:00:00','large',1),
 (15,38.77,'Honweywell Intl Inc','2006-11-07 00:00:00','medium',0),
 (16,19.88,'Intel Corporation','2007-01-09 00:00:00','small',1),
 (17,81.41,'International Business Machines','2005-01-21 00:00:00','extra large',1),
 (18,64.72,'Johnson & Johnson','2008-01-10 00:00:00','extra large',1),
 (19,45.73,'JP Morgan & Chase & Co','2008-02-20 00:00:00','large',0),
 (20,36.76,'McDonald\'s Corporation','2007-06-12 00:00:00','large',1),
 (21,27.96,'Pfizer Inc','2007-12-30 00:00:00','small',0),
 (22,45.07,'The Coca-Cola Company','2007-01-30 00:00:00','medium',0),
 (23,34.64,'The Home Depot, Inc','2006-12-31 00:00:00','small',1),
 (24,61.91,'The Procter & Gamble Company','2007-04-08 00:00:00','extra large',1),
 (25,63.26,'United Technologies Corporation','2006-06-04 00:00:00','medium',1),
 (26,35.57,'Verizon Communications','2005-07-09 00:00:00','small',0),
 (27,45.45,'Wal-Mart Stores, Inc','2006-09-09 00:00:00','large',1);