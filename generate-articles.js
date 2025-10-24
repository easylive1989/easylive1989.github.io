const fs = require('fs');
const path = require('path');

// 讀取所有文章檔案
function getAllArticles(articlesDir) {
  const articles = [];
  const files = fs.readdirSync(articlesDir);

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(articlesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // 解析文章 metadata
      const article = parseArticleMetadata(content, file);
      if (article) {
        articles.push(article);
      }
    }
  });

  return articles;
}

// 讀取所有 Side Projects
function getAllSideProjects(projectsDir) {
  const projects = [];
  const files = fs.readdirSync(projectsDir);

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(projectsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // 解析 side project metadata
      const project = parseSideProjectMetadata(content, file);
      if (project) {
        projects.push(project);
      }
    }
  });

  return projects;
}

// 解析 Side Project metadata
function parseSideProjectMetadata(content, filename) {
  const lines = content.split('\n');
  const project = {};

  lines.forEach(line => {
    if (line.startsWith('名稱：')) {
      project.name = line.substring('名稱：'.length).trim();
    } else if (line.startsWith('說明：')) {
      project.description = line.substring('說明：'.length).trim();
    } else if (line.startsWith('標籤：')) {
      const tagsStr = line.substring('標籤：'.length).trim();
      project.tags = tagsStr.split(',').map(tag => tag.trim());
    } else if (line.startsWith('時間：')) {
      project.date = line.substring('時間：'.length).trim();
    } else if (line.startsWith('網站連結：')) {
      project.websiteUrl = line.substring('網站連結：'.length).trim();
    } else if (line.startsWith('原始碼：')) {
      project.sourceUrl = line.substring('原始碼：'.length).trim();
    } else if (line.startsWith('preview：') || line.startsWith('preview:')) {
      const previewLine = line.replace(/^preview[：:]\s*/, '').trim();
      project.preview = previewLine;
    }
  });

  return project.name ? project : null;
}

// 解析文章 metadata
function parseArticleMetadata(content, filename) {
  const lines = content.split('\n');

  // 提取標題（第一行的 # 標題）
  let title = '';
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      break;
    }
  }

  if (!title) {
    console.warn(`無法找到標題: ${filename}`);
    return null;
  }

  // 提取 metadata
  const metadata = {};
  for (const line of lines) {
    // 提取新增時間
    if (line.startsWith('新增時間:')) {
      metadata.createdAt = line.substring('新增時間:'.length).trim();
    }
    // 提取最後編輯時間
    else if (line.startsWith('最後編輯時間:')) {
      metadata.updatedAt = line.substring('最後編輯時間:'.length).trim();
    }
    // 提取 id
    else if (line.startsWith('id:')) {
      metadata.id = line.substring('id:'.length).trim();
    }
    // 提取類型
    else if (line.startsWith('類型:')) {
      metadata.type = line.substring('類型:'.length).trim();
    }
    // 提取領域（Tag）
    else if (line.startsWith('🧩 領域:')) {
      const domainText = line.substring('🧩 領域:'.length).trim();
      // 提取括號前的文字作為 tag
      const match = domainText.match(/^([^\(]+)/);
      if (match) {
        metadata.tag = match[1].trim();
      }
    }
  }

  // 提取文章摘要（前 150 字，跳過 metadata 和圖片）
  let summary = '';
  let fullContent = '';
  let startExtract = false;
  let charCount = 0;
  let contentStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳過 metadata 區塊
    if (line.startsWith('新增時間:') ||
        line.startsWith('最後編輯時間:') ||
        line.startsWith('id:') ||
        line.startsWith('完成:') ||
        line.startsWith('類型:') ||
        line.startsWith('🧩 領域:')) {
      continue;
    }

    // 遇到第一個標題後開始提取內容
    if (line.startsWith('#')) {
      startExtract = true;
      contentStarted = true;
    }

    // 提取完整內容（跳過第一個標題）
    if (contentStarted && i > 0) {
      fullContent += line + '\n';
    }

    // 提取摘要（跳過標題和圖片）
    if (startExtract && !line.startsWith('#') && !line.startsWith('![') && line.trim() !== '') {
      summary += line + ' ';
      charCount += line.length;
    }
  }

  summary = summary.trim().substring(0, 150);
  if (summary.length === 150) {
    summary += '...';
  }

  return {
    title,
    summary,
    content: fullContent.trim(),
    createdAt: metadata.createdAt || '',
    updatedAt: metadata.updatedAt || '',
    id: metadata.id || '',
    type: metadata.type || '',
    tag: metadata.tag || '未分類',
    filename
  };
}

