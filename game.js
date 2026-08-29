import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { OBJLoader } from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js";


const textureLoader =
    new THREE.TextureLoader();

const mattaTexture =
    textureLoader.load(
        "./assets/matta.png"
    );

mattaTexture.wrapS =
    THREE.RepeatWrapping;

mattaTexture.wrapT =
    THREE.RepeatWrapping;

mattaTexture.repeat.set(
    10,
    8
);

// ========================================
// STOL OBJ
// ========================================



const objLoader =
    new OBJLoader();

let chairModel = null;

let officeChairs = [];

let sittingOnChair = null;
let isSitting = false;

const pendingChairs = [];

objLoader.load(
    "./assets/stol.obj",

    (object) => {

        chairModel = object;

chairModel.scale.set(
    1,
    1,
    1
);

chairModel.traverse(
    (child) => {

        if (!child.isMesh) {
            return;
        }

        // Hämta namnet från både
        // mesh och material
        const meshName =
            (
                child.name || ""
            ).toLowerCase();

        const materialName =
            (
                child.material?.name || ""
            ).toLowerCase();

        const name =
            meshName + " " + materialName;


        // ====================================
        // BLÅ DEL
        // ====================================

        if (
            name.includes("blå") ||
            name.includes("bla")
        ) {

            child.material =
                new THREE.MeshStandardMaterial({
                    color: 0x838383,
                    roughness: 0.7,
                    metalness: 0.05
                });

            console.log(
                "BLÅ DEL:",
                child.name,
                child.material.name
            );

            return;
        }


        // ====================================
        // SVART DEL
        // ====================================

        if (
            name.includes("svart")
        ) {

            child.material =
                new THREE.MeshStandardMaterial({
                    color: 0x494444,
                    roughness: 0.65,
                    metalness: 0.15
                });

            console.log(
                "SVART DEL:",
                child.name
            );

            return;
        }


// ====================================
// OKÄND DEL
// ====================================
// Alla delar som inte är blå
// blir svarta istället för vita.

child.material =
    new THREE.MeshStandardMaterial({
        color: 0x494444,
        roughness: 0.65,
        metalness: 0.15
    });

    }
);

console.log(
    "stol.obj laddad!"
);

// Skapa alla stolar som väntade på modellen
for (const chair of pendingChairs) {

    addOBJChair(
        chair.x,
        chair.y,
        chair.z
    );

}

pendingChairs.length = 0;

    },

    undefined,

    (error) => {

    console.error(
        "❌ KUNDE INTE LADDA STOL.OBJ"
    );

    console.error(error);

    alert(
        "Kunde inte ladda stol.obj. Kolla konsolen."
    );

}
);


// ========================================
// SERVER
// ========================================

// Vi ändrar denna adress senare när servern
// ligger på Render.
//
// Just nu används localhost för testning.

const SERVER_URL =
    "wss://dale-and-jansson-server.onrender.com";

let socket = null;

// ========================================
// MULTIPLAYER PLAYERS
// ========================================

const otherPlayers = new Map();

// ========================================
// SCENE
// ========================================

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(0x87ceeb);


// ========================================
// CAMERA
// ========================================

const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth /
        window.innerHeight,
        0.1,
        1000
    );
    
    // ========================================
// FIRST PERSON LOOK
// ========================================

let cameraYaw = 0;
let cameraPitch = 0;

const lookSensitivity = 0.005;

camera.position.set(
    0,
    1.6,
    0
);


// ========================================
// RENDERER
// ========================================

const renderer =
    new THREE.WebGLRenderer({
        antialias: true
    });

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);

document
    .getElementById("game")
    .appendChild(
        renderer.domElement
    );
renderer.domElement.style.touchAction =
    "none";

// ========================================
// STATIC OFFICE SHADOW LIGHT
// ========================================

const officeShadowLight =
    new THREE.DirectionalLight(
        0xfff3dc,
        2.5
    );

officeShadowLight.position.set(
    -8,
    12,
    8
);



// ========================================
// SHADOW QUALITY
// ========================================

officeShadowLight.shadow.mapSize.width = 1024;
officeShadowLight.shadow.mapSize.height = 1024;


// ========================================
// SHADOW CAMERA
// ========================================

officeShadowLight.shadow.camera.left = -25;
officeShadowLight.shadow.camera.right = 25;
officeShadowLight.shadow.camera.top = 20;
officeShadowLight.shadow.camera.bottom = -20;

officeShadowLight.shadow.camera.near = 1;
officeShadowLight.shadow.camera.far = 40;


// Mjukare skuggor
officeShadowLight.shadow.radius = 4;

scene.add(
    officeShadowLight
);

// ========================================
// LIGHT
// ========================================






// ========================================
// TEST PLAYER
// ========================================

const playerGeometry =
    new THREE.CapsuleGeometry(
        0.5,
        1.2,
        4,
        8
    );

const playerMaterial =
    new THREE.MeshStandardMaterial({
        color: 0xff3333
    });

const player =
    new THREE.Mesh(
        playerGeometry,
        playerMaterial
    );

player.position.y = 1;

// Spelarens kropp finns fortfarande i världen
// så andra spelare kan se den.
// Vi gömmer den bara från vår egen kamera.

scene.add(
    player
);

player.visible = false;

// ========================================
// CREATE OTHER PLAYER
// ========================================

function createOtherPlayer(data) {

    if (otherPlayers.has(data.playerId)) {
        return;
    }

    const geometry =
        new THREE.CapsuleGeometry(
            0.5,
            1.2,
            4,
            8
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x3366ff
        });

    const otherPlayer =
        new THREE.Mesh(
            geometry,
            material
        );

    otherPlayer.position.set(
        data.x,
        data.y,
        data.z
    );

    otherPlayer.rotation.y =
        data.rotation || 0;

    scene.add(
        otherPlayer
    );

    otherPlayers.set(
        data.playerId,
        otherPlayer
    );
}

// ========================================
// UPDATE OTHER PLAYER
// ========================================

function updateOtherPlayer(data) {

    const otherPlayer =
        otherPlayers.get(
            data.playerId
        );

    if (!otherPlayer) {

        createOtherPlayer(data);

        return;
    }

    otherPlayer.position.set(
        data.x,
        data.y,
        data.z
    );

    otherPlayer.rotation.y =
        data.rotation || 0;
}

// ========================================
// PLAYER MOVEMENT
// ========================================

const keys = {};

window.addEventListener(
    "keydown",
    (event) => {

        keys[event.key.toLowerCase()] = true;

    }
);

window.addEventListener(
    "keyup",
    (event) => {

        keys[event.key.toLowerCase()] = false;

    }
);


// Spelarens hastighet
const playerSpeed = 0.08;


// ========================================
// MOBILE JOYSTICK
// ========================================

const joystick = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    radius: 65
};

const joystickCanvas =
    document.createElement("canvas");

joystickCanvas.id =
    "joystickCanvas";

joystickCanvas.style.position =
    "fixed";

joystickCanvas.style.left =
    "20px";

joystickCanvas.style.bottom =
    "20px";

joystickCanvas.style.width =
    "150px";

joystickCanvas.style.height =
    "150px";

joystickCanvas.style.zIndex =
    "1000";

joystickCanvas.style.touchAction =
    "none";

document.body.appendChild(
    joystickCanvas
);

const joystickCtx =
    joystickCanvas.getContext("2d");


function resizeJoystick() {

    const scale =
        window.devicePixelRatio || 1;

    joystickCanvas.width =
        150 * scale;

    joystickCanvas.height =
        150 * scale;

    joystickCtx.setTransform(
        scale,
        0,
        0,
        scale,
        0,
        0
    );

}

resizeJoystick();


function drawJoystick() {

    joystickCtx.clearRect(
        0,
        0,
        150,
        150
    );


    // Yttre cirkel
    joystickCtx.beginPath();

    joystickCtx.arc(
        75,
        75,
        65,
        0,
        Math.PI * 2
    );

    joystickCtx.fillStyle =
        "rgba(0,0,0,0.25)";

    joystickCtx.fill();


    // Inre spak
    joystickCtx.beginPath();

    joystickCtx.arc(
        75 + joystick.x * 45,
        75 + joystick.y * 45,
        25,
        0,
        Math.PI * 2
    );

    joystickCtx.fillStyle =
        "rgba(255,255,255,0.65)";

    joystickCtx.fill();

}

drawJoystick();


function joystickPosition(
    event
) {

    const rect =
        joystickCanvas.getBoundingClientRect();

    const x =
        event.clientX -
        rect.left;

    const y =
        event.clientY -
        rect.top;

    const centerX = 75;
    const centerY = 75;

    let dx =
        x - centerX;

    let dy =
        y - centerY;


    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (
        distance >
        joystick.radius
    ) {

        dx =
            dx /
            distance *
            joystick.radius;

        dy =
            dy /
            distance *
            joystick.radius;

    }


    joystick.x =
        dx /
        joystick.radius;

    joystick.y =
        dy /
        joystick.radius;

}


joystickCanvas.addEventListener(
    "pointerdown",
    (event) => {

        joystick.active =
            true;

        joystick.pointerId =
            event.pointerId;

        joystickCanvas.setPointerCapture(
            event.pointerId
        );

        joystickPosition(
            event
        );

    }
);


joystickCanvas.addEventListener(
    "pointermove",
    (event) => {

        if (
            !joystick.active ||
            event.pointerId !==
            joystick.pointerId
        ) {
            return;
        }

        joystickPosition(
            event
        );

    }
);


function releaseJoystick() {

    joystick.active =
        false;

    joystick.pointerId =
        null;

    joystick.x = 0;
    joystick.y = 0;

}


joystickCanvas.addEventListener(
    "pointerup",
    releaseJoystick
);

joystickCanvas.addEventListener(
    "pointercancel",
    releaseJoystick
);

joystickCanvas.addEventListener(
    "lostpointercapture",
    releaseJoystick
);

// ========================================
// MOBILE TOUCH CAMERA
// ========================================

let cameraTouchId = null;

let lastLookX = 0;
let lastLookY = 0;

window.addEventListener(
    "pointerdown",
    (event) => {

        // Vi bryr oss bara om fingrar
        if (
            event.pointerType !== "touch"
        ) {
            return;
        }

        // Vänster sida är reserverad
        // för joysticken
        if (
            event.clientX <
            window.innerWidth / 2
        ) {
            return;
        }

        // Höger sida startar kameran
        cameraTouchId =
            event.pointerId;

        lastLookX =
            event.clientX;

        lastLookY =
            event.clientY;

        // Viktigt på mobilen
        event.preventDefault();

    },
    {
        passive: false
    }
);


window.addEventListener(
    "pointermove",
    (event) => {

        // Detta finger styr inte kameran
        if (
            event.pointerId !==
            cameraTouchId
        ) {
            return;
        }

        const deltaX =
            event.clientX -
            lastLookX;

        const deltaY =
            event.clientY -
            lastLookY;

        lastLookX =
            event.clientX;

        lastLookY =
            event.clientY;


        // ----------------------------
        // KAMERA VÄNSTER / HÖGER
        // ----------------------------

        cameraYaw -=
            deltaX *
            lookSensitivity;


        // ----------------------------
        // KAMERA UPP / NER
        // ----------------------------

        cameraPitch -=
            deltaY *
            lookSensitivity;


        // Begränsa upp/ned
        cameraPitch =
            Math.max(
                -Math.PI / 2,
                Math.min(
                    Math.PI / 2,
                    cameraPitch
                )
            );

        event.preventDefault();

    },
    {
        passive: false
    }
);


window.addEventListener(
    "pointerup",
    (event) => {

        if (
            event.pointerId ===
            cameraTouchId
        ) {

            cameraTouchId =
                null;

        }

    }
);


window.addEventListener(
    "pointercancel",
    (event) => {

        if (
            event.pointerId ===
            cameraTouchId
        ) {

            cameraTouchId =
                null;

        }

    }
);

// ========================================
// XBOX / GAMEPAD
// ========================================

let gamepadIndex = null;


window.addEventListener(
    "gamepadconnected",
    (event) => {

        gamepadIndex =
            event.gamepad.index;

        console.log(
            "Xbox/Gamepad ansluten"
        );

    }
);


window.addEventListener(
    "gamepaddisconnected",
    (event) => {

        if (
            gamepadIndex ===
            event.gamepad.index
        ) {

            gamepadIndex =
                null;

        }

    }
);


function getGamepadInput() {

    let x = 0;
    let y = 0;


    if (
        gamepadIndex !==
        null
    ) {

        const pads =
            navigator.getGamepads();

        const pad =
            pads[
                gamepadIndex
            ];


        if (pad) {

            x =
                pad.axes[0] || 0;

            y =
                pad.axes[1] || 0;

        }

    }


    // Ta bort små driftvärden
    if (
        Math.abs(x) <
        0.15
    ) {
        x = 0;
    }

    if (
        Math.abs(y) <
        0.15
    ) {
        y = 0;
    }


    return {
        x,
        y
    };

}

// ========================================
// XBOX CAMERA
// ========================================

