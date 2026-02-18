/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Nova AI Virtual Human — GLB Avatar with Morph-Target Lip Sync (v7.0)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Uses a pre-made Ready Player Me GLB avatar loaded via GLTFLoader.
 * Lip sync driven entirely through morph-target blend shapes (visemes).
 * Supports ARKit + Oculus Viseme blend shapes, emotion expressions,
 * realistic eye gaze/blink, idle body animation, face tracking.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────
function showError(title, msg) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(10,10,25,.97);color:#fff;padding:28px 32px;border-radius:16px;
        border:2px solid #ff6b6b;max-width:520px;font-family:system-ui,sans-serif;z-index:9999;text-align:center`;
    d.innerHTML = `<h3 style="color:#ff6b6b;margin:0 0 12px;font-size:18px">${title}</h3>
        <p style="margin:0;line-height:1.6;font-size:14px">${msg}</p>
        <button onclick="this.parentElement.remove()" style="margin-top:18px;padding:10px 24px;
        background:#ff6b6b;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">Close</button>`;
    document.body.appendChild(d);
}

function showNotification(msg, type = 'info') {
    const colors = { info: '#7c6fff', success: '#4ade80', warning: '#fbbf24', error: '#ff6b6b' };
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:20px;right:20px;background:rgba(10,10,25,.95);color:#fff;
        padding:14px 22px;border-radius:12px;border-left:4px solid ${colors[type]};
        font-family:system-ui,sans-serif;font-size:14px;z-index:9999;max-width:320px;
        animation:notifSlide 0.3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.4)`;
    d.innerHTML = msg;
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity 0.3s'; setTimeout(() => d.remove(), 300); }, 3500);
}

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic imports
// ═══════════════════════════════════════════════════════════════════════════
let THREE, OrbitControls, GLTFLoader;
try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
} catch (e) {
    showError('Load Error', `Cannot load Three.js modules: ${e.message}`);
    throw e;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — Scene, Camera, Renderer, Lighting
// ═══════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('avatar-canvas');
if (!canvas) { showError('Missing Canvas', '#avatar-canvas not found'); throw new Error('no canvas'); }

function getCanvasDimensions() {
    const parent = canvas.parentElement;
    let w = canvas.clientWidth || parent?.clientWidth || window.innerWidth * 0.65;
    let h = canvas.clientHeight || parent?.clientHeight || window.innerHeight;
    return { width: Math.max(w, 400), height: Math.max(h, 300) };
}

const initDims = getCanvasDimensions();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080818);
scene.fog = new THREE.FogExp2(0x080818, 0.035);

const camera = new THREE.PerspectiveCamera(28, initDims.width / initDims.height, 0.1, 100);
camera.position.set(0, 1.55, 2.6);

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); }
    catch (e2) { showError('WebGL Error', 'Cannot create WebGL renderer.'); throw e2; }
}
renderer.setSize(initDims.width, initDims.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;

setTimeout(() => {
    const d = getCanvasDimensions();
    camera.aspect = d.width / d.height;
    camera.updateProjectionMatrix();
    renderer.setSize(d.width, d.height);
}, 200);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.45, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 0.8;
controls.maxDistance = 5.0;
controls.minPolarAngle = Math.PI / 5;
controls.maxPolarAngle = Math.PI / 1.6;
controls.update();

// ─── Lighting (studio setup) ───────────────────────────────────────────
const ambientLight = new THREE.HemisphereLight(0xffeedd, 0x080820, 0.7);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff0e6, 3.0);
keyLight.position.set(2, 5, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 15;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -1;
keyLight.shadow.bias = -0.0004;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xb0a0f0, 0.9);
fillLight.position.set(-3.5, 2, 1);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xf08090, 0.6);
rimLight.position.set(0.5, 3, -4);
scene.add(rimLight);

const faceLight = new THREE.PointLight(0xfff5ee, 0.6, 5);
faceLight.position.set(0, 1.6, 2.0);
scene.add(faceLight);

const accentSpot = new THREE.SpotLight(0x7c6fff, 0.45, 10, Math.PI / 7, 0.5, 1);
accentSpot.position.set(-2, 5, 2);
accentSpot.target.position.set(0, 1.4, 0);
scene.add(accentSpot, accentSpot.target);

// ─── Ground & Particles ─────────────────────────────────────────────────
const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.MeshStandardMaterial({ color: 0x060612, roughness: 0.95, metalness: 0.02 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Glow ring
const ringGeo = new THREE.RingGeometry(0.4, 0.55, 64);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x7c6fff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
const glowRing = new THREE.Mesh(ringGeo, ringMat);
glowRing.rotation.x = -Math.PI / 2;
glowRing.position.y = 0.005;
scene.add(glowRing);

// Particles
const P_COUNT = 250;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(P_COUNT * 3);
const pCol = new Float32Array(P_COUNT * 3);
const pSpd = new Float32Array(P_COUNT);
const tmpC = new THREE.Color();
for (let i = 0; i < P_COUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 16;
    pPos[i * 3 + 1] = Math.random() * 8;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    tmpC.setHSL(0.68 + (Math.random() - 0.5) * 0.2, 0.5 + Math.random() * 0.3, 0.35 + Math.random() * 0.3);
    pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b;
    pSpd[i] = 0.08 + Math.random() * 0.35;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.02, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, vertexColors: true,
})));

console.log('✅ Scene, lighting, environment ready');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — Load GLB Avatar (Ready Player Me)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Avatar state ────────────────────────────────────────────────────────
let avatarModel = null;          // The loaded GLTF scene
let headMesh = null;             // Primary SkinnedMesh (most morph targets)
let morphDict = null;            // Combined morphTargetDictionary (union of all meshes)
let morphInfluences = null;      // morphTargetInfluences of primary mesh
let allMorphMeshes = [];         // ALL meshes with morph targets (head, teeth, tongue, body...)
let skeleton = null;             // Skeleton for body animation
let headBone = null;             // Head bone reference
let neckBone = null;             // Neck bone reference
let spineBone = null;            // Spine bone reference
let leftArmBone = null;
let rightArmBone = null;
let leftForeArmBone = null;
let rightForeArmBone = null;
let hips = null;
let mixer = null;                // AnimationMixer (if model has animations)
let avatarLoaded = false;

// ─── Loading overlay ────────────────────────────────────────────────────
const loadOverlay = document.createElement('div');
loadOverlay.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:rgba(8,8,24,0.92);z-index:50;transition:opacity 0.5s`;
loadOverlay.innerHTML = `
    <div style="width:48px;height:48px;border:3px solid rgba(124,111,255,0.2);border-top:3px solid #7c6fff;border-radius:50%;animation:spin 1s linear infinite"></div>
    <p style="color:#a09bb8;margin-top:18px;font-family:system-ui;font-size:14px" id="load-status">Loading avatar model...</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
canvas.parentElement.style.position = 'relative';
canvas.parentElement.appendChild(loadOverlay);

function updateLoadStatus(msg) {
    const el = document.getElementById('load-status');
    if (el) el.textContent = msg;
}

// ─── Load the model ──────────────────────────────────────────────────────
const AVATAR_URL = '/models/avatar.glb';

async function loadAvatar() {
    const loader = new GLTFLoader();

    try {
        updateLoadStatus('Loading 3D avatar...');
        console.log('📦 Loading avatar from:', AVATAR_URL);

        const gltf = await loader.loadAsync(AVATAR_URL);
        avatarModel = gltf.scene;

        // ─── Scale & Position ────────────────────────────────────────
        avatarModel.scale.set(1, 1, 1);
        avatarModel.position.set(0, 0, 0);

        // ─── Find ALL morph target meshes ─────────────────────────────
        const morphMeshes = [];
        allMorphMeshes = [];
        avatarModel.traverse((child) => {
            // Enable shadows on all meshes
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Improve materials
                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(mat => {
                        mat.envMapIntensity = 0.4;
                    });
                }
            }

            // Collect ALL meshes with morph targets (head, teeth, tongue, body...)
            if (child.isSkinnedMesh && child.morphTargetDictionary) {
                const count = Object.keys(child.morphTargetDictionary).length;
                morphMeshes.push({ mesh: child, count });
                allMorphMeshes.push(child);
                console.log(`  Found morph mesh: "${child.name}" with ${count} blend shapes`);
                console.log(`    Morphs: ${Object.keys(child.morphTargetDictionary).join(', ')}`);
            }
        });

        // Build COMBINED morph dictionary from ALL meshes
        if (morphMeshes.length > 0) {
            morphMeshes.sort((a, b) => b.count - a.count);
            headMesh = morphMeshes[0].mesh;

            // Union of all morph target names across all meshes
            morphDict = {};
            allMorphMeshes.forEach(mesh => {
                for (const name in mesh.morphTargetDictionary) {
                    if (!(name in morphDict)) morphDict[name] = true;
                }
            });

            morphInfluences = headMesh.morphTargetInfluences;
            console.log('🎭 Primary morph mesh:', headMesh.name);
            console.log('🎭 Total morph meshes:', allMorphMeshes.length);
            console.log('🎭 Combined unique blend shapes:', Object.keys(morphDict).length);
            console.log('   All morphs:', Object.keys(morphDict).join(', '));

            // Detect available morph target types
            detectMorphCapabilities();
        } else {
            console.warn('⚠️ No morph targets found in avatar model');
            showNotification('Avatar loaded but no blend shapes found for lip sync', 'warning');
        }

        // ─── Find skeleton bones ─────────────────────────────────────
        avatarModel.traverse((child) => {
            if (child.isBone) {
                const name = child.name.toLowerCase();
                if (name.includes('head') && !headBone) headBone = child;
                else if (name.includes('neck') && !neckBone) neckBone = child;
                else if (name.includes('spine') && !spineBone) spineBone = child;
                else if (name.includes('hips') && !hips) hips = child;
                else if ((name.includes('leftarm') || name.includes('left_arm') || name.includes('leftupperarm')) && !leftArmBone) leftArmBone = child;
                else if ((name.includes('rightarm') || name.includes('right_arm') || name.includes('rightupperarm')) && !rightArmBone) rightArmBone = child;
                else if ((name.includes('leftforearm') || name.includes('left_forearm')) && !leftForeArmBone) leftForeArmBone = child;
                else if ((name.includes('rightforearm') || name.includes('right_forearm')) && !rightForeArmBone) rightForeArmBone = child;
            }
            if (child.isSkinnedMesh && child.skeleton && !skeleton) {
                skeleton = child.skeleton;
            }
        });

        if (skeleton) {
            console.log('🦴 Skeleton found with', skeleton.bones.length, 'bones');
            console.log('   Bones:', skeleton.bones.map(b => b.name).join(', '));
        }
        if (headBone) console.log('   Head bone:', headBone.name);
        if (neckBone) console.log('   Neck bone:', neckBone.name);

        // ─── Handle animations ───────────────────────────────────────
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(avatarModel);
            console.log(`🎬 ${gltf.animations.length} animation(s) found`);
            // Don't auto-play — we drive animations ourselves
        }

        // ─── Add to scene ────────────────────────────────────────────
        scene.add(avatarModel);
        avatarLoaded = true;

        // ─── Adjust camera based on avatar bounds ────────────────────
        const box = new THREE.Box3().setFromObject(avatarModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.log('📐 Avatar bounds:', size, 'center:', center);

        // Position camera to frame the upper body / head
        const headY = headBone ? headBone.getWorldPosition(new THREE.Vector3()).y : center.y + size.y * 0.3;
        camera.position.set(0, headY, size.y * 1.5 + 1.0);
        controls.target.set(0, headY - 0.08, 0);
        controls.update();

        // ─── Hide loading overlay ────────────────────────────────────
        updateLoadStatus('Avatar loaded!');
        setTimeout(() => {
            loadOverlay.style.opacity = '0';
            setTimeout(() => loadOverlay.remove(), 500);
        }, 300);

        showNotification('3D avatar loaded successfully!', 'success');
        console.log('✅ Avatar loaded and ready');

    } catch (error) {
        console.error('❌ Failed to load avatar:', error);
        updateLoadStatus('Failed to load avatar');
        showError('Avatar Load Error',
            `Could not load the 3D model.<br><br>Error: ${error.message}<br><br>
            Make sure <code>/models/avatar.glb</code> exists in the public folder.`);
        loadOverlay.style.opacity = '0';
        setTimeout(() => loadOverlay.remove(), 500);
    }
}

// ─── Detect morph capabilities ───────────────────────────────────────────
let hasOculusVisemes = false;
let hasARKitMorphs = false;

function detectMorphCapabilities() {
    if (!morphDict) return;
    const keys = Object.keys(morphDict);

    // Check for Oculus Viseme blend shapes
    hasOculusVisemes = keys.some(k => k.startsWith('viseme_'));

    // Check for ARKit blend shapes
    hasARKitMorphs = keys.some(k => k === 'jawOpen' || k === 'mouthSmileLeft');

    console.log('🔍 Morph capabilities:', {
        oculusVisemes: hasOculusVisemes,
        arkitMorphs: hasARKitMorphs,
        totalMorphs: keys.length
    });
}

// Kick off loading
loadAvatar();

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3 — Morph-Target Lip Sync System
// ═══════════════════════════════════════════════════════════════════════════

// ─── Viseme → Morph Target Mapping ──────────────────────────────────────

// For models WITH Oculus Viseme blend shapes (Ready Player Me with ?morphTargets=Oculus+Visemes)
// These map 1:1 — viseme name directly matches morph target name
const OCULUS_VISEMES = [
    'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
    'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
    'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
];

// For models with ARKit blend shapes only (map visemes → multiple ARKit morphs)
const VISEME_TO_ARKIT = {
    'viseme_sil': {},
    'viseme_aa':  { jawOpen: 0.75, mouthFunnel: 0.2 },
    'viseme_E':   { jawOpen: 0.22, mouthSmileLeft: 0.35, mouthSmileRight: 0.35, mouthStretchLeft: 0.25, mouthStretchRight: 0.25 },
    'viseme_I':   { jawOpen: 0.1, mouthSmileLeft: 0.5, mouthSmileRight: 0.5 },
    'viseme_O':   { jawOpen: 0.55, mouthFunnel: 0.65, mouthPucker: 0.3 },
    'viseme_U':   { jawOpen: 0.12, mouthPucker: 0.75, mouthFunnel: 0.45 },
    'viseme_PP':  { mouthClose: 0.85, mouthPressLeft: 0.55, mouthPressRight: 0.55 },
    'viseme_FF':  { jawOpen: 0.06, mouthRollLower: 0.35, mouthUpperUpLeft: 0.2, mouthUpperUpRight: 0.2 },
    'viseme_TH':  { jawOpen: 0.15, tongueOut: 0.55, mouthLowerDownLeft: 0.08, mouthLowerDownRight: 0.08 },
    'viseme_DD':  { jawOpen: 0.18, tongueOut: 0.12, mouthClose: 0.08 },
    'viseme_kk':  { jawOpen: 0.28, mouthFunnel: 0.08, mouthShrugUpper: 0.08 },
    'viseme_CH':  { jawOpen: 0.12, mouthPucker: 0.45, mouthFunnel: 0.2 },
    'viseme_SS':  { jawOpen: 0.06, mouthStretchLeft: 0.3, mouthStretchRight: 0.3, mouthClose: 0.12 },
    'viseme_nn':  { jawOpen: 0.05, mouthClose: 0.12, tongueOut: 0.06 },
    'viseme_RR':  { jawOpen: 0.18, mouthPucker: 0.22, mouthFunnel: 0.12, mouthRollLower: 0.1 },
};

// ─── Morph target blending state ─────────────────────────────────────────
const morphTargetTarget = {};    // target values for this frame

function setMorph(name, value) {
    if (!morphDict || !(name in morphDict)) return;
    morphTargetTarget[name] = Math.max(morphTargetTarget[name] || 0, value);
}

function resetMorphTargets() {
    for (const k in morphTargetTarget) morphTargetTarget[k] = 0;
}

function applyViseme(visemeName, intensity = 1.0) {
    if (!morphDict) return;

    if (hasOculusVisemes && (visemeName in morphDict)) {
        // Direct Oculus Viseme mapping — set it on the combined dict
        setMorph(visemeName, intensity);
    } else if (hasARKitMorphs) {
        // Map through ARKit blend shapes
        const mapping = VISEME_TO_ARKIT[visemeName];
        if (mapping) {
            for (const [morph, weight] of Object.entries(mapping)) {
                setMorph(morph, weight * intensity);
            }
        }
    }
}

// Apply morph targets to ALL meshes (head, teeth, tongue, body)
function updateMorphTargets(delta) {
    if (!morphDict || allMorphMeshes.length === 0) return;

    // Faster rates for crisp lip shapes
    const openRate = 1 - Math.exp(-45 * delta);   // fast open
    const closeRate = 1 - Math.exp(-30 * delta);   // fast close

    // Apply to EVERY mesh that has morph targets
    for (const mesh of allMorphMeshes) {
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;
        if (!dict || !influences) continue;

        for (const name in dict) {
            const idx = dict[name];
            const target = morphTargetTarget[name] || 0;
            const current = influences[idx] || 0;
            const rate = target > current ? openRate : closeRate;
            influences[idx] = current + (target - current) * rate;
            influences[idx] = Math.max(0, Math.min(1, influences[idx]));
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4 — Eye Gaze, Blink & Expressions via Morph Targets
// ═══════════════════════════════════════════════════════════════════════════
let mouseX = 0, mouseY = 0, smoothGazeX = 0, smoothGazeY = 0;
let saccadeTimer = 0, saccadeX = 0, saccadeY = 0;

// Face tracking inputs
let faceTrackGazeX = null, faceTrackGazeY = null;
let faceTrackBlink = null, faceTrackSmile = null;
let faceTrackBrowRaise = null, faceTrackMouthOpen = null;

canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouseY = -((e.clientY - r.top) / r.height) * 2 + 1;
});
canvas.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });

function updateEyeGaze(delta) {
    const targetX = faceTrackGazeX !== null ? faceTrackGazeX : mouseX;
    const targetY = faceTrackGazeY !== null ? faceTrackGazeY : mouseY;

    smoothGazeX += (targetX - smoothGazeX) * 0.08;
    smoothGazeY += (targetY - smoothGazeY) * 0.08;

    saccadeTimer -= delta;
    if (saccadeTimer <= 0) {
        saccadeX = (Math.random() - 0.5) * 0.06;
        saccadeY = (Math.random() - 0.5) * 0.035;
        saccadeTimer = 0.8 + Math.random() * 2.5;
    }

    const gx = smoothGazeX + saccadeX;
    const gy = smoothGazeY + saccadeY;

    // Eye gaze via morph targets (ARKit style)
    if (hasARKitMorphs) {
        const lookRight = Math.max(0, gx);
        const lookLeft = Math.max(0, -gx);
        const lookUp = Math.max(0, gy);
        const lookDown = Math.max(0, -gy);

        setMorph('eyeLookOutLeft', lookLeft * 0.7);
        setMorph('eyeLookInLeft', lookRight * 0.7);
        setMorph('eyeLookOutRight', lookRight * 0.7);
        setMorph('eyeLookInRight', lookLeft * 0.7);
        setMorph('eyeLookUpLeft', lookUp * 0.5);
        setMorph('eyeLookUpRight', lookUp * 0.5);
        setMorph('eyeLookDownLeft', lookDown * 0.5);
        setMorph('eyeLookDownRight', lookDown * 0.5);
    }

    // Head tracking via bones (disable vertical pitch to stop up/down nodding)
    if (headBone) {
        const targetRotY = gx * 0.15;
        headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetRotY, 0.03);
        // Keep head pitch level (no up/down nodding)
        headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, 0, 0.02);
    }
    if (neckBone) {
        neckBone.rotation.y = THREE.MathUtils.lerp(neckBone.rotation.y, gx * 0.08, 0.02);
        // Prevent neck pitch changes to avoid head bobbing
        neckBone.rotation.x = THREE.MathUtils.lerp(neckBone.rotation.x, 0, 0.02);
    }
}

let lastBlinkTime = 0, nextBlinkDelay = 3, blinkTarget = 0, blinkAmount = 0;

function updateBlink(time, delta) {
    if (faceTrackBlink !== null) {
        blinkAmount = THREE.MathUtils.lerp(blinkAmount, faceTrackBlink, 0.3);
    } else {
        if (time - lastBlinkTime > nextBlinkDelay) {
            blinkTarget = 1;
            lastBlinkTime = time;
            nextBlinkDelay = 2.5 + Math.random() * 5;
            setTimeout(() => { blinkTarget = 0; }, 110 + Math.random() * 40);
        }
        blinkAmount += (blinkTarget - blinkAmount) * (1 - Math.exp(-24 * delta));
    }

    setMorph('eyeBlinkLeft', blinkAmount);
    setMorph('eyeBlinkRight', blinkAmount);

    // Subtle eye squint during blink
    if (blinkAmount > 0.5) {
        setMorph('eyeSquintLeft', blinkAmount * 0.3);
        setMorph('eyeSquintRight', blinkAmount * 0.3);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5 — Emotions & Body Idle via Morph + Bones
// ═══════════════════════════════════════════════════════════════════════════
const EMOTIONS = {
    happy: {
        mouthSmileLeft: 0.55, mouthSmileRight: 0.55,
        cheekSquintLeft: 0.25, cheekSquintRight: 0.25,
        eyeSquintLeft: 0.12, eyeSquintRight: 0.12,
    },
    sad: {
        mouthFrownLeft: 0.45, mouthFrownRight: 0.45,
        browInnerUp: 0.35, browDownLeft: 0.1, browDownRight: 0.1,
    },
    surprised: {
        jawOpen: 0.35,
        eyeWideLeft: 0.45, eyeWideRight: 0.45,
        browInnerUp: 0.55, browOuterUpLeft: 0.45, browOuterUpRight: 0.45,
    },
    angry: {
        browDownLeft: 0.5, browDownRight: 0.5,
        mouthFrownLeft: 0.25, mouthFrownRight: 0.25,
        noseSneerLeft: 0.3, noseSneerRight: 0.3,
        jawForward: 0.15,
    },
    neutral: {},
};

let currentEmotion = {};
let emotionTargetMap = {};
let emotionTimeout = null;

function setEmotion(name) {
    emotionTargetMap = { ...(EMOTIONS[name] || EMOTIONS.neutral) };
    updateEmotionBadge(name);
    if (emotionTimeout) clearTimeout(emotionTimeout);
}

function updateEmotionMorphs(delta) {
    const rate = 1 - Math.exp(-5 * delta);
    for (const name in emotionTargetMap) {
        const target = emotionTargetMap[name] || 0;
        currentEmotion[name] = (currentEmotion[name] || 0) + (target - (currentEmotion[name] || 0)) * rate;
        setMorph(name, currentEmotion[name]);
    }
    // Decay old emotion morphs that are no longer targeted
    for (const name in currentEmotion) {
        if (!(name in emotionTargetMap)) {
            currentEmotion[name] *= (1 - rate);
            if (currentEmotion[name] < 0.005) { delete currentEmotion[name]; }
            else setMorph(name, currentEmotion[name]);
        }
    }
}

function microExpressions(time) {
    // Subtle ambient expressions
    const smile = (Math.sin(time * 0.35) + 1) * 0.02;
    setMorph('mouthSmileLeft', smile);
    setMorph('mouthSmileRight', smile);

    const browShift = (Math.sin(time * 0.28 + 1.5) + 1) * 0.015;
    setMorph('browInnerUp', browShift);

    // Subtle cheek puff during breathing
    const cheek = (Math.sin(time * 0.8) + 1) * 0.005;
    setMorph('cheekPuff', cheek);
}

// ─── Idle body animation ────────────────────────────────────────────────
function animateIdleBody(time) {
    if (!avatarLoaded) return;

    // Breathing via spine bone
    if (spineBone) {
        const breath = Math.sin(time * 0.8) * 0.008;
        spineBone.rotation.x = THREE.MathUtils.lerp(spineBone.rotation.x, breath, 0.05);
    }

    // Subtle weight shift
    if (hips) {
        hips.rotation.y = THREE.MathUtils.lerp(hips.rotation.y, Math.sin(time * 0.18) * 0.005, 0.02);
        hips.position.x = THREE.MathUtils.lerp(hips.position.x || 0, Math.sin(time * 0.14) * 0.002, 0.02);
    }

    // Arm sway
    if (leftArmBone) {
        leftArmBone.rotation.z = THREE.MathUtils.lerp(leftArmBone.rotation.z,
            (leftArmBone._baseRotZ || 0) + Math.sin(time * 0.3) * 0.01, 0.03);
    }
    if (rightArmBone) {
        rightArmBone.rotation.z = THREE.MathUtils.lerp(rightArmBone.rotation.z,
            (rightArmBone._baseRotZ || 0) + Math.sin(time * 0.3 + 1.5) * 0.01, 0.03);
    }
}

let talkGesturePhase = 0;
function animateTalkingBody(time, delta) {
    talkGesturePhase += delta;

    // Subtle head tilt while talking (NO up-down nodding)
    if (headBone) {
        // Only very subtle side-tilt, no up/down nod
        headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, Math.sin(talkGesturePhase * 0.8) * 0.008, 0.03);
    }

    // Shoulder movement
    if (leftArmBone) {
        leftArmBone.rotation.z = THREE.MathUtils.lerp(leftArmBone.rotation.z,
            (leftArmBone._baseRotZ || 0) + Math.sin(talkGesturePhase * 1.0) * 0.04, 0.05);
    }
    if (rightArmBone) {
        rightArmBone.rotation.z = THREE.MathUtils.lerp(rightArmBone.rotation.z,
            (rightArmBone._baseRotZ || 0) + Math.sin(talkGesturePhase * 1.0 + 2) * 0.04, 0.05);
    }

    // Forearm gestures
    if (leftForeArmBone) {
        leftForeArmBone.rotation.x = THREE.MathUtils.lerp(leftForeArmBone.rotation.x,
            Math.sin(talkGesturePhase * 1.3) * 0.06, 0.05);
    }
    if (rightForeArmBone) {
        rightForeArmBone.rotation.x = THREE.MathUtils.lerp(rightForeArmBone.rotation.x,
            Math.sin(talkGesturePhase * 1.3 + 2) * 0.06, 0.05);
    }

    // Body sway
    if (spineBone) {
        spineBone.rotation.y = THREE.MathUtils.lerp(spineBone.rotation.y,
            Math.sin(talkGesturePhase * 0.7) * 0.012, 0.03);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6 — Lip Sync Engine
// ═══════════════════════════════════════════════════════════════════════════
let lipSyncAnimFrame = null;
let isSpeaking = false;
let currentPhonemes = null;

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
    const BASE = 0.075;  // longer hold per viseme for clarity
    for (let i = 0; i < w.length; i++) {
        const di = i < w.length - 1 ? w.substr(i, 2) : '';
        const vis = CHAR_VISEME[di] || CHAR_VISEME[w[i]];
        if (vis) {
            const isVowel = 'aeiou'.includes(w[i]);
            result.push({
                viseme: vis,
                duration: isVowel ? BASE * 1.5 : BASE * 0.9,
                intensity: isVowel ? 1.0 : 0.75,  // boosted intensity
            });
            if (CHAR_VISEME[di]) i++;
        }
    }
    return result;
}

let wordVisemeQueue = [];
let wordVisemeStart = 0;

// Lip sync mode: 'none' | 'realtime' | 'timeline' | 'fallback'
let lipSyncMode = 'none';
let lipSyncStartTime = 0;

// Called from the main animation loop — no separate rAF needed
function tickLipSync() {
    if (!isSpeaking) return;

    if (lipSyncMode === 'realtime') {
        // Boundary-event driven: play the current word's viseme queue
        if (wordVisemeQueue.length > 0) {
            const elapsed = (performance.now() - wordVisemeStart) / 1000;
            let t = 0;
            let matched = false;
            for (let vi = 0; vi < wordVisemeQueue.length; vi++) {
                const v = wordVisemeQueue[vi];
                if (elapsed >= t && elapsed < t + v.duration) {
                    const progress = (elapsed - t) / v.duration;
                    const envelope = Math.sin(progress * Math.PI);
                    applyViseme(v.viseme, v.intensity * (0.5 + envelope * 0.5));
                    // Co-articulation: blend into next viseme
                    if (vi + 1 < wordVisemeQueue.length && progress > 0.6) {
                        const next = wordVisemeQueue[vi + 1];
                        const coblend = (progress - 0.6) / 0.4;
                        applyViseme(next.viseme, next.intensity * coblend * 0.4);
                    }
                    matched = true;
                    break;
                }
                t += v.duration;
            }
            if (elapsed > t) wordVisemeQueue = [];
        }

    } else if (lipSyncMode === 'timeline') {
        // Server phoneme timeline
        const elapsed = (performance.now() - lipSyncStartTime) / 1000;

        // Auto-stop when timeline completes (prevents lingering mouth pose)
        if (currentPhonemes?.totalDuration && elapsed > currentPhonemes.totalDuration + 0.15) {
            stopLipSync();
            return;
        }

        if (currentPhonemes?.phonemes) {
            for (let pi = 0; pi < currentPhonemes.phonemes.length; pi++) {
                const ph = currentPhonemes.phonemes[pi];
                if (elapsed >= ph.time && elapsed < ph.time + ph.duration) {
                    const progress = (elapsed - ph.time) / ph.duration;
                    const envelope = Math.sin(progress * Math.PI);
                    applyViseme(ph.viseme, (ph.intensity || 1.0) * (0.5 + envelope * 0.5));
                }
                // Co-articulation into next phoneme
                if (elapsed >= ph.time + ph.duration * 0.7 && elapsed < ph.time + ph.duration) {
                    if (pi + 1 < currentPhonemes.phonemes.length) {
                        const next = currentPhonemes.phonemes[pi + 1];
                        const blend = (elapsed - (ph.time + ph.duration * 0.7)) / (ph.duration * 0.3);
                        applyViseme(next.viseme, (next.intensity || 0.5) * blend * 0.35);
                    }
                }
            }
        }

    } else if (lipSyncMode === 'fallback') {
        // Cyclic vowel sequence fallback
        const elapsed = (performance.now() - lipSyncStartTime) / 1000;
        const cycle = elapsed * 5.0;
        const syllable = Math.floor(cycle) % 5;
        const progress = cycle - Math.floor(cycle);
        const visemes = ['viseme_aa', 'viseme_E', 'viseme_O', 'viseme_I', 'viseme_U'];
        applyViseme(visemes[syllable], Math.sin(progress * Math.PI) * 0.9);
        // Add a subtle jaw component for ARKit
        if (hasARKitMorphs) setMorph('jawOpen', Math.sin(progress * Math.PI) * 0.5);
    }
}

function startLipSyncFromTimeline(phonemeData) {
    stopLipSync();
    isSpeaking = true;
    currentPhonemes = phonemeData;
    lipSyncMode = 'timeline';
    lipSyncStartTime = performance.now();
    talkGesturePhase = 0;
    showSpeakingUI();
}

function startRealtimeLipSync() {
    stopLipSync();
    isSpeaking = true;
    lipSyncMode = 'realtime';
    talkGesturePhase = 0;
    wordVisemeQueue = [];
    showSpeakingUI();
}

function stopLipSync() {
    isSpeaking = false;
    lipSyncMode = 'none';
    if (lipSyncAnimFrame) { cancelAnimationFrame(lipSyncAnimFrame); lipSyncAnimFrame = null; }
    talkGesturePhase = 0;
    wordVisemeQueue = [];
    hideSpeakingUI();
}

function startLipSyncFallback() {
    stopLipSync();
    isSpeaking = true;
    lipSyncMode = 'fallback';
    lipSyncStartTime = performance.now();
    talkGesturePhase = 0;
    showSpeakingUI();
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

    if (avatarLoaded) {
        // Reset targets each frame, then build up from ALL systems
        resetMorphTargets();

        // 1. Lip sync visemes (highest priority for mouth morphs)
        tickLipSync();

        // 2. Emotion morphs
        updateEmotionMorphs(delta);

        // 3. Micro expressions (idle only)
        if (!isSpeaking) microExpressions(elapsedTime);

        // 4. Eye gaze
        updateEyeGaze(delta);

        // 5. Blinking
        updateBlink(elapsedTime, delta);

        // 6. Body animation
        animateIdleBody(elapsedTime);
        if (isSpeaking) animateTalkingBody(elapsedTime, delta);

        // 7. Apply all accumulated morph targets with smoothing
        updateMorphTargets(delta);

        // Update animation mixer
        if (mixer) mixer.update(delta);
    }

    // Particles
    const pp = pGeo.attributes.position.array;
    for (let i = 0; i < P_COUNT; i++) {
        pp[i * 3 + 1] += Math.sin(elapsedTime * pSpd[i] + i) * 0.0003;
        pp[i * 3] += Math.cos(elapsedTime * pSpd[i] * 0.7 + i * 0.3) * 0.00015;
    }
    pGeo.attributes.position.needsUpdate = true;

    glowRing.material.opacity = 0.06 + Math.sin(elapsedTime * 0.5) * 0.02;
    camera.position.y += Math.sin(elapsedTime * 0.25) * 0.0001;

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const d = getCanvasDimensions();
    camera.aspect = d.width / d.height;
    camera.updateProjectionMatrix();
    renderer.setSize(d.width, d.height);
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
    // Prefer female voices to match the female avatar character
    const preferred = voices.filter(v =>
        v.name.includes('Google UK English Female') ||
        v.name.includes('Google US English') ||
        v.name.includes('Microsoft Zira') ||
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Victoria') ||
        (v.name.includes('Female') && v.lang.startsWith('en'))
    );
    voices.sort((a, b) => {
        const ap = preferred.includes(a), bp = preferred.includes(b);
        return ap === bp ? 0 : ap ? -1 : 1;
    });
    let selectedSet = false;
    voices.forEach(v => {
        const o = document.createElement('option');
        o.textContent = `${v.name} (${v.lang})`;
        o.value = v.name;
        if (!selectedSet && preferred.includes(v)) { o.selected = true; selectedSet = true; }
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
        utt.rate = 0.92;
        utt.pitch = 1.12;
        utt.volume = 1.0;

        const selectedVoice = voices.find(v => v.name === voiceSelect.value) || voices[0];
        if (selectedVoice) utt.voice = selectedVoice;

        showSubtitle(text);
        let usedBoundary = false;
        let speechStarted = false;

        // If server-provided phoneme timeline is available we IGNORE browser boundary
        // events (they are unreliable across platforms) and use the timeline instead.
        utt.onboundary = (event) => {
            if (phonemeData?.phonemes?.length) return; // prefer server timeline
            if (event.name === 'word') {
                // Start lip sync on FIRST word boundary — this ensures
                // lips don't move before the voice is actually audible
                if (!usedBoundary) {
                    usedBoundary = true;
                    startRealtimeLipSync();
                }
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
            speechStarted = true;

            // Prefer server phoneme timeline when available — start it exactly when audio starts
            if (phonemeData?.phonemes?.length > 0) {
                startLipSyncFromTimeline(phonemeData);
                usedBoundary = true;
                return;
            }

            // Otherwise wait for boundary events; set fallback if none arrive
            setTimeout(() => {
                if (!usedBoundary && speechStarted) {
                    console.log('⚠️ No boundary events — falling back to timeline lip sync');
                    if (phonemeData?.phonemes?.length > 0) {
                        startLipSyncFromTimeline(phonemeData);
                    } else {
                        startLipSyncFallback();
                    }
                }
            }, 400);
        };

        utt.onend = () => { console.log('🔇 Speech ended'); stopLipSync(); resolve(); };
        utt.onerror = (e) => { console.error('Speech error:', e.error); stopLipSync(); resolve(); };

        window.speechSynthesis.speak(utt);
    });
}

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

updateStatus('Online');

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

        // Notify user if server is using demo / rate-limited responses
        if (data.rateLimited) showNotification('Gemini API rate-limited — using demo responses', 'warning');
        if (data.demo) showNotification('Gemini API key not set — running demo mode', 'warning');

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
    const icon = role === 'user'
        ? '👤'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M2 20c0-3.87 3.13-7 7-7h6c3.87 0 7 3.13 7 7"/></svg>';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML =
        `<div class="message-avatar">${icon}</div>` +
        `<div class="message-content"><p>${escapeHtml(text)}</p><span class="msg-time">${timeStr}</span></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message assistant-message';
    div.innerHTML =
        '<div class="message-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>' +
        '<path d="M2 20c0-3.87 3.13-7 7-7h6c3.87 0 7 3.13 7 7"/></svg></div>' +
        '<div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function showThinking(show) {
    thinkingIndicator?.classList.toggle('active', show);
}

