/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Nova AI Virtual Human — Advanced Frontend (v5.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * MAJOR FEATURES:
 * - MediaPipe Face Mesh for real-time webcam face tracking
 * - Expression mirroring from user to avatar
 * - Enhanced lip sync with multiple fallback modes
 * - Procedural humanoid avatar with advanced animations
 * - Gesture recognition and body language
 * - Emotion-aware pupil dilation and micro-expressions
 * 
 * v5.0 Improvements:
 * - NEW: Webcam face tracking with MediaPipe Face Mesh
 * - NEW: Real-time expression mirroring (blink, smile, eyebrows)
 * - NEW: Gaze tracking from user's head position
 * - Enhanced lip sync with boundary events + timeline fallback
 * - Better co-articulation blending between visemes
 * - Improved idle micro-movements and body language
 */

// ─── Error overlay helper ────────────────────────────────────────────────
function showError(title, msg) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(20,20,40,.95);color:#fff;padding:24px;border-radius:14px;
        border:2px solid #ff6b6b;max-width:520px;font-family:monospace;z-index:9999;text-align:center`;
    d.innerHTML = `<h3 style="color:#ff6b6b;margin:0 0 10px">${title}</h3>
        <p style="margin:0;line-height:1.5">${msg}</p>
        <button onclick="this.parentElement.remove()" style="margin-top:16px;padding:8px 16px;
        background:#ff6b6b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Close</button>`;
    document.body.appendChild(d);
}

