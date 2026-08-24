CREATE TABLE `payablePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`payableId` int NOT NULL,
	`linkedTransactionId` int,
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`paidAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payablePayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityId` int,
	`projectId` int,
	`creditor` varchar(180) NOT NULL,
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
	CONSTRAINT `payables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurringTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityId` int,
	`projectId` int,
	`accountId` int,
	`categoryId` int,
	`name` varchar(180) NOT NULL,
	`counterparty` varchar(180),
	`type` enum('income','expense') NOT NULL DEFAULT 'expense',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`incomeNature` enum('business_revenue','salary_commission','family_support','owner_draw','other') NOT NULL DEFAULT 'other',
	`cadence` enum('weekly','monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
	`nextOccurrenceAt` timestamp,
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurringTemplates_id` PRIMARY KEY(`id`)
);
