# filefront-arena

实时多人 CLI 文件攻防战。玩家分红蓝两队，在虚拟文件系统里侦察、破解、防守、干扰并争夺对方 token。

所有命令只操作游戏内存里的虚拟沙盒，不读取或修改真实系统文件。

## Install

只支持全局安装这一种玩家用法：

```bash
npm install -g github:JieteXue/filefront-arena
```

需要 Node.js 20+。正常安装 Node.js 后会自带 `npm`。

以后更新也用同一个包位置，不会堆多个副本：

```bash
filefront update
```

本地配置 `filefront.config.local.json` 不会被更新覆盖。

## Setup

第一次运行：

```bash
filefront setup
```

它会生成本地配置：

```text
filefront.config.local.json
```

首次运行会先提示填写 `Default server host/IP`。`Host game server` 默认是 `no`；普通玩家不需要开启服务器。

只修改本地配置时运行：

```bash
filefront config
```

它不会安装依赖，只会打开配置菜单。输入编号只修改对应设置，直接输入 `s` 保存。

这个文件只保存在你运行命令的目录，已经加入 `.gitignore`，不要提交。它会记录默认连接地址、玩家名、队伍、窗口模式，以及可选的服务器配置。

## Start Server

在作为服务端的机器上运行：

```bash
filefront server
```

默认监听 `0.0.0.0:31337`，局域网或服务器上的其他玩家可以连接。

## Join Game

玩家运行：

```bash
filefront join
```

默认会按本地配置连接 server，并尽量打开三个窗口：

- `OP`：输入游戏命令
- `INFO`：比赛状态和广播信息
- `OPS`：本队操作记录

## Local Config

示例：

```json
{
  "server": {
    "enabled": false,
    "host": "0.0.0.0",
    "port": 31337,
    "duration": 20
  },
  "client": {
    "host": "SERVER_LAN_IP",
    "port": 31337,
    "name": "alice",
    "team": "red",
    "mode": "split"
  }
}
```

`SERVER_LAN_IP` 换成服务端机器的局域网 IP、云服务器公网 IP 或域名。同一台电脑测试用 `localhost`。

## Game Commands

```text
help
pwd
ls
cd <path>
cat <file>
grep <term> <path>
scan <red|blue>
crack <perimeter|logs|vault>
plant <path>
clean <path>
harden <perimeter|logs|vault>
submit <token>
chat <message>
score
```

## Rules

- 每队最多 5 人。
- `/vault/token.txt` 是最终目标，初始不可读取。
- 正确提交对方 token 立即获胜。
- 时间结束按分数判胜。
- 错误提交 token 会扣分。

## Notes

- 如果别人连不上 server，通常是防火墙或服务器安全组没有放行 TCP `31337`。
- 如果 `filefront join` 没法自动打开多个窗口，它会打印备用命令。
