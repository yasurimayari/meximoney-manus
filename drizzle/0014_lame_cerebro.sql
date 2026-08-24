CREATE TABLE `creditCards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityId` int,
	`projectId` int,
	`name` varchar(140) NOT NULL,
	`issuer` varchar(140),
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`creditLimitCents` int NOT NULL DEFAULT 0,
	`balanceCents` int NOT NULL DEFAULT 0,
	`interestRateBps` int,
	`minimumPaymentCents` int NOT NULL DEFAULT 0,
	`statementClosingDay` int,
	`paymentDueDay` int,
	`status` enum('active','paused','closed') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creditCards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `creditCardId` int;