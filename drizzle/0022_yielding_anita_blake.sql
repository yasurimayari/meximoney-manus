CREATE TABLE `passwordResetEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('requested','email_sent','email_failed','password_reset') NOT NULL,
	`channel` enum('email') NOT NULL DEFAULT 'email',
	`sourceLabel` varchar(32) NOT NULL DEFAULT 'web',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetEvents_id` PRIMARY KEY(`id`)
);
