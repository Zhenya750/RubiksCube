import * as THREE from './three_data/build/three.module.js';
import { OrbitControls } from './three_data/examples/jsm/controls/OrbitControls.js';
import * as gui from './three_data/build/dat.gui.module.js';

// init scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
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

const N = 5;

const WHITE  = 0xffffff;
const ORANGE = 0xf4844c;
const RED    = 0xe14343;
const YELLOW = 0xebe457;
const BLUE   = 0x3a49ee;
const GREEN  = 0x37cd2f;


function createFace(color) {
    const group = new THREE.Group();
    const planeSize = 1;

    const k = (N - 1) / 2;

    for (let y = k; y >= -k; y--) {
        for (let x = -k; x <= k; x++) {
            const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: 1
            });
            const plane = new THREE.Mesh(geometry, material);

            const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry));
            plane.add(wireframe);

            const normals = new THREE.AxesHelper(0.3);
            plane.add(normals);

            plane.position.x = x * planeSize;
            plane.position.y = y * planeSize;

            group.add(plane);
        }
    }

    return group;
}

const CUBE = new THREE.Group();

(function setCubeFaces() {
    const UP = createFace(YELLOW);
    UP.rotateX(THREE.MathUtils.degToRad(-90));
    UP.position.y = N / 2;
    while (UP.children.length > 0) CUBE.attach(UP.children[0]);
    
    const LEFT = createFace(ORANGE);
    LEFT.rotateY(THREE.MathUtils.degToRad(-90));
    LEFT.position.x = -N / 2;
    while (LEFT.children.length > 0) CUBE.attach(LEFT.children[0]);
    
    const BACK = createFace(GREEN);
    BACK.rotateY(THREE.MathUtils.degToRad(180));
    BACK.position.z = -N / 2;
    while (BACK.children.length > 0) CUBE.attach(BACK.children[0]);
    
    const RIGHT = createFace(RED);
    RIGHT.rotateY(THREE.MathUtils.degToRad(90));
    RIGHT.position.x = N / 2;
    while (RIGHT.children.length > 0) CUBE.attach(RIGHT.children[0]);
    
    const FRONT = createFace(BLUE);
    FRONT.position.z = N / 2;
    while (FRONT.children.length > 0) CUBE.attach(FRONT.children[0]);
    
    const DOWN = createFace(WHITE)
    DOWN.rotateX(THREE.MathUtils.degToRad(90));
    DOWN.position.y = -N / 2;
    while (DOWN.children.length > 0) CUBE.attach(DOWN.children[0]);
})();

const ROTATOR = new THREE.Group();
CUBE.add(ROTATOR);

CUBE.add(new THREE.AxesHelper(3));
scene.add(CUBE);

// Initial state of the cube - solved
const Up = [];
for (let i = 0; i < N * N; i++) Up.push(CUBE.children[i]);

const Left = [];
for (let i = N * N; i < N * N * 2; i++) Left.push(CUBE.children[i]);

const Back = [];
for (let i = N * N * 2; i < N * N * 3; i++) Back.push(CUBE.children[i]);

const Right = [];
for (let i = N * N * 3; i < N * N * 4; i++) Right.push(CUBE.children[i]);

const Front = [];
for (let i = N * N * 4; i < N * N * 5; i++) Front.push(CUBE.children[i]);

const Down = [];
for (let i = N * N * 5; i < N * N * 6; i++) Down.push(CUBE.children[i]);

const Faces = {
    F : Front,
    B : Back,
    U : Up,
    D : Down,
    L : Left,
    R : Right
}

const KERNEL = {
    F : {
        R : (i) => { return { index : i,               step : N } },
        U : (i) => { return { index : N * (N - i - 1), step : 1 } },
        L : (i) => { return { index : N * N - i - 1,   step : -N } },
        D : (i) => { return { index : (i + 1) * N - 1, step : -1 } },
        axis : 'z',
        adjacentFaces : ['R', 'U', 'L', 'D'],
        oppositeFace : 'B',
        layerRotations : Array.from({ length: N }, () => ROTATOR.rotation.toVector3()),
        layerPreviousAngles : new Array(N).fill(0)
    },

    R : {
        B : (i) => { return { index : N * (N - 1) + i, step : -N } },
        U : (i) => { return { index : N - i - 1,       step : N } },
        F : (i) => { return { index : N - i - 1,       step : N } },
        D : (i) => { return { index : N - i - 1,       step : N } },
        axis : 'x',
        adjacentFaces : ['B', 'U', 'F', 'D'],
        oppositeFace : 'L',
        layerRotations : Array.from({ length: N }, () => ROTATOR.rotation.toVector3()),
        layerPreviousAngles : new Array(N).fill(0)
    },

    U : {
        R : (i) => { return { index : N * i, step : 1 } },
        B : (i) => { return { index : N * i, step : 1 } },
        L : (i) => { return { index : N * i, step : 1 } },
        F : (i) => { return { index : N * i, step : 1 } },
        axis : 'y',
        adjacentFaces : ['R', 'B', 'L', 'F'],
        oppositeFace : 'D',
        layerRotations : Array.from({ length: N }, () => ROTATOR.rotation.toVector3()),
        layerPreviousAngles : new Array(N).fill(0)
    }
};

// ROTATOR helpers
let Face  = 'F';        // can be any face
let Index = 0;
let Angle = 0;

