# OpenClaw Markdown Framework

## 简介

OpenClaw Markdown Framework是一个自动化的文档发布系统，具有以下特点：

- ✅ 自动编译：Markdown文件自动转换为HTML
- ✅ 增强模板：OpenClaw官网风格，深色主题
- ✅ 响应式设计：完美适配桌面、平板、移动端
- ✅ 导航系统：上一篇/下一篇/首页自动链接
- ✅ 元数据显示：作者、类型标签
- ✅ 自动部署：GitHub Actions自动化部署

## 组件

### 核心文件

- `parser-final-final.js`：Markdown到HTML解析器
- `watcher-new.js`：文件监听器
- `server.js`：HTTP服务器
- `publish-final.sh`：发布脚本
- `deploy-github.yml`：GitHub Actions工作流

## 使用方法

### 1. 准备Markdown文件

将你的Markdown文件放到 [worknote](https://github.com/hgkdzbf6/worknote) 仓库中。

### 2. 推送到GitHub

每次推送新文件到 `worknote` 仓库，GitHub Actions会自动：
1. 读取新的MD文件
2. 使用framework生成HTML
3. 部署到GitHub Pages

## 在线地址

网站：https://hgkdzbf6.github.io

## 联系方式

- GitHub：https://github.com/hgkdzbf6
- Email：hgkdzbf6@example.com

## 许可证

MIT License
