<script lang="ts">
    import { onMount } from "svelte";
    import resizeToFit from "intrinsic-scale";
    import { Animator } from "$lib/framework";
    import { easeOutExpo, rotPoint, intoNum } from "$lib/utils";
    import { Player, Color } from "$lib/player";
    import { page } from "$app/state";
    import { fly, scale as scaleTransition } from "svelte/transition";
    import Button from "$lib/components/Button.svelte";
    import { goto } from "$app/navigation";

    class Points extends Animator<number> {
        constructor(value: number) {
            super(value, easeOutExpo);
        }
        get target(): number {
            return super.target;
        }
        set target(newValue: number) {
            super.animateTo(newValue, 1000);
        }
    }

    class Property extends Animator<number> {
        constructor(value: number) {
            super(0, easeOutExpo);
            // properties animate from 0 by default
            this.target = value;
        }
        get target(): number {
            return super.target;
        }
        set target(newValue: number) {
            super.animateTo(newValue, 800);
        }
    }

    function newCell(
        cell: { type: Color; points: number } | { type: "empty" },
    ): Cell {
        if (cell.type === "empty") {
            return { type: "empty" };
        }
        return {
            type: cell.type,
            points: new Points(cell.points),
            opacity: new Property(1),
            offset: new Property(5),
        };
    }

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let scale: number = 1;
    let GRID_SIZE = intoNum(page.url.searchParams.get("gridSize") ?? "", 5);
    const GRID_SCALE = 5 / GRID_SIZE;
    const CELL_SIZE = GRID_SCALE * 100;
    const BORDER_SIZE = 12;
    const CORNER_RADIUS = 16;
    const DOT_RADIUS = GRID_SCALE * 6;
    const SPREAD_RADIUS = GRID_SCALE * 14;
    let NUM_PLAYERS = intoNum(page.url.searchParams.get("numPlayers") ?? "", 2);
    type ActiveCell = {
        type: Color;
        points: Points;
        opacity: Property;
        offset: Property;
    };
    type Cell = { type: "empty" } | ActiveCell;
    let grid: Cell[][] = $state([]);
    let next: Color = new Color(1);
    let turn: Color = $state(new Color(0));
    let count = $state(0);
    let prevUpdate = performance.now();
    let mouseX: number, mouseY: number;
    let won = $state(false);
    let showWinner = $state(false);
    const players: Player[] = $derived(
        Array.from(
            { length: NUM_PLAYERS },
            (_, i) =>
                new Player(
                    i,
                    grid.reduce(
                        (acc, row) =>
                            acc +
                            row.filter(
                                (cell) =>
                                    cell.type !== "empty" &&
                                    cell.type.index === i,
                            ).length,
                        0,
                    ),
                    grid.reduce(
                        (acc, row) =>
                            acc +
                            row.reduce(
                                (acc, cell) =>
                                    acc +
                                    (cell.type !== "empty" &&
                                    cell.type.index === i
                                        ? cell.points.target
                                        : 0),
                                0,
                            ),
                        0,
                    ),
                ),
        ),
    );
    const activePlayers = $derived(
        players.filter((player) => count < NUM_PLAYERS || player.score > 0),
    );

    $effect(() => {
        if (turn.index >= 0)
            canvas.dispatchEvent(
                new MouseEvent("mousemove", {
                    bubbles: true,
                    clientX: mouseX,
                    clientY: mouseY,
                }),
            );
    });

    $effect(() => {
        console.log(
            `COUNT: ${count}\nWON: ${won}\nACTIVE PLAYERS: ${activePlayers.length}\nTURN: ${turn.index}`,
        );
        if (
            turn.index >= 0 &&
            count > NUM_PLAYERS &&
            !won &&
            activePlayers.length === 1
        ) {
            console.log("ok");
            setTimeout(() => {
                won = true;
                setTimeout(() => {
                    showWinner = true;
                }, 250);
            }, 1000);
        }
    });

    $effect(() => {
        if (won) {
            canvas.style.transform = "scale(0.75)";
        } else {
            canvas.style.transform = "scale(1)";
        }
    });

    onMount(() => {
        resetGrid();
        // Update scaling to render canvas in hd
        let oldWidth = canvas.width;
        let oldHeight = canvas.height;
        let { width, height } = resizeToFit(
            "contain",
            { width: canvas.clientWidth, height: canvas.clientHeight },
            { width: canvas.width, height: canvas.height },
        );
        const dpr = devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        let ratio = Math.min(
            canvas.clientWidth / oldWidth,
            canvas.clientHeight / oldHeight,
        );
        ctx = canvas.getContext("2d")!;
        scale = ratio * dpr;
        ctx.scale(scale, scale);

        /* EVENT LISTENERS */

        canvas.addEventListener("mousemove", handleMouse);
        canvas.addEventListener("mousedown", handleMouse);
        canvas.addEventListener("mouseup", handleMouse);

        canvas.addEventListener("click", (event) => {
            if (won) return;
            const { x, y } = getMousePos(event);
            const current = turn;
            turn = new Color(-1);
            let clicked = false;
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    let cell = grid[row][col];
                    if (current.index < 0) continue;
                    if (count > current.index && cell.type === "empty")
                        continue;
                    if (
                        cell.type !== "empty" &&
                        cell.type.index !== current.index
                    )
                        continue;
                    let tlx = col * CELL_SIZE + BORDER_SIZE;
                    let tly = row * CELL_SIZE + BORDER_SIZE;
                    let brx = tlx + CELL_SIZE - BORDER_SIZE;
                    let bry = tly + CELL_SIZE - BORDER_SIZE;
                    // Check if mouse in bounds
                    if (x >= tlx && x <= brx && y >= tly && y <= bry) {
                        clicked = true;
                        if (cell.type === "empty") {
                            grid[row][col] = newCell({
                                type: current,
                                points: 3,
                            });
                            nextTurn();
                            break;
                        }
                        cell.points.target++;
                        if (cell.points.target === 4) {
                            setTimeout(solveGrid, 300);
                        } else {
                            nextTurn();
                        }
                        break;
                    }
                }
            }
            if (!clicked) turn = current;
        });

        // Start rendering
        window.requestAnimationFrame(render);
    });

    let direction = 1;

    function newGame() {
        const CASCADE_DELAY = 50;
        grid.forEach((row) =>
            row.forEach((cell, i) => {
                if (cell.type === "empty") return;
                setTimeout(() => {
                    cell.opacity.target = 0;
                    cell.offset.target = 0;
                }, CASCADE_DELAY * i);
            }),
        );
        setTimeout(
            () => {
                resetGrid();
                won = false;
                showWinner = false;
                count = 0;
                turn = new Color(0);
                next = new Color(1);
            },
            200 + CASCADE_DELAY * GRID_SIZE,
        );
    }

    function resetGrid() {
        grid = Array.from({ length: GRID_SIZE }, (_, i) =>
            Array(GRID_SIZE).fill({ type: "empty" }),
        );
    }

    function nextTurn() {
        setTimeout(() => {
            do {
                turn = next;
                next = new Color((turn.index + 1) % NUM_PLAYERS);
            } while (players[turn.index].score === 0 && count >= NUM_PLAYERS);
            count++;
            grid = [...grid];
        }, 300);
    }

    function render() {
        /* UPDATE STATE */
        Animator.updateAll(performance.now() - prevUpdate);
        prevUpdate = performance.now();

        /* DRAW NEW STATE */
        drawBg();
        drawGrid();

        /* RENDER NEXT FRAME */
        window.requestAnimationFrame(render);
    }

    function getMousePos(event: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        return { x: mouseX, y: mouseY };
    }

    function handleMouse(event: MouseEvent) {
        ({ x: mouseX, y: mouseY } = getMousePos(event));
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                let cell = grid[row][col];
                if (cell.type === "empty") continue;
                let tlx = col * CELL_SIZE + BORDER_SIZE;
                let tly = row * CELL_SIZE + BORDER_SIZE;
                let brx = tlx + CELL_SIZE - BORDER_SIZE;
                let bry = tly + CELL_SIZE - BORDER_SIZE;
                // Check if mouse in bounds
                if (
                    mouseX >= tlx &&
                    mouseX <= brx &&
                    mouseY >= tly &&
                    mouseY <= bry &&
                    !won
                ) {
                    // update to hover position
                    if (
                        cell.type.index === turn.index &&
                        cell.offset.target !== 0
                    )
                        cell.offset.target = event.buttons & 1 ? 2 : 8;
                } else {
                    cell.offset.target = 5;
                }
            }
        }
    }

    function upgradeCell(row: number, col: number, color: Color) {
        let cell = grid[row][col];
        if (cell.type === "empty") {
            grid[row][col] = {
                type: color,
                points: new Points(1),
                opacity: new Property(1),
                offset: new Property(4),
            };
        } else {
            cell.type = color;
            if (cell.points.target < 4) cell.points.target += 1;
        }
    }

    function drawBg() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Fill background
        ctx.fillStyle = "#9c8b7d";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw cells
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                const padding = BORDER_SIZE / 2;

                // Draw cell shadow
                ctx.fillStyle = "#8c7c69";
                ctx.beginPath();
                ctx.roundRect(
                    x + BORDER_SIZE,
                    y + BORDER_SIZE - 1.5,
                    CELL_SIZE - BORDER_SIZE,
                    CELL_SIZE - BORDER_SIZE,
                    CORNER_RADIUS,
                );

                // Draw cell highlight
                ctx.fillStyle = "#c7b7a6";
                ctx.beginPath();
                ctx.roundRect(
                    x + BORDER_SIZE,
                    y + BORDER_SIZE + 1.5,
                    CELL_SIZE - BORDER_SIZE,
                    CELL_SIZE - BORDER_SIZE,
                    CORNER_RADIUS,
                );

                ctx.fill();
                // Draw main cell
                ctx.fillStyle = "#bdac98";
                ctx.beginPath();
                ctx.roundRect(
                    x + BORDER_SIZE,
                    y + BORDER_SIZE,
                    CELL_SIZE - BORDER_SIZE,
                    CELL_SIZE - BORDER_SIZE,
                    CORNER_RADIUS,
                );
                ctx.fill();
            }
        }
    }

    //$inspect(grid);

    function solveGrid(i: number = 0) {
        let solved = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                let cell = grid[row][col];
                if (cell.type === "empty") continue;
                cell.opacity.target = 1; // prevent fading issues
                cell.offset.target = 5; // prevent flying squares
                if (cell.points.target < 4) continue;
                solved = false;
                // Explode cell
                cell.points.target = 6;
                cell.opacity.target = 0;
                cell.offset.target = 0;
                setTimeout(() => {
                    grid[row][col] = { type: "empty" };
                }, 200);
                setTimeout(() => {
                    // Set the neighbors
                    if (row > 0) {
                        upgradeCell(row - 1, col, cell.type);
                    }
                    if (row < GRID_SIZE - 1) {
                        upgradeCell(row + 1, col, cell.type);
                    }
                    if (col > 0) {
                        upgradeCell(row, col - 1, cell.type);
                    }
                    if (col < GRID_SIZE - 1) {
                        upgradeCell(row, col + 1, cell.type);
                    }
                }, 200);
            }
        }
        if (!solved)
            setTimeout(() => solveGrid(i + 1), 500); // allows for chain reactions
        else {
            nextTurn();
        }
    }

    function drawGrid() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (grid[row][col].type === "empty") continue;
                drawSquare(
                    col * CELL_SIZE + BORDER_SIZE,
                    row * CELL_SIZE + BORDER_SIZE,
                    CELL_SIZE - BORDER_SIZE,
                    grid[row][col] as ActiveCell,
                );
            }
        }
    }

    function drawSquare(x: number, y: number, size: number, cell: ActiveCell) {
        ctx.save();
        // Render shadow
        ctx.fillStyle = cell.type.opacity(cell.opacity.value).shadow;
        ctx.beginPath();
        ctx.roundRect(x, y + 1.5, size, size, CORNER_RADIUS);
        ctx.fill();
        // Render square
        ctx.fillStyle = cell.type.opacity(cell.opacity.value).primary;
        ctx.beginPath();
        ctx.roundRect(x, y - cell.offset.value, size, size, CORNER_RADIUS);
        ctx.clip();
        ctx.fill();
        // Render dots
        let points: Array<{ x: number; y: number; opacity: number }> = [];
        let centerX = (2 * x + size) / 2;
        let centerY = (2 * y + size) / 2 - cell.offset.value;
        if (cell.points.value <= 2) {
            // 1-2 circles
            points.push({
                x: centerX + SPREAD_RADIUS * (cell.points.value - 1),
                y: centerY,
                opacity: 1,
            });
            points.push({
                x: centerX - SPREAD_RADIUS * (cell.points.value - 1),
                y: centerY,
                opacity: 1,
            });
        } else if (cell.points.value <= 3) {
            // 3 circles
            points.push({
                x: centerX + SPREAD_RADIUS,
                y: centerY + SPREAD_RADIUS * (cell.points.value - 2),
                opacity: 1,
            });
            points.push({
                x: centerX - SPREAD_RADIUS,
                y: centerY + SPREAD_RADIUS * (cell.points.value - 2),
                opacity: 1,
            });
            points.push({
                x: centerX,
                y: centerY - SPREAD_RADIUS * (cell.points.value - 2),
                opacity: cell.points.value - 2,
            });
        } else if (cell.points.value <= 4) {
            const angle = (-Math.PI * (cell.points.value - 3)) / 4;
            const center = {
                x: centerX,
                y: centerY,
            };
            // 4 circles
            points.push(
                rotPoint(
                    {
                        x: centerX + SPREAD_RADIUS,
                        y: centerY + SPREAD_RADIUS,
                        opacity: 1,
                    },
                    center,
                    angle,
                ),
            );
            points.push(
                rotPoint(
                    {
                        x: centerX - SPREAD_RADIUS,
                        y: centerY + SPREAD_RADIUS,
                        opacity: 1,
                    },
                    center,
                    angle,
                ),
            );
            points.push(
                rotPoint(
                    {
                        x: centerX + SPREAD_RADIUS * (cell.points.value - 3),
                        y: centerY - SPREAD_RADIUS,
                        opacity: 1,
                    },
                    center,
                    angle,
                ),
            );
            points.push(
                rotPoint(
                    {
                        x: centerX - SPREAD_RADIUS * (cell.points.value - 3),
                        y: centerY - SPREAD_RADIUS,
                        opacity: 1,
                    },
                    center,
                    angle,
                ),
            );
        } else {
            const angle = -Math.PI / 4;
            const center = {
                x: centerX,
                y: centerY,
            };
            points.push(
                rotPoint(
                    {
                        x: centerX + SPREAD_RADIUS * (cell.points.value - 3),
                        y: centerY + SPREAD_RADIUS * (cell.points.value - 3),
                        opacity: 5 - cell.points.value,
                    },
                    center,
                    angle,
                ),
            );
            points.push(
                rotPoint(
                    {
                        x: centerX - SPREAD_RADIUS * (cell.points.value - 3),
                        y: centerY + SPREAD_RADIUS * (cell.points.value - 3),
                        opacity: 5 - cell.points.value,
                    },
                    center,
                    angle,
                ),
            );
            points.push(
                rotPoint(
                    {
                        x: centerX + SPREAD_RADIUS * (cell.points.value - 3),
                        y: centerY - SPREAD_RADIUS * (cell.points.value - 3),
                        opacity: 5 - cell.points.value,
                    },
                    center,
                    angle,
                ),
            );
            points.push(
                rotPoint(
                    {
                        x: centerX - SPREAD_RADIUS * (cell.points.value - 3),
                        y: centerY - SPREAD_RADIUS * (cell.points.value - 3),
                        opacity: 5 - cell.points.value,
                    },
                    center,
                    angle,
                ),
            );
        }
        points.forEach(({ x, y, opacity }) => {
            ctx.fillStyle = `rgba(255, 255, 255, ${cell.opacity.value * opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
</script>

<div class="relative">
    <div
        class={`flex justify-center gap-8 mb-8 transition-all duration-300 ${won ? "opacity-0" : ""}`}
    >
        {#each players as player}
            <div
                style="background-color: {player.active === 0 &&
                count > NUM_PLAYERS
                    ? '#faf8f0'
                    : player.color
                          .primary}; outline-color: {player.color.opacity(0.5)
                    .primary}; border-color: {player.color
                    .primary}; color: {player.active === 0 &&
                count > NUM_PLAYERS
                    ? player.color.primary
                    : 'white'}"
                class={`rounded-xl p-4 w-32 h-28 text-center transition-all duration-500 ease-out-expo ${player.active === 0 && count > NUM_PLAYERS ? "border-2" : "border-none shadow-md"} ${turn.index === player.color.index ? "outline-4" : "outline-0"}`}
            >
                <h2 class="text-lg font-semibold mb-2">{player.color.name}</h2>
                <p class="text-3xl font-bold">{player.score}</p>
            </div>
        {/each}
    </div>
    {#if showWinner}
        <div
            class="absolute inset-0 flex items-center justify-center"
            transition:fly={{ duration: 300, y: 40 }}
        >
            <h1
                class="text-5xl font-bold py-4 px-12 rounded-2xl shadow-lg"
                style="background-color: {activePlayers[0].color
                    .primary}; color: white;"
            >
                {activePlayers[0].color.name} wins!
            </h1>
        </div>
    {/if}
</div>

<div class="flex justify-center mb-8">
    <canvas
        bind:this={canvas}
        width={GRID_SIZE * CELL_SIZE + BORDER_SIZE}
        height={GRID_SIZE * CELL_SIZE + BORDER_SIZE}
        class="bg-white rounded-3xl shadow-xl w-[512px] h-[512px] transition-transform duration-500 ease-out-expo"
    ></canvas>
</div>

<div class="flex justify-center">
    <div class="relative">
        {#if won}
            <div
                class="absolute top-0 left-0 right-0 flex justify-center z-50"
                transition:scaleTransition={{ duration: 300, start: 0.8 }}
            >
                <Button onclick={newGame}>Play Again</Button>
            </div>
        {/if}
        <div
            class={`w-[512px] bg-bgcolor rounded-full h-6 overflow-hidden transition-opacity duration-300 ${won ? "opacity-0" : ""}`}
        >
            <div class="flex h-full">
                {#each activePlayers as player}
                    <div
                        class="transition-all duration-500 ease-out-expo flex items-center justify-center pr-2 text-white text-sm font-medium"
                        style="background-color: {player.color
                            .primary}; width: {players.reduce(
                            (acc, p) => acc + p.score,
                            0,
                        ) < NUM_PLAYERS
                            ? 100 / NUM_PLAYERS
                            : (player.active /
                                  players.reduce(
                                      (acc, p) => acc + p.active,
                                      0,
                                  )) *
                              100}%"
                    >
                        {player.active}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .ease-out-expo {
        transition-timing-function: cubic-bezier(0.83, 0, 0.17, 1);
    }
</style>
