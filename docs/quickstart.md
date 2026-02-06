# Happy CLI 快速使用指南

本文档介绍如何使用 Happy CLI 的 OpenCode 本地模式。

## 简介

Happy CLI 支持本地模式运行，无需连接 Happy Server，直接启动 OpenCode Web 服务器。支持局域网内其他设备访问。

## 环境要求

- Node.js >= 20
- Yarn >= 1.22 (本项目使用 Yarn workspaces)

### 安装 Yarn

如果你还没有安装 Yarn，可以通过以下方式安装：

**方式一：使用 Corepack（推荐，Node.js 16.10+ 内置）**

```bash
# 启用 corepack（只需执行一次）
corepack enable

# 验证安装
yarn --version
```

**方式二：通过 npm 全局安装**

```bash
npm install -g yarn

# 验证安装
yarn --version
```

## 快速开始

### 方式一：从源码运行（推荐开发者）

#### 1. 克隆仓库

```bash
git clone https://github.com/Darrowyu/happy.git
cd happy
```

#### 2. 安装依赖

在仓库**根目录**执行：

```bash
yarn install
```

#### 3. 进入 CLI 目录

```bash
cd packages/happy-cli
```

#### 4. 启动服务

```bash
npx tsx src/index.ts
```

启动成功后，控制台会显示：

```
OpenCode server running at http://localhost:1874
局域网访问: http://192.168.0.162:1874
Press Ctrl+C to stop
```

**访问地址：**

- **本机访问**: http://localhost:1874
- **局域网访问**: http://192.168.x.x:1874 (IP 地址会自动检测)

---

### 方式二：通过 npm 全局安装（推荐普通用户）

#### 1. 安装 Happy CLI

```bash
npm install -g happy-coder
```

#### 2. 安装 OpenCode CLI

Happy CLI 依赖 OpenCode CLI 运行，需要单独安装：

```bash
npm install -g opencode
```

#### 3. 启动服务

```bash
happy
```

---

## 源码开发进阶

### 构建后运行

如需构建生产版本，在 `packages/happy-cli` 目录执行：

```bash
cd packages/happy-cli
npm run build
node bin/happy.mjs
```

---

## 命令说明

### 默认启动（OpenCode 本地模式）

```bash
happy
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
happy opencode --local -m claude-4.5-sonnet
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
