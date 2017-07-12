# SPM 项目

---

## 版本格式
proto 管理工具的版本定义使用 Sem Ver 定义

* 版本格式：主版本号.次版本号.修订号
* 版本号递增规则如下：
	* 主版本号：改动中做了不兼容的 API 修改
	* 次版本号：改动中做了向下兼容的功能性新增
	* 修订号：改动中做了向下兼容的问题修正
	
## 版本依赖
每一个微服务的根目录下都会有两个文件夹：proto 和 spm_protos

* proto文件夹：用于存放当前微服务的`业务proto包`
* spm_protos文件夹：用于存放`外部依赖proto包`
每个 proto 包下都会有一个依赖配置文件：spm.json

举例：

	// proto/book/spm.json
	{
		"name": "book",
		"version": "1.0.0",
		"dependencies": {
			"user": "1.0.0"，
			"pay": "1.0.0"
		}
	}

	// spm_protos/pay/spm.json
	{
		"name": "pay",
		"version": "1.0.0",
		"dependencies": {
			"user": "2.0.0"
		}
	}

	// spm_protos/user/spm.json
	{
		"name": "user",
		"version": "1.0.0",
		"dependencies": {
			"extra": "1.0.0"
		}
	}

## 模块安装

### 版本冲突
由于版本依赖中存在版本冲突：即两个 proto 会同时依赖一个 proto 的多个版本，所以在spm_protos文件夹下会有两种显示方法：

* 携带版本号的proto包，格式：包名_主版本号：
	* 肯定被spm_protos下的proto包依赖
	* 肯定存在同名不同版本的其他proto包
* 不携带版本号的proto包
	* 肯定直接被业务proto包依赖
	* 可能存在同名不同版本的其他proto包，

### 安装流程
一个微服务的所有proto包的外部依赖都会安装在spm_protos文件夹下：

	* 当安装的依赖包版本号与已经安装的依赖包版本号完全相同，则不安装，直接使用已经安装的依赖包
	* 当安装的依赖包在spm_proto下不存在：
		* 如果是通过spm.json安装，如果同时安装的所有依赖中，存在同名，不同版本的依赖，则其中被依赖次数最多的依赖包不需要携带版本号安装，其他版本都需要携带版本号。
		* 如果是通过spm install安装的，则直接安装，包名不需要携带版本号。
	* 当安装的依赖包的主版本号与已经安装依赖包的主版本号相同
		* 次版本号和修订号，低于后者，由于版本向下兼容的特性，不安装该依赖包，直接使用该依赖包。
		* 次版本号和修订号，高于后者，则将前者覆盖后者。
	* 当安装的依赖包的主版本号与已经安装的依赖包的主版本号不同
		* 则作为携带版本号的依赖包安装。
		
文件夹结构如下：

	├── spm.json                        # 当前项目使用的 proto 依赖（仅对proto有效）             
	├── proto              
	│   ├── book                   			# 以 proto 的 package 名作为文件夹名
	│   │   ├── book.proto              	# book.proto 文件，package名为：com.book
	│   │   ├── bookCategory.proto          # bookCategory.proto 文件，package名为：com.book
	│   │   ├── spm.json             		# 当前文件夹内所有 proto 文件的外部依赖配置 
	├── spm_protos
	│   ├── pay                   			# book包的外部依赖：pay包，由于外部依赖的user包版本冲突，所以spm工具会处理代码修改。
	│   │   ├── pay.proto               	# 
	│   │   ├── spm.json              		#                        	
	│   ├── user                   			# book包的外部依赖：user包
	│   │   ├── user.proto               	# 
	│   │   ├── spm.json              		# 
	│   ├── user_2                   		# pay包的外部依赖：user包，但由于已经存在版本冲突的user包，所以由spm工具处理文件改名
	│   │   ├── user.proto               	# 
	│   │   ├── spm.json              		# 
	│   ├── extra                   		# user包，user_2包的外部依赖：extra包
	│   │   ├── extra.proto               # 
	│   │   ├── spm.json              		# 
	
	
## 功能描述
1. 本地spm命令行工具
2. 远程spm服务器代码

## SPM命令行

	* spm help         							            // 命令帮助工具
	* spm version     							            // 显示版本号
	* spm list            						          // 显示本地依赖包结构与版本
	* spm search [--keyword 关键字] 	            // 从中心节点搜索依赖包名
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

