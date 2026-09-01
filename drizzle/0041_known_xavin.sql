ALTER TABLE `notificationPreferences` ADD `travelsEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `reminderDays` int DEFAULT 7 NOT NULL;