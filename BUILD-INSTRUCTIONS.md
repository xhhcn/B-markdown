# B-Markdown 跨平台构建说明

## 当前构建结果

### macOS 版本（已完成）
- ✅ **B-Markdown-1.0.0.dmg** (109MB) - macOS x64 版本
- ✅ **B-Markdown-1.0.0-arm64.dmg** (105MB) - macOS Apple Silicon 版本
- ✅ **B-Markdown-1.0.0-mac.zip** (116MB) - macOS x64 压缩包
- ✅ **B-Markdown-1.0.0-arm64-mac.zip** (112MB) - macOS Apple Silicon 压缩包

## 跨平台构建

由于electron-builder的限制，在macOS上只能构建macOS版本。要构建其他平台版本，请使用以下方法：

### 方法1：使用GitHub Actions（推荐）

创建 `.github/workflows/build.yml`：

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build for macOS
      if: matrix.os == 'macos-latest'
      run: npm run build:mac
      
    - name: Build for Windows  
      if: matrix.os == 'windows-latest'
      run: npm run build:win
      
    - name: Build for Linux
      if: matrix.os == 'ubuntu-latest'
      run: npm run build:linux
      
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.os }}-build
        path: release/
```

### 方法2：使用Docker

```bash
# Windows 构建
docker run --rm -ti \
  --env-file <(env | grep -v '_\|PATH\|USER\|HOME') \
  -v ${PWD}:/project \
  electronuserland/builder:wine \
  /bin/bash -c "npm install && npm run build:win"

# Linux 构建  
docker run --rm -ti \
  --env-file <(env | grep -v '_\|PATH\|USER\|HOME') \
  -v ${PWD}:/project \
  electronuserland/builder:latest \
  /bin/bash -c "npm install && npm run build:linux"
```

### 方法3：在对应操作系统上构建

1. **Windows**: 在Windows机器上运行 `npm run build:win`
2. **Linux**: 在Linux机器上运行 `npm run build:linux`

## 可用脚本

```bash
npm run build:mac     # 仅构建macOS版本
npm run build:win     # 仅构建Windows版本（需要在Windows或Docker中运行）
npm run build:linux   # 仅构建Linux版本（需要在Linux或Docker中运行）
npm run build:all     # 构建所有平台版本（需要对应环境支持）
```

## 优化特性

✅ **性能优化**：防抖输入、缓存处理器、V8代码缓存
✅ **大小优化**：移除不必要依赖、最大压缩、tree shaking
✅ **跨平台支持**：macOS、Windows、Linux (x64 + arm64)
✅ **现代化构建**：ESBuild压缩、代码分割、依赖优化

## 应用特性

- 实时Markdown预览
- 数学公式支持（KaTeX）
- 代码语法高亮
- PDF导出功能
- 查找替换功能
- 可调整的面板布局
- 完整的文件操作支持