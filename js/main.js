
import * as THREE from "./three.module.js";
import { FirstPersonControls } from "./FirstPersonControls.js";
// import { GLTFLoader } from "./GLTFLoader.js";

let tpg = {
  clock: new THREE.Clock()
}

function setLightDefaults(light, lightTarget)
{
  light.castShadow = true;
  light.shadow.mapSize.width = 4096;
  light.shadow.mapSize.height = 4096;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 1500;
  
  light.shadow.camera.left = -1000;
  light.shadow.camera.right = 1000;
  light.shadow.camera.top = 1000;
  light.shadow.camera.bottom = -1000;

  light.target = lightTarget;
  light.shadow.bias = - 0.011;
}

function setUpLights()
{
  const light = new THREE.AmbientLight(0xAAAAFF);
  tpg.scene.add(light);
  
  tpg.sunLight = new THREE.DirectionalLight(0xFFFFFF, 1, 100);
  tpg.sunLight.position.set(800, 200, 300);
  tpg.scene.add(tpg.sunLight);

  tpg.sunTarget = new THREE.Object3D();
  tpg.scene.add(tpg.sunTarget);

  setLightDefaults(tpg.sunLight, tpg.sunTarget)
  
  tpg.secondaryLight = new THREE.DirectionalLight(0xAAAAFF, 0.25, 100);
  tpg.secondaryLight.position.set(-800, 200, 300);
  tpg.secondaryLight.castShadow = true;
  tpg.scene.add(tpg.secondaryLight);

  tpg.secondaryTarget = new THREE.Object3D();
  tpg.scene.add(tpg.secondaryTarget);

  setLightDefaults(tpg.secondaryLight, tpg.secondaryTarget)
}

function createWater()
{
  const urls = [
    "data/cubemap/left.png", "data/cubemap/right.png",
    "data/cubemap/top.png", "data/cubemap/bottom.png",
    "data/cubemap/back.png", "data/cubemap/front.png",
  ];
  const reflectionCube = new THREE.CubeTextureLoader().load( urls );
  
  const bumpMap = new THREE.TextureLoader().load("data/bumpWater.jpg");
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  tpg.waterDisplacement = new THREE.TextureLoader().load("data/waterDisplacementMap.png");
  tpg.waterDisplacement.wrapS = tpg.waterDisplacement.wrapT = THREE.RepeatWrapping;
  tpg.waterDisplacement.offset.set(0, 0);
  tpg.waterDisplacement.repeat.set(32, 32);
  const material = new THREE.MeshPhongMaterial({color: 0x353568, bumpMap: bumpMap, bumpScale: 0.025, displacementMap: tpg.waterDisplacement, envMap: reflectionCube, displacementScale: 0.75, displacementBias: 5, flatShading: true, transparent: true, opacity: 0.75, shininess: 25, reflectivity: 0.25});

  const geometry = new THREE.BoxGeometry(1024, 1, 1024, 512, 0, 512);
  const waterBox = new THREE.Mesh(geometry, material);

  waterBox.castShadow = false;
  waterBox.receiveShadow = true;
  
  tpg.scene.add(waterBox);
}

function createTerrain(url)
{
  const perlinTexture = new THREE.TextureLoader().load(url);

  const terrain = new THREE.BoxGeometry(1024, 1, 1024, 512, 0, 512);
  const material = new THREE.MeshPhongMaterial({map: perlinTexture, displacementMap: perlinTexture, displacementScale: 150, displacementBias: 0, flatShading: true, shininess: 0});
  const terrainBox = new THREE.Mesh(terrain, material);

  terrainBox.castShadow = true;
  terrainBox.receiveShadow = true;
  
  tpg.scene.add(terrainBox);
}

function init() {
  var canvas = document.createElement("canvas");
  // document.body.appendChild(canvas); // testing

  canvas.width = canvas.height = 256;
  let ctx = canvas.getContext('2d');

  const gridSize = 8;
  const resolution = 64;
  
  let pixelSize = canvas.width / resolution;
  let numPixels = gridSize / resolution;
  
  for (let y = 0; y < gridSize; y += numPixels / gridSize){
    for (let x = 0; x < gridSize; x += numPixels / gridSize){
      let v = parseInt((perlin.get(x, y) + 1) * 256 - 192) + (Math.random() - 0.5) * 16;
      ctx.fillStyle = "rgb(" + v + ","+ v +"," + v + ")";
      ctx.fillRect(
        x / gridSize * canvas.width,
        y / gridSize * canvas.width,
        pixelSize,
        pixelSize
      );
    }
  }
  var url = canvas.toDataURL();

  tpg.scene = new THREE.Scene();
  tpg.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  tpg.renderer = new THREE.WebGLRenderer({antialias: true});

  tpg.renderer.shadowMap.enabled = true;
  tpg.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  tpg.scene.fog = new THREE.Fog(0xAAAAFF, 100, 700);
  tpg.scene.background = new THREE.Color(0xAAAAFF);
  
  setUpLights();
  createWater();
  createTerrain(url);

  let geometry = new THREE.SphereGeometry(12, 32, 32 );
  let material = new THREE.MeshBasicMaterial( {color: 0xfffff0, fog: false} );
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
}
init();

function renderScene() {
  requestAnimationFrame(renderScene);
  tpg.controls.update(tpg.clock.getDelta());

  tpg.waterDisplacement.offset = new THREE.Vector2((new Date().getTime() / 100000)%1, (new Date().getTime() / 100000)%1);
  
  // testing 

  // texture.offset = new THREE.Vector2(tpg.camera.position.x / 100, -tpg.camera.position.z / 100);
  // texture.offset = new THREE.Vector2((tpg.camera.position.x / 50)%1, (-tpg.camera.position.z / 50)%1);

  tpg.sun.position.x = tpg.camera.position.x + 800;
  tpg.sun.position.y = tpg.camera.position.y + 200;
  tpg.sun.position.z = tpg.camera.position.z + 300;
  tpg.sunLight.position.set(tpg.camera.position.x + 800, 200, tpg.camera.position.z + 300);
  tpg.sunTarget.position.set(tpg.camera.position.x, 0, tpg.camera.position.z);
  
  tpg.secondaryLight.position.set(tpg.camera.position.x - 800, 200, tpg.camera.position.z - 300);
  tpg.secondaryTarget.position.set(tpg.camera.position.x, 0, tpg.camera.position.z);

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

  tpg.renderer.setSize( window.innerWidth, window.innerHeight );
}