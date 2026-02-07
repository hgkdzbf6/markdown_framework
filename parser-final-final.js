const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = process.cwd();

function parseMarkdownFinal(md) {
  let result = md;

  // 1. Extract code blocks (simple replacement)
  const codeBlocks = [];
  let codeIndex = 0;

  while (result.includes('```')) {
    const start = result.indexOf('```');
    const end = result.indexOf('```', start + 3);

    if (end === -1) break;

    const code = result.substring(start + 3, end);
    codeBlocks.push(code.trim());
    result = result.substring(0, start) + `CODEBLOCK${codeIndex}CODEBLOCK` + result.substring(end + 3);
    codeIndex++;
  }

  // 2. Extract tables (line-by-line processing)
  const tables = [];
  let tableIndex = 0;
  const lines = result.split('\n');
  let processedLines = [];
  let inTable = false;
  let currentTable = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line starts a table (first pipe at start)
    if (!inTable && trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      inTable = true;
      currentTable = [line];
      continue;
    }

    // If in table
    if (inTable) {
      // Check if table ends (empty line or no pipe)
      if (trimmed === '' || !trimmed.includes('|')) {
        inTable = false;
        if (currentTable.length >= 2) {
          const tableText = currentTable.join('\n');
          tables.push(tableText);
          processedLines.push(`TABLE${tableIndex}TABLE`);
          tableIndex++;
        }
        currentTable = [];
        processedLines.push(line);
        continue;
      }

      // Add to current table
      currentTable.push(line);
      continue;
    }

    // Regular line
    processedLines.push(line);
  }

  // Handle last table
  if (inTable && currentTable.length >= 2) {
    const tableText = currentTable.join('\n');
    tables.push(tableText);
    processedLines.push(`TABLE${tableIndex}TABLE`);
  }

  result = processedLines.join('\n');

  // 3. Convert Markdown elements (excluding tables and code blocks)

  // Headers
  result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  result = result.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  result = result.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  result = result.replace(/^###### (.+)$/gm, '<h6>$1</h6>');

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  result = result.replace(/^[-*_]{3,}\s*$/gm, '<hr>');

  // Blockquotes
  result = result.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Line breaks
  result = result.replace(/\n\n/g, '</p><p>');
  result = result.replace(/\n/g, '<br>');

  // Wrap in paragraphs (if not already HTML)
  if (!result.startsWith('<')) {
    result = '<p>' + result + '</p>';
  }

  // 4. Restore code blocks
  result = result.replace(/CODEBLOCK(\d+)CODEBLOCK/g, (match, id) => {
    const code = codeBlocks[parseInt(id)];
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<pre><code>' + escaped + '</code></pre>';
  });

  // 5. Restore tables
  result = result.replace(/TABLE(\d+)TABLE/g, (match, id) => {
    return convertTableFinal(tables[parseInt(id)]);
  });

  return result;
}

function convertTableFinal(tableText) {
  const lines = tableText.split('\n');
  if (lines.length < 2) return tableText;

  let html = '<table>';
  let headerDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip separator lines (containing ---, ===, -, :, |)
    if (line.includes('---') || line.includes('===') || 
        line.match(/^[|: \-|]+$/) || line.match(/^\|[-|:| :]+\|$/)) {
      continue;
    }

    // Parse table row
    const cells = line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== '');

    if (cells.length < 2) continue;

    html += '<tr>';
    for (let j = 0; j < cells.length; j++) {
      html += !headerDone ? `<th>${cells[j]}</th>` : `<td>${cells[j]}</td>`;
    }
    html += '</tr>';

    headerDone = true;
  }

  html += '</table>';
  return html;
}

