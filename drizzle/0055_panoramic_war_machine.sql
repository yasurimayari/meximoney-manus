ALTER TABLE `assistantNotes` ADD `isPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `assistantNotes` ADD `archivedAt` timestamp;