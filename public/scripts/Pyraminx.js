import * as THREE from './three_data/build/three.module.js';
import { OrbitControls } from './three_data/examples/jsm/controls/OrbitControls.js';

import * as gui from './three_data/build/dat.gui.module.js';

// init scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setClearColor(0xc2eefe);
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

function createTriangle(color) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        -0.5, -Math.sqrt(3) / 6, 0,
        0.5, -Math.sqrt(3) / 6, 0,
        0, 1 / Math.sqrt(3), 0
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    geometry.normalizeNormals();

    const material = new THREE.MeshPhongMaterial({ 
        color: color.background,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.add(new THREE.AxesHelper(0.3));

    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe);
    mesh.add(line);
    
    return mesh;
}

function createFace(numberOfLayers, color) {
    
    const n = numberOfLayers;

    let numberOfTriangles = 1;

    const h = Math.sqrt(3) / 2 * 1;

    const group = new THREE.Group();

    for (let i = 0; i < n; i++) {

        for (let j = 0, k = n - i; j < numberOfTriangles; j++, k++) {

            let x = k / 2;
            let y = (n - i - 1) * h + h / 3;
            
            const triangle = createTriangle(color);
            triangle.position.set(x, y, 0);
            
            if (j % 2 !== 0) {
                triangle.position.y += h / 3;
                triangle.rotateZ(Math.PI);
            }

            group.add(triangle);
        }

        numberOfTriangles += 2;
    }
    
    return group;
}

function createPyraminxThreeObject(numberOfLayers) {
    const n = numberOfLayers;
    const h = Math.sqrt(3) / 2 * n;

    const front = createFace(n, { background: 0x3a49ee });
    front.rotateX(-Math.PI / 2 + Math.acos(1 / 3));

    const left = createFace(n, { background: 0xf4844c });
    left.position.set(n / 2, 0, -h);
    left.rotateY(-Math.PI * 2 / 3);
    left.rotateX(-Math.PI / 2 + Math.acos(1 / 3));

    const right = createFace(n, { background: 0x37cd2f });
    right.position.set(n, 0, 0);
    right.rotateY(Math.PI * 2 / 3);
    right.rotateX(-Math.PI / 2 + Math.acos(1 / 3));

    const down = createFace(n, { background: 0xe14343 });
    down.position.set(n, 0, 0);
    down.rotateY(Math.PI);
    down.rotateX(Math.PI / 2);

    const group = new THREE.Group();
    const H = Math.sqrt(6) / 3 * n;
    group.position.set(n / 2, H / 4, -h / 3);

    // !!! do not change the order of faces: F - L - R - D
    while (front.children.length > 0) group.attach(front.children[0]);
    while (left.children.length > 0) group.attach(left.children[0]);
    while (right.children.length > 0) group.attach(right.children[0]);
    while (down.children.length > 0) group.attach(down.children[0]);

    group.position.set(0, 0, 0);

    return group;
}

function createStateMap(pyraminx, dimension) {

    const n = dimension;
    return {
        F : pyraminx.children.slice(0,         n * n),
        L : pyraminx.children.slice(n * n,     n * n * 2),
        R : pyraminx.children.slice(n * n * 2, n * n * 3),
        D : pyraminx.children.slice(n * n * 3, n * n * 4)        
    }
}

function getAxesForLayersRotation(pyraminx, stateMap) {

    const axes = { };

    for (var face in stateMap) {
        
        let startP = stateMap[face][0].localToWorld(new THREE.Vector3(0, 0, 0));
        let endP = stateMap[face][0].localToWorld(new THREE.Vector3(0, 0, 1));
    
        startP = pyraminx.worldToLocal(startP);
        endP = pyraminx.worldToLocal(endP);

        axes[face] = startP.sub(endP).normalize();
    }

    return axes;
}

function moveFromLocalToLocal(vector, oldObject, newObject) {
    let v = oldObject.localToWorld(vector.clone());
    return newObject.worldToLocal(v).normalize();
}

const dim = 3;
const pyraminx = createPyraminxThreeObject(dim);
const stateMap = createStateMap(pyraminx, dim);

const rotator = new THREE.Group();
pyraminx.add(rotator);

pyraminx.updateMatrix();
pyraminx.updateMatrixWorld(true);


const axesOfRotation = getAxesForLayersRotation(pyraminx, stateMap);

const rotationInfo = {
    layer : null,
    axis : null,
    deg : 0
};


