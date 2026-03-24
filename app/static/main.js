/**
 * Syntaxtree 沙盒 UI - 纯 CSS 平分左右布局 + 灯箱（拖拽平移、滚轮缩放）
 * 优化版：增强了错误处理、异步状态控制和剪贴板降级
 */

const $ = (sel) => document.querySelector(sel);

// ========== 灯箱状态 ==========
let lightboxPan = { x: 0, y: 0 };
let lightboxZoom = 1;
let lightboxStart = { x: 0, y: 0 };
let lightboxDragging = false;
let currentSvgBlobUrl = null;
let lastSvgContent = null;

// ========== 状态提示 ==========
// 暂不显示，保留 #status 区域，等逻辑梳理后再启用
function setStatus(text, type = '') {
  // no-op
}

// ========== 灯箱操作 ==========
function openLightbox() {
  if (!lastSvgContent) return;
  const lightbox = $('#lightbox');
  const wrapper = $('#lightbox .lightbox-svg-wrapper');
  const panZoom = $('#lightbox .lightbox-pan-zoom');
  const closeBtn = $('#lightbox .lightbox-close');

  if (!lightbox || !wrapper || !panZoom || !closeBtn) return;

  lightboxPan = { x: 0, y: 0 };
  lightboxZoom = 1;
  lightboxDragging = false;

  // 注入 SVG 源码
  wrapper.innerHTML = '';
  const bg = document.createElement('div');
  bg.className = 'lightbox-svg-bg';
  wrapper.appendChild(bg);
  
  const wrap = document.createElement('div');
  wrap.className = 'lightbox-svg-content';
  wrap.innerHTML = lastSvgContent;
  wrapper.appendChild(wrap);

  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  applyLightboxTransform();

  let maybePanning = false;
  let panStart = { x: 0, y: 0 };
  const DRAG_THRESHOLD = 5;

  const onMouseDown = (e) => {
    if (e.target.closest('.lightbox-close')) return;
    if (e.button !== 0) return;
    maybePanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    lightboxStart = { x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y };
  };

  const onMouseMove = (e) => {
    if (!maybePanning) return;
    if (!lightboxDragging) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      lightboxDragging = true;
      panZoom.classList.add('dragging');
      document.body.style.userSelect = 'none';
    }
    lightboxPan.x = e.clientX - lightboxStart.x;
    lightboxPan.y = e.clientY - lightboxStart.y;
    applyLightboxTransform();
  };

  const onMouseUp = () => {
    maybePanning = false;
    if (lightboxDragging) {
      lightboxDragging = false;
      panZoom.classList.remove('dragging');
      document.body.style.userSelect = '';
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const ZOOM_STEP = 0.25;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const zoomOld = lightboxZoom;
    lightboxZoom = Math.max(0.5, Math.min(5, lightboxZoom + delta));
    if (zoomOld === lightboxZoom) return;
    
    const rect = panZoom.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const ratio = 1 - lightboxZoom / zoomOld;
    
    lightboxPan.x += (e.clientX - centerX - lightboxPan.x) * ratio;
    lightboxPan.y += (e.clientY - centerY - lightboxPan.y) * ratio;
    applyLightboxTransform();
  };

  const cleanup = () => {
    panZoom.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    panZoom.removeEventListener('wheel', onWheel);
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lightbox.onclick = null;
    closeBtn.onclick = null;
    cleanup();
  };

  panZoom.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  panZoom.addEventListener('wheel', onWheel, { passive: false });
  closeBtn.onclick = closeLightbox;

  lightbox.onclick = (e) => {
    if (!e.target.closest('.lightbox-svg-wrapper') && !e.target.closest('.lightbox-close')) {
      closeLightbox();
    }
  };
}

function applyLightboxTransform() {
  const wrapper = $('#lightbox .lightbox-svg-wrapper');
  if (wrapper) {
    wrapper.style.transform = `translate(calc(-50% + ${lightboxPan.x}px), calc(-50% + ${lightboxPan.y}px)) scale(${lightboxZoom})`;
  }
}

// ========== 新标签页打开 ==========
function openSvgInNewTab() {
  if (!currentSvgBlobUrl) {
    setStatus('请先生成 SVG', 'error');
    return;
  }
  window.open(currentSvgBlobUrl, '_blank', 'noopener');
}

// ========== 禁用/启用按钮组 ==========
function toggleButtons(disabled) {
  ['#btn-parse', '#btn-generate', '#btn-parse-generate'].forEach(id => {
    const btn = $(id);
    if (btn) btn.disabled = disabled;
  });
}

