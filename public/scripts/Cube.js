import * as THREE from './three_data/build/three.module.js';

export class Cube {

    Colors = {
        F  : 0x3a49ee,
        B  : 0x37cd2f,
        R  : 0xe14343,
        L  : 0xf4844c,
        U  : 0xebe457,
        D  : 0xffffff,
        BG : 0x000000
    }

    constructor(n) {
        this.N = n;
        this.ThreeObject = new THREE.Group();
        this.#setCubeFaces();

        this.Rotator = new THREE.Group();
        this.ThreeObject.add(this.Rotator);
        this.ThreeObject.add(new THREE.AxesHelper(3));

        this.StateMap = {
            U : this.ThreeObject.children.slice(0,                   this.N * this.N),
            L : this.ThreeObject.children.slice(this.N * this.N,     this.N * this.N * 2),
            B : this.ThreeObject.children.slice(this.N * this.N * 2, this.N * this.N * 3),
            R : this.ThreeObject.children.slice(this.N * this.N * 3, this.N * this.N * 4),
            F : this.ThreeObject.children.slice(this.N * this.N * 4, this.N * this.N * 5),
            D : this.ThreeObject.children.slice(this.N * this.N * 5, this.N * this.N * 6)
        };

        this.PlanesBetweenLayers = {
            F : this.#createPlanesBetweenLayers('F'),
            R : this.#createPlanesBetweenLayers('R'),
            U : this.#createPlanesBetweenLayers('U')
        };

        this.#setPlanesBetweenLayers();
        
        this.KERNEL = this.#createKernel();

        this.LastRotatedLayer = {
            face  : 'F',    // can be any face
            index : 0,
            angle : 0
        }
    }


    // TODO: - create a certain layer for planes only (for raycast)
    #createFace(color, backgroundColor) {
        const group = new THREE.Group();
        const planeSize = 1;
        const padding = planeSize / 7;

        const k = (this.N - 1) / 2;

        const backgroundGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const backgroundMaterial = new THREE.MeshPhongMaterial({
            color: backgroundColor,
            side: THREE.FrontSide,
            polygonOffset: true,
            polygonOffsetFactor: 2
        });

        const foregroundGeometry = new THREE.PlaneGeometry(planeSize - padding, planeSize - padding);
        const foregroundMaterial = new THREE.MeshPhongMaterial({
            color: color,
            side: THREE.FrontSide,
            polygonOffset: true,
            polygonOffsetFactor: 1
        });

        for (let y = k; y >= -k; y--) {
            for (let x = -k; x <= k; x++) {
                const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
                const foregroundPlane = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
                backgroundPlane.add(foregroundPlane);

                // don't let background to appear through the foreground
                foregroundPlane.position.z += 0.001;

                backgroundPlane.position.x = x * planeSize;
                backgroundPlane.position.y = y * planeSize;

                group.add(backgroundPlane);
            }
        }

