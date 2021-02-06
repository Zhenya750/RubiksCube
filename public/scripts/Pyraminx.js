import * as THREE from './three_data/build/three.module.js';
import * as gui from './three_data/build/dat.gui.module.js';


export const Pyraminx = function(dimension) {

    const dim = dimension;
    const { pyraminx, planesBetween } = createPyraminxThreeObject(dim);
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


    // private methods
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
                reverseRightDiagonals(layer.face);
                reverseLeftDiagonals(layer.face);
            }
            else {
                reverseLeftDiagonals(layer.face);
                reverseRightDiagonals(layer.face);
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
    

    function reverseRightDiagonals(face) {
    
        for (let i = 0; i < dim; i++) {    
            const count = 1 + 2 * (dim - i - 1);
            const indices = Array.from(generateRightDiagonal(i, count));
    
            reverseDiagonal(stateMap[face], indices);
        }
    }


    function reverseLeftDiagonals(face) {

        for (let i = 0; i < dim; i++) {    
            const count = 1 + 2 * (dim - i - 1);
            const indices = Array.from(generateLeftDiagonal(i, count));
    
            reverseDiagonal(stateMap[face], indices);
        }
    }


    // public interface
    this.threeObject = pyraminx;
    this.dimension = dim;


    this.rotateLayer = function(layer, deg) {

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

            showPlanesAroundLayer(layer, planesBetween);
            rotator.attach(planesBetween[face][index]);

        }
        
        rotator.rotateOnAxis(rotationInfo.axis, THREE.MathUtils.degToRad(deg));
        rotationInfo.deg += deg;
    }


    this.fixChanges = function() {
    
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
            
            hidePlanesAroundLayer(layer, planesBetween);
    
            rotationInfo.deg = 0;
    
            if (direction === 'right' || direction === 'left') {
                saveChanges(layer, direction, countOfRotations);
            }
        }
    }


    this.getTriangleInfo = function(triangle) {

        const info = {
            face : '',
            leftDiagonal : 0,
            rightDiagonal : 0,
            horizontal : 0
        };

        for (let face in stateMap) {

            const index = stateMap[face].indexOf(triangle);

            if (index > -1) {

                info.face = face;

                for (let i = 0; i < dim; i++) {
                    const count = 1 + 2 * (dim - i - 1);
                    
                    const gld = generateLeftDiagonal(i, count);
                    for (let j of gld) {
                        if (j === index) {
                            info.leftDiagonal = i;
                            break;
                        }
                    }

                    const grd = generateRightDiagonal(i, count);
                    for (let j of grd) {
                        if (j === index) {
                            info.rightDiagonal = i;
                            break;
                        }
                    }
                    
                    const gh = generateHorizontal(dim - i - 1, count);
                    for (let j of gh) {
                        if (j === index) {
                            info.horizontal = i;
                            break;
                        }
                    }
                }
            }
        }

        return info;
    }


    this.getCurrentRotationAngle = function() {
        return rotationInfo.deg;
    }


    this.getFacesTriangles = function() {
        let allTriangles = [];
        for (let face in stateMap) {
            allTriangles = allTriangles.concat(stateMap[face]);
        }

        return allTriangles;
    }
}


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
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // mesh.add(new THREE.AxesHelper(0.3));
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

    const planesBetweenLayers = {
        F : createPlanesBetweenLayers(n, front),
        R : createPlanesBetweenLayers(n, right),
        L : createPlanesBetweenLayers(n, left),
        D : createPlanesBetweenLayers(n, down)
    }

    // !!! do not change the order of faces: F - L - R - D
    while (front.children.length > 0) group.attach(front.children[0]);
    while (left.children.length > 0) group.attach(left.children[0]);
    while (right.children.length > 0) group.attach(right.children[0]);
    while (down.children.length > 0) group.attach(down.children[0]);
    
    for (let face in planesBetweenLayers) {
        planesBetweenLayers[face].forEach(plane => {
            group.attach(plane);
            plane.visible = false;
        });
    }

    group.position.set(0, 0, 0);

    return { 
        pyraminx : group,
        planesBetween : planesBetweenLayers
    };
}


