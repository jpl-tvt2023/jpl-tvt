ALTER TABLE `users` ADD COLUMN `role` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `role` = 'admin' WHERE `is_admin` = 1;--> statement-breakpoint
UPDATE `users` SET `role` = 'superadmin' WHERE `email` = 'tvtadmin@league.com';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_admin`;
