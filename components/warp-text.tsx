"use client";

import { useEffect, useRef, type CSSProperties } from 'react';
import { Renderer, Program, Mesh, Triangle, Texture, type OGLRenderingContext } from 'ogl';

export interface Props {
  text?: string;
  color?: string;
  warpStrength?: number;
  warpScale?: number;
  speed?: number;
  pointerInfluence?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFamily?: string;
  letterSpacing?: string | number;
  lineHeight?: string | number;
  className?: string;
  style?: CSSProperties;
  borderedText?: string;
  borderColor?: string;
}

interface RuntimeProps {
  text: string;
  color: string;
  fontSize: string | number;
  fontWeight: string | number;
  fontFamily: string;
  letterSpacing: string | number;
  lineHeight: string | number;
  warpStrength: number;
  warpScale: number;
  speed: number;
  pointerInfluence: number;
  pointerStrength: number;
  refraction: number;
  ripple: boolean;
  borderedText?: string;
  borderColor?: string;
}
interface RuntimeContext {
  program: Program;
  rasterize: () => void;
}

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

const getFontValue = (value: string | number): string => (typeof value === 'number' ? `${value}px` : value);

const measureLine = (ctx: CanvasRenderingContext2D, line: string, letterSpacing: number): number => {
  const chars = Array.from(line);
  const textWidth = chars.reduce((width, char) => width + ctx.measureText(char).width, 0);
  return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
};

const drawLine = (ctx: CanvasRenderingContext2D, line: string, x: number, y: number, letterSpacing: number): void => {
  const chars = Array.from(line);
  let cursor = x - measureLine(ctx, line, letterSpacing) / 2;

  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
  });
};

interface LayoutInfo {
  isCustomTwoLine: boolean;
  fontFamily: string;
  line1Size: number;
  line2Size: number;
  lineHeight: number;
  letterSpacing: number;
  line1Y: number;
  line2Y: number;
  line2W: number;
  boxW: number;
  boxH: number;
  totalHeight: number;
}

// Canvas font shorthand cannot resolve CSS variables. An invalid value is
// ignored and the context stays at the 10px default, which rasterizes the
// headline as a few pixels inside the dashed box.
const resolveCanvasFontFamily = (container: HTMLElement, fontFamily: string): string => {
  const requested = fontFamily && fontFamily !== 'inherit' ? fontFamily : '';
  if (!requested || requested.includes('var(') || requested.includes('inherit')) {
    const probe = document.createElement('span');
    Object.assign(probe.style, {
      position: 'absolute',
      visibility: 'hidden',
      pointerEvents: 'none',
      fontFamily: requested || 'inherit'
    });
    container.appendChild(probe);
    const resolved = window.getComputedStyle(probe).fontFamily || 'sans-serif';
    probe.remove();
    return resolved;
  }
  return requested;
};

