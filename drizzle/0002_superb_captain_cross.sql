CREATE TABLE `privacyConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purpose` varchar(120) NOT NULL,
	`accepted` boolean NOT NULL,
	`policyVersion` varchar(40) NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `privacyConsents_id` PRIMARY KEY(`id`)
);
