CREATE TABLE `collaborationInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`role` enum('manager','reviewer') NOT NULL DEFAULT 'reviewer',
	`canCreateDrafts` boolean NOT NULL DEFAULT false,
	`canReview` boolean NOT NULL DEFAULT true,
	`status` enum('invited','accepted','revoked') NOT NULL DEFAULT 'invited',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborationInvites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchangeRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`fromCurrency` varchar(3) NOT NULL,
	`toCurrency` varchar(3) NOT NULL,
	`rateMicros` int NOT NULL,
	`rateDate` timestamp NOT NULL,
	`source` enum('manual','confirmed_reference') NOT NULL DEFAULT 'manual',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchangeRates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financialProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`entityId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('active','paused','closed','planned') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceEntities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`shortCode` varchar(32),
	`countryCode` varchar(2) NOT NULL DEFAULT 'MX',
	`legalForm` enum('individual','pfae','sa_de_cv','sapi','sl','llc','holding','other') NOT NULL DEFAULT 'individual',
	`status` enum('active','inactive','planned','dissolved') NOT NULL DEFAULT 'active',
	`functionalCurrency` varchar(3) NOT NULL DEFAULT 'MXN',
	`taxRegime` enum('pfae_general','resico','corporate','not_applicable','other') NOT NULL DEFAULT 'not_applicable',
	`startedAt` timestamp,
	`plannedConversionAt` timestamp,
	`predecessorEntityId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaceEntities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `accounts` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `budgets` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `budgets` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `debts` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `debts` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `decisionRecords` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `decisionRecords` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `referenceProvider` enum('google_drive','url','other') DEFAULT 'url' NOT NULL;--> statement-breakpoint
ALTER TABLE `financeTasks` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `financeTasks` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `financialGoals` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `financialGoals` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `workspaceName` varchar(140);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `taxRegime` enum('pfae_general','resico','other','not_applicable') DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `exchangeRatePolicy` enum('manual','manual_confirmed','unconverted') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `onboardingCompleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `onboardingStep` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `humanReviewRequired` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reportCurrency` varchar(3);--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reportAmountCents` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `exchangeRateMicros` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `exchangeRateDate` timestamp;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `incomeNature` enum('business_revenue','salary_commission','family_support','owner_draw','other') DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reviewStatus` enum('draft','pending_review','approved') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `createdByUserId` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `monthlyFinancialStatements` ADD `entityId` int;--> statement-breakpoint
ALTER TABLE `monthlyReviews` ADD `entityId` int;