# SPM 包管理工具

> SPM 包管理工具是一个用于管理 SASDN 微服务的 proto 包的工具，主要由两部分组成：中心节点服务，客户端命令行工具。本文档旨在介绍包管理工具的约定与设计。

---

## 1. 约定
### 1.1 版本号约定
SPM 包管理工具中管理的 proto 包的版本号使用 Semantic Versioning 2.0 进行规范。[参考](http://semver.org/lang/zh-CN/)

* 版本格式：主版本号.次版本号.修订号
* 版本号递增规则如下：
	* 主版本号：改动中做了`不向下兼容`的 API 修改
	* 次版本号：改动中做了`向下兼容`的功能性新增
	* 修订号：改动中做了`向下兼容`的问题修正

### 1.2 文件结构
每一个微服务项目的文件结构如下：

```
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
```

每一个微服务项目的根目录下都会有两个文件夹：proto 和 spm_protos
* proto文件夹：用于存放项目中自编写的proto文件。
    > 约定：请根据 spm.json 的 name 字段创建文件夹，并将自编写的 proto 文件放在这个文件夹内。即如果在proto文件中有定义包结构的话，包的根节点名必须和项目名一致。
* spm_protos文件夹：用于存放通过包管理软件下载安装的protos文件   

每一个微服务项目的根目录下都会有一个包管理配置文件：spm.json

```
{
    "name": "demo",         // 微服务 proto 包名
    "version": "1.0.0",     // 微服务 proto 包版本号，定义参考`版本号约定`
    "description": "demo description",    // 微服务 proto 包描述
    "dependencies": {       // 微服务 proto 包依赖
        "pay": "1.0.0"
        "user": "2.0.0"
    }
}
```

### 1.3 依赖关系

* 顶级依赖：直接被当前微服务项目依赖的 proto 包，通过根目录下 spm.json 进行管理
* 次级依赖：未被当前微服务项目依赖的 proto 包，但一定被 spm_protos 文件夹内其他 proto 包依赖

## 2. 使用 SPM 包管理工具
### 2.1 中心节点服务
#### 2.1.1 运行环境

* Node 8.x+
* NPM 5.x+
* Sqlite3

#### 2.1.2 数据库
使用数据库: sqlite3

```
CREATE TABLE spm_package (
  id            INTEGER   NOT NULL      PRIMARY KEY AUTOINCREMENT,
  name          TEXT      NOT NULL,
  description   TEXT      NOT NULL
);

CREATE TABLE spm_package_version (
  id            INTEGER   NOT NULL      PRIMARY KEY AUTOINCREMENT,
  pid           INTEGER   NOT NULL,
  major         INTEGER   NOT NULL,
  minor         INTEGER   NOT NULL,
  patch         INTEGER   NOT NULL,
  filePath      TEXT      NOT NULL,
  time          INTEGER   NOT NULL,
  dependencies  TEXT      NOT NULL
);

CREATE TABLE spm_package_secret (
  id            INTEGER   NOT NULL      PRIMARY KEY AUTOINCREMENT,
  pid           INTEGER   NOT NULL,
  secret        TEXT      NOT NULL
);

CREATE TABLE spm_global_secret (
  id            INTEGER   NOT NULL      PRIMARY KEY AUTOINCREMENT,
  secret        TEXT      NOT NULL
);
 ```
    
> 数据库 Spm.db 存放在 sasdn-pm 中心节点服务的根目录下

#### 2.1.3 启动服务
进入到sasdn-pm项目根目录，运行命令

```
npm start
```
    
### 2.2 客户端命令行工具

#### 2.2.1 命令行

包管理工具下所有已安装的 proto 包名与版本号，以及依赖的包。

```
sasdn-pm installed [包名]                   // 如果输入包名，则查询特定包名的已安装的包，否则查询所有已安装的包
```

列出中心节点所有的 proto 包名与描述

```
sasdn-pm list
```

通过关键字在中心节点搜索匹配的 proto 包。

```
sasdn-pm search [包名<@version>] [-i --info] [-d --dependence]
// 如果输入包名，则从中心节点查询特定包名的包，否则查询所有在中心节点注册的包
// 启用 -i 参数，则是通过精确查找包名，并返回该包所有的版本（此种模式下必须输入包名），如果指定了版本（@latest 为最新版本），则仅显示指定版本的信息
// -d 参数必须和 -i 参数配合使用，返回特定包名的包的依赖包以及版本信息
```

从中心节点安装指定的 proto 包，不填写包名，则通过根目录spm.json安装所有依赖

```
sasdn-pm install [包名<@version>]      // XXX@1.0.0, 则是指定安装XXX包的1.0.0版本
```

卸载本地已安装的 proto 包，只能卸载顶级依赖

```
sasdn-pm uninstall 包名
```

将根目录下 proto 文件夹与包管理配置文件 spm.json 打包成 proto 包并发布到中心节点服务

```
sasdn-pm publish
```
    
向中心节点申请获取 secret，并更新到本地文件

```
sasdn-pm secret
```

检测本地的依赖包是否和线上的最新版本一致，如果不一致，则警告

```
sasdn-pm check
```

将顶级依赖升级到可兼容的最新版本（minor 号和 patch 号最高），不填包名，则将所有顶级依赖升级到可兼容的最新版本

```
sasdn-pm update [包名]
```

删除中心节点的包

```
sasdn-pm delete [包名] [用户密码]
```

#### 2.2.2 Proto 包的安装流程设计

* 安装的 proto 包在 spm_proto 下不存在：
  * 直接安装
* 安装的 proto 包的主版本号和已安装的 proto 包的主版本号不同
  * 主版本号低于后者，采用`重命名新包方案`安装。
  * 主版本号高于后者，警告并询问使用者采用`覆盖安装方案`还是采用`重命名新包方案`安装。
* 安装的 proto 包的主版本号与已经安装 proto 包的主版本号相同
  * 次版本号和修订号，低于后者，由于版本向下兼容的特性，不安装该版本。
  * 次版本号和修订号，高于或等于后者，则将新安装的 proto 包进行覆盖安装。

### 2.3 版本冲突
通过 SPM 包管理工具下载安装 proto 包的过程中可能存在版本冲突，即本地 proto 包和将要安装的 proto 包的 major 版本不一致，有以下几种情况：
1. 覆盖安装方案：开发过程中，a 包依赖 m 包的 1.x.x 版本。中心节点的 m 包已经升级到了 2.x.x 版本。若此时实际运行的 m 包对应的微服务是 2.x.x 版本的，
要想 a 包对应微服务成功调用 m 包对应微服务的接口而不出错，a 包需要覆盖安装 m 包依赖，并且根据 m 包 `spm.json` 中的 `changeLog` 修改引起冲突的代码。
2. 重命名新包方案：存在这种情况，线上正在运行的一个微服务 m 的版本是 1.x.x，并且正在运行的另一个微服务 a 依赖 1.x.x 版本的 m 微服务。
开发过程中，微服务 m 升级到了 2.x.x 版本，并且微服务 b 依赖 2.x.x 版本的微服务 m，以及依赖 1.x.x 版本的微服务 m 的微服务 a。此时微服务 b
直接依赖 1.x.x 版本的微服务 m，（通过微服务 a）间接依赖 2.x.x 版本的微服务 m。这种情况下，需要将 b 直接依赖的 m 包重命名为 m__v2。

### 2.4 secret 说明

secret 共分为两类，每个 proto 包带有的 secret 和全局 secret
* proto 包带有的 secret 通过执行 `sasdn-pm secret` 命令在中心节点生成并更新到本地 proto 包的文件中，之后每次执行 `sasdn-pm publish`
操作，都会校验该 secret
* 全局 secret 在初始化数据库表 `spm_global_secret` 时手动填入，之后每次执行 `sasdn-pm delete [包名] [用户密码]`
操作，都会校验该 secret
* 通常只有一个 admin 用户拥有全局 secret，若其它人想要删除中心节点的 proto 包，需要通知 admin 用户，让其帮助删除

### 2.5 备注（未开发）
1. 包备份脚本( crontab )
2. 用户模块
3. 用户密钥生成
