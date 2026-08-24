CREATE TABLE `financialContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityId` int,
	`projectId` int,
	`name` varchar(180) NOT NULL,
	`type` enum('client','supplier','partner','friend','family','employee','other') NOT NULL DEFAULT 'other',
	`email` varchar(320),
	`phone` varchar(64),
	`defaultCurrency` varchar(3),
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialContacts_id` PRIMARY KEY(`id`)
);
