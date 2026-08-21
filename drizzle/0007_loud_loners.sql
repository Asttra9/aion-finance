CREATE TABLE `service_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`billingDay` int NOT NULL,
	`status` enum('ativa','pausada','cancelada') NOT NULL DEFAULT 'ativa',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_subscriptions_id` PRIMARY KEY(`id`)
);
