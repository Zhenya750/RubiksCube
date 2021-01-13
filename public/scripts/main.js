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
        layerRotations : new Array(N).fill(ROTATOR.rotation.toVector3())
    },

    R : {
        B : (i) => { return { index : N * (N - 1) + i, step : -N } },
        U : (i) => { return { index : N - i - 1,       step : N } },
        F : (i) => { return { index : N - i - 1,       step : N } },
        D : (i) => { return { index : N - i - 1,       step : N } },
        axis : 'x',
        adjacentFaces : ['B', 'U', 'F', 'D'],
        oppositeFace : 'L',
        layerRotations : new Array(N).fill(ROTATOR.rotation.toVector3())
    },

    U : {
        R : (i) => { return { index : N * i, step : 1 } },
        B : (i) => { return { index : N * i, step : 1 } },
        L : (i) => { return { index : N * i, step : 1 } },
        F : (i) => { return { index : N * i, step : 1 } },
        axis : 'y',
        adjacentFaces : ['R', 'B', 'L', 'F'],
        oppositeFace : 'D',
        layerRotations : new Array(N).fill(ROTATOR.rotation.toVector3())
    }
};

// ROTATOR helpers
let Face  = 'F';        // can be any face
let Angle = 0;
const previousAngle = new Map();

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

    const rad = THREE.MathUtils.degToRad(deg);
    ROTATOR.rotation[KERNEL[face].axis] = rad;
    layerRotation[KERNEL[face].axis] = rad;

    Face = face;
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


function saveChange(face, direction, countOfRotations, rightCallback, leftCallback) {
    const n = 3;

    countOfRotations %= 4;

    while (countOfRotations-- > 0) {
        if (direction === 'right') {
            if (face) {
                transpose(face);
                invertColumns(face);
            }
    
            rightCallback(n);
        }
        else if (direction === 'left') {
            if (face) {
                invertColumns(face);
                transpose(face);
            }
            
            leftCallback(n);
        }
    }
}

function moveSlicesRightAroundFront(n) {
    swapFaceSlices(Right, Up,   { index : 0,     step : n }, { index : n * (n - 1), step : 1  });
    swapFaceSlices(Up, Left,    { index : n * n - 1,   step : -1 }, { index : n - 1, step : n });
    swapFaceSlices(Left, Down,  { index : n - 1,       step : n  }, { index : 0,     step : 1 });
}

function moveSlicesLeftAroundFront(n) {
    swapFaceSlices(Left, Up,    { index : n - 1, step : n  }, { index : n * n - 1,   step : -1 });
    swapFaceSlices(Up, Right,   { index : n * (n - 1), step : 1  }, { index : 0,     step : n  });
    swapFaceSlices(Right, Down, { index : 0,           step : n  }, { index : n - 1, step : -1 });
}

function moveSlicesLeftAroundBack(n) {
    swapFaceSlices(Right, Up,   { index : n - 1,       step : n  }, { index : 0, step : 1 });
    swapFaceSlices(Up, Left,    { index : 0, step : 1 }, { index : n * (n - 1), step : -n });
    swapFaceSlices(Left, Down,  { index : 0, step : n }, { index : n * (n - 1), step : 1  });
}

function moveSlicesRightAroundBack(n) {
    swapFaceSlices(Left, Up,    { index : n * (n - 1), step : -n }, { index : 0,     step : 1 });
    swapFaceSlices(Up, Right,   { index : 0,     step : 1 }, { index : n - 1,       step : n  });
    swapFaceSlices(Right, Down, { index : n - 1, step : n }, { index : n * n - 1,   step : -1 });
}

function moveSlicesLeftAroundRight(n) {
    swapFaceSlices(Up, Front,   { index : n - 1,     step : n  }, { index : n - 1,     step : n  });
    swapFaceSlices(Up, Back,    { index : n * n - 1, step : -n }, { index : 0,         step : n  });
    swapFaceSlices(Back, Down,  { index : 0,         step : n  }, { index : n * n - 1, step : -n });
}

function moveSlicesRightAroundRight(n) {
    swapFaceSlices(Up, Back,    { index : n * n - 1, step : -n }, { index : 0,     step : n });
    swapFaceSlices(Up, Front,   { index : n - 1,     step : n  }, { index : n - 1, step : n });
    swapFaceSlices(Front, Down, { index : n - 1,     step : n  }, { index : n - 1, step : n });
}

