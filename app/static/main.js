/**
 * Syntaxtree 沙盒 UI - 纯 CSS 平分左右布局 + 灯箱（拖拽平移、滚轮缩放）
 */

const $ = (sel) => document.querySelector(sel);

// ========== 灯箱 ==========
let lightboxPan = { x: 0, y: 0 };
let lightboxZoom = 1;
let lightboxStart = { x: 0, y: 0 };
let lightboxDragging = false;

function openLightbox() {
  if (!lastSvgContent) return;
  const lightbox = $('#lightbox');
  const wrapper = $('#lightbox .lightbox-svg-wrapper');
  const panZoom = $('#lightbox .lightbox-pan-zoom');

  lightboxPan = { x: 0, y: 0 };
  lightboxZoom = 1;
  lightboxDragging = false;

  // 直接用 SVG 源码注入内联 SVG，确保 <text> 在 DOM 中，支持选中复制
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
  const DRAG_THRESHOLD = 5;  // 像素，超过此距离才视为拖拽，否则可选中文本

  const onMouseDown = (e) => {
    if (e.target.closest('.lightbox-close')) return;
    if (e.button !== 0) return;  // 左键拖拽平移
    maybePanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    lightboxStart = { x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y };
  };

  const onMouseMove = (e) => {
    if (!maybePanning) return;
    if (!lightboxDragging) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;  // 未超过阈值，可能是在选文本
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
    lightboxDragging = false;
    panZoom.classList.remove('dragging');
    document.body.style.userSelect = '';
  };

  const onWheel = (e) => {
    e.preventDefault();
    const ZOOM_STEP = 0.25;  // 每次滚轮缩放步长
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const zoomOld = lightboxZoom;
    lightboxZoom = Math.max(0.5, Math.min(5, lightboxZoom + delta));
    if (zoomOld === lightboxZoom) return;
    // 以鼠标位置为缩放焦点：调整 pan 使鼠标下的点保持不动
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
    $('#lightbox .lightbox-close').onclick = null;
    cleanup();
  };

  panZoom.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  panZoom.addEventListener('wheel', onWheel, { passive: false });

  $('#lightbox .lightbox-close').onclick = closeLightbox;

  // 点击黑色幕布（图片周边）关闭灯箱
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

// ========== 状态提示 ==========
function setStatus(text, type = '') {
  const el = $('#status');
  el.textContent = text;
  el.className = 'status ' + type;
}

// 当前 SVG 的 blob URL 及源码，用于「在新标签页打开图片」和复制
let currentSvgBlobUrl = null;
let lastSvgContent = null;

// ========== 新标签页打开 ==========
function openSvgInNewTab() {
  if (!currentSvgBlobUrl) {
    setStatus('请先生成 SVG', 'error');
    return;
  }
  window.open(currentSvgBlobUrl, '_blank', 'noopener');
}

// ========== 复制 SVG ==========
function copySvgToClipboard() {
  if (!lastSvgContent) {
    setStatus('请先生成 SVG', 'error');
    return;
  }
  const svgStr = lastSvgContent;
  navigator.clipboard.writeText(svgStr).then(() => {
    setStatus('已复制到剪贴板', 'success');
  }).catch(() => {
    setStatus('复制失败', 'error');
  });
}

// ========== 生成 SVG ==========
async function generateSvg() {
  const input = $('#code-input');
  const output = $('#svg-output');
  const code = input.value.trim();

  if (!code) {
    setStatus('请先输入括号表达式', 'error');
    return;
  }

  setStatus('生成中...');
  $('#btn-generate').disabled = true;
  const startTime = Date.now();

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      if (currentSvgBlobUrl) {
        URL.revokeObjectURL(currentSvgBlobUrl);
        currentSvgBlobUrl = null;
      }
      const blob = new Blob([data.svg_content], { type: 'image/svg+xml' });
      currentSvgBlobUrl = URL.createObjectURL(blob);
      lastSvgContent = data.svg_content;
      const wrap = document.createElement('div');
      wrap.className = 'svg-preview';
      wrap.innerHTML = data.svg_content;
      output.innerHTML = '';
      output.appendChild(wrap);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      setStatus(`用时${elapsed}秒`, 'success', { keep: true });
    } else {
      if (currentSvgBlobUrl) { URL.revokeObjectURL(currentSvgBlobUrl); currentSvgBlobUrl = null; }
      lastSvgContent = null;
      output.innerHTML = `<p class="placeholder status error">${data.detail || data.message || '生成失败'}</p>`;
      setStatus('');  // 错误仅显示在 SVG 展示区
    }
  } catch (e) {
    if (currentSvgBlobUrl) { URL.revokeObjectURL(currentSvgBlobUrl); currentSvgBlobUrl = null; }
    lastSvgContent = null;
    output.innerHTML = `<p class="placeholder status error">请求失败: ${e.message}</p>`;
    setStatus('');  // 错误仅显示在 SVG 展示区
  } finally {
    $('#btn-generate').disabled = false;
  }
}

// ========== 事件绑定 ==========
function bindEvents() {
  $('#btn-generate').addEventListener('click', generateSvg);
  $('#btn-copy-svg').addEventListener('click', copySvgToClipboard);
  $('#btn-open-new-tab').addEventListener('click', openSvgInNewTab);

  // 点击预览区打开灯箱（左键）
  $('#svg-output').addEventListener('click', (e) => {
    const wrap = e.target.closest('.svg-preview');
    if (wrap && e.button === 0) {
      e.preventDefault();
      openLightbox();
    }
  });
}

// ========== 入口 ==========
document.addEventListener('DOMContentLoaded', bindEvents);
