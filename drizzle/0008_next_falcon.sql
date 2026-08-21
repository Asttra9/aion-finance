ALTER TABLE `notifications` ADD `resolvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `notifications` ADD `resolvedAt` timestamp NULL, ADD `resolutionNote` varchar(280);
