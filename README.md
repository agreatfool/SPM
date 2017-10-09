# SPM 包管理工具

> SPM 包管理工具是一个用于管理 SASDN 微服务的 proto 包的工具，主要由两部分组成：中心节点服务，客户端命令行工具。本文档旨在介绍包管理工具的约定与设计。

---

## 约定
### 版本号约定
SPM 包管理工具中管理的 proto 包的版本号使用 Semantic Versioning 2.0 进行规范。[参考](http://semver.org/lang/zh-CN/)

* 版本格式：主版本号.次版本号.修订号
* 版本号递增规则如下：
	* 主版本号：改动中做了`不向下兼容`的 API 修改
	* 次版本号：改动中做了`向下兼容`的功能性新增
	* 修订号：改动中做了`向下兼容`的问题修正
	
### 文件结构
每一个微服务项目的文件结构如下：

	├── spm.json
	├── proto
	│   ├── book
	│   │   ├── book.proto
	├── spm_protos
	│   ├── pay                   			
	│   │   ├── pay.proto
	│   │   ├── spm.json
	│   ├── user
	│   │   ├── user.proto
	│   │   ├── spm.json
	│   ├── user__v2 
	│   │   ├── user.proto
	│   │   ├── spm.json

每一个微服务项目的根目录下都会有两个文件夹：proto 和 spm_protos
* proto文件夹：用于存放项目中自编写的proto文件。
    > 约定：请根据 spm.json 的 name 字段创建文件夹，并将自编写的 proto 文件放在这个文件夹内。
* spm_protos文件夹：用于存放通过包管理软件下载安装的protos文件   

每一个微服务项目的根目录下都会有一个包管理配置文件：spm.json

	{
		"name": "demo",         // 微服务 proto 包名
		"version": "1.0.0",     // 微服务 proto 包版本号，定义参考`版本号约定`
		"description": "demo description",    // 微服务 proto 包描述
		"dependencies": {       // 微服务 proto 包依赖
			"pay": "1.0.0"  
			"user": "2.0.0"  
		}
	}

> 其中pay依赖user版本1.0.0，参考./spm_protos/pay/spm.json

### 依赖关系

* 顶级依赖：直接被微服务项目依赖的 proto 包，通过根目录下 spm.json 进行管理
* 次级依赖：未被微服务项目依赖的 proto 包，但一定被 spm_protos 文件夹内其他 proto 包依赖

## 使用 SPM 包管理工具

### 中心节点服务

#### 运行环境

* Node 8.x+
* NPM 5.x+
* Sqlite3

#### 数据库
使用数据库: sqlite3

    CREATE TABLE spm_package (
      id            INTEGER   NOT NULL      PRIMARY KEY,
      sid           INTEGER   NOT NULL,
      name          TEXT      NOT NULL,
      description   TEXT      NOT NULL
    );
    
    CREATE TABLE spm_package_version (
      id            INTEGER   NOT NULL      PRIMARY KEY,
      pid           INT       NOT NULL,
      major         INT       NOT NULL,
      minor         INT       NOT NULL,
      patch         INT       NOT NULL,
      filePath      TEXT      NOT NULL,
      time          INT       NOT NULL,
      dependencies  TEXT      NOT NULL
    );
    
    CREATE TABLE spm_package_secret (
      id            INTEGER   NOT NULL      PRIMARY KEY,
      name          TEXT      NOT NULL,
      secret        TEXT      NOT NULL
    );
    
> 数据库 Spm.db 存放在 sasdn-pm 中心节点服务的根目录下

#### 启动服务
进入到sasdn-pm项目根目录，运行命令

    npm start
    
### 客户端命令行工具

#### 命令行

包管理工具下所有已安装的 proto 包名与版本号。

    sasdn-pm list
    				  
通过关键字在中心节点搜索匹配的 proto 包。
    
    sasdn-pm search 关键字 [-i --info]     // 启用 -i 参数，则是通过精确查找包名，并返回该包所有的版本
     
从中心节点安装指定的 proto 包，不填写包名，则通过根目录spm.json安装所有依赖
    
    sasdn-pm install [包名<@version>]      // XXX@1.0.0, 则是指定安装XXX包的1.0.0版本
    
卸载本地已安装的 proto 包，只能卸载顶级依赖
    
    sasdn-pm uninstall 包名
    
将根目录下 proto 文件夹与包管理配置文件 spm.json 打包成 proto 包并发布到中心节点服务
   
    sasdn-pm publish
    
向中心节点申请获取 secret，并更新到本地文件

    sasdn-pm secret

#### Proto 包的安装流程设计

* 安装的 proto 包在 spm_proto 下不存在：
  * 直接安装
* 安装的 proto 包的主版本号和已安装的 proto 包的主版本号不同
  * 作为`版本冲突安装方案`进行安装。	
* 安装的 proto 包的主版本号与已经安装 proto 包的主版本号相同
  * 次版本号和修订号，低于后者，由于版本向下兼容的特性，不安装该版本。
  * 次版本号和修订号，高于或等于后者，则将新安装的 proto 包进行`覆盖安装`。

### 版本冲突
通过 SPM 包管理工具下载安装 proto 包的过程中可能存在版本冲突，即两个 proto 包会同时依赖同一个 proto 包的多个不同版本，所以在 spm_protos 文件夹下会使用两种安装方案处理冲突。

* 默认安装方案：不携带版本号的文件夹
* 版本冲突安装方案：新安装的 proto 包使用携带版本号的文件夹，格式：proto 包名__v主版本号

### 备注（未开发）
1. 包备份脚本( crontab )
2. 用户模块
3. 用户密钥生成