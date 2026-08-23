ALTER TABLE `monthlyFinancialStatements` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `monthlyFinancialStatements` ADD `projectId` int;--> statement-breakpoint
ALTER TABLE `monthlyFinancialStatements` ADD `filterCurrency` varchar(3);--> statement-breakpoint
ALTER TABLE `monthlyFinancialStatements` ADD `filterReviewStatus` enum('draft','pending_review','approved');