function generateFullPage(markdown, options = {}) {
  const {
    title = 'Document',
    author = 'OpenClaw',
    type = 'General',
    prevDoc = null,
    nextDoc = null
  } = options;

  const bodyHTML = parseMarkdownFinal(markdown);

  const prevBtn = prevDoc 
    ? `<a href="/output/${prevDoc}" class="nav-btn prev"><i class="fas fa-chevron-left"></i><span>上一篇</span></a>`
    : `<a href="#" class="nav-btn prev" disabled><i class="fas fa-chevron-left"></i><span>上一篇</span></a>`;

  const nextBtn = nextDoc 
    ? `<a href="/output/${nextDoc}" class="nav-btn next"><span>下一篇</span><i class="fas fa-chevron-right"></i></a>`
    : `<a href="#" class="nav-btn next" disabled><span>下一篇</span><i class="fas fa-chevron-right"></i></a>`;

  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>${title} - OpenClaw Docs</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
:root {
    --primary: #8B5CF6;
    --primary-light: #A78BFA;
    --primary-dark: #6366F1;
    --bg-primary: #0F0F23;
    --bg-secondary: #1A1A2E;
    --bg-card: #16162A;
    --text-primary: #E2E8F0;
    --text-secondary: #94A3B8;
    --border-color: #2D3748;
    --code-bg: #1E1E2E;
    --code-border: #3E3E3E;
    --table-header: #8B5CF6;
    --table-hover: rgba(139, 92, 246, 0.1);
    --table-alt: rgba(255, 255, 255, 0.03);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display',
                 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
                 'Helvetica Neue', Helvetica, Arial, sans-serif;
    line-height: 1.7;
    color: var(--text-primary);
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    min-height: 100vh;
    padding: 0;
}

.container { max-width: 900px; margin: 0 auto; padding: 0; min-height: 100vh; }

.header {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
    padding: 24px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.doc-meta { flex: 1; min-width: 0; }

.doc-title {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
    line-height: 1.3;
}

.doc-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.doc-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9em;
    color: var(--text-secondary);
}

.doc-meta-item i { color: var(--primary-light); }

.type-badge {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.85em;
    font-weight: 600;
    white-space: nowrap;
}

.home-btn {
    background: rgba(139, 92, 246, 0.2);
    color: var(--primary-light);
    border: 1px solid var(--primary);
    padding: 12px 20px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1em;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
}

.home-btn:hover {
    background: var(--primary);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
}

.home-btn i { font-size: 1.1em; }

.main-content { padding: 40px 20px; }

.content-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.content-card h1 {
    font-size: 1.8em;
    font-weight: 700;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border-color);
}

.content-card h2 {
    font-size: 1.4em;
    font-weight: 600;
    margin-top: 48px;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
}

.content-card h3 {
    font-size: 1.2em;
    font-weight: 600;
    margin-top: 36px;
    margin-bottom: 20px;
}

.content-card h4,
.content-card h5,
.content-card h6 {
    font-size: 1.1em;
    font-weight: 600;
    margin-top: 24px;
    margin-bottom: 16px;
}

.content-card p {
    margin-bottom: 20px;
    line-height: 1.8;
    color: var(--text-primary);
}

.content-card small {
    font-size: 0.85em;
    color: var(--text-secondary);
}

.content-card a {
    color: var(--primary-light);
    text-decoration: none;
    transition: all 0.3s;
}

.content-card a:hover {
    color: var(--primary);
    text-decoration: underline;
}

.content-card code {
    background: var(--code-bg);
    color: #e06c75;
    padding: 3px 8px;
    border-radius: 6px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    border: 1px solid var(--code-border);
}

.content-card pre {
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
    margin: 24px 0;
}

.content-card pre code {
    background: transparent;
    color: var(--text-primary);
    padding: 0;
    border: none;
    display: block;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.content-card table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
}

.content-card thead {
    background: var(--table-header);
}

.content-card th {
    color: white;
    padding: 14px 16px;
    font-weight: 600;
    text-align: left;
    font-size: 1em;
}

.content-card td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    line-height: 1.6;
}

.content-card tbody tr:last-child td { border-bottom: none; }

.content-card tbody tr:nth-child(even) { background: var(--table-alt); }

.content-card tbody tr:hover { background: var(--table-hover); }

.content-card blockquote {
    border-left: 4px solid var(--primary);
    background: rgba(139, 92, 246, 0.05);
    padding: 16px 20px;
    margin: 24px 0;
    border-radius: 0 8px 8px 0;
    color: var(--text-secondary);
    font-style: italic;
}

.content-card hr {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 40px 0;
    opacity: 0.3;
}

.content-card ul,
.content-card ol {
    margin-bottom: 20px;
    padding-left: 24px;
}

.content-card li {
    margin-bottom: 12px;
    line-height: 1.7;
}

.content-card strong { font-weight: 600; }

.content-card em { font-style: italic; }

.navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-top: 40px;
    padding: 0;
}

.nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 24px;
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-primary);
    text-decoration: none;
    font-size: 1em;
    font-weight: 600;
    transition: all 0.3s ease;
    cursor: pointer;
}

.nav-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    border-color: transparent;
    color: white;
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.25);
}

.nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.nav-btn i { font-size: 1.2em; }

.nav-btn.prev i { margin-right: 8px; }

.nav-btn.next i { margin-left: 8px; }

.nav-btn.home {
    flex: 0;
    min-width: auto;
    padding: 12px 20px;
}

.footer {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
    font-size: 0.9em;
    border-top: 1px solid var(--border-color);
    background: rgba(15, 23, 42, 0.5);
    margin-top: 40px;
}

.footer a {
    color: var(--primary-light);
    text-decoration: none;
}

.footer a:hover {
    text-decoration: underline;
}

