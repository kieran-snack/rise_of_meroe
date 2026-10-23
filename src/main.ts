/******************************************************************************
 * File:        main.ts
 * Author:      Kieran Provost
 * Date:        10-22-26 (Last edit)
 * Description: The backend and rendering for the Rise of Meroe.
 * 
 * License:     MIT
 ******************************************************************************/


// All the tile and character drawing lives in art.ts
// (TILE, the size of one square in pixels, is defined there)
import { TILE, drawPerson, drawTileArt, skinFor } from './art.ts'
import type { Facing } from './art.ts'

// Defines canvas and context
const canvas = document.querySelector<HTMLCanvasElement>("#canvas1")!
const ctx = canvas.getContext('2d')!

// Defining the map in ASCII characters
const rows = [
  '~~..................',
  '~~..........HH......',
  '~~..........HH...T..',
  '~~..................',
  '~~...T..............',
  '~~..................',
  '~~.............PP...',
  '~~.....T.......PP...',
  '~~..................',
  '~~..........HH......',
  '~~..........HH...T..',
  '~~..................',
  '~~...T..............',
  '~~..................',
  '~~..........HH...PP.',
]

// Making our villager interface
interface Npc {
    name: string
    col: number
    row: number
    color: string
    lines: string[]
}

// Making list of villagers
const npcs: Npc[] = [
    { name:  "Amadi", col: 5, row: 3, color: '#8e3b8e', lines: ['hey bro'] },
    { name: "Mustafa", col: 8, row: 5, color: '#00ff84', lines: ['i gotta quest for u bro']},
    { name: "Fatima", col: 2, row: 4, color: '#9b2525', lines: ['yo yo yo']}
]

// Returns true if a tile (or villager) is solid
function isSolid(col: number, row: number): boolean {
    const char = rows[row]?.[col]
    return (
    char === undefined ||
    char === '~' || char === 'H' || char === 'T' || char === 'P' ||
    npcs.some(n => n.col === col && n.row === row)
)
}

// So we don't have to run Math.floor all the time
function toTile(pixel: number): number {
    return Math.floor(pixel / TILE)
}

// Returns true if you are touching something (uses our isSolid() function)
function blocked(x: number, y: number): boolean {
    const s = player.size
    return (
        isSolid(toTile(x),     toTile(y))     ||
        isSolid(toTile(x + s), toTile(y))     ||
        isSolid(toTile(x),     toTile(y + s)) ||
        isSolid(toTile(x + s), toTile(y + s))
    )
}

function nearbyNpc(): Npc | undefined {
    // Player's center
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return npcs.find(n => {
        // Villager's center
        const nx = n.col * TILE + TILE / 2 
        const ny = n.row * TILE + TILE / 2 
        return Math.hypot(px - nx, py - ny) < 60
    })
}


// Defining player + adding characteristics
const player = { x: 100, y: 100, size: 20, speed: 2, facing: 'down' as Facing, moving: false }

// Remember who you are talking to
let talkingTo: Npc | null = null
let lineIndex = 0

// Assigning the keys
const keys = new Set<string>()

// Event listeners for keys
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))

// See if you are pressing E
addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'e' || e.repeat) return
    if (talkingTo == null) {
        talkingTo = nearbyNpc() ?? null
        lineIndex = 0
    } else {
        lineIndex++
        if (lineIndex >= talkingTo.lines.length) talkingTo = null
    }
})
// Function to update the key listeners, fix diagonal speed, and clamping the player's
// boundaries
function update() {
    let dx = 0
    let dy = 0

    // You can't walk while you're talking
    if (talkingTo !== null) {
        player.moving = false
        return
    }

    // Diagonal x & y
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1
    if (keys.has('d') || keys.has('arrowright')) dx += 1
    if (keys.has('w') || keys.has('arrowup')) dy -= 1
    if (keys.has('s') || keys.has('arrowdown')) dy += 1

    
    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2
        dy *= Math.SQRT1_2
    }

    // Remember which way we face and whether we're walking (for the art)
    player.moving = dx !== 0 || dy !== 0
    if (dx < 0) player.facing = 'left'
    else if (dx > 0) player.facing = 'right'
    else if (dy < 0) player.facing = 'up'
    else if (dy > 0) player.facing = 'down'

    // Run our collision-detecting functions and store the output
    // in variables
    const nextX = player.x + dx * player.speed
    if (!blocked(nextX, player.y)) player.x = nextX
    
    const nextY = player.y + dy * player.speed
    if (!blocked(player.x, nextY)) player.y = nextY

    // Makes sure the player cannot go outside the boundaries
    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x))
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y))
}

// Drawing the canvas
function draw() {
    const time = performance.now()

    // Draws the map (the art for each tile is in art.ts)
    for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < rows[row].length; col++) {
            const neighbors = {
                up: rows[row - 1]?.[col] ?? ' ',
                down: rows[row + 1]?.[col] ?? ' ',
                left: rows[row][col - 1] ?? ' ',
                right: rows[row][col + 1] ?? ' ',
            }
            drawTileArt(ctx, rows[row][col], col * TILE, row * TILE, col, row, time, neighbors)
        }
    }

    // Draws the villagers (each one keeps its own color for its clothes)
    for (const npc of npcs) {
        drawPerson(
            ctx,
            npc.col * TILE + 6,
            npc.row * TILE + 6,
            20,
            { skin: skinFor(npc.name), cloth: npc.color, accent: '#d4a82a' },
            'down',
            false,
            time,
        )
    }

    // Draws the player: white linen kilt with a gold headband
    drawPerson(
        ctx,
        player.x,
        player.y,
        player.size,
        { skin: '#7a4a2e', cloth: '#f3ead6', accent: '#d4a82a' },
        player.facing,
        player.moving,
        time,
    )

    if (talkingTo !== null) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(20, canvas.height - 100, canvas.width - 40, 80)
        ctx.fillStyle = '#977a1b'
        ctx.font = 'bold 18px sans-serif'
        ctx.fillText(talkingTo.name, 36, canvas.height - 72)
        ctx.fillStyle = 'white'
        ctx.font = '16px sans-serif'
        ctx.fillText(talkingTo.lines[lineIndex], 36, canvas.height - 44)

    }
}

// Loop to run all the functions and update the frames
function loop() {
    update()
    draw()
    requestAnimationFrame(loop)
}

loop()
