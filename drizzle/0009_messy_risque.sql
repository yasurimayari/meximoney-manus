CREATE TABLE `financeNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(40) NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`relatedEntityType` varchar(40),
	`relatedEntityId` int,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	`dismissedAt` timestamp,
	CONSTRAINT `financeNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`calendarEnabled` boolean NOT NULL DEFAULT true,
	`documentsEnabled` boolean NOT NULL DEFAULT true,
	`debtsEnabled` boolean NOT NULL DEFAULT true,
	`reviewsEnabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
