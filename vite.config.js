import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import path from 'path'

// ElementPlusResolver 只认模板里的 <el-xxx>，不认 @element-plus/icons-vue 的图标。
// 缺了这一段，模板里写 <el-icon><Search /></el-icon> 但忘了 import 时，
// resolveComponent 解析不到会把名字原样返回，Vue 就当成未知 DOM 元素渲染 ——
// 表现为「图标位置一片空白」，且控制台不报错，极难排查（本项目已踩过：
// Header 的 User/Bottom、MainLayout 的 Close、admin 的 scan/user 的 Search，共 5 处）。
// 这个解析器按名字查图标表，命中才补一条按需 import，未命中返回 undefined 交还原逻辑，
// 不参与 <el-xxx> 与本地 import 的解析，不改变任何现有渲染结果。
const ICON_NAMES = new Set(Object.keys(ElementPlusIcons))
const IconResolver = (name) =>
  ICON_NAMES.has(name) ? { name, from: '@element-plus/icons-vue' } : undefined

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
    Components({ resolvers: [ElementPlusResolver(), IconResolver] })
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
