ALTER TABLE `financeTasks` ADD `linkedTransactionId` int;--> statement-breakpoint
CREATE INDEX `financeTasks_user_linked_transaction_idx` ON `financeTasks` (`userId`,`linkedTransactionId`);