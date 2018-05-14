CREATE TABLE `spm_package_copy` (
`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
`name` text NOT NULL,
`description` text NOT NULL DEFAULT ( 'no description' ),
`state` integer NOT NULL DEFAULT 1);
INSERT INTO `spm_package_copy` ( `name`, `description` )
	SELECT `name`, `description` FROM `spm_package`;
DROP TABLE `spm_package`;
ALTER TABLE `spm_package_copy` RENAME TO `spm_package`;