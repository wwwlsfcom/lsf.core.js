import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import CameraCrossSection from '../../three-extensions/CameraCrossSection';


export default class ThreeViewer {

    private readonly container: HTMLDivElement = document.createElement('div');
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(60, 2, .1, 100);
    private readonly cameraHelper;
    private readonly cameraCrossSection: CameraCrossSection;

    private readonly renderer;
    private renderRequested;

    private readonly renderCallback;
    private readonly controls;

    private readonly viewHelper;

    private cameraHelperWindowOpened = false; //是否打开相机助手视窗
    private cameraHelperWindowElement = null;//显示相机助手小窗口的dom元素

    /**
     * @param light: 是否开启灯光
     * @param alpha: 场景背景是否透明
     */
    constructor({light = true, alpha = true} = {}) {
        const canvas = this.creatCanvas();
        this.Container.appendChild(canvas);
        this.renderer = new THREE.WebGLRenderer({canvas, alpha});
        this.renderer.shadowMap.enabled = true;

        this.scene.background = new THREE.Color('black');

        this.camera.position.z = 10;
        this.cameraHelper = new THREE.CameraHelper(this.camera);
        this.scene.add(this.cameraHelper);
        this.cameraCrossSection = new CameraCrossSection(this.camera);
        this.scene.add(this.cameraCrossSection);

        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enableDamping = false;
        Object.defineProperty(this.controls, 'center', {
            get() {
                return this.target;
            }
        });
        this.renderCallback = this.requestRenderIfNotRequested.bind(this);

        this.controls.addEventListener('change', this.renderCallback);
        window.addEventListener('resize', this.renderCallback);

        if (light) {
            const defaultLight = new THREE.AmbientLight(0xFFFFFF);
            this.addObjects(defaultLight);
        }

        {
            this.viewHelper = new ViewHelper(this.camera, this.container);
            this.viewHelper.controls = this.controls;
            const clock = new THREE.Clock(); // only used for animations
            function animate() {
                const delta = clock.getDelta();
                let needsUpdate = false;
                // View Helper
                if (this.viewHelper.animating === true) {
                    this.viewHelper.update(delta);
                    needsUpdate = true;
                }

                if (needsUpdate === true) this.render();
            }

            this.renderer.setAnimationLoop(animate.bind(this));
        }
    }

    private resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    private setScissorForElement(elem) {
        const canvasRect = this.renderer.domElement.getBoundingClientRect();
        const elemRect = elem.getBoundingClientRect();

        // compute a canvas relative rectangle
        const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
        const left = Math.max(0, elemRect.left - canvasRect.left);
        const bottom = Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
        const top = Math.max(0, elemRect.top - canvasRect.top);

        const width = Math.min(canvasRect.width, right - left);
        const height = Math.min(canvasRect.height, bottom - top);

        // setup the scissor to only render to that part of the canvas
        const positiveYUpBottom = canvasRect.height - bottom;
        this.renderer.setScissor(left, positiveYUpBottom, width, height);
        this.renderer.setViewport(left, positiveYUpBottom, width, height);

        // return the aspect
        return width / height;
    }

