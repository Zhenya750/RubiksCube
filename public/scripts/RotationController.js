import * as THREE from './three_data/build/three.module.js';

export class RotationController {

    constructor(camera, targetObject, canvas) {

        this.canvas = canvas;
        this.enabled = true;
        this.camera = camera;
        this.targetObject = targetObject;

        this._trackBall = new THREE.Object3D();

        this._canSlide = false;

        this._startPoint = new THREE.Vector2();
        this._deltaPoint = new THREE.Vector2();

        this._startRotation = new THREE.Vector3();
        this._endRotation = new THREE.Vector3();

        this._curQuat;

        this._mouseMoveBind = (event) => this.#onMouseMove(event);
        this.canvas.addEventListener('mousedown', (event) => this.#onMouseDown(event), false);
        this.canvas.addEventListener('mouseup', (event) => this.#onMouseUp(event), false);
    }

    #onMouseDown(event) {
        if (this.enabled === false) return;
        
        this._canSlide = false;

        this._startPoint.x = event.clientX;
        this._startPoint.y = event.clientY;

        this._startRotation = this.#projectOnTrackball(0, 0);
        
        this.canvas.addEventListener('mousemove', this._mouseMoveBind, false);
    }

    #onMouseMove(event) {
        if (this.enabled === false) return;

        this._deltaPoint.x = event.clientX - this._startPoint.x;
        this._deltaPoint.y = event.clientY - this._startPoint.y;

        this.#handleRotation();

        this._startPoint.x = event.clientX;
        this._startPoint.y = event.clientY;
    }

    #onMouseUp(event) {
        if (this.enabled === false) return;

        this.canvas.removeEventListener('mousemove', this._mouseMoveBind);

        this._canSlide = true;
    }

    #projectOnTrackball(touchX, touchY) {
        const w = this.canvas.width;
        const h = this.canvas.height;
    
        const mouseOnBall = new THREE.Vector3(
            THREE.MathUtils.clamp(touchX / (w / 2), -1, 1),
            THREE.MathUtils.clamp(-touchY / (h / 2), -1, 1),
            0
        );
    
        const len = mouseOnBall.length();
    
        if (len > 1.0) {
            mouseOnBall.normalize();
        }
        else {
            mouseOnBall.z = Math.sqrt(1.0 - len * len);
        }
    
        return this._trackBall.localToWorld(mouseOnBall);;
    }

    #handleRotation() {
        this._endRotation = this.#projectOnTrackball(this._deltaPoint.x, this._deltaPoint.y);
    
        const rotQuat = this.#rotateMatrix(this._startRotation, this._endRotation);
        
        this._curQuat = this.targetObject.quaternion.clone();
        this._curQuat.multiplyQuaternions(rotQuat, this._curQuat);
        this._curQuat.normalize();
    
        this.targetObject.setRotationFromQuaternion(this._curQuat);
    }

    #rotateMatrix(startRot, endRot) {
        let axis = new THREE.Vector3();
        let quat = new THREE.Quaternion();
    
        let angle = startRot.angleTo(endRot);
    
        axis.crossVectors(startRot, endRot).normalize();
        angle *= 2;
        quat.setFromAxisAngle(axis, angle);
    
        return quat;
    }

    #trySliding() {
        if (this._canSlide) {
    
            const slideFactor = 0.95;
    
            if (Math.abs(this._deltaPoint.x) > 0.1) {
                this._deltaPoint.x *= slideFactor;
            }
            else {
                this._deltaPoint.x = 0;
            }
    
            if (Math.abs(this._deltaPoint.y) > 0.1) {
                this._deltaPoint.y *= slideFactor;
            }
            else {
                this._deltaPoint.y = 0;
            }
    
            this.#handleRotation();
        }
    }

    update() {
        this._trackBall.lookAt(this.camera.position);
        this.#trySliding();
    }
}