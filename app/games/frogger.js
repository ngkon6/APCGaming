import APCMini from "../class/APCMini.js"

const map = (x, in_min, in_max, out_min, out_max) => (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;

const apc = new APCMini();
apc.blackout();
process.on("SIGINT", () => {
    apc.blackout();
    process.exit(0);
});

const startButtons = [0x1b, 0x1c, 0x23, 0x24];
const time = {start: 0, end: 0};

const lanes = [
    {speed: 0, updated: 0, cars: [1, 4]},
    {speed: 0, updated: 0, cars: [3, 6]},
    {speed: 0, updated: 0, cars: [0, 2, 5]},
    {speed: 0, updated: 0, cars: [1, 4, 6]},
    {speed: 0, updated: 0, cars: [2, 5]}
];

const frog = {x: 3, y: 0};

let gameOver = false;
let startMenu = true;
let trafficSpeed = 500;
let now = 0;

apc.on("track-button-pressed", e => {
    if (startMenu || frog.y >= 7) return;

    if (e == 4 && frog.y < 7) frog.y++;
    else if (e == 5 && frog.y > 0) frog.y--;
    else if (e == 6 && frog.x > 0) frog.x--;
    else if (e == 7 && frog.x < 7) frog.x++;
});
apc.on("fader-change", e => {
    if (e.fader != 8 || !startMenu) return;

    trafficSpeed = map(e.value, 0, 127, 750, 100);
    for (let i in apc.sceneLaunchButtons) apc.sceneLaunchButtons[7 - i] = (i / 8 * 127 <= e.value) ? APCMini.buttonState.ON : APCMini.buttonState.OFF;
    apc.update();
});
apc.on("pad-pressed", e => {
    if (startMenu && startButtons.includes(e)) {
        startMenu = false;
        for (const i of [4, 5, 6, 7]) apc.trackButtons[i] = APCMini.buttonState.ON;
        for (const i of startButtons) apc.pads[i].state = APCMini.state.BRIGHTNESS_100;

        for (const lane of lanes) lane.speed = trafficSpeed + (Math.random() -.5) * (trafficSpeed / 5);
        time.start = new Date().getTime();

        update();
        setInterval(update, 20);
        console.log(`\x1b[32mStarting with \x1b[33m${Math.round(trafficSpeed)}ms\x1b[32m traffic move interval!\x1b[0m`);
    }
});

const update = () => {
    if (gameOver) return;

    now = new Date().getTime();
    for (let i=0; i<lanes.length; i++) {
        // collision detection, always
        for (let j=0; j<lanes[i].cars.length; j++) {
            if (frog.x == lanes[i].cars[j] && frog.y == i + 1) {
                gameOver = true;
                break;
            }
        }

        // lane position updating, only every x milliseconds
        if (now - lanes[i].updated < lanes[i].speed) continue;

        lanes[i].updated = now;
        const movement = (i % 2 == 0) ? 1 : -1;

        for (let j=0; j<lanes[i].cars.length; j++) {
            lanes[i].cars[j] += movement;
            
            if (lanes[i].cars[j] > 7) lanes[i].cars[j] = 0;
            else if (lanes[i].cars[j] < 0) lanes[i].cars[j] = 7;
        }
    }

    for (const pad of apc.pads) pad.color = APCMini.color.BLACK;

    for (let i=56; i<64; i++) apc.pads[i].color = (frog.y >= 7) ? APCMini.color.GREEN : APCMini.color.LIGHT_BLUE;
    apc.pads[frog.y * 8 + frog.x].color = APCMini.color.APPLE_GREEN;

    for (let i=0; i<lanes.length; i++) {
        const y = i + 1;
        for (const lane of lanes[i].cars) {
            apc.pads[y * 8 + lane].color = (gameOver) ? APCMini.color.RED_ORANGE : APCMini.color.WHITE;
            apc.pads[y * 8 + lane].state = (gameOver || frog.y >= 7) ? APCMini.state.BREATHING_2 : APCMini.state.BRIGHTNESS_100;
        }
    }

    apc.update();

    if (gameOver) {
        time.end = new Date().getTime();

        const t = ((time.end - time.start) / 1000).toFixed(1);
        let timeMessage = `\x1b[33m${t}\x1b[31m `;
        timeMessage += (t == 1) ? "second" : "seconds";

        console.warn(`\x1b[31mGame over! You survived ${timeMessage}!\x1b[0m`);
        process.exit(1);
    } else if (frog.y >= 7) {
        time.end = new Date().getTime();

        const t = ((time.end - time.start) / 1000).toFixed(1);
        let timeMessage = `\x1b[33m${t}\x1b[32m `;
        timeMessage += (t == 1) ? "second" : "seconds";

        console.warn(`\x1b[32mWell done! You crossed the road in ${timeMessage}!\x1b[0m`);
        process.exit(0);
    }
};

for (const i of startButtons) {
    apc.pads[i].color = APCMini.color.APPLE_GREEN;
    apc.pads[i].state = APCMini.state.BREATHING_2;
}
apc.update();