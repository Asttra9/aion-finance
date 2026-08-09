CREATE TABLE `accounts_payable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`paymentDate` timestamp,
	`status` enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
	`vendor` varchar(255),
	`category` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_payable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts_receivable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`paymentDate` timestamp,
	`status` enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
	`customer` varchar(255),
	`invoiceNumber` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_receivable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultorId` int NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`cpfCnpj` varchar(20),
	`businessType` enum('mei','profissional_liberal','pj') NOT NULL,
	`businessName` varchar(255),
	`status` enum('ativo','inativo','em_onboarding') NOT NULL DEFAULT 'ativo',
	`monthlyRevenue` decimal(12,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_cpfCnpj_unique` UNIQUE(`cpfCnpj`)
);
--> statement-breakpoint
CREATE TABLE `file_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` enum('ofx','pdf','csv','outro') NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`fileSize` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `file_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`month` timestamp NOT NULL,
	`reportType` enum('fluxo_caixa','dre','completo') NOT NULL,
	`fileKey` varchar(255),
	`fileUrl` text,
	`summary` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `financial_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mei_workflow` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`status` enum('nao_iniciado','em_progresso','concluido','cancelado') NOT NULL DEFAULT 'nao_iniciado',
	`steps` json DEFAULT ('[]'),
	`documents` json DEFAULT ('[]'),
	`ccmeiDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mei_workflow_id` PRIMARY KEY(`id`),
	CONSTRAINT `mei_workflow_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`type` enum('vencimento_proximo','vencido','lembrete_cobranca') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`relatedId` int,
	`relatedType` enum('accounts_payable','accounts_receivable'),
	`read` boolean DEFAULT false,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultorId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('receita','despesa') NOT NULL,
	`color` varchar(7),
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transaction_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`categoryId` int,
	`date` timestamp NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`type` enum('receita','despesa') NOT NULL,
	`financeType` enum('pessoal','empresarial') NOT NULL DEFAULT 'empresarial',
	`status` enum('pendente','conciliado','cancelado') NOT NULL DEFAULT 'pendente',
	`ofxId` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('consultor_aion','cliente','admin','user') NOT NULL DEFAULT 'cliente';