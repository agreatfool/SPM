CREATE TABLE `spm_package_secret_copy` (
`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
`name` text NOT NULL,
`secret` text NOT NULL ,
`state` integer NOT NULL DEFAULT 1);
INSERT INTO `spm_package_secret_copy` ( `name`, `secret` )
	SELECT `name`, `secret` FROM `spm_package_secret`;
DROP TABLE `spm_package_secret`;
ALTER TABLE `spm_package_secret_copy` RENAME TO `spm_package_secret`;