@media (max-width: 768px) {
    .header { padding: 16px; }

    .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .doc-title { font-size: 1.2em; }

    .doc-meta-row { width: 100%; gap: 8px; }

    .home-btn { width: 100%; justify-content: center; }

    .main-content { padding: 24px 16px; }

    .content-card { padding: 24px; border-radius: 12px; }

    .content-card h1 { font-size: 1.6em; }

    .content-card h2 { font-size: 1.3em; margin-top: 32px; }

    .content-card h3 { font-size: 1.2em; margin-top: 24px; }

    .content-card table {
        display: block;
        overflow-x: auto;
        font-size: 0.85em;
    }

    .content-card th,
    .content-card td {
        padding: 10px 12px;
        white-space: nowrap;
    }

    .content-card pre {
        padding: 16px;
        font-size: 0.85em;
        overflow-x: scroll;
        -webkit-overflow-scrolling: touch;
    }

    .navigation {
        flex-direction: column;
        gap: 12px;
        margin-top: 24px;
    }

    .nav-btn {
        width: 100%;
        padding: 14px 20px;
        font-size: 0.95em;
    }

    .nav-btn.home {
        width: 100%;
        min-width: auto;
        order: -1;
    }
}

@media (max-width: 480px) {
    .header { padding: 12px; }

    .doc-title { font-size: 1.1em; }

    .type-badge { font-size: 0.8em; padding: 3px 10px; }

    .doc-meta-item { font-size: 0.85em; flex-wrap: wrap; }

    .main-content { padding: 16px 12px; }

    .content-card { padding: 20px 16px; border-radius: 10px; }

    .content-card h1 { font-size: 1.4em; }

    .content-card h2 { font-size: 1.25em; margin-top: 24px; }

    .content-card h3 { font-size: 1.15em; margin-top: 20px; }

    .content-card table { font-size: 0.8em; }

    .content-card th,
    .content-card td {
        padding: 8px 10px;
    }

    .content-card pre {
        padding: 12px;
        font-size: 0.8em;
        overflow-x: scroll;
        -webkit-overflow-scrolling: touch;
    }

    .nav-btn {
        padding: 14px 16px;
        font-size: 0.9em;
    }

    .nav-btn.home {
        order: -1;
        margin-bottom: 8px;
    }
}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-content">
                <div class="doc-meta">
                    <h1 class="doc-title">${title}</h1>
                    <div class="doc-meta-row">
                        <div class="doc-meta-item">
                            <i class="fas fa-user"></i>
                            <span>${author}</span>
                        </div>
                        <div class="doc-meta-item">
                            <i class="fas fa-folder"></i>
                            <span class="type-badge">${type}</span>
                        </div>
                    </div>
                </div>
                <a href="/" class="home-btn">
                    <i class="fas fa-home"></i>
                    <span>首页</span>
                </a>
            </div>
        </header>

        <main class="main-content">
            <div class="content-card">
                ${bodyHTML}
            </div>

            <nav class="navigation">
                ${prevBtn}
                <a href="/" class="nav-btn home">
                    <i class="fas fa-th-large"></i>
                    <span>文档目录</span>
                </a>
                ${nextBtn}
            </nav>
        </main>

        <footer class="footer">
            <p>
                <i class="fas fa-code"></i> Powered by OpenClaw Markdown Processor
            </p>
            <p style="margin-top: 8px;">
                <small>Generated: ${new Date().toLocaleString('zh-CN')}</small>
            </p>
        </footer>
    </div>
</body>
</html>`;
}

async function regenerateAll() {
  const mdFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  const htmlFiles = mdFiles.map(f => f.replace('.md', '.html'));

  console.log('Processing', mdFiles.length, 'files...\n');

  for (let i = 0; i < mdFiles.length; i++) {
    const mdFile = mdFiles[i];
    const htmlFile = htmlFiles[i];
    const mdPath = path.join(OUTPUT_DIR, mdFile);
    const htmlPath = path.join(OUTPUT_DIR, htmlFile);

    const prevDoc = i > 0 ? htmlFiles[i - 1] : null;
    const nextDoc = i < htmlFiles.length - 1 ? htmlFiles[i + 1] : null;

    try {
      const markdown = fs.readFileSync(mdPath, 'utf8');
      const html = generateFullPage(markdown, {
        title: mdFile.replace('.md', '').replace(/-/g, ' '),
        author: 'OpenClaw',
        type: '文档',
        prevDoc: prevDoc,
        nextDoc: nextDoc
      });

      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log('✅ Generated:', htmlFile);
    } catch (error) {
      console.log('❌ Failed:', htmlFile);
      console.log('   Error:', error.message);
    }
  }

  console.log('\n🎉 All documents regenerated!');
}

regenerateAll();
