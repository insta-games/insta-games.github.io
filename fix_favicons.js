const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== '.git' && f !== 'node_modules') files = files.concat(walk(full));
    } else if (f.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const htmls = walk('.');
let updated = 0;
for (const h of htmls) {
  let content = fs.readFileSync(h, 'utf8');
  const relDir = path.dirname(h);
  const relToRoot = path.relative(relDir, '.').replace(/\\/g, '/');
  const favPath = (relToRoot ? relToRoot + '/' : '') + 'assets/favicon.ico';
  const favTag = `<link rel="icon" href="${favPath}" type="image/x-icon">`;

  let newContent = content;
  const favRegex = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi;
  if (favRegex.test(content)) {
    newContent = content.replace(favRegex, favTag);
  } else {
    if (newContent.includes('</head>')) {
      newContent = newContent.replace('</head>', `  ${favTag}\n</head>`);
    }
  }
  if (newContent !== content) {
    fs.writeFileSync(h, newContent, 'utf8');
    updated++;
  }
}
console.log(`Updated favicon in ${updated} files.`);