function rotateLayer(layer, deg) {

    const { face, index } = layer;

    if (rotator.children.length === 0) {

        if (index === 0) {
            stateMap[face].forEach(triangle => rotator.attach(triangle));
        }

        let generators = getGenerators(layer);

        for (let adjFace in generators) {
            for (let i of generators[adjFace]) {
                rotator.attach(stateMap[adjFace][i]);
            }
        }
        
        rotationInfo.layer = layer;
        rotationInfo.axis = moveFromLocalToLocal(axesOfRotation[face], pyraminx, rotator);
    }
    
    rotator.rotateOnAxis(rotationInfo.axis, THREE.MathUtils.degToRad(deg));
    rotationInfo.deg += deg;
}


function getGenerators(layer) {

    const { face, index } = layer;
    const count = 1 + 2 * (dim - index - 1);

    let generators = null;

    if (face === 'F') {
        generators = {
            L : generateRightDiagonal(index, count),
            R : generateLeftDiagonal(index, count),
            D : generateHorizontal(dim - index - 1, count)
        }
    }
    else if (face === 'L') {
        generators = {
            F : generateLeftDiagonal(index, count),
            R : generateRightDiagonal(index, count),
            D : generateRightDiagonal(index, count)
        }
    }
    else if (face === 'R') {
        generators = {
            F : generateRightDiagonal(index, count),
            L : generateLeftDiagonal(index, count),
            D : generateLeftDiagonal(index, count)
        }
    }
    else if (face === 'D') {
        generators = {
            L : generateHorizontal(dim - index - 1, count),
            R : generateHorizontal(dim - index - 1, count),
            F : generateHorizontal(dim - index - 1, count)
        }
    }

    return generators;
}


function fixChanges() {
    
    const { layer, deg } = rotationInfo;
    
    if (Math.abs(deg) % 120 === 0) {
        
        const countOfRotations = (Math.abs(deg) % 360) / 120;

        const direction = deg > 0 ? 'right' : deg < 0 ? 'left' : 'no changes';

        console.log('layer: ', layer);
        console.log('deg: ', deg);
        console.log('direction: ', direction);
        console.log('count: ', countOfRotations);
        
        while (rotator.children.length > 0) { 
            pyraminx.attach(rotator.children[0]);
        }

        rotationInfo.deg = 0;

        if (direction === 'right' || direction === 'left') {
            saveChanges(layer, direction, countOfRotations);
        }
    }
}


function getSlicesIndices(layer) {
    const generators = getGenerators(layer);
    const slicesIndices = { };

    for (let adjFace in generators) {
        slicesIndices[adjFace] = Array.from(generators[adjFace]);
    }

    if (layer.face === 'F') {
        slicesIndices.L.reverse();
    }
    else if (layer.face === 'R') {
        slicesIndices.F.reverse();
    }
    else if (layer.face === 'L') {
        slicesIndices.F.reverse();
    }

    return slicesIndices;
}


function getRightRotationCycle(layer) {
    let cycle = [];

    if (layer.face === 'F') {
        cycle = ['R', 'L', 'D'];
    }
    else if (layer.face === 'R') {
        cycle = ['L', 'F', 'D'];
    }
    else if (layer.face === 'L') {
        cycle = ['F', 'R', 'D'];
    }
    else if (layer.face === 'D') {
        cycle = ['F', 'L', 'R'];
    }

    return cycle;
}


function saveChanges(layer, direction, countOfRotations) {

    countOfRotations %= 3;

    if (countOfRotations === 0) return;

    if (countOfRotations === 2) {
        direction = direction === 'right' ? 'left' : 'right';
        countOfRotations = 1;
    }

    const cycle = getRightRotationCycle(layer);
    const indices = getSlicesIndices(layer);

    if (direction === 'left') {
        cycle.reverse();
    }

    for (let i = 0; i < 2; i++) {
        swapSlices(
            cycle[i], cycle[i + 1], 
            indices[cycle[i]], indices[cycle[i + 1]]);
    }

    if (layer.index === 0) {

        if (direction === 'right') {
            invertRightDiagonals(layer.face);
            invertLeftDiagonals(layer.face);
        }
        else {
            invertLeftDiagonals(layer.face);
            invertRightDiagonals(layer.face);
        }
    }
}

