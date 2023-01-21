import * as THREE from "./three.module.js";

THREE.BufferGeometry.prototype.toIndexed = function () {
  let list = [], vertices = {};
  let _src, attributesKeys, morphKeys;
  let prec = 0, precHalf = 0, length = 0;

  function floor(array, offset) {
    if (array instanceof Float32Array) {
      return Math.floor(array[offset] * prec);
    } else if (array instanceof Float16Array) {
      return Math.floor(array[offset] * precHalf);
    } else {
      return array[offset];
    }
  }

  function createAttribute(src_attribute) {
    const dst_attribute = new THREE.BufferAttribute(new src_attribute.array.constructor(length * src_attribute.itemSize), src_attribute.itemSize);
    const dst_array = dst_attribute.array;
    const src_array = src_attribute.array;

    switch (src_attribute.itemSize) {
      case 1:
        for (let i = 0, l = list.length; i < l; i++) {
          dst_array[i] = src_array[list[i]];
        }
        break;
      case 2:
        for (let i = 0, l = list.length; i < l; i++) {
          const index = list[i] * 2;
          const offset = i * 2;
          dst_array[offset] = src_array[index];
          dst_array[offset + 1] = src_array[index + 1];
        }
        break;
      case 3:
        for (let i = 0, l = list.length; i < l; i++) {
          const index = list[i] * 3;
          const offset = i * 3;
          dst_array[offset] = src_array[index];
          dst_array[offset + 1] = src_array[index + 1];
          dst_array[offset + 2] = src_array[index + 2];
        }
        break;
      case 4:
        for (let i = 0, l = list.length; i < l; i++) {
          const index = list[i] * 4;
          const offset = i * 4;
          dst_array[offset] = src_array[index];
          dst_array[offset + 1] = src_array[index + 1];
          dst_array[offset + 2] = src_array[index + 2];
          dst_array[offset + 3] = src_array[index + 3];
        }
        break;
    }
    return dst_attribute;
  }

  function hashAttribute(attribute, offset) {
    const array = attribute.array;
    switch (attribute.itemSize) {
      case 1:
        return floor(array, offset);
      case 2:
        return floor(array, offset) + '_' + floor(array, offset + 1);
      case 3:
        return floor(array, offset) + '_' + floor(array, offset + 1) + '_' + floor(array, offset + 2);
      case 4:
        return floor(array, offset) + '_' + floor(array, offset + 1) + '_' + floor(array, offset + 2) + '_' + floor(array, offset + 3);
    }
  }

  function store(index, n) {
    let id = '';
    for (let i = 0, l = attributesKeys.length; i < l; i++) {
      const key = attributesKeys[i];
      const attribute = _src.attributes[key];
      const offset = attribute.itemSize * index * 3 + n * attribute.itemSize;
      id += hashAttribute(attribute, offset) + '_';
    }
    for (let i = 0, l = morphKeys.length; i < l; i++) {
      const key = morphKeys[i];
      const attribute = _src.morphAttributes[key];
      const offset = attribute.itemSize * index * 3 + n * attribute.itemSize;
      id += hashAttribute(attribute, offset) + '_';
    }
    if (vertices[id] === undefined) {
      vertices[id] = list.length;
      list.push(index * 3 + n);
    }
    return vertices[id];
  }

  function storeFast(x, y, z, v) {
    const id = Math.floor(x * prec) + '_' + Math.floor(y * prec) + '_' + Math.floor(z * prec);
    if (vertices[id] === undefined) {
      vertices[id] = list.length;
      list.push(v);
    }
    return vertices[id];
  }

  function indexBufferGeometry(src, dst, fullIndex) {
    _src = src;
    attributesKeys = Object.keys(src.attributes);
    morphKeys = Object.keys(src.morphAttributes);
    const position = src.attributes.position.array;
    const faceCount = position.length / 3 / 3;
    const typedArray = faceCount * 3 > 65536 ? Uint32Array : Uint16Array;
    const indexArray = new typedArray(faceCount * 3);
    if (fullIndex) {
      for (let i = 0, l = faceCount; i < l; i++) {
        indexArray[i * 3] = store(i, 0);
        indexArray[i * 3 + 1] = store(i, 1);
        indexArray[i * 3 + 2] = store(i, 2,);
      }
    } else {
      for (let i = 0, l = faceCount; i < l; i++) {
        const offset = i * 9;
        indexArray[i * 3] = storeFast(position[offset], position[offset + 1], position[offset + 2], i * 3);
        indexArray[i * 3 + 1] = storeFast(position[offset + 3], position[offset + 4], position[offset + 5], i * 3 + 1);
        indexArray[i * 3 + 2] = storeFast(position[offset + 6], position[offset + 7], position[offset + 8], i * 3 + 2);
      }
    }
    dst.index = new THREE.BufferAttribute(indexArray, 1);
    length = list.length;
    for (let i = 0, l = attributesKeys.length; i < l; i++) {
      const key = attributesKeys[i];
      dst.attributes[key] = createAttribute(src.attributes[key]);
    }
    for (let i = 0, l = morphKeys.length; i < l; i++) {
      const key = morphKeys[i];
      dst.morphAttributes[key] = createAttribute(src.morphAttributes[key]);
    }
    if (src.boundingSphere) {
      dst.boundingSphere = src.boundingSphere.clone();
    } else {
      dst.boundingSphere = new THREE.Sphere;
      dst.computeBoundingSphere();
    }
    if (src.boundingBox) {
      dst.boundingBox = src.boundingBox.clone();
    } else {
      dst.boundingBox = new THREE.Box3;
      dst.computeBoundingBox();
    }
    // Groups
    const groups = src.groups;
    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      dst.addGroup(group.start, group.count, group.materialIndex);
    }
    vertices = {};
    list = [];
    _src = null;
    attributesKeys = [];
    morphKeys = [];
  }

  return function (fullIndex, precision) {
    precision = precision || 6;
    prec = Math.pow(10, precision);
    precHalf = Math.pow(10, Math.floor(precision / 2));
    const geometry = new THREE.BufferGeometry;
    indexBufferGeometry(this, geometry, fullIndex === undefined ? true : fullIndex);
    return geometry;
  }
}();

