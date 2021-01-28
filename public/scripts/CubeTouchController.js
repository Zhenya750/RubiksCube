import * as THREE from './three_data/build/three.module.js';

export class CubeTouchController {

    constructor(cube, canvas, camera) {
        this.Raycaster = new THREE.Raycaster();
        this.Mouse = new THREE.Vector2();
        this.Camera = camera;
        
        this.Canvas = canvas;
        this.CoordPlane = this.#createCoordinatePlane(100);
        this.Cube = cube;

        this.CanCompleteLayerRotation = false;
        this.WasLayerRotatedByMouse = false;

        this._wasDegOffsetSet = false;
        this._degOffset = 0;
        this.RotCtrl = {
            face         : '',
            indexOfPlane : -1,
            direction    : '',
            counter      : 0
        }

        this.TargetAngle = {
            angle        : 0,
            countOfSteps : 0,
            step         : 0
        }

        this.Canvas.addEventListener('mousedown', (event) => {
            this.#onMouseDown(event);
        }, false);
        
        // it is neccessary to add/remove the event
        this.mouseMoveBind = (event) => this.#onMouseMove(event);
        this.Canvas.addEventListener('mousemove', this.mouseMoveBind, false);

        this.Canvas.addEventListener('mouseup', (event) => {
            this.#onMouseUp(event);
        }, false);
    }


