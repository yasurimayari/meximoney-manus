CREATE TABLE `debtBalanceAdjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`debtId` int NOT NULL,
	`type` enum('late_interest','finance_charge','other_charge','correction') NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`occurredAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `debtBalanceAdjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `debtPayments` ADD `interestCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `debtPayments` ADD `lateInterestCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `debtPayments` ADD `feeCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `debtBalanceAdjustments_user_debt_idx` ON `debtBalanceAdjustments` (`userId`,`debtId`);