function swapSlices(face1, face2, indices1, indices2) {

    for (let i = 0; i < indices1.length; i++) {
        const tmp = stateMap[face1][indices1[i]];
        stateMap[face1][indices1[i]] = stateMap[face2][indices2[i]];
        stateMap[face2][indices2[i]] = tmp;
    }
}

function invertRightDiagonals(face) {

    for (let i = 0; i < dim; i++) {    
        const count = 1 + 2 * (dim - i - 1);
        const indices = Array.from(generateRightDiagonal(i, count));

        invertDiagonal(stateMap[face], indices);
    }
}

function invertLeftDiagonals(face) {

    for (let i = 0; i < dim; i++) {    
        const count = 1 + 2 * (dim - i - 1);
        const indices = Array.from(generateLeftDiagonal(i, count));

        invertDiagonal(stateMap[face], indices);
    }
}

function invertDiagonal(arrayOfTriangles, indices) {

    const n = indices.length;

    for (let i = 0; i < Math.floor(n / 2); i++) {
        const tmp = arrayOfTriangles[indices[i]];
        arrayOfTriangles[indices[i]] = arrayOfTriangles[indices[n - i - 1]];
        arrayOfTriangles[indices[n - i - 1]] = tmp;
    }
}


rotator.rotateY(THREE.MathUtils.degToRad(34));
rotator.rotateX(THREE.MathUtils.degToRad(44));
rotator.rotateZ(THREE.MathUtils.degToRad(54));



scene.add(pyraminx);

// update each frame
(function update() {
    requestAnimationFrame(update);
    
    controls.update();    
    renderer.render(scene, camera);    
})();


// generates sequences:
// 0, 2, 3, 7, 8, 14, 15 ...    for 0th layer
// 1, 5, 6, 12, 13, 21, 22 ...  for 1st layer
// 4, 10, 11, 19, 20, 30 ...    for 2nd layer
function* generateRightDiagonal(n, count) {
    let x0 = n * n;
    yield x0;
    
    let xn = x0;
    for (let i = 1; i <= Math.floor((count - 1) / 2); i++) {
        xn += (1 + 2 * (n + i));
        
        yield xn - 1;
        yield xn;
    }
}

// generates sequences:
// 0, 1, 2, 4, 5, 9, 10 ...         for 0th layer
// 3, 6, 7, 11, 12, 18, 19 ...      for 1st layer
// 8, 13, 14, 20, 21, 29, 30 ...    for 2nd layer
function* generateLeftDiagonal(n, count) {
    let x0 = (n + 1) * (n + 1) - 1;
    yield x0;

    let xn = x0;
    for (let i = 1; i <= Math.floor((count - 1) / 2); i++) {
        xn += (1 + 2 * (n + i - 1));
        
        yield xn + 1;
        yield xn;
    }
}

// generates sequences:
// 0                for 0th layer
// 1, 2, 3          for 1st layer
// 4, 5, 6, 7, 8    for 2)nd layer
function* generateHorizontal(n, count) {
    let xn = n * n;
    for (let i = 0; i < count; i++) {
        yield xn;
        xn++;
    }
}


(function setGUIController(){
    const controller = {
        x : 0,
        y : 0,
        z : 0,
        fixChange : false
    };
    
    const panel = new gui.GUI();
    
    panel.add(controller, 'x', -180, 180, 1).onChange(() => { 
        pyraminx.rotation.x = THREE.MathUtils.degToRad(controller.x);
    });
    
    panel.add(controller, 'y', -180, 180, 1).onChange(() => { 
        pyraminx.rotation.y = THREE.MathUtils.degToRad(controller.y);
    });
    
    panel.add(controller, 'z', -180, 180, 1).onChange(() => { 
        pyraminx.rotation.z = THREE.MathUtils.degToRad(controller.z);
    });
    
    panel.add(controller, 'fixChange', true, false).onChange(() => { 
        if (controller.fixChange === true) {
            fixChanges();
        }
    });
    
    const previousAngles = {};
    
    ['F', 'L', 'R', 'D'].forEach(face => {
        for (let i = 0; i < dim; i++) {
            controller[face + i] = 0;
            previousAngles[face + i] = 0;
    
            panel.add(controller, face + i, -360, 360, 20).onChange(() => {
    
                const delta = controller[face + i] - previousAngles[face + i];
                previousAngles[face + i] = controller[face + i];
    
                rotateLayer({ face: face, index: i }, delta);
            });
        }
    });
})();


