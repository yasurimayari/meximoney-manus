CREATE TABLE `travelParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`travelPlanId` int NOT NULL,
	`contactId` int NOT NULL,
	`role` varchar(80),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travelParticipants_id` PRIMARY KEY(`id`),
	CONSTRAINT `travel_participants_user_plan_contact_unique` UNIQUE(`userId`,`travelPlanId`,`contactId`)
);
--> statement-breakpoint
CREATE INDEX `travel_participants_user_plan_idx` ON `travelParticipants` (`userId`,`travelPlanId`);