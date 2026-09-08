CREATE TABLE `assistantNoteAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` int NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(700) NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`fileMimeType` varchar(100) NOT NULL,
	`fileSizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistantNoteAttachments_id` PRIMARY KEY(`id`)
);
