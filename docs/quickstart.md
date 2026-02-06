# Happy CLI 快速使用指南

本文档介绍如何使用 Happy CLI 的 OpenCode 本地模式。

## 简介

Happy CLI 支持本地模式运行，无需连接 Happy Server，直接启动 OpenCode Web 服务器。支持局域网内其他设备访问。

## 环境要求

- Node.js >= 20

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Darrowyu/happy.git
cd happy
```

### 2. 安装依赖

进入 CLI 目录并安装依赖：

```bash
cd packages/happy-cli
npm install
```

### 3. 构建项目

构建项目：

```bash
npm run build
```

### 4. 运行

#### 方式一：创建全局链接（推荐）

使用 `npm link` 创建全局命令链接：

```bash
# 如果之前安装过旧版本，先解除旧链接
npm unlink -g happy-coder

# 创建新的全局链接
npm link

# 验证安装
happy --version

# 启动服务
happy oc
```

启动成功后，控制台会显示：

```
OpenCode server running at http://localhost:1874
局域网访问: http://192.168.0.xxx:1874
Press Ctrl+C to stop
```

**访问地址：**

- **本机访问**: http://localhost:1874
- **局域网访问**: http://192.168.x.x:1874 (IP 地址会自动检测)

> **说明**：Windows 上如果提示权限错误，请以管理员身份运行终端。

#### 方式二：直接运行（可选）

如果你不想创建全局链接，可以直接运行：

```bash
node ./bin/happy.mjs
```

---

## 进阶使用

### 开发模式（无需构建）

如果你正在修改源码，可以使用 tsx 直接运行 TypeScript：

```bash
cd packages/happy-cli
npx tsx src/index.ts
```

---

## 命令说明

### 启动 OpenCode 本地模式（推荐）

```bash
happy oc
```

等效于：

```bash
happy opencode --local
```

### 显式启动 OpenCode 本地模式

```bash
happy opencode --local
```

### 指定模型

```bash
happy oc -m claude-4.5-sonnet
```

### 查看帮助

```bash
happy --help
```

---

## 配置说明

### 固定端口

默认端口固定为 **1874**，如需修改，编辑文件：

**文件路径**: `packages/happy-cli/src/opencode/runOpencode.ts`

```typescript
port: 1874, // 修改此处的端口号
```

### 绑定地址

默认绑定到 `0.0.0.0`（所有网络接口），支持局域网访问。如需限制仅本机访问，修改为 `127.0.0.1`：

**文件路径**: `packages/happy-cli/src/opencode/runOpencode.ts`

```typescript
hostname: '127.0.0.1', // 仅本机访问
```

---

## 常见问题

### Q: 执行 `happyoc` 提示"不是内部或外部命令"？

A: 请确认已执行 `npm link` 创建全局链接。如果仍有问题，检查 npm 全局 bin 目录是否在 PATH 中：

```bash
# 查看 npm 全局 bin 目录
npm bin -g

# 确认该目录在系统 PATH 环境变量中
echo $PATH
```

### Q: `npm link` 提示权限错误？

A: Windows 上请以管理员身份运行终端，然后重新执行：

```bash
npm link
```

### Q: 如何解除全局链接？

A: 

```bash
npm unlink -g happy-coder
```

### Q: 端口被占用怎么办？

A: 修改端口号后重新启动，或杀死占用该端口的进程：

```bash
# Windows
netstat -ano | findstr :1874
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :1874
kill -9 <PID>
```

### Q: 局域网无法访问？

A: 检查防火墙设置，确保端口 1874 已开放。Windows 用户需要在防火墙中添加例外规则。

### Q: 如何查看本机 IP 地址？

A: 启动时会自动显示局域网 IP 地址。也可手动查看：

```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

---

## 技术细节

- **本地模式特点**:
  
  - 无需 Happy Server 连接
  - 无需登录认证
  - 不启动后台 daemon 服务
  - 支持局域网内多设备访问

- **启动流程**:
  
  1. 检查 OpenCode 是否已安装
  2. 启动 OpenCode Web 服务器（绑定 0.0.0.0:1874）
  3. 自动检测并显示局域网 IP 地址
  4. 等待用户中断（Ctrl+C）

---

## 相关文件

| 文件路径                                               | 说明            |
| -------------------------------------------------- | ------------- |
| `packages/happy-cli/src/opencode/runOpencode.ts`   | 本地模式主逻辑       |
| `packages/happy-cli/src/opencode/opencodeLocal.ts` | OpenCode 进程管理 |
| `packages/happy-cli/src/index.ts`                  | CLI 入口和命令解析   |

---

更多文档请参考：

- [CLI 架构](./cli-architecture.md)
- [协议文档](./protocol.md)
- [项目 README](../README.md)