function getGamepadLook() {

    let x = 0;
    let y = 0;

    if (gamepadIndex !== null) {

        const pads =
            navigator.getGamepads();

        const pad =
            pads[gamepadIndex];

        if (pad) {

            // Höger analogspak
            x =
                pad.axes[2] || 0;

            y =
                pad.axes[3] || 0;

        }

    }

    // Deadzone
    if (Math.abs(x) < 0.15) {
        x = 0;
    }

    if (Math.abs(y) < 0.15) {
        y = 0;
    }

    return {
        x,
        y
    };

}

// ========================================
// XBOX INTERACT
// ========================================

let interactPressed = false;

function checkGamepadInteract() {

    if (gamepadIndex === null) {
        return false;
    }

    const pads =
        navigator.getGamepads();

    const pad =
        pads[gamepadIndex];

    if (!pad) {
        return false;
    }

    // Xbox X = knapp 2
    return pad.buttons[2]?.pressed || false;
}

// ========================================
// UPDATE PLAYER
// ========================================

function updatePlayer() {

    // Sittande spelare kan inte gå
    if (isSitting) {

        return;

    }

    let moveX = 0;
    let moveZ = 0;

// ====================================
// XBOX CAMERA
// ====================================

const gamepadLook =
    getGamepadLook();

cameraYaw -=
    gamepadLook.x * 0.04;

cameraPitch -=
    gamepadLook.y * 0.04;


// Begränsa upp/ned
cameraPitch =
    Math.max(
        -Math.PI / 2,
        Math.min(
            Math.PI / 2,
            cameraPitch
        )
    );


    // WASD
    if (keys["w"]) {
    moveZ += 1;
}

if (keys["s"]) {
    moveZ -= 1;
}

if (keys["a"]) {
    moveX += 1;
}

if (keys["d"]) {
    moveX -= 1;
}

// ====================================
// MOBILE JOYSTICK
// ====================================

moveX +=
    joystick.x;

moveZ +=
    joystick.y;


// ====================================
// XBOX
// ====================================

const gamepad =
    getGamepadInput();

// ====================================
// XBOX INTERACT
// ====================================

const currentInteract =
    checkGamepadInteract();

if (
    currentInteract &&
    !interactPressed
) {

    tryOpenOfficeDoor();

    trySitOnChair();

}

interactPressed =
    currentInteract;

moveX +=
    gamepad.x;

moveZ +=
    gamepad.y;


    // Gör diagonal rörelse lika snabb
    if (
        moveX !== 0 ||
        moveZ !== 0
    ) {

        const length =
            Math.sqrt(
                moveX * moveX +
                moveZ * moveZ
            );

        moveX /= length;
        moveZ /= length;


        const forwardX =
    Math.sin(cameraYaw);

const forwardZ =
    Math.cos(cameraYaw);

const rightX =
    Math.cos(cameraYaw);

const rightZ =
    -Math.sin(cameraYaw);


player.position.x +=
    (
        forwardX * moveZ +
        rightX * moveX
    ) * playerSpeed;


player.position.z +=
    (
        forwardZ * moveZ +
        rightZ * moveX
    ) * playerSpeed;



    }

// ====================================
// SEND POSITION TO SERVER
// ====================================

if (
    socket &&
    socket.readyState ===
    WebSocket.OPEN
) {

    socket.send(
        JSON.stringify({
            type:
                "playerMove",

            x:
                player.position.x,

            y:
                player.position.y,

            z:
                player.position.z,

            rotation:
                player.rotation.y
        })
    );

}


// ====================================
// OFFICE BOUNDARIES + DOOR OPENING
// ====================================

// Sidoväggarnas gräns
const limitX = 18;

// Kontorets bakre gräns
const backLimitZ = -13;

// Framväggens position
const officeFrontZ = 14.5;

// Dörrens bredd
// Ändra INTE denna om inte själva dörren ändras.
const doorHalfWidth = 1.25;


// ====================================
// X-GRÄNS
// ====================================

player.position.x =
    Math.max(
        -limitX,
        Math.min(
            limitX,
            player.position.x
        )
    );


// ====================================
// BAKRE VÄGG
// ====================================

if (player.position.z < backLimitZ) {

    player.position.z =
        backLimitZ;

}


// ====================================
// FRAMVÄGG / DÖRR
// ====================================

// Är spelaren framför själva dörröppningen?
const insideDoorWidth =
    Math.abs(player.position.x) < doorHalfWidth;


// ====================================
// OM SPELAREN ÄR INNE I KONTORET
// ====================================

if (player.position.z <= officeFrontZ) {

    // Utanför dörröppningen får spelaren
    // inte gå genom framväggen.

    if (
        player.position.z > officeFrontZ - 0.6 &&
        !insideDoorWidth
    ) {

        player.position.z =
            officeFrontZ - 0.6;

    }

}


// ====================================
// KORRIDORGRÄNS
// ====================================

// När spelaren väl har gått igenom dörren
// ska OFFICE BOUNDARIES INTE längre
// kunna teleportera tillbaka spelaren.
//
// Korridoren kan därför fortsätta framåt
// utan att denna kod stoppar den.

}


// ========================================
// MENU
// ========================================

const menu =
    document.getElementById(
        "menu"
    );

const createRoom =
    document.getElementById(
        "createRoom"
    );

const joinRoom =
    document.getElementById(
        "joinRoom"
    );


// ========================================
// CREATE ROOM
// ========================================

createRoom.onclick = () => {

    connectToServer(() => {

        socket.send(
            JSON.stringify({
                type: "createRoom"
            })
        );

    });

};


// ========================================
// JOIN ROOM
// ========================================

joinRoom.onclick = () => {

    const roomCode =
        prompt(
            "Skriv in rumskoden:"
        );

    if (!roomCode) {
        return;
    }

    connectToServer(() => {

        socket.send(
            JSON.stringify({
                type: "joinRoom",
                roomCode:
                    roomCode
            })
        );

    });

};


// ========================================
// CONNECT
// ========================================

function connectToServer(
    onConnected
) {

    if (socket) {
        return;
    }

    console.log(
        "Ansluter till server..."
    );

    socket =
        new WebSocket(
            SERVER_URL
        );


    socket.onopen = () => {

    console.log(
        "Ansluten till server!"
    );

    if (onConnected) {
        onConnected();
    }

};


    socket.onmessage =
        (event) => {

            let data;

            try {

                data =
                    JSON.parse(
                        event.data
                    );

            } catch {

                return;

            }


            // ==========================
            // RUM SKAPAT
            // ==========================

            if (
                data.type ===
                "roomCreated"
            ) {

                showRoom(
                    data.roomCode
                );

            }


            // ==========================
            // GICK MED
            // ==========================

            if (
                data.type ===
                "joinedRoom"
            ) {

                showRoom(
                    data.roomCode
                );

            }

// ==========================
// ANDRA SPELARE
// ==========================

if (
    data.type ===
    "playerJoined"
) {

    createOtherPlayer(
        data
    );

}


// ==========================
// SPELARE RÖR SIG
// ==========================

if (
    data.type ===
    "playerMove"
) {

    updateOtherPlayer(
        data
    );

}


            // ==========================
            // SPELARE
            // ==========================

            if (
    data.type ===
    "roomPlayers"
) {

    updatePlayerCount(
        data.count
    );

}


            // ==========================
            // FEL
            // ==========================

            if (
                data.type ===
                "error"
            ) {

                alert(
                    data.message
                );

            }

        };


    socket.onerror =
        () => {

            console.log(
                "Kunde inte ansluta till servern."
            );

            alert(
                "Kunde inte ansluta till multiplayer-servern."
            );

        };


    socket.onclose =
        () => {

            console.log(
                "Frånkopplad från servern."
            );

            socket = null;

        };

}


// ========================================
// SHOW ROOM
// ========================================

function showRoom(
    roomCode
) {

    menu.innerHTML = "";


    const title =
        document.createElement(
            "h1"
        );

    title.textContent =
        "DITT RUM";

    menu.appendChild(
        title
    );


    const code =
        document.createElement(
            "div"
        );

    code.textContent =
        roomCode;

    code.style.fontSize =
        "48px";

    code.style.fontWeight =
        "bold";

    code.style.letterSpacing =
        "8px";

    code.style.margin =
        "20px";

    menu.appendChild(
        code
    );


    const waiting =
        document.createElement(
            "p"
        );

    waiting.textContent =
        "Väntar på spelare...";

    waiting.style.fontSize =
        "20px";

    menu.appendChild(
        waiting
    );

const playerCount =
    document.createElement(
        "p"
    );

playerCount.id =
    "playerCount";

playerCount.textContent =
    "Spelare: 1 / 8";

playerCount.style.fontSize =
    "20px";

playerCount.style.margin =
    "10px";

menu.appendChild(
    playerCount
);

// ========================================
// STARTA SPEL
// ========================================

const startGame =
    document.createElement(
        "button"
    );

startGame.textContent =
    "STARTA SPEL";

startGame.style.fontSize =
    "20px";

startGame.style.padding =
    "15px 30px";

startGame.style.margin =
    "20px";

startGame.onclick =
    () => {

        startGameScreen();

    };

menu.appendChild(
    startGame
);

    const leave =
        document.createElement(
            "button"
        );

    leave.textContent =
        "LÄMNA RUM";

    leave.onclick =
        () => {

            if (socket) {

                socket.close();

            }

            location.reload();

        };

    menu.appendChild(
        leave
    );

}

function updatePlayerCount(
    count
) {

    const oldText =
        document.getElementById(
            "playerCount"
        );

    if (oldText) {

        oldText.textContent =
            `Spelare: ${count} / 8`;

    }

}

// ========================================
// START GAME
// ========================================

function startGameScreen() {

    menu.style.display =
        "none";

    createOffice();

// ========================================
// BAKE STATIC SHADOW MAP
// ========================================

renderer.shadowMap.autoUpdate = true;
renderer.shadowMap.needsUpdate = true;

enableOfficeShadows();

}

// ========================================
// OFFICE WORLD
// ========================================

function createOffice() {

    // ========================================
    // KONTOR - GRUND
    // ========================================

    createOfficeFloor();

createOfficeWalls();

createOfficePillars();

createOfficeWindows();

createOfficeDoor();

createCeiling();



// ========================================
// HYLLOR & SKÅP
// ========================================

// ========================================
// HYLLOR
// ========================================

createLargeShelf(
    15,
    0,
    -13.8,
    0
);

fillOfficeShelf(
    15,
    0,
    -13.8,
    0
);


createLargeShelf(
    -19.0,
    0,
    7.5,
    Math.PI / 2
);

fillOfficeShelf(
    -19.0,
    0,
    7.5,
    Math.PI / 2
);


createLargeShelf(
    19.0,
    0,
    -6.5,
    -Math.PI / 2
);

fillOfficeShelf(
    19.0,
    0,
    -6.5,
    -Math.PI / 2
);


createLargeShelf(
    18.8,
    0,
    12,
    -Math.PI / 2
);

fillOfficeShelf(
    18.8,
    0,
    12,
    -Math.PI / 2
);




    // ========================================
    // SKRIVBORD
    // ========================================

    createDesk(-8, 0, -5);
    
    createDesk(0, 0, -5);
    createDesk(8, 0, -5);

    createDesk(-8, 0, 5);
    createDesk(0, 0, 5);
    createDesk(8, 0, 5);



// ========================================
// DESK BARRIERS
// ========================================

// Rad 1
createDeskBarrier(
    -8,
    0,
    -6.3
);

createDeskBarrier(
    0,
    0,
    -6.3
);

createDeskBarrier(
    8,
    0,
    -6.3
);


// Rad 2
createDeskBarrier(
    -8,
    0,
    3.7
);

createDeskBarrier(
    0,
    0,
    3.7
);

createDeskBarrier(
    8,
    0,
    3.7
);

}



// ========================================
// OFFICE FLOOR
// ========================================

function createOfficeFloor() {

    // ========================================
    // GOLVETS BAS
    // ========================================

    const floorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x3b3b3b,
            roughness: 0.95
        });

    const floor =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                40,
                0.5,
                30
            ),
            floorMaterial
        );

    floor.position.set(
        0,
        -0.25,
        0
    );

    floor.receiveShadow = true;

scene.add(
    floor
);


    // ========================================
    // MATTA
    // ========================================

    const carpetMaterial =
    new THREE.MeshStandardMaterial({
        map: mattaTexture,
        color: 0x777777,
        roughness: 1,
        metalness: 0
    });

    const carpet =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                39.8,
                0.04,
                29.8
            ),
            carpetMaterial
        );

    carpet.position.set(
        0,
        0.03,
        0
    );

    carpet.receiveShadow = true;

scene.add(
    carpet
);

}








// ========================================
// OFFICE WALLS
// ========================================

