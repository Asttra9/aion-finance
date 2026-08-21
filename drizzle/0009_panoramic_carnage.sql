CREATE TABLE `recurring_transaction_occurrences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recurringTransactionId` int NOT NULL,
	`clientId` int NOT NULL,
	`scheduledDate` timestamp NOT NULL,
	`status` enum('previsto','confirmado','adiado','cancelado') NOT NULL DEFAULT 'previsto',
	`transactionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurring_transaction_occurrences_id` PRIMARY KEY(`id`),
	CONSTRAINT `recurring_occurrence_competency_unique` UNIQUE(`recurringTransactionId`,`scheduledDate`)
);
--> statement-breakpoint
CREATE TABLE `recurring_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`categoryId` int,
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`type` enum('receita','despesa') NOT NULL,
	`financeType` enum('pessoal','empresarial') NOT NULL DEFAULT 'empresarial',
	`frequency` enum('mensal','anual') NOT NULL,
	`dueDay` int NOT NULL,
	`dueMonth` int,
	`status` enum('ativa','suspensa') NOT NULL DEFAULT 'ativa',
	`nextOccurrence` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurring_transactions_id` PRIMARY KEY(`id`)
);
