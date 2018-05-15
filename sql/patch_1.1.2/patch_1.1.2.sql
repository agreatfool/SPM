CREATE TABLE `spm_global_secret` (
`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
`secret` text NOT NULL);

CREATE TABLE `spm_package_secret_copy` (
`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
`pid` integer NOT NULL,
`secret` text NOT NULL
);
INSERT INTO `spm_package_secret_copy` ( `secret`, `pid` )
	SELECT `t1`.`secret`, `t2`.`id`
	FROM `spm_package_secret` `t1`, `spm_package` `t2`
	WHERE `t1`.`name` = `t2`.`name`;
DROP TABLE `spm_package_secret`;
ALTER TABLE `spm_package_secret_copy` RENAME TO `spm_package_secret`;

CREATE TABLE `spm_package_version_copy` (
`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
`pid` integer NOT NULL,
`major` integer NOT NULL,
`minor` integer NOT NULL,
`patch` integer NOT NULL,
`file_path` text NOT NULL,
`time` integer NOT NULL,
`dependencies` text NOT NULL
);
INSERT INTO `spm_package_version_copy` ( `major`, `minor`, `patch`, `file_path`, `time`, `dependencies`, `pid` )
	SELECT `t1`.`major`, `t1`.`minor`, `t1`.`patch`, `t1`.`file_path`, `t1`.`time`, `t1`.`dependencies`, `t2`.`id`
	FROM `spm_package_version` `t1`, `spm_package` `t2`
	WHERE `t1`.`name` = `t2`.`name`;
DROP TABLE `spm_package_version`;
ALTER TABLE `spm_package_version_copy` RENAME TO `spm_package_version`;
