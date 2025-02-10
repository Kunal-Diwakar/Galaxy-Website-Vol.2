import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";

console.clear();

// Define PI2 constant
const PI2 = Math.PI * 2;

// Create scene
let scene = new THREE.Scene();
scene.background = new THREE.Color(0x160016);

// Create camera
let camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 4, 21);

// Create renderer with antialiasing
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);

// Append renderer to body inside `window.onload`
window.onload = () => {
    document.body.appendChild(renderer.domElement);
};

// Handle window resize
window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// Add OrbitControls
let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

// Global uniform object
let gu = { time: { value: 0 } };

// Arrays for sizes and shift attributes
let sizes = [];
let shift = [];

let pushShift = () => {
    shift.push(
        Math.random() * Math.PI,
        Math.random() * PI2,
        (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
        Math.random() * 0.9 + 0.1
    );
};

// Create point positions
let pts = new Array(25000).fill().map(() => {
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
    return new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5);
});

for (let i = 0; i < 50000; i++) {
    let r = 10, R = 40;
    let rand = Math.pow(Math.random(), 1.5);
    let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
    pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * PI2, (Math.random() - 0.5) * 2));
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
}

// Create BufferGeometry
let g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

// Create material
let m = new THREE.PointsMaterial({
    size: 0.1,
    transparent: true,
    blending: THREE.AdditiveBlending,
    onBeforeCompile: shader => {
        shader.uniforms.time = gu.time;
        shader.vertexShader = `
            uniform float time;
            attribute float sizes;
            attribute vec4 shift;
            varying vec3 vColor;
            ${shader.vertexShader}
        `.replace(
            `gl_PointSize = size;`,
            `gl_PointSize = size * sizes;`
        ).replace(
            `#include <color_vertex>`,
            `#include <color_vertex>
            float d = length(abs(position) / vec3(40., 10., 40));
            d = clamp(d, 0., 1.);
            vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
        `
        ).replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
            float t = time;
            float moveT = mod(shift.x + shift.z * t, PI2);
            float moveS = mod(shift.y + shift.z * t, PI2);
            transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;
        `
        );

        shader.fragmentShader = `
            varying vec3 vColor;
            ${shader.fragmentShader}
        `.replace(
            `#include <clipping_planes_fragment>`,
            `#include <clipping_planes_fragment>
            float d = length(gl_PointCoord.xy - 0.5);
            if (d > 0.5) discard;
        `
        ).replace(
            `vec4 diffuseColor = vec4( diffuse, opacity );`,
            `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.2, d) * 0.5 + 0.5 );`
        );
    }
});

// Create Points mesh and add to scene
let p = new THREE.Points(g, m);
p.rotation.order = "ZYX";
p.rotation.z = 0.2;
scene.add(p);

// Animation loop
let clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    controls.update();
    let t = clock.getElapsedTime() * 0.5;
    gu.time.value = t * Math.PI;
    p.rotation.y = t * 0.05;
    renderer.render(scene, camera);
});

// Debugging logs
console.log("Scene:", scene);
console.log("Camera Position:", camera.position);
console.log("Renderer DOM Element:", renderer.domElement);
