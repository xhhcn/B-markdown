# B-Markdown 构建指南

本文档描述了如何在本地和GitHub Actions中构建B-Markdown应用。

## 本地构建

### 前置要求
- Node.js 18+ 
- npm

### 安装依赖
```bash
npm ci
```

### 开发模式
```bash
npm run dev
```

### 构建特定平台
```bash
# Linux
npm run build:linux

# Windows
npm run build:win

# macOS
npm run build:mac

# 全平台
npm run build
```

构建的应用将输出到 `release/` 目录。

## GitHub Actions 自动构建

### 工作流程说明

项目包含两个主要的GitHub Actions工作流：

#### 1. 构建和发布工作流 (`.github/workflows/build.yml`)

**触发条件：**
- 推送到 `main` 分支
- 创建标签 (格式: `v*`)
- Pull Request 到 `main` 分支

**功能：**
- 运行类型检查
- 在多个平台上并行构建：
  - Linux (AppImage + Debian package)
  - Windows (NSIS installer)
  - macOS (DMG, 支持 x64 和 ARM64)
- 将构建产物上传为artifacts
- 如果是标签推送，自动创建GitHub Release

#### 2. 版本发布工作流 (`.github/workflows/release.yml`)

**触发条件：**
- 手动触发 (workflow_dispatch)

**功能：**
- 验证版本格式
- 更新 `package.json` 中的版本号
- 创建Git标签
- 触发构建工作流

### 如何发布新版本

1. **手动触发版本发布工作流：**
   - 进入GitHub仓库的Actions页面
   - 选择 "Create Release" 工作流
   - 点击 "Run workflow"
   - 输入版本号 (例如: `v1.0.0`)
   - 选择是否为预发布版本

2. **工作流执行顺序：**
   1. 版本发布工作流创建标签
   2. 标签推送自动触发构建工作流
   3. 构建工作流在多个平台上构建应用
   4. 自动创建GitHub Release并上传构建产物

### 构建产物

每次发布将生成以下文件：

**Linux:**
- `B-Markdown-{version}.AppImage` - AppImage格式，免安装运行
- `B-Markdown-{version}.deb` - Debian/Ubuntu安装包

**Windows:**
- `B-Markdown-Setup-{version}.exe` - NSIS安装程序

**macOS:**
- `B-Markdown-{version}-x64.dmg` - Intel Mac安装包
- `B-Markdown-{version}-arm64.dmg` - Apple Silicon Mac安装包

### 环境变量和密钥

工作流使用以下环境变量：
- `GITHUB_TOKEN` - 自动提供，用于创建releases和上传assets
- `GH_TOKEN` - GitHub token，用于electron-builder发布

### 故障排除

**构建失败常见原因：**

1. **依赖安装失败**
   - 检查 `package.json` 中的依赖版本
   - 确保所有依赖都兼容Node.js 18+

2. **TypeScript错误**
   - 本地运行 `npx tsc --noEmit` 检查类型错误
   - 修复所有TypeScript错误后再推送

3. **Electron构建失败**
   - 检查electron-builder配置
   - 确保所有必需的文件都包含在构建中

4. **平台特定问题**
   - macOS: 可能需要代码签名证书
   - Windows: 确保NSIS配置正确
   - Linux: 检查AppImage和deb包配置

**调试步骤：**
1. 查看GitHub Actions日志
2. 在本地运行相同的构建命令
3. 检查 `release/` 目录中的构建产物
4. 验证 `package.json` 中的electron-builder配置

### 本地测试工作流

您可以使用 [act](https://github.com/nektos/act) 在本地测试GitHub Actions工作流：

```bash
# 安装act
brew install act  # macOS
# 或者其他平台的安装方式

# 测试构建工作流
act push

# 测试特定job
act -j test
```

### 自定义构建

如果需要自定义构建配置，可以修改：

1. **package.json** - electron-builder配置
2. **vite.config.ts** - Vite构建配置
3. **.github/workflows/build.yml** - CI/CD配置

### 注意事项

1. **版本号格式**：必须使用 `v` 前缀，如 `v1.0.0`
2. **分支保护**：建议为 `main` 分支设置保护规则
3. **Release权限**：确保repository有创建release的权限
4. **存储空间**：GitHub有artifacts存储限制，定期清理旧的builds
5. **构建时间**：多平台构建可能需要20-30分钟

有关更多信息，请参考：
- [Electron Builder文档](https://www.electron.build/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Vite文档](https://vitejs.dev/)