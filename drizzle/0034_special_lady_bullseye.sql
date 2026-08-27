ALTER TABLE `financeDocuments` ADD `fileKey` varchar(500);--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `fileUrl` text;--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `fileName` varchar(240);--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `fileMimeType` varchar(120);--> statement-breakpoint
ALTER TABLE `financeDocuments` ADD `fileSizeBytes` int;