    //创建显示相机助手小窗口的dom元素， 在视图容器坐上角
    private createCameraHelperElement(): HTMLDivElement {
        const div = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'relative',
        });
        Object.assign(div.style, {
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            height: '50%',
        });

        return div;
    }

    private creatCanvas(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        Object.assign(canvas.style, {
            width: '100%',
            height: '100%',
            display: 'block',
        });
        return canvas;
    }

    private requestRenderIfNotRequested() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(() => {
                this.render();
            });
        }
    }

    private zoomTo(sizeToFitOnScreen, boxSize, boxCenter) {
        const camera = this.camera;

        const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
        const halfFovY = THREE.MathUtils.degToRad(camera.fov * .5);
        const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
        // compute a unit vector that points in the direction the camera is now
        // in the xz plane from the center of the box
        const direction = (new THREE.Vector3())
            .subVectors(camera.position, boxCenter)
            .multiply(new THREE.Vector3(1, 0, 1))
            .normalize();

        // move the camera to a position distance units way from the center
        // in whatever direction the camera was from the center already
        camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

        // pick some near and far values for the frustum that
        // will contain the box.
        // camera.near = boxSize / 10;
        camera.far = Math.min(boxSize * 3, 1000);
        camera.near = camera.far / 10;
        camera.updateProjectionMatrix();

        // point the camera to look at the center of the box
        camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
    }

    //相机助手窗口中的主相机和控制器
    private camera2;
    private controls2;

    //渲染主相机
    private renderMainCamera(aspect?) {
        // adjust the camera for this aspect
        aspect && (this.camera.aspect = aspect);
        this.camera.updateProjectionMatrix();
        this.cameraHelper.update();
        this.cameraCrossSection.update();
        // don't draw the camera helper in the original view
        this.cameraHelper.visible = false;
        // render
        this.scene.background.set(0x000000);
        this.renderer.render(this.scene, this.camera);

        //显示viewHelper
        this.renderer.autoClear = false;
        this.viewHelper.render(this.renderer);
        this.renderer.autoClear = true;
    }

    /*********
     *
     * 公有属性
     *
     *********/


    /**
     * 视图dom容器
     * @constructor
     */
    public get Container() {
        return this.container;
    }

    /**
     * 主相机
     */
    get Camera() {
        return this.camera;
    }


    public get CameraHelperWindowOpening(): boolean {
        return this.cameraHelperWindowOpened;
    }

    /**
     * 设置是否打开相机助手
     */
    public set CameraHelperWindowOpening(value) {
        this.cameraHelperWindowOpened = value;
        if (this.cameraHelperWindowOpened) {
            this.cameraHelperWindowElement && (this.cameraHelperWindowElement.style.visibility = 'visible');
            if (this.cameraHelperWindowElement === null)
                this.cameraHelperWindowElement = this.createCameraHelperElement();
            this.container.append(this.cameraHelperWindowElement);

            if (!this.camera2) {
                this.camera2 = new THREE.PerspectiveCamera(
                    75,  // fov
                    this.camera.aspect,
                    this.camera.near / 2,
                    this.camera.far * 2
                );
                this.camera2.position.set(40, 10, 30);
                this.camera2.lookAt(0, 5, 0);

                this.controls2 = new OrbitControls(this.camera2, this.cameraHelperWindowElement);
                this.controls2.target.set(0, 5, 0);
                this.controls2.update();
                this.controls2.addEventListener('change', this.renderCallback);
            }
        } else {
            this.cameraHelperWindowElement && (this.cameraHelperWindowElement.style.visibility = 'hidden');
        }
    }

    /**
     * 手段调用该方法,强制刷新
     */
    public render() {
        this.camera.updateWorldMatrix();
        this.renderRequested = undefined;
        if (this.resizeRendererToDisplaySize(this.renderer)) {
            const canvas = this.renderer.domElement;
            this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
            this.camera.updateProjectionMatrix();
        }

        // turn on the scissor
        this.renderer.setScissorTest(this.cameraHelperWindowOpened);

        if (this.cameraHelperWindowOpened) {
            // render the original view
            {
                const aspect = this.setScissorForElement(this.container);
                this.renderMainCamera(aspect);
            }
            // render from the 2nd camera
            if (this.camera2) {
                const aspect = this.setScissorForElement(this.cameraHelperWindowElement);
                // adjust the camera for this aspect
                this.camera2.aspect = aspect;
                this.camera2.updateProjectionMatrix();
                // draw the camera helper in the 2nd view
                this.cameraHelper.visible = true;
                this.scene.background.set(0x000040);
                this.renderer.render(this.scene, this.camera2);
            }
        } else {
            const aspect = this.setScissorForElement(this.container);
            this.renderMainCamera(aspect);
        }
    }


    /**
     * 添加THREE.Object3D对象
     * @param objects
     */
    public addObjects(...objects: Array<THREE.Object3D>) {
        this.scene.add(...objects);
    }


    /**
     * 对象在视图中最大化显示
     * @param object
     */
    public setFitView(object: THREE.Object3D) {
// compute the box that contains all the stuff
        // from root and below
        const box = new THREE.Box3().setFromObject(object);

        const boxSize = box.getSize(new THREE.Vector3()).length();
        const boxCenter = box.getCenter(new THREE.Vector3());

        // set the camera to frame the box
        this.zoomTo(boxSize, boxSize, boxCenter);

        // update the Trackball controls to handle the new size
        this.controls.maxDistance = boxSize * 2;

        this.controls.maxPolarAngle = Math.PI / 2;

        this.controls.target.copy(boxCenter);
        this.controls.update();

        this.requestRenderIfNotRequested();
    }

    /**
     * 销毁试图
     */
    public dispose() {
        this.controls.removeEventListener('change', this.renderCallback);
        window.removeEventListener('resize', this.renderCallback);

        this.Container.remove();
    }


}