        return group;
    }


    #setCubeFaces() {
        const d = this.N / 2;
        const up = this.#createFace(this.Colors.U, this.Colors.BG);
        up.rotateX(-Math.PI / 2);
        up.position.y = d;
        while (up.children.length > 0) this.ThreeObject.attach(up.children[0]);
        
        const left = this.#createFace(this.Colors.L, this.Colors.BG);
        left.rotateY(-Math.PI / 2);
        left.position.x = -d;
        while (left.children.length > 0) this.ThreeObject.attach(left.children[0]);
        
        const back = this.#createFace(this.Colors.B, this.Colors.BG);
        back.rotateY(Math.PI);
        back.position.z = -d;
        while (back.children.length > 0) this.ThreeObject.attach(back.children[0]);
        
        const right = this.#createFace(this.Colors.R, this.Colors.BG);
        right.rotateY(Math.PI / 2);
        right.position.x = d;
        while (right.children.length > 0) this.ThreeObject.attach(right.children[0]);
        
        const front = this.#createFace(this.Colors.F, this.Colors.BG);
        front.position.z = d;
        while (front.children.length > 0) this.ThreeObject.attach(front.children[0]);
        
        const down = this.#createFace(this.Colors.D, this.Colors.BG);
        down.rotateX(Math.PI / 2);
        down.position.y = -d;
        while (down.children.length > 0) this.ThreeObject.attach(down.children[0]);
    }


    #createPlanesBetweenLayers(face) {
        const planeSize = 1 * this.N;
        let planesBetweenLayers = [];
    
        const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const material = new THREE.MeshPhongMaterial({
            color: this.Colors.BG,
            side: THREE.FrontSide,
            polygonOffset: true,
            polygonOffsetFactor: 3,
        });
    
        let offset = this.N / 2;
        
        let axis = '';
        if (face === 'F') axis = 'z'
        if (face === 'R') axis = 'x';
        if (face === 'U') axis = 'y';
        
        for (let index = 0; index < this.N; index++) {
            let plane1 = null;
            if (Math.abs(offset) < this.N / 2) {
                plane1 = new THREE.Mesh(geometry, material);
                plane1.position[axis] = offset;
    
                if (face === 'U') plane1.rotateX(-Math.PI / 2);
                if (face === 'R') plane1.rotateY(Math.PI / 2);
            }
            
            offset--;
            
            let plane2 = null;
            if (Math.abs(offset) < this.N / 2) {
                plane2 = new THREE.Mesh(geometry, material);
                plane2.position[axis] = offset;
    
                if (face === 'U') plane2.rotateX(-Math.PI / 2);
                if (face === 'R') plane2.rotateY(Math.PI / 2);
    
                plane2.rotateY(Math.PI);
            }
    
            if (plane1) {
                if (plane2) plane1.attach(plane2);
                planesBetweenLayers.push(plane1);
            }
            else {
                planesBetweenLayers.push(plane2);
            }
        }
    
        return planesBetweenLayers;
    };


    #setPlanesBetweenLayers() {
        for (let key in this.PlanesBetweenLayers) {
            this.PlanesBetweenLayers[key].forEach(plane => {
                this.ThreeObject.attach(plane);
                plane.visible = false;
            });
        }
    }


    #showPlanesAroundLayer(face, index) {
        for (let i = -1; i <= 1; i++) {
            if (index + i >= 0 && index + i < this.N) {
                this.PlanesBetweenLayers[face][index + i].visible = true;
            }
        }
    }
    

    #hidePlanesAroundLayer(face, index) {
        for (let i = -1; i <= 1; i++) {
            if (index + i >= 0 && index + i < this.N) {
                this.PlanesBetweenLayers[face][index + i].visible = false;
            }
        }
    }


    #createKernel() {
        const N = this.N;
        return {
            F : {
                R : (i) => { return { index : i,               step : N } },
                U : (i) => { return { index : N * (N - i - 1), step : 1 } },
                L : (i) => { return { index : N * N - i - 1,   step : -N } },
                D : (i) => { return { index : (i + 1) * N - 1, step : -1 } },
                axis : 'z',
                adjacentFaces : ['R', 'U', 'L', 'D'],
                oppositeFace : 'B',
                layerRotations : Array.from({ length: N }, () => this.Rotator.rotation.toVector3()),
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
                layerRotations : Array.from({ length: N }, () => this.Rotator.rotation.toVector3()),
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
                layerRotations : Array.from({ length: N }, () => this.Rotator.rotation.toVector3()),
                layerPreviousAngles : new Array(N).fill(0)
            }
        };
    }


    rotateLayer(face, index, deg) {
        const layerRotation = this.KERNEL[face].layerRotations[index];
    
        this.Rotator.rotation.x = layerRotation.x;
        this.Rotator.rotation.y = layerRotation.y;
        this.Rotator.rotation.z = layerRotation.z;
    
        if (this.Rotator.children.length === 0) {
            if (index === 0) {
                this.StateMap[face].forEach(plane => this.Rotator.attach(plane));
            }
            else if (index === this.N - 1) {
                this.StateMap[this.KERNEL[face].oppositeFace].forEach(plane => this.Rotator.attach(plane));
            }
    
            this.KERNEL[face].adjacentFaces.forEach(adj => {
    
                let iterator = this.KERNEL[face][adj](index);
    
                for (let i = 0; i < this.N; i++) {
                    this.Rotator.attach(this.StateMap[adj][iterator.index])
                    iterator.index += iterator.step;
                }
    
                this.#showPlanesAroundLayer(face, index);
                this.Rotator.attach(this.PlanesBetweenLayers[face][index]);
            });
        }
    
        const rad = THREE.MathUtils.degToRad(deg * (index === this.N - 1 ? 1 : -1));
        const axis = this.KERNEL[face].axis;
        this.Rotator.rotation[axis] = rad;
        layerRotation[axis] = rad;
    
        this.LastRotatedLayer.face = face;
        this.LastRotatedLayer.index = index;
        this.LastRotatedLayer.angle = deg;
    }


    #transpose(arr) {
        const n = Math.round(Math.sqrt(arr.length));
    
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const tmp = arr[i * n + j];
                arr[i * n + j] = arr[j * n + i];
                arr[j * n + i] = tmp;
            }
        }
    }
    

    #invertRows(arr) {
        const n = Math.round(Math.sqrt(arr.length));
    
        for (let k = 0; k < n; k++) {
            for (let i = n * k, j = i + n - 1; i < j; i++, j--) {
                const tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
        }
    }
    

    #swapFaceSlices(faceA, faceB, startIndexA, startIndexB) {
        const n = Math.round(Math.sqrt(faceA.length));
    
        for (let i = 0; i < n; i++) {
            const tmp = faceA[startIndexA.index];
            faceA[startIndexA.index] = faceB[startIndexB.index];
            faceB[startIndexB.index] = tmp;
    
            startIndexA.index += startIndexA.step;
            startIndexB.index += startIndexB.step;
        }
    }


    #moveLayerSlicesRight(face, index) {
        const adj = this.KERNEL[face].adjacentFaces;
        for (let i = 0; i < adj.length - 1; i++) {
            this.#swapFaceSlices(
                this.StateMap[adj[i]], 
                this.StateMap[adj[i + 1]], 
                this.KERNEL[face][adj[i]](index), 
                this.KERNEL[face][adj[i + 1]](index));
        }
    }
    

    #moveLayerSlicesLeft(face, index) {
        const adj = this.KERNEL[face].adjacentFaces;
        for (let i = adj.length - 1; i > 0; i--) {
            this.#swapFaceSlices(
                this.StateMap[adj[i]], 
                this.StateMap[adj[i - 1]], 
                this.KERNEL[face][adj[i]](index), 
                this.KERNEL[face][adj[i - 1]](index));
        }
    }


    #saveChange(direction, countOfRotations) {

        countOfRotations %= 4;

        const { face, index } = this.LastRotatedLayer;

        while (countOfRotations-- > 0) {
            if (direction === 'right') {
                if (index === 0) {
                    this.#transpose(this.StateMap[face]);
                    this.#invertRows(this.StateMap[face]);
                }
                else if (index === this.N - 1) {
                    this.#transpose(this.StateMap[this.KERNEL[face].oppositeFace]);
                    this.#invertRows(this.StateMap[this.KERNEL[face].oppositeFace]);
    
                    this.#moveLayerSlicesLeft(face, index);
                    continue;
                }
        
                this.#moveLayerSlicesRight(face, index);
            }
            else if (direction === 'left') {
                if (index === 0) {
                    this.#invertRows(this.StateMap[face]);
                    this.#transpose(this.StateMap[face]);
                }
                else if (index === this.N - 1) {
                    this.#invertRows(this.StateMap[this.KERNEL[face].oppositeFace]);
                    this.#transpose(this.StateMap[this.KERNEL[face].oppositeFace]);
    
                    this.#moveLayerSlicesRight(face, index);
                    continue;
                }
                
                this.#moveLayerSlicesLeft(face, index);
            }
        }
    }


    fixChange() {
        const { face, index, angle } = this.LastRotatedLayer;
        const previousAngle = this.KERNEL[face].layerPreviousAngles[index];
        const dangle = angle - previousAngle;
    
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
    
        this.#hidePlanesAroundLayer(face, index);
        while (this.Rotator.children.length > 0) {
            this.ThreeObject.attach(this.Rotator.children[0]);
        }
    
        if (direction !== 'no change') {
            this.#saveChange(direction, countOfRotations);
        }
    
        this.KERNEL[face].layerPreviousAngles[index] = angle;
    }
}