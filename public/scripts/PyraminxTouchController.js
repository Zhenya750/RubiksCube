import * as THREE from './three_data/build/three.module.js';

export const PyraminxTouchController = function(pyraminx, canvas, camera) {

    // private fields
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const coordPlane = createCoordinatePlane(100);

    const rotationState = {
        state : 'PREPARING',
        layer : null,
        previousDistance : 0,
        direction : null
    };

    let touchInfo = null;
    let closestAngleInfo = null;
    let wasTouched = false;
    let canCompleteRotation = false;


    // private methods
    function setCenteredMouseCoordinates(event) {
        mouse.x = (event.clientX / canvas.width) * 2 - 1;
        mouse.y = -(event.clientY / canvas.height) * 2 + 1;
    }
    

    const onMouseDown = (event) => {

        console.log('MOUSE DOWN IN PYRAMINX')

        if (this.enabled === false) return;

        setCenteredMouseCoordinates(event, mouse);

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pyraminx.getFacesTriangles());

        if (intersects.length > 0) {

            const triangle = intersects[0].object;
            const point = triangle.worldToLocal(intersects[0].point);
            touchInfo = pyraminx.getTriangleInfo(triangle);

            if (touchInfo.face === '') {
                throw 'unknown intersected object';
            }

            setCoordinatePlane(triangle, point, touchInfo);
            
            wasTouched = true;
            this.onStartTouching();
            
            document.addEventListener('mousemove', onMouseMove, true);
            document.addEventListener('mouseup', onMouseUp, true);
            canvas.removeEventListener('mousedown', onMouseDown, true);
        }
    }


    const onMouseUp = (event) => {

        if (this.enabled === false) return;

        console.log('mouse up');

        if (coordPlane.parent) {
            coordPlane.parent.remove(coordPlane);
        }

        if (wasTouched === true) {
            wasTouched = false;
            canCompleteRotation = true;
            this.onStopTouching();
        }

        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);
    }


    const onMouseMove = (event) => {

        if (this.enabled === false) return;
        if (!coordPlane) return;

        // if mouse is not down (unexpected situation)
        if (event.buttons === 0) onMouseUp();

        setCenteredMouseCoordinates(event, mouse);

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(coordPlane);

        if (intersects.length > 0) {
            
            let point = coordPlane.worldToLocal(intersects[0].point);
            let distance = point.distanceTo(new THREE.Vector3(0, 0, 0));

            switch (rotationState.state) {

                case 'PREPARING':
                    if (distance > 0.05) {
                        rotationState.state = 'DEFINING';
                    }
                    break;

                case 'DEFINING':
                    rotationState.direction = getDirection(point.x, point.y);
                    rotationState.layer = getLayer(touchInfo, rotationState.direction.name);
                    rotationState.state = 'ROTATING';
                    break;

                case 'ROTATING':
                    let project = point.projectOnVector(rotationState.direction.vector);
                    let len = project.length();
                    const sign = project.dot(rotationState.direction.vector) >= 0 ? 1 : -1;
                    const delta = len - rotationState.previousDistance;

                    pyraminx.rotateLayer(rotationState.layer, sign * delta * this.speedFactor);

                    rotationState.previousDistance = len;
                    break;

                default:
                    throw 'Unknown rotation state';
            }
        }
    }


    function setCoordinatePlane(triangle, localPoint, triangleInfo) {

        if (!coordPlane) return;

        pyraminx.threeObject.add(coordPlane);
        coordPlane.position.set(0, 0, 0);
        coordPlane.rotation.set(0, 0, 0);

        triangle.attach(coordPlane);
        coordPlane.position.set(localPoint.x, localPoint.y, localPoint.z + 0.005);

        const face = triangleInfo.face;

        if (face === 'F') {
            coordPlane.rotateX(-Math.PI / 2 + Math.acos(1 / 3));
        }
        else if (face === 'R') {
            coordPlane.rotateY(Math.PI * 2 / 3);
            coordPlane.rotateX(-Math.PI / 2 + Math.acos(1 / 3));
        }
        else if (face === 'L') {
            coordPlane.rotateY(-Math.PI * 2 / 3);
            coordPlane.rotateX(-Math.PI / 2 + Math.acos(1 / 3));
        }
        else if (face === 'D') {
            coordPlane.rotateY(Math.PI);
            coordPlane.rotateX(Math.PI / 2);
        }

        pyraminx.threeObject.attach(coordPlane);
    }


    const tryCompleteRotation = () => {

        if (canCompleteRotation === false) return;

        if (!closestAngleInfo) {
            const currentAngle = pyraminx.getCurrentRotationAngle();
            closestAngleInfo = getClosestAngleInfo(currentAngle, this.positiveStepToCompleteRotation);
        }
        
        if (closestAngleInfo.countOfSteps > 0) {
            if (rotationState.layer) {
                pyraminx.rotateLayer(rotationState.layer, closestAngleInfo.step);
                closestAngleInfo.countOfSteps--;
            }
        }
        else {
            if (rotationState.layer) {
                pyraminx.rotateLayer(rotationState.layer, closestAngleInfo.lastStep);
                pyraminx.fixChanges();
            }

            bringToStartState();
        }
    }


    function bringToStartState() {
        touchInfo = null;
        closestAngleInfo = null;
        canCompleteRotation = false;
        wasTouched = false;

        rotationState.state = 'PREPARING';
        rotationState.layer = null;
        rotationState.previousDistance = 0;
        rotationState.direction = null;

        canvas.addEventListener('mousedown', onMouseDown, true);
    }

    bringToStartState();


    // public interface
    this.enabled = true;
    this.speedFactor = 150 / pyraminx.dimension;
    this.positiveStepToCompleteRotation = 3;


    this.onStartTouching = function() {}


    this.onStopTouching = function() {}


    this.update = function() {
        tryCompleteRotation();
    }
}