function createOfficeWalls() {

    // ========================================
    // MATERIAL
    // ========================================

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xcfc7b8,
            roughness: 0.9
        });

    const lowerWallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xaaa296,
            roughness: 0.95
        });

    const trimMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x756d62,
            roughness: 0.8
        });

    const topTrimMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x9b9286,
            roughness: 0.85
        });


    // ========================================
    // BAKVÄGG
    // ========================================

    createWall(
        0,
        3,
        -15,
        40,
        6,
        0.5,
        wallMaterial
    );


    // ========================================
    // BAKVÄGG – NEDRE PANEL
    // ========================================

    createWall(
        0,
        1.05,
        -14.72,
        40,
        2.1,
        0.12,
        lowerWallMaterial
    );


    // ========================================
    // BAKVÄGG – PANEL-LIST
    // ========================================

    createWall(
        0,
        2.08,
        -14.63,
        40,
        0.12,
        0.10,
        trimMaterial
    );


    // ========================================
    // BAKVÄGG – TAKLIST
    // ========================================

    createWall(
        0,
        5.78,
        -14.68,
        40,
        0.25,
        0.15,
        topTrimMaterial
    );


    // ========================================
    // FRAMVÄGG – VÄNSTER DEL
    // ========================================

    createWall(
        -11.8,
        3,
        15,
        20.9,
        6,
        0.5,
        wallMaterial
    );


    // ========================================
    // FRAMVÄGG – HÖGER DEL
    // ========================================

    createWall(
        11.8,
        3,
        15,
        20.9,
        6,
        0.5,
        wallMaterial
    );


    // ========================================
    // FRAMVÄGG – OVANFÖR DÖRREN
    // ========================================

    createWall(
        0,
        5.1,
        15,
        7.3,
        1.8,
        0.5,
        wallMaterial
    );


    // ========================================
    // VÄNSTER VÄGG
    // ========================================

    createWall(
        -20,
        3,
        0,
        0.5,
        6,
        30,
        wallMaterial
    );


    // ========================================
    // HÖGER VÄGG
    // ========================================

    createWall(
        20,
        3,
        0,
        0.5,
        6,
        30,
        wallMaterial
    );


    // ========================================
    // VÄNSTER VÄGG – NEDRE PANEL
    // ========================================

    createWall(
        -19.72,
        1.05,
        0,
        0.12,
        2.1,
        30,
        lowerWallMaterial
    );


    // ========================================
    // HÖGER VÄGG – NEDRE PANEL
    // ========================================

    createWall(
        19.72,
        1.05,
        0,
        0.12,
        2.1,
        30,
        lowerWallMaterial
    );


    // ========================================
    // VÄNSTER VÄGG – LIST
    // ========================================

    createWall(
        -19.63,
        2.08,
        0,
        0.10,
        0.12,
        30,
        trimMaterial
    );


    // ========================================
    // HÖGER VÄGG – LIST
    // ========================================

    createWall(
        19.63,
        2.08,
        0,
        0.10,
        0.12,
        30,
        trimMaterial
    );


    // ========================================
    // VÄNSTER VÄGG – TAKLIST
    // ========================================

    createWall(
        -19.68,
        5.78,
        0,
        0.15,
        0.25,
        30,
        topTrimMaterial
    );


    // ========================================
    // HÖGER VÄGG – TAKLIST
    // ========================================

    createWall(
        19.68,
        5.78,
        0,
        0.15,
        0.25,
        30,
        topTrimMaterial
    );


    // ========================================
    // FRAMVÄGG – NEDRE PANEL VÄNSTER
    // ========================================

    createWall(
        -11.8,
        1.05,
        14.72,
        20.9,
        2.1,
        0.12,
        lowerWallMaterial
    );


    // ========================================
    // FRAMVÄGG – NEDRE PANEL HÖGER
    // ========================================

    createWall(
        11.8,
        1.05,
        14.72,
        20.9,
        2.1,
        0.12,
        lowerWallMaterial
    );


    // ========================================
    // FRAMVÄGG – LIST VÄNSTER
    // ========================================

    createWall(
        -11.8,
        2.08,
        14.63,
        20.9,
        0.12,
        0.10,
        trimMaterial
    );


    // ========================================
    // FRAMVÄGG – LIST HÖGER
    // ========================================

    createWall(
        11.8,
        2.08,
        14.63,
        20.9,
        0.12,
        0.10,
        trimMaterial
    );


    // ========================================
    // FRAMVÄGG – TAKLIST VÄNSTER
    // ========================================

    createWall(
        -11.8,
        5.78,
        14.68,
        20.9,
        0.25,
        0.15,
        topTrimMaterial
    );


    // ========================================
    // FRAMVÄGG – TAKLIST HÖGER
    // ========================================

    createWall(
        11.8,
        5.78,
        14.68,
        20.9,
        0.25,
        0.15,
        topTrimMaterial
    );

}

// ========================================
// SMALL GREY CABINET
// ========================================

function createSmallCabinet(
    x,
    y,
    z,
    rotationY = 0
) {

    // ====================================
    // MATERIAL
    // ====================================

    const cabinetMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x77736b,
            roughness: 0.75
        });

    const doorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x696760,
            roughness: 0.7
        });

    const handleMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x3b3b38,
            roughness: 0.5,
            metalness: 0.3
        });


    // ====================================
    // HUVUDKROPP
    // ====================================

    const cabinet =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.4,
                2.5,
                0.75
            ),
            cabinetMaterial
        );

    cabinet.position.set(
        x,
        y + 1.25,
        z
    );

    cabinet.rotation.y =
        rotationY;

    scene.add(
        cabinet
    );


    // ====================================
    // FRAMDEL
    // ====================================

    const front =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.15,
                2.25,
                0.08
            ),
            doorMaterial
        );

    front.position.set(
        0,
        0,
        0.40
    );

    // Lägg fronten i samma riktning
    // som skåpet
    front.position.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotationY
    );

    front.position.x += x;
    front.position.y += y + 1.25;
    front.position.z += z;

    front.rotation.y =
        rotationY;

    scene.add(
        front
    );


    // ====================================
    // DÖRRDELNING
    // ====================================

    const divider =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.04,
                2.15,
                0.09
            ),
            cabinetMaterial
        );

    divider.position.set(
        0,
        0,
        0.45
    );

    divider.position.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotationY
    );

    divider.position.x += x;
    divider.position.y += y + 1.25;
    divider.position.z += z;

    divider.rotation.y =
        rotationY;

    scene.add(
        divider
    );


    // ====================================
    // HANDTAG
    // ====================================

    function addHandle(offsetX) {

        const handle =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.07,
                    0.25,
                    0.07
                ),
                handleMaterial
            );

        handle.position.set(
            offsetX,
            1.25,
            0.50
        );

        handle.position.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            rotationY
        );

        handle.position.x += x;
        handle.position.y += y;
        handle.position.z += z;

        handle.rotation.y =
            rotationY;

        scene.add(
            handle
        );
    }

    addHandle(-0.42);
    addHandle(0.42);


    // ====================================
    // TOPP
    // ====================================

    const top =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.5,
                0.12,
                0.82
            ),
            cabinetMaterial
        );

    top.position.set(
        x,
        y + 2.56,
        z
    );

    top.rotation.y =
        rotationY;

    scene.add(
        top
    );
}

// ========================================
// STOR ÖPPEN BRUN HYLLA
// MED DETALJERADE PRYLAR
// ========================================

function createLargeShelf(
    x,
    y,
    z,
    rotationY = 0
) {

    const woodMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x6b4226,
            roughness: 0.85
        });

    const darkWoodMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4a2d1a,
            roughness: 0.9
        });


    // ====================================
    // SJÄLVA HYLLAN
    // ====================================

    const shelf =
        new THREE.Group();

    shelf.position.set(
        x,
        y,
        z
    );

    shelf.rotation.y =
        rotationY;


    // ====================================
    // MÅTT
    // ====================================

    const shelfWidth = 4.85;
    const shelfDepth = 1.20;
    const shelfHeight = 4.2;


    // ====================================
    // SIDOSTYCKEN
    // ====================================

    const sideGeometry =
        new THREE.BoxGeometry(
            0.35,
            shelfHeight,
            shelfDepth
        );


    const leftSide =
        new THREE.Mesh(
            sideGeometry,
            woodMaterial
        );

    leftSide.position.set(
        -2.25,
        2.1,
        0
    );

    shelf.add(
        leftSide
    );


    const rightSide =
        new THREE.Mesh(
            sideGeometry,
            woodMaterial
        );

    rightSide.position.set(
        2.25,
        2.1,
        0
    );

    shelf.add(
        rightSide
    );


    // ====================================
    // HYLLPLAN
    // ====================================

    const shelfHeights = [
        0.15,
        1.25,
        2.35,
        3.45
    ];


    for (
        const height of shelfHeights
    ) {

        const shelfBoard =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    shelfWidth,
                    0.25,
                    shelfDepth
                ),
                woodMaterial
            );

        shelfBoard.position.set(
            0,
            height,
            0
        );

        shelf.add(
            shelfBoard
        );

    }


    // ====================================
    // BAKSTYCKE
    // ====================================

    const back =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                shelfWidth,
                shelfHeight,
                0.18
            ),
            darkWoodMaterial
        );

    back.position.set(
        0,
        2.1,
        -0.51
    );

    shelf.add(
        back
    );


    // ====================================
    // FRÄMRE KANT
    // ====================================

    const frontEdgeGeometry =
        new THREE.BoxGeometry(
            shelfWidth,
            0.12,
            0.12
        );


    for (
        const height of shelfHeights
    ) {

        const frontEdge =
            new THREE.Mesh(
                frontEdgeGeometry,
                darkWoodMaterial
            );

        frontEdge.position.set(
            0,
            height + 0.13,
            0.56
        );

        shelf.add(
            frontEdge
        );

    }


    // ========================================
    // MATERIAL FÖR PRYLAR
    // ========================================

    const beigeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xc8b89a,
            roughness: 0.85
        });

    const lightMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd8d0bd,
            roughness: 0.9
        });

    const greyMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.7,
            metalness: 0.35
        });

    const darkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8
        });

    const paperMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xe0dac9,
            roughness: 1
        });

    const boxMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b6746,
            roughness: 0.9
        });

    const redMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b3e32,
            roughness: 0.85
        });


    // ========================================
    // HJÄLPFUNKTION
    // ========================================

    function addItem(
        object,
        px,
        py,
        pz,
        rotation = 0
    ) {

        object.position.set(
            px,
            py,
            pz
        );

        object.rotation.y =
            rotation;

        object.castShadow = false;
        object.receiveShadow = false;

        shelf.add(
            object
        );

    }


    // ========================================
    // HYLLA 1
    // ========================================

    // Låda
    const box1 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.85,
                0.65,
                0.65
            ),
            boxMaterial
        );

    addItem(
        box1,
        -1.65,
        0.58,
        -0.28,
        -0.08
    );


    // Mindre låda ovanpå
    const box2 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.55,
                0.45,
                0.5
            ),
            beigeMaterial
        );

    addItem(
        box2,
        -1.05,
        0.53,
        -0.38,
        0.15
    );


    // Rulle
    const roll1 =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.18,
                0.18,
                0.65,
                12
            ),
            greyMaterial
        );

    roll1.rotation.z =
        Math.PI / 2;

    addItem(
        roll1,
        -0.25,
        0.57,
        -0.30,
        0
    );


    // ========================================
    // HYLLA 2
    // ========================================

    // Staplade böcker
    const book1 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.75,
                0.18,
                0.55
            ),
            redMaterial
        );

    addItem(
        book1,
        -1.65,
        1.52,
        -0.32,
        -0.08
    );


    const book2 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.65,
                0.16,
                0.50
            ),
            lightMaterial
        );

    addItem(
        book2,
        -1.58,
        1.70,
        -0.32,
        0.06
    );


    // Metallburk
    const can =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.22,
                0.22,
                0.55,
                14
            ),
            greyMaterial
        );

    addItem(
        can,
        -0.65,
        1.58,
        -0.30
    );


    // Liten mörk låda
    const smallBox =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.75,
                0.55,
                0.65
            ),
            darkMaterial
        );

    addItem(
        smallBox,
        0.15,
        1.53,
        -0.28,
        0.12
    );


    // ========================================
    // HYLLA 3
    // ========================================

    // Stor kartong
    const carton =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.05,
                0.75,
                0.75
            ),
            boxMaterial
        );

    addItem(
        carton,
        -1.55,
        2.72,
        -0.30,
        -0.05
    );


    // Papper ovanpå kartongen
    const paper =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.55,
                0.025,
                0.75
            ),
            paperMaterial
        );

    addItem(
        paper,
        -1.55,
        3.11,
        -0.30,
        0.12
    );


    // Metallbehållare
    const container =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.24,
                0.27,
                0.65,
                14
            ),
            beigeMaterial
        );

    addItem(
        container,
        -0.55,
        2.70,
        -0.30
    );


    // Liten röd behållare
    const redBox =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.48,
                0.55,
                0.48
            ),
            redMaterial
        );

    addItem(
        redBox,
        0.25,
        2.65,
        -0.35,
        -0.15
    );


    // ========================================
    // HYLLA 4
    // ========================================

    // Tre små lådor utspridda
    const topBox1 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.65,
                0.55,
                0.55
            ),
            beigeMaterial
        );

    addItem(
        topBox1,
        -1.70,
        3.92,
        -0.30,
        0.12
    );


    const topBox2 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.85,
                0.42,
                0.60
            ),
            boxMaterial
        );

    addItem(
        topBox2,
        -0.65,
        3.82,
        -0.34,
        -0.10
    );


    // Liten metallburk
    const topCan =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.18,
                0.18,
                0.48,
                12
            ),
            greyMaterial
        );

    addItem(
        topCan,
        0.55,
        3.82,
        -0.30
    );


    // ========================================
    // EXTRA SMÅDETALJER
    // ========================================

    // Små plankor
    const plank =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.15,
                0.10,
                0.30
            ),
            darkWoodMaterial
        );

    addItem(
        plank,
        1.25,
        0.35,
        -0.25,
        0.12
    );


    // Liten metallbit
    const metalPiece =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.35,
                0.25,
                0.45
            ),
            greyMaterial
        );

    addItem(
        metalPiece,
        1.45,
        1.47,
        -0.30,
        -0.20
    );


    // ========================================
    // LÄGG TILL HYLLAN
    // ========================================

    scene.add(
        shelf
    );

}

