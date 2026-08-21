CREATE TABLE `financial_goal_contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`clientId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`note` varchar(280),
	`month` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_goal_contributions_id` PRIMARY KEY(`id`)
);
