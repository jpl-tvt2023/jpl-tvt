CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`team_id` text,
	`gameweek_id` text,
	`points_affected` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenger_survival_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`gameweek_id` text NOT NULL,
	`team_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`rank` integer,
	`advanced` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gameweek_id`) REFERENCES `gameweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` text PRIMARY KEY NOT NULL,
	`gameweek_id` text NOT NULL,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	`group_id` text NOT NULL,
	`is_challenge` integer DEFAULT false NOT NULL,
	`is_playoff` integer DEFAULT false NOT NULL,
	`round_name` text,
	`leg` integer,
	`tie_id` text,
	`round_type` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gameweek_id`) REFERENCES `gameweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gameweek_captains` (
	`id` text PRIMARY KEY NOT NULL,
	`gameweek_id` text NOT NULL,
	`player_id` text NOT NULL,
	`fpl_score` integer DEFAULT 0 NOT NULL,
	`transfer_hits` integer DEFAULT 0 NOT NULL,
	`doubled_score` integer DEFAULT 0 NOT NULL,
	`announced_at` integer,
	`is_valid` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`gameweek_id`) REFERENCES `gameweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gameweek_chips` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`gameweek_id` text NOT NULL,
	`chip_type` text NOT NULL,
	`challenged_team_id` text,
	`is_valid` integer DEFAULT true NOT NULL,
	`validation_errors` text,
	`is_processed` integer DEFAULT false NOT NULL,
	`points_awarded` integer DEFAULT 0 NOT NULL,
	`had_negative_hits` integer DEFAULT false NOT NULL,
	`team_rank_at_validation` integer,
	`opponent_rank_at_validation` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gameweek_id`) REFERENCES `gameweeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenged_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gameweeks` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`deadline` integer NOT NULL,
	`is_playoffs` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gameweeks_number_unique` ON `gameweeks` (`number`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`fpl_id` text NOT NULL,
	`team_id` text NOT NULL,
	`captaincy_chips_used` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `playoff_ties` (
	`tie_id` text PRIMARY KEY NOT NULL,
	`round_name` text NOT NULL,
	`round_type` text NOT NULL,
	`home_team_id` text,
	`away_team_id` text,
	`home_aggregate` integer DEFAULT 0 NOT NULL,
	`away_aggregate` integer DEFAULT 0 NOT NULL,
	`winner_id` text,
	`loser_id` text,
	`gw1` integer NOT NULL,
	`gw2` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loser_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`fixture_id` text NOT NULL,
	`team_id` text NOT NULL,
	`home_score` integer NOT NULL,
	`away_score` integer NOT NULL,
	`home_match_points` integer NOT NULL,
	`away_match_points` integer NOT NULL,
	`home_got_bonus` integer DEFAULT false NOT NULL,
	`away_got_bonus` integer DEFAULT false NOT NULL,
	`home_used_double_pointer` integer DEFAULT false NOT NULL,
	`away_used_double_pointer` integer DEFAULT false NOT NULL,
	`home_player_scores` text,
	`away_player_scores` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`fixture_id`) REFERENCES `fixtures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `results_fixture_id_unique` ON `results` (`fixture_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text NOT NULL,
	`password` text NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`group_id` text NOT NULL,
	`league_points` integer DEFAULT 0 NOT NULL,
	`bonus_points` integer DEFAULT 0 NOT NULL,
	`double_pointer_set1_used` integer DEFAULT false NOT NULL,
	`challenge_chip_set1_used` integer DEFAULT false NOT NULL,
	`win_win_set1_used` integer DEFAULT false NOT NULL,
	`double_pointer_set2_used` integer DEFAULT false NOT NULL,
	`challenge_chip_set2_used` integer DEFAULT false NOT NULL,
	`win_win_set2_used` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);