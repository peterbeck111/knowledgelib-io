// Input:  A project with REACT_APP_* env vars in .env files and process.env.* in source
// Output: Converted VITE_* env vars and import.meta.env.* references

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Step 1: Rename env vars in .env files
function migrateEnvFiles(rootDir) {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  for (const file of envFiles) {
    const filePath = join(rootDir, file);
    try {
      let content = readFileSync(filePath, 'utf-8');
      // REACT_APP_API_URL=... → VITE_API_URL=...
      content = content.replace(/^REACT_APP_/gm, 'VITE_');
      writeFileSync(filePath, content);
      console.log(`Migrated: ${file}`);
    } catch { /* file doesn't exist, skip */ }
  }
}

// Step 2: Replace process.env references in source files
function migrateSourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (statSync(fullPath).isDirectory()) {
      migrateSourceFiles(fullPath);
      continue;
    }
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(extname(fullPath))) continue;

    let content = readFileSync(fullPath, 'utf-8');
    let modified = false;

    // process.env.REACT_APP_X → import.meta.env.VITE_X
    content = content.replace(/process\.env\.REACT_APP_(\w+)/g, (_, name) => {
      modified = true;
      return `import.meta.env.VITE_${name}`;
    });
    // process.env.NODE_ENV === 'production' → import.meta.env.PROD
    content = content.replace(
      /process\.env\.NODE_ENV\s*===?\s*['"]production['"]/g,
      () => { modified = true; return 'import.meta.env.PROD'; }
    );
    content = content.replace(
      /process\.env\.NODE_ENV\s*===?\s*['"]development['"]/g,
      () => { modified = true; return 'import.meta.env.DEV'; }
    );

    if (modified) {
      writeFileSync(fullPath, content);
      console.log(`Updated: ${fullPath}`);
    }
  }
}

migrateEnvFiles('.');
migrateSourceFiles('./src');
