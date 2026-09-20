import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

// 与 dist 中 h.p = "/ylbxt/" 对齐
// 开发环境 base 设为 / 让开发更简单；生产环境按 dist 设为 /ylbxt/
//
// 【部署前缀唯一来源】
// 这里的 base 是整个项目部署前缀的唯一来源。
// 代码中一律使用 Vite 内置的 import.meta.env.BASE_URL 读取（由 base 自动派生，恒带尾部 /），
// 不要再新增 VITE_BASE 之类的自定义环境变量 —— 两套来源必然漂移。
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  base: mode === 'production' ? '/ylbxt/' : '/',
  server: {
    port: 8080,
    open: true,
    // 允许局域网访问，方便真机调试摄像头
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        // 与 dist 产物风格接近：chunk 文件名带 hash
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: '[ext]/[name].[hash].[ext]'
      }
    }
  },
  optimizeDeps: {
    // face-api.js 是 CommonJS，需要预构建
    include: ['face-api.js']
  }
}))
