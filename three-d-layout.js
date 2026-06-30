// three-d-layout.js - Three.js 3D table visualizer & selection controller

let scene, camera, renderer, controls;
let tableGroups = []; // Array of { tableId, group, tableMesh }
let selectedTableId = null;
let onTableSelectCallback = null;
let currentTablesData = [];
let hoverTableMesh = null;
let animationFrameId = null;

// Clean up existing Three.js context if active
function destroyThreeD() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement) {
      renderer.domElement.remove();
    }
  }
  window.removeEventListener('resize', onWindowResize);
  // Remove event listeners
  const container = document.getElementById('three-d-canvas-container');
  if (container) {
    // Remove any leftover canvas elements to prevent duplicated, blank canvases
    const canvases = container.getElementsByTagName('canvas');
    while (canvases.length > 0) {
      canvases[0].remove();
    }
    
    container.replaceWith(container.cloneNode(true)); // strips event listeners
  }
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  tableGroups = [];
}

// Main initializer
function initThreeD(containerId, onTableSelect) {
  destroyThreeD();
  
  const container = document.getElementById(containerId);
  if (!container) return;

  onTableSelectCallback = onTableSelect;
  selectedTableId = null;

  // 1. Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x240407);
  // Add subtle fog for depth
  scene.fog = new THREE.FogExp2(0x240407, 0.015);

  // 2. Camera setup
  let width = container.clientWidth;
  let height = container.clientHeight;
  if (width === 0 || height === 0) {
    const rect = container.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || 500;
  }

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 14, 16);

  // 3. Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 4. Controls setup
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below floor level
  controls.minDistance = 5;
  controls.maxDistance = 35;
  controls.target.set(0, 0, 1);

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(10, 18, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Subtle floor grid helper
  const gridHelper = new THREE.GridHelper(30, 30, 0x3d3d3d, 0x1d1d1f);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // 6. Draw Floor Zones
  createFloorZones();

  // 7. Event Listeners
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('mousemove', onCanvasMouseMove);

  // 8. Start Animation loop
  animate();
}

function createFloorZones() {
  // Indoor floor (dark wood representation)
  const indoorGeo = new THREE.BoxGeometry(16, 0.2, 10);
  const indoorMat = new THREE.MeshStandardMaterial({ 
    color: 0x221a15, 
    roughness: 0.6,
    metalness: 0.1
  });
  const indoorFloor = new THREE.Mesh(indoorGeo, indoorMat);
  indoorFloor.position.set(0, -0.1, -2);
  indoorFloor.receiveShadow = true;
  scene.add(indoorFloor);

  // Outdoor floor (stone patio representation)
  const outdoorGeo = new THREE.BoxGeometry(16, 0.2, 8);
  const outdoorMat = new THREE.MeshStandardMaterial({ 
    color: 0x3e4249, 
    roughness: 0.8,
    metalness: 0.2
  });
  const outdoorFloor = new THREE.Mesh(outdoorGeo, outdoorMat);
  outdoorFloor.position.set(0, -0.1, 7);
  outdoorFloor.receiveShadow = true;
  scene.add(outdoorFloor);

  // Divider Wall (small raised metal border)
  const dividerGeo = new THREE.BoxGeometry(16, 0.4, 0.4);
  const dividerMat = new THREE.MeshStandardMaterial({ color: 0xe5c185, roughness: 0.3, metalness: 0.8 });
  const divider = new THREE.Mesh(dividerGeo, dividerMat);
  divider.position.set(0, 0.1, 3);
  divider.castShadow = true;
  scene.add(divider);
}

