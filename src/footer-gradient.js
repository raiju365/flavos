// The supplied Untitled blend FLOW recipe: scale 58, distortion 47, swirl 20,
// speed 26. Its duplicated light/blue stops use the portfolio's paper and ink.
const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec2 centers[4];
uniform vec3 paper;
uniform vec3 ink;
float ease(float value) {
  float t = clamp(value, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
void main() {
  vec2 uv = vec2(gl_FragCoord.x / resolution.x, 1.0 - gl_FragCoord.y / resolution.y);
  vec2 point = (uv - 0.5) / 1.096 + 0.5;
  float radial = ease(length(point - 0.5));
  for (int pass = 1; pass <= 2; pass++) {
    float step = float(pass);
    point.x += 0.47 * (1.0 - radial) / step
      * sin(time + step * 0.4 * ease(point.y))
      * cos(0.2 * time + step * 2.4 * ease(point.y));
    point.y += 0.47 * (1.0 - radial) / step
      * cos(time + step * 2.0 * ease(point.x));
  }
  float angle = -0.6 * radial;
  float c = cos(angle), s = sin(angle);
  point -= 0.5;
  point = vec2(c * point.x - s * point.y, s * point.x + c * point.y) + 0.5;
  float light = 0.0, total = 0.0;
  for (int index = 0; index < 4; index++) {
    vec2 delta = point - centers[index];
    float distanceSquared = dot(delta, delta);
    float weight = 1.0 / (distanceSquared * distanceSquared + 0.0001);
    if (index < 2) light += weight;
    total += weight;
  }
  gl_FragColor = vec4(mix(ink, paper, light / max(0.0001, total)), 1.0);
}`;

export function initFooterGradient() {
  const footer = document.querySelector('.signature-footer');
  if (!footer) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'footer-flow';
  canvas.setAttribute('aria-hidden', 'true');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const palette = getComputedStyle(footer);
  const rgb = (name, fallback) => {
    const hex = palette.getPropertyValue(name).trim() || fallback;
    return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  };
  const paper = rgb('--folio-paper', '#f8f7f3'), ink = rgb('--folio-ink', '#20235b');
  const centers = new Float32Array(8), interval = 1000 / 60;
  let gl, program, buffer, uniforms, attempted = false;
  let visible = false, disposed = false, lost = false;
  let frame = 0, previous = 0, pending = 0, elapsed = 0;

  const prepare = () => {
    if (program) return true;
    if (attempted || disposed || lost) return false;
    attempted = true;
    const shaders = [];
    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: 'low-power', desynchronized: true,
      });
      if (!gl) return false;
      program = gl.createProgram();
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Flow shader unavailable');
        gl.attachShader(program, shader);
      }
      gl.bindAttribLocation(program, 0, 'position'); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Flow program unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      uniforms = Object.fromEntries(['resolution', 'time', 'centers[0]', 'paper', 'ink']
        .map(name => [name, gl.getUniformLocation(program, name)]));
      gl.uniform3fv(uniforms.paper, paper); gl.uniform3fv(uniforms.ink, ink);
      footer.prepend(canvas);
      canvas.dataset.renderer = 'webgl-flow';
      return true;
    } catch {
      if (program) gl?.deleteProgram(program);
      if (buffer) gl?.deleteBuffer(buffer);
      program = buffer = null; canvas.remove();
      return false;
    } finally {
      shaders.forEach(shader => gl.deleteShader(shader));
    }
  };
  const draw = () => {
    if (!program || lost || disposed) return;
    const time = 57.77832344000101 + elapsed * .000312;
    for (let index = 0; index < 4; index++) {
      const phase = index * .37;
      const rateX = .6 + (index / 3 % 1) * .9;
      const rateY = .8 + ((index + 1) / 4 % 1);
      centers[index * 2] = .5 + .5 * Math.sin(time * rateX + phase);
      centers[index * 2 + 1] = .5 + .5 * Math.cos(time * rateY + phase * 1.5);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, time); gl.uniform2fv(uniforms['centers[0]'], centers);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const resize = () => {
    const width = footer.clientWidth || innerWidth, height = footer.clientHeight || innerHeight;
    // A soft field needs no retina-sized buffer. One triangle, at most 512px
    // on its long side, is upscaled by the browser beneath the existing grain.
    const scale = Math.min(1, 512 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    draw();
  };
  const tick = now => {
    frame = 0;
    if (!visible || document.hidden || motion.matches || lost || disposed) { previous = 0; return; }
    const delta = previous ? Math.min(now - previous, 50) : 0;
    previous = now; elapsed += delta; pending += delta;
    if (pending >= interval - .5) { pending = Math.max(0, pending - interval); draw(); }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame); frame = 0; previous = 0; pending = 0;
    if (visible && !document.hidden && !motion.matches && program && !lost && !disposed)
      frame = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && prepare()) resize();
    sync();
  });
  const sizing = new ResizeObserver(resize);
  const onMotion = () => { draw(); sync(); };
  const onLost = event => { event.preventDefault(); lost = true; canvas.style.visibility = 'hidden'; sync(); };
  const onRestored = () => {
    lost = false; attempted = false; program = buffer = null;
    if (prepare()) { resize(); canvas.style.visibility = ''; } sync();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  observer.observe(footer); sizing.observe(footer);
  motion.addEventListener('change', onMotion);
  document.addEventListener('visibilitychange', sync);
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect(); sizing.disconnect();
    motion.removeEventListener('change', onMotion);
    document.removeEventListener('visibilitychange', sync);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (gl && !lost) { gl.deleteBuffer(buffer); gl.deleteProgram(program); }
    canvas.remove();
  };
}
