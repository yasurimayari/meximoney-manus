CREATE TABLE `travelItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`travelPlanId` int NOT NULL,
	`transactionId` int,
	`projectId` int,
	`taskId` int,
	`goalId` int,
	`entityId` int,
	`contactId` int,
	`documentId` int,
	`itemType` enum('flight','train','car_rental','ride','hotel','airbnb','exhibition','meal','other') NOT NULL DEFAULT 'other',
	`title` varchar(180) NOT NULL,
	`provider` varchar(180),
	`location` varchar(180),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`amountCents` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`status` enum('planned','booked','paid','completed','cancelled') NOT NULL DEFAULT 'planned',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travelItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travelPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`entityId` int,
	`goalId` int,
	`contactId` int,
	`name` varchar(180) NOT NULL,
	`origin` varchar(140),
	`destination` varchar(140),
	`purpose` varchar(240),
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`status` enum('planned','in_progress','completed','cancelled','archived') NOT NULL DEFAULT 'planned',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`budgetCents` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travelPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `travel_items_user_plan_idx` ON `travelItems` (`userId`,`travelPlanId`);--> statement-breakpoint
CREATE INDEX `travel_plans_user_status_idx` ON `travelPlans` (`userId`,`status`);