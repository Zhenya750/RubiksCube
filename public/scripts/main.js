import * as THREE from './three_data/build/three.module.js';
import { OrbitControls } from './three_data/examples/jsm/controls/OrbitControls.js';

import * as gui from './three_data/build/dat.gui.module.js';

import { Cube } from './Cube.js';
import { CubeTouchController } from './CubeTouchController.js';
import { RotationController } from './RotationController.js';

// init scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xc2eefe);
document.body.appendChild(renderer.domElement);

// scene helpers
const axesHelper = new THREE.AxesHelper(3);
scene.add(axesHelper);

const gridHelper = new THREE.GridHelper(5, 10);
scene.add(gridHelper);

// camera
camera.position.set(5, 5, 10);
camera.lookAt(0, 0, 0);
const controls = new OrbitControls(camera, renderer.domElement);

// light
function createLight(x, y, z) {
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(x, y, z);
    const lightHelper = new THREE.DirectionalLightHelper(light, 0.5);
    scene.add(light);
    scene.add(lightHelper);
}

createLight(-5, 5, 5);
createLight(5, -5, -5);
createLight(5, 5, 5);

const DIM = 30;
const cube = new Cube(DIM);
camera.position.set(DIM * 5 / 7, DIM * 5 / 7, DIM * 5 / 7);
camera.lookAt(0, 0, 0);


const touchController = new CubeTouchController(cube, renderer.domElement, camera);
const rotationController = new RotationController(camera, cube.ThreeObject, renderer.domElement);

const USE_ORBITCONTROLS = false;

controls.enabled = USE_ORBITCONTROLS;
rotationController.enabled = !USE_ORBITCONTROLS;

touchController.onStartTouching = () => {
    console.log('START TOUCHING');

    if (USE_ORBITCONTROLS) {
        // don't let camera move while interacting with the cube
        controls.enabled = false;
    }
    else {
        rotationController.enabled = false;
    }
}

touchController.onStopTouching = () => {
    console.log('STOP TOUCHING');

    if (USE_ORBITCONTROLS) {
        controls.enabled = true;
    }
    else {
        rotationController.enabled = true;
    }
}

scene.add(cube.ThreeObject);

// update each frame
(function update() {
    requestAnimationFrame(update);

    if (USE_ORBITCONTROLS) {
        controls.update();
    }
    else {
        rotationController.update();
    }

    touchController.update();
    
    renderer.render(scene, camera);    
})();


