CREATE TABLE `receivables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityId` int,
	`projectId` int,
	`counterparty` varchar(180) NOT NULL,
	`origin` varchar(220) NOT NULL,
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`issuedAt` timestamp NOT NULL,
	`dueAt` timestamp,
	`paidAt` timestamp,
	`status` enum('pending','overdue','paid','reconciled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receivables_id` PRIMARY KEY(`id`)
);
