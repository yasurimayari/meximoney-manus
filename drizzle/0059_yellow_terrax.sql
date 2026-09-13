CREATE TABLE `documentOcrExtractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`status` enum('extracted','reviewed','discarded','failed') NOT NULL DEFAULT 'extracted',
	`provider` varchar(80) NOT NULL DEFAULT 'gemini-3-flash-preview',
	`sourceFileKey` varchar(500) NOT NULL,
	`extraction` json NOT NULL,
	`errorMessage` varchar(1000),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentOcrExtractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `documentOcrExtractions_user_document_idx` ON `documentOcrExtractions` (`userId`,`documentId`);--> statement-breakpoint
CREATE INDEX `documentOcrExtractions_document_created_idx` ON `documentOcrExtractions` (`documentId`,`createdAt`);