import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function getHtmlInputs() {
  const inputs = {};
  
  // Root HTML files
  const rootFiles = fs.readdirSync(__dirname);
  rootFiles.forEach(file => {
    if (file.endsWith('.html')) {
      const name = file.replace('.html', '');
      inputs[name] = resolve(__dirname, file);
    }
  });

  // Polity subject HTML files
  const polityDir = resolve(__dirname, 'subjects/polity');
  if (fs.existsSync(polityDir)) {
    const polityFiles = fs.readdirSync(polityDir);
    polityFiles.forEach(file => {
      if (file.endsWith('.html')) {
        const name = `polity_${file.replace('.html', '')}`;
        inputs[name] = resolve(polityDir, file);
      }
    });
  }

  return inputs;
}

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: getHtmlInputs(),
    },
  },
});