function showNotification(msg, type = 'info') {
    const colors = { info: '#7c6fff', success: '#4ade80', warning: '#fbbf24', error: '#ff6b6b' };
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:20px;right:20px;background:rgba(20,20,40,.95);color:#fff;
        padding:12px 20px;border-radius:10px;border-left:4px solid ${colors[type]};
        font-family:sans-serif;font-size:14px;z-index:9999;animation:slideIn 0.3s ease;max-width:300px`;
    d.innerHTML = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4000);
}

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic imports with error handling
// ═══════════════════════════════════════════════════════════════════════════
let THREE, OrbitControls;
try {
    THREE = await import('three');
} catch (e) {
    showError('Three.js Load Error', `Cannot load Three.js: ${e.message}<br>Check your internet connection.`);
    throw e;
}
try {
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
} catch (e) {
    showError('OrbitControls Error', `Cannot load OrbitControls: ${e.message}`);
    throw e;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — Scene, Camera, Renderer
// ═══════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('avatar-canvas');
if (!canvas) { showError('Missing Canvas', '#avatar-canvas not found'); throw new Error('no canvas'); }

// Get canvas dimensions with fallbacks for when CSS isn't fully applied
function getCanvasDimensions() {
    const parent = canvas.parentElement;
    let width = canvas.clientWidth || parent?.clientWidth || window.innerWidth * 0.7;
    let height = canvas.clientHeight || parent?.clientHeight || window.innerHeight;
    // Ensure minimum dimensions
    width = Math.max(width, 400);
    height = Math.max(height, 300);
    return { width, height };
}

const initialDims = getCanvasDimensions();
console.log('📐 Canvas dimensions:', initialDims.width, 'x', initialDims.height);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, initialDims.width / initialDims.height, 0.1, 1000);
camera.position.set(0, 1.58, 2.8);

// Robust WebGL context — do NOT pre-test the main canvas (that steals the context)
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    } catch (e2) {
        showError('WebGL Error',
            `Could not create WebGL renderer.<br><br>
            <b>Fixes:</b><br>
            1. Go to <b>chrome://settings</b> → System → enable <b>Use hardware acceleration</b><br>
            2. Go to <b>chrome://flags/#enable-webgl</b> → set to Enabled<br>
            3. Update your GPU drivers<br>
            4. Try a different browser`);
        throw e2;
    }
}
renderer.setSize(initialDims.width, initialDims.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;
console.log('✅ WebGL renderer created');

// Delayed resize to fix any initial dimension issues
setTimeout(() => {
    const dims = getCanvasDimensions();
    camera.aspect = dims.width / dims.height;
    camera.updateProjectionMatrix();
    renderer.setSize(dims.width, dims.height);
    console.log('📐 Resized after load:', dims.width, 'x', dims.height);
}, 100);

// Set scene background for debugging (gradient will come from CSS, but this ensures something renders)
scene.background = new THREE.Color(0x08081a);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 1.2;
controls.maxDistance = 4.5;
controls.minPolarAngle = Math.PI / 4;
controls.maxPolarAngle = Math.PI / 1.7;
controls.update();

// ─── Lighting ────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0xffeedd, 0x080820, 0.7));

const keyLight = new THREE.DirectionalLight(0xfff5ee, 2.5);
keyLight.position.set(2.5, 4.5, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.2;
keyLight.shadow.camera.far = 15;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 3;
keyLight.shadow.camera.bottom = -1;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb39ddb, 0.9);
fillLight.position.set(-3.5, 2.5, 0);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xf06292, 0.75);
rimLight.position.set(0.5, 3, -5);
scene.add(rimLight);

const chinFill = new THREE.PointLight(0xfff8e1, 0.35, 4);
chinFill.position.set(0, 0.8, 1.5);
scene.add(chinFill);

const accentSpot = new THREE.SpotLight(0x7c6fff, 0.5, 10, Math.PI / 6, 0.5, 1);
accentSpot.position.set(-2, 5, 2);
accentSpot.target.position.set(0, 1.4, 0);
scene.add(accentSpot, accentSpot.target);

// ─── Environment Map ─────────────────────────────────────────────────────
const envScene = new THREE.Scene();
const envGeo = new THREE.SphereGeometry(50, 32, 32);
const envMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
const tmpC = new THREE.Color();
const eCols = [];
const ePos = envGeo.attributes.position;
for (let i = 0; i < ePos.count; i++) {
    const t = (ePos.getY(i) / 50 + 1) / 2;
    tmpC.setHSL(0.7 - t * 0.15, 0.3, 0.05 + t * 0.15);
    eCols.push(tmpC.r, tmpC.g, tmpC.b);
}
envGeo.setAttribute('color', new THREE.Float32BufferAttribute(eCols, 3));
envScene.add(new THREE.Mesh(envGeo, envMat));
const cubeRT = new THREE.WebGLCubeRenderTarget(256);
const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
cubeCam.update(renderer, envScene);
const envMap = cubeRT.texture;

// ─── Ground ──────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
    new THREE.CircleGeometry(5, 64),
    new THREE.MeshStandardMaterial({ color: 0x08081a, roughness: 0.92, metalness: 0.05, envMap, envMapIntensity: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ─── Particles ───────────────────────────────────────────────────────────
const P_COUNT = 300;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(P_COUNT * 3);
const pCol = new Float32Array(P_COUNT * 3);
const pSpd = new Float32Array(P_COUNT);
for (let i = 0; i < P_COUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 16;
    pPos[i * 3 + 1] = Math.random() * 8;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    tmpC.setHSL(0.7 + (Math.random() - 0.5) * 0.2, 0.5 + Math.random() * 0.4, 0.4 + Math.random() * 0.3);
    pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b;
    pSpd[i] = 0.1 + Math.random() * 0.4;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.025, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, vertexColors: true,
})));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — Advanced Procedural Avatar
// ═══════════════════════════════════════════════════════════════════════════
const avatarGroup = new THREE.Group();
scene.add(avatarGroup);

// Materials
const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe8beac, roughness: 0.5, metalness: 0.02, envMap, envMapIntensity: 0.35,
});
const skinMatDark = new THREE.MeshStandardMaterial({
    color: 0xd4a092, roughness: 0.45, metalness: 0.02, envMap, envMapIntensity: 0.3,
});
const lipMat = new THREE.MeshStandardMaterial({
    color: 0xc4837a, roughness: 0.35, metalness: 0.05, envMap, envMapIntensity: 0.2,
});
const clothMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a3e, roughness: 0.35, metalness: 0.15, envMap, envMapIntensity: 0.2,
});
const hairMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a0a, roughness: 0.7, metalness: 0.1, envMap, envMapIntensity: 0.1,
});
const mouthInsideMat = new THREE.MeshStandardMaterial({
    color: 0x4a1515, roughness: 0.8, side: THREE.DoubleSide,
});
const teethMat = new THREE.MeshStandardMaterial({
    color: 0xf0ece8, roughness: 0.2, metalness: 0.05,
});
const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xc45555, roughness: 0.6, metalness: 0.02,
});

// ─── BODY ────────────────────────────────────────────────────────────────
const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.65, 32), clothMat);
torso.position.set(0, 1.1, 0); torso.castShadow = true;
avatarGroup.add(torso);

const chest = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), clothMat);
chest.position.set(0, 1.42, 0); chest.scale.set(1, 0.5, 0.85); chest.castShadow = true;
avatarGroup.add(chest);

const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.12, 16), skinMat);
neck.position.set(0, 1.53, 0); neck.castShadow = true;
avatarGroup.add(neck);

const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), clothMat);
leftShoulder.position.set(-0.28, 1.38, 0); leftShoulder.castShadow = true;
avatarGroup.add(leftShoulder);

const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), clothMat);
rightShoulder.position.set(0.28, 1.38, 0); rightShoulder.castShadow = true;
avatarGroup.add(rightShoulder);

const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 12), clothMat);
leftArm.position.set(-0.32, 1.1, 0); leftArm.rotation.z = 0.1; leftArm.castShadow = true;
avatarGroup.add(leftArm);

const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 12), clothMat);
rightArm.position.set(0.32, 1.1, 0); rightArm.rotation.z = -0.1; rightArm.castShadow = true;
avatarGroup.add(rightArm);

const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), skinMat);
leftHand.position.set(-0.34, 0.85, 0); leftHand.scale.set(0.8, 1.2, 0.6);
avatarGroup.add(leftHand);

const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), skinMat);
rightHand.position.set(0.34, 0.85, 0); rightHand.scale.set(0.8, 1.2, 0.6);
avatarGroup.add(rightHand);

// ─── HEAD ────────────────────────────────────────────────────────────────
const headGroup = new THREE.Group();
headGroup.position.set(0, 1.64, 0);
avatarGroup.add(headGroup);

const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 48, 48), skinMat);
skull.scale.set(1, 1.1, 0.95); skull.castShadow = true;
headGroup.add(skull);

// Jaw
const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    skinMat
);
jaw.position.set(0, -0.04, 0.04);
jaw.scale.set(1.15, 0.6, 0.85); jaw.castShadow = true;
headGroup.add(jaw);

// Chin — moves with jaw
const chin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), skinMat);
chin.position.set(0, -0.09, 0.1);
headGroup.add(chin);

// Cheeks
const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), skinMat);
leftCheek.position.set(-0.09, -0.02, 0.09); leftCheek.scale.set(1, 0.8, 0.6);
headGroup.add(leftCheek);
const rightCheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), skinMat);
rightCheek.position.set(0.09, -0.02, 0.09); rightCheek.scale.set(1, 0.8, 0.6);
headGroup.add(rightCheek);

// Nose
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 8), skinMatDark);
nose.position.set(0, -0.01, 0.135); nose.rotation.x = -0.2;
headGroup.add(nose);
const noseBridge = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), skinMat);
noseBridge.position.set(0, 0.01, 0.132);
headGroup.add(noseBridge);

// Nasolabial folds
const nlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.04, 6), skinMatDark);
nlLeft.position.set(-0.04, -0.03, 0.12); nlLeft.rotation.z = 0.2;
headGroup.add(nlLeft);
const nlRight = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.04, 6), skinMatDark);
nlRight.position.set(0.04, -0.03, 0.12); nlRight.rotation.z = -0.2;
headGroup.add(nlRight);

// ─── EYES ────────────────────────────────────────────────────────────────
function createEye(x) {
    const g = new THREE.Group();
    g.position.set(x, 0.025, 0.115);
    const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.15, metalness: 0.05 })
    );
    g.add(sclera);
    const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0x3a6b4a, roughness: 0.3, metalness: 0.2 })
    );
    iris.position.z = 0.012;
    g.add(iris);
    const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.3 })
    );
    pupil.position.z = 0.018;
    g.add(pupil);
    g.userData.pupil = pupil;
    const spec = new THREE.Mesh(
        new THREE.SphereGeometry(0.003, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spec.position.set(0.005, 0.005, 0.022);
    g.add(spec);
    return g;
}

const leftEye = createEye(-0.045);
const rightEye = createEye(0.045);
headGroup.add(leftEye, rightEye);

// Eyelids
function createEyelid(x, isUpper) {
    const lid = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3),
        skinMat
    );
    lid.position.set(x, 0.025, 0.115);
    lid.rotation.x = isUpper ? -0.4 : 0.8;
    lid.scale.set(1, isUpper ? 1.2 : 0.8, 1);
    return lid;
}
const leftUpperLid = createEyelid(-0.045, true);
const rightUpperLid = createEyelid(0.045, true);
const leftLowerLid = createEyelid(-0.045, false);
const rightLowerLid = createEyelid(0.045, false);
headGroup.add(leftUpperLid, rightUpperLid, leftLowerLid, rightLowerLid);

// Eyebrows
function createEyebrow(x) {
    const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.006, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.8 })
    );
    brow.position.set(x, 0.055, 0.12);
    brow.rotation.z = x > 0 ? 0.05 : -0.05;
    return brow;
}
const leftBrow = createEyebrow(-0.045);
const rightBrow = createEyebrow(0.045);
headGroup.add(leftBrow, rightBrow);

// ─── MOUTH (enhanced) ───────────────────────────────────────────────────
const mouthGroup = new THREE.Group();
mouthGroup.position.set(0, -0.055, 0.115);
headGroup.add(mouthGroup);

const upperLip = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 12, 24, Math.PI), lipMat);
upperLip.rotation.x = Math.PI;
upperLip.position.y = 0.005;
mouthGroup.add(upperLip);

const lowerLip = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.007, 12, 24, Math.PI), lipMat);
lowerLip.position.y = -0.003;
mouthGroup.add(lowerLip);

const mouthInside = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.025), mouthInsideMat);
mouthInside.position.set(0, 0, -0.005);
mouthInside.visible = false;
mouthGroup.add(mouthInside);

const teethUpper = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.005), teethMat);
teethUpper.position.set(0, 0.004, -0.002);
teethUpper.visible = false;
mouthGroup.add(teethUpper);

const teethLower = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.007, 0.005), teethMat);
teethLower.position.set(0, -0.005, -0.002);
teethLower.visible = false;
mouthGroup.add(teethLower);

// Tongue
const tongue = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    tongueMat
);
tongue.position.set(0, -0.006, -0.003);
tongue.scale.set(1.2, 0.5, 1.4);
tongue.visible = false;
mouthGroup.add(tongue);

// ─── HAIR ────────────────────────────────────────────────────────────────
const hairTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 32, 24, 0, Math.PI * 2, 0, Math.PI / 1.8), hairMat
);
hairTop.position.set(0, 0.03, -0.01); hairTop.scale.set(1.02, 1.05, 1);
headGroup.add(hairTop);

const hairSide1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.12, 8), hairMat);
hairSide1.position.set(-0.12, -0.02, -0.04); hairSide1.rotation.z = 0.3;
headGroup.add(hairSide1);

const hairSide2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.12, 8), hairMat);
hairSide2.position.set(0.12, -0.02, -0.04); hairSide2.rotation.z = -0.3;
headGroup.add(hairSide2);

const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16, 0, Math.PI * 2, Math.PI / 4, Math.PI / 2), hairMat
);
hairBack.position.set(0, 0.01, -0.06); hairBack.rotation.x = 0.3;
headGroup.add(hairBack);

// Ears
function createEar(x) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 12), skinMat);
    ear.position.set(x * 0.14, 0.005, 0);
    ear.scale.set(0.5, 1, 0.7);
    return ear;
}
headGroup.add(createEar(-1), createEar(1));

try { updateStatus('Online'); } catch(e) { /* statusIndicator not ready yet */ }
console.log('🧑 Advanced procedural avatar created (v5.0)');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — Lip Sync & Mouth Animation (improved)
// ═══════════════════════════════════════════════════════════════════════════
const mouth = { open: 0, wide: 0, round: 0, pucker: 0, smile: 0, frown: 0 };
const mouthTarget = { open: 0, wide: 0, round: 0, pucker: 0, smile: 0, frown: 0 };

// Viseme → mouth shape + tongue visibility
const VISEME_TO_MOUTH = {
    'viseme_aa':  { open: 0.75, wide: 0.65, round: 0.1, pucker: 0,    smile: 0,   frown: 0, tongue: 0.3 },
    'viseme_E':   { open: 0.4,  wide: 0.7,  round: 0,   pucker: 0,    smile: 0.2, frown: 0, tongue: 0.2 },
    'viseme_I':   { open: 0.3,  wide: 0.55, round: 0,   pucker: 0,    smile: 0.3, frown: 0, tongue: 0.15 },
    'viseme_O':   { open: 0.65, wide: 0.1,  round: 0.85, pucker: 0.3, smile: 0,   frown: 0, tongue: 0.1 },
    'viseme_U':   { open: 0.3,  wide: 0,    round: 0.65, pucker: 0.65, smile: 0,  frown: 0, tongue: 0 },
    'viseme_PP':  { open: 0.02, wide: 0,    round: 0,   pucker: 0.85, smile: 0,   frown: 0, tongue: 0 },
    'viseme_FF':  { open: 0.08, wide: 0.2,  round: 0,   pucker: 0.4, smile: 0,   frown: 0, tongue: 0 },
    'viseme_TH':  { open: 0.2,  wide: 0.3,  round: 0,   pucker: 0,   smile: 0,   frown: 0, tongue: 0.7 },
    'viseme_DD':  { open: 0.2,  wide: 0.3,  round: 0.1, pucker: 0,   smile: 0,   frown: 0, tongue: 0.5 },
    'viseme_kk':  { open: 0.35, wide: 0.2,  round: 0.1, pucker: 0,   smile: 0,   frown: 0, tongue: 0.4 },
    'viseme_CH':  { open: 0.2,  wide: 0.1,  round: 0.3, pucker: 0.3, smile: 0,   frown: 0, tongue: 0.3 },
    'viseme_SS':  { open: 0.12, wide: 0.45, round: 0,   pucker: 0,   smile: 0.1, frown: 0, tongue: 0.2 },
    'viseme_nn':  { open: 0.08, wide: 0.2,  round: 0,   pucker: 0,   smile: 0,   frown: 0, tongue: 0.5 },
    'viseme_RR':  { open: 0.25, wide: 0.1,  round: 0.4, pucker: 0.2, smile: 0,   frown: 0, tongue: 0.6 },
    'viseme_sil': { open: 0,    wide: 0,    round: 0,   pucker: 0,   smile: 0,   frown: 0, tongue: 0 },
};

let currentTongueTarget = 0, currentTongue = 0;

function setMouthFromViseme(name, intensity = 1.0) {
    const shape = VISEME_TO_MOUTH[name];
    if (!shape) return;
    for (const k in mouthTarget) {
        if (k in shape) mouthTarget[k] = Math.max(mouthTarget[k], shape[k] * intensity);
    }
    if (shape.tongue !== undefined) {
        currentTongueTarget = Math.max(currentTongueTarget, shape.tongue * intensity);
    }
}

function resetMouthTarget() {
    for (const k in mouthTarget) mouthTarget[k] = 0;
    currentTongueTarget = 0;
}

function updateMouthAnimation(delta) {
    const openRate = 1 - Math.exp(-18 * delta);
    const closeRate = 1 - Math.exp(-12 * delta);
    for (const k in mouth) {
        const rate = mouthTarget[k] > mouth[k] ? openRate : closeRate;
        mouth[k] += (mouthTarget[k] - mouth[k]) * rate;
    }
    currentTongue += (currentTongueTarget - currentTongue) * openRate;

    // Jaw drop
    const jawDrop = mouth.open * 0.018;
    jaw.position.y = -0.04 - jawDrop;
    chin.position.y = -0.09 - jawDrop * 1.2;

    // Lip shape
    const lipW = 1 + mouth.wide * 0.3 - mouth.round * 0.2;
    const lipP = 1 + mouth.pucker * 0.15;
    upperLip.scale.set(lipW, 1, lipP);
    lowerLip.scale.set(lipW, 1, lipP);
    lowerLip.position.y = -0.003 - jawDrop * 0.8;
    upperLip.position.y = 0.005;

    // Lip roundness push forward
    const fwd = mouth.round > 0.2 ? mouth.round * 0.006 : 0;
    upperLip.position.z = fwd;
    lowerLip.position.z = fwd;

    // Cheek deformation
    const cheekScale = 1 + mouth.wide * 0.15 - mouth.round * 0.1;
    leftCheek.scale.x = cheekScale;
    rightCheek.scale.x = cheekScale;

    // Mouth interior
    const showInside = mouth.open > 0.12;
    mouthInside.visible = showInside;
    teethUpper.visible = showInside;
    teethLower.visible = showInside;
    tongue.visible = showInside && currentTongue > 0.1;

    if (showInside) {
        mouthInside.scale.set(1 + mouth.wide * 0.3, mouth.open * 1.6, 1);
        teethLower.position.y = -0.005 - jawDrop * 0.5;
        tongue.position.y = -0.006 - jawDrop * 0.3;
        tongue.position.z = -0.003 + currentTongue * 0.01;
        tongue.scale.z = 1.4 + currentTongue * 0.3;
    }

    // Smile / frown
    if (mouth.smile > 0.05) {
        upperLip.rotation.z = mouth.smile * 0.15;
        lowerLip.rotation.z = 0;
    } else if (mouth.frown > 0.05) {
        lowerLip.rotation.z = mouth.frown * 0.1;
        upperLip.rotation.z = 0;
    } else {
        upperLip.rotation.z = 0;
        lowerLip.rotation.z = 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — Eye Gaze, Blink & Pupil
// ═══════════════════════════════════════════════════════════════════════════
let mouseX = 0, mouseY = 0, smoothGazeX = 0, smoothGazeY = 0;
let saccadeTimer = 0, saccadeX = 0, saccadeY = 0;
let blinkAmount = 0, pupilDilation = 1;

// Face tracking overrides (set by MediaPipe face mesh)
let faceTrackGazeX = null, faceTrackGazeY = null;
let faceTrackBlink = null;
let faceTrackSmile = null;
let faceTrackBrowRaise = null;
let faceTrackMouthOpen = null;

canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouseY = -((e.clientY - r.top) / r.height) * 2 + 1;
});
canvas.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });

function updateEyeGaze(delta) {
    // Use face tracking gaze if available, otherwise use mouse
    const targetX = faceTrackGazeX !== null ? faceTrackGazeX : mouseX;
    const targetY = faceTrackGazeY !== null ? faceTrackGazeY : mouseY;
    
    smoothGazeX += (targetX - smoothGazeX) * 0.08;
    smoothGazeY += (targetY - smoothGazeY) * 0.08;
    saccadeTimer -= delta;
    if (saccadeTimer <= 0) {
        saccadeX = (Math.random() - 0.5) * 0.06;
        saccadeY = (Math.random() - 0.5) * 0.04;
        saccadeTimer = 0.8 + Math.random() * 2.5;
    }
    const gx = (smoothGazeX + saccadeX) * 0.01;
    const gy = (smoothGazeY + saccadeY) * 0.008;
    leftEye.rotation.y = gx; leftEye.rotation.x = -gy;
    rightEye.rotation.y = gx; rightEye.rotation.x = -gy;

    headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, (smoothGazeX + saccadeX) * 0.1, 0.025);
    headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, -(smoothGazeY + saccadeY) * 0.05, 0.025);

    // Pupil dilation
    const pScale = 0.8 + pupilDilation * 0.4;
    const lp = leftEye.userData.pupil, rp = rightEye.userData.pupil;
    lp.scale.setScalar(THREE.MathUtils.lerp(lp.scale.x, pScale, 0.03));
    rp.scale.setScalar(THREE.MathUtils.lerp(rp.scale.x, pScale, 0.03));
}

let lastBlinkTime = 0, nextBlinkDelay = 3, blinkTarget = 0;
function updateBlink(time, delta) {
    // Use face tracking blink if available
    if (faceTrackBlink !== null) {
        blinkAmount = THREE.MathUtils.lerp(blinkAmount, faceTrackBlink, 0.3);
    } else {
        // Natural automatic blink cycle
        if (time - lastBlinkTime > nextBlinkDelay) {
            blinkTarget = 1;
            lastBlinkTime = time;
            nextBlinkDelay = 2.5 + Math.random() * 5;
            setTimeout(() => { blinkTarget = 0; }, 120);
        }
        blinkAmount += (blinkTarget - blinkAmount) * (1 - Math.exp(-20 * delta));
    }
    leftUpperLid.rotation.x = -0.4 + blinkAmount * 0.6;
    rightUpperLid.rotation.x = -0.4 + blinkAmount * 0.6;
    leftLowerLid.rotation.x = 0.8 - blinkAmount * 0.3;
    rightLowerLid.rotation.x = 0.8 - blinkAmount * 0.3;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5 — Body Animations
// ═══════════════════════════════════════════════════════════════════════════
function animateIdleBody(time) {
    torso.scale.y = 1 + Math.sin(time * 0.8) * 0.008;
    chest.scale.y = 0.5 + Math.sin(time * 0.8 + 0.2) * 0.005;
    avatarGroup.rotation.y = Math.sin(time * 0.2) * 0.005;
    leftShoulder.position.y = 1.38 + Math.sin(time * 0.8) * 0.002;
    rightShoulder.position.y = 1.38 + Math.sin(time * 0.8 + Math.PI) * 0.002;
    avatarGroup.position.x = Math.sin(time * 0.15) * 0.003;
}

let talkGesturePhase = 0;
function animateTalkingBody(time, delta) {
    talkGesturePhase += delta;
    headGroup.rotation.x += Math.sin(talkGesturePhase * 2.5) * 0.012;
    headGroup.rotation.z = Math.sin(talkGesturePhase * 1.3) * 0.01;
    leftShoulder.position.y = 1.38 + Math.sin(talkGesturePhase * 1.6) * 0.007;
    rightShoulder.position.y = 1.38 + Math.sin(talkGesturePhase * 1.6 + 1.2) * 0.007;
    leftArm.rotation.z = 0.1 + Math.sin(talkGesturePhase * 1.1) * 0.05;
    rightArm.rotation.z = -0.1 + Math.sin(talkGesturePhase * 1.1 + 2) * 0.05;
    leftHand.position.y = 0.85 + Math.sin(talkGesturePhase * 1.1) * 0.018;
    rightHand.position.y = 0.85 + Math.sin(talkGesturePhase * 1.1 + 2) * 0.018;
    torso.rotation.y = Math.sin(talkGesturePhase * 0.8) * 0.012;
    neck.rotation.z = Math.sin(talkGesturePhase * 1.5) * 0.005;
}

// ─── Emotions ────────────────────────────────────────────────────────────
const EMOTIONS = {
    happy:     { smile: 0.7, frown: 0, browUp: 0.1, eyeSquint: 0.15, pupil: 1.2 },
    sad:       { smile: 0, frown: 0.5, browUp: 0.4, eyeSquint: 0.1, pupil: 0.8 },
    surprised: { smile: 0, frown: 0, browUp: 0.6, eyeSquint: -0.2, pupil: 1.4 },
    angry:     { smile: 0, frown: 0.3, browUp: -0.3, eyeSquint: 0.2, pupil: 0.7 },
    neutral:   { smile: 0, frown: 0, browUp: 0, eyeSquint: 0, pupil: 1.0 },
};

let currentEmotion = { ...EMOTIONS.neutral };
let emotionTarget = { ...EMOTIONS.neutral };
let emotionTimeout = null;

function setEmotion(name) {
    emotionTarget = { ...(EMOTIONS[name] || EMOTIONS.neutral) };
    updateEmotionBadge(name);
    if (emotionTimeout) clearTimeout(emotionTimeout);
}

function updateEmotionFace(delta) {
    const rate = 1 - Math.exp(-5 * delta);
    for (const k in currentEmotion) {
        currentEmotion[k] += (emotionTarget[k] - currentEmotion[k]) * rate;
    }
    mouthTarget.smile = Math.max(mouthTarget.smile, currentEmotion.smile * 0.5);
    mouthTarget.frown = Math.max(mouthTarget.frown, currentEmotion.frown * 0.5);
    leftBrow.position.y = 0.055 + currentEmotion.browUp * 0.01;
    rightBrow.position.y = 0.055 + currentEmotion.browUp * 0.01;
    leftBrow.rotation.z = -0.05 + currentEmotion.browUp * 0.1;
    rightBrow.rotation.z = 0.05 - currentEmotion.browUp * 0.1;
    pupilDilation = currentEmotion.pupil || 1;
}

function microExpressions(time) {
    const smile = (Math.sin(time * 0.4) + 1) * 0.03;
    mouthTarget.smile = Math.max(mouthTarget.smile, smile);
    const brow = (Math.sin(time * 0.3 + 1.5) + 1) * 0.003;
    leftBrow.position.y = Math.max(leftBrow.position.y, 0.055 + brow);
    rightBrow.position.y = Math.max(rightBrow.position.y, 0.055 + brow);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6 — Real-Time Lip Sync Engine (v2)
// ═══════════════════════════════════════════════════════════════════════════
// Two modes:
//  A. Real-time: SpeechSynthesis 'boundary' events drive word-level visemes
//  B. Timeline:  server phoneme data (fallback for no boundary events)
//  C. Rhythmic:  basic fallback when neither is available

let lipSyncAnimFrame = null;
let isSpeaking = false;
let currentPhonemes = null;

// Client-side text → viseme lookup
const CHAR_VISEME = {
    'th': 'viseme_TH', 'ch': 'viseme_CH', 'sh': 'viseme_CH',
    'ng': 'viseme_nn', 'wh': 'viseme_U', 'ph': 'viseme_FF',
    'a': 'viseme_aa', 'e': 'viseme_E', 'i': 'viseme_I', 'o': 'viseme_O', 'u': 'viseme_U',
    'b': 'viseme_PP', 'p': 'viseme_PP', 'm': 'viseme_PP',
    'f': 'viseme_FF', 'v': 'viseme_FF',
    't': 'viseme_DD', 'd': 'viseme_DD', 'n': 'viseme_nn', 'l': 'viseme_DD',
    'k': 'viseme_kk', 'g': 'viseme_kk', 'c': 'viseme_kk',
    's': 'viseme_SS', 'z': 'viseme_SS',
    'r': 'viseme_RR', 'j': 'viseme_CH', 'y': 'viseme_CH', 'w': 'viseme_U', 'h': 'viseme_CH',
};

function wordToVisemes(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    const result = [];
    const BASE = 0.065;
    for (let i = 0; i < w.length; i++) {
        const di = i < w.length - 1 ? w.substr(i, 2) : '';
        const vis = CHAR_VISEME[di] || CHAR_VISEME[w[i]];
        if (vis) {
            const isVowel = 'aeiou'.includes(w[i]);
            result.push({
                viseme: vis,
                duration: isVowel ? BASE * 1.3 : BASE * 0.9,
                intensity: isVowel ? 0.85 : 0.55,
            });
            if (CHAR_VISEME[di]) i++;
        }
    }
    return result;
}

let wordVisemeQueue = [];
let wordVisemeStart = 0;

function tickRealtimeLipSync() {
    if (!isSpeaking) return;
    resetMouthTarget();
    if (wordVisemeQueue.length > 0) {
        const elapsed = (performance.now() - wordVisemeStart) / 1000;
        let t = 0;
        for (const v of wordVisemeQueue) {
            if (elapsed >= t && elapsed < t + v.duration) {
                // Bell-curve envelope within each phoneme
                const progress = (elapsed - t) / v.duration;
                const envelope = Math.sin(progress * Math.PI);
                setMouthFromViseme(v.viseme, v.intensity * (0.4 + envelope * 0.6));
                break;
            }
            t += v.duration;
        }
        if (elapsed > t) wordVisemeQueue = [];
    }
    lipSyncAnimFrame = requestAnimationFrame(tickRealtimeLipSync);
}

function startLipSyncFromTimeline(phonemeData) {
    stopLipSync();
    isSpeaking = true;
    currentPhonemes = phonemeData;
    talkGesturePhase = 0;
    const startTime = performance.now();
    function tick() {
        if (!isSpeaking) return;
        const elapsed = (performance.now() - startTime) / 1000;
        resetMouthTarget();
        if (currentPhonemes?.phonemes) {
            for (const ph of currentPhonemes.phonemes) {
                if (elapsed >= ph.time && elapsed < ph.time + ph.duration) {
                    const progress = (elapsed - ph.time) / ph.duration;
                    const envelope = Math.sin(progress * Math.PI);
                    setMouthFromViseme(ph.viseme, (ph.intensity || 0.8) * (0.4 + envelope * 0.6));
                }
                // Co-articulation: blend the next viseme during the last 30%
                if (elapsed >= ph.time + ph.duration * 0.7 && elapsed < ph.time + ph.duration) {
                    const idx = currentPhonemes.phonemes.indexOf(ph) + 1;
                    if (idx < currentPhonemes.phonemes.length) {
                        const next = currentPhonemes.phonemes[idx];
                        const blend = (elapsed - (ph.time + ph.duration * 0.7)) / (ph.duration * 0.3);
                        setMouthFromViseme(next.viseme, (next.intensity || 0.5) * blend * 0.4);
                    }
                }
            }
        }
        lipSyncAnimFrame = requestAnimationFrame(tick);
    }
    tick();
    showSpeakingUI();
}

function startRealtimeLipSync() {
    stopLipSync();
    isSpeaking = true;
    talkGesturePhase = 0;
    wordVisemeQueue = [];
    tickRealtimeLipSync();
    showSpeakingUI();
}

function stopLipSync() {
    isSpeaking = false;
    if (lipSyncAnimFrame) { cancelAnimationFrame(lipSyncAnimFrame); lipSyncAnimFrame = null; }
    resetMouthTarget();
    talkGesturePhase = 0;
    wordVisemeQueue = [];
    hideSpeakingUI();
}

function showSpeakingUI() {
    document.getElementById('waveform-container')?.classList.add('active');
    animateWaveform();
    document.getElementById('avatar-section')?.classList.add('speaking');
}
function hideSpeakingUI() {
    document.getElementById('waveform-container')?.classList.remove('active');
    stopWaveform();
    document.getElementById('avatar-section')?.classList.remove('speaking');
    hideSubtitle();
}

function startLipSyncFallback() {
    stopLipSync();
    isSpeaking = true;
    talkGesturePhase = 0;
    const startTime = performance.now();
    function tick() {
        if (!isSpeaking) return;
        const elapsed = (performance.now() - startTime) / 1000;
        resetMouthTarget();
        const cycle = elapsed * 5.5;
        const syllable = Math.floor(cycle) % 5;
        const progress = cycle - Math.floor(cycle);
        const visemes = ['viseme_aa', 'viseme_E', 'viseme_O', 'viseme_I', 'viseme_U'];
        setMouthFromViseme(visemes[syllable], Math.sin(progress * Math.PI) * 0.7);
        lipSyncAnimFrame = requestAnimationFrame(tick);
    }
    tick();
    showSpeakingUI();
}

// Waveform
let waveformInterval = null;
function animateWaveform() {
    stopWaveform();
    const bars = document.querySelectorAll('.waveform-bar');
    waveformInterval = setInterval(() => {
        bars.forEach((bar, i) => {
            const t = performance.now() / 150;
            bar.style.height = `${4 + Math.abs(Math.sin(t + i * 0.5)) * 24 + Math.random() * 6}px`;
        });
    }, 50);
}
function stopWaveform() {
    if (waveformInterval) { clearInterval(waveformInterval); waveformInterval = null; }
    document.querySelectorAll('.waveform-bar').forEach(b => b.style.height = '4px');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7 — Main Animation Loop
// ═══════════════════════════════════════════════════════════════════════════
const glClock = new THREE.Clock();
let elapsedTime = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(glClock.getDelta(), 0.05);
    elapsedTime += delta;

    updateMouthAnimation(delta);
    updateEyeGaze(delta);
    updateBlink(elapsedTime, delta);
    animateIdleBody(elapsedTime);
    if (isSpeaking) animateTalkingBody(elapsedTime, delta);
    updateEmotionFace(delta);
    if (!isSpeaking) microExpressions(elapsedTime);

    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < P_COUNT; i++) {
        pos[i * 3 + 1] += Math.sin(elapsedTime * pSpd[i] + i) * 0.0004;
        pos[i * 3] += Math.cos(elapsedTime * pSpd[i] * 0.7 + i * 0.3) * 0.0002;
    }
    pGeo.attributes.position.needsUpdate = true;

    camera.position.y = 1.58 + Math.sin(elapsedTime * 0.3) * 0.003;
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const dims = getCanvasDimensions();
    camera.aspect = dims.width / dims.height;
    camera.updateProjectionMatrix();
    renderer.setSize(dims.width, dims.height);
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8 — TTS with Real-Time Boundary Lip Sync
// ═══════════════════════════════════════════════════════════════════════════
const autoSpeakToggle = document.getElementById('auto-speak-toggle');
const voiceSelect = document.getElementById('voice-select');
let voices = [];

function populateVoiceList() {
    voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    const preferred = voices.filter(v =>
        v.name.includes('Google UK English Male') ||
        v.name.includes('David') ||
        (v.name.includes('Male') && v.lang.startsWith('en'))
    );
    voices.sort((a, b) => {
        const ap = preferred.includes(a), bp = preferred.includes(b);
        return ap === bp ? 0 : ap ? -1 : 1;
    });
    voices.forEach(v => {
        const o = document.createElement('option');
        o.textContent = `${v.name} (${v.lang})`;
        o.value = v.name;
        if (v.name.includes('Google UK English Male') || v.name.includes('Microsoft David')) o.selected = true;
        voiceSelect.appendChild(o);
    });
}
populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = populateVoiceList;

function speak(text, phonemeData) {
    return new Promise((resolve) => {
        if (!autoSpeakToggle.checked) { resolve(); return; }
        window.speechSynthesis.cancel();

        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.95;
        utt.pitch = 0.9;
        utt.volume = 1.0;

        const selectedVoice = voices.find(v => v.name === voiceSelect.value) || voices[0];
        if (selectedVoice) utt.voice = selectedVoice;

        showSubtitle(text);

        // Real-time boundary-event lip sync (Chrome fires these per word)
        let usedBoundary = false;

        utt.onboundary = (event) => {
            if (event.name === 'word') {
                usedBoundary = true;
                const charLen = event.charLength || (text.indexOf(' ', event.charIndex) - event.charIndex);
                const word = text.substr(event.charIndex, Math.max(charLen, 1) || 8);
                if (word && word.trim()) {
                    wordVisemeQueue = wordToVisemes(word.trim());
                    wordVisemeStart = performance.now();
                }
            }
        };

        utt.onstart = () => {
            console.log('🔊 Speech started');
            if (phonemeData?.phonemes?.length > 0) {
                startRealtimeLipSync();
                // If no boundary events arrive within 500ms, fall back to timeline
                setTimeout(() => {
                    if (!usedBoundary && isSpeaking) {
                        console.log('⚠️ No boundary events detected, using timeline lip sync');
                        stopLipSync();
                        startLipSyncFromTimeline(phonemeData);
                    }
                }, 500);
            } else {
                startLipSyncFallback();
            }
        };

        utt.onend = () => { console.log('🔇 Speech ended'); stopLipSync(); resolve(); };
        utt.onerror = (e) => { console.error('Speech error:', e.error); stopLipSync(); resolve(); };

        window.speechSynthesis.speak(utt);
    });
}

// Subtitle system
const subtitleOverlay = document.getElementById('subtitle-overlay');
const subtitleText = document.getElementById('subtitle-text');
function showSubtitle(text) {
    if (subtitleText) subtitleText.textContent = text;
    subtitleOverlay?.classList.add('active');
}
function hideSubtitle() { subtitleOverlay?.classList.remove('active'); }

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9 — Voice Input
// ═══════════════════════════════════════════════════════════════════════════
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, isListening = false;
const micButton = document.getElementById('mic-button');

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
        let finalT = '', interimT = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalT += t; else interimT += t;
        }
        if (interimT) chatInput.value = interimT;
        if (finalT) { chatInput.value = finalT; sendMessage(); stopListening(); }
    };
    recognition.onerror = () => stopListening();
    recognition.onend = () => { if (isListening) try { recognition.start(); } catch { stopListening(); } };
    micButton.addEventListener('click', () => isListening ? stopListening() : startListening());
} else {
    micButton.style.display = 'none';
}

function startListening() {
    if (!recognition) return;
    try { recognition.start(); isListening = true; micButton.classList.add('mic-active'); chatInput.placeholder = '🎙️ Listening...'; }
    catch (e) { console.error(e); }
}
function stopListening() {
    if (!recognition) return;
    isListening = false;
    try { recognition.stop(); } catch {}
    micButton.classList.remove('mic-active');
    chatInput.placeholder = 'Type your message...';
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10 — Chat UI
// ═══════════════════════════════════════════════════════════════════════════
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const statusIndicator = document.getElementById('status-indicator');
const emotionBadge = document.getElementById('emotion-badge');
const thinkingIndicator = document.getElementById('thinking-indicator');

let isProcessing = false;
const sessionId = 'session_' + Date.now();

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isProcessing) return;
    if (isListening) stopListening();
    window.speechSynthesis.cancel();
    stopLipSync();

    isProcessing = true;
    sendButton.disabled = true;
    chatInput.value = '';

    addMessage(message, 'user');
    showThinking(true);
    const typingEl = addTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId }),
        });
        const data = await response.json();
        typingEl.remove();
        showThinking(false);

        if (data.error) {
            addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            return;
        }
        addMessage(data.response, 'assistant');
        setEmotion(data.emotion || 'neutral');
        await speak(data.response, data.phonemes);
        emotionTimeout = setTimeout(() => setEmotion('neutral'), 3000);
    } catch (error) {
        typingEl.remove();
        showThinking(false);
        console.error('Chat error:', error);
        addMessage("Sorry, I couldn't connect to the server. Please check if it's running.", 'assistant');
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    const icon = role === 'user' ? '👤' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M2 20c0-3.87 3.13-7 7-7h6c3.87 0 7 3.13 7 7"/></svg>';
    div.innerHTML = `<div class="message-avatar">${icon}</div><div class="message-content"><p>${escapeHtml(text)}</p></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message assistant-message';
    div.innerHTML = `<div class="message-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M2 20c0-3.87 3.13-7 7-7h6c3.87 0 7 3.13 7 7"/></svg></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function showThinking(show) {
    thinkingIndicator?.classList.toggle('active', show);
    if (show) { leftBrow.position.y = 0.062; rightBrow.position.y = 0.062; }
}

function updateStatus(text) {
    const si = typeof statusIndicator !== 'undefined' ? statusIndicator : document.getElementById('status-indicator');
    const el = si?.querySelector('.status-text');
    if (el) el.textContent = text;
}

function updateEmotionBadge(name) {
    const emojis = { happy: '😊', sad: '😢', surprised: '😲', angry: '😠', neutral: '😐' };
    emotionBadge.classList.remove('emotion-happy', 'emotion-sad', 'emotion-surprised', 'emotion-angry');
    if (name !== 'neutral') emotionBadge.classList.add(`emotion-${name}`);
    emotionBadge.textContent = `${emojis[name] || '😐'} ${name}`;
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
chatInput.focus();

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11 — MediaPipe Face Tracking
// ═══════════════════════════════════════════════════════════════════════════
let faceTrackingEnabled = false;
let videoElement = null;
let faceMesh = null;
let faceTrackingActive = false;

// Create video element for webcam preview
function createVideoElement() {
    if (videoElement) return videoElement;
    videoElement = document.createElement('video');
    videoElement.id = 'face-tracking-video';
    videoElement.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; width: 180px; height: 135px;
        border-radius: 12px; border: 2px solid rgba(124, 111, 255, 0.5);
        object-fit: cover; z-index: 100; display: none;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4); transform: scaleX(-1);
    `;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true;
    document.body.appendChild(videoElement);
    return videoElement;
}

