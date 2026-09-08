CREATE TABLE `assistantChatHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userMessage` text NOT NULL,
	`assistantContent` text NOT NULL,
	`analysisJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistantChatHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistantNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL DEFAULT 'Nota sin título',
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assistantNotes_id` PRIMARY KEY(`id`)
);