const computeLayout = (
  container: HTMLElement,
  width: number,
  props: RuntimeProps
): LayoutInfo => {
  const fontFamily = resolveCanvasFontFamily(container, props.fontFamily);

  const isCustomTwoLine = Boolean(props.borderedText);

  if (isCustomTwoLine) {
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    let line1Size: number;
    let line2Size: number;
    let lineHeight: number;
    let letterSpacing = -1.2;

    // Exact responsive typography matching the user's styling:
    // Line 1: text-5xl md:text-6xl lg:text-7xl/21 font-medium
    // Line 2: text-4xl sm:text-5xl lg:text-[64px] font-semibold
    if (winW >= 1024) {
      line1Size = 72;
      line2Size = 64;
      lineHeight = 84;
      letterSpacing = -1.4;
    } else if (winW >= 768) {
      line1Size = 60;
      line2Size = 48;
      lineHeight = 72;
      letterSpacing = -1.2;
    } else if (winW >= 640) {
      line1Size = 48;
      line2Size = 44;
      lineHeight = 58;
      letterSpacing = -1.0;
    } else {
      // Mobile smooth scale: 320px to 640px
      const t = Math.max(0, Math.min(1, (winW - 320) / (640 - 320)));
      line1Size = Math.round(30 + t * (46 - 30));
      line2Size = Math.round(26 + t * (42 - 26));
      lineHeight = Math.round(line1Size * 1.2);
      letterSpacing = -0.6;
    }

    const lines = String(props.text || '').split('\n');
    const measureCanvas = document.createElement('canvas');
    const offscreen = measureCanvas.getContext('2d');
    let line2W = 0;

    if (offscreen) {
      offscreen.font = `500 ${line1Size}px ${fontFamily}`;
      const line1W = measureLine(offscreen, lines[0] || '', letterSpacing);
      const maxAvailableW = width * 0.96;
      if (line1W > maxAvailableW && maxAvailableW > 0) {
        const fit = maxAvailableW / line1W;
        line1Size = Math.floor(line1Size * fit);
        line2Size = Math.floor(line2Size * fit);
        lineHeight = Math.floor(lineHeight * fit);
      }
      offscreen.font = `600 ${line2Size}px ${fontFamily}`;
      line2W = measureLine(offscreen, lines[1] || '', letterSpacing);
    }

    const padY = Math.max(4, Math.round(line2Size * 0.08));
    const padX = Math.max(10, Math.round(line2Size * 0.16));
    const boxH = Math.round(line2Size * 1.1 + padY * 2);
    const boxW = Math.round(line2W + padX * 2);

    const topPad = 6;
    const line1Y = topPad + Math.round(line1Size * 0.5);
    const line2Y = line1Y + lineHeight;
    const bottomPad = 6;
    const totalHeight = Math.ceil(line2Y + boxH * 0.5 + bottomPad);

    return {
      isCustomTwoLine: true,
      fontFamily,
      line1Size,
      line2Size,
      lineHeight,
      letterSpacing,
      line1Y,
      line2Y,
      line2W,
      boxW,
      boxH,
      totalHeight
    };
  }

  // Generic single or multiline fallback
  const probe = document.createElement('span');
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'pre',
    inset: '0 auto auto 0',
    fontFamily: props.fontFamily,
    fontSize: getFontValue(props.fontSize),
    fontWeight: String(props.fontWeight),
    letterSpacing: getFontValue(props.letterSpacing),
    lineHeight: typeof props.lineHeight === 'number' ? String(props.lineHeight) : props.lineHeight
  });
  container.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const fontSizePx = parseFloat(computed.fontSize) || 96;
  const letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0;
  let lineHeight = parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    lineHeight = fontSizePx * (typeof props.lineHeight === 'number' ? props.lineHeight : 0.92);
  }
  probe.remove();

  const lines = String(props.text || '').split('\n');
  const totalHeight = Math.max(Math.ceil(lineHeight * lines.length + 16), 120);

  return {
    isCustomTwoLine: false,
    fontFamily,
    line1Size: fontSizePx,
    line2Size: fontSizePx,
    lineHeight,
    letterSpacing,
    line1Y: 0,
    line2Y: 0,
    line2W: 0,
    boxW: 0,
    boxH: 0,
    totalHeight
  };
};

const buildTextCanvas = ({
  width,
  height,
  dpr,
  props,
  layout
}: {
  width: number;
  height: number;
  dpr: number;
  props: RuntimeProps;
  layout: LayoutInfo;
}): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = props.color || '#f4f4f5';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const lines = String(props.text || '').split('\n');

  if (layout.isCustomTwoLine) {
    // 1. Draw dashed border box around "work for you."
    const boxX = Math.round(width / 2 - layout.boxW / 2);
    const boxY = Math.round(layout.line2Y - layout.boxH / 2);

    ctx.save();
    ctx.strokeStyle = props.borderColor || '#27272A';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, layout.boxW, layout.boxH);
    ctx.restore();

    // 2. Draw Line 1 (font-medium 500)
    ctx.font = `500 ${layout.line1Size}px ${layout.fontFamily}`;
    drawLine(ctx, lines[0] || '', width / 2, layout.line1Y, layout.letterSpacing);

    // 3. Draw Line 2 (font-semibold 600)
    ctx.font = `600 ${layout.line2Size}px ${layout.fontFamily}`;
    drawLine(ctx, lines[1] || '', width / 2, layout.line2Y, layout.letterSpacing);

    return canvas;
  }

  // Generic fallback rendering
  ctx.font = `${props.fontWeight} ${layout.line1Size}px ${layout.fontFamily}`;
  const startY = height / 2 - (layout.lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, index) => {
    drawLine(ctx, line, width / 2, startY + index * layout.lineHeight, layout.letterSpacing);
  });

  return canvas;
};

