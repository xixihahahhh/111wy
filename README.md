# 古诗小课堂（小学语文辅助网页）

一个适合小学生使用的古诗学习网页，支持 **点读、跟读、背诵** 三种模式，可直接部署到任意静态托管平台（如 GitHub Pages、Vercel、Netlify 等）。

> 文本内容来自同目录下的 `1.txt`，页面会自动解析其中的古诗、注释和译文。

## 一、功能说明

- **点读模式**
  - 点击古诗的任意一句、注释内容，就会使用浏览器内置的 **语音合成（TTS）** 朗读这一句。
- **跟读模式**
  - 先点选一句古诗；
  - 点击「开始跟读」后，网页先朗读一遍这一句；
  - 接着自动开启麦克风录音，使用浏览器的 **语音识别** 将小朋友的读音转成文字；
  - 使用简单的文本相似度算法打分并给出评价反馈。
- **背诵模式**
  - 可以一键隐藏/显示诗文和注释；
  - 点击「开始背诵」，网页开始听小朋友背全首古诗；
  - 识别成文字后，与原文对比，给出整体相似度和鼓励语。

## 二、如何本地运行

1. **确保文件结构如下**：
   - `index.html`
   - `style.css`
   - `script.js`
   - `1.txt`（你的古诗内容文件）
2. **用 VS Code / Cursor / 其他编辑器打开此文件夹**。
3. 使用任意简单静态服务器（例如）：
   - VS Code 安装 Live Server 插件，右键 `index.html` -> 「Open with Live Server」；
   - 或者在此目录下用 Python 启一个简易服务器：

     ```bash
     # Python 3
     python -m http.server 8000
     ```

4. 浏览器打开 `http://localhost:8000`（或 Live Server 给出的地址），即可使用。

> **注意**：直接双击打开 `index.html` 有可能因为浏览器的本地文件安全限制，导致无法 `fetch("1.txt")`，建议使用上面任意一种「本地服务器」方式。

## 三、语音功能说明

项目默认使用 **浏览器内置能力**：

- **点读（TTS）**：使用 `window.speechSynthesis`（Web Speech API）。
- **跟读/背诵（ASR）**：优先使用 `window.SpeechRecognition` / `webkitSpeechRecognition`。

如果当前浏览器不支持相应能力，页面会给出中文提示。

### 1. 使用豆包等 AI 接口（可选，推荐后端接入）

若你希望：

- 朗读声音更自然（更好的 TTS），或
- 识别更准确、支持更多终端，

可以在 **后端** 接入豆包或火山引擎等语音接口，然后前端只调用自己的后端接口即可。

典型流程：

1. 在服务器（Node.js / Python 等）中编写代码：
   - 接收前端传来的文本（需要朗读的句子）或音频数据（小朋友的跟读/背诵录音）；
   - 调用豆包/火山引擎的 **语音合成 TTS** 或 **语音识别 ASR** 接口；
   - 返回音频 URL 或识别文本给前端。
2. 前端修改 `script.js` 中的逻辑：
   - 点读时不再直接调用 `speechSynthesis`，而是：

     ```javascript
     // 伪代码示例：向你自己的后端请求合成语音
     const res = await fetch("/api/tts", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ text }),
     });
     const { audioUrl } = await res.json();
     const audio = new Audio(audioUrl);
     audio.play();
     ```

   - 跟读/背诵时：
     - 使用浏览器 `MediaRecorder` 采集麦克风音频；
     - 将音频二进制发送到 `/api/asr`；
     - 后端调用豆包 ASR 接口返回识别结果，前端再做比对和打分。

> **重要：请不要在前端（浏览器 JavaScript）里直接写入豆包或其他平台的 API Key**，否则任何访问页面的人都能看到并盗用你的密钥。推荐的做法是：密钥只保存在后端服务器环境变量中。

## 四、部署到免费托管平台

因为本项目是**纯前端静态网站**，所以可以直接部署到任何静态托管平台。下面给出几种常见方式。

### 1. GitHub Pages

1. 在 GitHub 上新建一个仓库，例如 `primary-poem-web`。
2. 把当前目录下所有文件（`index.html`、`style.css`、`script.js`、`1.txt`、`README.md`）提交到仓库。
3. 在 GitHub 仓库设置（Settings）中找到「Pages」：
   - `Source` 选择 `Deploy from a branch`；
   - 分支选择 `main`，路径选 `/root`；
   - 保存后稍等片刻，GitHub 会给出一个访问链接。

### 2. Vercel

1. 安装并登录 Vercel（支持 GitHub 登录）。
2. 在 Vercel 仪表盘点击「New Project」，导入刚才的 GitHub 仓库。
3. 构建方式选择 Static Site（不需要任何构建命令，输出目录 `/`）。
4. 部署完成后会得到一个形如 `https://your-project.vercel.app` 的地址。

### 3. Netlify

1. 登录 Netlify，点击「Add new site」→「Import an existing project」。
2. 选择 GitHub 仓库，构建命令留空，发布目录设置为 `/`。
3. 部署完成后会得到一个公开网址。

## 五、可以实现吗？——总结回答

- **可以实现，而且当前代码已经实现了一个基础版本：**
  - 功能 1：点读 —— 通过浏览器内置 TTS 完成，每句可单独点击朗读；
  - 功能 2：跟读 —— 先播放语音，再录音识别并给出相似度评分（支持浏览器原生 ASR；也预留了改成 AI 接口的思路）；
  - 功能 3：背诵 —— 可隐藏原文，整首识别并评分。
- 如需接入 **豆包等 AI 服务**，推荐在后端使用 API，前端调用你自己的接口即可，项目结构已为此预留了扩展空间。  

你可以先在本地用浏览器原生语音能力跑通整套流程，再视需要升级到豆包等更专业的语音服务。祝你课堂使用顺利，小朋友们学诗开心！🎉

