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
// LIGHT
// ========================================

const light =
    new THREE.HemisphereLight(
        0xffffff,
        0x555555,
        2
    );

scene.add(light);




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
    // OFFICE BOUNDARIES
    // ====================================

    const limitX = 18;
    const limitZ = 13;


    player.position.x =
        Math.max(
            -limitX,
            Math.min(
                limitX,
                player.position.x
            )
        );


    player.position.z =
        Math.max(
            -limitZ,
            Math.min(
                limitZ,
                player.position.z
            )
        );

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

// Stora öppna bruna hyllor
// Bakvägg (Roterade 0 radianer, placerade längs z = -14.5)

createLargeShelf(15, 0, -14.0, 0);

// Vänster vägg (Roterade PI / 2, placerade längs x = -19.5)


createLargeShelf(-19.0, 0, 7.5, Math.PI / 2);

// Höger vägg (Roterade -PI / 2, placerade längs x = 19.5)

createLargeShelf(19.0, 0, -6.5, -Math.PI / 2);

createLargeShelf(19.0, 0, 12, -Math.PI / 2);





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
    // SIDOSTYCKEN
    // ====================================

    const leftSide =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.35,
                4.2,
                0.55
            ),
            woodMaterial
        );

    leftSide.position.set(
        -2.25,
        2.1,
        0
    );

    shelf.add(leftSide);


    const rightSide =
        leftSide.clone();

    rightSide.position.x =
        2.25;

    shelf.add(rightSide);


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
                    4.85,
                    0.25,
                    0.65
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
                4.85,
                4.2,
                0.18
            ),
            darkWoodMaterial
        );

    back.position.set(
        0,
        2.1,
        -0.28
    );

    shelf.add(back);


    // ====================================
    // LÄGG TILL I SCENEN
    // ====================================

    scene.add(
        shelf
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
        -10
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
// CEILING LIGHT
// ========================================

function createCeilingLight(
    x,
    y,
    z
) {

    // ----------------------------
    // SJÄLVA LYSRÖRET
    // ----------------------------

    const lightMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2
        });


    const tube =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.5,
                0.08,
                0.5
            ),
            lightMaterial
        );


    tube.position.set(
        x,
        y,
        z
    );


    scene.add(
        tube
    );

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
        -0.08;

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
