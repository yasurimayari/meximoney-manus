CREATE TABLE `debtPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`debtId` int NOT NULL,
	`linkedTransactionId` int,
	`totalPaymentCents` int NOT NULL,
	`principalCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`paidAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `debtPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `debts` MODIFY COLUMN `type` enum('credit_card','loan','financed_purchase','mortgage','tax','business','family','other') NOT NULL DEFAULT 'other';--> statement-breakpoint
ALTER TABLE `debts` ADD `originalAmountCents` int;--> statement-breakpoint
ALTER TABLE `debts` ADD `installmentCents` int;--> statement-breakpoint
ALTER TABLE `debts` ADD `installmentCount` int;--> statement-breakpoint
ALTER TABLE `debts` ADD `financedItem` varchar(180);--> statement-breakpoint
ALTER TABLE `debts` ADD `purchasedAt` timestamp;