CREATE TABLE `creditScoreRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL,
	`source` varchar(120),
	`reportedAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creditScoreRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financedAssetPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`investmentId` int NOT NULL,
	`debtId` int,
	`sourceAccountId` int,
	`purchaseValueCents` int NOT NULL,
	`cashContributionCents` int NOT NULL DEFAULT 0,
	`financedAmountCents` int NOT NULL DEFAULT 0,
	`acquiredAt` timestamp NOT NULL,
	`valuationPolicy` enum('depreciating','appreciating','manual') NOT NULL DEFAULT 'manual',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financedAssetPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personalScoreSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`calculatedAt` timestamp NOT NULL,
	`periodStart` timestamp NOT NULL,
	`totalScore` int NOT NULL,
	`level` varchar(32) NOT NULL,
	`netWorthPoints` int NOT NULL,
	`creditUtilizationPoints` int NOT NULL,
	`creditScorePoints` int NOT NULL,
	`emergencyFundPoints` int NOT NULL,
	`cashFlowPoints` int NOT NULL,
	`habitPoints` int NOT NULL,
	`debtPaymentPoints` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personalScoreSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMilestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`status` enum('planned','in_progress','completed','archived') NOT NULL DEFAULT 'planned',
	`startsAt` timestamp,
	`targetAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMilestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financialProjects` MODIFY COLUMN `status` enum('active','paused','closed','planned','archived') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `investmentOperations` MODIFY COLUMN `type` enum('contribution','withdrawal','yield','valuation_adjustment','depreciation') NOT NULL;--> statement-breakpoint
ALTER TABLE `investments` MODIFY COLUMN `type` enum('savings','fixed_income','fund_etf','stock','crypto','land','property','vehicle','business_equity','retirement','other') NOT NULL DEFAULT 'savings';--> statement-breakpoint
ALTER TABLE `financeTasks` ADD `milestoneId` int;--> statement-breakpoint
ALTER TABLE `financeTasks` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `financialProjects` ADD `color` varchar(16) DEFAULT '#0f766e' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialProjects` ADD `startsAt` timestamp;--> statement-breakpoint
ALTER TABLE `financialProjects` ADD `targetAt` timestamp;--> statement-breakpoint
ALTER TABLE `financialProjects` ADD `archivedAt` timestamp;