    #createCoordinatePlane(size) {
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            side: THREE.FrontSide,
            polygonOffset: true,
            polygonOffsetFactor: 0.5,
            transparent: true,
            opacity: 0
        });
    
        const plane = new THREE.Mesh(geometry, material);
        return plane;
    }


    #setCoordinatePlane(face, object, intersectionPoint) {
        if (this.CoordPlane) {
            this.Cube.ThreeObject.add(this.CoordPlane);
            this.CoordPlane.position.set(0, 0, 0);
            this.CoordPlane.rotation.set(0, 0, 0);
    
            object.attach(this.CoordPlane);
            this.CoordPlane.position.x = intersectionPoint.x;
            this.CoordPlane.position.y = intersectionPoint.y;
            this.CoordPlane.position.z = intersectionPoint.z;
    
            switch (face) {
                case 'U':
                    this.CoordPlane.rotateX(-Math.PI / 2);
                    break;
    
                case 'D':
                    this.CoordPlane.rotateX(Math.PI / 2);
                    break;
    
                case 'R':
                    this.CoordPlane.rotateY(Math.PI / 2);
                    break;
    
                case 'L':
                    this.CoordPlane.rotateY(-Math.PI / 2);
                    break;
    
                case 'F':
                    break;
    
                case 'B':
                    this.CoordPlane.rotateY(Math.PI);
                    break;
            }
    
            // coordinate plane should be in cube local space in order not 
            // to move while rotating a layer
            this.Cube.ThreeObject.attach(this.CoordPlane);
        }
    }


    #setMouseCoordinates(event) {
        this.Mouse.x = (event.clientX / this.Canvas.width) * 2 - 1;
        this.Mouse.y = -(event.clientY / this.Canvas.height) * 2 + 1;
    }


    #getDirection(x, y) {
        if (Math.abs(x) <= Math.abs(y)) return 'Y';
        if (Math.abs(x) >= Math.abs(y)) return 'X';
    }


    onStartTouching() {}


    // FIXME: should be called if the cube was touched
    onStopTouching() {}


    #onMouseDown(event) {
        console.log('mouesdown');
        this.#setMouseCoordinates(event);

        if (this.CanCompleteLayerRotation === false) {
            this.Raycaster.setFromCamera(this.Mouse, this.Camera);
            // TODO: fix cube . . .
            const intersects = this.Raycaster.intersectObjects(this.Cube.ThreeObject.children);
        
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                const point = obj.worldToLocal(intersects[0].point);
                
                for (let face in this.Cube.StateMap) {
                    
                    const index = this.Cube.StateMap[face].indexOf(obj);
        
                    if (index > -1) {
                        console.log('face: ' + face + ' index: ' + index);
                        this.#setCoordinatePlane(face, obj, point);
        
                        this.RotCtrl.indexOfPlane = index;
                        this.RotCtrl.face = face;
        
                        this.Canvas.addEventListener('mousemove', this.mouseMoveBind, false);
                        break;
                    }
                }

                this.onStartTouching();
            }
        }
    }


    #onMouseUp(event) {
        console.log('mouseup');
        this.Canvas.removeEventListener('mousemove', this.mouseMoveBind);
        
        if (this.WasLayerRotatedByMouse) {  
            this.#setTargetAngle(3);
            this.WasLayerRotatedByMouse = false;
            this.CanCompleteLayerRotation = true;
        }
        
        if (this.CoordPlane.parent) {
            this.CoordPlane.parent.remove(this.CoordPlane);
        }
        
        this.RotCtrl.counter = 0;
        
        this.onStopTouching();
    }

    
    sensitivity() {
        return 100 / this.Cube.N;
    }


    #onMouseMove(event) {
        this.#setMouseCoordinates(event);

        this.Raycaster.setFromCamera(this.Mouse, this.Camera);
        const intersects = this.Raycaster.intersectObject(this.CoordPlane);

        if (intersects.length > 0) {
            
            const point = this.CoordPlane.worldToLocal(intersects[0].point);

            if (this.RotCtrl.counter < 5) {
                if (Math.abs(point.x) > 0 || Math.abs(point.y) > 0) {
                    this.RotCtrl.counter++;
                    this.RotCtrl.direction = this.#getDirection(point.x, point.y);
                    this._wasDegOffsetSet = false;
                }
            }
            else {
                const row = Math.floor(this.RotCtrl.indexOfPlane / this.Cube.N);
                const col = this.RotCtrl.indexOfPlane % this.Cube.N;
                
                const faceTouchInfo = this.#getFaceTouchInfo(row, col);
                
                if (this.RotCtrl.face) {
                    const deg = (this.RotCtrl.direction === 'X' ? point.x : point.y) * this.sensitivity();
                    
                    if (this._wasDegOffsetSet === false) {
                        this._degOffset = deg;
                        this._wasDegOffsetSet = true;
                    }

                    const info = faceTouchInfo[this.RotCtrl.face][this.RotCtrl.direction];

                    // TODO: hide KERNEL . . .
                    const angle = this.Cube.KERNEL[info.face].layerPreviousAngles[info.indexOfLayer];

                    this.Cube.rotateLayer(
                        info.face, 
                        info.indexOfLayer, 
                        angle + (info.isOppositeLayer ? deg - this._degOffset : -deg + this._degOffset));

                    this.WasLayerRotatedByMouse = true;
                }
            }
        }
    }


    #getFaceTouchInfo(row, col) {
        const N = this.Cube.N;
        return {
            F : {
                X : { face : 'U', indexOfLayer : row,         isOppositeLayer : row === N - 1 },
                Y : { face : 'R', indexOfLayer : N - col - 1, isOppositeLayer : col !== 0 }
            },
        
            B : {
                X : { face : 'U', indexOfLayer : row,         isOppositeLayer : row === N - 1 },
                Y : { face : 'R', indexOfLayer : col,         isOppositeLayer : col === N - 1 }
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
                X : { face : 'U', indexOfLayer : row,         isOppositeLayer : row === N - 1 },
                Y : { face : 'F', indexOfLayer : col,         isOppositeLayer : col === N - 1 }
            },
        
            L : {
                X : { face : 'U', indexOfLayer : row,         isOppositeLayer : row === N - 1 },
                Y : { face : 'F', indexOfLayer : N - col - 1, isOppositeLayer : col !== 0 }
            }
        };
    }


    #setTargetAngle(positiveStep) {
        const angle = this.Cube.LastRotatedLayer.angle;
        const sign =  angle >= 0 ? 1 : -1;
        const alpha = Math.abs(angle);
    
        const leftTarget = 90 * Math.floor(alpha / 90);
        const rightTarget = 90 * Math.ceil(alpha / 90);
    
        const leftDelta = alpha - leftTarget;
        const rightDelta = rightTarget - alpha;
    
        if (leftDelta <= rightDelta) {
            this.TargetAngle.angle = leftTarget * sign;
            this.TargetAngle.countOfSteps = Math.floor(leftDelta / positiveStep);
            this.TargetAngle.step = positiveStep * -sign;
        }
        else {
            this.TargetAngle.angle = rightTarget * sign;
            this.TargetAngle.countOfSteps = Math.floor(rightDelta / positiveStep);
            this.TargetAngle.step = positiveStep * sign;
        }
    }


    #completeLayerRotation() {
        const { face, index, angle } = this.Cube.LastRotatedLayer;

        if (this.TargetAngle.countOfSteps > 0) {
            this.TargetAngle.countOfSteps--;
            this.Cube.rotateLayer(face, index, angle + this.TargetAngle.step);
        }
        else {
            this.Cube.rotateLayer(face, index, this.TargetAngle.angle);
            this.Cube.fixChange();
            this.CanCompleteLayerRotation = false;
        }
    }


    update() {
        if (this.CanCompleteLayerRotation) {
            this.#completeLayerRotation();
        }
    }
}