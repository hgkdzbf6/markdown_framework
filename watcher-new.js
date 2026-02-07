const chokidar = require('chokidar');
const path = require('path');
const SimpleGenerator = require('./simple-generator');
const fs = require('fs-extra');

/**
 * Markdown文件监听器 - Enhanced version
 */
class MarkdownWatcher {
  constructor(options = {}) {
    this.watchDir = options.watchDir || path.join(__dirname, 'output');
    this.generator = new SimpleGenerator();
    this.watcher = null;
    this.debounceTimer = null;
    this.debounceDelay = options.debounceDelay || 1000;
  }

  start() {
    console.log('👀 启动Markdown监听器（增强版）...');
    console.log(`📁 监听目录: ${this.watchDir}\n`);

    this.watcher = chokidar.watch(this.watchDir, {
      ignored: /[\/\\]\./,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher.on('add', (filePath) => {
      if (path.extname(filePath) === '.md') {
        this.handleFileChange(filePath, '新增');
      }
    });

    this.watcher.on('change', (filePath) => {
      if (path.extname(filePath) === '.md') {
        this.handleFileChange(filePath, '修改');
      }
    });

    this.watcher.on('error', (error) => {
      console.error(`❌ 监听错误: ${error}`);
    });

    this.watcher.on('ready', () => {
      console.log('✅ 监听器已就绪，等待Markdown文件变化...\n');
      this.scanExistingFiles();
    });
  }

  handleFileChange(filePath, action) {
    const fileName = path.basename(filePath);

    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.processMarkdownFile(filePath, action);
    }, this.debounceDelay);
  }

  async processMarkdownFile(filePath, action) {
    const fileName = path.basename(filePath);
    const htmlPath = filePath.replace(/\.md$/, '.html');
    const timestamp = new Date().toLocaleTimeString('zh-CN');

    console.log(`[${timestamp}] 📄 检测到${action}: ${fileName}`);

    try {
      // Generate HTML using SimpleGenerator
      const markdownContent = fs.readFileSync(filePath, 'utf8');
      
      // Find navigation
      const mdFiles = fs.readdirSync(path.dirname(filePath))
        .filter(f => f.endsWith('.md'))
        .sort();
      
      const htmlFiles = mdFiles.map(f => f.replace('.md', '.html'));
      const currentIndex = htmlFiles.indexOf(fileName.replace('.md', '.html'));
      
      const prevDoc = currentIndex > 0 ? htmlFiles[currentIndex - 1] : null;
      const nextDoc = currentIndex < htmlFiles.length - 1 ? htmlFiles[currentIndex + 1] : null;

      const htmlContent = this.generator.generateHtml(markdownContent, {
        title: fileName.replace('.md', '').replace(/-/g, ' '),
        author: 'OpenClaw',
        type: '文档',
        prevDoc: prevDoc,
        nextDoc: nextDoc
      });

      fs.writeFileSync(htmlPath, htmlContent, 'utf8');

      console.log(`[${timestamp}] ✅ 编译成功: ${path.basename(htmlPath)}`);
      console.log(`[${timestamp}] 🌐 访问: http://786100557.xyz:8088/output/${path.basename(htmlPath)}\n`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ 编译失败: ${error.message}\n`);
    }
  }

  async scanExistingFiles() {
    const files = await fs.readdir(this.watchDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    if (mdFiles.length > 0) {
      console.log(`📂 发现 ${mdFiles.length} 个Markdown文件，开始编译...\n`);

      for (const file of mdFiles) {
        const filePath = path.join(this.watchDir, file);
        const htmlPath = filePath.replace(/\.md$/, '.html');

        if (!await fs.pathExists(htmlPath)) {
          await this.processMarkdownFile(filePath, '初始化');
        }
      }

      console.log('✅ 初始扫描完成\n');
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('🛑 监听器已停止');
    }
  }
}

function main() {
  const watcher = new MarkdownWatcher({
    watchDir: path.join(__dirname, 'output'),
    debounceDelay: 1500
  });

  watcher.start();

  process.on('SIGINT', () => {
    console.log('\n\n正在停止监听器...\n');
    watcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n正在停止监听器...\n');
    watcher.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = MarkdownWatcher;
