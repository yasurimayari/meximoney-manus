CREATE TABLE `financeTaskLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int NOT NULL,
	`resourceType` enum('account','credit_card','contact','investment','receivable','payable','fiscal_record','document','travel','calendar_event','budget','category') NOT NULL,
	`resourceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financeTaskLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `financeTaskLinks_unique_resource_idx` UNIQUE(`taskId`,`resourceType`,`resourceId`)
);
--> statement-breakpoint
CREATE INDEX `financeTaskLinks_user_task_idx` ON `financeTaskLinks` (`userId`,`taskId`);