const syncUniforms = (program: Program, props: RuntimeProps): void => {
  const uniforms = program.uniforms;
  uniforms.uWarpStrength.value = props.warpStrength;
  uniforms.uWarpScale.value = props.warpScale;
  uniforms.uSpeed.value = props.speed;
  uniforms.uPointerInfluence.value = props.pointerInfluence;
  uniforms.uPointerStrength.value = props.pointerStrength;
  uniforms.uRefraction.value = props.refraction;
  uniforms.uRipple.value = props.ripple ? 1 : 0;
};

const WarpText = ({
  text = 'Bend the moment',
  color = '#f8f5ff',
  warpStrength = 0.08,
  warpScale = 1.7,
  speed = 0.55,
  pointerInfluence = 0.42,
  pointerStrength = 0.38,
  refraction = 0.018,
  ripple = true,
  fontSize = 'clamp(3rem, 10vw, 9rem)',
  fontWeight = 800,
  fontFamily = 'inherit',
  letterSpacing = '-0.06em',
  lineHeight = 0.9,
  className = '',
  style,
  borderedText,
  borderColor
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<RuntimeProps>({
    text,
    color,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
    borderedText,
    borderColor
  });
  const contextRef = useRef<RuntimeContext | null>(null);

  useEffect(() => {
    propsRef.current = {
      text,
      color,
      fontSize,
      fontWeight,
      fontFamily,
      letterSpacing,
      lineHeight,
      warpStrength,
      warpScale,
      speed,
      pointerInfluence,
      pointerStrength,
      refraction,
      ripple,
      borderedText,
      borderColor
    };

    if (contextRef.current) {
      syncUniforms(contextRef.current.program, propsRef.current);
      contextRef.current.rasterize();
    }
  }, [
    text,
    color,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
    borderedText,
    borderColor
  ]);

  useEffect(() => {
    const container = containerRef.current;
    const fallback = fallbackRef.current;
    if (!container || typeof window === 'undefined') return undefined;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (prefersReducedMotion) return undefined;

    let renderer: Renderer;
    let gl: OGLRenderingContext;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let raf = 0;
    let disposed = false;
    let contextLost = false;
    let visible = true;
    let pageVisible = !document.hidden;
    let reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let rasterVersion = 0;

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    const startTime = performance.now();

    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
      });
      gl = renderer.gl;
    } catch (error) {
      console.warn('WarpText: WebGL could not be initialized.', error);
      return undefined;
    }

    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.15s ease-out';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    let hasRenderedFirstFrame = false;

    // Initialize with a transparent 1x1 pixel instead of OGL's default white pixel
    const emptyPixel = new Uint8Array([0, 0, 0, 0]);
    const texture = new Texture(gl, {
      image: emptyPixel,
      width: 1,
      height: 1,
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE
    });

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: propsRef.current.warpStrength },
        uWarpScale: { value: propsRef.current.warpScale },
        uSpeed: { value: propsRef.current.speed },
        uPointerInfluence: { value: propsRef.current.pointerInfluence },
        uPointerStrength: { value: propsRef.current.pointerStrength },
        uRefraction: { value: propsRef.current.refraction },
        uRipple: { value: propsRef.current.ripple ? 1 : 0 },
        uMotion: { value: reduceMotion ? 0 : 1 }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });

    const renderOnce = () => {
      if (disposed || contextLost || !hasRenderedFirstFrame) return;
      renderer.render({ scene: mesh });
    };

    const rasterizeImmediate = () => {
      if (disposed || contextLost) return;

      const width = container.clientWidth || container.getBoundingClientRect().width;
      if (width <= 0) return;

      const layout = computeLayout(container, width, propsRef.current);
      const height = layout.totalHeight;
      if (layout.isCustomTwoLine) {
        container.style.height = `${height}px`;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const textCanvas = buildTextCanvas({
        width,
        height,
        dpr,
        props: propsRef.current,
        layout
      });
      texture.image = textCanvas;
      texture.needsUpdate = true;
      hasRenderedFirstFrame = true;
      canvas.style.opacity = '1';
      if (fallback) fallback.hidden = true;
      renderer.render({ scene: mesh });
    };

    const rasterize = () => {
      // 1. Draw immediately so H1 shows instantly on page refresh
      rasterizeImmediate();

      // 2. Once web fonts finish loading, re-rasterize cleanly
      const version = ++rasterVersion;
      if (document.fonts?.ready) {
        document.fonts.ready
          .then(() => {
            if (!disposed && !contextLost && version === rasterVersion) {
              rasterizeImmediate();
            }
          })
          .catch(() => { });
      }
    };

    const resize = () => {
      if (disposed || contextLost) return;
      const width = container.clientWidth || container.getBoundingClientRect().width;
      if (width <= 0) return;

      const layout = computeLayout(container, width, propsRef.current);
      const height = layout.totalHeight;
      if (layout.isCustomTwoLine) {
        container.style.height = `${height}px`;
      }

      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(width, height);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      rasterize();
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      pointer.activeTarget = 1;
    };

    const onPointerLeave = (): void => {
      pointer.activeTarget = 0;
    };

    const onContextLost = (event: Event): void => {
      event.preventDefault();
      contextLost = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = (): void => {
      pageVisible = !document.hidden;
      if (pageVisible && visible && !raf) raf = requestAnimationFrame(loop);
      if (!pageVisible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onReducedMotion = (event: MediaQueryListEvent): void => {
      reduceMotion = event.matches;
      program.uniforms.uMotion.value = reduceMotion ? 0 : 1;
      renderOnce();
    };

    const loop = (now: number): void => {
      if (disposed || contextLost) return;

      const elapsed = (now - startTime) * 0.001;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = pointer.activeTarget > 0 ? pointer.tx : idleX;
      const targetY = pointer.activeTarget > 0 ? pointer.ty : idleY;
      const damping = pointer.activeTarget > 0 ? 0.12 : 0.035;

      pointer.x += (targetX - pointer.x) * damping;
      pointer.y += (targetY - pointer.y) * damping;
      pointer.active += ((pointer.activeTarget > 0 ? 1 : 0.18) - pointer.active) * 0.06;

      program.uniforms.uPointer.value[0] = pointer.x;
      program.uniforms.uPointer.value[1] = pointer.y;
      program.uniforms.uPointerActive.value = reduceMotion ? pointer.active * 0.35 : pointer.active;
      program.uniforms.uTime.value = reduceMotion ? 0 : elapsed;

      renderOnce();
      raf = requestAnimationFrame(loop);
    };

    let lastWidth = 0;
    const handleResize = () => {
      const currentWidth = container.clientWidth || container.getBoundingClientRect().width;
      if (Math.abs(currentWidth - lastWidth) > 0.5) {
        lastWidth = currentWidth;
        resize();
      }
    };
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const onWindowResize = () => {
      resize();
    };
    window.addEventListener('resize', onWindowResize);

    intersectionObserver = new IntersectionObserver(
      ([entry]: IntersectionObserverEntry[]) => {
        visible = entry.isIntersecting;
        if (visible && pageVisible && !raf) raf = requestAnimationFrame(loop);
        if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    document.addEventListener('visibilitychange', onVisibility);
    mediaQuery?.addEventListener('change', onReducedMotion);

    syncUniforms(program, propsRef.current);
    contextRef.current = { program, rasterize };
    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      if (fallback) fallback.hidden = false;
      contextRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', onWindowResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      document.removeEventListener('visibilitychange', onVisibility);
      mediaQuery?.removeEventListener('change', onReducedMotion);

      if (!contextLost) {
        try {
          if (texture?.texture) gl.deleteTexture(texture.texture);
          geometry?.remove?.();
          program?.remove?.();
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch (error) {
          void error;
        }
      }

      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  const lines = text.split('\n');

  return (
    <div
      ref={containerRef}
      className={`relative block w-full overflow-hidden isolate ${className}`.trim()}
      style={style}
      role="heading"
      aria-level={1}
      aria-label={text}
    >
      <div
        ref={fallbackRef}
        aria-hidden="true"
        className="relative z-0 mx-auto max-w-full px-2 text-center"
        style={{
          color,
          fontSize,
          fontWeight,
          fontFamily,
          letterSpacing,
          lineHeight,
        }}
      >
        {lines.map((line) => (
          <span
            key={line}
            className={line === borderedText ? 'mt-2 inline-block border px-3 py-1' : 'block'}
            style={line === borderedText ? { borderColor: borderColor ?? '#27272A' } : undefined}
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
};

export default WarpText;