function updateStatus(text) {
    const el = statusIndicator?.querySelector('.status-text');
    if (el) el.textContent = text;
}

function updateEmotionBadge(name) {
    if (!emotionBadge) return;
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

function createVideoElement() {
    if (videoElement) return videoElement;
    videoElement = document.createElement('video');
    videoElement.id = 'face-tracking-video';
    videoElement.style.cssText = `position:fixed;bottom:20px;left:20px;width:180px;height:135px;
        border-radius:12px;border:2px solid rgba(124,111,255,0.5);object-fit:cover;z-index:100;display:none;
        box-shadow:0 4px 20px rgba(0,0,0,0.4);transform:scaleX(-1);`;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = true;
    document.body.appendChild(videoElement);
    return videoElement;
}

async function loadFaceMesh() {
    if (faceMesh) return faceMesh;
    try {
        const loadScript = (src) => new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.crossOrigin = 'anonymous';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await new Promise(r => setTimeout(r, 300));
        if (typeof FaceMesh === 'undefined') throw new Error('FaceMesh not loaded');
        faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMesh.onResults(onFaceResults);
        console.log('✅ MediaPipe Face Mesh loaded');
        return faceMesh;
    } catch (error) {
        console.error('Failed to load MediaPipe:', error);
        showNotification('Face tracking unavailable', 'warning');
        return null;
    }
}

function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        faceTrackGazeX = null; faceTrackGazeY = null;
        faceTrackBlink = null; faceTrackSmile = null;
        faceTrackMouthOpen = null; faceTrackBrowRaise = null;
        return;
    }
    const lm = results.multiFaceLandmarks[0];

    const lEyeOpen = Math.abs(lm[159].y - lm[145].y);
    const rEyeOpen = Math.abs(lm[386].y - lm[374].y);
    faceTrackBlink = THREE.MathUtils.clamp(1 - ((lEyeOpen + rEyeOpen) / 2 - 0.008) / 0.035, 0, 1);

    faceTrackGazeX = (lm[4].x - 0.5) * -2.5;
    faceTrackGazeY = (lm[4].y - 0.5) * -2;

    const mouthOpenAmt = Math.abs(lm[13].y - lm[14].y);
    faceTrackMouthOpen = THREE.MathUtils.clamp((mouthOpenAmt - 0.015) / 0.06, 0, 1);
    if (faceTrackMouthOpen > 0.08 && !isSpeaking) {
        if (hasOculusVisemes) setMorph('viseme_aa', faceTrackMouthOpen * 0.7);
        else if (hasARKitMorphs) setMorph('jawOpen', faceTrackMouthOpen * 0.7);
    }

    const mouthWidth = Math.abs(lm[291].x - lm[61].x);
    faceTrackSmile = THREE.MathUtils.clamp((mouthWidth - 0.14) / 0.1, 0, 1);
    if (!isSpeaking) {
        setMorph('mouthSmileLeft', faceTrackSmile * 0.6);
        setMorph('mouthSmileRight', faceTrackSmile * 0.6);
    }

    const browAvgY = (lm[107].y + lm[336].y + lm[70].y + lm[300].y) / 4;
    faceTrackBrowRaise = THREE.MathUtils.clamp((0.28 - browAvgY) / 0.06, -0.5, 1);
    if (!isSpeaking) {
        setMorph('browInnerUp', Math.max(0, faceTrackBrowRaise) * 0.5);
        setMorph('browDownLeft', Math.max(0, -faceTrackBrowRaise) * 0.4);
        setMorph('browDownRight', Math.max(0, -faceTrackBrowRaise) * 0.4);
    }
}