function rotateLayer(face, deep, deg) {

    const layerRotation = KERNEL[face].layerRotations[deep];

    ROTATOR.rotation.x = layerRotation.x;
    ROTATOR.rotation.y = layerRotation.y;
    ROTATOR.rotation.z = layerRotation.z;

    if (ROTATOR.children.length === 0) {
        if (deep === 0) {
            Faces[face].forEach(plane => ROTATOR.attach(plane));
        }
        else if (deep === N - 1) {
            Faces[KERNEL[face].oppositeFace].forEach(plane => ROTATOR.attach(plane));
        }

        KERNEL[face].adjacentFaces.forEach(adj => {

            let iterator = KERNEL[face][adj](deep);

            for (let i = 0; i < N; i++) {
                ROTATOR.attach(Faces[adj][iterator.index])
                iterator.index += iterator.step;
            }
        });
    }

    const rad = THREE.MathUtils.degToRad(deg * (deep === N - 1 ? 1 : -1));
    ROTATOR.rotation[KERNEL[face].axis] = rad;
    layerRotation[KERNEL[face].axis] = rad;

    Face  = face;
    Index = deep;
    Angle = deg;
}

function rotateCubeX(degX) {
    CUBE.rotation.x = THREE.MathUtils.degToRad(degX);
}

function rotateCubeY(degY) {
    CUBE.rotation.y = THREE.MathUtils.degToRad(degY);
}

function rotateCubeZ(degZ) {
    CUBE.rotation.z = THREE.MathUtils.degToRad(degZ); 
}

function transpose(arr) {
    const n = Math.round(Math.sqrt(arr.length));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const tmp = arr[i * n + j];
            arr[i * n + j] = arr[j * n + i];
            arr[j * n + i] = tmp;
        }
    }
}

function invertRows(arr) {
    const n = Math.round(Math.sqrt(arr.length));

    for (let k = 0; k < N; k++) {
        for (let i = N * k, j = i + N - 1; i < j; i++, j--) {
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
    }
}

function swapFaceSlices(faceA, faceB, startIndexA, startIndexB) {
    const n = Math.round(Math.sqrt(faceA.length));

    for (let i = 0; i < n; i++) {
        const tmp = faceA[startIndexA.index];
        faceA[startIndexA.index] = faceB[startIndexB.index];
        faceB[startIndexB.index] = tmp;

        startIndexA.index += startIndexA.step;
        startIndexB.index += startIndexB.step;
    }
}

function saveChange(direction, countOfRotations) {

    countOfRotations %= 4;

    while (countOfRotations-- > 0) {
        if (direction === 'right') {

            if (Index === 0) {
                transpose(Faces[Face]);
                invertRows(Faces[Face]);
            }
            else if (Index === N - 1) {
                transpose(Faces[KERNEL[Face].oppositeFace]);
                invertRows(Faces[KERNEL[Face].oppositeFace]);

                moveLayerSlicesLeft(Face, Index);
                continue;
            }
    
            moveLayerSlicesRight(Face, Index);
        }
        else if (direction === 'left') {
            if (Index === 0) {
                invertRows(Faces[Face]);
                transpose(Faces[Face]);
            }
            else if (Index === N - 1) {
                invertRows(Faces[KERNEL[Face].oppositeFace]);
                transpose(Faces[KERNEL[Face].oppositeFace]);

                moveLayerSlicesRight(Face, Index);
                continue;
            }
            
            moveLayerSlicesLeft(Face, Index);
        }
    }
}

function moveLayerSlicesRight(face, index) {

    const adj = KERNEL[face].adjacentFaces;
    for (let i = 0; i < adj.length - 1; i++) {
        swapFaceSlices(
            Faces[adj[i]], 
            Faces[adj[i + 1]], 
            KERNEL[face][adj[i]](index), 
            KERNEL[face][adj[i + 1]](index));
    }
}

function moveLayerSlicesLeft(face, index) {

    const adj = KERNEL[face].adjacentFaces;
    for (let i = adj.length - 1; i > 0; i--) {
        swapFaceSlices(
            Faces[adj[i]], 
            Faces[adj[i - 1]], 
            KERNEL[face][adj[i]](index), 
            KERNEL[face][adj[i - 1]](index));
    }
}


function fixChange() {

    const previousAngle = KERNEL[Face].layerPreviousAngles[Index];
    const dangle = Angle - previousAngle;

    console.log('angle: ' + dangle);

    if (Math.abs(dangle) % 90 !== 0) {
        console.log('direction: ' + (dangle < 0 ? 'left' : dangle > 0 ? 'right' : 'no change'));
        return;
    }

    const countOfRotations = Math.abs(dangle) / 90;
    const direction = dangle < 0 ? 'left' : dangle > 0 ? 'right' : 'no change';

    console.log('made: ' + countOfRotations);
    console.log('direction: ' + direction);
    console.log('\n');

    while (ROTATOR.children.length > 0) CUBE.attach(ROTATOR.children[0]);

    if (direction !== 'no change') {
        saveChange(direction, countOfRotations);
    }

    KERNEL[Face].layerPreviousAngles[Index] = Angle;
}


const controller = new function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;

    this.fixChange = false;
}();

const panel = new gui.GUI();
panel.add(controller, 'x', -180, 180).onChange(() => rotateCubeX(controller.x));
panel.add(controller, 'y', -180, 180).onChange(() => rotateCubeY(controller.y));
panel.add(controller, 'z', -180, 180).onChange(() => rotateCubeZ(controller.z));

panel.add(controller, 'fixChange', true, false).onChange(function() {
    if (controller.fixChange === true) {
        fixChange();      
    }
});

['F', 'R', 'U'].forEach(face => {
    for (let i = 0; i < N; i++) {
        controller[face + i] = 0;
        panel.add(controller, face + i, -180, 180, 30).onChange(() => rotateLayer(face, i, controller[face + i]));
    }
});



// update each frame
function update() {
    requestAnimationFrame(update);
    renderer.render(scene, camera);

    controls.update();
}
update();


