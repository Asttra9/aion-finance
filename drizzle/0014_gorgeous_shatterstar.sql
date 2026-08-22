CREATE TABLE `account_access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultorId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`pendingEmail` varchar(320),
	`passwordHash` varchar(255) NOT NULL,
	`businessType` enum('pessoal','mei') NOT NULL,
	`status` enum('pendente','aprovada','recusada') NOT NULL DEFAULT 'pendente',
	`decidedAt` timestamp,
	`decidedBy` int,
	`createdUserId` int,
	`createdClientId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_access_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_access_requests_pending_email_unique` UNIQUE(`pendingEmail`)
);
