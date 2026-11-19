import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 相对 base 让构建产物可直接放在 GitHub Pages 子路径下运行
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