const vpTemp = new THREE.Vector4();

class ViewHelperBase extends THREE.Object3D {
    private animating: boolean;
    private controls: null;
    private render: (renderer) => void;
    protected handleClick: (event) => (boolean);
    private update: (delta) => void;

    add(...objects) {
        super.add(...objects);
    }

    constructor(editorCamera, dom) {

        super();

        this.animating = false;
        this.controls = null;

        const color1 = new THREE.Color('#ff3653');
        const color2 = new THREE.Color('#8adb00');
        const color3 = new THREE.Color('#2c8fff');

        const interactiveObjects = [];
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const dummy = new THREE.Object3D();

        const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 4);
        camera.position.set(0, 0, 2);

        const geometry = new THREE.BoxGeometry(0.8, 0.05, 0.05).translate(0.4, 0, 0);

        const xAxis = new THREE.Mesh(geometry, getAxisMaterial(color1));
        const yAxis = new THREE.Mesh(geometry, getAxisMaterial(color2));
        const zAxis = new THREE.Mesh(geometry, getAxisMaterial(color3));

        yAxis.rotation.z = Math.PI / 2;
        zAxis.rotation.y = -Math.PI / 2;

        this.add(xAxis);
        this.add(zAxis);
        this.add(yAxis);

        const posXAxisHelper = new THREE.Sprite(getSpriteMaterial(color1, 'X'));
        posXAxisHelper.userData.type = 'posX';
        const posYAxisHelper = new THREE.Sprite(getSpriteMaterial(color2, 'Y'));
        posYAxisHelper.userData.type = 'posY';
        const posZAxisHelper = new THREE.Sprite(getSpriteMaterial(color3, 'Z'));
        posZAxisHelper.userData.type = 'posZ';
        const negXAxisHelper = new THREE.Sprite(getSpriteMaterial(color1));
        negXAxisHelper.userData.type = 'negX';
        const negYAxisHelper = new THREE.Sprite(getSpriteMaterial(color2));
        negYAxisHelper.userData.type = 'negY';
        const negZAxisHelper = new THREE.Sprite(getSpriteMaterial(color3));
        negZAxisHelper.userData.type = 'negZ';

        posXAxisHelper.position.x = 1;
        posYAxisHelper.position.y = 1;
        posZAxisHelper.position.z = 1;
        negXAxisHelper.position.x = -1;
        negXAxisHelper.scale.setScalar(0.8);
        negYAxisHelper.position.y = -1;
        negYAxisHelper.scale.setScalar(0.8);
        negZAxisHelper.position.z = -1;
        negZAxisHelper.scale.setScalar(0.8);

        this.add(posXAxisHelper);
        this.add(posYAxisHelper);
        this.add(posZAxisHelper);
        this.add(negXAxisHelper);
        this.add(negYAxisHelper);
        this.add(negZAxisHelper);

        interactiveObjects.push(posXAxisHelper);
        interactiveObjects.push(posYAxisHelper);
        interactiveObjects.push(posZAxisHelper);
        interactiveObjects.push(negXAxisHelper);
        interactiveObjects.push(negYAxisHelper);
        interactiveObjects.push(negZAxisHelper);

        const point = new THREE.Vector3();
        const dim = 128;
        const turnRate = 2 * Math.PI; // turn rate in angles per second

        this.render = function (renderer) {

            this.quaternion.copy(editorCamera.quaternion).invert();
            this.updateMatrixWorld();

            point.set(0, 0, 1);
            point.applyQuaternion(editorCamera.quaternion);

            if (point.x >= 0) {

                posXAxisHelper.material.opacity = 1;
                negXAxisHelper.material.opacity = 0.5;

            } else {

                posXAxisHelper.material.opacity = 0.5;
                negXAxisHelper.material.opacity = 1;

            }

            if (point.y >= 0) {

                posYAxisHelper.material.opacity = 1;
                negYAxisHelper.material.opacity = 0.5;

            } else {

                posYAxisHelper.material.opacity = 0.5;
                negYAxisHelper.material.opacity = 1;

            }

            if (point.z >= 0) {

                posZAxisHelper.material.opacity = 1;
                negZAxisHelper.material.opacity = 0.5;

            } else {

                posZAxisHelper.material.opacity = 0.5;
                negZAxisHelper.material.opacity = 1;

            }

            //

            const x = dom.offsetWidth - dim;

            renderer.clearDepth();

            renderer.getViewport(vpTemp);
            renderer.setViewport(x, 0, dim, dim);

            renderer.render(this, camera);

            renderer.setViewport(vpTemp.x, vpTemp.y, vpTemp.z, vpTemp.w);

        };

