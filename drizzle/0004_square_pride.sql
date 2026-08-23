CREATE TABLE `calendarEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`eventType` enum('tax','credit_card_cutoff','credit_card_payment','loan_payment','document_expiry','insurance_renewal','review','other') NOT NULL DEFAULT 'other',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`recurrence` enum('none','monthly','quarterly','yearly') NOT NULL DEFAULT 'none',
	`amountCents` int,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`linkedDebtId` int,
	`linkedDocumentId` int,
	`linkedTaskId` int,
	`status` enum('planned','completed','cancelled') NOT NULL DEFAULT 'planned',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthlyFinancialStatements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`status` enum('draft','closed') NOT NULL DEFAULT 'draft',
	`incomeCents` int NOT NULL DEFAULT 0,
	`expenseCents` int NOT NULL DEFAULT 0,
	`netCashFlowCents` int NOT NULL DEFAULT 0,
	`assetCents` int NOT NULL DEFAULT 0,
	`liabilityCents` int NOT NULL DEFAULT 0,
	`netWorthCents` int NOT NULL DEFAULT 0,
	`liquidCents` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyFinancialStatements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `documentClass` varchar(48) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `relatedEntityType` varchar(32) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `relatedEntityId` int;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `jurisdiction` varchar(120);--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `reminderAt` timestamp;