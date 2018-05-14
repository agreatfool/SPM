CREATE TABLE `spm_package_version_copy` (
`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
`name` text NOT NULL,
`major` integer NOT NULL,
`minor` integer NOT NULL,
`patch` integer NOT NULL,
`file_path` text NOT NULL,
`time` integer NOT NULL,
`dependencies` text NOT NULL,
`state` integer NOT NULL DEFAULT 1);
INSERT INTO `spm_package_version_copy` ( `id`, `name`, `major`, `minor`, `patch`, `file_path`, `time`, `dependencies` )
	SELECT `id`, `name`, `major`, `minor`, `patch`, `file_path`, `time`, `dependencies` FROM `spm_package_version`;
DROP TABLE `spm_package_version`;
ALTER TABLE `spm_package_version_copy` RENAME TO `spm_package_version`;
