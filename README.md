# Markdown Editor

一个基于Electron的markdown编辑和预览应用，具有实时预览功能。

## 技术栈

- **Electron** - 桌面应用框架
- **React** - 用户界面
- **Vite** - 构建工具
- **CodeMirror** - 代码编辑器
- **Remark** - Markdown解析器

## 功能特性

- 🌓 深色主题界面
- ✏️ 实时markdown编辑
- 👀 即时预览渲染
- 📝 支持GitHub风格markdown (GFM)
- ✅ 支持任务列表
- 💻 语法高亮
- 📱 响应式布局

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

## 项目结构

```
├── electron/           # Electron主进程文件
│   └── main.ts
├── src/               # React源代码
│   ├── components/    # React组件
│   ├── App.tsx       # 主应用组件
│   ├── main.tsx      # React入口
│   └── index.css     # 样式文件
├── package.json
├── vite.config.ts    # Vite配置
└── tsconfig.json     # TypeScript配置
```

## 使用说明

1. 在左侧编辑器中输入markdown文本
2. 右侧将实时显示渲染后的预览
3. 支持所有标准markdown语法，包括：
   - 标题 (# ## ###)
   - 列表 (有序和无序)
   - 代码块
   - 引用
   - 任务列表
   - 链接和图片 