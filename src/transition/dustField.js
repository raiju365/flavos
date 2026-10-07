// A static GPU buffer: every grain's wind-driven flight runs in the shader.
// No per-frame arrays, DOM particles, or canvas pixel reads.
const vertexSource = `
precision highp float;
attribute vec4 a_grain;
uniform vec2 u_resolution;
uniform vec2 u_wind;
uniform float u_progress;
uniform float u_release;
uniform float u_cell;
uniform float u_dpr;
varying float v_alpha;
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  vec2 home = a_grain.xy * u_resolution;
  float seed = a_grain.z;
  float random = a_grain.w;
  vec2 crosswind = vec2(-u_wind.y, u_wind.x);
  float span = abs(u_wind.x) * u_resolution.x + abs(u_wind.y) * u_resolution.y;
  float along = dot(home - u_resolution * .5, u_wind) / max(span, 1.0) + .5;
  float eddy = sin(dot(home, crosswind) * .008 + seed * 2.0) * .085;
  float delay = clamp(along * .48 + random * .20 + eddy, 0.0, .7);
  // Different arrival times let the pigment accumulate along an uneven front.
  float t = clamp((u_progress - delay * .54) / .62, 0.0, 1.0);
  float flight = mix(pow(1.0 - t, 1.65), pow(t, 1.65), u_release);
  float travel = length(u_resolution) * (1.3 + random * .55);
  float side = sin(seed * 6.283 + flight * 5.0) * (24.0 + hash(seed + 2.0) * 110.0);
  side += sin(along * 8.0 + flight * 4.0) * 44.0;
  vec2 position = home + u_wind * travel * flight * mix(-1.0, 1.0, u_release);
  position += crosswind * side * sin(flight * 3.14159);
  // Tiny airborne grains grow only when they settle into the solid pigment.
  float settled = mix(smoothstep(.64, 1.0, t), 1.0 - smoothstep(0.0, .24, t), u_release);
  float grainSize = .65 + hash(seed + 4.0) * 1.05;
  gl_PointSize = mix(grainSize, u_cell * 2.15, settled) * u_dpr;
  v_alpha = mix(smoothstep(0.0, .10, t), 1.0 - smoothstep(.58, 1.0, t), u_release);
  vec2 clip = position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;
const fragmentSource = `
precision mediump float;
varying float v_alpha;
uniform vec3 u_color;
void main() {
  float alpha = (1.0 - smoothstep(.40, .50, length(gl_PointCoord - .5))) * v_alpha;
  if (alpha < .01) discard;
  gl_FragColor = vec4(u_color * alpha, alpha);
}`;

export function createDustField(canvas, settings) {
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, powerPreference: 'low-power',
  });
  let program, buffer, uniforms, count = 0, cell = 3, width = 0, height = 0, dpr = 1;
  let active = false, lost = false, phase = 'cover', progress = 0;
  let incoming = 0, outgoing = 0;
  const shaders = [];
  const onLost = event => {
    event.preventDefault();
    lost = true;
    canvas.parentElement.dataset.renderer = 'fallback';
  };
  canvas.addEventListener('webglcontextlost', onLost);
  try {
    if (gl) {
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const location = gl.getAttribLocation(program, 'a_grain');
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0);
      uniforms = Object.fromEntries(['resolution', 'wind', 'progress', 'release', 'cell', 'dpr', 'color']
        .map(name => [name, gl.getUniformLocation(program, 'u_' + name)]));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform3fv(uniforms.color, settings.color);
    }
  } catch (error) {
    console.warn('Dust transition uses the opacity fallback:', error.message);
    lost = true;
  }
  const resize = () => {
    if (!gl || lost) return;
    const nextWidth = canvas.clientWidth, nextHeight = canvas.clientHeight;
    const nextDpr = Math.min(window.devicePixelRatio || 1, settings.maxDpr);
    if (width === nextWidth && height === nextHeight && dpr === nextDpr) return;
    width = Math.max(1, nextWidth); height = Math.max(1, nextHeight); dpr = nextDpr;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const constrained = width < 700 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    const budget = constrained ? settings.mobileCount : settings.desktopCount;
    cell = Math.max(settings.minCell, Math.sqrt(width * height / budget));
    const columns = Math.ceil(width / cell), rows = Math.ceil(height / cell);
    count = columns * rows;
    const data = new Float32Array(count * 4);
    for (let row = 0, i = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++, i += 4) {
        data[i] = (col + .5 + (Math.random() - .5) * .18) / columns;
        data[i + 1] = (row + .5 + (Math.random() - .5) * .18) / rows;
        data[i + 2] = Math.random(); data[i + 3] = Math.random();
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    canvas.dataset.particleCount = String(count);
  };
  const render = (value, nextPhase = phase) => {
    progress = Math.max(0, Math.min(1, value)); phase = nextPhase;
    if (!gl || lost) return;
    // Guarantee full edge-to-edge coverage at the covered scene swap.
    const covered = phase === 'cover' && progress === 1;
    gl.clearColor(covered ? settings.color[0] : 0, covered ? settings.color[1] : 0, covered ? settings.color[2] : 0, covered ? 1 : 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (covered || (phase === 'cover' && progress === 0) || (phase === 'reveal' && progress === 1)) return;
    const angle = phase === 'cover' ? incoming : outgoing;
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.wind, Math.cos(angle), Math.sin(angle));
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.release, phase === 'reveal' ? 1 : 0);
    gl.uniform1f(uniforms.cell, cell); gl.uniform1f(uniforms.dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, count);
  };
  const onResize = () => { if (active) { resize(); render(progress, phase); } };
  window.addEventListener('resize', onResize, { passive: true });
  return {
    get available() { return Boolean(gl && program && !lost); },
    start() {
      active = true;
      incoming = Math.random() * Math.PI * 2;
      outgoing = incoming + .85 + Math.random() * (Math.PI * 2 - 1.7);
      canvas.parentElement.dataset.renderer = this.available ? 'webgl' : 'fallback';
      resize(); render(0, 'cover');
    },
    render,
    reset() {
      active = false;
      if (gl && !lost) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    },
    destroy() {
      active = false;
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        shaders.forEach(shader => gl.deleteShader(shader));
      }
    },
  };
}
