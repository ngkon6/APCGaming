import readline from "node:readline";
import { ChildProcess, fork } from "node:child_process";
import { join } from "node:path";

import { getOutputs } from "easymidi";

const isAPCMiniConnected = () => {
    for (const output of getOutputs()) {
        if (output.includes("APC mini mk2")) return true;
    }

    return false;
}

const games = [{
    name: "Snake",
    file: "snake.js",
    notes: [
        "[▴] Move up",
        "[▾] Move down",
        "[◂] Move left",
        "[▸] Move right",
        "", "Adjust tick interval with fader #9",
        "Press any green button to start!"
    ]
}, {
    name: "Tetris",
    file: "tetris.js",
    notes: [
        "[▴] Rotate",
        "[▾] Soft drop",
        "[◂] Move left",
        "[▸] Move right",
        "", "Adjust tick interval with fader #9",
        "Press any blue button to start!"
    ]
}];

const rl = readline.createInterface(process.stdin, process.stdout);
/** @type {ChildProcess} */
let child;

const listGames = () => {
    console.log("You can play the games below:\n");

    for (const game of games) {
        console.log(`→ ${game.name}`);
    }
    console.log("\x1b[30mor type 'exit' to exit\x1b[0m");
};

const prompt = () => {
    rl.question("\nPlease enter the name of a game: ", answer => {
        if (answer.toLowerCase() === "exit") process.exit(0);

        let targetGameIndex = -1;
        for (let i=0; i<games.length; i++) {
            if (answer.toLowerCase() === games[i].name.toLowerCase()) {
                targetGameIndex = i;
                break;
            }
        }
    
        if (targetGameIndex > -1) {
            console.log(`Starting ${games[targetGameIndex].name}...\n`);
            for (const note of games[targetGameIndex].notes)
                console.log(`\x1b[31m▋\x1b[0m  ${note}`);
            console.log();

            child = fork(join(import.meta.dirname, "games", games[targetGameIndex].file));
            child.once("exit", () => {
                listGames();
                prompt();
            });
        } else {
            console.log("That is not an existing game.");
            prompt();
        }
    });
};

console.log(`
\x1b[31m▋\x1b[0m      ___    ____  ______   ______                _              \x1b[31m▋\x1b[0m
\x1b[31m▋\x1b[0m     /   |  / __ \\/ ____/  / ____/___ _____ ___  (_)___  ____ _  \x1b[31m▋\x1b[0m
\x1b[31m▋\x1b[0m    / /| | / /_/ / /      / / __/ __ \`/ __ \`__ \\/ / __ \\/ __ \`/  \x1b[31m▋\x1b[0m
\x1b[31m▋\x1b[0m   / ___ |/ ____/ /___   / /_/ / /_/ / / / / / / / / / / /_/ /   \x1b[31m▋\x1b[0m
\x1b[31m▋\x1b[0m  /_/  |_/_/    \\____/   \\____/\\__,_/_/ /_/ /_/_/_/ /_/\\__, /    \x1b[31m▋\x1b[0m
\x1b[31m▋\x1b[0m                                                      /____/     \x1b[31m▋\x1b[0m
\n`);

if (!isAPCMiniConnected()) {
    console.error("\x1b[33mThere is no APC Mini Mk2 connected.\nPlease connect one to proceed!\x1b[0m");
    process.exit(1);
}

console.log("Welcome to APC Gaming!");

listGames();
prompt();
