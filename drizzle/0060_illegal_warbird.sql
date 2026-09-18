CREATE TABLE `workspaceAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(48) NOT NULL,
	`resourceType` varchar(48) NOT NULL,
	`resourceId` int,
	`detail` varchar(300) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workspace_audit_owner_created_idx` ON `workspaceAuditEvents` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workspace_audit_actor_created_idx` ON `workspaceAuditEvents` (`actorUserId`,`createdAt`);