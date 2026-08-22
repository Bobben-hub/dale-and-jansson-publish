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