// procedural table generation
function createTableMesh(tableData, isAvailable) {
  const group = new THREE.Group();
  group.position.set(tableData.x, 0, tableData.z);
  
  // Decide base dimensions based on capacity
  let tableWidth = 1.6;
  let tableLength = 1.6;
  let isRound = false;
  let tableHeight = 1.1;

  if (tableData.category === '2-Seater') {
    isRound = true;
    tableWidth = 1.4; // radius
  } else if (tableData.category === '4-Seater') {
    tableWidth = 2.0;
    tableLength = 2.0;
  } else if (tableData.category === 'Family') {
    tableWidth = 3.6;
    tableLength = 2.0;
  } else if (tableData.category === 'VIP') {
    isRound = true;
    tableWidth = 1.8; // radius
  }

  // Create Table Top Mesh
  let topGeo;
  if (isRound) {
    topGeo = new THREE.CylinderGeometry(tableWidth / 2, tableWidth / 2, 0.15, 32);
  } else {
    topGeo = new THREE.BoxGeometry(tableWidth, 0.15, tableLength);
  }

  // Color scheme: available (green overlay), reserved (red overlay), selected (gold overlay)
  let baseColor = 0x5a3e2e; // classic wood
  let emissiveVal = 0x000000;
  
  if (tableData.id === selectedTableId) {
    baseColor = 0xe5c185; // Champagne Gold
    emissiveVal = 0x9e7b45; // Champagne Gold glow
  } else if (!isAvailable) {
    baseColor = 0x6e2c2c; // Reserved Red
  } else {
    baseColor = 0x1f5c3a; // Available Green
  }

  // VIP tables look premium with gold accents
  const topMat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.2,
    metalness: tableData.category === 'VIP' ? 0.7 : 0.2,
    emissive: emissiveVal,
    emissiveIntensity: 0.6
  });

  const tableTop = new THREE.Mesh(topGeo, topMat);
  tableTop.position.y = tableHeight;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableTop.userData = { tableId: tableData.id, isTableTop: true };
  group.add(tableTop);

  // Table Leg(s)
  if (isRound) {
    // Single central pillar pedestal
    const legGeo = new THREE.CylinderGeometry(0.15, 0.3, tableHeight, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.5, metalness: 0.8 });
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.y = tableHeight / 2;
    leg.castShadow = true;
    group.add(leg);
  } else {
    // Four corner legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, tableHeight, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.5, metalness: 0.8 });
    
    const wHalf = tableWidth / 2 - 0.15;
    const lHalf = tableLength / 2 - 0.15;
    const legPositions = [
      [wHalf, lHalf], [-wHalf, lHalf],
      [wHalf, -lHalf], [-wHalf, -lHalf]
    ];
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], tableHeight / 2, pos[1]);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  // Add procedural chairs
  const chairColor = tableData.category === 'VIP' ? 0xe5c185 : 0x2d2d30;
  const chairMat = new THREE.MeshStandardMaterial({ color: chairColor, roughness: 0.7, metalness: 0.1 });
  
  if (tableData.category === '2-Seater') {
    // 2 chairs opposite each other
    addChair(group, 0, 0.7, -1.0, 0, chairMat);
    addChair(group, 0, 0.7, 1.0, Math.PI, chairMat);
  } else if (tableData.category === '4-Seater' || tableData.category === 'VIP') {
    // 4 chairs
    addChair(group, 0, 0.7, -1.3, 0, chairMat);
    addChair(group, 0, 0.7, 1.3, Math.PI, chairMat);
    addChair(group, -1.3, 0.7, 0, -Math.PI / 2, chairMat);
    addChair(group, 1.3, 0.7, 0, Math.PI / 2, chairMat);
  } else if (tableData.category === 'Family') {
    // 8 chairs (3 on each long side, 1 on each end)
    // Long side 1
    addChair(group, -1.1, 0.7, -1.2, 0, chairMat);
    addChair(group, 0, 0.7, -1.2, 0, chairMat);
    addChair(group, 1.1, 0.7, -1.2, 0, chairMat);
    // Long side 2
    addChair(group, -1.1, 0.7, 1.2, Math.PI, chairMat);
    addChair(group, 0, 0.7, 1.2, Math.PI, chairMat);
    addChair(group, 1.1, 0.7, 1.2, Math.PI, chairMat);
    // Ends
    addChair(group, -2.1, 0.7, 0, -Math.PI / 2, chairMat);
    addChair(group, 2.1, 0.7, 0, Math.PI / 2, chairMat);
  }

  // Tag group for easy matching
  group.userData = { tableId: tableData.id };
  return { group, tableTop };
}

