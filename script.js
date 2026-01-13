// ===================== 基础数据与加载 =====================
// 从 1.txt 加载古诗、课文段落、日积月累等内容并解析为结构化数据

async function loadPoems() {
  const res = await fetch("1.txt");
  const text = await res.text();
  return parseContentFromText(text);
}

function parseContentFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let currentCategory = null; // "古诗" | "课文段落" | "日积月累"
  let current = null;
  let section = "none"; // "none" | "notes" | "translation"

  for (const rawLine of lines) {
    const line = rawLine.replace(/^L\d+:/, "").trim();
    if (!line) continue;

    // 检查是否是分类标题
    if (line === "古诗：" || line === "课文段落：" || line === "日积月累：") {
      // 切换分类前，先保存当前项目
      if (current) {
        items.push(current);
        current = null;
      }
      currentCategory = line.replace("：", "");
      continue;
    }

    // 古诗格式：以《》开头（但不包含括号，避免与课文段落混淆）
    if (line.startsWith("《") && line.includes("》") && !line.includes("（") && !line.includes("）")) {
      if (current) items.push(current);
      
      const titleMatch = line.match(/《([^》]+)》/);
      const title = titleMatch ? titleMatch[1] : line.replace(/《|》/g, "");
      
      current = {
        type: currentCategory || "古诗",
        title: title,
        author: "",
        lines: [],
        notes: [],
        translation: "",
      };
      section = "none";
      continue;
    }

    // 课文段落格式：如《燕子》（1-3自然段）
    if (line.startsWith("《") && line.includes("（") && line.includes("）")) {
      if (current) items.push(current);
      
      const titleMatch = line.match(/《([^》]+)》（(.+)）/);
      const title = titleMatch ? `${titleMatch[1]}（${titleMatch[2]}）` : line;
      
      current = {
        type: "课文段落",
        title: title,
        author: "",
        lines: [],
        notes: [],
        translation: "",
      };
      section = "none";
      continue;
    }

    // 日积月累格式：如"语文园地一：《忆江南》（唐·白居易）"或"语文园地二：成语积累"
    if (line.includes("语文园地") || (currentCategory === "日积月累" && !current)) {
      if (current) items.push(current);
      
      // 提取标题和内容
      let title = line;
      let author = "";
      let contentLines = [];
      
      if (line.includes("：")) {
        const parts = line.split("：");
        title = parts[0];
        const content = parts[1];
        
        if (content) {
          // 检查是否包含古诗标题和作者，如"《忆江南》（唐·白居易）"
          const poemMatch = content.match(/《([^》]+)》（(.+)）/);
          if (poemMatch) {
            title += "：" + poemMatch[1];
            author = poemMatch[2];
            // 古诗内容会在下一行
          } else {
            // 直接是内容，如"成语积累"或"文房四宝：笔墨纸砚"
            // 如果包含冒号，说明是子标题+内容格式
            if (content.includes("：")) {
              // 如"文房四宝：笔墨纸砚"，整行作为一行内容
              contentLines.push(content);
            } else {
              // 如"成语积累"，这是标题的一部分
              title += "：" + content;
            }
          }
        }
      }
      
      current = {
        type: "日积月累",
        title: title,
        author: author,
        lines: contentLines,
        notes: [],
        translation: "",
      };
      section = "none";
      continue;
    }

    if (!current) continue;

    // 处理作者行（古诗和日积月累中的作者）
    if (!current.author && (line.includes("·") || line.match(/^[唐宋元明清][代·]/))) {
      current.author = line;
      continue;
    }

    // 注释和译文
    if (line.startsWith("注释")) {
      section = "notes";
      continue;
    }
    if (line.startsWith("译文")) {
      section = "translation";
      continue;
    }

    // 内容行
    if (section === "none") {
      // 用句号、顿号、分号等拆成多句（方便点读）
      const parts = line.split(/(?<=[。！？，、；])/).filter(Boolean);
      current.lines.push(...parts);
    } else if (section === "notes") {
      current.notes.push(line);
    } else if (section === "translation") {
      current.translation += line;
    }
  }
  
  if (current) items.push(current);
  
  // 调试：输出解析结果
  console.log("解析结果：", items.length, "项");
  items.forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.type}] ${item.title} - 内容行数: ${item.lines.length}`);
  });
  
  return items;
}

// ===================== 语音相关封装 =====================

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;
const hasTTS = "speechSynthesis" in window;

// 移除标点符号，只保留文字（用于语音播放和相似度比较）
function removePunctuation(text) {
  return text.replace(/[。！？，、；：；""''（）【】《》〈〉…—～·]/g, "");
}

function speakText(text, onStart, onEnd) {
  if (!hasTTS) {
    alert("当前浏览器不支持语音播放，请尝试使用 Chrome 浏览器。");
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  // 移除标点符号，只读文字内容
  const cleanText = removePunctuation(text);
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.lang = "zh-CN";
  utter.rate = 0.95;
  utter.onstart = () => onStart && onStart();
  utter.onend = () => onEnd && onEnd();
  synth.speak(utter);
}

function startRecognition({ onText, onEnd }) {
  if (!SpeechRecognition) {
    alert("当前浏览器不支持语音识别，可以考虑在后端接入豆包等AI接口。");
    onEnd && onEnd();
    return null;
  }
  const recog = new SpeechRecognition();
  recog.lang = "zh-CN";
  recog.interimResults = false;
  recog.maxAlternatives = 1;
  recog.onresult = (e) => {
    const text = e.results[0][0].transcript;
    onText && onText(text);
  };
  recog.onend = () => onEnd && onEnd();
  recog.start();
  return recog;
}

// 简单文本相似度：基于最长公共子序列（LCS）
function calcSimilarity(a, b) {
  // 移除空格和标点符号，只比较文字内容
  a = removePunctuation(a.replace(/\s+/g, ""));
  b = removePunctuation(b.replace(/\s+/g, ""));
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const lcs = dp[m][n];
  return lcs / Math.max(m, n);
}

// 生成改正意见：对比标准文本和用户文本，找出具体差异并给出建议
function generateFeedback(standardText, userText) {
  // 移除标点符号和空格，只比较文字内容
  const standard = removePunctuation(standardText.replace(/\s+/g, ""));
  const user = removePunctuation(userText.replace(/\s+/g, ""));
  
  if (!user || user.length === 0) {
    return "你没有说话哦，请再试一次～";
  }
  
  // 如果完全正确
  if (standard === user) {
    return "太棒了！你读得完全正确！";
  }
  
  const suggestions = [];
  
  // 统计字符频率
  const standardCharCount = {};
  const userCharCount = {};
  
  [...standard].forEach(char => {
    standardCharCount[char] = (standardCharCount[char] || 0) + 1;
  });
  
  [...user].forEach(char => {
    userCharCount[char] = (userCharCount[char] || 0) + 1;
  });
  
  // 找出缺失的字符（标准中有但用户中没有，或数量不足）
  const missingChars = [];
  Object.keys(standardCharCount).forEach(char => {
    const standardCount = standardCharCount[char];
    const userCount = userCharCount[char] || 0;
    if (userCount < standardCount) {
      const missing = standardCount - userCount;
      for (let i = 0; i < missing; i++) {
        missingChars.push(char);
      }
    }
  });
  
  // 找出多余的字符（用户中有但标准中没有，或数量过多）
  const extraChars = [];
  Object.keys(userCharCount).forEach(char => {
    const userCount = userCharCount[char];
    const standardCount = standardCharCount[char] || 0;
    if (userCount > standardCount) {
      const extra = userCount - standardCount;
      for (let i = 0; i < extra; i++) {
        extraChars.push(char);
      }
    }
  });
  
  // 使用简单的对齐算法找出位置错误
  const wrongPositions = [];
  let i = 0, j = 0;
  const maxLen = Math.max(standard.length, user.length);
  
  // 简单的逐字对比（允许小范围跳过）
  while (i < standard.length && j < user.length) {
    if (standard[i] === user[j]) {
      i++;
      j++;
    } else {
      // 尝试在前后3个字符内找匹配
      let found = false;
      for (let offset = 1; offset <= 3 && !found; offset++) {
        if (i + offset < standard.length && standard[i + offset] === user[j]) {
          // 用户漏了几个字
          for (let k = i; k < i + offset; k++) {
            if (!missingChars.includes(standard[k])) {
              wrongPositions.push({ type: 'missing', char: standard[k], pos: k });
            }
          }
          i = i + offset + 1;
          j++;
          found = true;
        } else if (j + offset < user.length && standard[i] === user[j + offset]) {
          // 用户多说了几个字
          for (let k = j; k < j + offset; k++) {
            if (!extraChars.includes(user[k])) {
              wrongPositions.push({ type: 'extra', char: user[k], pos: k });
            }
          }
          i++;
          j = j + offset + 1;
          found = true;
        }
      }
      if (!found) {
        // 字符不匹配
        wrongPositions.push({ type: 'wrong', expected: standard[i], actual: user[j], pos: i });
        i++;
        j++;
      }
    }
  }
  
  // 生成友好的改正建议
  if (missingChars.length > 0) {
    const uniqueMissing = [...new Set(missingChars)].slice(0, 6);
    const missingList = uniqueMissing.map(c => `"${c}"`).join("、");
    suggestions.push(`你漏掉了这些字：${missingList}${missingChars.length > 6 ? "等" : ""}`);
  }
  
  // 找出明显的错误字符（不在标准文本中的）
  const wrongChars = wrongPositions.filter(w => w.type === 'wrong').slice(0, 3);
  if (wrongChars.length > 0) {
    const wrongList = wrongChars.map(w => `"${w.actual}"应该是"${w.expected}"`).join("，");
    suggestions.push(`有些字读错了：${wrongList}`);
  }
  
  // 如果有多余的字
  if (extraChars.length > 0) {
    const uniqueExtra = [...new Set(extraChars)].slice(0, 3);
    const extraList = uniqueExtra.map(c => `"${c}"`).join("、");
    suggestions.push(`这些字是多余的：${extraList}${extraChars.length > 3 ? "等" : ""}`);
  }
  
  // 长度提示
  if (user.length < standard.length * 0.7) {
    suggestions.push(`你只说了${user.length}个字，但应该要说${standard.length}个字哦～`);
  } else if (user.length > standard.length * 1.3) {
    suggestions.push(`你说得有点长，标准答案是${standard.length}个字，你说了${user.length}个字`);
  }
  
  // 如果没有任何具体建议，给出通用提示
  if (suggestions.length === 0) {
    return "读得不错，但还有一点点小差异，再仔细听一遍标准读音试试～";
  }
  
  return suggestions.join("\n");
}

// ===================== UI 渲染 =====================

const poemListEl = document.getElementById("poem-list");
const poemTitleEl = document.getElementById("poem-title");
const poemAuthorEl = document.getElementById("poem-author");
const poemTextEl = document.getElementById("poem-text");
const poemNotesEl = document.getElementById("poem-notes");
const poemTranslationEl = document.getElementById("poem-translation");
const modeButtons = document.querySelectorAll(".mode-btn");
const currentModeLabel = document.getElementById("current-mode-label");
const readModePanel = document.getElementById("read-mode-panel");
const followModePanel = document.getElementById("follow-mode-panel");
const reciteModePanel = document.getElementById("recite-mode-panel");
const btnStartFollow = document.getElementById("btn-start-follow");
const btnToggleHide = document.getElementById("btn-toggle-hide");
const btnStartRecite = document.getElementById("btn-start-recite");
const audioStatusEl = document.getElementById("audio-status");
const audioStatusTextEl = document.getElementById("audio-status-text");
const resultPanelEl = document.getElementById("result-panel");
const resultTextEl = document.getElementById("result-text");

let poemsData = [];
let currentPoemIndex = 0;
let currentMode = "read"; // read | follow | recite
let selectedLineIndex = null;
let isHiddenForRecite = false;

function setAudioStatus(text, type) {
  audioStatusTextEl.textContent = text;
  audioStatusEl.classList.remove("recording", "playing");
  if (type === "recording") audioStatusEl.classList.add("recording");
  if (type === "playing") audioStatusEl.classList.add("playing");
}

function showResult(text) {
  resultTextEl.textContent = text;
  resultPanelEl.classList.remove("hidden");
}

function clearResult() {
  resultPanelEl.classList.add("hidden");
  resultTextEl.textContent = "";
}

function renderPoemList() {
  poemListEl.innerHTML = "";
  
  // 按类型分组显示
  const grouped = {};
  poemsData.forEach((item, index) => {
    const type = item.type || "古诗";
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push({ item, index });
  });
  
  Object.keys(grouped).forEach(type => {
    // 添加分类标题
    const categoryLi = document.createElement("li");
    categoryLi.className = "poem-category";
    categoryLi.textContent = type;
    poemListEl.appendChild(categoryLi);
    
    // 添加该分类下的项目
    grouped[type].forEach(({ item, index }) => {
      const li = document.createElement("li");
      li.className = "poem-item" + (index === currentPoemIndex ? " active" : "");
      const metaText = item.author || (item.type === "课文段落" ? "课文" : item.type === "日积月累" ? "积累" : "");
      li.innerHTML = `
        <span class="poem-item-title">${item.title}</span>
        <span class="poem-item-meta">${metaText}</span>
      `;
      li.addEventListener("click", () => {
        currentPoemIndex = index;
        selectedLineIndex = null;
        btnStartFollow.disabled = true;
        renderPoemList();
        renderCurrentPoem();
      });
      poemListEl.appendChild(li);
    });
  });
}

function renderCurrentPoem() {
  clearResult();
  const poem = poemsData[currentPoemIndex];
  poemTitleEl.textContent = poem.title;
  
  // 根据类型决定是否显示作者
  if (poem.type === "古诗" && poem.author) {
    poemAuthorEl.textContent = poem.author;
    poemAuthorEl.style.display = "block";
  } else if (poem.type === "日积月累" && poem.author) {
    poemAuthorEl.textContent = poem.author;
    poemAuthorEl.style.display = "block";
  } else {
    poemAuthorEl.style.display = "none";
  }

  poemTextEl.innerHTML = "";
  poem.lines.forEach((line, index) => {
    const div = document.createElement("div");
    div.className =
      "poem-line" + (selectedLineIndex === index ? " active" : "");
    div.textContent = line;
    div.addEventListener("click", () => {
      selectedLineIndex = index;
      document
        .querySelectorAll(".poem-line")
        .forEach((el) => el.classList.remove("active"));
      div.classList.add("active");
      if (currentMode === "read") {
        const typeText = poem.type === "古诗" ? "古诗" : poem.type === "课文段落" ? "课文" : "内容";
        speakText(line, () => setAudioStatus(`正在朗读这段${typeText}…`, "playing"), () =>
          setAudioStatus("朗读完成，可以继续点别的句子~")
        );
      } else if (currentMode === "follow") {
        btnStartFollow.disabled = false;
        const preview = line.length > 15 ? line.slice(0, 15) + "..." : line;
        btnStartFollow.textContent = "开始跟读： " + preview;
      }
    });
    poemTextEl.appendChild(div);
  });

  // 注释
  poemNotesEl.innerHTML = "";
  poem.notes.forEach((note) => {
    const div = document.createElement("div");
    div.className = "note-item";
    div.textContent = note;
    div.addEventListener("click", () => {
      speakText(
        note,
        () => setAudioStatus("正在朗读注释…", "playing"),
        () => setAudioStatus("朗读完成")
      );
    });
    poemNotesEl.appendChild(div);
  });

  poemTranslationEl.textContent = poem.translation;
}

function switchMode(mode) {
  currentMode = mode;
  clearResult();
  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  readModePanel.classList.toggle("hidden", mode !== "read");
  followModePanel.classList.toggle("hidden", mode !== "follow");
  reciteModePanel.classList.toggle("hidden", mode !== "recite");

  if (mode === "read") {
    currentModeLabel.textContent = "点读模式";
    currentModeLabel.className = "badge badge-read";
    setAudioStatus("点一行文字，我就读给你听～");
  } else if (mode === "follow") {
    currentModeLabel.textContent = "跟读模式";
    currentModeLabel.className = "badge badge-follow";
    setAudioStatus("请选择一行要跟读的句子。");
  } else if (mode === "recite") {
    currentModeLabel.textContent = "背诵模式";
    currentModeLabel.className = "badge badge-recite";
    setAudioStatus("可以点击“开始背诵”，我会听你背。");
  }
}

// ===================== 跟读与背诵逻辑 =====================

btnStartFollow.addEventListener("click", () => {
  if (selectedLineIndex == null) return;
  const poem = poemsData[currentPoemIndex];
  const target = poem.lines[selectedLineIndex];
  clearResult();

  speakText(
    target,
    () => setAudioStatus("我先读一遍，请认真听哦～", "playing"),
    () => {
      setAudioStatus("轮到你啦，说完我会自动停止录音。", "recording");
      startRecognition({
        onText: (userText) => {
          const sim = calcSimilarity(target, userText);
          const score = Math.round(sim * 100);
          const feedback = generateFeedback(target, userText);
          let comment = "";
          if (score > 90) comment = "太棒啦，你几乎一字不差！";
          else if (score > 75) comment = "很好，再多注意几个小字就更完美啦～";
          else if (score > 50) comment = "有点像了，再试一次会更好哦。";
          else comment = "没关系，我们可以多练几次，加油！";
          
          // 如果相似度很高，只显示鼓励；否则显示具体的改正意见
          let resultText = `我听到的是：${userText}\n相似度：${score} 分\n\n`;
          if (score >= 90) {
            resultText += comment;
          } else {
            resultText += `${comment}\n\n📝 改正建议：\n${feedback}`;
          }
          showResult(resultText);
        },
        onEnd: () => {
          setAudioStatus("录音结束，可以再练一次。");
        },
      });
    }
  );
});

btnToggleHide.addEventListener("click", () => {
  isHiddenForRecite = !isHiddenForRecite;
  poemTextEl.style.visibility = isHiddenForRecite ? "hidden" : "visible";
  poemExtraVisibility(isHiddenForRecite);
});

function poemExtraVisibility(hidden) {
  const extra = document.getElementById("poem-extra");
  extra.style.visibility = hidden ? "hidden" : "visible";
}

btnStartRecite.addEventListener("click", () => {
  clearResult();
  const poem = poemsData[currentPoemIndex];
  const target = poem.lines.join("");
  setAudioStatus("开始听你背啦，说完我会自动停止录音。", "recording");
  startRecognition({
    onText: (userText) => {
      const sim = calcSimilarity(target, userText);
      const score = Math.round(sim * 100);
      const feedback = generateFeedback(target, userText);
      let comment = "";
      if (score > 90) comment = "哇，你已经可以很熟练地背出来啦！";
      else if (score > 75) comment = "不错不错，再熟练一点就完美啦～";
      else if (score > 50) comment = "有些地方还可以再巩固一下，加油！";
      else comment = "别灰心，多背几遍一定可以记住的！";
      
      // 如果相似度很高，只显示鼓励；否则显示具体的改正意见
      let resultText = `我听到的是：${userText}\n整体相似度：${score} 分\n\n`;
      if (score >= 90) {
        resultText += comment;
      } else {
        resultText += `${comment}\n\n📝 改正建议：\n${feedback}`;
      }
      showResult(resultText);
    },
    onEnd: () => {
      setAudioStatus("背诵结束，可以再背一遍试试。");
    },
  });
});

// ===================== 模式切换绑定 =====================

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    switchMode(mode);
  });
});

// ===================== 初始化 =====================

window.addEventListener("DOMContentLoaded", async () => {
  try {
    setAudioStatus("正在加载本课内容……");
    poemsData = await loadPoems();
    if (!poemsData.length) {
      poemTitleEl.textContent = "未找到内容";
      poemAuthorEl.textContent =
        "请检查 1.txt 的内容格式是否正确（支持古诗、课文段落、日积月累）。";
      return;
    }
    renderPoemList();
    renderCurrentPoem();
    switchMode("read");
  } catch (e) {
    console.error(e);
    poemTitleEl.textContent = "加载出错";
    poemAuthorEl.textContent = "请检查 1.txt 是否与网页在同一目录。";
  }
});


