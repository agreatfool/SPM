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
