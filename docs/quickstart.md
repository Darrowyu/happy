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

### 1. 克隆仓库

```bash
git clone https://github.com/Darrowyu/happy.git
cd happy
```

### 2. 安装依赖

在仓库**根目录**执行：

```bash
yarn install
```

### 3. 使用方式

安装完成后，有两种使用方式：

#### A. 开发模式（在 CLI 目录运行）

进入 CLI 目录，先构建项目，然后运行：

```bash
cd packages/happy-cli
npm run build        # 或 yarn build
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

#### B. 全局模式（任意目录使用）

创建全局链接，以后可以在任意目录使用 `happy` 命令：

**步骤 1：先构建项目（必须）**

```bash
cd packages/happy-cli
npm run build        # 或 yarn build
```

> ⚠️ **重要**：必须先构建项目，确保 `dist/` 目录存在

**步骤 2：解除旧链接（如果存在）**

```bash
yarn unlink
yarn link
```

> ⚠️ 如果出现 `There's already a package called "happy-coder" registered`，先执行 `yarn unlink` 解除旧链接，再重新 `yarn link`

**步骤 3：添加到系统 PATH（Windows 必须）**

`yarn link` 创建的命令不在系统 PATH 中，需要手动添加：

```bash
# 查看 yarn bin 目录
yarn global bin
```

**将以下路径添加到系统 PATH：**

```
%LOCALAPPDATA%\Yarn\config\global\node_modules\.bin
```

**添加方法：**

1. Win + R → 输入 `sysdm.cpl` → 回车
2. 高级 → 环境变量
3. 系统变量 → 找到 `Path` → 编辑 → 新建
4. 粘贴：`%LOCALAPPDATA%\Yarn\config\global\node_modules\.bin`
5. 确定 → **重启终端**（必须）

**步骤 4：验证安装**

```bash
# 重启终端后执行
happy --version
```

> **提示**：全局模式需要先安装 `opencode-ai`：
> 
> ```bash
> npm install -g opencode-ai
> ```

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

### Q: Windows 上 `yarn link` 后 `happy` 命令找不到？

A: 这是 Windows 的常见问题，`yarn link` 创建的命令不在系统 PATH 中。解决步骤：

1. **查看 yarn bin 目录：**
   
   ```bash
   yarn global bin
   ```

2. **添加到系统 PATH：**
   
   - Win + R → `sysdm.cpl` → 高级 → 环境变量
   - 系统变量 → Path → 编辑 → 新建
   - 添加：`%LOCALAPPDATA%\Yarn\config\global\node_modules\.bin`

3. **重启终端**（必须关闭所有终端窗口重新打开）

4. **验证：**
   
   ```bash
   where happy
   happy --version
   ```

### Q: `yarn link` 提示包已注册？

A: 说明之前有链接指向其他目录：

```bash
# 先解除旧链接
yarn unlink

# 重新创建链接
yarn link
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
