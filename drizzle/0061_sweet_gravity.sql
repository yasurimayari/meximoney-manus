CREATE TABLE `financialTransactionReviewEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`actorRole` enum('owner','manager','reviewer') NOT NULL,
	`action` enum('approved','returned') NOT NULL,
	`note` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financialTransactionReviewEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `transaction_review_events_transaction_created_idx` ON `financialTransactionReviewEvents` (`transactionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `transaction_review_events_user_created_idx` ON `financialTransactionReviewEvents` (`userId`,`createdAt`);