function moveSlicesRightAroundLeft(n) {
    swapFaceSlices(Up, Front,   { index : 0,         step : n  }, { index : 0,         step : n  });
    swapFaceSlices(Up, Back,    { index : 0,         step : n  }, { index : n * n - 1, step : -n });
    swapFaceSlices(Back, Down,  { index : n * n - 1, step : -n }, { index : 0,         step : n  });
}

function moveSlicesLeftAroundLeft(n) {
    swapFaceSlices(Up, Back,    { index : 0, step : n }, { index : n * n - 1, step : -n });
    swapFaceSlices(Up, Front,   { index : 0, step : n }, { index : 0,         step : n });
    swapFaceSlices(Front, Down, { index : 0, step : n }, { index : 0,         step : n });
}

function moveSlicesRightAroundUp(n) {
    swapFaceSlices(Left, Front,  { index : 0, step : 1 }, { index : 0, step : 1 });
    swapFaceSlices(Front, Right, { index : 0, step : 1 }, { index : 0, step : 1 });
    swapFaceSlices(Right, Back,  { index : 0, step : 1 }, { index : 0, step : 1 });
}

function moveSlicesLeftAroundUp(n) {
    swapFaceSlices(Right, Front, { index : 0, step : 1 }, { index : 0, step : 1 });
    swapFaceSlices(Front, Left,  { index : 0, step : 1 }, { index : 0, step : 1 });
    swapFaceSlices(Left, Back,   { index : 0, step : 1 }, { index : 0, step : 1 });
}

function moveSlicesRightAroundDown(n) {
    swapFaceSlices(Right, Front, { index : n * (n - 1), step : 1 }, { index : n * (n - 1), step : 1 });
    swapFaceSlices(Front, Left,  { index : n * (n - 1), step : 1 }, { index : n * (n - 1), step : 1 });
    swapFaceSlices(Left, Back,   { index : n * (n - 1), step : 1 }, { index : n * (n - 1), step : 1 });
}

function moveSlicesLeftAroundDown(n) {
    swapFaceSlices(Left, Front,  { index : n * (n - 1), step : 1 }, { index : n * (n - 1), step : 1 });
    swapFaceSlices(Front, Right, { index : n * (n - 1), step : 1 }, { index : n * (n - 1), step : 1 });
    swapFaceSlices(Right, Back,  { index : n * (n - 1), step : 1 }, { index : n * (n - 1), step : 1 });
}

function moveSlicesRightAroundF1(n) {
    swapFaceSlices(Up, Right,   { index : n,         step : 1  }, { index : 1, step : n });
    swapFaceSlices(Up, Left,    { index : n + n - 1, step : -1 }, { index : 1, step : n });
    swapFaceSlices(Left, Down,  { index : 1,         step : n  }, { index : n, step : 1 });
}

function moveSlicesLeftAroundF1(n) {
    swapFaceSlices(Up, Left,    { index : n + n - 1, step : -1 }, { index : 1,         step : n  });
    swapFaceSlices(Up, Right,   { index : n,         step : 1  }, { index : 1,         step : n  });
    swapFaceSlices(Right, Down, { index : 1,         step : n  }, { index : n + n - 1, step : -1 });
}

function moveSlicesLeftAroundR1(n) {
    swapFaceSlices(Up, Front,   { index : 1,         step : n  }, { index : 1,         step : n  });
    swapFaceSlices(Up, Back,    { index : n * n - 2, step : -n }, { index : 1,         step : n  });
    swapFaceSlices(Back, Down,  { index : 1,         step : n  }, { index : n * n - 2, step : -n });
}

function moveSlicesRightAroundR1(n) {
    swapFaceSlices(Up, Back,    { index : n * n - 2, step : -n }, { index : 1, step : n  });
    swapFaceSlices(Up, Front,   { index : 1,         step : n  }, { index : 1, step : n  });
    swapFaceSlices(Front, Down, { index : 1,         step : n  }, { index : 1, step : n });
}

function moveSlicesRightAroundU1(n) {
    swapFaceSlices(Left, Front,  { index : n, step : 1 }, { index : n, step : 1 });
    swapFaceSlices(Front, Right, { index : n, step : 1 }, { index : n, step : 1 });
    swapFaceSlices(Right, Back,  { index : n, step : 1 }, { index : n, step : 1 });
}

