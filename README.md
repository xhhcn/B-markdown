# B-Markdown

[![Build Multi-Platform](https://github.com/xhhcn/B-markdown/actions/workflows/build.yml/badge.svg)](https://github.com/xhhcn/B-markdown/actions/workflows/build.yml)
[![Test](https://github.com/xhhcn/B-markdown/actions/workflows/test.yml/badge.svg)](https://github.com/xhhcn/B-markdown/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/xhhcn/B-markdown/releases)

> 🚀 基于 Electron 的现代化 Markdown 编辑器，具有实时预览功能。

## ✨ 功能特性

- **🔄 实时预览**：编辑的同时实时显示渲染结果，150ms 防抖优化
- **🧮 数学公式支持**：支持 LaTeX 数学公式，通过 KaTeX 渲染
- **🎨 代码语法高亮**：支持多种编程语言的语法高亮
- **📄 PDF 导出**：一键导出为 PDF 文件，支持自定义页面设置
- **🔍 查找替换**：强大的查找和替换功能，支持正则表达式
- **📐 可调整布局**：可以调整编辑器和预览面板的大小
- **🌙 深色主题**：支持深色主题，保护您的眼睛

## 📦 下载

访问 [Releases](https://github.com/xhhcn/B-markdown/releases) 页面下载适合您操作系统的版本：

| 平台 | 架构 | 下载格式 |
|------|------|----------|
| **macOS** | Intel (x64) | [DMG](https://github.com/xhhcn/B-markdown/releases) / [ZIP](https://github.com/xhhcn/B-markdown/releases) |
| **macOS** | Apple Silicon (arm64) | [DMG](https://github.com/xhhcn/B-markdown/releases) / [ZIP](https://github.com/xhhcn/B-markdown/releases) |
| **Windows** | x64 / arm64 | [Installer](https://github.com/xhhcn/B-markdown/releases) / [Portable](https://github.com/xhhcn/B-markdown/releases) |
| **Linux** | x64 / arm64 | [AppImage](https://github.com/xhhcn/B-markdown/releases) / [tar.gz](https://github.com/xhhcn/B-markdown/releases) |

## 🛠 技术栈

- **前端框架**：React 18 + TypeScript
- **编辑器**：CodeMirror 6
- **Markdown 处理**：unified 生态系统 (remark + rehype)
- **数学公式**：KaTeX
- **语法高亮**：highlight.js
- **构建工具**：Vite 5
- **桌面应用**：Electron 28
- **CI/CD**：GitHub Actions

## 🚀 快速开始

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/xhhcn/B-markdown.git
cd B-markdown

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建应用
npm run build
```

### 构建脚本

```bash
npm run build:mac     # 构建 macOS 版本
npm run build:win     # 构建 Windows 版本  
npm run build:linux   # 构建 Linux 版本
npm run build:all     # 构建所有平台版本
```

## ⚡ 性能优化

- **防抖输入处理**：150ms 延迟，避免输入卡顿
- **处理器缓存**：复用 unified 实例，减少重复处理
- **React 优化**：使用 useCallback 和 useMemo 减少重渲染
- **V8 缓存**：启用代码缓存，加快启动速度
- **Bundle 优化**：Tree shaking 和代码分割

## 🏗 项目结构

```
B-markdown/
├── .github/workflows/    # GitHub Actions 工作流
├── build/               # 构建资源 (图标等)
├── electron/            # Electron 主进程代码
├── src/                 # React 前端代码
│   ├── components/      # React 组件
│   └── ...
├── package.json         # 项目配置
├── vite.config.ts       # Vite 配置
└── README.md           # 项目说明
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 这个仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📝 许可证

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 许可证。