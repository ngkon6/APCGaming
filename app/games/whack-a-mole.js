import APCMini from "../class/APCMini.js"

const apc = new APCMini();
apc.blackout();
process.on("SIGINT", () => {
    apc.blackout();
    process.exit(0);
});

let score = 0;

apc.on("pad-pressed", b => {
    if (b > 63) return;

    if (apc.pads[b].color === APCMini.color.GREEN) {
        score++;
        apc.sceneLaunchButtons[8 - score] = APCMini.buttonState.ON;
        apc.pads[b].color = APCMini.color.BLACK;
        apc.update();

        if (score >= 8) {
            const checkMark = [40,32,24,16,33,25,17,9,26,18,10,2,11,19,27,35,44,36,28,20,29,37,45,53,62,54,46,38,47,55,63];
            for (const i of checkMark) {
                apc.pads[i].color = APCMini.color.SEA_GREEN;
                apc.pads[i].state = APCMini.state.BREATHING_2;
            }
            apc.update();
            process.exit(0);
        }
    } else if (apc.pads[b].color === APCMini.color.RED) {
        apc.sceneLaunchButtons[8 - score] = APCMini.buttonState.OFF;
        apc.update();
        score = Math.max(0, score - 1);
    }
});

const loop = () => {
    if (Math.random() < 0.022) {
        let button;
        while (1) {
            button = Math.floor(Math.random() * 64);
            if (apc.pads[button].color === 0) break;
        }
        const whackMeOrNot = (Math.random() > 0.5) ? APCMini.color.GREEN : APCMini.color.RED;
        apc.pads[button].color = whackMeOrNot;
        setTimeout(() => apc.pads[button].color = APCMini.color.BLACK, 325);
    }

    apc.update();
};

setInterval(loop, 17);
