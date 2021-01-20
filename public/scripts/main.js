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

const N = 3;

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

            // const normals = new THREE.AxesHelper(0.3);
            // plane.add(normals);

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

// controller panel
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


// drag controller
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const coordPlane = createCoordinatePlane();

let canCompleteLayerRotation = false;
let wasLayerRotatedByMouse = false;

const rotCtrl = {
    side         : '',
    indexOfPlane : -1,
    direction    : '',
    counter      : 0
}


function getDirection(x, y) {
    if (Math.abs(x) <= y || -Math.abs(x) >= y) return 'Y';
    if (x >= Math.abs(y) || x <= -Math.abs(y)) return 'X';
}

function createCoordinatePlane() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 0.5,
        transparent: true,
        opacity: 0
    });

    const plane = new THREE.Mesh(geometry, material);
    // const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry));
    // plane.add(wireframe);

    // const axes = new THREE.AxesHelper(0.5);
    // plane.add(axes);
    return plane;
}

function setCoordinatePlane(face, object, intersectionPoint) {
    if (coordPlane) {
        CUBE.add(coordPlane);
        coordPlane.position.set(0, 0, 0);
        coordPlane.rotation.set(0, 0, 0);

        object.attach(coordPlane);
        coordPlane.position.x = intersectionPoint.x;
        coordPlane.position.y = intersectionPoint.y;
        coordPlane.position.z = intersectionPoint.z;

        switch (face) {
            case 'U':
                coordPlane.rotateX(THREE.MathUtils.degToRad(-90));
                break;

            case 'D':
                coordPlane.rotateX(THREE.MathUtils.degToRad(90));
                break;

            case 'R':
                coordPlane.rotateY(THREE.MathUtils.degToRad(90));
                break;

            case 'L':
                coordPlane.rotateY(THREE.MathUtils.degToRad(-90));
                break;

            case 'F':
                break;

            case 'B':
                coordPlane.rotateY(THREE.MathUtils.degToRad(180));
                break;
        }

        CUBE.attach(coordPlane);
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(coordPlane);

    if (intersects.length > 0) {
        
        const point = coordPlane.worldToLocal(intersects[0].point);

        if (rotCtrl.counter < 5) {
            if (Math.abs(point.x) > 0 || Math.abs(point.y) > 0) {
                console.log(point);
                console.log(getDirection(point.x, point.y))
                rotCtrl.counter++
                rotCtrl.direction = getDirection(point.x, point.y);
            }
        }
        else {
            const row = Math.floor(rotCtrl.indexOfPlane / N);
            const col = rotCtrl.indexOfPlane % N;
            const factor = 20;

            const obj = {
                F : {
                    X : { face : 'U', indexOfLayer : row,         isOppositeLayer : row === N - 1 },
                    Y : { face : 'R', indexOfLayer : N - col - 1, isOppositeLayer : col !== 0 }
                },
            
                B : {
                    X : { face : 'U', indexOfLayer : row, isOppositeLayer : row === N - 1 },
                    Y : { face : 'R', indexOfLayer : col, isOppositeLayer : col === N - 1 }
                },
            
                U : {
                    X : { face : 'F', indexOfLayer : N - row - 1, isOppositeLayer : row !== 0 },
                    Y : { face : 'R', indexOfLayer : N - col - 1, isOppositeLayer : col !== 0 }
                },
            
                D : {
                    X : { face : 'F', indexOfLayer : row,         isOppositeLayer : row === N - 1 },
                    Y : { face : 'R', indexOfLayer : N - col - 1, isOppositeLayer : col !== 0 }
                },
            
                R : {
                    X : { face : 'U', indexOfLayer : row, isOppositeLayer : row === N - 1 },
                    Y : { face : 'F', indexOfLayer : col, isOppositeLayer : col === N - 1 }
                },
            
                L : {
                    X : { face : 'U', indexOfLayer : row, isOppositeLayer : row === N - 1 },
                    Y : { face : 'F', indexOfLayer : N - col - 1, isOppositeLayer : col !== 0 }
                }
            };

            if (rotCtrl.side) {
                const deg = (rotCtrl.direction === 'X' ? point.x : point.y) * factor;
                const touchInfo = obj[rotCtrl.side][rotCtrl.direction];
                const angle = KERNEL[touchInfo.face].layerPreviousAngles[touchInfo.indexOfLayer];
                rotateLayer(touchInfo.face, touchInfo.indexOfLayer, angle + (touchInfo.isOppositeLayer ? deg : -deg));
            }

            wasLayerRotatedByMouse = true;
        }
    }
}

const targetAngle = {
    angle        : 0,
    countOfSteps : 0,
    step         : 0
}

function getTargetAngle(positiveStep) {
    const sign = Angle >= 0 ? 1 : -1;
    const alpha = Math.abs(Angle);

    const leftTarget = 90 * Math.floor(alpha / 90);
    const rightTarget = 90 * Math.ceil(alpha / 90);

    const leftDelta = alpha - leftTarget;
    const rightDelta = rightTarget - alpha;

    if (leftDelta <= rightDelta) {
        targetAngle.angle = leftTarget * sign;
        targetAngle.countOfSteps = Math.floor(leftDelta / positiveStep);
        targetAngle.step = positiveStep * -sign;
    }
    else {
        targetAngle.angle = rightTarget * sign;
        targetAngle.countOfSteps = Math.floor(rightDelta / positiveStep);
        targetAngle.step = positiveStep * sign;
    }
}

document.addEventListener('mouseup', () => {
    console.log('mouseup');
    window.removeEventListener('mousemove', onMouseMove);
    
    if (wasLayerRotatedByMouse) {  
        getTargetAngle(3);
        wasLayerRotatedByMouse = false;
        canCompleteLayerRotation = true;
    }

    rotCtrl.counter = 0;
    controls.enabled = true;

    if (coordPlane.parent) coordPlane.parent.remove(coordPlane);
}, false);

// In OrbitControls.js:
// inside method OnMouseDown( event ):
// event.preventDefault is commented to make this listener work
document.addEventListener('mousedown', (event) => {
    console.log('mouesdown');

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (canCompleteLayerRotation === false) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(CUBE.children);
    
        if (intersects.length > 0) {
    
            // do not let the camera rotate while interacting with the cube
            controls.enabled = false;
    
            const obj = intersects[0].object;
            const point = obj.worldToLocal(intersects[0].point);
            
            for (let key in Faces) {
                
                const index = Faces[key].indexOf(obj);
    
                if (index > -1) {
                    console.log('face: ' + key + ' index: ' + index);
                    setCoordinatePlane(key, obj, point);
    
                    rotCtrl.indexOfPlane = index;
                    rotCtrl.side = key;
    
                    window.addEventListener('mousemove', onMouseMove, false);
                    break;
                }
            }
        }
    }

}, false);

function completeLayerRotation() {
    if (targetAngle.countOfSteps > 0) {
        Angle += targetAngle.step;
        targetAngle.countOfSteps--;
        rotateLayer(Face, Index, Angle);
    }
    else {
        Angle = targetAngle.angle;
        canCompleteLayerRotation = false;
        rotateLayer(Face, Index, Angle);
        fixChange();
    }
}



// update each frame
(function update() {
    requestAnimationFrame(update);
    renderer.render(scene, camera);    
    controls.update();

    if (canCompleteLayerRotation) completeLayerRotation();
})();


