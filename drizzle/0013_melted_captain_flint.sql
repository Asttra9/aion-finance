CREATE TABLE `account_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`consultorId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pendente','aceito','revogado','expirado') NOT NULL DEFAULT 'pendente',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_invites_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `client_onboarding_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`profileType` enum('pessoal','empresarial') NOT NULL,
	`personalGoal` varchar(120),
	`incomeRange` varchar(80),
	`legalName` varchar(255),
	`segment` varchar(120),
	`revenueRange` varchar(80),
	`financialControlMethod` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_onboarding_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_onboarding_profiles_client_unique` UNIQUE(`clientId`)
);