// Load MediaPipe Face Mesh dynamically
async function loadFaceMesh() {
    if (faceMesh) return faceMesh;
    
    try {
        // Load MediaPipe scripts
        const loadScript = (src) => new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.crossOrigin = 'anonymous';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        
        // Wait for globals
        await new Promise(r => setTimeout(r, 300));
        
        if (typeof FaceMesh === 'undefined') {
            throw new Error('FaceMesh not loaded');
        }
        
        faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults(onFaceResults);
        
        console.log('✅ MediaPipe Face Mesh loaded');
        return faceMesh;
    } catch (error) {
        console.error('Failed to load MediaPipe:', error);
        showNotification('Face tracking unavailable - MediaPipe failed to load', 'warning');
        return null;
    }
}

// Process face tracking results from MediaPipe
function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        // No face detected - gradually return to defaults
        faceTrackGazeX = null;
        faceTrackGazeY = null;
        faceTrackBlink = null;
        faceTrackSmile = null;
        faceTrackMouthOpen = null;
        faceTrackBrowRaise = null;
        return;
    }
    
    const landmarks = results.multiFaceLandmarks[0];
    
    // ─── Eye blink detection ─────────────────────────────────────────────
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];
    
    const leftEyeOpen = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const rightEyeOpen = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    const avgEyeOpen = (leftEyeOpen + rightEyeOpen) / 2;
    
    // Normalize blink (typical range 0.01-0.05)
    faceTrackBlink = THREE.MathUtils.clamp(1 - (avgEyeOpen - 0.008) / 0.035, 0, 1);
    
    // ─── Gaze direction from nose/head position ──────────────────────────
    const noseTip = landmarks[4];
    faceTrackGazeX = (noseTip.x - 0.5) * -2.5; // Mirror and amplify
    faceTrackGazeY = (noseTip.y - 0.5) * -2;
    
    // ─── Mouth openness ──────────────────────────────────────────────────
    const upperLipCenter = landmarks[13];
    const lowerLipCenter = landmarks[14];
    const mouthOpenAmount = Math.abs(upperLipCenter.y - lowerLipCenter.y);
    
    // Apply to avatar mouth when not speaking
    faceTrackMouthOpen = THREE.MathUtils.clamp((mouthOpenAmount - 0.015) / 0.06, 0, 1);
    if (faceTrackMouthOpen > 0.08 && !isSpeaking) {
        mouthTarget.open = faceTrackMouthOpen * 0.7;
    }
    
    // ─── Smile detection from mouth width ────────────────────────────────
    const leftMouthCorner = landmarks[61];
    const rightMouthCorner = landmarks[291];
    const mouthWidth = Math.abs(rightMouthCorner.x - leftMouthCorner.x);
    
    // Typical mouth width range 0.14-0.24 for smile
    faceTrackSmile = THREE.MathUtils.clamp((mouthWidth - 0.14) / 0.1, 0, 1);
    if (!isSpeaking) {
        mouthTarget.smile = Math.max(mouthTarget.smile, faceTrackSmile * 0.6);
    }
    
    // ─── Eyebrow raise detection ─────────────────────────────────────────
    const leftBrowInner = landmarks[107];
    const rightBrowInner = landmarks[336];
    const leftBrowOuter = landmarks[70];
    const rightBrowOuter = landmarks[300];
    
    const browAvgY = (leftBrowInner.y + rightBrowInner.y + leftBrowOuter.y + rightBrowOuter.y) / 4;
    faceTrackBrowRaise = THREE.MathUtils.clamp((0.28 - browAvgY) / 0.06, -0.5, 1);
    
    if (!isSpeaking) {
        currentEmotion.browUp = THREE.MathUtils.lerp(currentEmotion.browUp, faceTrackBrowRaise * 0.4, 0.1);
    }
}

