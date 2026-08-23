ALTER TABLE `financialProfiles` ADD `displayName` varchar(140);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `birthDate` timestamp;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `residenceCity` varchar(120);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `contactEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `avatarKey` varchar(600);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `avatarUrl` varchar(1200);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `personalProfileConsent` boolean DEFAULT false NOT NULL;