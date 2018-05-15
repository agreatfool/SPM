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
所有命令的主命令均为`sasdn-pm`，子命令以及说明如下

##### 2.2.1.1 installed
显示包管理工具下所有已安装的 proto 包名与版本号，以及依赖的包。

```
> sasdn-pm installed -h

  Usage: sasdn-pm-installed [Options] [package]

  show all installed proto or specific proto


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.2 list
列出中心节点所有的 proto 包名与描述

```
> sasdn-pm list -h

  Usage: sasdn-pm-list [Options]

  show all remote proto


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.3 search
通过关键字在中心节点搜索匹配的 proto 包。

```
> sasdn-pm search -h

  Usage: sasdn-pm-search [Options] <<package>[@version]>

  search proto from spm server


  Options:

    -V, --version     output the version number
    -i, --info        add -i to show proto version info of specific proto package
    -d, --dependence  add -d to show dependences of specific version proto, default is latest
    -h, --help        output usage information
```

##### 2.2.1.4 install
从中心节点安装指定的 proto 包，不填写包名，则通过根目录spm.json安装所有依赖

```
> sasdn-pm install -h

  Usage: sasdn-pm-install [Options] [<package>[@version]]

  install proto from spm server


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.5 uninstall
卸载本地已安装的 proto 包，只能卸载顶级依赖

```
> sasdn-pm uninstall -h

  Usage: sasdn-pm-uninstall [Options] <package>

  uninstall local proto


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.6 publish
将根目录下 proto 文件夹与包管理配置文件 spm.json 打包成 proto 包并发布到中心节点服务

```
> sasdn-pm publish -h

  Usage: sasdn-pm-publish [Options]

  publish proto dir to spm server


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.7 secret
向中心节点申请获取 secret，并更新到本地文件

```
> sasdn-pm secret -h

  Usage: sasdn-pm-secret [Options]

  set secret key in spm commander


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.8 check
检测本地的依赖包是否和线上的最新版本一致，如果不一致，则警告

```
> sasdn-pm check -h

  Usage: sasdn-pm-check [Options]

  check if version of packages installed in local is latest


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.9 update
将顶级依赖升级到可兼容的最新版本（minor 号和 patch 号最高），不填包名，则将所有顶级依赖升级到可兼容的最新版本

```
> sasdn-pm update -h

  Usage: sasdn-pm-update [Options] [package]

  update proto to latest version


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
```

##### 2.2.1.10 delete
删除中心节点的包

```
> sasdn-pm delete -h

  Usage: sasdn-pm-delete [Options] <package>

  delete proto package in spm server


  Options:

    -V, --version  output the version number
    -h, --help     output usage information
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

#### 2.3.1 覆盖安装方案
* 假设当前应用程序为`a`，另有一个依赖包（微服务）为`m`
* `a`在之前的依赖安装中将`m`安装为`1.x.x`版本
* SPM上的`m`已经升级到了`2.x.x`版本
* 此时可能会有两种情况：
	1. 开发环境下，`m`的`1.x.x`的版本是没有单独进行部署的，只有一份最新的`2.x.x`是有部署运行的
	2. 真实生产环境下，`m`的`2.x.x`和`1.x.x`两个版本都会在生产环境上共存
* 当前的例子选择`情况1`，只有最新版本的运行实例存在
* 在这种情况下，要想`a`成功调用`m`对应微服务的接口而不出错，`a`需要覆盖安装`m`依赖，并且根据`m`的`spm.json`中的`changeLog`修改可能造成冲突的代码

#### 2.3.2 重命名新包方案
* 考虑`情况2`：真实生产环境下，依赖包（微服务）`m`的`2.x.x`和`1.x.x`两个版本都会在生产环境上共存
* 应用程序`a`依赖`1.x.x`版本的`m`，应用程序`b`依赖`a`
* 在`b`的开发过程中，需要依赖`2.x.x`版本的`m`，且同时需要依赖`a`
* 此时`b`直接依赖`2.x.x`版本的`m`，通过依赖`a`间接依赖`1.x.x`版本的`m`，产生版本冲突
* 这种情况下，需要将`b`直接依赖的`m`重命名为`m__v2`。

### 2.4 权限控制
权限控制分为仓库密钥(Repository Secret)控制和管理员密码(Admin Password)控制

#### 2.4.1 Repository Secret
每个仓库都要申请一个仓库密钥，用来发布新版的 proto 包。具体流程如下：

* 创建微服务代码库
* 在代码库根目录下使用`sasdn-pm secret`申请该仓库的秘钥，秘钥会以文件的形式（./.spmlrc）保存在该仓库的根目录下
* 后续发布命令`sasdn-pm publish`会读取该仓库根目录下的秘钥文件，如果文件不存在则无法进行发布操作

#### 2.4.2 Admin Password
* 管理员密码在初始化数据库表`spm_global_secret`时手动填入，之后每次执行`sasdn-pm delete`
操作，都会校验该密码
* 通常只有一个管理员用户拥有管理员密码，若其它人想要删除中心节点的 proto 包，需要通知管理员，让其帮助删除

### 2.5 备注（未开发）
1. 包备份脚本( crontab )
2. 用户模块
3. 用户密钥生成
