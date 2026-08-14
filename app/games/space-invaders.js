import APCMini from "../class/APCMini.js"

const map = (x, in_min, in_max, out_min, out_max) => (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;

const apc = new APCMini();
apc.blackout();
process.on("SIGINT", () => {
    apc.blackout();
    process.exit(0);
});

const enemyColors = [
    APCMini.color.RED,
    APCMini.color.BLUE,
    APCMini.color.YELLOW,
    APCMini.color.CYAN,
    APCMini.color.MAGENTA
];
const startButtons = [0x1b, 0x1c, 0x23, 0x24];
const time = {start: 0, end: 0};
/** @type {{x: number, y: number, color: number}[]} */
const enemies = [];
/** @type {{x: number, y: number}[]} */
const shots = [];
/** @type {{x: number, y: number, stage: number}[]} */
const explosions = [];

let gameOver = false;
let startMenu = true;
let enemyDropRate = 500;
let now = 0;
let lastShotFired = 0;
let lastEnemyDrop = 0;
let lastEnemySpawn = 0;
let lastParticleUpdate = 0;
let playerX = 3;
let score = 0;
let enemySpawnRate = enemyDropRate * 2;
const shotCooldown = enemyDropRate * 1.4;
const particleUpdateRate = enemyDropRate / 2.6;

apc.on("track-button-pressed", e => {
    if (startMenu) return;

    if (e == 4 && now - lastShotFired >= shotCooldown) {
        lastShotFired = now;
        shots.push({x: playerX, y: 1});
    }
    else if (e == 6 && playerX > 0) playerX--;
    else if (e == 7 && playerX < 7) playerX++;
});
apc.on("fader-change", e => {
    if (e.fader != 8 || !startMenu) return;

    enemyDropRate = map(e.value, 0, 127, 1000, 100);
    for (let i in apc.sceneLaunchButtons) apc.sceneLaunchButtons[7 - i] = (i / 8 * 127 <= e.value) ? APCMini.buttonState.ON : APCMini.buttonState.OFF;
    apc.update();
});
apc.on("pad-pressed", e => {
    if (startMenu && startButtons.includes(e)) {
        startMenu = false;
        for (const i of [4, 6, 7]) apc.trackButtons[i] = APCMini.buttonState.ON;
        for (const i of startButtons) apc.pads[i].state = APCMini.state.BRIGHTNESS_100;

        update();
        setInterval(update, 20);
        console.log(`\x1b[32mStarting with \x1b[33m${Math.round(enemyDropRate)}ms\x1b[32m enemy drop interval!\x1b[0m`);
        lastEnemyDrop = time.start = new Date().getTime();
    }
});

const update = () => {
    if (gameOver) return;

    now = new Date().getTime();
    if (now - lastEnemyDrop >= enemyDropRate) {
        lastEnemyDrop = now;
        enemySpawnRate -= 3;

        for (let i=0; i<enemies.length; i++) {
            if (--enemies[i].y <= 0) gameOver = true;
        }
    }
    if (now - lastEnemySpawn >= enemySpawnRate) {
        lastEnemySpawn = now;
        enemies.push({
            x: Math.floor(Math.random() * 8),
            y: 7,
            color: enemyColors[Math.floor(Math.random() * enemyColors.length)]
        });
    }

    for (let i=0; i<enemies.length;) {
        let lastScore = score;
        for (let j=0; j<shots.length;) {
            if (enemies[i].x === shots[j].x && enemies[i].y <= shots[j].y) {
                score++;
                shots.splice(j, 1);
                explosions.push({x: enemies[i].x, y: enemies[i].y, stage: 0});
            } else j++;
        }
        if (lastScore !== score) enemies.splice(i, 1);
        else i++;
    }

    if (now - lastParticleUpdate >= particleUpdateRate) {
        lastParticleUpdate = now;

        for (let i=0; i<explosions.length;) {
            if (++explosions[i].stage >= 2) explosions.splice(i, 1);
            else i++;
        }

        for (let i=0; i<shots.length;) {
            if (++shots[i].y >= 8) shots.splice(i, 1);
            else i++;
        }
    }

    for (const pad of apc.pads) pad.color = APCMini.color.BLACK;
    apc.pads[playerX].color = gameOver ? APCMini.color.RED_ORANGE : APCMini.color.APPLE_GREEN;

    for (const shot of shots) apc.pads[shot.y * 8 + shot.x].color = gameOver ? APCMini.color.RED : APCMini.color.WHITE;
    for (const explosion of explosions) {
        const tile = explosion.y * 8 + explosion.x;
        const tiles = (explosion.stage === 0) ? [
            tile - 1, tile - 8, tile + 8, tile + 1
        ] : [
            tile - 9, tile + 7, tile - 7, tile + 9
        ];
        if (explosion.x === 0) tiles.splice(0, 1 + explosion.stage);
        else if (explosion.x === 7) tiles.splice(3 - explosion.stage, 1 + explosion.stage);

        for (const tile of tiles) apc.pads[Math.min(63, Math.max(0, tile))].color = APCMini.color.WARM_WHITE;
    }
    for (const enemy of enemies) {
        apc.pads[enemy.y * 8 + enemy.x].color = gameOver ? APCMini.color.RED_ORANGE : enemy.color;
        apc.pads[enemy.y * 8 + enemy.x].state = gameOver ? APCMini.state.BREATHING_2 : APCMini.state.BRIGHTNESS_100;
    }

    apc.update();

    if (gameOver) {
        time.end = new Date().getTime();

        let scoreMessage = `\x1b[33m${score}\x1b[31m `;
        scoreMessage += (score == 1) ? "point" : "points";
        const timeMessage = `\x1b[33m${Math.round((time.end - time.start) / 1000)}\x1b[31m seconds`;

        console.warn(`\x1b[31mGame over! You earned ${scoreMessage} in ${timeMessage}!\x1b[0m`);
        process.exit(1);
    }
};

for (const i of startButtons) {
    apc.pads[i].color = APCMini.color.PURPLE;
    apc.pads[i].state = APCMini.state.BREATHING_2;
}
apc.update();