let tpg = {
  clock: new THREE.Clock(),
  terrainGenerated: [],
  fogs: [],
  waterData: {},
  heights: [],
}

const _VS = `
uniform float pointMultiplier;
attribute float size;
varying vec4 vColor;
varying vec2 vAngle;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition * 1.0;
  gl_PointSize = size * pointMultiplier / gl_Position.w;
  vAngle = vec2(cos(90.0), sin(90.0));
  vColor = vec4(2, 2, 4, gl_Position.w / 400.0);
  // vColor = vec4(1, 1, 1, gl_Position.w / 256.0);
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

        tpg.heights.push((perlin.get(x / 64, y / 64) * terrainHeight) + 8);
        array[(x - offsetX)][(y - offsetY)] = tpg.heights.at(-1);
      }
    }

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

  const sprite = new THREE.TextureLoader().load('data/old_old.png');

  for (let xI = 0; xI < (Math.random() * 10 % 10); xI++) {
    for (let zI = 0; zI < (Math.random() * 10 % 10); zI++) {
      const xPos = x * 128 + xI * 16 + Math.random() * 16;
      const yPos = Math.random() * 20 + 10;
      const zPos = y * 128 + zI * 16 + Math.random() * 16;

      vertices.push(xPos, yPos, zPos);
      const randSize = Math.random() * 20 + 30;
      size.push(randSize);
      tpg.fogs.push(randSize);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));

  const testMaterial = new THREE.ShaderMaterial({
    uniforms: {
      diffuseTexture: {
        value: sprite
      },
      pointMultiplier: {
        value: window.innerHeight / (Math.tan(0.5 * 60.0 * Math.PI / 180.0))
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
      }
    }
  }
}

function setLightDefaults(light, lightTarget) {
  light.castShadow = true;
  light.shadow.mapSize.width = 4096;
  light.shadow.mapSize.height = 4096;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 600;
  light.shadow.camera.left = -1000;
  light.shadow.camera.right = 1000;
  light.shadow.camera.top = 1000;
  light.shadow.camera.bottom = -1000;

  light.target = lightTarget;
  light.shadow.bias = 0.0005;
}

function setUpLights() {
  const light = new THREE.AmbientLight(0xBBBBFF);
  tpg.scene.add(light);

  tpg.sunLight = new THREE.DirectionalLight(0xFFFFFF, 1, 100);
  tpg.sunLight.position.set(400, 100, 150);
  tpg.scene.add(tpg.sunLight);

  tpg.sunTarget = new THREE.Object3D();
  tpg.scene.add(tpg.sunTarget);

  setLightDefaults(tpg.sunLight, tpg.sunTarget);
}

function createWater(x, y) {
  const waterBox = new THREE.PlaneGeometry(128, 128, 256, 256);
  const waterMesh = new THREE.Mesh(waterBox, tpg.reflectiveMaterial);
  waterMesh.rotation.x = Math.PI * 1.5;
  waterMesh.position.set(x * 128, 0, y * 128);

  waterMesh.castShadow = false;
  waterMesh.receiveShadow = true;

  tpg.scene.add(waterMesh);
}

function minusOne(variable) {
  if (variable > -3 && variable < 1) variable = -Math.sin((variable / 3) * 3) * 2;
  return variable <= 0.99 ? 0.99 : variable;
}

function createTerrain(x, y, array) {
  x -= 0.5;
  y -= 0.5;

  let terrain = new THREE.BufferGeometry();
  const verticesArray = [];
  const size = 128;
  const tileCount = 32;
  const tileSize = size;
  const sizeOffset = size / tileCount / (size * 2 / tileCount) / tileCount;
  // Find a better way to get sizeOffset

  for (let xRow = 1; xRow < 33; xRow++) {
    for (let yRow = 1; yRow < 33; yRow++) {
      const previousX = xRow === 0 ? 0 : xRow - 1;
      const nextX = xRow;
      const previousY = yRow === 0 ? 0 : yRow - 1;
      const nextY = yRow;

      verticesArray.push((xRow / tileCount + x - sizeOffset) * tileSize);
      verticesArray.push(minusOne(array[previousX][previousY])); // --
      verticesArray.push((yRow / tileCount + y - sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x - sizeOffset) * tileSize);
      verticesArray.push(minusOne(array[previousX][nextY])); // -+
      verticesArray.push((yRow / tileCount + y + sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x + sizeOffset) * tileSize);
      verticesArray.push(minusOne(array[nextX][nextY])); // ++
      verticesArray.push((yRow / tileCount + y + sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x - sizeOffset) * tileSize);
      verticesArray.push(minusOne(array[previousX][previousY])); // --
      verticesArray.push((yRow / tileCount + y - sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x + sizeOffset) * tileSize);
      verticesArray.push(minusOne(array[nextX][nextY])); // ++
      verticesArray.push((yRow / tileCount + y + sizeOffset) * tileSize);

      verticesArray.push((xRow / tileCount + x + sizeOffset) * tileSize);
      verticesArray.push(minusOne(array[nextX][previousY])); // +-
      verticesArray.push((yRow / tileCount + y - sizeOffset) * tileSize);
    }
  }

  const vertices = new Float32Array(verticesArray);

  terrain.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  terrain = terrain.toIndexed();
  terrain.computeVertexNormals();
  terrain.computeBoundingBox();

  let max = terrain.boundingBox.max,
    min = terrain.boundingBox.min,
    offset = new THREE.Vector2(min.x, 0),
    range = new THREE.Vector2(max.x - min.x, 64),
    vertices2 = terrain.getAttribute("position"),
    UVs = [];

  for (let i = 0; i < vertices2.count; i++) {
    let x = vertices2.getX(i),
      y = vertices2.getY(i);

    UVs.push(
      (x + offset.x) / range.x, (y + offset.y) / range.y
    );
  }
  terrain.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(UVs), 2));
  terrain.uvsNeedUpdate = true;

  const material = new THREE.MeshPhongMaterial({
    color: 0xFFFFFF,
    flatShading: false,
    map: tpg.waterData.terr,
    reflectivity: 1,
    shininess: 5,
  });
  const terrainBox = new THREE.Mesh(terrain, material);
  terrainBox.castShadow = true;
  terrainBox.receiveShadow = true;
  particleGenerator(x, y);
  tpg.scene.add(terrainBox);
}

function setUpWaterData() {
  tpg.waterData.waterDisplacement = new THREE.TextureLoader().load("data/terrainNormal.png");
  tpg.waterData.waterDisplacement.wrapS = tpg.waterData.waterDisplacement.wrapT = THREE.RepeatWrapping;
  tpg.waterData.waterDisplacement.offset.set(0, 0);
  tpg.waterData.waterDisplacement.repeat.set(2, 2);

  tpg.waterData.waterBump = new THREE.TextureLoader().load("data/mao.jpeg");
  tpg.waterData.waterBump.wrapS = tpg.waterData.waterBump.wrapT = THREE.RepeatWrapping;
  tpg.waterData.waterBump.offset.set(0, 0);
  tpg.waterData.waterBump.repeat.set(32, 32);

  tpg.waterData.terr = new THREE.TextureLoader().load("data/gradient2.png");
  tpg.waterData.terr.offset.set(0, 0);
  tpg.waterData.terr.repeat.set(2, 2);

  tpg.cubeRenderTarget1 = new THREE.WebGLCubeRenderTarget(128, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    encoding: THREE.sRGBEncoding
  });

  tpg.cubeCamera1 = new THREE.CubeCamera(0.1, 300, tpg.cubeRenderTarget1);

  tpg.cubeRenderTarget2 = new THREE.WebGLCubeRenderTarget(128, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    encoding: THREE.sRGBEncoding
  });

  tpg.cubeCamera2 = new THREE.CubeCamera(0.1, 300, tpg.cubeRenderTarget2);

  tpg.reflectiveMaterial = new THREE.MeshPhongMaterial({
    envMap: tpg.cubeRenderTarget2.texture,
    color: 0x353568,
    displacementMap: tpg.waterData.waterBump,
    displacementScale: 0.05,
    displacementBias: 1.2,
    bumpMap: tpg.waterData.waterBump,
    bumpScale: 0.005,
    flatShading: true,
    transparent: true,
    opacity: 0.75,
    reflectivity: 1,
    shininess: 50,
  });
}

const formatNumber = (number) => new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(number);

async function init() {
  tpg.count = 0;
  tpg.scene = new THREE.Scene();
  tpg.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
  tpg.renderer = new THREE.WebGLRenderer({ antialias: true }); // replace me with shader

  tpg.renderer.shadowMap.enabled = true;
  tpg.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  tpg.scene.fog = new THREE.Fog(0xA7A7FC, 25, 300);
  tpg.scene.background = new THREE.Color(0xA7A7FC);

  setUpLights();
  setUpWaterData();

  let geometry = new THREE.SphereGeometry(12, 32, 32);
  let material = new THREE.MeshBasicMaterial({ color: 0xfffff0, fog: false });
  // let material = new THREE.MeshBasicMaterial({ color: 0xFFE473, fog: false });
  geometry.renderOrder = 2;
  tpg.sun = new THREE.Mesh(geometry, material);
  tpg.scene.add(tpg.sun);

  tpg.camera.position.set(4, 50, -190);
  tpg.camera.rotation.set(-3, -0.02, -3.13);

  document.body.appendChild(tpg.renderer.domElement);

  tpg.renderer.setSize(window.innerWidth, window.innerHeight);

  tpg.flashlight = new THREE.SpotLight(0xFFFFFF, 1, 48.0, Math.PI / 4.5, 1.0);
  document.addEventListener("keypress", function (keyPressData) {
    switch (keyPressData.key) {
      case 'h':
      case 'H':
        const geometry = new THREE.BoxGeometry(8, 8, 8, 1, 1, 1);
        const cube = new THREE.Mesh(geometry, tpg.testMaterial);
        cube.position.set(tpg.camera.position.x, tpg.camera.position.y, tpg.camera.position.z);
        tpg.scene.add(cube);
        tpg.flashlight.intensity -= 1;
        break;
    }
  });
  tpg.flashlight.position.set(0, 3, 5);
  // tpg.scene.add(tpg.flashlight);
  tpg.flashlightTarget = new THREE.Object3D();
  tpg.flashlightTarget.position.set(0, 3, 5);
  tpg.scene.add(tpg.flashlightTarget);
  tpg.flashlight.target = tpg.flashlightTarget;

  renderScene();
  await workOnTerrain();
  document.getElementById('avgHeight').innerHTML = formatNumber(tpg.heights.reduce((a, b) => a + b, 0) / tpg.heights.length, 2);
  document.getElementById('maxHeight').innerHTML = formatNumber(tpg.heights.reduce((a, b) => a > b ? a : b, 0));
  document.getElementById('minHeight').innerHTML = formatNumber(tpg.heights.reduce((a, b) => a < b ? a : b, 0));
  const fogSize = tpg.fogs.reduce((a, b) => a + b, 0) / tpg.fogs.length;
  document.getElementById('fogSize').innerHTML = formatNumber(fogSize, 2);
  document.getElementById('fogDensity').innerHTML = formatNumber((tpg.fogs.length * fogSize) / (9 * 128)); // 9 tiles with width and height of 128
}
init();

function renderScene() {
  requestAnimationFrame(renderScene);

  tpg.waterData.waterDisplacement.offset = new THREE.Vector2((new Date().getTime() / 120000) % 2, (new Date().getTime() / 120000) % 2);
  tpg.waterData.waterBump.offset = new THREE.Vector2((new Date().getTime() / 120000) % 2, (new Date().getTime() / 120000) % 2);
  tpg.sun.position.x = tpg.camera.position.x + 275;
  tpg.sun.position.y = tpg.camera.position.y + 65;
  tpg.sun.position.z = tpg.camera.position.z + 100;
  tpg.sunLight.position.set(tpg.camera.position.x + 300, 75, tpg.camera.position.z + 125);
  tpg.sunTarget.position.set(tpg.camera.position.x, 0, tpg.camera.position.z);
  tpg.flashlight.position.set(tpg.camera.position.x, tpg.camera.position.y, tpg.camera.position.z);
  const testVector = new THREE.Vector3(0, 0, 0);
  tpg.camera.getWorldDirection(testVector);
  tpg.flashlightTarget.position.set(tpg.camera.position.x, tpg.camera.position.y, tpg.camera.position.z);
  tpg.flashlightTarget.position.addScaledVector(testVector, 32.0);

  tpg.scene.background = new THREE.Color(0xFFFFFF);
  tpg.cubeCamera1.position.x = tpg.camera.position.x;
  tpg.cubeCamera1.position.y = 3 + -1 * tpg.camera.position.y;
  tpg.cubeCamera1.position.z = tpg.camera.position.z;
  tpg.cubeCamera2.position.x = tpg.camera.position.x;
  tpg.cubeCamera2.position.y = 3 + -1 * tpg.camera.position.y;
  tpg.cubeCamera2.position.z = tpg.camera.position.z;
  if (tpg.count % 2 === 0) {
    tpg.cubeCamera1.update(tpg.renderer, tpg.scene);
    tpg.reflectiveMaterial.envMap = tpg.cubeRenderTarget1.texture;
  } else {
    tpg.cubeCamera2.update(tpg.renderer, tpg.scene);
    tpg.reflectiveMaterial.envMap = tpg.cubeRenderTarget2.texture;
  }
  tpg.scene.background = new THREE.Color(0xA7A7FC);
  tpg.count++;

  tpg.renderer.render(tpg.scene, tpg.camera);
}

window.addEventListener("resize", onWindowResize)

function onWindowResize() {
  tpg.camera.aspect = window.innerWidth / window.innerHeight;
  tpg.camera.updateProjectionMatrix();

  tpg.renderer.setSize(window.innerWidth, window.innerHeight);
}
