CREATE TABLE `monthlyReviewControls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthlyReviewId` int NOT NULL,
	`transactionsConfirmed` boolean NOT NULL DEFAULT false,
	`qualityConfirmed` boolean NOT NULL DEFAULT false,
	`calendarConfirmed` boolean NOT NULL DEFAULT false,
	`obligationsConfirmed` boolean NOT NULL DEFAULT false,
	`fiscalConfirmed` boolean NOT NULL DEFAULT false,
	`patrimonyConfirmed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyReviewControls_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthlyReviewControls_monthlyReviewId_unique` UNIQUE(`monthlyReviewId`)
);