// Start face tracking with webcam
async function startFaceTracking() {
    if (faceTrackingActive) return;
    
    try {
        createVideoElement();
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' }
        });
        
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';
        
        await videoElement.play();
        
        const fm = await loadFaceMesh();
        if (!fm) {
            stopFaceTracking();
            return;
        }
        
        faceTrackingActive = true;
        faceTrackingEnabled = true;
        
        // Process video frames continuously
        async function processFrame() {
            if (!faceTrackingActive) return;
            
            if (videoElement.readyState >= 2) {
                try {
                    await faceMesh.send({ image: videoElement });
                } catch (e) {
                    console.warn('Face mesh frame error:', e);
                }
            }
            
            requestAnimationFrame(processFrame);
        }
        
        processFrame();
        
        showNotification('Face tracking enabled! Your expressions will mirror onto Nova.', 'success');
        updateFaceTrackButton(true);
        
    } catch (error) {
        console.error('Face tracking error:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Camera access denied. Please allow camera for face tracking.', 'error');
        } else {
            showNotification('Failed to start face tracking: ' + error.message, 'error');
        }
        stopFaceTracking();
    }
}

// Stop face tracking and release camera
function stopFaceTracking() {
    faceTrackingActive = false;
    faceTrackingEnabled = false;
    
    if (videoElement) {
        const stream = videoElement.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
    }
    
    // Reset face tracking values
    faceTrackGazeX = null;
    faceTrackGazeY = null;
    faceTrackBlink = null;
    faceTrackSmile = null;
    faceTrackMouthOpen = null;
    faceTrackBrowRaise = null;
    
    updateFaceTrackButton(false);
}

