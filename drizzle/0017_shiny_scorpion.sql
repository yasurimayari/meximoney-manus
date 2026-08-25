ALTER TABLE `notificationPreferences` ADD `telegramEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD `telegramScheduleCronTaskUid` varchar(65);--> statement-breakpoint
CREATE INDEX `notification_preferences_telegram_task_uid_idx` ON `notificationPreferences` (`telegramScheduleCronTaskUid`);