import APCMini from "../class/APCMini.js";

const map = (x, in_min, in_max, out_min, out_max) => (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;

const apc = new APCMini();
apc.blackout();
process.on("SIGINT", () => {
    apc.blackout();
    process.exit(0);
});

const startButtons = [0x1b, 0x1c, 0x23, 0x24];
const stacks = [{
    on: true, x: 0, v: false, size: 5
}, {
    on: false, x: 0, v: true, size: 4
}, {
    on: false, x: 0, v: false, size: 3
}, {
    on: false, x: 0, v: true, size: 2
}, {
    on: false, x: 0, v: false, size: 2
}, {
    on: false, x: 0, v: true, size: 1
}, {
    on: false, x: 0, v: false, size: 1
}, {
    on: false, x: 0, v: true, size: 1
}];
const time = {start: 0, end: 0};

let gameOver = false;
let startMenu = true;
let noLongerStacking = false;
let updateInterval = 100;
let row = 0;

apc.on("track-button-pressed", e => {
    if (e == 5 && !startMenu) {
        if (row > 0) {
            const xs1 = stacks[row].x;
            const xe1 = stacks[row].x + stacks[row].size - 1;
            const xs2 = stacks[row - 1].x;
            const xe2 = stacks[row - 1].x + stacks[row - 1].size - 1;

            noLongerStacking = !(xs1 <= xe2 && xe1 >= xs2);
            if (noLongerStacking) {
                update();
                return;
            }
        }

        if (++row >= 8) update();
    }
});
apc.on("fader-change", e => {
    if (e.fader != 8 || !startMenu) return;

    updateInterval = map(e.value, 0, 127, 400, 40);
    for (let i in apc.sceneLaunchButtons)
        apc.sceneLaunchButtons[7 - i] = (i / 8 * 127 <= e.value) ? APCMini.buttonState.ON : APCMini.buttonState.OFF;
    apc.update();
});
apc.on("pad-pressed", e => {
    if (startMenu && startButtons.includes(e)) {
        startMenu = false;
        apc.trackButtons[5] = APCMini.buttonState.ON;
        for (const i of startButtons) apc.pads[i].state = APCMini.state.BRIGHTNESS_100;

        update();
        setInterval(update, Math.round(updateInterval));
        console.log(`\x1b[32mStarting with \x1b[33m${Math.round(updateInterval)}ms\x1b[32m update interval!\x1b[0m`);
        time.start = new Date().getTime();
    }
});

const update = () => {
    if (gameOver) return;

    if (!noLongerStacking && row < 8) {
        if (stacks[row].on) {
            stacks[row].x += stacks[row].v ? 1 : -1;
            if (stacks[row].x <= 0) {
                stacks[row].x = 0;
                stacks[row].v = true;
            } else if (stacks[row].x >= 8 - stacks[row].size) {
                stacks[row].x = 8 - stacks[row].size;
                stacks[row].v = false;
            }
        } else stacks[row].on = true;
    }

    if (noLongerStacking) gameOver = true;

    for (const pad of apc.pads) pad.color = APCMini.color.BLACK;
    for (let i in stacks) {
        if (!stacks[i].on) continue;

        for (let j=0; j<stacks[i].size; j++) {
            const index = i * 8 + j + stacks[i].x;
            apc.pads[index].color = gameOver ? APCMini.color.RED : (row >= 8) ? APCMini.color.GREEN : APCMini.color.RED_ORANGE;
            apc.pads[index].state = (gameOver || row >= 8) ? APCMini.state.BREATHING_2 : APCMini.state.BRIGHTNESS_100;
        }
    }

    apc.update();

    if (gameOver) {
        time.end = new Date().getTime();

        const rowMessage = `\x1b[33m${row + 1}\x1b[31m`;
        const timeMessage = `\x1b[33m${Math.round((time.end - time.start) / 1000)}\x1b[31m seconds`;

        console.warn(`\x1b[31mGame over! You made it to row ${rowMessage} in ${timeMessage}!\x1b[0m`);
        process.exit(1);
    } else if (row >= 8) {
        time.end = new Date().getTime();

        const timeMessage = `\x1b[33m${Math.round((time.end - time.start) / 1000)}\x1b[32m seconds`;

        console.warn(`\x1b[32mWell done! You made it all the way to the top in ${timeMessage}!\x1b[0m`);
        process.exit(0);
    }
};

for (const i of startButtons) {
    apc.pads[i].color = APCMini.color.ORANGE;
    apc.pads[i].state = APCMini.state.BREATHING_2;
}
apc.update();