// ========================================
// FYLL HYLLAN MED DETALJER
// ========================================

function fillOfficeShelf(
    shelfX,
    shelfY,
    shelfZ,
    rotationY = 0
) {

    const shelfGroup = new THREE.Group();

    shelfGroup.position.set(
        shelfX,
        shelfY,
        shelfZ
    );

    shelfGroup.rotation.y =
        rotationY;

    scene.add(
        shelfGroup
    );


    // ====================================
    // MATERIAL
    // ====================================

    const cardboardMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xb88b58,
            roughness: 0.9
        });

    const cardboardDarkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b633d,
            roughness: 0.95
        });

    const paperMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd8d2bd,
            roughness: 1
        });

    const redMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x7b4035,
            roughness: 0.85
        });

    const greenMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x526b4d,
            roughness: 0.85
        });

    const blueMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4e6275,
            roughness: 0.85
        });

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.55,
            metalness: 0.5
        });


    // ====================================
    // HJÄLPFUNKTION
    // ====================================

    function addBox(
        x,
        y,
        z,
        width,
        height,
        depth,
        material,
        rotation = 0
    ) {

        const object =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    height,
                    depth
                ),
                material
            );

        object.position.set(
            x,
            y,
            z
        );

        object.rotation.y =
            rotation;

        object.castShadow = true;
        object.receiveShadow = true;

        shelfGroup.add(
            object
        );

        return object;
    }


    // ====================================
    // KARTONG
    // ====================================

    function addBoxPackage(
        x,
        y,
        z,
        width,
        height,
        depth,
        material,
        rotation = 0
    ) {

        const box =
            addBox(
                x,
                y,
                z,
                width,
                height,
                depth,
                material,
                rotation
            );


        // Liten tejpremsa ovanpå
        addBox(
            x,
            y + height / 2 + 0.008,
            z,
            0.10,
            0.018,
            depth * 0.85,
            cardboardDarkMaterial,
            rotation
        );


        return box;
    }


    // ====================================
    // PÄRM
    // ====================================

    function addBinder(
        x,
        y,
        z,
        colorMaterial,
        rotation = 0
    ) {

        const binder =
            addBox(
                x,
                y,
                z,
                0.38,
                0.85,
                0.72,
                colorMaterial,
                rotation
            );


        // Etikett på framsidan
        addBox(
            x,
            y,
            z + 0.365,
            0.22,
            0.24,
            0.018,
            paperMaterial,
            rotation
        );


        return binder;
    }


    // ====================================
    // METALLBURK
    // ====================================

    function addContainer(
        x,
        y,
        z,
        material,
        scale = 1
    ) {

        const container =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.16 * scale,
                    0.16 * scale,
                    0.55 * scale,
                    12
                ),
                material
            );

        container.position.set(
            x,
            y,
            z
        );

        container.rotation.y =
            Math.random() * Math.PI;

        container.castShadow = true;
        container.receiveShadow = true;

        shelfGroup.add(
            container
        );


        // Lock
        const lid =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.17 * scale,
                    0.17 * scale,
                    0.035 * scale,
                    12
                ),
                metalMaterial
            );

        lid.position.set(
            x,
            y + 0.285 * scale,
            z
        );

        lid.castShadow = true;

        shelfGroup.add(
            lid
        );
    }


    // ====================================
    // LITEN VÄXT
    // ====================================

    function addPlant(
        x,
        y,
        z
    ) {

        const potMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x76513b,
                roughness: 0.9
            });


        const pot =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.20,
                    0.16,
                    0.28,
                    12
                ),
                potMaterial
            );

        pot.position.set(
            x,
            y,
            z
        );

        shelfGroup.add(
            pot
        );


        // Stjälkar
        for (
            let i = 0;
            i < 4;
            i++
        ) {

            const leaf =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.13,
                        8,
                        6
                    ),
                    greenMaterial
                );

            leaf.scale.set(
                0.7,
                1.3,
                0.7
            );

            leaf.position.set(
                x +
                (i - 1.5) * 0.10,

                y +
                0.28 +
                Math.abs(i - 1.5) * 0.04,

                z
            );

            shelfGroup.add(
                leaf
            );
        }
    }


    // ====================================
    // HYLLA 1
    // ====================================

    addBoxPackage(
        -1.55,
        0.65,
        0.18,
        0.85,
        0.75,
        0.65,
        cardboardMaterial,
        -0.08
    );

    addBinder(
        -0.55,
        0.62,
        0.20,
        redMaterial,
        -0.04
    );

    addBinder(
        -0.15,
        0.62,
        0.20,
        blueMaterial,
        0.05
    );

    addContainer(
        0.75,
        0.63,
        0.15,
        metalMaterial,
        0.9
    );

    addContainer(
        1.20,
        0.63,
        0.18,
        greenMaterial,
        0.75
    );

    addBoxPackage(
        1.65,
        0.60,
        0.12,
        0.60,
        0.65,
        0.60,
        cardboardDarkMaterial,
        0.12
    );


    // ====================================
    // HYLLA 2
    // ====================================

    addBinder(
        -1.70,
        1.72,
        0.18,
        greenMaterial,
        -0.08
    );

    addBinder(
        -1.28,
        1.72,
        0.18,
        blueMaterial,
        0.06
    );

    addBoxPackage(
        -0.35,
        1.65,
        0.16,
        1.05,
        0.65,
        0.70,
        cardboardMaterial,
        -0.10
    );

    addContainer(
        0.75,
        1.70,
        0.15,
        redMaterial,
        0.85
    );

    addContainer(
        1.15,
        1.70,
        0.17,
        metalMaterial,
        0.75
    );

    addPlant(
        1.65,
        1.70,
        0.15
    );


    // ====================================
    // HYLLA 3
    // ====================================

    addBoxPackage(
        -1.75,
        2.78,
        0.18,
        0.65,
        0.80,
        0.65,
        cardboardDarkMaterial,
        0.08
    );

    addBoxPackage(
        -1.05,
        2.72,
        0.15,
        0.85,
        0.70,
        0.60,
        cardboardMaterial,
        -0.06
    );

    addBinder(
        -0.10,
        2.78,
        0.20,
        redMaterial,
        0.08
    );

    addBinder(
        0.30,
        2.78,
        0.20,
        greenMaterial,
        -0.04
    );

    addContainer(
        1.05,
        2.77,
        0.15,
        blueMaterial,
        0.8
    );

    addContainer(
        1.48,
        2.77,
        0.18,
        metalMaterial,
        0.7
    );


    // ====================================
    // HYLLA 4
    // ====================================

    addPlant(
        -1.65,
        3.72,
        0.18
    );

    addBoxPackage(
        -0.85,
        3.72,
        0.16,
        0.75,
        0.60,
        0.65,
        cardboardMaterial,
        -0.10
    );

    addBinder(
        0.05,
        3.78,
        0.18,
        blueMaterial,
        0.05
    );

    addBinder(
        0.45,
        3.78,
        0.18,
        redMaterial,
        -0.06
    );

    addBoxPackage(
        1.35,
        3.72,
        0.15,
        0.70,
        0.55,
        0.60,
        cardboardDarkMaterial,
        0.08
    );
}


// Bakväggen
createSmallCabinet(-14, 0, -14.5, 0);
createSmallCabinet(-10, 0, -14.5, 0);

// Vänster vägg
createSmallCabinet(-19.5, 0, -8, Math.PI / 2);
createSmallCabinet(-19.5, 0, -3, Math.PI / 2);

// Höger vägg
createSmallCabinet(19.5, 0, 7, -Math.PI / 2);
createSmallCabinet(19.5, 0, 2, -Math.PI / 2);

// ========================================
// BEIGE PELARE
// ========================================

function createOfficePillars() {

    const pillarMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x756d62,
            roughness: 0.85
        });

    const pillarWidth = 0.75;
    const pillarDepth = 0.75;
    const pillarHeight = 6;

    const positions = [

        // Bakvägg
        [-14, 3, -14.65],
        [-7, 3, -14.65],
        [0, 3, -14.65],
        [7, 3, -14.65],
        [14, 3, -14.65],

        // Vänster vägg
        [-19.65, 3, -10],
        [-19.65, 3, -3],
        [-19.65, 3, 4],
        [-19.65, 3, 11],

        // Höger vägg
        [19.65, 3, -10],
        [19.65, 3, -3],
        [19.65, 3, 4],
        [19.65, 3, 11]

    ];

    for (
        const position of positions
    ) {

        const pillar =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    pillarWidth,
                    pillarHeight,
                    pillarDepth
                ),
                pillarMaterial
            );

        pillar.position.set(
            position[0],
            position[1],
            position[2]
        );

        scene.add(
            pillar
        );

    }

}

// ========================================
// OFFICE DOOR
// ========================================

let officeDoor = null;

let officeDoorOpen = false;

let officeDoorAnimating = false;

function createOfficeDoor() {

    const doorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x5a3824,
            roughness: 0.8
        });

    const frameMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b8172,
            roughness: 0.8
        });


    // ========================================
    // DÖRR
    // ========================================

    officeDoor =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.4,
                4.2,
                0.18
            ),
            doorMaterial
        );


    // Dörrens gångjärn sitter på vänster sida
    officeDoor.geometry.translate(
        1.2,
        0,
        0
    );


    officeDoor.position.set(
        -1.2,
        2.1,
        14.65
    );


    scene.add(
        officeDoor
    );


    // ========================================
    // DÖRRKARM
    // ========================================

    // Vänster karm
    createWall(
        -1.35,
        2.1,
        14.5,
        0.25,
        4.5,
        0.35,
        frameMaterial
    );


    // Höger karm
    createWall(
        1.35,
        2.1,
        14.5,
        0.25,
        4.5,
        0.35,
        frameMaterial
    );


    // Övre karm
    createWall(
        0,
        4.35,
        14.5,
        2.95,
        0.25,
        0.35,
        frameMaterial
    );


    // ========================================
    // HANDTAG
    // ========================================

    const handle =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.1,
                12,
                12
            ),
            new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                metalness: 0.8,
                roughness: 0.25
            })
        );


    handle.position.set(
        0.75,
        2.1,
        14.48
    );


    officeDoor.add(
        handle
    );

}

// ========================================
// DOOR INTERACTION FUNCTION
// ========================================

function tryOpenOfficeDoor() {

    if (
        !officeDoor ||
        officeDoorAnimating
    ) {
        return;
    }

    const distance =
        player.position.distanceTo(
            officeDoor.position
        );

    if (distance > 4) {
        return;
    }

    officeDoorAnimating = true;

    officeDoorOpen =
        !officeDoorOpen;
}


// ========================================
// MOBILE DOOR TOUCH
// ========================================

const touchRaycaster =
    new THREE.Raycaster();

const touchMouse =
    new THREE.Vector2();

window.addEventListener(
    "pointerdown",
    (event) => {

        if (
            event.pointerType !== "touch"
        ) {
            return;
        }

        if (
            event.clientX <
            window.innerWidth / 2
        ) {
            return;
        }

        touchMouse.x =
            (event.clientX /
                window.innerWidth) *
                2 - 1;

        touchMouse.y =
            -(event.clientY /
                window.innerHeight) *
                2 + 1;

        touchRaycaster.setFromCamera(
    touchMouse,
    camera
);

// Dörren finns inte innan kontoret har skapats
if (!officeDoor) {
    return;
}

// ========================================
// TOUCH - DÖRR OCH STOLAR
// ========================================

if (officeDoor) {

    const doorHits =
        touchRaycaster.intersectObject(
            officeDoor,
            true
        );

    if (
        doorHits.length > 0
    ) {

        tryOpenOfficeDoor();

        return;

    }

}


// ========================================
// TRYCK PÅ STOL
// ========================================

for (
    const chair of officeChairs
) {

    const chairHits =
        touchRaycaster.intersectObject(
            chair.object,
            true
        );

    if (
        chairHits.length > 0
    ) {

        trySitOnChair();

        return;

    }

}

    }
);


// ========================================
// DOOR INTERACTION
// ========================================

window.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key.toLowerCase() !== "e"
        ) {
            return;
        }

        tryOpenOfficeDoor();

    }
);

// ========================================
// CHAIR E INTERACTION
// ========================================

window.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key.toLowerCase() !== "e"
        ) {
            return;
        }

        trySitOnChair();

    }
);

// ========================================
// OFFICE WINDOWS
// ========================================

function createOfficeWindows() {

    createWindow(
        -12,
        3.5,
        -14.7,
        5,
        3
    );

    createWindow(
        -5,
        3.5,
        -14.7,
        5,
        3
    );

    createWindow(
        2,
        3.5,
        -14.7,
        5,
        3
    );

    createWindow(
        9,
        3.5,
        -14.7,
        5,
        3
    );

}

