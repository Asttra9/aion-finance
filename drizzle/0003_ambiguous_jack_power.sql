CREATE TABLE `financial_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`targetAmount` decimal(12,2) NOT NULL,
	`savedAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`dueDate` timestamp,
	`color` varchar(7) NOT NULL DEFAULT '#b21d31',
	`icon` varchar(32) NOT NULL DEFAULT 'wallet',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_goals_id` PRIMARY KEY(`id`)
);
