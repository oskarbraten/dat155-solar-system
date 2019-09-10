
import MouseLookController from './MouseLookController.js';
import { Renderer, Scene, Node, Mesh, Primitives, BasicMaterial, CubeMapMaterial, PerspectiveCamera, vec3, vec4 } from '../lib/engine/index.js';

// Create a Renderer and append the canvas element to the DOM.
let renderer = new Renderer(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a Scene.
const scene = new Scene();

const basicMaterial1 = new BasicMaterial({
    color: vec4.fromValues(1.0, 0.5, 0.5, 1.0)
});

const basicMaterial2 = new BasicMaterial({
    color: vec4.fromValues(0.5, 1.0, 0.5, 1.0)
});

const basicMaterial3 = new BasicMaterial({
    color: vec4.fromValues(0.5, 0.5, 1.0, 1.0)
});

// Create a box primitive with the helper function create box.
const boxPrimitive1 = Primitives.createBox(basicMaterial1);
const boxPrimitive2 = Primitives.createBox(basicMaterial2);
const boxPrimitive3 = Primitives.createBox(basicMaterial3);

// Create a Mesh representing a cube in the scene.
const cube1 = new Mesh([boxPrimitive1]);
cube1.setTranslation(-2, 0, 0);
scene.add(cube1);

const cube2 = new Mesh([boxPrimitive2]);
cube2.setTranslation(0, 0, 0);
scene.add(cube2);

const cube3 = new Mesh([boxPrimitive3]);
cube3.setTranslation(2, 0, 0);
scene.add(cube3);

// We create a Node representing movement, in order to decouple camera rotation.
// We do this so that the skybox follows the movement, but not the rotation of the camera.
const player = new Node();

let skyBoxMaterial = new CubeMapMaterial({
    map: renderer.loadCubeMap([
        'resources/skybox/right.png',
        'resources/skybox/left.png',
        'resources/skybox/top.png',
        'resources/skybox/bottom.png',
        'resources/skybox/front.png',
        'resources/skybox/back.png'
    ])
});

let skyBoxPrimitive = Primitives.createBox(skyBoxMaterial, true); // Second argument tells the createBox function to invert the faces and normals of the box.

let skyBox = new Mesh([skyBoxPrimitive]);
skyBox.setScale(1500, 1500, 1500);

// Attaching the skybox to the player gives the illusion that it is infinitely far away.
player.add(skyBox);

// We create a PerspectiveCamera with a fovy of 70, aspectRatio, and near and far clipping plane.
const camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.setTranslation(0, 4, 8);
camera.setRotationFromEuler(-30, 0, 0);

player.add(camera);
scene.add(player);

// We need to update some properties in the camera and renderer if the window is resized.
window.addEventListener('resize', () => {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}, false);


// We create a MouseLookController to enable controlling camera pitch and yaw with mouse input.
const mouseLookController = new MouseLookController(camera);

// We attach a click lister to the canvas-element so that we can request a pointer lock.
// https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
const canvas = renderer.domElement;
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

let yaw = 0;
let pitch = 0;
function updateCamRotation(event) {
    // Add mouse movement to the pitch and yaw variables so that we can update the camera rotation in the loop below.
    yaw -= event.movementX * 0.001;
    pitch -= event.movementY * 0.001;
}

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        canvas.addEventListener('mousemove', updateCamRotation, false);
    } else {
        canvas.removeEventListener('mousemove', updateCamRotation, false);
    }
});


let move = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    speed: 0.005
};

window.addEventListener('keydown', (e) => {
    e.preventDefault();
    if (e.code === 'KeyW') {
        move.forward = true;
    } else if (e.code === 'KeyS') {
        move.backward = true;
    } else if (e.code === 'KeyA') {
        move.left = true;
    } else if (e.code === 'KeyD') {
        move.right = true;
    }
});

window.addEventListener('keyup', (e) => {
    e.preventDefault();
    if (e.code === 'KeyW') {
        move.forward = false;
    } else if (e.code === 'KeyS') {
        move.backward = false;
    } else if (e.code === 'KeyA') {
        move.left = false;
    } else if (e.code === 'KeyD') {
        move.right = false;
    }
});

// We create a vec3 to hold the players velocity (this way we avoid allocating a new one every frame).
const velocity = vec3.fromValues(0.0, 0.0, 0.0);
let then = 0;
function loop(now) {

    let delta = now - then;
    then = now;

    const moveSpeed = move.speed * delta;

    // Reduce accumulated velocity by 25% each frame.
    vec3.scale(velocity, velocity, 0.75);
    //vec3.set(velocity, 0.0, 0.0, 0.0); // (Alternatively remove it completely, feels more responsive?)

    if (move.left) {
        velocity[0] -= moveSpeed;
    }

    if (move.right) {
        velocity[0] += moveSpeed;
    }

    if (move.forward) {
        velocity[2] -= moveSpeed;
    }

    if (move.backward) {
        velocity[2] += moveSpeed;
    }

    // Given the accumulated mouse movement this frame, use the mouse look controller to calculate the new rotation of the camera.
    mouseLookController.update(pitch, yaw);

    // Camera rotation is represented as a quaternion.
    // We rotate the velocity vector based the cameras rotation in order to translate along the direction we're looking.
    const translation = vec3.transformQuat(vec3.create(), velocity, camera.rotation);
    player.applyTranslation(...translation);

    // Animate cubes:
    cube1.rotateY(0.002 * delta);
    cube2.rotateX(0.002 * delta);
    cube3.rotation = camera.rotation; // This cube gets the same rotation as the camera.

    // Reset mouse movement accumulator every frame.
    yaw = 0;
    pitch = 0;

    // Update the world matrices of the entire scene graph.
    scene.update();

    // Render the scene.
    renderer.render(scene, camera);

    // Ask the the browser to draw when it's convenient
    window.requestAnimationFrame(loop);

}

window.requestAnimationFrame(loop);