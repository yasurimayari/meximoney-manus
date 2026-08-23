CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`type` enum('cash','bank','investment','pension','property','business','other') NOT NULL,
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`currentValueCents` int NOT NULL DEFAULT 0,
	`isLiquid` boolean NOT NULL DEFAULT false,
	`valuationDate` timestamp,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int,
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`periodStart` timestamp NOT NULL,
	`plannedCents` int NOT NULL,
	`type` enum('income','expense') NOT NULL DEFAULT 'expense',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`type` enum('income','expense','transfer','mixed') NOT NULL DEFAULT 'mixed',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`isEssential` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`creditor` varchar(140),
	`type` enum('credit_card','loan','mortgage','tax','business','family','other') NOT NULL DEFAULT 'other',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`balanceCents` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`interestRateBps` int,
	`minimumPaymentCents` int NOT NULL DEFAULT 0,
	`nextDueAt` timestamp,
	`endDate` timestamp,
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('active','paid','review') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `debts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decisionRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`area` enum('budget','debt','savings','investment','tax','insurance','assets','other') NOT NULL DEFAULT 'other',
	`status` enum('proposal','approved','reviewed','discarded') NOT NULL DEFAULT 'proposal',
	`dataUsed` text,
	`assumptions` text,
	`risks` text,
	`alternatives` text,
	`approvedAction` text,
	`reviewAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decisionRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financeDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`type` enum('statement','invoice','contract','policy','tax','receipt','other') NOT NULL DEFAULT 'other',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`referenceUrl` text,
	`issuedAt` timestamp,
	`expiresAt` timestamp,
	`verified` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financeDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financeTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`area` enum('budget','debt','savings','investment','tax','documents','business','review','other') NOT NULL DEFAULT 'other',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','waiting','completed','cancelled') NOT NULL DEFAULT 'pending',
	`dueAt` timestamp,
	`goalId` int,
	`debtId` int,
	`requiresConfirmation` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financeTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financialGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`type` enum('emergency','debt','housing','retirement','investment','education','business','other') NOT NULL DEFAULT 'other',
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`targetCents` int NOT NULL,
	`currentCents` int NOT NULL DEFAULT 0,
	`monthlyContributionCents` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`targetDate` timestamp,
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('active','paused','achieved','cancelled') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialGoals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financialProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`residenceCountry` varchar(80),
	`taxResidence` varchar(120),
	`householdSize` int NOT NULL DEFAULT 1,
	`dependents` int NOT NULL DEFAULT 0,
	`minimumLiquidityCents` int NOT NULL DEFAULT 0,
	`referenceEssentialExpensesCents` int NOT NULL DEFAULT 0,
	`riskTolerance` enum('low','medium_low','medium','medium_high','high'),
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `financialProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `financialTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int,
	`categoryId` int,
	`goalId` int,
	`debtId` int,
	`type` enum('income','expense','transfer_out','transfer_in') NOT NULL,
	`scope` enum('personal','business','mixed') NOT NULL DEFAULT 'personal',
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`occurredAt` timestamp NOT NULL,
	`isEssential` boolean NOT NULL DEFAULT false,
	`transferGroupId` varchar(64),
	`status` enum('confirmed','estimated','needs_review') NOT NULL DEFAULT 'confirmed',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthlyReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`status` enum('draft','reviewed','closed') NOT NULL DEFAULT 'draft',
	`incomeCents` int NOT NULL DEFAULT 0,
	`expenseCents` int NOT NULL DEFAULT 0,
	`netCashFlowCents` int NOT NULL DEFAULT 0,
	`observations` text,
	`nextActions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyReviews_id` PRIMARY KEY(`id`)
);
