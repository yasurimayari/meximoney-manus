ALTER TABLE `travelItems` ADD `categoryId` int;--> statement-breakpoint
CREATE INDEX `travel_items_user_category_idx` ON `travelItems` (`userId`,`categoryId`);