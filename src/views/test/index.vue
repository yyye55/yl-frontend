<template>
  <div class="face-recognition">
    <h2>人脸识别验证系统</h2>

    <div class="file-section">
      <h3>上传头像</h3>
      <input type="file" accept="image/*" @change="onImageUpload" />
      <div v-if="uploadedImage">
        <h4>已上传头像：</h4>
        <img class="avatar-preview" :src="uploadedImage" alt="Uploaded Avatar" />
      </div>
    </div>

    <div class="camera-section">
      <h3>摄像头实时检测</h3>
      <video ref="videoRef" width="320" height="240" autoplay />
      <button @click="startVideo">开启摄像头</button>
      <button @click="stopVideo">关闭摄像头</button>

      <div v-if="recognitionResult">
        <h4>识别结果：</h4>
        <p v-if="recognitionResult.match">匹配成功！</p>
        <p v-else>匹配失败，继续识别中...</p>
      </div>

      <div v-if="loading">正在加载模型，请稍候...</div>
    </div>
  </div>
</template>

<script setup>
/**
 * 人脸识别验证页（路由 /test）
 *
 * 【可信度：A】逐行照搬 dist/chunk-7e023bd8 的模块 2762。原文渲染函数：
 *
 *   <div class="face-recognition">
 *     <h2>人脸识别验证系统</h2>
 *     <div class="file-section">
 *       <h3>上传头像</h3>
 *       <input type="file" accept="image/*" @change="onImageUpload" />
 *       <div v-if="uploadedImage"><h4>已上传头像：</h4><img class="avatar-preview" /></div>
 *     </div>
 *     <div class="camera-section">
 *       <h3>摄像头实时检测</h3>
 *       <video ref="video" width="320" height="240" autoplay />
 *       <button @click="startVideo">开启摄像头</button>
 *       <button @click="stopVideo">关闭摄像头</button>
 *       <div v-if="recognitionResult"><h4>识别结果：</h4>
 *         <p v-if="match">匹配成功！</p><p v-else>匹配失败，继续识别中...</p></div>
 *       <div v-if="loading">正在加载模型，请稍候...</div>
 *     </div>
 *   </div>
 *
 * 原文组件选项（已核对别名：lt=bufferToImage、gr=detectSingleFace、yr=euclideanDistance、
 * Jn=face-api 命名空间、Qe=SsdMobilenetv1Options）：
 *
 *   data(){ return { uploadedImage:null, uploadedFaceDescriptor:null,
 *                    recognitionResult:null, loading:!1, intervalId:null } },
 *   methods:{
 *     async onImageUpload(e){ const f=e.target.files[0]; if(f){
 *         this.uploadedImage = URL.createObjectURL(f)
 *         const img = await bufferToImage(f)
 *         await this.loadModels()
 *         const r = await detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
 *         r ? (this.uploadedFaceDescriptor = r.descriptor,
 *              console.log("已保存上传头像的特征描述符:", this.uploadedFaceDescriptor))
 *           : alert("无法检测到人脸，请重新上传有效照片。") } },
 *     async startVideo(){ this.loading=!0; await this.loadModels(); this.loading=!1
 *         navigator.mediaDevices && navigator.mediaDevices.getUserMedia
 *           ? navigator.mediaDevices.getUserMedia({video:{}})
 *               .then(s=>{ this.$refs.video.srcObject=s; this.detectFace() })
 *               .catch(err=>{ console.error("无法访问摄像头:",err)
 *                             alert("无法访问摄像头，请检查权限设置。") })
 *           : (console.error("当前浏览器不支持getUserMedia")
 *              alert("您的浏览器不支持摄像头访问，请使用支持的浏览器。")) },
 *     async loadModels(){ this.loading=!0
 *         await ssdMobilenetv1.loadFromUri("/ylbxt/models")
 *         await faceLandmark68Net.loadFromUri("/ylbxt/models")
 *         await faceRecognitionNet.loadFromUri("/ylbxt/models")
 *         this.loading=!1 },
 *     async detectFace(){ const v=this.$refs.video
 *         this.intervalId && clearInterval(this.intervalId)
 *         this.intervalId = setInterval(async ()=>{
 *           const r = await detectSingleFace(v).withFaceLandmarks().withFaceDescriptor()
 *           if(r){ const d = euclideanDistance(r.descriptor, this.uploadedFaceDescriptor)
 *                  this.recognitionResult = { match: d < .6 } }
 *           else this.recognitionResult = null
 *         }, 1000) },
 *     stopVideo(){ const v=this.$refs.video, s=v.srcObject
 *         s.getTracks().forEach(t=>t.stop()); v.srcObject=null; clearInterval(this.intervalId) }
 *   }
 *
 * 原文样式（dist/css/chunk-7e023bd8.bf0afa9e.css）已原样搬入 <style>。
 *
 * 【本页旧实现的问题（已整体重写）】
 *  1. 模型用错：旧版加载的是 tinyFaceDetector + faceLandmark68TinyNet，
 *     dist 实际加载的是 ssdMobilenetv1 + faceLandmark68Net + faceRecognitionNet。
 *     （face-api 的 detectSingleFace 无参调用时默认使用 SsdMobilenetv1Options，
 *       与 dist 加载的模型配套；这是能从 chunk 里直接读出的对应关系。）
 *  2. 交互完全不同：旧版是「打开摄像头 → requestAnimationFrame 持续画检测框 + 拍照识别」，
 *     dist 是「先上传一张头像 → 提取特征描述符 → 开摄像头 → 每秒比对一次，
 *     欧氏距离 < 0.6 判定匹配」，并且原文不画任何检测框。
 *  3. 旧版多出「模型加载进度条 / 识别结果列表」等 dist 中不存在的 UI。
 *
 * 【本页与后端的关系】
 * 全量检索 dist 的 78 个 chunk 后确认：本页不调用任何后端接口，
 * 是一次纯浏览器端的人脸比对演示（上传头像 + 实时摄像头）。
 * scanApi.uploadImage（POST /api/scan/cau）在 dist 中定义但从未被任何页面调用，
 * 因此本项目同样保持「已定义、未调用」，不擅自为它发明调用方。
 *
 * 【对 dist 的两处偏离 —— 均为防御性修复，不改变业务流程】
 *  1. stopVideo 中 dist 直接对 srcObject 调 getTracks()，若摄像头从未开启成功
 *     （例如用户拒绝授权后点「关闭摄像头」）会抛 TypeError。这里加空值判断。
 *  2. dist 未在离开页面时关闭摄像头，会造成摄像头指示灯常亮、设备被占用。
 *     这里补 onBeforeUnmount(stopVideo)，属于资源清理，不涉及业务逻辑。
 */