function moveSlicesLeftAroundU1(n) {
    swapFaceSlices(Right, Front, { index : n, step : 1 }, { index : n, step : 1 });
    swapFaceSlices(Front, Left,  { index : n, step : 1 }, { index : n, step : 1 });
    swapFaceSlices(Left, Back,   { index : n, step : 1 }, { index : n, step : 1 });
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

function invertColumns(arr) {
    const n = Math.round(Math.sqrt(arr.length));

    for (let i = 0, j = n - 1; j < arr.length; i += n, j += n) {
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
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


function fixChange() {
    if (previousAngle.has(Face) == false) {
        previousAngle.set(Face, 0);
    }

    const dangle = Angle - previousAngle.get(Face);

    console.log('angle: ' + dangle);

    if (Math.abs(dangle) % 90 !== 0) {
        console.log('direction: ' + (dangle < 0 ? 'left' : dangle > 0 ? 'right' : 'no change'));
        previousAngle.set(Face, Angle);
        return;
    }

    const countOfRotations = Math.abs(dangle) / 90;
    const direction = dangle < 0 ? 'left' : dangle > 0 ? 'right' : 'no change';

    console.log('made: ' + countOfRotations);
    console.log('direction: ' + direction);
    console.log('\n');

    while (ROTATOR.children.length > 0) CUBE.attach(ROTATOR.children[0]);

    if (direction !== 'no change') {
        if (Face === 'F') {
            saveChange(
                Front, 
                direction, countOfRotations, 
                moveSlicesRightAroundFront, moveSlicesLeftAroundFront);
        }
        else if (Face === 'B') {
            saveChange(
                Back,
                direction, countOfRotations,
                moveSlicesRightAroundBack, moveSlicesLeftAroundBack);
        }
        else if (Face == 'R') {
            saveChange(
                Right,
                direction, countOfRotations,
                moveSlicesRightAroundRight, moveSlicesLeftAroundRight);
        }
        else if (Face == 'L') {
            saveChange(
                Left,
                direction, countOfRotations,
                moveSlicesRightAroundLeft, moveSlicesLeftAroundLeft);
        }
        else if (Face === 'U') {
            saveChange(
                Up,
                direction, countOfRotations,
                moveSlicesRightAroundUp, moveSlicesLeftAroundUp);
        }
        else if (Face === 'D') {
            saveChange(
                Down,
                direction, countOfRotations,
                moveSlicesRightAroundDown, moveSlicesLeftAroundDown);
        }
        else if (Face === 'F1') {
            saveChange(
                null,
                direction, countOfRotations,
                moveSlicesRightAroundF1, moveSlicesLeftAroundF1);
        }
        else if (Face === 'R1') {
            saveChange(
                null,
                direction, countOfRotations,
                moveSlicesRightAroundR1, moveSlicesLeftAroundR1);
        }
        else if (Face === 'U1') {
            saveChange(
                null,
                direction, countOfRotations,
                moveSlicesRightAroundU1, moveSlicesLeftAroundU1);
        }
    }

    previousAngle.set(Face, Angle);
}


const controller = new function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;

    this.F = 0;
    this.B = 0;
    this.R = 0;
    this.L = 0;
    this.U = 0;
    this.D = 0;

    this.F1 = 0;
    this.U1 = 0;
    this.R1 = 0;

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

panel.add(controller, 'F', -180, 180, 30).onChange(() => rotateLayer('F', 0, -controller.F) );
panel.add(controller, 'F1', -180, 180, 30).onChange(() => rotateLayer('F', 1, -controller.F1) );
panel.add(controller, 'B', -180, 180, 30).onChange(() => rotateLayer('F', N - 1, controller.B) );

panel.add(controller, 'R', -180, 180, 30).onChange(() => rotateLayer('R', 0, -controller.R) );
panel.add(controller, 'R1', -180, 180, 30).onChange(() => rotateLayer('R', 1, -controller.R1) );
panel.add(controller, 'L', -180, 180, 30).onChange(() => rotateLayer('R', N - 1, controller.L) );

panel.add(controller, 'U', -180, 180, 30).onChange(() => rotateLayer('U', 0, -controller.U) );
panel.add(controller, 'U1', -180, 180, 30).onChange(() => rotateLayer('U', 1, -controller.U1) );
panel.add(controller, 'D', -180, 180, 30).onChange(() => rotateLayer('U', N - 1, controller.D) );



// update each frame
function update() {
    requestAnimationFrame(update);
    renderer.render(scene, camera);

    controls.update();
}
update();