function addChair(parentGroup, x, y, z, rotationY, material) {
  const chairGroup = new THREE.Group();
  chairGroup.position.set(x, 0, z);
  chairGroup.rotation.y = rotationY;

  // Seat cushion
  const seatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
  const seat = new THREE.Mesh(seatGeo, material);
  seat.position.y = 0.55;
  seat.castShadow = true;
  chairGroup.add(seat);

  // Back rest
  const backGeo = new THREE.BoxGeometry(0.6, 0.6, 0.1);
  const back = new THREE.Mesh(backGeo, material);
  back.position.set(0, 0.9, -0.25);
  back.castShadow = true;
  chairGroup.add(back);

  // Thin legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x111, metalness: 0.8 });
  const offsets = [
    [0.25, 0.25], [-0.25, 0.25],
    [0.25, -0.25], [-0.25, -0.25]
  ];
  offsets.forEach(offset => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(offset[0], 0.55 / 2, offset[1]);
    leg.castShadow = true;
    chairGroup.add(leg);
  });

  parentGroup.add(chairGroup);
}

// Update loop mapping details from Database
function updateThreeDLayout(date, timeSlot) {
  if (!scene) return;

  // Clear existing table groups from scene
  tableGroups.forEach(item => {
    scene.remove(item.group);
  });
  tableGroups = [];

  // Fetch tables and bookings from DB
  currentTablesData = db.getTableAvailability(date, timeSlot);

  // Draw each table
  currentTablesData.forEach(tableData => {
    const { group, tableTop } = createTableMesh(tableData, tableData.isAvailable);
    scene.add(group);
    tableGroups.push({
      tableId: tableData.id,
      group: group,
      tableMesh: tableTop,
      isAvailable: tableData.isAvailable
    });
  });
  
  console.log(`3D layout updated for date: ${date}, slot: ${timeSlot}`);
}

// Programmatic selection highlight
function setSelectedTable(tableId) {
  selectedTableId = tableId;
  
  // Re-color meshes in scene
  tableGroups.forEach(item => {
    const tableData = currentTablesData.find(t => t.id === item.tableId);
    if (!tableData) return;
    
    let baseColor = 0x5a3e2e;
    let emissiveVal = 0x000000;
    
    if (item.tableId === selectedTableId) {
      baseColor = 0xe5c185;
      emissiveVal = 0x9e7b45;
    } else if (!item.isAvailable) {
      baseColor = 0x6e2c2c;
    } else {
      baseColor = 0x1f5c3a;
    }
    
    item.tableMesh.material.color.setHex(baseColor);
    item.tableMesh.material.emissive.setHex(emissiveVal);
    item.tableMesh.material.needsUpdate = true;
  });
}

// Raycaster details
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let pointerDownX = 0;
let pointerDownY = 0;

function onPointerDown(event) {
  pointerDownX = event.clientX;
  pointerDownY = event.clientY;
}

function onPointerUp(event) {
  if (!renderer || !camera) return;

  // Calculate drag distance
  const distance = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
  
  // Only register as a tap/click if drag is minimal (less than 6 pixels)
  if (distance > 6) return;

  // Calculate mouse position relative to canvas
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Get table meshes (tops)
  const meshesToIntersect = tableGroups.map(item => item.tableMesh);
  const intersects = raycaster.intersectObjects(meshesToIntersect);

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const tableId = clickedMesh.userData.tableId;
    const matchedTable = tableGroups.find(item => item.tableId === tableId);
    
    if (matchedTable && matchedTable.isAvailable) {
      setSelectedTable(tableId);
      if (onTableSelectCallback) {
        onTableSelectCallback(tableId);
      }
      
      // Trigger a subtle click notification sound/feedback
      try {
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(30);
        }
      } catch (e) {}
    } else {
      // Flash error notification if reserved table is clicked
      if (window.showNotification) {
        window.showNotification('This table is already reserved for this slot.', 'error');
      }
    }
  }
}

