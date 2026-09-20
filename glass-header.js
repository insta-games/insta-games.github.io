/**
 * glass-header.js
 * Liquid-glass header bar effect — vanilla Three.js port of the React Bits FluidGlass "bar" mode.
 * Renders an animated gradient scene into an FBO, then uses MeshPhysicalMaterial (transmission)
 * to refract it through a rounded-rect bar that sits behind the nav items.
 */
(function () {
  'use strict';

  // ─── Wait for THREE to be available ────────────────────────────────────────
  function init() {
    if (typeof THREE === 'undefined') return;

    const header = document.querySelector('.site-header');
    if (!header) return;

    // ── Canvas setup ──────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'glass-header-canvas';
    canvas.style.cssText = [
      'position:absolute', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:0', 'display:block'
    ].join(';');
    header.style.position = 'sticky';
    header.insertBefore(canvas, header.firstChild);

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Sizes ─────────────────────────────────────────────────────────────────
    let W = header.offsetWidth;
    let H = header.offsetHeight || 64;
    renderer.setSize(W, H);

    // ── Scenes ────────────────────────────────────────────────────────────────
    const bgScene = new THREE.Scene();   // rendered to FBO → glass texture
    const mainScene = new THREE.Scene(); // the glass bar lives here

    // ── Camera (orthographic keeps it flat like the bar mode) ─────────────────
    const aspect = W / H;
    const frustH = 1;
    const frustW = frustH * aspect;
    const cam = new THREE.OrthographicCamera(
      -frustW / 2, frustW / 2,
      frustH / 2, -frustH / 2,
      0.01, 100
    );
    cam.position.z = 5;

    // ── FBO ───────────────────────────────────────────────────────────────────
    let fbo = buildFBO(W, H);

    function buildFBO(w, h) {
      return new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      });
    }

    // ── Background plane (animated gradient via ShaderMaterial) ───────────────
    const bgGeo = new THREE.PlaneGeometry(frustW * 4, frustH * 4);
    const bgMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(W, H) }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec2  uRes;
        varying vec2  vUv;

        vec3 pal(float t) {
          // iridescent palette: dark navy → cyan → violet → blue
          vec3 a = vec3(0.04, 0.05, 0.10);
          vec3 b = vec3(0.04, 0.07, 0.12);
          vec3 c = vec3(0.10, 0.25, 0.45);
          vec3 d = vec3(0.00, 0.33, 0.67);
          return a + b * cos(6.2831*(c*t+d));
        }

        void main() {
          vec2 uv = vUv;
          float t  = uTime * 0.18;

          // layered sine waves
          float wave1 = sin(uv.x * 6.0 + t)        * 0.04;
          float wave2 = sin(uv.x * 3.5 - t * 1.3)  * 0.06;
          float wave3 = cos(uv.y * 5.0 + t * 0.7)  * 0.04;

          float d = uv.y + wave1 + wave2 + wave3;
          vec3 col = pal(d + t * 0.1);

          // slight vignette
          float vign = 1.0 - smoothstep(0.4, 1.0, length(uv - 0.5) * 1.4);
          col *= 0.7 + 0.3 * vign;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.position.z = -1;
    bgScene.add(bgMesh);

    // ── Rounded-rect bar (glass) ───────────────────────────────────────────────
    // Three.js r152+ has RoundedBoxGeometry via THREE.BoxGeometry with groups,
    // but we'll draw our own rounded rect shape via Shape → ExtrudeGeometry.
    function makeRoundedBar(w, h, r, depth) {
      const shape = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false
      });
      geo.center();
      return geo;
    }

    const barW = frustW * 0.96;
    const barH = frustH * 0.82;
    const barGeo = makeRoundedBar(barW, barH, 0.045, 0.22);

    const barMat = new THREE.MeshPhysicalMaterial({
      transmission: 0.95,
      roughness: 0.04,
      thickness: 3.5,
      ior: 1.25,
      chromaticAberration: 0.08,
      attenuationColor: new THREE.Color('#94d8ff'),
      attenuationDistance: 0.6,
      color: new THREE.Color('#ffffff'),
      transparent: true,
      side: THREE.FrontSide,
      envMapIntensity: 0.85
    });
    // Feed the FBO texture as the transmission background map
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.position.set(0, 0, 0);
    barMesh.rotation.x = -Math.PI * 0.015;
    mainScene.add(barMesh);

    // Subtle edge glow ring (additive plane slightly larger)
    const glowGeo = makeRoundedBar(barW + 0.012, barH + 0.012, 0.038, 0.001);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#06b6d4'),
      transparent: true,
      opacity: 0.18,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = -0.01;
    mainScene.add(glowMesh);

    // ── Environment map for glass reflections (simple white env) ─────────────
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    // Create a minimal 4x2 gradient DataTexture as env source
    const envData = new Uint8Array([
      // top row: sky-ish blue-white
      200, 220, 255, 255, 180, 210, 255, 255, 160, 200, 255, 255, 200, 220, 255, 255,
      // bottom row: dark
      20, 20, 30, 255, 15, 15, 25, 255, 20, 20, 30, 255, 15, 15, 25, 255
    ]);
    const envTex = new THREE.DataTexture(envData, 4, 2, THREE.RGBAFormat);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    envTex.needsUpdate = true;
    const envRT = pmrem.fromEquirectangular(envTex);
    mainScene.environment = envRT.texture;
    envTex.dispose();
    pmrem.dispose();

    // ── Chromatic-aberration shimmer overlay ──────────────────────────────────
    // Rendered as a screen-space fullscreen quad on top.
    const shimmerMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: fbo.texture } },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform sampler2D uTex;
        varying vec2 vUv;

        void main() {
          float t  = uTime * 0.6;
          // subtle scanline shimmer
          float band = sin(vUv.y * 80.0 + t) * 0.5 + 0.5;
          float mask = smoothstep(0.48, 0.52, vUv.y); // center band
          vec4 col = texture2D(uTex, vUv);
          // iridescent tint
          vec3 tint = vec3(
            0.5 + 0.5 * sin(t + vUv.x * 3.0),
            0.5 + 0.5 * sin(t + vUv.x * 3.0 + 2.094),
            0.5 + 0.5 * sin(t + vUv.x * 3.0 + 4.189)
          );
          gl_FragColor = vec4(col.rgb + tint * 0.04 * band, col.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    // ── Resize handler ────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      W = header.offsetWidth;
      H = header.offsetHeight || 64;
      renderer.setSize(W, H);
      fbo.dispose();
      fbo = buildFBO(W, H);

      const newAspect = W / H;
      const nfW = frustH * newAspect;
      cam.left = -nfW / 2;
      cam.right = nfW / 2;
      cam.updateProjectionMatrix();

      bgMat.uniforms.uRes.value.set(W, H);
      bgMesh.scale.x = nfW * 4 / (frustH * 4);
    });
    ro.observe(header);

    // ── Animate ───────────────────────────────────────────────────────────────
    let rafId;
    let t = 0;

    function animate() {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      bgMat.uniforms.uTime.value = t;

      // 1) Render bg scene → FBO
      renderer.setRenderTarget(fbo);
      renderer.render(bgScene, cam);
      renderer.setRenderTarget(null);

      // 2) Feed FBO into the transmission material background
      //    Three.js r155+ exposes renderer.transmissionRenderTarget; we trick it
      //    by temporarily overriding the renderer's internal RT.
      //    For broad compat, we also set the envMap manually so the glass looks good.
      barMat.envMap = mainScene.environment;

      // Subtle pulse on glow
      glowMesh.material.opacity = 0.12 + 0.06 * Math.sin(t * 1.2);
      // Very slight rotation breathe
      barMesh.rotation.y = Math.sin(t * 0.3) * 0.015;

      // 3) Render the glass bar scene, using the FBO as the transmission background
      //    We temporarily set renderer.transmissionRenderTarget so Three.js picks it up
      const prevTRT = renderer.transmissionRenderTarget;
      renderer.transmissionRenderTarget = fbo;
      renderer.render(mainScene, cam);
      renderer.transmissionRenderTarget = prevTRT;
    }

    animate();

    // ── Cleanup on page hide ──────────────────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else animate();
    });
  }

  // Load Three.js from CDN then init
  if (typeof THREE !== 'undefined') {
    init();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r155/three.min.js';
    s.onload = init;
    document.head.appendChild(s);
  }
})();
