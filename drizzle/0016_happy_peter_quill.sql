CREATE TABLE `investmentOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`investmentId` int NOT NULL,
	`linkedTransactionId` int,
	`type` enum('contribution','withdrawal','yield','valuation_adjustment') NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`occurredAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investmentOperations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityId` int,
	`projectId` int,
	`name` varchar(180) NOT NULL,
	`type` enum('savings','fixed_income','fund_etf','stock','crypto','land','property','business_equity','retirement','other') NOT NULL DEFAULT 'savings',
	`institution` varchar(180),
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`costBasisCents` int NOT NULL DEFAULT 0,
	`currentValueCents` int NOT NULL DEFAULT 0,
	`reportCurrency` varchar(3),
	`reportValueCents` int,
	`exchangeRateMicros` int,
	`exchangeRateDate` timestamp,
	`valuationDate` timestamp,
	`includeInNetWorth` boolean NOT NULL DEFAULT true,
	`status` enum('active','paused','closed') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `contactId` int;--> statement-breakpoint
ALTER TABLE `payables` ADD `contactId` int;--> statement-breakpoint
ALTER TABLE `receivables` ADD `contactId` int;--> statement-breakpoint
ALTER TABLE `recurringTemplates` ADD `contactId` int;