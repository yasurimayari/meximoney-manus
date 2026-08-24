CREATE TABLE `receivablePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`receivableId` int NOT NULL,
	`linkedTransactionId` int,
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`paidAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receivablePayments_id` PRIMARY KEY(`id`)
);
