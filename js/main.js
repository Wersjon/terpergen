import * as THREE from "./three.module.js";
import { FirstPersonControls } from "./FirstPersonControls.js";
// import { GLTFLoader } from "./GLTFLoader.js";

let tpg = {
  clock: new THREE.Clock(),
  terrainGenerated: [],
  waterData: {}
}

const _VS = `
uniform float pointMultiplier;
attribute float size;
attribute vec4 colors;
varying vec4 vColor;
varying vec2 vAngle;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition * 0.5;
  gl_PointSize = size * pointMultiplier / gl_Position.w;
  vAngle = vec2(cos(0.0), sin(0.0));
  vColor = colors;
}`;

const _FS = `
uniform sampler2D diffuseTexture;
varying vec4 vColor;
varying vec2 vAngle;
void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColor;
}`;

function generateTerrain(offsetX, offsetY) {
  offsetX *= 32;
  offsetY *= 32;
  return new Promise(resolve => {
    const array = [];

    for (let x = offsetX; x <= 33 + offsetX; x++) {
      for (let y = offsetY; y <= 33 + offsetY; y++) {
        if (!array[(x - offsetX)]) array[(x - offsetX)] = [];
        const terrainHeight = (perlin.get(x / 33 * 8, y / 33 * 8) + 1) * 256 - 192;

        // console.log(perlin.get(x + 256, y + 256));
        const prettyGoodTerrain = terrainHeight * perlin.get(x / 33, y / 33) ^ 2;
        // const terrainTesting = terrainHeight;
        array[(x - offsetX)][(y - offsetY)] = prettyGoodTerrain;
      }
    }

    // console.log(array);
    resolve(array);
  });
}

async function prepareTerrain(x, y) {
  const array = await generateTerrain(x, y);
  createWater(x, y);
  createTerrain(x, y, array);
  tpg.terrainGenerated[x][y] = array;
  setTimeout(workOnTerrain, 2500);
}