// ========================================
// WALL
// ========================================

function createWall(
    x,
    y,
    z,
    width,
    height,
    depth,
    material
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );

    const wall =
        new THREE.Mesh(
            geometry,
            material
        );

    wall.position.set(
        x,
        y,
        z
    );

    wall.castShadow = true;
wall.receiveShadow = true;

scene.add(
    wall
);

}

// ========================================
// WINDOW
// ========================================

function createWindow(
    x,
    y,
    z,
    width,
    height
) {

    // ----------------------------
    // FÖNSTERGLAS
    // ----------------------------

    const glass =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                0.12
            ),
            new THREE.MeshStandardMaterial({
                color: 0x6fb7d8,
                roughness: 0.2,
                metalness: 0.1
            })
        );

    glass.position.set(
        x,
        y,
        z
    );

    scene.add(
        glass
    );


    // ----------------------------
    // FÖNSTERKARM
    // ----------------------------

    const frameMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xf0f0f0
        });


    // Övre karm
    createWindowFrame(
        x,
        y + height / 2,
        z,
        width,
        0.15,
        0.2,
        frameMaterial
    );


    // Nedre karm
    createWindowFrame(
        x,
        y - height / 2,
        z,
        width,
        0.15,
        0.2,
        frameMaterial
    );


    // Vänster karm
    createWindowFrame(
        x - width / 2,
        y,
        z,
        0.15,
        height,
        0.2,
        frameMaterial
    );


    // Höger karm
    createWindowFrame(
        x + width / 2,
        y,
        z,
        0.15,
        height,
        0.2,
        frameMaterial
    );


    // ----------------------------
    // MITTSTOLPE
    // ----------------------------

    createWindowFrame(
        x,
        y,
        z - 0.02,
        0.12,
        height,
        0.22,
        frameMaterial
    );

}


// ========================================
// WINDOW FRAME
// ========================================

function createWindowFrame(
    x,
    y,
    z,
    width,
    height,
    depth,
    material
) {

    const frame =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            material
        );

    frame.position.set(
        x,
        y,
        z
    );

    scene.add(
        frame
    );



}

// ========================================
// CEILING
// ========================================

// ========================================
// CEILING
// ========================================

function createCeiling() {

    // ----------------------------
    // TAK OVANFÖR UNDERTAKET
    // ----------------------------

    const roof =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                40,
                0.3,
                30
            ),
            new THREE.MeshStandardMaterial({
                color: 0xE9EED4,
                roughness: 1
            })
        );

    roof.position.set(
        0,
        6.25,
        0
    );

    scene.add(
        roof
    );


    // ----------------------------
    // TAKPLATTOR
    // ----------------------------

    const ceilingMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xE9EED4,
            roughness: 0.9
        });


    const tileSize = 2;

    const tilesX = 20;
    const tilesZ = 15;


    for (
        let x = 0;
        x < tilesX;
        x++
    ) {

        for (
            let z = 0;
            z < tilesZ;
            z++
        ) {

            const tile =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        tileSize - 0.04,
                        0.12,
                        tileSize - 0.04
                    ),
                    ceilingMaterial
                );


            tile.position.set(
                -19 +
                x * tileSize,

                6,

                -14 +
                z * tileSize
            );


            scene.add(
                tile
            );

        }

    }


    // ----------------------------
    // LYSRÖR
    // ----------------------------

    createCeilingLight(
    -10,
    6.08,
    -10,
    true
);

    createCeilingLight(
        0,
        6.08,
        -10
    );

    createCeilingLight(
        10,
        6.08,
        -10
    );


    createCeilingLight(
        -10,
        6.08,
        0
    );

    createCeilingLight(
        0,
        6.08,
        0
    );

    createCeilingLight(
        10,
        6.08,
        0
    );


    createCeilingLight(
        -10,
        6.08,
        10
    );

    createCeilingLight(
        0,
        6.08,
        10
    );

    createCeilingLight(
        10,
        6.08,
        10
    );

}


// ========================================
// STÖRRE HÄNGANDE LYSRÖR MED LJUS
// ========================================

function createCeilingLight(
    x,
    y,
    z,
    castsShadow = false
) {

    // ====================================
    // HELA LAMPAN
    // ====================================

    const lightGroup =
        new THREE.Group();

    lightGroup.position.set(
        x,
        y,
        z
    );

    scene.add(
        lightGroup
    );


    // ====================================
    // MATERIAL
    // ====================================

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.5,
            metalness: 0.75
        });

    const whiteMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xfff4dc,
            emissive: 0xffe8b8,
            emissiveIntensity: 1.8,
            roughness: 0.3
        });


    // ====================================
    // TAKFÄSTEN
    // ====================================

    const mountGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.18,
            0.18
        );

    const leftMount =
        new THREE.Mesh(
            mountGeometry,
            metalMaterial
        );

    leftMount.position.set(
        -1.0,
        0,
        0
    );

    lightGroup.add(
        leftMount
    );


    const rightMount =
        new THREE.Mesh(
            mountGeometry,
            metalMaterial
        );

    rightMount.position.set(
        1.0,
        0,
        0
    );

    lightGroup.add(
        rightMount
    );


    // ====================================
    // VAJER
    // ====================================

    const wireGeometry =
        new THREE.CylinderGeometry(
            0.035,
            0.035,
            0.75,
            8
        );

    const leftWire =
        new THREE.Mesh(
            wireGeometry,
            metalMaterial
        );

    leftWire.position.set(
        -1.0,
        -0.40,
        0
    );

    lightGroup.add(
        leftWire
    );


    const rightWire =
        new THREE.Mesh(
            wireGeometry,
            metalMaterial
        );

    rightWire.position.set(
        1.0,
        -0.40,
        0
    );

    lightGroup.add(
        rightWire
    );


    // ====================================
    // METALLHÖLJE
    // ====================================

    const metalTop =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.7,
                0.22,
                0.72
            ),
            metalMaterial
        );

    metalTop.position.set(
        0,
        -0.78,
        0
    );

    lightGroup.add(
        metalTop
    );


    // ====================================
    // LYSRÖR
    // ====================================

    const tube =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.11,
                0.11,
                2.45,
                16
            ),
            whiteMaterial
        );

    tube.rotation.z =
        Math.PI / 2;

    tube.position.set(
        0,
        -0.91,
        0
    );

    lightGroup.add(
        tube
    );


    // ====================================
    // ANDRA LYSRÖRET
    // ====================================

    const tube2 =
        tube.clone();

    tube2.position.z =
        0.22;

    lightGroup.add(
        tube2
    );


    // ====================================
    // METALLÄNDAR
    // ====================================

    const endCapGeometry =
        new THREE.CylinderGeometry(
            0.14,
            0.14,
            0.12,
            16
        );


    const leftCap =
        new THREE.Mesh(
            endCapGeometry,
            metalMaterial
        );

    leftCap.rotation.z =
        Math.PI / 2;

    leftCap.position.set(
        -1.25,
        -0.91,
        0
    );

    lightGroup.add(
        leftCap
    );


    const rightCap =
        new THREE.Mesh(
            endCapGeometry,
            metalMaterial
        );

    rightCap.rotation.z =
        Math.PI / 2;

    rightCap.position.set(
        1.25,
        -0.91,
        0
    );

    lightGroup.add(
        rightCap
    );


    // ====================================
    // LJUSKÄLLA
    // ====================================

    const pointLight =
    new THREE.PointLight(
        0xffe8b8,
        8,
        35,
        1.2
    );

    pointLight.position.set(
        0,
        -0.95,
        0
    );

lightGroup.add(pointLight);

// ====================================
// SHADOW LIGHT
// ====================================

pointLight.castShadow = false;



}



// ========================================
// DESK
// ========================================

function createDesk(
    x,
    y,
    z
) {


    // ========================================
    // MATERIAL
    // ========================================

    const woodMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x70452a,
            roughness: 0.8
        });

    const woodDarkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4a2b1a,
            roughness: 0.9
        });

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.45,
            metalness: 0.7
        });

    const blackMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.7
        });


    // ========================================
    // BORDSSKIVA
    // ========================================

    const top =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                5,
                0.4,
                2.5
            ),
            woodMaterial
        );

    top.position.set(
        x,
        2,
        z
    );

    scene.add(
        top
    );


    // ========================================
    // FRÄMRE BORDSKANT
    // ========================================

    const frontEdge =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                5.1,
                0.18,
                0.12
            ),
            woodDarkMaterial
        );

    frontEdge.position.set(
        x,
        1.82,
        z + 1.2
    );

    scene.add(
        frontEdge
    );


    // ========================================
    // BAKRE BORDSKANT
    // ========================================

    const backEdge =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                5.1,
                0.18,
                0.12
            ),
            woodDarkMaterial
        );

    backEdge.position.set(
        x,
        1.82,
        z - 1.2
    );

    scene.add(
        backEdge
    );


    // ========================================
    // METALLBEN
    // ========================================

    const legGeometry =
        new THREE.BoxGeometry(
            0.3,
            2,
            0.3
        );

    const legPositions = [
        [-2, 1, -0.9],
        [ 2, 1, -0.9],
        [-2, 1,  0.9],
        [ 2, 1,  0.9]
    ];


    for (
        const pos of legPositions
    ) {

        const leg =
            new THREE.Mesh(
                legGeometry,
                metalMaterial
            );

        leg.position.set(
            x + pos[0],
            pos[1],
            z + pos[2]
        );

        scene.add(
            leg
        );



    }


    // ========================================
// LÅDA UNDER BORDET
// ========================================

const drawer =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            1.5,
            0.55,
            1.0
        ),
        woodDarkMaterial
    );

drawer.position.set(
    x - 1.2,
    1.48,
    z + 0.25
);

scene.add(
    drawer
);


// ========================================
// LÅDFRONT
// ========================================

const drawerFront =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            1.55,
            0.58,
            0.12
        ),
        woodMaterial
    );

drawerFront.position.set(
    x - 1.2,
    1.48,
    z + 0.78
);

scene.add(
    drawerFront
);


// ========================================
// LÅDHANDTAG
// ========================================

const drawerHandle =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            0.5,
            0.10,
            0.10
        ),
        metalMaterial
    );

drawerHandle.position.set(
    x - 1.2,
    1.48,
    z + 0.87
);

scene.add(
    drawerHandle
);


    // ========================================
    // KABELHÅL
    // ========================================

    const cableHole =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.12,
                0.12,
                0.04,
                16
            ),
            blackMaterial
        );

    cableHole.rotation.x =
        Math.PI / 2;

    cableHole.position.set(
        x + 1.7,
        2.22,
        z - 0.7
    );

    scene.add(
        cableHole
    );


    // ========================================
    // GAMMAL DATOR
    // ========================================

    createComputer(
        x,
        2.3,
        z
    );

createDeskProps(
    x,
    2.3,
    z
);


    // ========================================
    // KONTORSSTOL
    // ========================================

    createOfficeChair(
        x,
        0,
        z + 2.2
    );

}


// ========================================
// HYG-INSPIRED OFFICE CHAIR
// ========================================

function createOfficeChair(
    x,
    y,
    z
) {

    // Om stol.obj inte är färdigladdad ännu
    // väntar vi tills modellen är klar.

    if (!chairModel) {

        pendingChairs.push({
            x: x,
            y: y,
            z: z
        });

        return;
    }

    addOBJChair(
        x,
        y,
        z
    );

}

function addOBJChair(
    x,
    y,
    z
) {

    const chair =
        chairModel.clone(true);

    chair.position.set(
        x,
        y,
        z
    );

    chair.scale.set(
        1,
        1,
        1
    );

    chair.rotation.y =
        Math.PI;

    scene.add(
        chair
    );


    // ====================================
    // SPARA STOLEN
    // ====================================

    officeChairs.push({
        object: chair,
        x: x,
        y: y,
        z: z,
        radius: 1.0,
        seatHeight: 1.0
    });

}

// ========================================
// CHAIR COLLISION
// ========================================

function updateChairCollision() {

    if (isSitting) {
        return;
    }

    for (const chair of officeChairs) {

        const dx =
            player.position.x -
            chair.x;

        const dz =
            player.position.z -
            chair.z;

        const distance =
            Math.sqrt(
                dx * dx +
                dz * dz
            );

        const minDistance =
            chair.radius + 0.45;

        if (
            distance < minDistance &&
            distance > 0.001
        ) {

            const pushX =
                dx / distance;

            const pushZ =
                dz / distance;

            player.position.x =
                chair.x +
                pushX *
                minDistance;

            player.position.z =
                chair.z +
                pushZ *
                minDistance;

        }

    }

}

// ========================================
// SIT ON CHAIR
// ========================================

