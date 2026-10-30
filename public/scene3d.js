// Objek 3D di latar: torus knot kawat lime yang berputar pelan
// dan sedikit mengikuti gerakan mouse. Jika WebGL / CDN gagal dimuat,
// halaman tetap berfungsi normal tanpa objek ini.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('scene');

if (canvas) {
  const stage = canvas.parentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 7;

  const geometry = new THREE.TorusKnotGeometry(1.5, 0.45, 140, 18, 2, 3);

  // Inti gelap menutup garis bagian belakang supaya terlihat solid
  const core = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x0b0b0c,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    })
  );
  const wire = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xd7ff3f,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    })
  );

  const spinner = new THREE.Group(); // berputar sendiri
  spinner.add(core, wire);

  const pivot = new THREE.Group();   // miring mengikuti mouse
  pivot.add(spinner);
  scene.add(pivot);

  const KNOT_DIAMETER = 3.9;

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const viewW = viewH * camera.aspect;

    if (camera.aspect >= 1) {
      // layar lebar: taruh di sisi kanan
      pivot.position.set(viewW * 0.3, 0.1, 0);
      pivot.scale.setScalar(Math.min(1, (viewH * 0.8) / KNOT_DIAMETER));
    } else {
      // layar sempit: taruh di bagian atas
      pivot.position.set(0, viewH * 0.26, 0);
      pivot.scale.setScalar((viewW * 0.55) / KNOT_DIAMETER);
    }
  }

  new ResizeObserver(resize).observe(stage);
  resize();

  // Parallax mouse
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function frame() {
    if (document.hidden) return;
    spinner.rotation.x += 0.0025;
    spinner.rotation.y += 0.0045;
    pivot.rotation.y += (mouse.x * 0.5 - pivot.rotation.y) * 0.05;
    pivot.rotation.x += (mouse.y * 0.35 - pivot.rotation.x) * 0.05;
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    renderer.render(scene, camera);
  } else {
    renderer.setAnimationLoop(frame);
  }
}

