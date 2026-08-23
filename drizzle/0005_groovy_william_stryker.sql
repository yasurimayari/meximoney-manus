CREATE TABLE `calendarColorPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('tax','credit_card_cutoff','credit_card_payment','loan_payment','document_expiry','insurance_renewal','review','other','debt_due','document_due','task_due','fiscal_reserve') NOT NULL,
	`colorKey` enum('teal','emerald','sky','indigo','violet','amber','orange','rose','slate') NOT NULL DEFAULT 'teal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarColorPreferences_id` PRIMARY KEY(`id`)
);