        const targetPosition = new THREE.Vector3();
        const targetQuaternion = new THREE.Quaternion();

        const q1 = new THREE.Quaternion();
        const q2 = new THREE.Quaternion();
        let radius = 0;

        this.handleClick = function (event) {

            if (this.animating === true) return false;

            const rect = dom.getBoundingClientRect();
            const offsetX = rect.left + (dom.offsetWidth - dim);
            const offsetY = rect.top + (dom.offsetHeight - dim);
            mouse.x = ((event.clientX - offsetX) / dim) * 2 - 1;
            mouse.y = -((event.clientY - offsetY) / dim) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(interactiveObjects);

            if (intersects.length > 0) {

                const intersection = intersects[0];
                const object = intersection.object;

                prepareAnimationData(object, this.controls.center);

                this.animating = true;

                return true;

            } else {

                return false;

            }

        };

        this.update = function (delta) {

            const step = delta * turnRate;
            const focusPoint = this.controls.center;

            // animate position by doing a slerp and then scaling the position on the unit sphere

            q1.rotateTowards(q2, step);
            editorCamera.position.set(0, 0, 1).applyQuaternion(q1).multiplyScalar(radius).add(focusPoint);

            // animate orientation

            editorCamera.quaternion.rotateTowards(targetQuaternion, step);

            if (q1.angleTo(q2) === 0) {

                this.animating = false;

            }

        };

        function prepareAnimationData(object, focusPoint) {

            switch (object.userData.type) {

                case 'posX':
                    targetPosition.set(1, 0, 0);
                    targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0));
                    break;

                case 'posY':
                    targetPosition.set(0, 1, 0);
                    targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI * 0.5, 0, 0));
                    break;

                case 'posZ':
                    targetPosition.set(0, 0, 1);
                    targetQuaternion.setFromEuler(new THREE.Euler());
                    break;

                case 'negX':
                    targetPosition.set(-1, 0, 0);
                    targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.5, 0));
                    break;

                case 'negY':
                    targetPosition.set(0, -1, 0);
                    targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
                    break;

                case 'negZ':
                    targetPosition.set(0, 0, -1);
                    targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0));
                    break;

                default:
                    console.error('ViewHelper: Invalid axis.');

            }

            //

            radius = editorCamera.position.distanceTo(focusPoint);
            targetPosition.multiplyScalar(radius).add(focusPoint);

            dummy.position.copy(focusPoint);

            dummy.lookAt(editorCamera.position);
            q1.copy(dummy.quaternion);

            dummy.lookAt(targetPosition);
            q2.copy(dummy.quaternion);

        }

        function getAxisMaterial(color) {

            return new THREE.MeshBasicMaterial({color: color, toneMapped: false});

        }

        function getSpriteMaterial(color, text = null) {

            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;

            const context = canvas.getContext('2d');
            context.beginPath();
            context.arc(32, 32, 16, 0, 2 * Math.PI);
            context.closePath();
            context.fillStyle = color.getStyle();
            context.fill();

            if (text !== null) {

                context.font = '24px Arial';
                context.textAlign = 'center';
                context.fillStyle = '#000000';
                context.fillText(text, 32, 41);

            }

            const texture = new THREE.CanvasTexture(canvas);

            return new THREE.SpriteMaterial({map: texture, toneMapped: false});

        }

    }

}

class ViewHelper extends ViewHelperBase {
    #panel;

    constructor(editorCamera, container) {

        super(editorCamera, container);

        const panel = document.createElement('div');
        Object.assign(panel.style, {
            position: 'absolute',
            right: '0px',
            bottom: '0px',
            height: '128px',
            width: '128px',
        });

        panel.addEventListener('pointerup', (event) => {
            event.stopPropagation();
            this.handleClick(event);
        });

        panel.addEventListener('pointerdown', function (event) {
            event.stopPropagation();
        });

        //  this.#panel = panel;

        container.append(panel);
    }

    /**
     * 设置是否显示
     * @param value
     */
    set showPanel(value) {
        this.#panel.style.visibility = value ? 'visible' : 'hidden';
    }

}