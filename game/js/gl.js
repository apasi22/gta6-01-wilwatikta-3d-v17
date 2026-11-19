// gl.js — WebGL1 renderer for WILWATIKTA 3D: shaders, matrices, and the
// procedural geometry builders (boxes, sloped wedges, cylinders, spheres,
// tapered prisms). Everything is built from triangles with vertex colours;
// no textures, no external assets, deterministic output.

'use strict';

// ---- small vector helpers (plain arrays, no allocation churn in hot paths) ----
function v3(x, y, z) { return [x, y, z]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function vnorm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// ---- 4x4 matrices, column-major like WebGL expects ----
function mIdentity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function mMul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function mTranslate(x, y, z) {
  const m = mIdentity(); m[12] = x; m[13] = y; m[14] = z; return m;
}
function mScale(x, y, z) {
  const m = mIdentity(); m[0] = x; m[5] = y; m[10] = z; return m;
}
function mRotY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}
function mRotX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function mRotZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function mPerspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
function mLookAt(eye, target, up) {
  const z = vnorm(vsub(eye, target));
  const x = vnorm(vcross(up, z));
  const y = vcross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -vdot(x, eye), -vdot(y, eye), -vdot(z, eye), 1];
}
function mApply(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

// ---- colour: [r,g,b] 0..1, with a shade multiplier ----
function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

// ---- triangle soup: a mutable mesh that builders append to ----
function newMesh() { return { pos: [], nor: [], col: [] }; }
function tri(mesh, a, b, c, col) {
  const n = vnorm(vcross(vsub(b, a), vsub(c, a)));
  for (const p of [a, b, c]) {
    mesh.pos.push(p[0], p[1], p[2]);
    mesh.nor.push(n[0], n[1], n[2]);
    mesh.col.push(col[0], col[1], col[2]);
  }
}
function quad(mesh, a, b, c, d, col) { tri(mesh, a, b, c, col); tri(mesh, a, c, d, col); }

// Axis-aligned box centred at (cx,cy,cz) with size (sx,sy,sz), optional Y rotation.
function box(mesh, cx, cy, cz, sx, sy, sz, col, rotY) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  let c = [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
           [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]];
  if (rotY) {
    const m = mRotY(rotY);
    c = c.map(p => mApply(m, p));
  }
  const p = c.map(q => [q[0] + cx, q[1] + cy, q[2] + cz]);
  quad(mesh, p[4], p[5], p[6], p[7], col); // front (+z)
  quad(mesh, p[1], p[0], p[3], p[2], col); // back
  quad(mesh, p[0], p[4], p[7], p[3], col); // left
  quad(mesh, p[5], p[1], p[2], p[6], col); // right
  quad(mesh, p[7], p[6], p[2], p[3], col); // top
  quad(mesh, p[0], p[1], p[5], p[4], col); // bottom
}

// Wedge: a box whose top slopes from hBack at the back (-z) down to hFront at
// the front (+z). The car-hood shape: low nose, higher cabin line.
function wedge(mesh, cx, cy, cz, sx, hFront, hBack, sz, col, rotY) {
  const hx = sx / 2, hz = sz / 2;
  let c = [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz],
           [-hx, hBack, -hz], [hx, hBack, -hz], [hx, hFront, hz], [-hx, hFront, hz]];
  if (rotY) { const m = mRotY(rotY); c = c.map(p => mApply(m, p)); }
  const p = c.map(q => [q[0] + cx, q[1] + cy, q[2] + cz]);
  quad(mesh, p[4], p[5], p[6], p[7], col); // sloped top
  quad(mesh, p[1], p[0], p[3], p[2], col); // bottom
  quad(mesh, p[3], p[7], p[6], p[2], col); // front (low)
  quad(mesh, p[0], p[1], p[5], p[4], col); // back (high)
  quad(mesh, p[0], p[4], p[7], p[3], col); // left
  quad(mesh, p[5], p[1], p[2], p[6], col); // right
}

// Tapered box: bottom half-width wb, top half-width wt (shoulders wider than
// waist for a torso, or the reverse for a skirt). Depth stays sz.
function taperBox(mesh, cx, cy, cz, wb, wt, h, sz, col, rotY) {
  const hz = sz / 2, hy = h / 2;
  let c = [[-wb, -hy, -hz], [wb, -hy, -hz], [wb, hy, -hz], [-wb, hy, -hz],
           [-wt, -hy, hz], [wt, -hy, hz], [wt, hy, hz], [-wt, hy, hz]];
  // note: top corners use wt, bottom corners use wb — rebuild properly:
  c = [[-wb, -hy, -hz], [wb, -hy, -hz], [wt, hy, -hz], [-wt, hy, -hz],
       [-wb, -hy, hz], [wb, -hy, hz], [wt, hy, hz], [-wt, hy, hz]];
  if (rotY) { const m = mRotY(rotY); c = c.map(p => mApply(m, p)); }
  const p = c.map(q => [q[0] + cx, q[1] + cy, q[2] + cz]);
  quad(mesh, p[4], p[5], p[6], p[7], col);
  quad(mesh, p[1], p[0], p[3], p[2], col);
  quad(mesh, p[0], p[4], p[7], p[3], col);
  quad(mesh, p[5], p[1], p[2], p[6], col);
  quad(mesh, p[7], p[6], p[2], p[3], col);
  quad(mesh, p[0], p[1], p[5], p[4], col);
}

