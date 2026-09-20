/**
 * silk-bg.js
 * Full-page animated Silk background — vanilla Three.js port of the React Bits Silk component.
 * Creates a fixed full-screen WebGL canvas behind all page content.
 */
(function () {
  'use strict';

  // ─── Config (tweak to taste) ────────────────────────────────────────────────
  const CONFIG = {
    color: '#12359cff',   // mid-tone navy — waves range from ~#0b1530 to #3558a8
    speed: 3,
    scale: 1.4,
    noiseIntensity: 1.2,
    rotation: 0.3,
    lightMode: false
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function hexToRGB(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    ];
  }

  // ─── Shaders (exact port from React Bits Silk) ──────────────────────────────
  const vertexShader = /* glsl */`
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */`
    varying vec2 vUv;
    varying vec3 vPosition;

    uniform float uTime;
    uniform vec3  uColor;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uRotation;
    uniform float uNoiseIntensity;
    uniform float uLightMode;

    const float e = 2.71828182845904523536;

    float noise(vec2 texCoord) {
      float G = e;
      vec2  r = (G * sin(G * texCoord));
      return fract(r.x * r.y * (1.0 + texCoord.x));
    }

    vec2 rotateUvs(vec2 uv, float angle) {
      float c = cos(angle);
      float s = sin(angle);
      mat2  rot = mat2(c, -s, s, c);
      return rot * uv;
    }

    void main() {
      float rnd     = noise(gl_FragCoord.xy);
      vec2  uv      = rotateUvs(vUv * uScale, uRotation);
      vec2  tex     = uv * uScale;
      float tOffset = uSpeed * uTime;

      tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

      float pattern = 0.6 +
                      0.4 * sin(5.0 * (tex.x + tex.y +
                                       cos(3.0 * tex.x + 5.0 * tex.y) +
                                       0.02 * tOffset) +
                               sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

      float grain  = rnd / 15.0 * uNoiseIntensity;
      vec3  result = uColor * pattern - vec3(grain);

      if (uLightMode > 0.5) {
        float fold     = smoothstep(0.28, 0.90, pattern);
        float specular = smoothstep(0.72, 0.98, pattern);
        vec3  shadowColor = uColor * 0.72;
        vec3  bodyColor   = min(uColor * 1.18, vec3(1.0));
        vec3  lightBase   = mix(shadowColor, bodyColor, fold);
        lightBase = mix(lightBase, vec3(1.0), specular * 0.92);
        float fineNoise   = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
        float grainSignal = (rnd + fineNoise - 1.0);
        float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
        result = lightBase + grainSignal * grainStrength;
      }

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `;

  // ─── Init ───────────────────────────────────────────────────────────────────
  function init() {
    if (typeof THREE === 'undefined') return;

    // ── Canvas (fixed, full screen, behind everything) ──────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'silk-bg-canvas';
    canvas.style.cssText = [
      'position:fixed',
      'top:0', 'left:0',
      'width:100vw', 'height:100vh',
      'pointer-events:none',
      'z-index:-1',
      'display:block'
    ].join(';');
    document.body.insertBefore(canvas, document.body.firstChild);

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,          // not needed for a fullscreen shader
      powerPreference: 'default'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // ── Scene & Camera ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    // ── Uniforms ────────────────────────────────────────────────────────────
    const rgb = hexToRGB(CONFIG.color);
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(...rgb) },
      uSpeed: { value: CONFIG.speed },
      uScale: { value: CONFIG.scale },
      uNoiseIntensity: { value: CONFIG.noiseIntensity },
      uRotation: { value: CONFIG.rotation },
      uLightMode: { value: CONFIG.lightMode ? 1.0 : 0.0 }
    };

    // ── Plane (fills the camera's view exactly) ─────────────────────────────
    const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // ── Resize ──────────────────────────────────────────────────────────────
    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // ── Animate ─────────────────────────────────────────────────────────────
    let lastTime = performance.now();
    let rafId;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;
      uniforms.uTime.value += 0.1 * delta;
      renderer.render(scene, camera);
    }

    animate();

    // ── Pause when tab hidden ───────────────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        lastTime = performance.now();
        animate();
      }
    });

    // ── Expose for tweaking from console ────────────────────────────────────
    window.__silk = {
      setColor(hex) { const r = hexToRGB(hex); uniforms.uColor.value.setRGB(...r); },
      setSpeed(v) { uniforms.uSpeed.value = v; },
      setScale(v) { uniforms.uScale.value = v; },
      setNoise(v) { uniforms.uNoiseIntensity.value = v; },
      setRotation(v) { uniforms.uRotation.value = v; },
      setLightMode(v) { uniforms.uLightMode.value = v ? 1.0 : 0.0; }
    };
  }

  // Load Three.js if not already present, then init
  if (typeof THREE !== 'undefined') {
    init();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r155/three.min.js';
    s.onload = init;
    document.head.appendChild(s);
  }
})();
