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

camera.position.set(
    0,
    5,
    10
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

const floorGeometry =
    new THREE.PlaneGeometry(
        100,
        100
    );

const floorMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x777777
    });

const floor =
    new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

floor.rotation.x =
    -Math.PI / 2;

scene.add(floor);


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

scene.add(player);


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

    // ----------------------------
    // GOLV
    // ----------------------------

    const floorGeometry =
        new THREE.BoxGeometry(
            40,
            0.5,
            30
        );

    const floorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x555555
        });

    const officeFloor =
        new THREE.Mesh(
            floorGeometry,
            floorMaterial
        );

    officeFloor.position.set(
        0,
        -0.25,
        0
    );

    scene.add(
        officeFloor
    );


    // ----------------------------
    // VÄGGAR
    // ----------------------------

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xe0d8c8
        });


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
    createWall(
        0,
        3,
        15,
        40,
        6,
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


    // ----------------------------
    // SKRIVBORD
    // ----------------------------

    createDesk(
        -8,
        0,
        -5
    );

    createDesk(
        0,
        0,
        -5
    );

    createDesk(
        8,
        0,
        -5
    );


    createDesk(
        -8,
        0,
        5
    );

    createDesk(
        0,
        0,
        5
    );

    createDesk(
        8,
        0,
        5
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

    renderer.render(
        scene,
        camera
    );

}

animate();
