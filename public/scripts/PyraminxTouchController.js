import * as THREE from './three_data/build/three.module.js';

export const PyraminxTouchController = function(pyraminx, canvas, camera) {

    this.enabled = true;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const coordPlane = createCoordinatePlane(10);

    
    // private methods
    function setCenteredMouseCoordinates(event) {
        mouse.x = (event.clientX / canvas.width) * 2 - 1;
        mouse.y = -(event.clientY / canvas.height) * 2 + 1;
    }
    

    function onMouseDown(event) {

        if (this.enabled === false) return;

        console.log('mouse down');

        setCenteredMouseCoordinates(event, mouse);

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pyraminx.threeObject.children);

        if (intersects.length > 0) {

            const triangle = intersects[0].object;
            const point = triangle.worldToLocal(intersects[0].point);
            const info = pyraminx.getTriangleInfo(triangle);

            if (info.face === '') return;

            setCoordinatePlane(triangle, point, info);
        }
    }


    function onMouseUp(event) {

        if (this.enabled === false) return;

        console.log('mouse up');

        if (coordPlane.parent) {
            coordPlane.parent.remove(coordPlane);
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

    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
}


function createCoordinatePlane(size) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 0.5,
        transparent: true,
        opacity: 0.5
    });

    const plane = new THREE.Mesh(geometry, material);

    plane.add(new THREE.AxesHelper(size * 0.75));

    return plane;
}