function trySitOnChair() {

    // Om vi redan sitter
    // lämnar vi stolen
    if (isSitting) {

        standUpFromChair();

        return;
    }


    let closestChair = null;

    let closestDistance =
        Infinity;


    for (const chair of officeChairs) {

        const dx =
            player.position.x -
            chair.x;

        const dz =
            player.position.z -
            chair.z;

        const distance =
            Math.sqrt(
                dx * dx +
                dz * dz
            );


        if (
            distance < 2.2 &&
            distance < closestDistance
        ) {

            closestChair =
                chair;

            closestDistance =
                distance;

        }

    }


    if (!closestChair) {
        return;
    }


    sittingOnChair =
        closestChair;

    isSitting =
        true;


    // Placera spelaren mitt framför stolen
    player.position.x =
        closestChair.x;

    player.position.z =
        closestChair.z;


    // Sitt ner
    player.position.y =
        closestChair.y +
        0.35;

}

// ========================================
// STAND UP
// ========================================

function standUpFromChair() {

    if (!sittingOnChair) {
        return;
    }


    const chair =
        sittingOnChair;


    // Flytta spelaren lite framför stolen
    const forwardX =
        Math.sin(
            chair.object.rotation.y
        );

    const forwardZ =
        Math.cos(
            chair.object.rotation.y
        );


    player.position.x =
        chair.x +
        forwardX *
        1.2;

    player.position.z =
        chair.z +
        forwardZ *
        1.2;


    player.position.y =
        1;


    sittingOnChair =
        null;

    isSitting =
        false;

}


// ========================================
// DETAILED OFFICE DESK BARRIERS
// ========================================

function createDeskBarrier(
    x,
    y,
    z,
    rotation = 0
) {

    // ====================================
    // MATERIAL
    // ====================================

    const fabricMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xc8b89a,
            roughness: 1
        });

    const frameMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x756b5d,
            roughness: 0.8,
            metalness: 0.25
        });

    const footMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.6,
            metalness: 0.5
        });


    // ====================================
    // HELPER
    // ====================================

// ====================================
// JÄRNBENS HÖJD
// ====================================

const legHeight = 0.75;

    function createPanel(
    px,
    pz,
    width,
    depth,
    height = 3.5
) {

        // ----------------------------
        // BEIGE PANEL
        // ----------------------------

        const panel =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    height,
                    depth
                ),
                fabricMaterial
            );

        panel.position.set(
    px,
    y + legHeight + height / 2,
    pz
);

        panel.rotation.y =
            rotation;

        scene.add(
            panel
        );


        // ----------------------------
        // TOP EDGE
        // ----------------------------

        const top =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width + 0.12,
                    0.10,
                    depth + 0.08
                ),
                frameMaterial
            );

        top.position.set(
    px,
    y + legHeight + height + 0.05,
    pz
);

        top.rotation.y =
            rotation;

        scene.add(
            top
        );


        // ----------------------------
        // BOTTOM EDGE
        // ----------------------------

        const bottom =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width + 0.08,
                    0.08,
                    depth + 0.06
                ),
                frameMaterial
            );

        bottom.position.set(
    px,
    y + legHeight + 0.04,
    pz
);

        bottom.rotation.y =
            rotation;

        scene.add(
            bottom
        );

    }


    // ====================================
    // BARRIÄRERNAS POSITIONER
    // ====================================

    // Vi bygger ett U runt bordet.
    //
    // Framsidan lämnas öppen
    // eftersom stolen ska stå där.


    // ------------------------------------
    // VÄNSTER SIDA
    // ------------------------------------

    createPanel(
    x - 2.52,
    z,
    0.18,
    2.9
);


    // ------------------------------------
    // HÖGER SIDA
    // ------------------------------------

    createPanel(
    x + 2.52,
    z,
    0.18,
    2.9
);


    // ------------------------------------
    // BAKSIDA
    // ------------------------------------

    createPanel(
    x,
    z - 1.30,
    4.8,
    0.18
);


    // ====================================
// JÄRNBEN
// ====================================

const legMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        roughness: 0.55,
        metalness: 0.7
    });


// Järnbenen går från golvet
// upp till barriären


const legGeometry =
    new THREE.BoxGeometry(
        0.16,
        legHeight,
        0.16
    );

const legPositions = [

    [-2.35, -1.30],
    [-2.35,  1.30],

    [ 2.35, -1.30],
    [ 2.35,  1.30],

    [0, -1.30]

];


for (
    const pos of legPositions
) {

    const leg =
        new THREE.Mesh(
            legGeometry,
            legMaterial
        );

    leg.position.set(
        x + pos[0],
        y + legHeight / 2,
        z + pos[1]
    );

    leg.rotation.y =
        rotation;

    scene.add(
        leg
    );

}


    // ====================================
    // SMÅ FÄSTEN
    // ====================================

    const mountGeometry =
        new THREE.BoxGeometry(
            0.28,
            0.18,
            0.28
        );


    const mountPositions = [

    [-2.35, -1.30],
    [-2.35,  1.30],

    [ 2.35, -1.30],
    [ 2.35,  1.30]

];


    for (
        const pos of mountPositions
    ) {

        const mount =
            new THREE.Mesh(
                mountGeometry,
                frameMaterial
            );

        mount.position.set(
            x + pos[0],
            y + 0.20,
            z + pos[1]
        );

        mount.rotation.y =
            rotation;

        scene.add(
            mount
        );

    }

}


// ========================================
// OLD SCHOOL BLOCK COMPUTER
// ========================================

function createComputer(
    x,
    y,
    z
) {

    // Bordsskivans höjd
    y += 0.89;

    // ====================================
    // MATERIAL
    // ====================================

    const computerCaseMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xE5D3B3,
            roughness: 0.85
        });

    const computerDarkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x9c988d,
            roughness: 0.9
        });

    const screenMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x161918,
            roughness: 0.5
        });

    const screenGlassMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x24352f,
            roughness: 0.3,
            metalness: 0.05,
            emissive: 0x10251d,
            emissiveIntensity: 0.35
        });

    const blackMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xE5D3B3,
            roughness: 0.65
        });


    // ====================================
    // CRT-SKÄRM
    // ====================================

    const monitor =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.0,
                1.65,
                0.8
            ),
            computerCaseMaterial
        );

    monitor.position.set(
        x+ 0.1,
        y,
        z
    );

    scene.add(
        monitor
    );


    // ====================================
    // TJOCK FRAMKANT
    // ====================================

    const screenFrame =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.55,
                1.15,
                0.10
            ),
            computerDarkMaterial
        );

    screenFrame.position.set(
        x,
        y + 0.05,
        z + 0.43
    );

    scene.add(
        screenFrame
    );


    // ====================================
    // CRT-GLAS
    // ====================================

    const glass =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.28,
                0.88,
                0.06
            ),
            screenGlassMaterial
        );

    glass.position.set(
        x,
        y + 0.05,
        z + 0.50
    );

    scene.add(
        glass
    );


    // ====================================
    // SKÄRMENS NEDRE PANEL
    // ====================================

    const lowerPanel =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.55,
                0.30,
                0.12
            ),
            computerDarkMaterial
        );

    lowerPanel.position.set(
        x,
        y - 0.55,
        z + 0.46
    );

    scene.add(
        lowerPanel
    );


    // ====================================
    // POWER-KNAPP
    // ====================================

    const powerButton =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.08,
                0.08,
                0.04,
                12
            ),
            blackMaterial
        );

    powerButton.rotation.x =
        Math.PI / 2;

    powerButton.position.set(
        x + 0.52,
        y - 0.55,
        z + 0.55
    );

    scene.add(
        powerButton
    );


    // ====================================
    // LITEN LED
    // ====================================

    const led =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.08,
                0.05,
                0.03
            ),
            new THREE.MeshStandardMaterial({
                color: 0x55aa55,
                emissive: 0x55aa55,
                emissiveIntensity: 1
            })
        );

    led.position.set(
        x + 0.30,
        y - 0.55,
        z + 0.55
    );

    scene.add(
        led
    );


    // ====================================
    // DATORFOT
    // ====================================

    const stand =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.65,
                0.30,
                0.55
            ),
            computerDarkMaterial
        );

    stand.position.set(
        x,
        y - 0.95,
        z
    );

    scene.add(
        stand
    );


    // ====================================
    // GAMMAL DATORLÅDA
    // ====================================

    const tower =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.85,
                1.35,
                1.15
            ),
            computerCaseMaterial
        );

    tower.position.set(
        x + 1.80,
        y - 2.60,
        z - 0.15
    );

    scene.add(
        tower
    );


    // ====================================
    // CD / DISKETT-LIKNANDE FACK
    // ====================================

    const drive =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.55,
                0.10,
                0.04
            ),
            blackMaterial
        );

    drive.position.set(
        x + 1.80,
        y - 2.60,
        z - 0.15
    );

    scene.add(
        drive
    );





    // ====================================
    // TANGENTBORD
    // ====================================

    const keyboard =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.9,
                0.12,
                0.65
            ),
            blackMaterial
        );

    keyboard.position.set(
        x,
        y - 0.85,
        z + 0.95
    );

    keyboard.rotation.x =
        +0.08;

    scene.add(
        keyboard
    );


    // ====================================
    // TANGENTER
    // ====================================

    const keyMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xE5D3B3,
            roughness: 0.8
        });

    for (
        let row = 0;
        row < 3;
        row++
    ) {

        for (
            let col = 0;
            col < 9;
            col++
        ) {

            const key =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        0.13,
                        0.025,
                        0.10
                    ),
                    keyMaterial
                );

            key.position.set(
                x - 0.62 +
                col * 0.155,

                y - 0.77,

                z + 0.78 +
                row * 0.13
            );

            scene.add(
                key
            );

        }



    }

}

// ========================================
// DESK PROPS
// ========================================

function createDeskProps(
    x,
    y,
    z
) {

    // ====================================
    // MATERIAL
    // ====================================

    const blackMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x3b3b3b,
            roughness: 0.7
        });

    const darkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8
        });

    const whiteMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xe2dfd2,
            roughness: 0.9
        });

    const paperMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd6d0bd,
            roughness: 1
        });

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.45,
            metalness: 0.6
        });

    const cupMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xddd8c8,
            roughness: 0.8
        });


    // ====================================
    // MUSMATTA
    // ====================================

    const mousePad =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.2,
                0.035,
                0.8
            ),
            darkMaterial
        );

    mousePad.position.set(
        x + 1.25,
        y - 0.10,
        z + 0.75
    );

    scene.add(
        mousePad
    );


    // ====================================
    // MUS
    // ====================================

    const mouse =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18,
                12,
                8
            ),
            blackMaterial
        );

    mouse.scale.set(
        1,
        0.45,
        1.3
    );

    mouse.position.set(
        x + 1.25,
        y - 0.02,
        z + 0.75
    );

    scene.add(
        mouse
    );


    // ====================================
    // TANGENTBORD
    // ====================================

    const keyboard =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.8,
                0.10,
                0.65
            ),
            blackMaterial
        );

    keyboard.position.set(
        x - 0.25,
        y - 0.08,
        z + 0.85
    );

    scene.add(
        keyboard
    );


    // ====================================
    // PAPPER
    // ====================================

    const paper =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.8,
                0.025,
                1.1
            ),
            paperMaterial
        );

    paper.position.set(
        x - 1.65,
        y - 0.08,
        z + 0.65
    );

    paper.rotation.y =
        -0.18;

    scene.add(
        paper
    );


    // ====================================
    // KAFFEMUGG
    // ====================================

    const mug =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.25,
                0.22,
                0.45,
                16
            ),
            cupMaterial
        );

    mug.position.set(
        x + 1.75,
        y + 0.15,
        z - 0.65
    );

    scene.add(
        mug
    );


    // ====================================
    // MUGGÖRA
    // ====================================

    const handle =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                0.14,
                0.045,
                8,
                16,
                Math.PI
            ),
            cupMaterial
        );

    handle.rotation.z =
    Math.PI / 2;

    handle.position.set(
        x + 1.52,
        y + 0.15,
        z - 0.65
    );

    scene.add(
        handle
    );
    
    createOldPhone(
    x - 1.4,
    y + 0.15,
    z - 0.45
);

// ========================================
// OLD SCHOOL OFFICE PHONE
// ========================================