// ========== 括号表达式排版（仅空白/换行，语义不变）==========
const BRACKET_INDENT = '  ';

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i += 1;
  return i;
}

function readLabel(s, i) {
  const start = i;
  while (i < s.length && !/\s/.test(s[i]) && s[i] !== '[' && s[i] !== ']') i += 1;
  if (i === start) return { error: true };
  return { label: s.slice(start, i), i };
}

/** @returns {{ node: { label: string, children: object[] }, i: number } | { error: true, i: number }} */
function parseBracketNode(s, i) {
  i = skipWs(s, i);
  if (i >= s.length || s[i] !== '[') return { error: true, i };
  i += 1;
  const lab = readLabel(s, i);
  if (lab.error) return { error: true, i };
  i = lab.i;
  const label = lab.label;
  const children = [];
  while (true) {
    i = skipWs(s, i);
    if (i >= s.length) return { error: true, i };
    if (s[i] === ']') {
      i += 1;
      return { node: { label, children }, i };
    }
    if (s[i] !== '[') return { error: true, i };
    const ch = parseBracketNode(s, i);
    if (ch.error) return ch;
    children.push(ch.node);
    i = ch.i;
  }
}

function parseBracketTree(code) {
  const s = code.trim();
  if (!s) return null;
  const r = parseBracketNode(s, 0);
  if (r.error) return null;
  const end = skipWs(s, r.i);
  if (end !== s.length) return null;
  return r.node;
}

function prettyBracketLines(node, depth, lines) {
  const ind = BRACKET_INDENT.repeat(depth);
  if (node.children.length === 0) {
    lines.push(`${ind}[${node.label}]`);
    return;
  }
  lines.push(`${ind}[${node.label}`);
  for (const c of node.children) {
    prettyBracketLines(c, depth + 1, lines);
  }
  lines.push(`${ind}]`);
}

/** 解析成功返回多行缩进串；无法解析则返回 null（调用方保留原文） */
function formatBracketCode(code) {
  const node = parseBracketTree(code);
  if (!node) return null;
  const lines = [];
  prettyBracketLines(node, 0, lines);
  return lines.join('\n');
}

/** 对代码框当前内容尝试排版（解析失败则保持原样） */
function applyBracketFormat() {
  const input = $('#code-input');
  if (!input) return;
  const v = input.value.trim();
  if (!v) return;
  const f = formatBracketCode(v);
  if (!f) return;
  input.value = f;
  updateCodePlaceholder();
}

// ========== 安全获取 JSON ==========
// 拦截 Nginx 502 等返回的非 JSON 格式报错
async function safeFetchJson(url, options) {
  const res = await fetch(url, options);
  try {
    const data = await res.json();
    return { res, data };
  } catch (err) {
    throw new Error(`服务器响应格式错误 (HTTP ${res.status})`);
  }
}

// ========== 解析句子 ==========
async function parseSentence(showTime = true) {
  const sentenceInput = $('#sentence-input');
  const codeInput = $('#code-input');
  if (!sentenceInput || !codeInput) return null;

  const sentence = sentenceInput.value.trim();
  if (!sentence) {
    setStatus('请先在句子输入框输入英文句子', 'error');
    return null;
  }

  setStatus('解析中...');
  toggleButtons(true);
  const startTime = Date.now();

  try {
    const { res, data } = await safeFetchJson('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence }),
    });

    if (res.ok && data.status === 'success') {
      codeInput.value = data.code;
      updateCodePlaceholder();
      if (showTime) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        setStatus(`解析用时 ${elapsed} 秒`, 'success');
      }
      return data.code;
    } else {
      setStatus(data.detail || data.message || '解析失败', 'error');
      return null;
    }
  } catch (e) {
    setStatus('请求失败: ' + e.message, 'error');
    return null;
  } finally {
    toggleButtons(false);
  }
}

