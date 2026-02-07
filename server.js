#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const OUTPUT_DIR = path.join(__dirname, 'output');

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  // 解析URL
  let filePath = '.' + req.url;

  // 默认显示目录列表
  if (filePath === './') {
    filePath = './index.html';
  }

  // 如果是根路径，生成目录列表
  if (filePath === './index.html') {
    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(file => file.endsWith('.html') || file.endsWith('.md'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(OUTPUT_DIR, a));
        const statB = fs.statSync(path.join(OUTPUT_DIR, b));
        return statB.mtime - statA.mtime;
      });

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown处理器 - 文档列表</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #eaecef;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #dfe2e5;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #f6f8fa;
            font-weight: 600;
        }
        tr:hover {
            background: #f9f9f9;
        }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .btn {
            display: inline-block;
            padding: 8px 16px;
            background: #0366d6;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .btn:hover {
            background: #0256c7;
        }
    </style>
</head>
<body>
    <h1>📚 Markdown处理器 - 文档列表</h1>
    <p>输出目录：${OUTPUT_DIR}</p>
    <a href="/output" class="btn">📁 查看输出目录</a>
    <table>
        <thead>
            <tr>
                <th>文件名</th>
                <th>类型</th>
                <th>大小</th>
                <th>修改时间</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>`;

    files.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file);
      const stats = fs.statSync(filePath);
      const isHtml = file.endsWith('.html');

      html += `
            <tr>
                <td>${file}</td>
                <td>${isHtml ? '📄 HTML' : '📝 Markdown'}</td>
                <td>${(stats.size / 1024).toFixed(2)} KB</td>
                <td>${stats.mtime.toLocaleString('zh-CN')}</td>
                <td>
                    <a href="/output/${file}" target="_blank">👀 查看</a>
                </td>
            </tr>`;
    });

    html += `
        </tbody>
    </table>
    <p style="margin-top: 40px; color: #666;">
        <small>服务器运行在端口 ${PORT}</small>
    </p>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 处理输出目录中的文件
  if (filePath.startsWith('./output/')) {
    const file = filePath.replace('./output/', '');
    const fullPath = path.join(OUTPUT_DIR, file);

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - 文件不存在</h1>');
      return;
    }

    // 获取MIME类型
    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'text/plain';

    // 读取并返回文件
    fs.readFile(fullPath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>500 - 服务器错误</h1>');
        return;
      }

      res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
      res.end(content);
    });
    return;
  }

  // 其他路径返回404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 - 页面不存在</h1>');
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP服务器已启动`);
  console.log(`🌐 访问地址: http://0.0.0.0:${PORT}`);
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