async function startFaceTracking() {
    if (faceTrackingActive) return;
    try {
        createVideoElement();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        videoElement.srcObject = stream;
        videoElement.style.display = 'block';
        await videoElement.play();
        const fm = await loadFaceMesh();
        if (!fm) { stopFaceTracking(); return; }
        faceTrackingActive = true;
        faceTrackingEnabled = true;
        async function processFrame() {
            if (!faceTrackingActive) return;
            if (videoElement.readyState >= 2) {
                try { await faceMesh.send({ image: videoElement }); } catch (e) { console.warn('Frame error:', e); }
            }
            requestAnimationFrame(processFrame);
        }
        processFrame();
        showNotification('Face tracking enabled!', 'success');
        updateFaceTrackButton(true);
    } catch (error) {
        console.error('Face tracking error:', error);
        showNotification(error.name === 'NotAllowedError' ? 'Camera access denied' : 'Face tracking failed', 'error');
        stopFaceTracking();
    }
}

function stopFaceTracking() {
    faceTrackingActive = false;
    faceTrackingEnabled = false;
    if (videoElement) {
        const stream = videoElement.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
    }
    faceTrackGazeX = null; faceTrackGazeY = null;
    faceTrackBlink = null; faceTrackSmile = null;
    faceTrackMouthOpen = null; faceTrackBrowRaise = null;
    updateFaceTrackButton(false);
}