function onCanvasMouseMove(event) {
  if (!renderer || !camera) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshesToIntersect = tableGroups.map(item => item.tableMesh);
  const intersects = raycaster.intersectObjects(meshesToIntersect);

  // Handle cursor styling and hover effects
  if (intersects.length > 0) {
    const hoveredMesh = intersects[0].object;
    const tableId = hoveredMesh.userData.tableId;
    const matchedTable = tableGroups.find(item => item.tableId === tableId);

    if (matchedTable && matchedTable.isAvailable) {
      renderer.domElement.style.cursor = 'pointer';
      
      // Emphasize hover mesh slightly if it's not the selected one
      if (hoverTableMesh !== hoveredMesh && tableId !== selectedTableId) {
        resetHover();
        hoverTableMesh = hoveredMesh;
        hoveredMesh.material.emissive.setHex(0x1a5935); // subtle hover glow
        hoveredMesh.material.needsUpdate = true;
      }
    } else {
      renderer.domElement.style.cursor = 'not-allowed';
      resetHover();
    }
  } else {
    renderer.domElement.style.cursor = 'default';
    resetHover();
  }
}

function resetHover() {
  if (hoverTableMesh && hoverTableMesh.userData.tableId !== selectedTableId) {
    const tableId = hoverTableMesh.userData.tableId;
    const matchedTable = tableGroups.find(item => item.tableId === tableId);
    let emissiveVal = 0x000000;
    if (hoverTableMesh.userData.tableId === selectedTableId) {
      emissiveVal = 0x9e7b45;
    }
    hoverTableMesh.material.emissive.setHex(emissiveVal);
    hoverTableMesh.material.needsUpdate = true;
    hoverTableMesh = null;
  }
}
function onWindowResize() {
  if (!camera || !renderer) return;
  const container = renderer.domElement.parentElement;
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Animation Tick loop
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) {
    controls.update();
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Global Export
window.threeDLayout = {
  init: initThreeD,
  update: updateThreeDLayout,
  setSelected: setSelectedTable,
  destroy: destroyThreeD,
  
  // Home Page 3D Hero Cloche
  heroScene: null,
  heroRenderer: null,
  heroAnimId: null,
  
  initHero: function(containerId) {
    this.destroyHero();
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const width = container.clientWidth || 350;
    const height = container.clientHeight || 350;
    
    const scene = new THREE.Scene();
    this.heroScene = scene;
    
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 6);
    camera.lookAt(0, 0.2, 0);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    this.heroRenderer = renderer;
    
    // Lighting (Enhanced Studio setup for extreme clarity)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // slight brighter fill
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.1); // Strong key light
    dirLight1.position.set(5, 10, 4);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.bias = -0.0005;
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xd4af37, 0.55); // Warm gold rim light
    dirLight2.position.set(-6, 3, -3);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.0, 5); // top spotlight to make cherry/rim glisten
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);
    
    // Create Cake & Plate Group
    const clocheGroup = new THREE.Group();
    clocheGroup.position.y = 0.2;
    scene.add(clocheGroup);
    
    // 1. Dark Plate Mesh
    const plateGeo = new THREE.CylinderGeometry(1.6, 1.4, 0.08, 32);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.3, metalness: 0.85 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0;
    plate.receiveShadow = true;
    clocheGroup.add(plate);
    
    // 2. Gold Rim Bevel
    const rimGeo = new THREE.TorusGeometry(1.55, 0.05, 12, 48);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.08, metalness: 0.95 });
    const rim = new THREE.Mesh(rimGeo, goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    clocheGroup.add(rim);
    
    // 3. Cute Tier 1: Soft Strawberry Cake Layer (Pink)
    const cakeTier1Geo = new THREE.CylinderGeometry(0.9, 0.95, 0.5, 32);
    const tier1Mat = new THREE.MeshStandardMaterial({ color: 0xffccd5, roughness: 0.65, metalness: 0.0 });
    const tier1 = new THREE.Mesh(cakeTier1Geo, tier1Mat);
    tier1.position.y = 0.25;
    tier1.castShadow = true;
    tier1.receiveShadow = true;
    clocheGroup.add(tier1);
    
    // 4. Cute Tier 2: Whipped Cream layer (White)
    const cakeTier2Geo = new THREE.CylinderGeometry(0.7, 0.72, 0.35, 32);
    const tier2Mat = new THREE.MeshStandardMaterial({ color: 0xfff9f5, roughness: 0.75, metalness: 0.0 });
    const tier2 = new THREE.Mesh(cakeTier2Geo, tier2Mat);
    tier2.position.y = 0.65;
    tier2.castShadow = true;
    tier2.receiveShadow = true;
    clocheGroup.add(tier2);

    // 5. Frosting Dollops: Small cream stars around the base tier rim
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const creamGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
      const cream = new THREE.Mesh(creamGeo, creamMat);
      cream.position.set(Math.cos(angle) * 0.8, 0.5, Math.sin(angle) * 0.8);
      cream.castShadow = true;
      clocheGroup.add(cream);
    }
    
    // 6. Cute Cherries & Strawberries on top
    const cherryMat = new THREE.MeshStandardMaterial({ color: 0xde3163, roughness: 0.05, metalness: 0.1 }); // high gloss
    const cherryGeo = new THREE.SphereGeometry(0.16, 16, 16);
    
    const cherry = new THREE.Mesh(cherryGeo, cherryMat);
    cherry.position.set(0, 0.9, 0);
    cherry.castShadow = true;
    clocheGroup.add(cherry);
    
    // Cherry stem: bent metallic gold wire
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
    const stem = new THREE.Mesh(stemGeo, goldMat);
    stem.position.set(0.06, 1.02, 0.02);
    stem.rotation.z = -Math.PI / 6;
    stem.castShadow = true;
    clocheGroup.add(stem);

    // Strawberries procedurally surrounding cherry
    const strawberryMat = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.3 });
    const strawberryGeo = new THREE.SphereGeometry(0.11, 12, 12);
    
    const strawberryCoords = [
      [0.3, 0.85, 0.1],
      [-0.25, 0.85, 0.25],
      [-0.15, 0.85, -0.3],
      [0.2, 0.85, -0.25]
    ];
    
    strawberryCoords.forEach(coords => {
      const strawberry = new THREE.Mesh(strawberryGeo, strawberryMat);
      strawberry.position.set(coords[0], coords[1], coords[2]);
      strawberry.castShadow = true;
      clocheGroup.add(strawberry);
    });
    
    // Interaction Parallax
    let targetRotX = 0.2;
    let targetRotY = 0;
    
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1; // -1 to 1
      
      targetRotY = x * 0.5;
      targetRotX = 0.2 - y * 0.3;
    };
    
    container.addEventListener('mousemove', onMouseMove);
    
    let time = 0;
    const animateHero = () => {
      this.heroAnimId = requestAnimationFrame(animateHero);
      
      time += 0.015;
      
      // Floating motion
      clocheGroup.position.y = 0.1 + Math.sin(time) * 0.15;
      
      // Spin
      clocheGroup.rotation.y += 0.006;
      
      // Lerp custom mouse rotation
      clocheGroup.rotation.x += (targetRotX - clocheGroup.rotation.x) * 0.05;
      clocheGroup.rotation.y += (targetRotY - clocheGroup.rotation.y) * 0.05;
      
      renderer.render(scene, camera);
    };
    
    animateHero();
    
    // Save resize listener reference to clean up
    this.resizeHero = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.resizeHero);
  },
  
  destroyHero: function() {
    if (this.heroAnimId) {
      cancelAnimationFrame(this.heroAnimId);
      this.heroAnimId = null;
    }
    if (this.heroRenderer) {
      this.heroRenderer.dispose();
      this.heroRenderer.domElement.remove();
      this.heroRenderer = null;
    }
    if (this.resizeHero) {
      window.removeEventListener('resize', this.resizeHero);
    }
    this.heroScene = null;
  }
};
