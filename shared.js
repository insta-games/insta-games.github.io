/**
 * shared.js  –  loaded on every non-special page
 * Bootstraps:
 *   1. Silk WebGL background (Three.js, position:fixed, z-index:-1)
 *   2. Apple-style liquid glass SVG filter injected into <body>
 */
(function () {
  'use strict';

  // ─── Silk Config ─────────────────────────────────────────────────────────────
  const SILK = {
    color:          '#243358',  // rich navy – waves span ~#111928 → #3d5a96 (clearly visible)
    speed:          2.5,
    scale:          1.3,
    noiseIntensity: 1.0,
    rotation:       0.25,
    lightMode:      false
  };

  // ─── Shaders (Silk – exact port from React Bits) ─────────────────────────────
  const VERT = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const FRAG = `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3  uColor;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uRotation;
    uniform float uNoiseIntensity;
    uniform float uLightMode;

    const float e = 2.71828182845904523536;

    float noise(vec2 tc) {
      float G = e;
      vec2 r = G * sin(G * tc);
      return fract(r.x * r.y * (1.0 + tc.x));
    }

    vec2 rotateUvs(vec2 uv, float a) {
      float c = cos(a); float s = sin(a);
      return mat2(c,-s,s,c) * uv;
    }

    void main() {
      float rnd  = noise(gl_FragCoord.xy);
      vec2 uv    = rotateUvs(vUv * uScale, uRotation);
      vec2 tex   = uv * uScale;
      float tOff = uSpeed * uTime;

      tex.y += 0.03 * sin(8.0 * tex.x - tOff);

      float pattern = 0.6 +
        0.4 * sin(5.0 * (tex.x + tex.y +
              cos(3.0 * tex.x + 5.0 * tex.y) +
              0.02 * tOff) +
              sin(20.0 * (tex.x + tex.y - 0.1 * tOff)));

      float grain  = rnd / 15.0 * uNoiseIntensity;
      vec3  result = uColor * pattern - vec3(grain);

      if (uLightMode > 0.5) {
        float fold = smoothstep(0.28, 0.9, pattern);
        float spec = smoothstep(0.72, 0.98, pattern);
        vec3 shadow = uColor * 0.72;
        vec3 body   = min(uColor * 1.18, vec3(1.0));
        vec3 base   = mix(shadow, body, fold);
        base = mix(base, vec3(1.0), spec * 0.92);
        float fine  = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
        float gs    = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
        result = base + (rnd + fine - 1.0) * gs;
      }

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `;

  // ─── Helper ───────────────────────────────────────────────────────────────────
  function hexRGB(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.slice(0,2), 16) / 255,
      parseInt(hex.slice(2,4), 16) / 255,
      parseInt(hex.slice(4,6), 16) / 255
    ];
  }

  // ─── Boot silk once THREE is ready ───────────────────────────────────────────
  function bootSilk() {
    if (typeof THREE === 'undefined') return;

    // Don't double-init
    if (document.getElementById('silk-bg-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'silk-bg-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh',
      pointerEvents: 'none', zIndex: '-1', display: 'block'
    });
    document.body.insertBefore(canvas, document.body.firstChild);

    // Make body transparent so canvas shows through
    document.body.style.background = 'transparent';

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap for perf
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    const rgb = hexRGB(SILK.color);
    const uniforms = {
      uTime:           { value: 0 },
      uColor:          { value: new THREE.Color(...rgb) },
      uSpeed:          { value: SILK.speed },
      uScale:          { value: SILK.scale },
      uNoiseIntensity: { value: SILK.noiseIntensity },
      uRotation:       { value: SILK.rotation },
      uLightMode:      { value: SILK.lightMode ? 1.0 : 0.0 }
    };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthWrite: false })
    );
    scene.add(mesh);

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let last = performance.now(), raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      const now   = performance.now();
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      uniforms.uTime.value += 0.1 * delta;
      renderer.render(scene, camera);
    }
    tick();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { last = performance.now(); tick(); }
    });

    // Expose for console tweaking
    window.__silk = {
      setColor(h) { const r = hexRGB(h); uniforms.uColor.value.setRGB(...r); },
      setSpeed(v) { uniforms.uSpeed.value = v; },
      setScale(v) { uniforms.uScale.value = v; },
    };
  }

  // ─── Inject SVG liquid-glass filter into DOM ─────────────────────────────────
  function injectLiquidGlassFilter() {
    if (document.getElementById('liquid-glass-svg')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'liquid-glass-svg';
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <!-- Liquid glass: very subtle displacement (refraction) + no blur -->
        <filter id="liquid-glass" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="3" seed="5" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feComposite in="displaced" operator="in" in2="SourceGraphic"/>
        </filter>
        <!-- Stronger lens warp for card hover -->
        <filter id="liquid-glass-strong" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.009" numOctaves="3" seed="8" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feComposite in="displaced" operator="in" in2="SourceGraphic"/>
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);
  }

  // ─── Load Three.js then boot ──────────────────────────────────────────────────
  function loadThreeAndBoot() {
    if (typeof THREE !== 'undefined') {
      bootSilk();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r155/three.min.js';
    s.onload = bootSilk;
    s.onerror = function () {
      // If CDN fails, just make body a dark fallback
      document.body.style.background = '#0a0e1a';
    };
    document.head.appendChild(s);
  }

  // ─── Init on DOMContentLoaded ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectLiquidGlassFilter();
      initBtnZoomOverlay();
      loadThreeAndBoot();
    });
  } else {
    injectLiquidGlassFilter();
    initBtnZoomOverlay();
    loadThreeAndBoot();
  }

  // ─── Button full-screen zoom overlay ─────────────────────────────────────────
  // On .btn hover: a dark-blue circle expands from the button to cover the screen.
  // The overlay has pointer-events:none so all clicks still work underneath.
  function initBtnZoomOverlay() {
    if (document.getElementById('btn-zoom-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'btn-zoom-overlay';
    document.body.appendChild(overlay);

    let activeBtn = null;
    let hideTimer = null;

    function show(btn) {
      clearTimeout(hideTimer);
      const rect = btn.getBoundingClientRect();
      // Origin = centre of the button, as % of viewport
      const ox = ((rect.left + rect.width  / 2) / window.innerWidth  * 100).toFixed(2) + '%';
      const oy = ((rect.top  + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';
      overlay.style.setProperty('--ox', ox);
      overlay.style.setProperty('--oy', oy);
      overlay.classList.add('active');
      activeBtn = btn;
    }

    function hide() {
      overlay.classList.remove('active');
      activeBtn = null;
    }

    // Event delegation – works for any .btn anywhere in the DOM
    document.addEventListener('mouseover', function (e) {
      const btn = e.target.closest('.btn');
      if (btn && btn !== activeBtn) show(btn);
    });

    document.addEventListener('mouseout', function (e) {
      if (!activeBtn) return;
      // Only hide if we've left the button (not moved to a child)
      const btn = e.target.closest('.btn');
      if (btn && btn === activeBtn) {
        // Check if relatedTarget is still inside the button
        if (!btn.contains(e.relatedTarget)) hide();
      }
    });
  }

})();
