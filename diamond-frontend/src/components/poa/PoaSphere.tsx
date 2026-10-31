'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';

export interface SphereStep { i: number; tool: string; decision: 'ALLOWED' | 'BLOCKED' }
export interface PoaSphereHandle { reset(): void; focus(i: number): void }
interface Props { steps: SphereStep[]; selected: number | null; sealed: boolean; showLabels: boolean; showConns: boolean; onPick: (i: number | null) => void }

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
/** Deterministic layout: step i on a golden-angle spiral; each tool anchored at a point derived from its name, so nothing jumps between renders. */
const sPos = (i: number) => { const az = i * 2.39996, el = .5 * Math.sin(i * 1.3), R = 1.45; return new THREE.Vector3(R * Math.cos(el) * Math.cos(az), R * Math.sin(el), R * Math.cos(el) * Math.sin(az)); };
const tPos = (n: string) => { const az = hash(n) * Math.PI * 2, el = (hash(n + 'e') - .5) * .9; return new THREE.Vector3(2.4 * Math.cos(el) * Math.cos(az), 2.4 * Math.sin(el), 2.4 * Math.cos(el) * Math.sin(az)); };

interface Rt { ren: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; grp: THREE.Group; dyn: THREE.Group; labs: { d: HTMLDivElement; o: THREE.Object3D }[]; pick: THREE.Object3D[]; focusY: number | null; drag: { x: number; y: number } | null; key: string }

function disposeObj(o: THREE.Object3D) {
  o.traverse(c => {
    const m = c as THREE.Mesh; m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose();
  });
}

