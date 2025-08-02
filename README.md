# B-Markdown

一个专业的Markdown编辑器，支持实时预览、数学公式渲染和学术PDF导出，使用Electron、React和TypeScript构建。

A professional Markdown editor with live preview, mathematical formula rendering, and academic PDF export support, built with Electron, React, and TypeScript.

## 🚀 快速开始

### 📦 下载安装
前往 [Releases](../../releases) 页面下载最新版本：
- **🍎 macOS**: `B-Markdown-{version}-universal.dmg` 
  - 支持 Intel 和 Apple Silicon Mac
  - Universal Binary，自动选择最优架构运行

### 🎯 系统要求
- macOS 10.12 或更高版本
- 支持所有 Mac 设备（Intel 和 Apple Silicon）

## ✨ 功能特性

### 📝 强大的编辑体验
- 🌓 优雅的深色主题界面
- ✏️ 实时 Markdown 编辑
- 👀 即时预览渲染
- 📝 支持 GitHub 风格 Markdown (GFM)
- ✅ 任务列表支持
- 💻 语法高亮
- 🔍 搜索和替换功能

### 🧮 数学公式支持
- ⚡ KaTeX 实时渲染
- 📐 完整的 LaTeX 数学语法
- 🎯 矩阵、分数、积分等复杂公式
- 📊 行内和块级公式支持

### 📄 专业 PDF 导出
- 🎨 **Default 主题**: 标准文档格式
- 🎓 **Academic 主题**: 学术论文格式
  - 标准学术字体和行距
  - 三线表格式
  - 代码块自动换行
- 📷 图片自适应页面大小
- 🌐 中英文国际化支持

### 🌍 国际化
- 🇨🇳 简体中文
- 🇺🇸 English
- 🔄 根据系统语言自动切换

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发模式

```bash
npm run electron:dev
```

这将同时启动Vite开发服务器和Electron应用。

### 构建应用

```bash
npm run build
```

## 🛠️ 技术栈

- **Electron** - 桌面应用框架
- **React** - 用户界面
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **CodeMirror** - 代码编辑器
- **Remark/Rehype** - Markdown 解析和处理
- **KaTeX** - 数学公式渲染

## 📚 使用说明

### 基本操作
1. **编辑**: 在左侧编辑器中输入 Markdown 文本
2. **预览**: 右侧实时显示渲染后的预览
3. **导出**: 使用菜单中的 "导出PDF" 功能

### 数学公式
```markdown
行内公式：$E = mc^2$

块级公式：
$$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$$
```

### PDF 导出主题
- **Default**: 适用于一般文档
- **Academic**: 适用于学术论文，符合期刊格式要求

### 快捷键
- `Ctrl/Cmd + O`: 打开文件
- `Ctrl/Cmd + S`: 保存文件
- `Ctrl/Cmd + E`: 导出 PDF
- `Ctrl/Cmd + F`: 搜索
- `Ctrl/Cmd + H`: 查找替换

## 🔧 开发

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发模式
npm run electron:dev

# 构建应用
npm run build:mac
```

### 项目结构
```
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   └── preload.ts        # 预加载脚本
├── src/                  # React 前端
│   ├── components/       # 组件
│   ├── i18n/            # 国际化
│   ├── types/           # 类型定义
│   ├── App.tsx          # 主应用
│   └── main.tsx         # 前端入口
├── build/               # 构建资源
├── public/              # 静态资源
└── .github/workflows/   # CI/CD 配置
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**B-Markdown** - 让 Markdown 编辑更专业 ✨ 