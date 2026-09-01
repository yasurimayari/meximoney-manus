CREATE TABLE `travelCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`colorKey` enum('teal','emerald','sky','indigo','violet','amber','orange','rose','slate') NOT NULL DEFAULT 'teal',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travelCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `travel_categories_user_active_idx` ON `travelCategories` (`userId`,`isActive`);