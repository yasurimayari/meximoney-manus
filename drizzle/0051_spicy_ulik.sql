CREATE TABLE `bankStatementImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`rowCount` int NOT NULL DEFAULT 0,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bankStatementImports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bankStatementRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`importId` int NOT NULL,
	`accountId` int NOT NULL,
	`rowNumber` int NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`bankReference` varchar(160),
	`description` varchar(500),
	`matchStatus` enum('unmatched','auto_matched','reconciled','ignored') NOT NULL DEFAULT 'unmatched',
	`matchedTransactionId` int,
	`matchedAt` timestamp,
	`matchedByUserId` int,
	`resolutionNote` text,
	`rawData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bankStatementRows_id` PRIMARY KEY(`id`)
);
