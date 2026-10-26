/******************************************************************************
 * File:        main.ts
 * Author:      Kieran Provost
 * Date:        10-26-26 (Last edit)
 * Description: The backend and rendering for the Rise of Meroe.
 * 
 * License:     MIT
 ******************************************************************************/


// All the tile and character drawing lives in art.ts
// (TILE, the size of one square in pixels, is defined there)
import type { Facing, Hair, Outfit } from './art.ts'
import { TILE, drawDialogue, drawPerson, drawQuestPanel, drawTileArt, skinFor } from './art.ts'
// Importing our quests
import { quests } from './quests.ts'

// Fonts for the dialogue box (bundled with the game, so no internet needed)
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cormorant-garamond/latin-600.css'
document.fonts.load("700 16px Cinzel")
document.fonts.load("600 22px 'Cormorant Garamond'")

// Defines canvas and context
const canvas = document.querySelector<HTMLCanvasElement>("#canvas1")!
const ctx = canvas.getContext('2d')!

// Defining the map in ASCII characters
const rows = [
  '~~............................',
  '~~..........HH.........T......',
  '~~..........HH...T............',
  '~~..........................T.',
  '~~...T................HH......',
  '~~....................HH......',
  '~~.............PP...........T.',
  '~~.....T.......PP.............',
  '~~............................',
  '~~..........HH................',
  '~~..........HH...T............',
  '~~............................',
  '~~...T........................',
  '~~............................',
  '~~..........HH...PP...........',
  '~~............................',
  '~~.......T.............PP.....',
  '~~.....................PP.....',
  '~~....HH..........T...........',
  '~~....HH......................',
]

// Making our villager interface
interface Npc {
    name: string
    col: number
    row: number
    color: string
    outfit: Outfit   // 'kilt' | 'robe' | 'dress'
    hair: Hair       // 'short' | 'braids' | 'bald' | 'headwrap'
    lines: string[]  // what they say when they have no quest for you
}

// Making list of villagers
const npcs: Npc[] = [
    {
        name: "Amadi", col: 5, row: 3, color: '#8e3b8e', outfit: 'kilt', hair: 'short',
        lines: [
            "Good day, traveler! I am a farmer, and I grow grain by the Nile.",
            "When the river floods, it leaves rich dark soil behind. That is why our barley and sorghum grow so well.",
        ],
    },
    {
        name: "Mustafa", col: 8, row: 5, color: '#00ff84', outfit: 'kilt', hair: 'bald',
        lines: [
            "The fire in my forge never goes cold.",
            "Iron makes our tools and our spears strong. Meroë is famous for its ironworking!",
        ],
    },
    {
        name: "Fatima", col: 2, row: 4, color: '#9b2525', outfit: 'dress', hair: 'braids',
        lines: [
            "I am a trader. I carry goods up and down the Nile.",
            "Kush sends gold, ivory and ebony to faraway lands, and brings back fine goods in return.",
        ],
    },
    {
        name: "Mahmoud", col: 4, row: 7, color: '#1c060a', outfit: 'robe', hair: 'short',
        lines: [
            "Welcome to Meroë, traveler! For hundreds of years this city was the capital of the Kingdom of Kush.",
            "Look at the pyramids, where our kings and queens rest. They are much steeper than the pyramids of Egypt.",
        ],
    },
    {
        name: "Kasha", col: 7, row: 1, color: '#5f12ff', outfit: 'dress', hair: 'headwrap',
        lines: [
            "I am a scribe. I write in the Meroitic script, the alphabet of our people.",
            "Scholars today can read its sounds, but they still do not understand most of our language!",
        ],
    },
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

type QuestState = 'new' | 'active' | 'done'
const questState = new Map<string, QuestState>() // quest id goes into the state
let currentLines: string[] = []

function stateOf(id: string): QuestState {
    return questState.get(id) ?? 'new'
}

// What should the villager say right now?
function linesFor(npc: Npc): string[] {
    for (const q of quests) {
        if (stateOf(q.id) === 'new' && q.giver == npc.name) return q.offer
        if (stateOf(q.id) === 'active' && q.target == npc.name) return q.thanks
    }
    return npc.lines // if not in a quest just small talk
}

// Called when the last line of a conversation is dismissed
function finishTalking(npc: Npc) {
    for (const q of quests) {
        if (stateOf(q.id) === 'new' && q.giver === npc.name) {
            questState.set(q.id, 'active') // accepted
            break
        }
        if (stateOf(q.id) === 'active' && q.target === npc.name) {
            questState.set(q.id, 'done') // completed
            // reuse the dialogue box to show the fact
            talkingTo = { name: 'Did you know?', col: -1, row: -1, color: '#d4a82a', outfit: 'kilt', hair: 'short', lines: [] }
            currentLines = [q.fact]
            lineIndex = 0
            lineStartedAt = performance.now() // the fact types out like any other line
            return
        }
    }
    talkingTo = null
}

// Dialogue box animation (times come from performance.now(), in milliseconds)
const OPEN_MS = 300         // how long the box takes to slide in
const TYPE_MS = 28          // time per letter in the typewriter effect
let dialogueOpenedAt = 0
let lineStartedAt = 0

// How many letters of the current line are showing right now
function charsShown(): number {
    return Math.max(0, Math.floor((performance.now() - lineStartedAt) / TYPE_MS))
}

// Assigning the keys
const keys = new Set<string>()

// Event listeners for keys
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))

// See if you are pressing E
addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'e' || e.repeat) return
    if (talkingTo === null) {
        talkingTo = nearbyNpc() ?? null
        if (talkingTo !== null) currentLines = linesFor(talkingTo)
        lineIndex = 0
        dialogueOpenedAt = performance.now()
        lineStartedAt = dialogueOpenedAt + OPEN_MS   // start typing once the box is in
    } else if (charsShown() < currentLines[lineIndex].length) {
        lineStartedAt = 0                            // still typing: show the whole line now
    } else {
        lineIndex++
        lineStartedAt = performance.now()
        if (lineIndex >= currentLines.length) finishTalking(talkingTo)
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
            { skin: skinFor(npc.name), cloth: npc.color, accent: '#d4a82a', outfit: npc.outfit, hair: npc.hair },
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
        { skin: '#7a4a2e', cloth: '#f3ead6', accent: '#d4a82a', outfit: 'kilt', hair: 'short' },
        player.facing,
        player.moving,
        time,
    )

    // Quest box (top-left): the first quest that's active
    const active = quests.find(q => stateOf(q.id) === 'active')
    const done = quests.filter(q => stateOf(q.id) === 'done').length
    // (the styling is in art.ts)
    drawQuestPanel(
        ctx,
        done,
        quests.length,
        active ? active.title : null,
        active ? active.goal : done === quests.length ? 'All quests complete!' : 'Talk to a villager.',
    )

    // Dialogue box
    if (talkingTo !== null) {
        // The animated box (slide-in, typewriter text) is drawn in art.ts
        const open = Math.min(1, (time - dialogueOpenedAt) / OPEN_MS)
        drawDialogue(ctx, canvas.width, canvas.height, talkingTo.name,
            currentLines[lineIndex], open, charsShown(), time)
    }
}

// Loop to run all the functions and update the frames
function loop() {
    update()
    draw()
    requestAnimationFrame(loop)
}

loop()