import { ref, onBeforeUnmount } from 'vue'
import * as faceapi from 'face-api.js'

const videoRef = ref(null)
const uploadedImage = ref(null)
const uploadedFaceDescriptor = ref(null)
const recognitionResult = ref(null)
const loading = ref(false)
let intervalId = null

// dist 中硬编码为 "/ylbxt/models"（部署前缀写死）。本项目 base 由 vite.config.js 统一提供，
// import.meta.env.BASE_URL 在生产为 "/ylbxt/"、开发为 "/"，拼接后与 dist 一致。
const MODEL_URL = import.meta.env.BASE_URL + 'models'

async function onImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadedImage.value = URL.createObjectURL(file)
  const img = await faceapi.bufferToImage(file)
  await loadModels()
  const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
  if (result) {
    uploadedFaceDescriptor.value = result.descriptor
    console.log('已保存上传头像的特征描述符:', uploadedFaceDescriptor.value)
  } else {
    alert('无法检测到人脸，请重新上传有效照片。')
  }
}

async function startVideo() {
  loading.value = true
  await loadModels()
  loading.value = false
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        videoRef.value.srcObject = stream
        detectFace()
      })
      .catch((err) => {
        console.error('无法访问摄像头:', err)
        alert('无法访问摄像头，请检查权限设置。')
      })
  } else {
    console.error('当前浏览器不支持getUserMedia')
    alert('您的浏览器不支持摄像头访问，请使用支持的浏览器。')
  }
}

async function loadModels() {
  loading.value = true
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  loading.value = false
}

async function detectFace() {
  const video = videoRef.value
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(async () => {
    const result = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor()
    if (result) {
      const distance = faceapi.euclideanDistance(result.descriptor, uploadedFaceDescriptor.value)
      recognitionResult.value = { match: distance < 0.6 }
    } else {
      recognitionResult.value = null
    }
  }, 1000)
}

function stopVideo() {
  const video = videoRef.value
  const stream = video && video.srcObject
  // 见文件头「对 dist 的偏离 1」
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    video.srcObject = null
  }
  clearInterval(intervalId)
  intervalId = null
}

// 见文件头「对 dist 的偏离 2」
onBeforeUnmount(stopVideo)
</script>

<style scoped>
/* 照搬 dist/css/chunk-7e023bd8.bf0afa9e.css（原文未加 scoped 前缀，此处限定在本组件内） */
.face-recognition {
  position: relative;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  margin-top: 40px;
}

.avatar-preview {
  width: 150px;
  height: 150px;
  border-radius: 50%;
}

video {
  border: 2px solid #ddd;
}

button {
  margin: 5px;
}

.loading {
  color: red;
}
</style>
