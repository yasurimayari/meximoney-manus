CREATE TABLE `qualityIssueAcknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`issueKey` varchar(512) NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualityIssueAcknowledgements_id` PRIMARY KEY(`id`)
);
