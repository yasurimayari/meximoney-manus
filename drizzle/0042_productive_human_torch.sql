CREATE TABLE `financialPlanLevels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`financialPlanId` int NOT NULL,
	`position` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`monthlyTargetCents` int NOT NULL DEFAULT 0,
	`activationRule` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialPlanLevels_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_plan_levels_user_plan_position_unique` UNIQUE(`userId`,`financialPlanId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `financialPlanLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`financialPlanId` int NOT NULL,
	`financialPlanLevelId` int,
	`financialPlanPeriodId` int,
	`resourceType` enum('budget','debt','credit_card','payable','receivable','goal','task','calendar_event','fiscal_review','document') NOT NULL,
	`resourceId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financialPlanLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_plan_links_user_plan_resource_unique` UNIQUE(`userId`,`financialPlanId`,`resourceType`,`resourceId`)
);
--> statement-breakpoint
CREATE TABLE `financialPlanPeriods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`financialPlanId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`expectedIncomeCents` int NOT NULL DEFAULT 0,
	`plannedCommitmentsCents` int NOT NULL DEFAULT 0,
	`plannedSavingsCents` int NOT NULL DEFAULT 0,
	`status` enum('draft','in_review','complete') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialPlanPeriods_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_plan_periods_user_plan_month_unique` UNIQUE(`userId`,`financialPlanId`,`periodStart`)
);
--> statement-breakpoint
CREATE TABLE `financialPlanScenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`financialPlanId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`incomeFloorCents` int,
	`incomeCeilingCents` int,
	`allocationThroughPosition` int NOT NULL DEFAULT 0,
	`guidance` text,
	`colorKey` enum('rose','amber','sky','emerald','slate') NOT NULL DEFAULT 'slate',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialPlanScenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financialPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
	`startsAt` timestamp,
	`endsAt` timestamp,
	`guidingRule` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_plans_user_project_unique` UNIQUE(`userId`,`projectId`)
);
--> statement-breakpoint
CREATE INDEX `financial_plan_links_user_plan_idx` ON `financialPlanLinks` (`userId`,`financialPlanId`);--> statement-breakpoint
CREATE INDEX `financial_plan_scenarios_user_plan_idx` ON `financialPlanScenarios` (`userId`,`financialPlanId`);--> statement-breakpoint
CREATE INDEX `financial_plans_user_status_idx` ON `financialPlans` (`userId`,`status`);