// ========== 生成 SVG ==========
async function generateSvg(internalCall = false) {
  const input = $('#code-input');
  const output = $('#svg-output');
  if (!input || !output) return false;

  const code = input.value.trim();
  if (!code) {
    setStatus('请先输入括号表达式', 'error');
    return false;
  }

  setStatus('生成中...');
  $('#btn-generate').disabled = true;
  const startTime = Date.now();

  try {
    const { res, data } = await safeFetchJson('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (res.ok && data.status === 'success') {
      if (currentSvgBlobUrl) {
        URL.revokeObjectURL(currentSvgBlobUrl);
      }
      const blob = new Blob([data.svg_content], { type: 'image/svg+xml' });
      currentSvgBlobUrl = URL.createObjectURL(blob);
      lastSvgContent = data.svg_content;
      
      output.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'svg-preview';
      wrap.innerHTML = data.svg_content;
      output.appendChild(wrap);

      if (!internalCall) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        setStatus(`生成用时 ${elapsed} 秒`, 'success');
      }
      return true;
    } else {
      throw new Error(data.detail || data.message || '生成失败');
    }
  } catch (e) {
    if (currentSvgBlobUrl) { 
        URL.revokeObjectURL(currentSvgBlobUrl); 
        currentSvgBlobUrl = null; 
    }
    lastSvgContent = null;
    output.innerHTML = `<p class="placeholder status error">${e.message}</p>`;
    // 将状态栏清空，让用户专注看预览区的报错
    if (!internalCall) setStatus(''); 
    return false;
  } finally {
    $('#btn-generate').disabled = false;
  }
}

// ========== 解析并生成 (修复了逻辑漏洞) ==========
async function parseAndGenerate() {
  const sentenceInput = $('#sentence-input');
  if (!sentenceInput || !sentenceInput.value.trim()) {
    setStatus('请先在句子输入框输入英文句子', 'error');
    return;
  }
  
  const startTime = Date.now();
  // 第一步：解析
  const code = await parseSentence(false); 
  if (code) {
    // 第二步：只有解析成功，才生成 SVG
    const isGenSuccess = await generateSvg(true); 
    if (isGenSuccess) {
      // 第三步：只有两步都成功，才展示总用时
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      setStatus(`总用时 ${elapsed} 秒`, 'success');
    } else {
      setStatus('解析成功，但生成 SVG 失败', 'error');
    }
  }
}

// ========== 剪贴板统一处理 (降级保护) ==========
async function copyToClipboard(text, successMsg) {
  if (!navigator.clipboard) {
    // 降级：如果是非安全上下文 (HTTP 局域网)，该 API 不可用
    setStatus('当前环境不支持一键复制，请手动选中复制', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(successMsg, 'success');
  } catch (err) {
    setStatus('复制失败，请重试', 'error');
  }
}

function copyCodeToClipboard() {
  const code = $('#code-input')?.value.trim();
  if (!code) {
    setStatus('请先解析句子或输入括号表达式', 'error');
    return;
  }
  copyToClipboard(code, '代码已复制到剪贴板');
}

function copySvgToClipboard() {
  if (!lastSvgContent) {
    setStatus('请先生成 SVG', 'error');
    return;
  }
  copyToClipboard(lastSvgContent, 'SVG 源码已复制到剪贴板');
}

// ========== 代码区 placeholder 显隐 ==========
function updateCodePlaceholder() {
  const input = $('#code-input');
  const ph = $('#code-placeholder');
  if (!input || !ph) return;
  if (input.value.trim()) {
    ph.classList.add('hidden');
  } else {
    ph.classList.remove('hidden');
  }
}

// ========== 事件绑定 ==========
function bindEvents() {
  updateCodePlaceholder();
  
  const sentenceInput = $('#sentence-input');
  if (sentenceInput) {
    sentenceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        parseAndGenerate();
      }
    });
  }

  const codeInput = $('#code-input');
  if (codeInput) {
    // 极简防抖，避免拼音输入法过程中疯狂触发
    let timeout;
    codeInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateCodePlaceholder, 100);
    });
    codeInput.addEventListener('paste', () => setTimeout(updateCodePlaceholder, 0));
  }

  // 绑定按钮点击事件
  const bindClick = (id, handler) => {
    const el = $(id);
    if (el) el.addEventListener('click', handler);
  };

  bindClick('#btn-parse', parseSentence);
  bindClick('#btn-generate', generateSvg);
  bindClick('#btn-parse-generate', parseAndGenerate);
  bindClick('#btn-format-code', applyBracketFormat);
  bindClick('#btn-copy-code', copyCodeToClipboard);
  bindClick('#btn-copy-svg', copySvgToClipboard);
  bindClick('#btn-open-new-tab', openSvgInNewTab);

  // 点击预览区打开灯箱（左键）
  const svgOutput = $('#svg-output');
  if (svgOutput) {
    svgOutput.addEventListener('click', (e) => {
      const wrap = e.target.closest('.svg-preview');
      if (wrap && e.button === 0) {
        e.preventDefault();
        openLightbox();
      }
    });
  }
}

// ========== 入口 ==========
document.addEventListener('DOMContentLoaded', bindEvents);