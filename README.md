# filefront-arena

实时多人 CLI 文件攻防战。玩家分为红蓝两队，通过交互式终端连接同一个 server，在虚拟文件系统里侦察、破解、防守、投放干扰并争夺对方 token。

这个游戏只模拟系统攻防：`ls`、`cat`、`grep`、`crack`、`plant` 等命令都只操作内存中的虚拟沙盒，不读取或修改玩家机器上的真实文件。

## Requirements

- Node.js 20 或更新版本。
- npm/npx。正常安装 Node.js 后会自带 npm 和 npx。
- 能访问 GitHub。`npx github:JieteXue/filefront-arena ...` 会从 GitHub 拉取项目。
- 能访问 npm registry。第一次运行会自动安装 `socket.io` / `socket.io-client`。
- 玩家可以用 `npx` 直接从 GitHub 启动，也可以 clone 本项目后本地运行。
- 如果跨机器联机，server 所在机器需要允许其他电脑访问 `31337` 端口。

检查环境：

```bash
node -v
npm -v
npx -v
```

如果 `node -v` 低于 20，建议升级 Node.js。

安装 Node.js：

macOS Homebrew：

```bash
brew install node
```

Windows：

- 推荐安装 Node.js LTS：https://nodejs.org/
- 安装后重新打开 PowerShell 或 Windows Terminal。

Ubuntu/Debian：

```bash
sudo apt update
sudo apt install nodejs npm
```

系统源里的 Node.js 可能偏旧；如果版本低于 20，建议使用 nvm 或 NodeSource 安装新版 Node.js。

## One-Line Install

全局安装一次，以后直接使用 `filefront` 命令：

```bash
npm install -g github:JieteXue/filefront-arena
```

安装后启动客户端：

```bash
filefront client --server http://SERVER_IP:31337 --name alice --team red
```

macOS 三窗口客户端：

```bash
filefront split --server http://SERVER_IP:31337 --name alice --team red
```

不想全局安装，也可以每次直接用 `npx`：

```bash
npx -y github:JieteXue/filefront-arena client --server http://SERVER_IP:31337 --name alice --team red
```

`SERVER_IP` 必须手动替换：

- 和 server 在同一台电脑：用 `localhost`
- 连接局域网里的另一台 server：用服务端机器的局域网 IP，例如 `192.168.1.23`
- 连接云服务器：用云服务器公网 IP 或域名

例子：

```bash
npx -y github:JieteXue/filefront-arena#v0.1.1 client --server http://localhost:31337 --name alice --team red
```

安装依赖：

```bash
cd /path/to/filefront-arena
npm install
```

## Server

任选一台机器作为服务端。服务端只运行比赛状态和虚拟沙盒，不需要玩家在这台机器上操作。

局域网或服务器部署时，监听所有网卡：

```bash
npm run server -- --host 0.0.0.0 --port 31337 --duration 20
```

或使用一行 GitHub 启动：

```bash
npx github:JieteXue/filefront-arena server --host 0.0.0.0 --port 31337 --duration 20
```

只在本机测试时，可以监听本机：

```bash
npm run server -- --host 127.0.0.1 --port 31337 --duration 20
```

参数：

- `--host`：监听地址。联机通常用 `0.0.0.0`。
- `--port`：端口，默认示例使用 `31337`。
- `--duration`：比赛分钟数，例如 `20` 表示 20 分钟。

服务端启动后会显示：

```bash
filefront-arena server listening on http://0.0.0.0:31337
```

## Find Server Address

同一台电脑测试时，客户端使用：

```text
http://localhost:31337
```

局域网联机时，客户端要使用服务端机器的局域网 IP。

macOS：

```bash
ipconfig getifaddr en0
```

如果使用有线网，可能是：

```bash
ipconfig getifaddr en1
```

Linux：

```bash
hostname -I
```

或：

```bash
ip addr
```

Windows PowerShell：

```powershell
ipconfig
```

查看当前网络适配器里的 `IPv4 Address`。假设服务端 IP 是 `127.0.0.1`，客户端连接地址就是：

```text
http://127.0.0.1:31337
```

## Client

### macOS

推荐使用 split 模式。它会自动打开三个 Terminal 窗口：

- `OP`：操作窗口，输入命令。
- `INFO`：比赛状态、广播、错误、比赛结束。
- `OPS`：本队所有人的操作记录，只显示谁执行了什么命令。

