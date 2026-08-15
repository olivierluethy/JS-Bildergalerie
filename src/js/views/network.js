// Network view: a D3 force-directed "provenance map" of domains ↔ images.
// Domain nodes are large and pin-coloured; image nodes are small thumbnails.
// Click a domain to filter the gallery; click an image to open the lightbox.
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from '../../../vendor/d3-force.js';
import { iconSvg } from '../icons.js';
import { pinColor, escapeHtml } from '../util.js';

const SVGNS = 'http://www.w3.org/2000/svg';
let sim = null;
let cleanup = null;

function el(name, attrs = {}) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function buildGraph(records) {
  const domains = new Map();
  const nodes = [];
  const links = [];
  for (const r of records) {
    const domain = r.domain || 'unknown';
    if (!domains.has(domain)) {
      const dnode = {
        id: `d:${domain}`,
        type: 'domain',
        domain,
        count: 0,
      };
      domains.set(domain, dnode);
      nodes.push(dnode);
    }
    const dnode = domains.get(domain);
    dnode.count += 1;
    const inode = { id: r.id, type: 'image', record: r, domain };
    nodes.push(inode);
    links.push({ source: r.id, target: `d:${domain}` });
  }
  return { nodes, links };
}

export function renderNetwork(container, records, actions) {
  teardown();

  if (records.length === 0) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <span class="text-ink-soft">${iconSvg('share-2', { className: 'size-8' })}</span>
        <h2 class="font-display text-3xl text-ink">No map yet</h2>
        <p class="max-w-sm text-sm text-ink-soft">Add images from a few different websites and the map will draw the links between them.</p>
      </div>`;
    return;
  }

  const width = container.clientWidth || 900;
  const height = Math.max(520, Math.min(760, window.innerHeight - 220));

  container.innerHTML = `
    <div class="relative overflow-hidden rounded-xl border border-line bg-bg" data-net-wrap style="height:${height}px">
      <svg data-net-svg width="100%" height="100%" role="img" aria-label="Network map of domains and images"></svg>
      <div class="pointer-events-none absolute left-3 top-3 font-mono text-micro uppercase tracking-[0.08em] text-ink-soft">
        ${new Set(records.map((r) => r.domain)).size} domains · ${records.length} images
      </div>
      <div class="absolute bottom-3 right-3 flex gap-1">
        <button type="button" data-net="zoomin" class="btn-icon border border-line bg-surface" aria-label="Zoom in">${iconSvg(
          'zoom-in',
          { className: 'size-4' },
        )}</button>
        <button type="button" data-net="zoomout" class="btn-icon border border-line bg-surface" aria-label="Zoom out">${iconSvg(
          'zoom-out',
          { className: 'size-4' },
        )}</button>
        <button type="button" data-net="reset" class="btn-icon border border-line bg-surface" aria-label="Reset view">${iconSvg(
          'locate',
          { className: 'size-4' },
        )}</button>
      </div>
      <div class="pointer-events-none absolute bottom-3 left-3 max-w-[60%] rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 font-mono text-micro text-ink-soft backdrop-blur" data-net-hint>
        Click a <span class="text-ink">domain</span> to filter · click an <span class="text-ink">image</span> to open
      </div>
    </div>`;

  const svg = container.querySelector('[data-net-svg]');
  const { nodes, links } = buildGraph(records);

  // Defs: clipped circles for image thumbnails.
  const defs = el('defs');
  nodes
    .filter((n) => n.type === 'image')
    .forEach((n) => {
      const cp = el('clipPath', { id: `clip-${cssId(n.id)}` });
      cp.appendChild(el('circle', { r: 16, cx: 0, cy: 0 }));
      defs.appendChild(cp);
    });
  svg.appendChild(defs);

  // Zoomable/pannable viewport group.
  const viewport = el('g', { 'data-viewport': '' });
  svg.appendChild(viewport);
  const linkLayer = el('g', { stroke: 'rgb(var(--line))', 'stroke-width': 1 });
  const nodeLayer = el('g');
  viewport.append(linkLayer, nodeLayer);

  // Link lines.
  const linkEls = links.map((lk) => {
    const line = el('line', { 'stroke-opacity': 0.7 });
    linkLayer.appendChild(line);
    return line;
  });

  // Node groups.
  const nodeEls = nodes.map((n) => {
    const g = el('g', { class: 'cursor-pointer', 'data-node': n.id });
    if (n.type === 'domain') {
      const r = 10 + Math.min(20, n.count * 2.2);
      g.appendChild(
        el('circle', {
          r,
          fill: pinColor(n.domain),
          stroke: 'rgb(var(--surface))',
          'stroke-width': 2,
        }),
      );
      const label = el('text', {
        'text-anchor': 'middle',
        y: r + 13,
        fill: 'rgb(var(--ink))',
        'font-family': '"Space Mono", monospace',
        'font-size': 11,
      });
      label.textContent = n.domain;
      g.appendChild(label);
      g.dataset.r = r;
    } else {
      g.appendChild(
        el('circle', { r: 17, fill: 'rgb(var(--surface-2))', stroke: 'rgb(var(--line))', 'stroke-width': 1 }),
      );
      const img = el('image', {
        href: n.record.url,
        x: -16,
        y: -16,
        width: 32,
        height: 32,
        preserveAspectRatio: 'xMidYMid slice',
        'clip-path': `url(#clip-${cssId(n.id)})`,
      });
      img.addEventListener('error', () => {
        img.remove();
        g.querySelector('circle').setAttribute('fill', pinColor(n.domain));
      });
      g.appendChild(img);
      g.appendChild(
        el('circle', { r: 17, fill: 'none', stroke: 'rgb(var(--line))', 'stroke-width': 1.5 }),
      );
      g.dataset.r = 17;
    }
    nodeLayer.appendChild(g);
    return g;
  });

  // Adjacency for hover highlight.
  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, new Set([n.id])));
  links.forEach((lk) => {
    const s = typeof lk.source === 'object' ? lk.source.id : lk.source;
    const t = typeof lk.target === 'object' ? lk.target.id : lk.target;
    adj.get(s).add(t);
    adj.get(t).add(s);
  });

  // Simulation.
  sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink(links)
        .id((d) => d.id)
        .distance(46)
        .strength(0.5),
    )
    .force('charge', forceManyBody().strength((d) => (d.type === 'domain' ? -260 : -70)))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide().radius((d) => (d.type === 'domain' ? Number(d.count) * 2 + 22 : 20)))
    .on('tick', ticked);

  function ticked() {
    links.forEach((lk, i) => {
      linkEls[i].setAttribute('x1', lk.source.x);
      linkEls[i].setAttribute('y1', lk.source.y);
      linkEls[i].setAttribute('x2', lk.target.x);
      linkEls[i].setAttribute('y2', lk.target.y);
    });
    nodes.forEach((n, i) => {
      nodeEls[i].setAttribute('transform', `translate(${n.x},${n.y})`);
    });
  }

  // ---- Interaction: hover highlight, click, drag, zoom/pan ----------------
  function setHighlight(id) {
    const near = id ? adj.get(id) : null;
    nodes.forEach((n, i) => {
      const on = !near || near.has(n.id);
      nodeEls[i].style.opacity = on ? '1' : '0.2';
    });
    linkEls.forEach((line, i) => {
      const s = links[i].source.id;
      const t = links[i].target.id;
      const on = !id || s === id || t === id;
      line.style.opacity = on ? '0.9' : '0.08';
    });
  }

  nodeEls.forEach((g, i) => {
    const n = nodes[i];
    g.addEventListener('mouseenter', () => setHighlight(n.id));
    g.addEventListener('mouseleave', () => setHighlight(null));
    let moved = false;
    let start = null;
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      moved = false;
      start = { x: e.clientX, y: e.clientY };
      g.setPointerCapture(e.pointerId);
      sim.alphaTarget(0.3).restart();
      n.fx = n.x;
      n.fy = n.y;
    });
    g.addEventListener('pointermove', (e) => {
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 3) moved = true;
      const rect = svg.getBoundingClientRect();
      n.fx = (e.clientX - rect.left - transform.x) / transform.k;
      n.fy = (e.clientY - rect.top - transform.y) / transform.k;
    });
    g.addEventListener('pointerup', (e) => {
      start = null;
      sim.alphaTarget(0);
      n.fx = null;
      n.fy = null;
      if (!moved) {
        if (n.type === 'domain') actions.filterDomain(n.domain);
        else actions.open(n.id);
      }
    });
  });

  // Zoom / pan on the viewport.
  const transform = { k: 1, x: 0, y: 0 };
  function applyTransform() {
    viewport.setAttribute(
      'transform',
      `translate(${transform.x},${transform.y}) scale(${transform.k})`,
    );
  }
  function zoomBy(factor, cx, cy) {
    const rect = svg.getBoundingClientRect();
    const px = (cx ?? rect.width / 2 + rect.left) - rect.left;
    const py = (cy ?? rect.height / 2 + rect.top) - rect.top;
    const k = Math.min(4, Math.max(0.3, transform.k * factor));
    transform.x = px - ((px - transform.x) * k) / transform.k;
    transform.y = py - ((py - transform.y) * k) / transform.k;
    transform.k = k;
    applyTransform();
  }

  svg.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    },
    { passive: false },
  );

  let panning = null;
  svg.addEventListener('pointerdown', (e) => {
    panning = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  });
  window.addEventListener('pointermove', onPan);
  window.addEventListener('pointerup', endPan);
  function onPan(e) {
    if (!panning) return;
    transform.x = e.clientX - panning.x;
    transform.y = e.clientY - panning.y;
    applyTransform();
  }
  function endPan() {
    panning = null;
  }

  container.querySelector('[data-net="zoomin"]').addEventListener('click', () => zoomBy(1.3));
  container.querySelector('[data-net="zoomout"]').addEventListener('click', () => zoomBy(1 / 1.3));
  container.querySelector('[data-net="reset"]').addEventListener('click', () => {
    transform.k = 1;
    transform.x = 0;
    transform.y = 0;
    applyTransform();
    sim.alpha(0.6).restart();
  });

  cleanup = () => {
    window.removeEventListener('pointermove', onPan);
    window.removeEventListener('pointerup', endPan);
    sim?.stop();
    sim = null;
  };
}

function cssId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function teardown() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}