function createOldPhone(
    x,
    y,
    z
) {

    // ====================================
    // HELA TELEFONEN
    // ====================================

    const phoneGroup =
        new THREE.Group();

    phoneGroup.position.set(
        x-0.2,
        y-0.15,
        z
    );

    // Lutar telefonen uppåt
    phoneGroup.rotation.x =
        0.16;


    // ====================================
    // MATERIAL
    // ====================================

    const beigeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd8d0b5,
            roughness: 0.8
        });

    const darkBeigeMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xb0a68c,
            roughness: 0.85
        });

    const blackMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x252525,
            roughness: 0.65
        });

    const buttonMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x3b3b3b,
            roughness: 0.7
        });


    // ====================================
    // TELEFONBAS
    // ====================================

    const base =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.38,
                0.27,
                0.98
            ),
            beigeMaterial
        );

    base.position.set(
        0,
        0,
        0
    );

    phoneGroup.add(base);


    // ====================================
    // RUNDAD ÖVRE DEL
    // ====================================

    const topBody =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.28,
                0.22,
                0.82
            ),
            beigeMaterial
        );

    topBody.position.set(
        0,
        0.16,
        -0.02
    );

    phoneGroup.add(topBody);




    // ====================================
    // FRAMKANT
    // ====================================

    const frontEdge =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.32,
                0.08,
                0.08
            ),
            darkBeigeMaterial
        );

    frontEdge.position.set(
        0,
        0.15,
        0.44
    );

    phoneGroup.add(frontEdge);


    // ====================================
    // KNAPPAR
    // ====================================

    const buttonStartX =
        -0.13;

    const buttonStartZ =
        0.26;

    const buttonSpacingX =
        0.28;

    const buttonSpacingZ =
        0.21;


    for (
        let row = 0;
        row < 4;
        row++
    ) {

        for (
            let col = 0;
            col < 3;
            col++
        ) {

            const button =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.095,
                        0.095,
                        0.07,
                        12
                    ),
                    buttonMaterial
                );

            button.rotation.x =
                Math.PI / 2;

            button.position.set(
                buttonStartX +
                col * buttonSpacingX,

                0.25,

                buttonStartZ -
                row * buttonSpacingZ
            );

            phoneGroup.add(
                button
            );
        }
    }


    // ====================================
    // LURHÅLLARE
    // ====================================

    const holder =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.42,
                0.12,
                0.78
            ),
            darkBeigeMaterial
        );

    holder.position.set(
        -0.40,
        0.23,
        -0.03
    );

    phoneGroup.add(
        holder
    );


    // ====================================
    // TELEFONLUR
    // ====================================

    const handset =
        new THREE.Mesh(
            new THREE.CapsuleGeometry(
                0.14,
                0.70,
                6,
                12
            ),
            beigeMaterial
        );

    handset.rotation.x =
        Math.PI / 2;

    handset.position.set(
        -0.40,
        0.47,
        -0.03
    );

    phoneGroup.add(
        handset
    );


    // ====================================
    // ÖVRE LURDEL
    // ====================================

    const topGrip =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.22,
                12,
                8
            ),
            beigeMaterial
        );

    topGrip.scale.set(
        1,
        0.85,
        0.75
    );

    topGrip.position.set(
        -0.40,
        0.47,
        -0.48
    );

    phoneGroup.add(
        topGrip
    );


    // ====================================
    // NEDRE LURDEL
    // ====================================

    const bottomGrip =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.22,
                12,
                8
            ),
            beigeMaterial
        );

    bottomGrip.scale.set(
        1,
        0.85,
        0.75
    );

    bottomGrip.position.set(
        -0.40,
        0.47,
        0.42
    );

    phoneGroup.add(
        bottomGrip
    );


    // ====================================
    // HÖGTALARE
    // ====================================

    const speakerTop =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.105,
                0.105,
                0.035,
                12
            ),
            blackMaterial
        );

    speakerTop.rotation.x =
        Math.PI / 2;

    speakerTop.position.set(
        -0.40,
        0.50,
        -0.60
    );

    phoneGroup.add(
        speakerTop
    );


    const speakerBottom =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.105,
                0.105,
                0.035,
                12
            ),
            blackMaterial
        );

    speakerBottom.rotation.x =
        Math.PI / 2;

    speakerBottom.position.set(
        -0.40,
        0.50,
        0.54
    );

    phoneGroup.add(
        speakerBottom
    );


    // ====================================
    // LITEN KABEL
    // ====================================

    const cable =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                0.14,
                0.025,
                8,
                16,
                Math.PI
            ),
            blackMaterial
        );

    cable.rotation.x =
        Math.PI / 2;

    cable.position.set(
        -0.40,
        0.10,
        0.45
    );

    phoneGroup.add(
        cable
    );


    // ====================================
    // LÄGG TELEFONEN I SCENEN
    // ====================================

    scene.add(
        phoneGroup
    );
}
}

// ========================================
// OFFICE PERFORMANCE
// ========================================

function enableOfficeShadowObjects() {

    scene.traverse((object) => {

        if (!object.isMesh) return;

        // Kontoret behöver inte kasta skuggor
        // från varje liten detalj.
        object.castShadow = false;

        // Bara stora/viktiga objekt behöver
        // ta emot skuggor.
        object.receiveShadow = false;

    });

}


// ========================================
// KONTORSDETALJER – GOLV
// DALE AND JANSSON
// ========================================

function createOfficeFloorDetails() {

    // ====================================
    // MATERIAL
    // ====================================

    const cardboardMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xb88955,
            roughness: 0.95
        });

    const cardboardDarkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x795335,
            roughness: 1
        });

    const paperMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd8d2c0,
            roughness: 1
        });

    const trashMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.85
        });

    const trashDarkMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x292929,
            roughness: 0.9
        });

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.55,
            metalness: 0.55
        });


    // ====================================
    // HJÄLPFUNKTION
    // ====================================

    function addBox(
        x,
        y,
        z,
        width,
        height,
        depth,
        material,
        rotation = 0
    ) {

        const object =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    height,
                    depth
                ),
                material
            );

        object.position.set(
            x,
            y,
            z
        );

        object.rotation.y =
            rotation;

        object.castShadow = false;
        object.receiveShadow = false;

        scene.add(
            object
        );

        return object;
    }


    // ====================================
    // KARTONG
    // ====================================

    function createFloorBox(
        x,
        z,
        width,
        height,
        depth,
        rotation = 0
    ) {

        const box =
            addBox(
                x,
                height / 2,
                z,
                width,
                height,
                depth,
                cardboardMaterial,
                rotation
            );


        // Tejp på toppen
        addBox(
            x,
            height + 0.012,
            z,
            0.12,
            0.025,
            depth * 0.85,
            cardboardDarkMaterial,
            rotation
        );

        return box;
    }


    // ====================================
    // KARTONGHÖGAR
    // ====================================

    createFloorBox(
        -15.5,
        -10.8,
        1.5,
        0.8,
        1.2,
        -0.08
    );

    createFloorBox(
        -14.7,
        -10.25,
        1.1,
        0.6,
        0.9,
        0.12
    );

    createFloorBox(
        12.8,
        -9.5,
        1.4,
        0.75,
        1.1,
        -0.15
    );

    createFloorBox(
        13.5,
        -8.9,
        0.8,
        0.5,
        0.7,
        0.08
    );


    // ====================================
    // LITEN LÅDA
    // ====================================

    createFloorBox(
        -10.8,
        11.8,
        1.0,
        0.55,
        0.75,
        0.18
    );

    createFloorBox(
        11.7,
        11.0,
        1.3,
        0.65,
        0.9,
        -0.10
    );


    // ====================================
    // PAPPERSHÖG PÅ GOLVET
    // ====================================

    function createPaperPile(
        x,
        z,
        rotation = 0
    ) {

        for (
            let i = 0;
            i < 4;
            i++
        ) {

            const paper =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        0.7,
                        0.018,
                        0.45
                    ),
                    paperMaterial
                );

            paper.position.set(
                x +
                (Math.random() - 0.5) * 0.08,

                0.025 +
                i * 0.018,

                z +
                (Math.random() - 0.5) * 0.08
            );

            paper.rotation.y =
                rotation +
                (Math.random() - 0.5) * 0.12;

            scene.add(
                paper
            );
        }
    }


    createPaperPile(
        -7.5,
        -11.5,
        0.15
    );

    createPaperPile(
        7.8,
        10.8,
        -0.12
    );


    // ====================================
    // SOPPÅTUNNA
    // ====================================

    function createOfficeTrashCan(
        x,
        z,
        rotation = 0
    ) {

        const trashCan =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.42,
                    0.34,
                    0.75,
                    16
                ),
                trashMaterial
            );

        trashCan.position.set(
            x,
            0.375,
            z
        );

        trashCan.rotation.y =
            rotation;

        trashCan.castShadow = true;
        trashCan.receiveShadow = true;

        scene.add(
            trashCan
        );


        // Övre kant

        const rim =
            new THREE.Mesh(
                new THREE.TorusGeometry(
                    0.40,
                    0.045,
                    8,
                    16
                ),
                trashDarkMaterial
            );

        rim.position.set(
            x,
            0.76,
            z
        );

        scene.add(
            rim
        );


        // Liten metallring

        const bottomRing =
            new THREE.Mesh(
                new THREE.TorusGeometry(
                    0.34,
                    0.025,
                    8,
                    16
                ),
                metalMaterial
            );

        bottomRing.position.set(
            x,
            0.04,
            z
        );

        scene.add(
            bottomRing
        );
    }


    createOfficeTrashCan(
        -17.2,
        4.5,
        0.2
    );

    createOfficeTrashCan(
        16.8,
        -2.5,
        -0.15
    );


    // ====================================
    // LITEN PAPPERSKORG / LÅDA
    // ====================================

    addBox(
        -3.8,
        0.25,
        12.4,
        0.9,
        0.5,
        0.7,
        cardboardDarkMaterial,
        0.1
    );

    addBox(
        -3.8,
        0.515,
        12.4,
        0.65,
        0.025,
        0.45,
        cardboardMaterial,
        0.1
    );


    // ====================================
    // LITEN METALLÅDA
    // ====================================

    addBox(
        5.4,
        0.3,
        -12.0,
        1.0,
        0.6,
        0.7,
        metalMaterial,
        -0.08
    );


    // ====================================
    // TVÅ SMÅ LÅDOR OVANPÅ
    // ====================================

    addBox(
        5.15,
        0.68,
        -12.0,
        0.45,
        0.18,
        0.42,
        cardboardMaterial,
        0.05
    );

    addBox(
        5.65,
        0.70,
        -11.95,
        0.38,
        0.22,
        0.35,
        cardboardDarkMaterial,
        -0.08
    );

}


// ========================================
// SKAPA KONTORSDETALJER
// ========================================

createOfficeFloorDetails();


// ========================================
// VÄGGDETALJER – DALE AND JANSSON
// ========================================