function createPlanesBetweenLayers(numberOfLayers, faceGroup) {

    const n = numberOfLayers;
    const H = Math.sqrt(6) / 3 * n;

    const planes1 = [];
    const planes2 = [];

    for (let i = n - 1; i >= 1; i--) {
        const plane1 = createTriangle({ background: 0x000000 });
    
        faceGroup.add(plane1);
        plane1.position.set(n / 2, Math.sqrt(3) / 2 * n / 3, -H / n * (n - i));
        plane1.scale.set(i, i, 1);

        const plane2 = plane1.clone(true);
        faceGroup.add(plane2);

        plane1.rotateY(Math.PI);
        planes1.push(plane1);
        planes2.push(plane2);
    }

    for (let i = 1; i < n - 1; i++) {
        planes1[i].attach(planes2[i - 1]);
    }
    
    planes1.push(planes2[n - 2]);
    return planes1;
}


function showPlanesAroundLayer(layer, planes) {
    const { face, index } = layer;
    const n = planes[face].length;

    for (let i = -1; i <= 1; i++) {
        if (index + i >= 0 && index + i < n) {
            planes[face][index + i].visible = true;
        }
    }
}


function hidePlanesAroundLayer(layer, planes) {
    const { face, index } = layer;
    const n = planes[face].length;

    for (let i = -1; i <= 1; i++) {
        if (index + i >= 0 && index + i < n) {
            planes[face][index + i].visible = false;
        }
    }
}


function createStateMap(pyraminxThreeObject, dimension) {

    const n = dimension;
    return {
        F : pyraminxThreeObject.children.slice(0,         n * n),
        L : pyraminxThreeObject.children.slice(n * n,     n * n * 2),
        R : pyraminxThreeObject.children.slice(n * n * 2, n * n * 3),
        D : pyraminxThreeObject.children.slice(n * n * 3, n * n * 4)        
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


function reverseDiagonal(arrayOfTriangles, indices) {
    
    const n = indices.length;

    for (let i = 0; i < Math.floor(n / 2); i++) {
        const tmp = arrayOfTriangles[indices[i]];
        arrayOfTriangles[indices[i]] = arrayOfTriangles[indices[n - i - 1]];
        arrayOfTriangles[indices[n - i - 1]] = tmp;
    }
}


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


// simple gui controller to rotate pyraminx's layers
export function setGUIController(pyraminx){
    const controller = {
        x : 0,
        y : 0,
        z : 0,
        fixChange : false
    };
    
    const panel = new gui.GUI();
    
    panel.add(controller, 'x', -180, 180, 1).onChange(() => { 
        pyraminx.threeObject.rotation.x = THREE.MathUtils.degToRad(controller.x);
    });
    
    panel.add(controller, 'y', -180, 180, 1).onChange(() => { 
        pyraminx.threeObject.rotation.y = THREE.MathUtils.degToRad(controller.y);
    });
    
    panel.add(controller, 'z', -180, 180, 1).onChange(() => { 
        pyraminx.threeObject.rotation.z = THREE.MathUtils.degToRad(controller.z);
    });
    
    panel.add(controller, 'fixChange', true, false).onChange(() => { 
        if (controller.fixChange === true) {
            pyraminx.fixChanges();
        }
    });
    
    const previousAngles = {};
    
    ['F', 'L', 'R', 'D'].forEach(face => {
        for (let i = 0; i < pyraminx.dimension; i++) {
            controller[face + i] = 0;
            previousAngles[face + i] = 0;
    
            panel.add(controller, face + i, -360, 360, 20).onChange(() => {
    
                const delta = controller[face + i] - previousAngles[face + i];
                previousAngles[face + i] = controller[face + i];
    
                pyraminx.rotateLayer({ face: face, index: i }, delta);
            });
        }
    });
};