function getClosestAngleInfo(currentAngle, positiveStep) {

    const sign = currentAngle >= 0 ? 1 : -1;
    const alpha = Math.abs(currentAngle);

    const left = 120 * Math.floor(alpha / 120);
    const right = 120 * Math.ceil(alpha / 120);

    const leftDelta = alpha - left;
    const rightDelta = right - alpha;

    const info = {
        closestAngle : 0,
        countOfSteps : 0,
        step : 0,
        lastStep : 0
    }

    if (leftDelta < rightDelta) {
        info.closestAngle = left * sign;
        info.countOfSteps = Math.floor(leftDelta / positiveStep);
        info.step = -sign * positiveStep;
        info.lastStep = -sign * (leftDelta - positiveStep * info.countOfSteps);
    }
    else {
        info.closestAngle = right * sign;
        info.countOfSteps = Math.floor(rightDelta / positiveStep);
        info.step = sign * positiveStep;
        info.lastStep = sign * (rightDelta - positiveStep * info.countOfSteps);
    }

    return info;
}


function getDirection(x, y) {

    const k = Math.sqrt(3);

    const direction = {
        name : 'H',
        vector: new THREE.Vector3(0, 0, 0)
    }

    // !!! vector numbers matter !!!
    // they affect the direction of rotation
    if (1 / k * Math.abs(x) >= Math.abs(y)) {
        direction.name = 'H';
        direction.vector.set(1, 0, 0);
    }

    if ((1 / k * x <= y && x >= 0) || (1 / k * x >= y && x <= 0)) {
        direction.name = 'L';
        direction.vector.set(-1, -k, 0);
    }

    if ((-1 / k * x <= y && x <= 0) || (-1 / k * x >= y && x >= 0)) {
        direction.name = 'R';
        direction.vector.set(-1, k, 0);
    }

    return direction;
}


function getLayer(touchInfo, directionName) {

    const directionToLayerIndex = {
        R : touchInfo.rightDiagonal,
        L : touchInfo.leftDiagonal,
        H : touchInfo.horizontal
    };

    const directionToFace = {
        F : { R : 'R', L : 'L', H : 'D' },
        R : { R : 'L', L : 'F', H : 'D' },
        L : { R : 'F', L : 'R', H : 'D' },
        D : { R : 'L', L : 'R', H : 'F' }
    };

    return {
        face : directionToFace[touchInfo.face][directionName],
        index : directionToLayerIndex[directionName]
    };
}


function createCoordinatePlane(size) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 0.5,
        transparent: true,
        opacity: 0
    });

    const plane = new THREE.Mesh(geometry, material);
    // plane.add(new THREE.AxesHelper(size * 0.75));
    return plane;
}