function createOfficeWallDetails() {

    // ====================================
    // MATERIAL
    // ====================================

    const woodMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x70452a,
            roughness: 0.85
        });

    const darkWoodMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4a2d1a,
            roughness: 0.9
        });

    const paperMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xe2dcc9,
            roughness: 1
        });

    const whiteMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xf1f0e9,
            roughness: 0.9
        });

    const blackMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x292929,
            roughness: 0.8
        });

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.5,
            metalness: 0.6
        });

    const redMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b4a42,
            roughness: 0.85
        });

    const blueMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x526878,
            roughness: 0.85
        });

    const greenMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x536b52,
            roughness: 0.85
        });


    // ====================================
    // HJÄLPFUNKTION
    // ====================================

    function addBox(
        parent,
        x,
        y,
        z,
        width,
        height,
        depth,
        material
    ) {

        const object =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    width,
                    height,
                    depth
                ),
                material
            );

        object.position.set(
            x,
            y,
            z
        );

        object.castShadow = true;
        object.receiveShadow = true;

        parent.add(
            object
        );

        return object;
    }


    // ====================================
    // ANSLAGSTAVLA
    // ====================================

    function createNoticeBoard(
        x,
        y,
        z,
        rotationY,
        width = 3.4,
        height = 1.8
    ) {

        const group =
            new THREE.Group();

        group.position.set(
            x,
            y,
            z
        );

        group.rotation.y =
            rotationY;

        scene.add(
            group
        );


        // --------------------------------
        // TRÄRAM
        // --------------------------------

        addBox(
            group,
            0,
            0,
            0,
            width,
            height,
            0.12,
            woodMaterial
        );


        // --------------------------------
        // MÖRK INNERSIDA
        // --------------------------------

        addBox(
            group,
            0,
            0,
            0.075,
            width - 0.25,
            height - 0.25,
            0.04,
            darkWoodMaterial
        );


        // --------------------------------
        // PAPPER
        // --------------------------------

        const papers = [
            [-0.95, 0.35, 0.55, 0.42, paperMaterial, -0.08],
            [-0.25, 0.48, 0.48, 0.55, redMaterial, 0.05],
            [ 0.50, 0.30, 0.58, 0.40, paperMaterial, -0.04],
            [ 1.05,-0.30, 0.48, 0.62, blueMaterial, 0.08],
            [ 0.30,-0.45, 0.65, 0.40, paperMaterial, -0.07],
            [-0.70,-0.35, 0.45, 0.55, greenMaterial, 0.04]
        ];


        for (
            const p of papers
        ) {

            const paper =
                addBox(
                    group,
                    p[0],
                    p[1],
                    0.12,
                    p[2],
                    p[3],
                    0.035,
                    p[4]
                );

            paper.rotation.z =
                p[5];
        }


        // --------------------------------
        // SMÅ NÅLAR
        // --------------------------------

        const pinMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xc8a44a,
                roughness: 0.5,
                metalness: 0.5
            });


        const pinPositions = [
            [-0.95, 0.35],
            [-0.25, 0.48],
            [ 0.50, 0.30],
            [ 1.05,-0.30],
            [ 0.30,-0.45],
            [-0.70,-0.35]
        ];


        for (
            const pos of pinPositions
        ) {

            const pin =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.055,
                        8,
                        8
                    ),
                    pinMaterial
                );

            pin.position.set(
                pos[0],
                pos[1],
                0.16
            );

            group.add(
                pin
            );
        }


        // --------------------------------
        // LITEN HYLLA UNDER
        // --------------------------------

        addBox(
            group,
            0,
            -height / 2 - 0.12,
            0,
            width - 0.25,
            0.12,
            0.30,
            woodMaterial
        );
    }


    // ====================================
    // WHITEBOARD
    // ====================================

    function createWhiteboard(
        x,
        y,
        z,
        rotationY,
        width = 3.8,
        height = 1.7
    ) {

        const group =
            new THREE.Group();

        group.position.set(
            x,
            y,
            z
        );

        group.rotation.y =
            rotationY;

        scene.add(
            group
        );


        // --------------------------------
        // RAM
        // --------------------------------

        addBox(
            group,
            0,
            0,
            0,
            width,
            height,
            0.10,
            metalMaterial
        );


        // --------------------------------
        // VIT YTA
        // --------------------------------

        addBox(
            group,
            0,
            0,
            0.065,
            width - 0.20,
            height - 0.20,
            0.035,
            whiteMaterial
        );


        // --------------------------------
        // HORISONTELL LINJE
        // --------------------------------

        addBox(
            group,
            0,
            0.25,
            0.09,
            width - 0.45,
            0.025,
            0.02,
            blueMaterial
        );


        // --------------------------------
        // VERTIKALA LINJER
        // --------------------------------

        addBox(
            group,
            -0.75,
            0,
            0.09,
            0.025,
            height - 0.45,
            0.02,
            blueMaterial
        );

        addBox(
            group,
            0.05,
            0,
            0.09,
            0.025,
            height - 0.45,
            0.02,
            blueMaterial
        );

        addBox(
            group,
            0.85,
            0,
            0.09,
            0.025,
            height - 0.45,
            0.02,
            blueMaterial
        );


        // --------------------------------
        // MAGNETER
        // --------------------------------

        const magnetPositions = [
            [-1.20, 0.55],
            [ 1.25, 0.48],
            [ 1.10,-0.50]
        ];


        for (
            const pos of magnetPositions
        ) {

            const magnet =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        0.07,
                        8,
                        8
                    ),
                    redMaterial
                );

            magnet.position.set(
                pos[0],
                pos[1],
                0.13
            );

            group.add(
                magnet
            );
        }


        // --------------------------------
        // PENNHYLLA
        // --------------------------------

        addBox(
            group,
            0,
            -height / 2 - 0.12,
            0,
            width - 0.25,
            0.10,
            0.25,
            metalMaterial
        );
    }


    // ====================================
    // DALE AND JANSSON SKYLT
    // ====================================

    function createCompanySign(
        x,
        y,
        z,
        rotationY
    ) {

        const group =
            new THREE.Group();

        group.position.set(
            x,
            y,
            z
        );

        group.rotation.y =
            rotationY;

        scene.add(
            group
        );


        // --------------------------------
        // SKYLT
        // --------------------------------

        addBox(
            group,
            0,
            0,
            0,
            5.8,
            1.25,
            0.16,
            darkWoodMaterial
        );


        // --------------------------------
        // LJUSARE INNERSKYLT
        // --------------------------------

        addBox(
            group,
            0,
            0,
            0.095,
            5.35,
            0.85,
            0.035,
            woodMaterial
        );


        // --------------------------------
        // BOKSTÄVER
        // --------------------------------

        function addLetter(
            x,
            width
        ) {

            addBox(
                group,
                x,
                0,
                0.14,
                width,
                0.50,
                0.035,
                paperMaterial
            );
        }


        // Stiliserad text:
        // DALE AND JANSSON

        addLetter(-2.15, 0.25);
        addLetter(-1.78, 0.25);
        addLetter(-1.41, 0.25);

        addLetter(-0.65, 0.25);
        addLetter(-0.28, 0.25);
        addLetter(0.09, 0.25);

        addLetter(0.75, 0.25);
        addLetter(1.12, 0.25);
        addLetter(1.49, 0.25);
        addLetter(1.86, 0.25);
    }





    // ====================================
    // VÄNSTER VÄGG
    // ====================================

    createNoticeBoard(
        -19.34,
        3.65,
        2.0,
        Math.PI / 2,
        3.1,
        1.7
    );


    createWhiteboard(
        -19.34,
        3.55,
        -4.0,
        Math.PI / 2,
        3.5,
        1.6
    );


    // ====================================
    // HÖGER VÄGG
    // ====================================

    createNoticeBoard(
        19.34,
        3.65,
        4.0,
        -Math.PI / 2,
        3.1,
        1.7
    );


    createWhiteboard(
        19.34,
        3.55,
        -1.5,
        -Math.PI / 2,
        3.5,
        1.6
    );

}


// ========================================
// SKAPA VÄGGDETALJER
// ========================================

createOfficeWallDetails();


// ========================================
// DALE AND JANSSON
// SEPARAT KORRIDOR
// ========================================

let corridor;


// ========================================
// SKAPA KORRIDOR
// ========================================

function createCorridor() {

    // ====================================
    // HUVUD-GROUP
    // ====================================

    corridor =
        new THREE.Group();

    // ====================================
    // KORRIDORENS POSITION
    // ====================================
    //
    // Korridoren ligger UTANFÖR kontoret.
    //
    // Ändra bara dessa värden om vi senare
    // vill flytta hela korridoren.
    //

    corridor.position.set(
        0,
        0,
        26.8
    );

    scene.add(
        corridor
    );


    // ====================================
    // MATERIAL
    // ====================================

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xd8d2c2,
            roughness: 0.9
        });

    const trimMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b8170,
            roughness: 0.8
        });


    // ====================================
    // MATTA
    // ====================================

    const carpetTexture =
        new THREE.TextureLoader().load(
            "./assets/matta2.png"
        );

    carpetTexture.wrapS =
        THREE.RepeatWrapping;

    carpetTexture.wrapT =
        THREE.RepeatWrapping;

    carpetTexture.repeat.set(
        3,
        12
    );

    carpetTexture.colorSpace =
        THREE.SRGBColorSpace;


    const carpetMaterial =
        new THREE.MeshStandardMaterial({
            map: carpetTexture,
            roughness: 1
        });


    const carpet =
    new THREE.Mesh(
        new THREE.BoxGeometry(
            9,
            0.08,
            24
        ),
            carpetMaterial
        );

    carpet.position.set(
        0,
        0.04,
        0
    );

    carpet.receiveShadow = true;

    corridor.add(
        carpet
    );


    // ====================================
    // VÄNSTER VÄGG
    // ====================================

    createCorridorWall(
        -3.5,
        3,
        0,
        0.25,
        6,
        24,
        wallMaterial
    );


    // ====================================
    // HÖGER VÄGG
    // ====================================

    createCorridorWall(
        3.5,
        3,
        0,
        0.25,
        6,
        24,
        wallMaterial
    );


    // ====================================
    // GOLVLISTER
    // ====================================

    createCorridorTrim(
        -3.32,
        0.18,
        0,
        0.12,
        24
    );

    createCorridorTrim(
        3.32,
        0.18,
        0,
        0.12,
        24
    );


    // ====================================
    // TAKLISTER
    // ====================================

    createCorridorTrim(
        -3.32,
        5.82,
        0,
        0.12,
        24
    );

    createCorridorTrim(
        3.32,
        5.82,
        0,
        0.12,
        24
    );


    // ====================================
    // TAK
    // ====================================

    const ceilingMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xe9eed4,
            roughness: 0.9
        });


    const ceiling =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                7,
                0.18,
                24
            ),
            ceilingMaterial
        );

    ceiling.position.set(
        0,
        6,
        0
    );

    corridor.add(
        ceiling
    );


    // ====================================
    // LAMPOR
    // ====================================

    createCorridorLight(
        0,
        5.8,
        -8
    );

    createCorridorLight(
        0,
        5.8,
        0
    );

    createCorridorLight(
        0,
        5.8,
        8
    );


    // ====================================
    // TAVLOR
    // ====================================

    createCorridorPicture(
        -3.30,
        3.2,
        -7
    );

    createCorridorPicture(
        -3.30,
        3.2,
        1
    );

    createCorridorPicture(
        3.30,
        3.2,
        -3
    );

    createCorridorPicture(
        3.30,
        3.2,
        6
    );





    // ====================================
    // EXTRA VÄGGDETALJER
    // ====================================

    createCorridorWallPanel(
        -3.32,
        2.7,
        -10
    );

    createCorridorWallPanel(
        3.32,
        2.7,
        -10
    );

}


// ========================================
// KORRIDORVÄGG
// ========================================

function createCorridorWall(
    x,
    y,
    z,
    width,
    height,
    depth,
    material
) {

    const wall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            material
        );

    wall.position.set(
        x,
        y,
        z
    );

    wall.castShadow = true;
    wall.receiveShadow = true;

    corridor.add(
        wall
    );

}


// ========================================
// KORRIDORLIST
// ========================================

function createCorridorTrim(
    x,
    y,
    z,
    width,
    length
) {

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x8b8170,
            roughness: 0.8
        });


    const trim =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                0.16,
                length
            ),
            material
        );

    trim.position.set(
        x,
        y,
        z
    );

    corridor.add(
        trim
    );

}


// ========================================
// KORRIDORLJUS
// ========================================

function createCorridorLight(
    x,
    y,
    z
) {

    const group =
        new THREE.Group();

    group.position.set(
        x,
        y,
        z
    );

    corridor.add(
        group
    );


    // ====================================
    // MATERIAL
    // ====================================

    const metalMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.5,
            metalness: 0.7
        });


    const whiteMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xfff4dc,
            emissive: 0xffe8b8,
            emissiveIntensity: 1.8,
            roughness: 0.3
        });


    // ====================================
    // LAMPA
    // ====================================

    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                2.4,
                0.18,
                0.55
            ),
            metalMaterial
        );

    body.position.y =
        -0.05;

    group.add(
        body
    );


    // ====================================
    // LYSRÖR
    // ====================================

    const tube =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.09,
                0.09,
                2.1,
                16
            ),
            whiteMaterial
        );

    tube.rotation.z =
        Math.PI / 2;

    tube.position.y =
        -0.16;

    group.add(
        tube
    );


    // ====================================
    // LJUSKÄLLA
    // ====================================

    const light =
        new THREE.PointLight(
            0xffe8b8,
            6,
            20
        );

    light.position.y =
        -0.25;

    group.add(
        light
    );

}


// ========================================
// KORRIDORTAVLA
// ========================================

function createCorridorPicture(
    x,
    y,
    z
) {

    const frameMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x5b4634,
            roughness: 0.8
        });


    const pictureMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xc9bda7,
            roughness: 0.9
        });


    // ====================================
    // RAM
    // ====================================

    const frame =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.10,
                1.5,
                2.2
            ),
            frameMaterial
        );

    frame.position.set(
        x,
        y,
        z
    );

    corridor.add(
        frame
    );


    // ====================================
    // BILD
    // ====================================

    const picture =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.05,
                1.2,
                1.9
            ),
            pictureMaterial
        );

    picture.position.set(
        x +
        (x < 0 ? 0.06 : -0.06),

        y,

        z
    );

    corridor.add(
        picture
    );

}


// ========================================
// EXTRA VÄGGPANEL
// ========================================

function createCorridorWallPanel(
    x,
    y,
    z
) {

    const frameMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x756b5d,
            roughness: 0.8
        });


    const panelMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xc8b89a,
            roughness: 1
        });


    const panel =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.08,
                1.8,
                2.8
            ),
            panelMaterial
        );

    panel.position.set(
        x,
        y,
        z
    );

    corridor.add(
        panel
    );


    // Övre list

    const top =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.12,
                0.10,
                2.95
            ),
            frameMaterial
        );

    top.position.set(
        x,
        y + 0.95,
        z
    );

    corridor.add(
        top
    );


    // Nedre list

    const bottom =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.12,
                0.10,
                2.95
            ),
            frameMaterial
        );

    bottom.position.set(
        x,
        y - 0.95,
        z
    );

    corridor.add(
        bottom
    );

}

createCorridor();



// ========================================
// RESIZE
// ========================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);


// ========================================
// GAME LOOP
// ========================================

function animate() {

    requestAnimationFrame(
        animate
    );


    // Uppdatera spelaren
    updatePlayer();

updateChairCollision();

updateOfficeDoor();



// ====================================
// FIRST PERSON CAMERA
// ====================================

camera.position.x =
    player.position.x;

if (sittingOnChair) {

    camera.position.y =
        player.position.y + 2.70;

} else {

    camera.position.y =
        player.position.y + 2.0;

}

camera.position.z =
    player.position.z;

camera.rotation.order =
    "YXZ";

camera.rotation.y =
    cameraYaw;

camera.rotation.x =
    cameraPitch;

// ====================================
// RENDERA SPELET
// ====================================

renderer.render(
    scene,
    camera
);

}

// ========================================
// UPDATE DOOR
// ========================================

function updateOfficeDoor() {

    if (
        !officeDoor ||
        !officeDoorAnimating
    ) {
        return;
    }


    const targetRotation =
        officeDoorOpen
            ? -Math.PI / 2
            : 0;


    officeDoor.rotation.y =
        THREE.MathUtils.lerp(
            officeDoor.rotation.y,
            targetRotation,
            0.15
        );


    if (
        Math.abs(
            officeDoor.rotation.y -
            targetRotation
        ) < 0.01
    ) {

        officeDoor.rotation.y =
            targetRotation;

        officeDoorAnimating =
            false;

    }

}



animate();