const PoaSphere = forwardRef<PoaSphereHandle, Props>(function PoaSphere(props, ref) {
  const box = useRef<HTMLDivElement>(null), rt = useRef<Rt | null>(null), P = useRef(props), [ok, setOk] = useState(true);
  P.current = props;
  useImperativeHandle(ref, () => ({
    reset() { const r = rt.current; if (r) { r.focusY = null; r.grp.rotation.set(0, 0, 0); r.cam.position.z = 5.2; } },
    focus(i) { const r = rt.current; if (r && i) { const p = sPos(i); r.focusY = Math.atan2(-p.x, p.z); } },
  }), []);

  useEffect(() => {
    const el = box.current; if (!el) return;
    let ren: THREE.WebGLRenderer;
    try { ren = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setOk(false); return; }
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2)); el.appendChild(ren.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, .1, 50); cam.position.z = 5.2;
    const grp = new THREE.Group(); scene.add(grp);
    const ico = new THREE.IcosahedronGeometry(1, 4);
    grp.add(new THREE.Mesh(new THREE.SphereGeometry(.985, 48, 32), new THREE.MeshBasicMaterial({ color: 0x1c1c1c })));
    grp.add(new THREE.Mesh(ico, new THREE.MeshBasicMaterial({ color: 0x5a5754, wireframe: true, transparent: true, opacity: .28 })));
    const pa = ico.attributes.position, pts: number[] = [];
    for (let i = 0; i < pa.count; i += 9) pts.push(pa.getX(i) * 1.003, pa.getY(i) * 1.003, pa.getZ(i) * 1.003);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grp.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xF15534, size: .012, transparent: true, opacity: .7 })));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 n;void main(){float i=pow(clamp(.62-dot(n,vec3(0.,0.,1.)),0.,1.),3.);gl_FragColor=vec4(.945,.333,.204,1.)*i*.9;}',
    })));
    const dyn = new THREE.Group(); grp.add(dyn);
    const r: Rt = { ren, scene, cam, grp, dyn, labs: [], pick: [], focusY: null, drag: null, key: '' }; rt.current = r;

    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; ren.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); });
    ro.observe(el);
    const cv = ren.domElement; cv.style.cursor = 'grab'; cv.setAttribute('aria-hidden', 'true');
    let moved = 0;
    const down = (e: PointerEvent) => { r.drag = { x: e.clientX, y: e.clientY }; moved = 0; r.focusY = null; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!r.drag) return; const dx = e.clientX - r.drag.x, dy = e.clientY - r.drag.y; moved += Math.abs(dx) + Math.abs(dy); r.drag = { x: e.clientX, y: e.clientY }; grp.rotation.y += dx * .006; grp.rotation.x = Math.max(-1.2, Math.min(1.2, grp.rotation.x + dy * .006)); };
    const up = (e: PointerEvent) => {
      if (moved < 4) {
        const b = cv.getBoundingClientRect(), rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), cam);
        const h = rc.intersectObjects(r.pick, false); P.current.onPick(h.length ? (h[0].object.userData.i as number) : null);
      }
      r.drag = null;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); cam.position.z = Math.max(3, Math.min(9, cam.position.z + e.deltaY * .004)); };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('wheel', wheel, { passive: false });

    let raf = 0; const v = new THREE.Vector3(), reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    const loop = () => {
      raf = requestAnimationFrame(loop); if (document.hidden || !el.offsetParent) return;
      if (r.focusY != null) { grp.rotation.y += (r.focusY - grp.rotation.y) * .08; grp.rotation.x *= .92; } else if (!r.drag && !reduce) grp.rotation.y += .0011;
      ren.render(scene, cam);
      const w = el.clientWidth, h = el.clientHeight;
      if (P.current.showLabels) r.labs.forEach(l => {
        l.o.getWorldPosition(v);
        const front = v.clone().normalize().dot(cam.position.clone().sub(v).normalize()) > -.05;
        v.project(cam); l.d.style.opacity = front ? '1' : '.15'; l.d.style.left = ((v.x + 1) / 2 * w) + 'px'; l.d.style.top = ((1 - v.y) / 2 * h) + 'px';
      });
    };
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('wheel', wheel);
      r.labs.forEach(l => l.d.remove()); disposeObj(scene); ren.dispose(); cv.remove(); rt.current = null;
    };
  }, []);

  const { steps, selected, sealed, showLabels, showConns } = props;
  useEffect(() => {
    const r = rt.current, el = box.current; if (!r || !el) return;
    const k = steps.map(s => s.i + s.decision).join(',') + '|' + selected + '|' + sealed; if (k === r.key) return; r.key = k;
    while (r.dyn.children.length) disposeObj(r.dyn.children.pop()!);
    r.labs.forEach(l => l.d.remove()); r.labs = []; r.pick = [];
    const add = (o: THREE.Object3D, txt?: string) => {
      r.dyn.add(o);
      if (txt) { const d = document.createElement('div'); d.className = 'lab'; d.textContent = txt; d.style.display = P.current.showLabels ? '' : 'none'; el.appendChild(d); r.labs.push({ d, o }); }
    };
    const line = (pts: THREE.Vector3[], c: number, op: number) => r.dyn.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op })));
    const seen = new Set<string>(), pos = steps.map(s => sPos(s.i));
    steps.forEach((s, k) => {
      const a = pos[k], bad = s.decision === 'BLOCKED', col = bad ? 0xF15534 : 0x79C6A3, d = tPos(s.tool);
      if (k) { const m = pos[k - 1].clone().add(a).multiplyScalar(.5).normalize().multiplyScalar(1.75); line(new THREE.QuadraticBezierCurve3(pos[k - 1], m, a).getPoints(16), 0x77736f, .55); }
      if (!seen.has(s.tool)) { seen.add(s.tool); const o = new THREE.Mesh(new THREE.OctahedronGeometry(.05), new THREE.MeshBasicMaterial({ color: 0xF4F2EF })); o.position.copy(d); add(o, s.tool); }
      const mid = a.clone().add(d).multiplyScalar(.5).multiplyScalar(1.22), arc = new THREE.QuadraticBezierCurve3(a, mid, d).getPoints(28);
      if (bad) { const c = arc.slice(0, 16); line(c, col, .9); const x = new THREE.Mesh(new THREE.OctahedronGeometry(.035), new THREE.MeshBasicMaterial({ color: col })); x.position.copy(c[c.length - 1]); r.dyn.add(x); } else line(arc, col, .8);
      const m = new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 12), new THREE.MeshBasicMaterial({ color: col }));
      m.position.copy(a); m.userData.i = s.i; m.scale.setScalar(selected === s.i ? 2.2 : 1); r.pick.push(m); add(m, '#' + s.i);
    });
    if (sealed) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, .007, 8, 128), new THREE.MeshBasicMaterial({ color: 0xF15534 })); ring.rotation.x = Math.PI / 2.4; r.dyn.add(ring); }
  }, [steps, selected, sealed, ok]);

  useEffect(() => { const r = rt.current; if (r) r.dyn.visible = showConns; }, [showConns]);
  useEffect(() => { rt.current?.labs.forEach(l => { l.d.style.display = showLabels ? '' : 'none'; }); }, [showLabels, steps, selected]);

  if (!ok) return <div className="empty">WebGL is unavailable here. The step list and decisions on this page show the same run.</div>;
  return <div ref={box} className="poa-sphere" role="img" aria-label="Process sphere: each tool call is a node, linked in order by the hash chain; blocked calls are red" />;
});
export default PoaSphere;