function particleGenerator(x, y) {
  const vertices = [];
  const size = [];
  const colors = [];

  const sprite = new THREE.TextureLoader().load('data/fog.png');

  for(let xI = 0; xI < 8; xI++) {
    for(let zI = 0; zI < 8; zI++) {
      const xPos = x * 128 + xI * 16 + Math.random() * 16;
      const yPos = Math.random() * 20 + 10;
      const zPos = y * 128 + zI * 16 + Math.random() * 16;
  
      vertices.push(xPos, yPos, zPos);
      size.push(Math.random() * 40 + 30);
      colors.push(1, 1, 1, 1.25);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
  geometry.setAttribute('colors', new THREE.Float32BufferAttribute(colors, 4));

  const testMaterial = new THREE.ShaderMaterial({
    uniforms: {
      diffuseTexture: {
        value: sprite
      },
      pointMultiplier: {
          value: window.innerHeight / (1.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
      }
    },
    vertexShader: _VS,
    fragmentShader: _FS,
    blending: THREE.NormalBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
  })
  const particles = new THREE.Points(geometry, testMaterial);
  particles.renderOrder = 1;

  tpg.scene.add(particles);
}

function workOnTerrain() {
  let x = Math.round(tpg.camera.position.x / 512);
  let y = Math.round(tpg.camera.position.z / 512);

  for (let xi = -1; xi <= 1; xi++) {
    for (let yi = -1; yi <= 1; yi++) {
      if (!tpg.terrainGenerated[x + xi]) tpg.terrainGenerated[x + xi] = [];

      if (!tpg.terrainGenerated[x + xi][y + yi]) {
        prepareTerrain(x + xi, y + yi);
        return;
      }
    }
  }
  setTimeout(workOnTerrain, 1000);
}

function setLightDefaults(light, lightTarget) {
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 600;

  light.shadow.camera.left = -1000;
  light.shadow.camera.right = 1000;
  light.shadow.camera.top = 1000;
  light.shadow.camera.bottom = -1000;

  light.target = lightTarget;
  light.shadow.bias = -0.005;
}

function setUpLights() {
  const light = new THREE.AmbientLight(0xA7A7FC);
  tpg.scene.add(light);

  tpg.sunLight = new THREE.DirectionalLight(0xFFFFFF, 1, 100);
  tpg.sunLight.position.set(400, 100, 150);
  tpg.scene.add(tpg.sunLight);

  tpg.sunTarget = new THREE.Object3D();
  tpg.scene.add(tpg.sunTarget);

  setLightDefaults(tpg.sunLight, tpg.sunTarget);
}

function createWater(x, y) {
  const waterBox = new THREE.BoxGeometry(128, 1, 128, 128, 0, 128);
  waterBox.translate(x * 128, 0, y * 128);
  const waterMesh = new THREE.Mesh(waterBox, tpg.waterData.material);

  waterMesh.castShadow = false;
  waterMesh.receiveShadow = true;

  tpg.scene.add(waterMesh);
}

function createTerrain(x, y, array) {
  x -= 0.5;
  y -= 0.5;

  const terrain = new THREE.BufferGeometry();
  const verticesArray = [];
  const size = 128;
  const tileCount = 32;
  const tileSize = size;
  const sizeOffset = size / tileCount / (size * 2 / tileCount) / tileCount;
  // THE FUCK IS SIZE OFFSET ?????????????????

  for(let xRow = 1; xRow < 33; xRow++) {
    for(let yRow = 1; yRow < 33; yRow++) {
      const previousX = xRow === 0 ? 0 : xRow - 1;
      const nextX = xRow;
      const previousY = yRow === 0 ? 0 : yRow - 1;
      const nextY = yRow;

      verticesArray.push((xRow / tileCount + x - sizeOffset) * tileSize);
      verticesArray.push(array[previousX][previousY]); // --
      verticesArray.push((yRow / tileCount + y - sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x + sizeOffset) * tileSize);
      verticesArray.push(array[nextX][nextY]); // ++
      verticesArray.push((yRow / tileCount + y + sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x - sizeOffset) * tileSize);
      verticesArray.push(array[previousX][nextY]); // -+
      verticesArray.push((yRow / tileCount + y + sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x - sizeOffset) * tileSize);
      verticesArray.push(array[previousX][previousY]); // --
      verticesArray.push((yRow / tileCount + y - sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x + sizeOffset) * tileSize);
      verticesArray.push(array[nextX][nextY]); // ++
      verticesArray.push((yRow / tileCount + y + sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x + sizeOffset) * tileSize);
      verticesArray.push(array[nextX][previousY]); // +-
      verticesArray.push((yRow / tileCount + y - sizeOffset) * tileSize);
    }
  }
  const vertices = new Float32Array(verticesArray);

  terrain.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  terrain.computeVertexNormals();
  const material = new THREE.MeshPhongMaterial({
    color: 0x404040,
    side: THREE.DoubleSide,
    flatShading: false,
    shininess: 16,
  });
  const terrainBox = new THREE.Mesh(terrain, material);
  terrainBox.castShadow = true;
  terrainBox.receiveShadow = true;
  particleGenerator(x, y);
  tpg.scene.add(terrainBox);
}

function setUpWaterData() {
  tpg.waterData.waterDisplacement = new THREE.TextureLoader().load("data/waterDisplacementMap.png");
  tpg.waterData.waterDisplacement.wrapS = tpg.waterData.waterDisplacement.wrapT = THREE.RepeatWrapping;
  tpg.waterData.waterDisplacement.offset.set(0, 0);
  tpg.waterData.waterDisplacement.repeat.set(32, 32);
  tpg.waterData.material = new THREE.MeshPhongMaterial({
    color: 0x353568,
    displacementMap: tpg.waterData.waterDisplacement,
    displacementScale: 0.5,
    displacementBias: 5,
    flatShading: true,
    transparent: true,
    opacity: 0.75,
    shininess: 25,
    reflectivity: 0.25,
  });
}

function init() {
  tpg.scene = new THREE.Scene();
  tpg.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
  tpg.renderer = new THREE.WebGLRenderer(); // { antialias: true }

  tpg.renderer.shadowMap.enabled = true;
  tpg.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  tpg.scene.fog = new THREE.Fog(0xA7A7FC, 100, 300);
  tpg.scene.background = new THREE.Color(0xA7A7FC);

  setUpLights();
  setUpWaterData();

  let geometry = new THREE.SphereGeometry(12, 32, 32);
  let material = new THREE.MeshBasicMaterial({ color: 0xfffff0, fog: false });
  tpg.sun = new THREE.Mesh(geometry, material);
  tpg.scene.add(tpg.sun);

  tpg.camera.position.set(0, 3, 5);
  tpg.camera.rotation.x = 0;

  document.body.appendChild(tpg.renderer.domElement);

  tpg.renderer.setSize(window.innerWidth, window.innerHeight);

  tpg.renderer.domElement.onclick = function() {
    tpg.renderer.domElement.requestPointerLock();
  };

  tpg.renderer.domElement.requestPointerLock = tpg.renderer.domElement.requestPointerLock || tpg.renderer.domElement.mozRequestPointerLock;
  document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

  tpg.controls = new FirstPersonControls(tpg.camera, tpg.renderer.domElement);
  tpg.controls.lookSpeed = 0.5;
  tpg.controls.movementSpeed = 60;

  renderScene();
  workOnTerrain();
}
init();

function renderScene() {
  requestAnimationFrame(renderScene);
  tpg.controls.update(tpg.clock.getDelta());

  tpg.waterData.waterDisplacement.offset = new THREE.Vector2((new Date().getTime() / 60000) % 2, (new Date().getTime() / 60000) % 2);
  tpg.sun.position.x = tpg.camera.position.x + 275;
  tpg.sun.position.y = tpg.camera.position.y + 65;
  tpg.sun.position.z = tpg.camera.position.z + 100;
  tpg.sunLight.position.set(tpg.camera.position.x + 300, 75, tpg.camera.position.z + 125);
  tpg.sunTarget.position.set(tpg.camera.position.x, 0, tpg.camera.position.z);

  // water effect: [wip]
  /*
  if(tpg.camera.position.y <= 3.75) {
    document.getElementById("waterEffect").style.setProperty("opacity", "1");
    tpg.renderer.domElement.style.setProperty("filter", "blur(10px)");
  }
  else {
    document.getElementById("waterEffect").style.setProperty("opacity", "0");
    tpg.renderer.domElement.style.setProperty("filter", "none");
  }
  */

  tpg.renderer.render(tpg.scene, tpg.camera);
}

window.addEventListener("resize", onWindowResize)

function onWindowResize() {
  tpg.camera.aspect = window.innerWidth / window.innerHeight;
  tpg.camera.updateProjectionMatrix();

  tpg.renderer.setSize(window.innerWidth, window.innerHeight);
}