function toggleFaceTracking() {
    if (faceTrackingActive) {
        stopFaceTracking();
        showNotification('Face tracking disabled', 'info');
    } else {
        startFaceTracking();
    }
}

function updateFaceTrackButton(active) {
    const btn = document.getElementById('face-track-button');
    if (btn) {
        btn.classList.toggle('active', active);
        btn.title = active ? 'Disable Face Tracking' : 'Enable Face Tracking';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12 — Initialize UI Components
// ═══════════════════════════════════════════════════════════════════════════
function initFaceTrackButton() {
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) {
        const btn = document.createElement('button');
        btn.id = 'face-track-button';
        btn.className = 'icon-button';
        btn.title = 'Enable Face Tracking';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="10" r="6"/>
            <circle cx="9.5" cy="9" r="0.5" fill="currentColor"/>
            <circle cx="14.5" cy="9" r="0.5" fill="currentColor"/>
            <path d="M9.5 12.5a3 3 0 0 0 5 0"/>
            <path d="M12 16v2"/>
            <path d="M8 22h8"/>
        </svg>`;
        btn.style.cssText = `
            background: var(--bg-glass, rgba(16,16,36,0.55));
            border: 1px solid var(--border-subtle, rgba(124,111,255,0.12));
            color: var(--text-secondary, #a09bb8);
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
        `;
        btn.addEventListener('click', toggleFaceTracking);
        btn.addEventListener('mouseenter', () => {
            if (!btn.classList.contains('active')) {
                btn.style.background = 'rgba(124,111,255,0.2)';
            }
        });
        btn.addEventListener('mouseleave', () => {
            if (!btn.classList.contains('active')) {
                btn.style.background = 'var(--bg-glass, rgba(16,16,36,0.55))';
            }
        });
        headerControls.insertBefore(btn, headerControls.firstChild);
    }
}

// Add CSS for animations and active states
const faceTrackStyles = document.createElement('style');
faceTrackStyles.textContent = `
    #face-track-button.active {
        background: rgba(124,111,255,0.35) !important;
        border-color: rgba(124,111,255,0.6) !important;
        color: #fff !important;
        box-shadow: 0 0 12px rgba(124,111,255,0.3);
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    #face-tracking-video {
        transition: opacity 0.3s ease;
    }
`;
document.head.appendChild(faceTrackStyles);

// Initialize
initFaceTrackButton();

console.log('🚀 Nova AI Virtual Human (v5.0) initialized');
console.log('   Features: Face Tracking • Real-time Lip Sync • Expression Mirroring • Emotion Detection');
console.log('   Click the face icon (👤) in the header to enable webcam face tracking!');
