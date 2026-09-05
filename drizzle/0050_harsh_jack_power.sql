ALTER TABLE `financialTransactions` ADD `reconciledAt` timestamp;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reconciledByUserId` int;--> statement-breakpoint
ALTER TABLE `financialTransactions` ADD `reconciliationNote` text;