// Cylinder along Y, centred at (cx,cy,cz), radius r, height h. Used for
// wheels (rotated to lie along X), arms, legs, lamp posts.
function cylinder(mesh, cx, cy, cz, r, h, col, seg, axis) {
  seg = seg || 10;
  const hy = h / 2;
  const ring = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    ring.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  const xform = p => {
    let q = [p[0], p[1], p[2]];
    if (axis === 'x') q = [q[1], q[0], q[2]];
    else if (axis === 'z') q = [q[2], q[1], q[0]];
    return [q[0] + cx, q[1] + cy, q[2] + cz];
  };
  for (let i = 0; i < seg; i++) {
    const a0 = ring[i], a1 = ring[i + 1];
    quad(mesh, xform([a0[0], -hy, a0[2]]), xform([a1[0], -hy, a1[2]]),
      xform([a1[0], hy, a1[2]]), xform([a0[0], hy, a0[2]]), col);
    tri(mesh, xform([0, hy, 0]), xform([a0[0], hy, a0[2]]), xform([a1[0], hy, a1[2]]), shade(col, 1.12));
    tri(mesh, xform([0, -hy, 0]), xform([a1[0], -hy, a1[2]]), xform([a0[0], -hy, a0[2]]), shade(col, 0.85));
  }
}

// Low-poly sphere (lat/long), centred at (cx,cy,cz). Heads, helmet domes,
// lamp globes, the heli bubble.
function sphere(mesh, cx, cy, cz, r, col, lat, lon) {
  lat = lat || 7; lon = lon || 10;
  const pt = (i, j) => {
    const th = (j / lon) * Math.PI * 2;
    const ph = (i / lat) * Math.PI;
    return [cx + r * Math.sin(ph) * Math.cos(th), cy + r * Math.cos(ph), cz + r * Math.sin(ph) * Math.sin(th)];
  };
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = pt(i, j), b = pt(i, j + 1), c = pt(i + 1, j + 1), d = pt(i + 1, j);
    if (i === 0) tri(mesh, a, b, c, shade(col, 1.08));
    else if (i === lat - 1) tri(mesh, a, c, d, shade(col, 0.92));
    else quad(mesh, a, b, c, d, col);
  }
}

// ---- renderer ----
function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL unavailable');
  const vs = `attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol;
    uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
    varying vec3 vN; varying vec3 vC; varying float vD;
    void main(){ vec4 w = uModel * vec4(aPos, 1.0);
      vN = mat3(uModel) * aNor; vC = aCol;
      vec4 v = uView * w; vD = -v.z;
      gl_Position = uProj * v; }`;
  const fs = `precision mediump float;
    uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb;
    uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar;
    varying vec3 vN; varying vec3 vC; varying float vD;
    void main(){ vec3 n = normalize(vN);
      float d = max(dot(n, normalize(uSunDir)), 0.0);
      vec3 c = vC * (uAmb + uSunCol * d);
      float f = clamp((vD - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      gl_FragColor = vec4(mix(c, uFogCol, f), 1.0); }`;
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const loc = n => gl.getUniformLocation(prog, n);
  const U = {
    proj: loc('uProj'), view: loc('uView'), model: loc('uModel'),
    sunDir: loc('uSunDir'), sunCol: loc('uSunCol'), amb: loc('uAmb'),
    fogCol: loc('uFogCol'), fogNear: loc('uFogNear'), fogFar: loc('uFogFar'),
  };
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aNor = gl.getAttribLocation(prog, 'aNor');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  const buf = gl.createBuffer();
  return {
    gl,
    // upload one mesh and draw it with a model matrix
    draw(mesh, model, sun) {
      if (!mesh.pos.length) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const n = mesh.pos.length / 3;
      const data = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) {
        data.set(mesh.pos.slice(i * 3, i * 3 + 3), i * 9);
        data.set(mesh.nor.slice(i * 3, i * 3 + 3), i * 9 + 3);
        data.set(mesh.col.slice(i * 3, i * 3 + 3), i * 9 + 6);
      }
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 36, 24);
      gl.uniformMatrix4fv(U.model, false, new Float32Array(model));
      gl.uniform3fv(U.sunDir, sun.dir); gl.uniform3fv(U.sunCol, sun.col);
      gl.uniform3fv(U.amb, sun.amb); gl.uniform3fv(U.fogCol, sun.fog);
      gl.uniform1f(U.fogNear, sun.fogNear); gl.uniform1f(U.fogFar, sun.fogFar);
      gl.drawArrays(gl.TRIANGLES, 0, n);
    },
    begin(proj, view, sky) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(sky[0], sky[1], sky[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(U.proj, false, new Float32Array(proj));
      gl.uniformMatrix4fv(U.view, false, new Float32Array(view));
    },
  };
}
