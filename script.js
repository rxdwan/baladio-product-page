/* ============================================
   BALADIO - script.js
   Handles: navbar, sparkles, download API,
   changelog parser, scroll animations
   ============================================ */

'use strict';

/* ---- Navbar glass on scroll ---- */
(function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---- Sparkles removed by user request ---- */

/* ---- Comet Animation (Canvas) ---- */
(function initComets() {
  const canvas = document.getElementById('comet-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width, height;
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Comet {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = -50;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = Math.random() * 1.5 + 1;
      this.size = Math.random() * 1.5 + 1;
      this.life = 0;
      this.maxLife = Math.random() * 800 + 800;
      this.phase = Math.random() * Math.PI * 2;
      this.trail = [];
      this.active = false;
    }
    spawn() {
      this.reset();
      this.active = true;
    }
    update() {
      if (!this.active) return;
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 60) this.trail.shift();
      
      this.vx += Math.sin(this.life * 0.02 + this.phase) * 0.05;
      
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      
      if (this.life > this.maxLife || this.y > height + 200 || this.x < -200 || this.x > width + 200) {
        this.active = false;
        this.trail = [];
      }
    }
    draw() {
      if (!this.active) return;
      
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        const grad = ctx.createLinearGradient(this.trail[0].x, this.trail[0].y, this.x, this.y);
        grad.addColorStop(0, 'rgba(179, 157, 219, 0)');
        grad.addColorStop(1, 'rgba(179, 157, 219, 0.6)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.size * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
      ctx.fillStyle = '#d1c4e9';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#d1c4e9';
      
      ctx.beginPath();
      const spikes = 4;
      const outerRadius = this.size * 3;
      const innerRadius = this.size;
      let rot = Math.PI / 2 * 3;
      const step = Math.PI / spikes;
      ctx.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
        rot += step;
      }
      ctx.lineTo(0, -outerRadius);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  const comets = Array(5).fill().map(() => new Comet());
  
  function animate() {
    ctx.clearRect(0, 0, width, height);
    comets.forEach(c => {
      if (!c.active && Math.random() < 0.005) {
        c.spawn();
      }
      c.update();
      c.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ---- Download: fetch latest release from GitHub API ---- */
(function initDownload() {
  const metaEl  = document.getElementById('download-meta');
  const btn     = document.getElementById('download-btn');
  const btnLabel = document.getElementById('download-btn-label');

  const API_URL = 'https://api.github.com/repos/rxdwan/Baladio-Installer/releases/latest';

  fetch(API_URL)
    .then((r) => {
      if (!r.ok) throw new Error('API error');
      return r.json();
    })
    .then((data) => {
      const version = data.tag_name || data.name || 'Latest';
      const publishedRaw = data.published_at;
      const date = publishedRaw
        ? new Date(publishedRaw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

      const exeAsset = (data.assets || []).find((a) => a.name.endsWith('.exe'));

      if (metaEl) {
        metaEl.textContent = `Version ${version}${date ? ' \u00b7 Released ' + date : ''}`;
      }

      if (exeAsset && btn) {
        btn.href = exeAsset.browser_download_url;
        if (btnLabel) btnLabel.textContent = `Download ${exeAsset.name}`;
      } else if (btn) {
        btn.href = data.html_url || 'https://github.com/rxdwan/Baladio-Installer/releases/latest';
        if (btnLabel) btnLabel.textContent = 'Download .exe';
      }
    })
    .catch(() => {
      if (metaEl) metaEl.textContent = 'Latest release';
      if (btn) btn.href = 'https://github.com/rxdwan/Baladio-Installer/releases/latest';
    });

  /* Download Section Interactive Q&A Logic */
  const techYesBtn = document.getElementById('btn-tech-yes');
  const techNoBtn = document.getElementById('btn-tech-no');
  const interactiveQ = document.getElementById('download-interactive');
  const nonTechView = document.getElementById('download-non-tech');
  const techView = document.getElementById('download-tech');
  const resetBtn = document.getElementById('btn-reset-download');
  const termBody = document.getElementById('terminal-commands');

  function detectOS() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux')) return 'linux';
    return 'unknown';
  }

  function renderTerminalCommands() {
    const os = detectOS();

    // Steps 1–3 are OS-agnostic
    let commandsHtml = `
      <span class="comment"># 1. Clone the repository</span><br/>
      <span class="cmd">git clone https://github.com/rxdwan/baladio.git</span><br/>
      <span class="cmd">cd Baladio</span><br/><br/>
      <span class="comment"># 2. Install dependencies</span><br/>
      <span class="cmd">npm install</span><br/><br/>
      <span class="comment"># 3. Create a songs/ folder one level ABOVE Baladio/ and drop your audio files in it</span><br/>
    `;

    if (os === 'windows') {
      commandsHtml += `
      <span class="cmd">mkdir ..\songs</span><br/><br/>
      <span class="comment"># 4. Install yt-dlp (for YouTube downloads in the Discovery panel)</span><br/>
      <span class="comment">#    Option A: winget (recommended)</span><br/>
      <span class="cmd">winget install yt-dlp</span><br/>
      <span class="comment">#    Option B: pip</span><br/>
      <span class="cmd">pip install yt-dlp</span><br/><br/>
      <span class="comment"># 5. Start the server, then open http://localhost:3000 in your browser</span><br/>
      <span class="cmd">node server.js</span>
      `;
    } else if (os === 'mac') {
      commandsHtml += `
      <span class="cmd">mkdir ../songs</span><br/><br/>
      <span class="comment"># 4. Install yt-dlp (for YouTube downloads in the Discovery panel)</span><br/>
      <span class="cmd">brew install yt-dlp</span><br/>
      <span class="comment">#    or: pip install yt-dlp</span><br/><br/>
      <span class="comment"># 5. Start the server, then open http://localhost:3000 in your browser</span><br/>
      <span class="cmd">npm start</span>
      `;
    } else {
      commandsHtml += `
      <span class="cmd">mkdir ../songs</span><br/><br/>
      <span class="comment"># 4. Install yt-dlp (for YouTube downloads in the Discovery panel)</span><br/>
      <span class="cmd">pip install yt-dlp</span><br/>
      <span class="comment">#    or Debian/Ubuntu: sudo apt install yt-dlp</span><br/><br/>
      <span class="comment"># 5. Start the server, then open http://localhost:3000 in your browser</span><br/>
      <span class="cmd">npm start</span>
      `;
    }

    if (termBody) {
      termBody.innerHTML = commandsHtml;
    }
    
    renderTechBadges();
  }

  function renderTechBadges() {
    const container = document.getElementById('tech-badges-container');
    if (!container) return;
    
    const badges = [
      { 
        name: 'Node.js', 
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.288 3.868l-2.02-.916c-.033-.015-.068-.023-.106-.023h-1.042c-.038 0-.074.008-.106.023l-2.02.916a.23.23 0 0 0-.135.21v11.66c0 .093.056.175.14.212l2.366 1.074c.08.035.176.035.257 0l2.365-1.074a.23.23 0 0 0 .14-.213V4.078a.23.23 0 0 0-.135-.21zm-2.126 13.064l-2.006-.91V4.288l2.006.91v11.734zm5.004-9.366l-2.106-.957a.23.23 0 0 0-.134-.21V5.244a.23.23 0 0 0-.106-.023h-.846a.23.23 0 0 0-.106.023l-2.106.957a.23.23 0 0 0-.135.21v8.835c0 .092.056.174.14.212l2.35 1.066c.08.035.175.035.255 0l2.35-1.066a.23.23 0 0 0 .14-.213V7.776a.23.23 0 0 0-.135-.21zm-2.22 8.79l-1.87-.85v-7.69l1.87.848v7.692z"/></svg>' 
      },
      { 
        name: 'yt-dlp', 
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>' 
      },
      { 
        name: 'LRCLIB', 
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h13.4a.6.6 0 0 1 .6.6v13.114M6 17h14M6 21h14"></path><path d="M10 7h4v4h-4z"></path></svg>' 
      },
      { 
        name: 'iTunes API', 
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>' 
      }
    ];

    container.innerHTML = badges.map(b => `
      <div class="tech-badge">
        <div class="tech-badge-icon">${b.icon}</div>
        <div class="tech-badge-text">${b.name}</div>
      </div>
    `).join('');
  }

  if (techYesBtn && techNoBtn && interactiveQ && nonTechView && techView && resetBtn) {
    techYesBtn.addEventListener('click', () => {
      interactiveQ.style.display = 'none';
      techView.style.display = 'block';
      renderTerminalCommands();
    });

    techNoBtn.addEventListener('click', () => {
      interactiveQ.style.display = 'none';
      nonTechView.style.display = 'block';
    });

    resetBtn.addEventListener('click', () => {
      techView.style.display = 'none';
      nonTechView.style.display = 'none';
      interactiveQ.style.display = 'flex';
    });
  }
})();

/* ---- Changelog: fetch, parse, render ---- */
(function initChangelog() {
  const loadingEl = document.getElementById('changelog-loading');
  const MD_URL = 'https://raw.githubusercontent.com/rxdwan/Baladio/main/CHANGELOG.md';

  fetch(MD_URL)
    .then((r) => {
      if (!r.ok) throw new Error('Fetch failed');
      return r.text();
    })
    .then((text) => {
      const versions = parseChangelog(text);
      if (loadingEl) loadingEl.remove();
      renderChangelog(versions);
    })
    .catch(() => {
      const wrap = document.getElementById('changelog-map-wrap');
      if (loadingEl) {
        loadingEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.875rem;">Could not load changelog. <a href="https://github.com/rxdwan/Baladio/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" style="color:var(--accent-1);">View on GitHub</a></p>';
      }
    });

  function parseChangelog(text) {
    const versions = [];
    const versionRegex = /^## \[(.+?)\](?: - (\d{4}-\d{2}-\d{2}))?/gm;
    const sectionRegex = /^### (.+)/gm;

    const lines = text.split('\n');
    let current = null;
    let currentSection = null;

    for (const line of lines) {
      const vMatch = line.match(/^## \[(.+?)\](?: - (\d{4}-\d{2}-\d{2}))?/);
      if (vMatch) {
        if (current) versions.push(current);
        current = { version: vMatch[1], date: vMatch[2] || '', sections: {} };
        currentSection = null;
        continue;
      }

      if (!current) continue;

      const sMatch = line.match(/^### (.+)/);
      if (sMatch) {
        currentSection = sMatch[1].trim();
        current.sections[currentSection] = [];
        continue;
      }

      if (currentSection && line.startsWith('- ')) {
        const raw = line.replace(/^- /, '').trim();
        // Strip bold markers: **Text**: rest
        const cleaned = raw.replace(/\*\*(.*?)\*\*:?\s*/g, (_, label) => label + ': ').trim();
        current.sections[currentSection].push(cleaned);
      }
    }

    if (current) versions.push(current);
    return versions;
  }

  function renderChangelog(versions) {
    const wrap = document.getElementById('changelog-map-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';
    
    // SVG layer sits on top of or behind the DOM elements
    const svgLayer = document.createElement('div');
    svgLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    
    // DOM layer uses Flexbox to perfectly space everything vertically
    const domLayer = document.createElement('div');
    domLayer.style.cssText = 'position:relative;width:100%;z-index:2; display:flex; flex-direction:column; gap:80px; padding: 60px 0; max-width: 1200px; margin: 0 auto;';

    wrap.style.position = 'relative';
    wrap.appendChild(svgLayer);
    wrap.appendChild(domLayer);

    versions.forEach((ver, idx) => {
      // Alternating sides: Card on left for even (01), right for odd (02)
      const isLeftCard = idx % 2 === 0;

      const row = document.createElement('div');
      row.className = 'cmap-row';
      row.style.cssText = `
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: ${isLeftCard ? 'flex-start' : 'flex-end'};
        padding: ${isLeftCard ? '0 50% 0 24px' : '0 24px 0 50%'};
        box-sizing: border-box;
      `;

      // The Card
      const cardEl = document.createElement('div');
      cardEl.className = 'cmap-card';
      cardEl.style.cssText = `
        position: relative;
        width: 100%; max-width: 440px;
        background: rgba(255,255,255,0.78);
        border: 1px solid rgba(255,255,255,0.95);
        border-radius: 20px; padding: 24px 28px;
        backdrop-filter: blur(24px);
        box-shadow: 0 8px 32px rgba(126,87,194,0.09);
        z-index: 4; transition: transform 0.3s, box-shadow 0.3s;
        opacity: 0; transform: translateY(20px);
      `;
      
      const sections = ver.sections;
      let allItems = [];
      Object.keys(sections).forEach(t => sections[t].forEach(item => allItems.push({ type: t, item })));
      const typeClass = t => t === 'Added' ? 'type-added' : t === 'Fixed' ? 'type-fixed' : 'type-changed';
      const vis = allItems.slice(0, 4);
      const hidden = allItems.slice(4);
      const fDate = ver.date ? new Date(ver.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '';

      cardEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
          <span style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;color:#7e57c2;padding:3px 12px;border-radius:100px;background:rgba(149,117,205,0.1);">v${escHtml(ver.version)}</span>
          ${fDate ? `<span style="font-size:0.72rem;color:var(--text-muted);font-weight:500;">${fDate}</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${vis.map(({ type, item }) => `
            <div style="display:flex;align-items:flex-start;gap:9px;font-size:0.85rem;color:var(--text-secondary);line-height:1.55;">
              <div style="width:5px;height:5px;border-radius:50%;background:#9575cd;box-shadow:0 0 5px rgba(149,117,205,0.6);margin-top:7px;flex-shrink:0;"></div>
              <span><span class="changelog-item-type ${typeClass(type)}">${type}</span>${escHtml(item)}</span>
            </div>`).join('')}
        </div>
        ${hidden.length > 0 ? `
          <button class="changelog-expand-btn cmap-expand" aria-expanded="false" type="button" style="margin-top:12px;margin-left:-4px;">
            <span>+${hidden.length} more</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="changelog-collapsed" style="margin-top:8px;">
            <div style="display:flex;flex-direction:column;gap:9px;">
              ${hidden.map(({ type, item }) => `
                <div style="display:flex;align-items:flex-start;gap:9px;font-size:0.85rem;color:var(--text-secondary);line-height:1.55;">
                  <div style="width:5px;height:5px;border-radius:50%;background:#9575cd;box-shadow:0 0 5px rgba(149,117,205,0.6);margin-top:7px;flex-shrink:0;"></div>
                  <span><span class="changelog-item-type ${typeClass(type)}">${type}</span>${escHtml(item)}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
      `;

      cardEl.addEventListener('mouseenter', () => {
        cardEl.style.transform = 'translateY(-5px)';
        cardEl.style.boxShadow = '0 18px 48px rgba(126,87,194,0.14)';
      });
      cardEl.addEventListener('mouseleave', () => {
        cardEl.style.transform = 'translateY(0)';
        cardEl.style.boxShadow = '0 8px 32px rgba(126,87,194,0.09)';
      });

      const xBtn = cardEl.querySelector('.cmap-expand');
      if (xBtn) {
        const panel = cardEl.querySelector('.changelog-collapsed');
        xBtn.addEventListener('click', e => {
          e.stopPropagation();
          const open = panel.classList.toggle('open');
          xBtn.classList.toggle('open', open);
          xBtn.setAttribute('aria-expanded', String(open));
          xBtn.querySelector('span').textContent = open ? 'Show less' : `+${hidden.length} more`;
          // Schedule map redraw after animation
          setTimeout(drawMap, 350);
        });
      }

      // The Node
      const nodeEl = document.createElement('div');
      nodeEl.className = 'cmap-node';
      nodeEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: ${isLeftCard ? '58%' : '42%'};
        transform: translate(-50%, -50%);
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #fff 0%, #ede7f6 100%);
        border: 2px solid #9575cd;
        box-shadow: 0 0 0 8px rgba(149,117,205,0.1);
        display: flex; align-items: center; justify-content: center;
        font-family: var(--font-serif); font-size: 0.95rem; font-weight: 600; color: #7e57c2;
        z-index: 5; cursor: pointer;
        opacity: 0; transition: opacity 0.5s;
      `;
      nodeEl.textContent = String(idx + 1).padStart(2, '0');

      row.appendChild(cardEl);
      row.appendChild(nodeEl);
      domLayer.appendChild(row);

      setTimeout(() => {
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'translateY(0)';
        nodeEl.style.opacity = '1';
      }, 100 + idx * 120);
    });

    let resizeTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(drawMap, 50);
    });
    ro.observe(wrap);
    ro.observe(domLayer);

    // Initial draw
    setTimeout(drawMap, 100);

    let dashOffset = 0;
    let animId = null;

    function drawMap() {
      const W = wrap.clientWidth;
      const H = domLayer.offsetHeight;
      if (W === 0 || H === 0) return;

      svgLayer.innerHTML = '';
      
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.overflow = 'visible';
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';

      svg.innerHTML = `
        <defs>
          <filter id="cmap-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <linearGradient id="cmap-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#9575cd" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#d1c4e9" stop-opacity="0.1"/>
          </linearGradient>
        </defs>`;

      const rows = Array.from(domLayer.querySelectorAll('.cmap-row'));
      const wrapRect = wrap.getBoundingClientRect();
      
      const pts = rows.map(row => {
        const node = row.querySelector('.cmap-node');
        const card = row.querySelector('.cmap-card');
        const nRect = node.getBoundingClientRect();
        const cRect = card.getBoundingClientRect();
        return {
          nx: nRect.left + nRect.width/2 - wrapRect.left,
          ny: nRect.top + nRect.height/2 - wrapRect.top,
          cx: cRect.left + cRect.width/2 - wrapRect.left,
          cy: cRect.top + cRect.height/2 - wrapRect.top,
          cLeft: cRect.left - wrapRect.left,
          cRight: cRect.right - wrapRect.left,
          cTop: cRect.top - wrapRect.top,
          cBottom: cRect.bottom - wrapRect.top,
          isLeft: row.style.justifyContent === 'flex-start'
        };
      });

      // 1. Draw S-Curve path
      function buildPath(p) {
        if (p.length < 2) return '';
        let d = `M ${p[0].nx} ${p[0].ny}`;
        for (let i = 0; i < p.length - 1; i++) {
          const a = p[i], b = p[i + 1];
          const my = (a.ny + b.ny) / 2;
          d += ` C ${a.nx} ${my}, ${b.nx} ${my}, ${b.nx} ${b.ny}`;
        }
        return d;
      }
      
      const pathD = buildPath(pts);

      if (pathD) {
        const glow = document.createElementNS(svgNS, 'path');
        glow.setAttribute('d', pathD);
        glow.setAttribute('fill', 'none');
        glow.setAttribute('stroke', 'url(#cmap-grad)');
        glow.setAttribute('stroke-width', '10');
        glow.setAttribute('stroke-linecap', 'round');
        glow.setAttribute('filter', 'url(#cmap-glow)');
        glow.style.opacity = '0.4';
        svg.appendChild(glow);

        const dash = document.createElementNS(svgNS, 'path');
        dash.setAttribute('d', pathD);
        dash.setAttribute('fill', 'none');
        dash.setAttribute('stroke', '#b39ddb');
        dash.setAttribute('stroke-width', '2');
        dash.setAttribute('stroke-linecap', 'round');
        dash.setAttribute('stroke-dasharray', '10 8');
        svg.appendChild(dash);

        if (animId) cancelAnimationFrame(animId);
        function tick() {
          dashOffset -= 0.4;
          dash.setAttribute('stroke-dashoffset', dashOffset);
          animId = requestAnimationFrame(tick);
        }
        tick();
      }

      // 2. Draw dynamic diagonal connectors
      pts.forEach(pt => {
        // Inner edge of the card
        const cardEdgeX = pt.isLeft ? pt.cRight : pt.cLeft;
        // Diagonal up to the top third of the card
        const cardEdgeY = pt.cTop + 32; 
        
        const conn = document.createElementNS(svgNS, 'path');
        const midX = (pt.nx + cardEdgeX) / 2;
        // Smooth swoop connecting node and card edge
        const dConn = `M ${pt.nx} ${pt.ny} C ${midX} ${pt.ny}, ${midX} ${cardEdgeY}, ${cardEdgeX} ${cardEdgeY}`;
        
        conn.setAttribute('d', dConn);
        conn.setAttribute('fill', 'none');
        conn.setAttribute('stroke', '#c5cae9');
        conn.setAttribute('stroke-width', '1.5');
        conn.setAttribute('stroke-dasharray', '5 4');
        svg.appendChild(conn);
      });

      svgLayer.appendChild(svg);
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

/* ---- Scroll reveal (IntersectionObserver) ---- */
function initScrollReveal() {
  const els = document.querySelectorAll('.changelog-entry');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => obs.observe(el));
}

// Reveal cards on load
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();

  // Full screen button listener
  const fsBtn = document.getElementById('fullscreen-btn');
  const frame = document.getElementById('demo-video-frame');
  if (fsBtn && frame) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        if (frame.requestFullscreen) {
          frame.requestFullscreen();
        } else if (frame.webkitRequestFullscreen) {
          frame.webkitRequestFullscreen();
        } else if (frame.msRequestFullscreen) {
          frame.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    function handleFsChange() {
      const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      const span = fsBtn.querySelector('span');
      const svg = fsBtn.querySelector('svg');
      if (isFs) {
        if (span) span.textContent = 'Exit Full Screen';
        if (svg) svg.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>';
      } else {
        if (span) span.textContent = 'Full Screen';
        if (svg) svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
      }
    }

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
  }
});

/* ---- SPA Routing (Hash-based) ---- */
(function initRouting() {
  const views = ['hero', 'download', 'changelog', 'about'];

  // Blur overlay for transitions
  const overlay = document.createElement('div');
  overlay.id = 'page-transition-overlay';
  document.body.appendChild(overlay);

  function navigateTo(hash) {
    overlay.classList.add('active');

    // Fade out the current active view
    views.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
      }
    });

    setTimeout(() => {
      updateView(hash);
      overlay.classList.remove('active');
    }, 240);
  }

  function updateView(hash) {
    // Empty hash or '#' = home
    const viewId = views.includes(hash) ? hash : 'hero';

    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === viewId) {
          el.style.display = (id === 'hero') ? 'flex' : 'block';
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, 10);
        } else {
          el.style.display = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateY(20px)';
        }
      }
    });

    // Update nav active states
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkHash = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', linkHash === hash);
    });

    if (typeof window.toggleScrollTopBtn === 'function') {
      window.toggleScrollTopBtn(viewId === 'changelog');
    }

    window.scrollTo(0, 0);
  }

  // Intercept hash-based links AND the home '/' link
  document.addEventListener('click', e => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');

    // Home link (bare /) — clear hash and show hero
    if (href === '/') {
      e.preventDefault();
      if (window.location.hash) {
        history.pushState(null, '', window.location.pathname + window.location.search);
      }
      navigateTo('');
      return;
    }

    // Hash links — let browser handle URL, we drive the view
    if (href && href.startsWith('#')) {
      const hash = href.substring(1);
      navigateTo(hash);
    }
  });

  window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash.substring(1));
  });

  // Initialize on load
  const initHash = window.location.hash.substring(1);
  document.addEventListener('DOMContentLoaded', () => updateView(initHash));
  updateView(initHash);
})();


/* ---- Changelog: Scroll-to-top floating button ---- */
(function initChangelogScrollTop() {
  const btn = document.createElement('button');
  btn.id = 'changelog-scroll-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);

  let isChangelogActive = false;

  window.toggleScrollTopBtn = function(active) {
    isChangelogActive = active;
    if (!active) btn.classList.remove('visible');
  };

  window.addEventListener('scroll', () => {
    if (!isChangelogActive) return;
    btn.classList.toggle('visible', window.scrollY > 120);
  });
})();