function toggleFaceTracking() {
    faceTrackingActive ? (stopFaceTracking(), showNotification('Face tracking off', 'info')) : startFaceTracking();
}

function updateFaceTrackButton(active) {
    const btn = document.getElementById('face-track-button');
    if (btn) {
        btn.classList.toggle('active', active);
        btn.title = active ? 'Disable Face Tracking' : 'Enable Face Tracking';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12 — UI Initialization
// ═══════════════════════════════════════════════════════════════════════════
(function initFaceTrackButton() {
    const hc = document.querySelector('.header-controls');
    if (!hc) return;
    const btn = document.createElement('button');
    btn.id = 'face-track-button';
    btn.className = 'icon-button';
    btn.title = 'Enable Face Tracking';
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="10" r="6"/>
        <circle cx="9.5" cy="9" r="0.5" fill="currentColor"/>
        <circle cx="14.5" cy="9" r="0.5" fill="currentColor"/>
        <path d="M9.5 12.5a3 3 0 0 0 5 0"/>
        <path d="M12 16v2"/><path d="M8 22h8"/>
    </svg>`;
    btn.style.cssText = `background:var(--bg-glass,rgba(16,16,36,0.55));border:1px solid var(--border-subtle,rgba(124,111,255,0.12));
        color:var(--text-secondary,#a09bb8);padding:8px;border-radius:8px;cursor:pointer;transition:all 0.2s;
        display:flex;align-items:center;justify-content:center;margin-right:8px;`;
    btn.addEventListener('click', toggleFaceTracking);
    btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('active')) btn.style.background = 'rgba(124,111,255,0.2)'; });
    btn.addEventListener('mouseleave', () => { if (!btn.classList.contains('active')) btn.style.background = 'var(--bg-glass,rgba(16,16,36,0.55))'; });
    hc.insertBefore(btn, hc.firstChild);
})();

const injectedStyles = document.createElement('style');
injectedStyles.textContent = `
    #face-track-button.active {
        background: rgba(124,111,255,0.35) !important;
        border-color: rgba(124,111,255,0.6) !important;
        color: #fff !important;
        box-shadow: 0 0 12px rgba(124,111,255,0.3);
    }
    @keyframes notifSlide {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    #face-tracking-video { transition: opacity 0.3s ease; }
`;
document.head.appendChild(injectedStyles);

console.log('🚀 Nova AI Virtual Human (v7.0) — GLB Avatar with Morph-Target Lip Sync');
