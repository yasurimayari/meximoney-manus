CREATE TABLE `financialHabitCheckins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`habitId` int NOT NULL,
	`completedAt` timestamp NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financialHabitCheckins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financialHabitPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`showOnDashboard` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialHabitPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `financialHabitPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `financialHabits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(140) NOT NULL,
	`cadence` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
	`color` varchar(24) NOT NULL DEFAULT 'teal',
	`isActive` boolean NOT NULL DEFAULT true,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialHabits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `financialHabitCheckins_user_habit_date_idx` ON `financialHabitCheckins` (`userId`,`habitId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `financialHabits_user_active_idx` ON `financialHabits` (`userId`,`isActive`);