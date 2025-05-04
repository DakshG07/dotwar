<script lang="ts">
    import { onMount } from "svelte";
    import resizeToFit from "intrinsic-scale";
    import { Animator } from "$lib/framework";
    import { easeOutExpo, rotPoint, hexSuffix } from "$lib/utils";

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
        cell: { type: "red" | "blue"; points: number } | { type: "empty" },
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
    const GRID_SIZE = 5;
    const CELL_SIZE = 100;
    const BORDER_SIZE = 12;
    const CORNER_RADIUS = 16;
    const DOT_RADIUS = 6;
    const SPREAD_RADIUS = 14;
    type Cell =
        | { type: "empty" }
        | { type: "red"; points: Points; opacity: Property; offset: Property }
        | { type: "blue"; points: Points; opacity: Property; offset: Property };
    type ActiveCell =
        | { type: "red"; points: Points; opacity: Property; offset: Property }
        | { type: "blue"; points: Points; opacity: Property; offset: Property };
    let grid: Cell[][] = $state([]);
    let next: "red" | "blue" = "blue";
    let turn: "red" | "blue" | "wait" = $state("red");
    let redScore: number = $derived.by(() =>
        grid.reduce(
            (acc, row) =>
                acc + row.filter((cell) => cell.type === "red").length,
            0,
        ),
    );
    let redActive: number = $derived.by(() =>
        grid.reduce(
            (acc, row) =>
                acc +
                row
                    .filter((cell) => cell.type === "red")
                    .map((cell) => {
                        let pts = cell.points.target;
                        return pts > 4 ? 4 : pts;
                    })
                    .reduce((acc, pts) => acc + pts, 0),
            0,
        ),
    );
    let blueScore: number = $derived.by(() =>
        grid.reduce(
            (acc, row) =>
                acc + row.filter((cell) => cell.type === "blue").length,
            0,
        ),
    );
    let blueActive: number = $derived.by(() =>
        grid.reduce(
            (acc, row) =>
                acc +
                row
                    .filter((cell) => cell.type === "blue")
                    .map((cell) => {
                        let pts = cell.points.target;
                        return pts > 4 ? 4 : pts;
                    })
                    .reduce((acc, pts) => acc + pts, 0),
            0,
        ),
    );
    let prevUpdate = performance.now();

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
            const { x, y } = getMousePos(event);
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    let cell = grid[row][col];
                    if (
                        !(cell.type === turn) &&
                        (turn === "wait" ||
                            !(
                                cell.type === "empty" &&
                                redScore + blueScore <= 1
                            ))
                    )
                        continue;
                    let tlx = col * CELL_SIZE + BORDER_SIZE;
                    let tly = row * CELL_SIZE + BORDER_SIZE;
                    let brx = tlx + CELL_SIZE - BORDER_SIZE;
                    let bry = tly + CELL_SIZE - BORDER_SIZE;
                    // Check if mouse in bounds
                    if (x >= tlx && x <= brx && y >= tly && y <= bry) {
                        if (cell.type === "empty") {
                            grid[row][col] = newCell({ type: turn, points: 3 });
                            nextTurn();
                            break;
                        }
                        turn = "wait";
                        cell.points.target++;
                        if (cell.points.target === 4) {
                            setTimeout(solveGrid, 300);
                        } else {
                            nextTurn();
                        }
                        grid = [...grid];
                        break;
                    }
                }
            }
        });

        // Start rendering
        window.requestAnimationFrame(render);
    });

    let direction = 1;

    function resetGrid() {
        grid = Array(GRID_SIZE)
            .fill(0)
            .map((_, i) => Array(GRID_SIZE).fill({ type: "empty" }));
    }

    function nextTurn() {
        setTimeout(() => {
            turn = next;
            switch (turn) {
                case "red":
                    next = "blue";
                    break;
                case "blue":
                    next = "red";
                    break;
            }
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
        const { x, y } = getMousePos(event);
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                let cell = grid[row][col];
                if (cell.type === "empty") continue;
                let tlx = col * CELL_SIZE + BORDER_SIZE;
                let tly = row * CELL_SIZE + BORDER_SIZE;
                let brx = tlx + CELL_SIZE - BORDER_SIZE;
                let bry = tly + CELL_SIZE - BORDER_SIZE;
                // Check if mouse in bounds
                if (x >= tlx && x <= brx && y >= tly && y <= bry) {
                    // update to hover position
                    if (cell.type === turn && cell.offset.target !== 0)
                        cell.offset.target = event.buttons & 1 ? 2 : 8;
                } else {
                    cell.offset.target = 5;
                }
            }
        }
    }

    function upgradeCell(row: number, col: number, color: "red" | "blue") {
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
        console.log(i);
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
                grid = [...grid];
            }
        }
        if (!solved)
            setTimeout(() => solveGrid(i + 1), 500); // allows for chain reactions
        else {
            setTimeout(() => {
                turn = next;
                switch (turn) {
                    case "red":
                        next = "blue";
                        break;
                    case "blue":
                        next = "red";
                        break;
                }
            }, 300);
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
        switch (cell.type) {
            case "red":
                ctx.fillStyle = "#c92828" + hexSuffix(cell.opacity.value);
                break;
            case "blue":
                ctx.fillStyle = "#2563eb" + hexSuffix(cell.opacity.value);
                break;
        }
        ctx.beginPath();
        ctx.roundRect(x, y + 1.5, size, size, CORNER_RADIUS);
        ctx.fill();
        // Render square
        switch (cell.type) {
            case "red":
                ctx.fillStyle = "#f87171" + hexSuffix(cell.opacity.value);
                break;
            case "blue":
                ctx.fillStyle = "#60a5fa" + hexSuffix(cell.opacity.value);
                break;
        }
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
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
</script>

<div class="container mx-auto px-4 py-8">
    <h1
        class="text-4xl font-['Rubik'] font-black text-center text-primary mb-8"
    >
        Dot War
    </h1>

    <div class="flex justify-center gap-8 mb-8">
        <div
            class={`bg-red-400 rounded-xl p-4 shadow-md w-32 h-28 text-center transition-all ease-out-expo outline-opacity-50 outline-red-200 ${turn === "red" ? "outline-4" : "outline-0"}`}
        >
            <h2 class="text-lg font-semibold text-white mb-2">You</h2>
            <p class="text-3xl font-bold text-white">{redScore}</p>
        </div>

        <div
            class={`bg-blue-400 rounded-xl p-4 shadow-md w-32 h-28 text-center transition-all ease-out-expo outline-opacity-50 outline-blue-200 ${turn === "blue" ? "outline-4" : "outline-0"}`}
        >
            <h2 class="text-lg font-semibold text-white mb-2">Them</h2>
            <p class="text-3xl font-bold text-white">{blueScore}</p>
        </div>
    </div>

    <div class="flex justify-center mb-8">
        <canvas
            bind:this={canvas}
            width={GRID_SIZE * CELL_SIZE + BORDER_SIZE}
            height={GRID_SIZE * CELL_SIZE + BORDER_SIZE}
            class="bg-white rounded-3xl shadow-xl w-[512px] h-[512px]"
        ></canvas>
    </div>

    <div class="flex justify-center">
        <div class="w-[512px] bg-red-400 rounded-full h-6 overflow-hidden">
            <div class="flex h-full">
                <div
                    class="bg-red-400 transition-all duration-500 ease-out-expo flex items-center justify-end pr-2"
                    style="width: {redActive + blueActive <= 1
                        ? '50'
                        : (redActive / (redActive + blueActive)) * 100}%"
                >
                    <span class="text-white text-sm font-medium"
                        >{redActive}</span
                    >
                </div>
                <div
                    class="bg-blue-400 transition-all duration-500 ease-out-expo flex items-center justify-start pl-2"
                    style="width: {redActive + blueActive <= 1
                        ? '50'
                        : (blueActive / (redActive + blueActive)) * 100}%"
                >
                    <span class="text-white text-sm font-medium"
                        >{blueActive}</span
                    >
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .ease-out-expo {
        transition-timing-function: cubic-bezier(0.83, 0, 0.17, 1);
    }
</style>
