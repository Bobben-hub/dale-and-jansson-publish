import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


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
// FLOOR
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

let lookActive = false;
let lookPointerId = null;

let lastLookX = 0;
let lastLookY = 0;


window.addEventListener(
    "pointerdown",
    (event) => {

        // Vänstra sidan är joystick
        if (
            event.clientX <
            window.innerWidth / 2
        ) {
            return;
        }

        lookActive = true;

        lookPointerId =
            event.pointerId;

        lastLookX =
            event.clientX;

        lastLookY =
            event.clientY;

    }
);


window.addEventListener(
    "pointermove",
    (event) => {

        if (
            !lookActive ||
            event.pointerId !==
            lookPointerId
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


        cameraYaw -=
            deltaX *
            lookSensitivity;

        cameraPitch -=
            deltaY *
            lookSensitivity;


        // Begränsa hur långt upp/ned
        // man kan titta

        cameraPitch =
            Math.max(
                -Math.PI / 2,
                Math.min(
                    Math.PI / 2,
                    cameraPitch
                )
            );

    }
);


window.addEventListener(
    "pointerup",
    (event) => {

        if (
            event.pointerId ===
            lookPointerId
        ) {

            lookActive = false;
            lookPointerId = null;

        }

    }
);


window.addEventListener(
    "pointercancel",
    (event) => {

        if (
            event.pointerId ===
            lookPointerId
        ) {

            lookActive = false;
            lookPointerId = null;

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
// UPDATE PLAYER
// ========================================

function updatePlayer() {

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

createOfficeWindows();

createOfficeDoor();

createCeiling();

    // ========================================
    // SKRIVBORD
    // ========================================

    createDesk(-8, 0, -5);
    createDesk(0, 0, -5);
    createDesk(8, 0, -5);

    createDesk(-8, 0, 5);
    createDesk(0, 0, 5);
    createDesk(8, 0, 5);

}

// ========================================
// OFFICE FLOOR
// ========================================

function createOfficeFloor() {

    // ========================================
    // GOLV
    // ========================================

    const floorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x4b4b4b,
            roughness: 0.75,
            metalness: 0.05
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
    // GOLVPLATTOR
    // ========================================

    const tileMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.85
        });

    const tileSize = 2;

    for (
        let x = -19;
        x < 20;
        x += tileSize
    ) {

        for (
            let z = -14;
            z < 15;
            z += tileSize
        ) {

            const tile =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        1.94,
                        0.04,
                        1.94
                    ),
                    tileMaterial
                );

            tile.position.set(
                x,
                0.02,
                z
            );

            scene.add(
                tile
            );

        }

    }

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
            color: 0xd8d0c0,
            roughness: 0.9
        });

    const panelMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xc8c0b2,
            roughness: 1
        });

    const trimMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x8b8172,
            roughness: 0.8
        });


    // ========================================
    // VÄGGAR
    // ========================================

    // Bakvägg
    createWall(
        0,
        3,
        -15,
        40,
        6,
        0.5,
        wallMaterial
    );

    // Framvägg
    // ========================================
// FRAMVÄGG MED DÖRRÖPPNING
// ========================================

// Vänster del
createWall(
    -11.8,
    3,
    15,
    16.4,
    6,
    0.5,
    wallMaterial
);

// Höger del
createWall(
    11.8,
    3,
    15,
    16.4,
    6,
    0.5,
    wallMaterial
);

