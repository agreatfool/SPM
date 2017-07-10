# SPM 项目

---

## 功能描述
1. 本地spm命令行工具
2. 远程spm服务器代码

## SPM命令行

	* spm help         							            // 命令帮助工具
	* spm version     							            // 显示版本号
	* spm list            						          // 显示本地依赖包结构与版本
	* spm search [--keyword 关键字@<version>] 	  // 从中心节点搜索依赖包名
	* spm install [--name spm包名@<version>]    // 从中心节点安装依赖包 
	* spm uninstall [--name spm包名@<version>]  // 卸载包
	* spm secret [--secret 密钥]                // 设置密钥
	* spm publish [--import spm包本地路径(包含spm.json)]	      // 将proto文件夹中的模块发布到中心节点
	
## SPM服务器

### 数据库
db: sqlite3

    CREATE TABLE SpmPackage (
      id      INTEGER   NOT NULL      PRIMARY KEY,
      name    TEXT      NOT NULL
    );
    
    CREATE TABLE SpmPackageVersion (
      id      INTEGER   NOT NULL      PRIMARY KEY,
      pId     INT       NOT NULL,
      major   INT       NOT NULL,
      minor   INT       NOT NULL,
      patch   INT       NOT NULL,
      path    INT       NOT NULL,
      time    INT       NOT NULL
    );

### API

### BASH脚本
1. 服务器启动脚本
2. 包备份脚本( crontab )