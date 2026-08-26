CREATE TABLE `surplusAllocationPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reserveBps` int NOT NULL DEFAULT 10000,
	`debtBps` int NOT NULL DEFAULT 0,
	`savingsBps` int NOT NULL DEFAULT 0,
	`investmentBps` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surplusAllocationPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `surplusAllocationPolicies_userId_unique` UNIQUE(`userId`)
);
