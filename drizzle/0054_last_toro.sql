ALTER TABLE `assistantNotes` ADD `tag` varchar(40) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `assistantNotes` ADD `tagColor` varchar(16) DEFAULT 'slate' NOT NULL;