// Vägg ovanför dörren
createWall(
    0,
    5.1,
    15,
    7.3,
    1.8,
    0.5,
    wallMaterial
);

    // Vänster vägg
    createWall(
        -20,
        3,
        0,
        0.5,
        6,
        30,
        wallMaterial
    );

    // Höger vägg
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
    // GOLVLISTER
    // ========================================

    // Bak
    createWall(
        0,
        0.25,
        -14.70,
        39.5,
        0.35,
        0.12,
        trimMaterial
    );

    // Fram
    createWall(
        0,
        0.25,
        14.70,
        39.5,
        0.35,
        0.12,
        trimMaterial
    );

    // Vänster
    createWall(
        -19.70,
        0.25,
        0,
        0.12,
        0.35,
        29.5,
        trimMaterial
    );

    // Höger
    createWall(
        19.70,
        0.25,
        0,
        0.12,
        0.35,
        29.5,
        trimMaterial
    );


    // ========================================
    // VÄGGPANELER
    // ========================================

    // ----------------------------
    // BAKVÄGG
    // ----------------------------

    for (
        let x = -18;
        x <= 18;
        x += 4
    ) {

        createWall(
            x,
            2.6,
            -14.70,
            3.7,
            4.6,
            0.06,
            panelMaterial
        );

    }


    // ----------------------------
    // FRAMVÄGG
    // ----------------------------

    for (
        let x = -18;
        x <= 18;
        x += 4
    ) {

        createWall(
            x,
            2.6,
            14.70,
            3.7,
            4.6,
            0.06,
            panelMaterial
        );

    }


    // ----------------------------
    // VÄNSTER VÄGG
    // ----------------------------

    for (
        let z = -13;
        z <= 13;
        z += 4
    ) {

        createWall(
            -19.70,
            2.6,
            z,
            0.06,
            4.6,
            3.7,
            panelMaterial
        );

    }


    // ----------------------------
    // HÖGER VÄGG
    // ----------------------------

    for (
        let z = -13;
        z <= 13;
        z += 4
    ) {

        createWall(
            19.70,
            2.6,
            z,
            0.06,
            4.6,
            3.7,
            panelMaterial
        );

    }


    // ========================================
    // ÖVRE VÄGGLISTER
    // ========================================

    // Bakvägg
    createWall(
        0,
        5.25,
        -14.68,
        39.5,
        0.18,
        0.10,
        trimMaterial
    );

    // Framvägg
    createWall(
        0,
        5.25,
        14.68,
        39.5,
        0.18,
        0.10,
        trimMaterial
    );

    // Vänster vägg
    createWall(
        -19.68,
        5.25,
        0,
        0.10,
        0.18,
        29.5,
        trimMaterial
    );

    // Höger vägg
    createWall(
        19.68,
        5.25,
        0,
        0.10,
        0.18,
        29.5,
        trimMaterial
    );

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
                color: 0xcfcfcf,
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
            color: 0xd8d8d8,
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

    const woodMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x70452a
        });


    // Bordsskiva
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


    // Ben
    const legGeometry =
        new THREE.BoxGeometry(
            0.3,
            2,
            0.3
        );

    const legPositions = [
        [-2, 1, -0.9],
        [2, 1, -0.9],
        [-2, 1, 0.9],
        [2, 1, 0.9]
    ];


    for (
        const pos of legPositions
    ) {

        const leg =
            new THREE.Mesh(
                legGeometry,
                woodMaterial
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


    // ----------------------------
    // GAMMAL DATOR
    // ----------------------------

    createComputer(
        x,
        2.3,
        z
    );

}


// ========================================
// OLD COMPUTER
// ========================================

function createComputer(
    x,
    y,
    z
) {

    const computerMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x777777
        });


    // Skärm
    const screen =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.8,
                1.5,
                0.6
            ),
            computerMaterial
        );

    screen.position.set(
        x,
        y,
        z
    );

    scene.add(
        screen
    );


    // Skärmglas
    const glass =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.4,
                1.05,
                0.08
            ),
            new THREE.MeshStandardMaterial({
                color: 0x222222
            })
        );

    glass.position.set(
        x,
        y,
        z + 0.32
    );

    scene.add(
        glass
    );


    // Tangentbord
    const keyboard =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.8,
                0.15,
                0.7
            ),
            computerMaterial
        );

    keyboard.position.set(
        x,
        2.15,
        z + 1
    );

    scene.add(
        keyboard
    );

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
    
    updateOfficeDoor();



// ====================================
// FIRST PERSON CAMERA
// ====================================

camera.position.x =
    player.position.x;

camera.position.y =
    player.position.y + 0.6;

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