// 讀取所有教學系列
function getAllTutorialSeries(tutorialsDir) {
  const series = [];

  // 讀取 tutorials 目錄下的所有資料夾
  const folders = fs.readdirSync(tutorialsDir);

  folders.forEach(folder => {
    const folderPath = path.join(tutorialsDir, folder);
    const stat = fs.statSync(folderPath);

    if (stat.isDirectory() && !folder.startsWith('.')) {
      // 讀取該系列的所有文章
      const articles = [];
      const files = fs.readdirSync(folderPath);

      files.forEach(file => {
        if (file.endsWith('.md')) {
          const filePath = path.join(folderPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');

          // 解析教學文章
          const article = parseTutorialArticle(content, file, folder);
          if (article) {
            articles.push(article);
          }
        }
      });

      // 按標題中的 Day 數字排序
      articles.sort((a, b) => {
        const dayA = extractDayNumber(a.title);
        const dayB = extractDayNumber(b.title);
        return dayA - dayB;
      });

      if (articles.length > 0) {
        series.push({
          name: folder,
          articles: articles
        });
      }
    }
  });

  return series;
}

// 從標題中提取 Day 數字
function extractDayNumber(title) {
  const match = title.match(/Day\s+(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

// 解析教學文章
function parseTutorialArticle(content, filename, seriesName) {
  const lines = content.split('\n');

  // 提取標題（第一行的 # 標題）
  let title = '';
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      break;
    }
  }

  if (!title) {
    console.warn(`無法找到標題: ${filename}`);
    return null;
  }

  // 提取文章摘要（前 150 字，跳過標題和圖片）
  let summary = '';
  let fullContent = '';
  let startExtract = false;
  let contentStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 遇到第一個標題後開始提取內容
    if (line.startsWith('#')) {
      startExtract = true;
      contentStarted = true;
    }

    // 提取完整內容（跳過第一個標題）
    if (contentStarted && i > 0) {
      fullContent += line + '\n';
    }

    // 提取摘要（跳過標題和圖片）
    if (startExtract && !line.startsWith('#') && !line.startsWith('![') && line.trim() !== '') {
      summary += line + ' ';
    }
  }

  summary = summary.trim().substring(0, 150);
  if (summary.length === 150) {
    summary += '...';
  }

  return {
    title,
    summary,
    content: fullContent.trim(),
    filename,
    seriesName
  };
}

// 解析日期字串為 Date 物件
function parseDate(dateStr) {
  // 處理格式: "February 4, 2023 11:37 PM" 或 "January 1, 2025 8:55 AM"
  try {
    return new Date(dateStr);
  } catch (e) {
    console.warn(`無法解析日期: ${dateStr}`);
    return new Date(0); // 回傳最早的日期
  }
}

// 主程式
function main() {
  const articlesDir = path.join(__dirname, 'static', 'artcles');
  const projectsDir = path.join(__dirname, 'static', 'side_projects');
  const tutorialsDir = path.join(__dirname, 'static', 'tutorials');
  const outputPath = path.join(__dirname, 'articles.json');

  console.log('開始掃描文章...');
  let articles = getAllArticles(articlesDir);

  console.log(`找到 ${articles.length} 篇文章`);

  // 按新增時間排序（最新的在前）
  articles.sort((a, b) => {
    const dateA = parseDate(a.createdAt);
    const dateB = parseDate(b.createdAt);
    return dateB - dateA;
  });

  // 提取所有 tag
  const tags = [...new Set(articles.map(a => a.tag))].sort();

  console.log('開始掃描 Side Projects...');
  let sideProjects = getAllSideProjects(projectsDir);

  console.log(`找到 ${sideProjects.length} 個 Side Projects`);

  // 按時間排序（最新的在前）
  sideProjects.sort((a, b) => {
    // 簡單的日期排序（假設格式為 YYYY/MM）
    return b.date.localeCompare(a.date);
  });

  console.log('開始掃描教學系列...');
  let tutorialSeries = getAllTutorialSeries(tutorialsDir);

  console.log(`找到 ${tutorialSeries.length} 個教學系列`);
  tutorialSeries.forEach(series => {
    console.log(`  - ${series.name}: ${series.articles.length} 篇文章`);
  });

  // 生成最終資料
  const data = {
    articles: articles.slice(0, 50), // 只保留前 50 篇，避免檔案過大
    tags: tags,
    sideProjects: sideProjects,
    tutorialSeries: tutorialSeries,
    generatedAt: new Date().toISOString()
  };

  // 寫入 JSON 檔案
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`文章資料已生成: ${outputPath}`);
  console.log(`總共 ${data.articles.length} 篇文章`);
  console.log(`總共 ${data.sideProjects.length} 個 Side Projects`);
  console.log(`總共 ${data.tutorialSeries.length} 個教學系列`);
  console.log(`Tag 列表: ${tags.join(', ')}`);
}

main();
