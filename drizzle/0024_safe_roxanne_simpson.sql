CREATE TABLE `fiscalPeriodReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`status` enum('open','reviewed') NOT NULL DEFAULT 'open',
	`recordsConfirmed` boolean NOT NULL DEFAULT false,
	`evidenceConfirmed` boolean NOT NULL DEFAULT false,
	`collectionsConfirmed` boolean NOT NULL DEFAULT false,
	`notes` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fiscalPeriodReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `fiscalPeriodReviews_user_period_unique` UNIQUE(`userId`,`periodStart`)
);
