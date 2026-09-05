CREATE TABLE `creditReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('buro','circulo') NOT NULL,
	`consultedAt` timestamp NOT NULL,
	`periodLabel` varchar(80),
	`fileKey` varchar(500),
	`fileUrl` text,
	`fileName` varchar(240) NOT NULL,
	`fileMimeType` varchar(120) NOT NULL DEFAULT 'application/pdf',
	`fileSizeBytes` int NOT NULL,
	`notes` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creditReports_id` PRIMARY KEY(`id`)
);