```bash
cd /path/to/filefront-arena
npm run client:split -- --server http://192.168.1.23:31337 --name alice --team red
```

蓝队示例：

```bash
npm run client:split -- --server http://192.168.1.23:31337 --name bob --team blue
```

如果 macOS 第一次弹出 Terminal 自动化权限，请允许。若不想自动开窗口，也可以手动开三个终端：

```bash
npm run client -- --server http://192.168.1.23:31337 --name alice --team red --ui native
npm run client -- --server http://192.168.1.23:31337 --name alice-info --team red --ui monitor --watch
npm run client -- --server http://192.168.1.23:31337 --name alice-ops --team red --ui monitor --ops
```

### Linux

Linux 默认不自动打开多个终端。建议手动开三个终端窗口或标签页：

```bash
cd /path/to/filefront-arena
npm run client -- --server http://192.168.1.23:31337 --name alice --team red --ui native
```

信息窗口：

```bash
npm run client -- --server http://192.168.1.23:31337 --name alice-info --team red --ui monitor --watch
```

队内操作日志窗口：

```bash
npm run client -- --server http://192.168.1.23:31337 --name alice-ops --team red --ui monitor --ops
```

### Windows

在 PowerShell 或 Windows Terminal 中运行。建议打开三个标签页：

```powershell
cd C:\path\to\filefront-arena
npm run client -- --server http://192.168.1.23:31337 --name alice --team red --ui native
```

信息窗口：

```powershell
npm run client -- --server http://192.168.1.23:31337 --name alice-info --team red --ui monitor --watch
```

队内操作日志窗口：

```powershell
npm run client -- --server http://192.168.1.23:31337 --name alice-ops --team red --ui monitor --ops
```

## Firewall And Deployment

局域网：

- 服务端机器启动时使用 `--host 0.0.0.0`。
- macOS 第一次运行可能提示是否允许 Node.js 接收入站连接，请允许。
- Windows Defender Firewall 可能需要允许 Node.js 或打开 TCP `31337`。
- Linux 如果启用了防火墙，需要放行 TCP `31337`。

Linux `ufw` 示例：

```bash
sudo ufw allow 31337/tcp
```

云服务器：

- 在云厂商安全组里开放 TCP `31337`。
- 服务端运行：

```bash
npm run server -- --host 0.0.0.0 --port 31337 --duration 20
```

- 玩家连接：

```bash
npm run client -- --server http://YOUR_SERVER_PUBLIC_IP:31337 --name alice --team red --ui native
```

## Troubleshooting

- `ECONNREFUSED`：server 没启动，端口不对，或地址写错。
- 能本机连接但别人连不上：服务端没有用 `--host 0.0.0.0`，或防火墙/路由器挡住了端口。
- `npm error enoent Could not read package.json`：没有进入项目目录。先 `cd /path/to/filefront-arena`。
- macOS `client:split` 没打开窗口：检查 Terminal 自动化权限，或改用手动三窗口命令。
- 不同网络的玩家无法连接你的电脑：需要云服务器、公网 IP、端口转发，或 VPN/内网穿透。

## Commands

```text
help
pwd
ls [-a] [path]
cd <path>
cat <file>
grep <term> <path>
find [path] [term]
tree [-a] [path]
head [-n count] <file>
tail [-n count] <file>
touch <file>
mkdir <path>
rm <path>
cp <from> <to>
mv <from> <to>
chmod <mode> <path>
sudo <command>
su [user]
id
groups
uname [-a]
date
uptime
df
du [path]
wc <file>
echo [text]
man [command]
which <command>
alias
whoami
hostname
env
ps
kill <pid>
history
clear
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
- `scan` 查看目标队伍的攻击面。
- `crack` 推进对方 `perimeter`、`logs`、`vault` 的破解进度。
- `harden` 增加己方攻击面的防御等级。
- `plant` 在对方虚拟目录里放入干扰日志。
- `clean` 移除己方被投放的干扰文件并得分。
- `submit <token>` 提交对方 token，正确则立即获胜。
- 倒计时结束时，按分数判胜；平分则为 draw。

## Scoring

- 破解 `perimeter` 或 `logs`：+10
- 破解 `vault` 并暴露 token：+25
- 清除干扰：+5
- 错误提交 token：-10
- 正确提交 token：直接胜利

## Test

```bash
npm test
```
