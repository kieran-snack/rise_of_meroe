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
import type { CodexEntry, DesignerRow, Facing, Hair, MapMarker, Outfit } from './art.ts'
import {
    CLOTH_COLORS, HAIRS, OUTFITS, PLAYER_SKINS, TILE,
    drawChest, drawCodex, drawDesigner, drawDialogue, drawInventory, drawItem, drawMarker, drawNameTag,
    drawPerson, drawQuestMap, drawQuestPanel, drawRegionBanner, drawTileArt, drawTitleScreen, skinFor,
} from './art.ts'
// Importing our items and quests
import type { ChestDef } from './chests.ts'
import { chestDefs } from './chests.ts'
import { civs } from './civs.ts'
import type { ItemDef } from './items.ts'
import { itemDefs } from './items.ts'
import type { Quest } from './quests.ts'
import { quests } from './quests.ts'

// Fonts for the dialogue box (bundled with the game, so no internet needed)
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cormorant-garamond/latin-600.css'
// The page styling (no margin, no scrollbars, dark background)
import './style.css'
document.fonts.load("700 16px Cinzel")
document.fonts.load("600 22px 'Cormorant Garamond'")

// Defines canvas and context
const canvas = document.querySelector<HTMLCanvasElement>("#canvas1")!
const ctx = canvas.getContext('2d')!

// Make the canvas always fill the browser window
function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}
resize()
addEventListener('resize', resize)

// Defining the map in ASCII characters
const rows = [
  '~~...........................................................................~~~',
  '~~...........................................................................~~~',
  '~~~..........................................................................~~~',
  '~~~.T..................T................PP................T..................~~~',
  '~~~.....T...............................PP..............................T....~~~',
  '~~.............T...........HH.......................T........................~~~',
  '~~.........................HH...................................T.........~~~~~~',
  '~~...T.....................................PP.............................~~~~~~',
  '~~.........................................PP.............................~~~~~~',
  '~~........HH.....HH..................................................T....~~~~~~',
  '~~........HH.....HH...................PP.....................HH..........~~~~~~~',
  '~~..T............................HH...PP.....................HH..........~~~~~~~',
  '~~~.....................T........HH.......T..............................~~~~~~~',
  '~~~......................................................................~~~~~~~',
  '~~..................................T..................HH................~~~~~~~',
  '~~....T............HH.........T...................T....HH................~~~~~~~',
  '~~..........HH.....HH....................................................~~~~~~~',
  '~~.......................................................................~~~~~~~',
  '~~................................HH..................................HH.~~~~~~~',
  '~~..T.....................................................................~~~~~~',
  '~~~.........T...........................T...............T.................~~~~~~',
  '~~~.......................................................................~~~~~~',
  '~~..............T.................T...........................T...........~~~~~~',
  '~~...T.......................................................................~~~',
  '~~..................HH......HH..............T................................~~~',
  '~~..................HH......HH..................T............................~~~',
  '~~......T.............................T.............................T........~~~',
  '~~...........................................................................~~~',
  '~~...........................................................................~~~',
  '~~...........................................................................~~~',
  '~~~..........................................................................~~~',
  '~~~..........................................................................~~~',
  '~~~.T........................................................................~~~',
  '~~~.......HH..................HH...T.......................................T.~~~',
  '~~................T...........HH............T................................~~~',
  '~~..........................................................T................~~~',
  '~~............T..........T...................................................~~~',
  '~~.........HH.........................................HH.....................~~~',
  '~~.T.......HH.......................PP..........T.....HH.....................~~~',
  '~~....................HH.....T......PP.......................................~~~',
  '~~......T......T......HH........................................T.........HH.~~~',
  '~~...T.......................................................................~~~',
  '~~......................T........T...........................................~~~',
  '~~~....T....T.................................................HH.............~~~',
  '~~~.T.................................T.......................HH.............~~~',
  '~~~.........................T................................................~~~',
  '~~~................T................................T.....................S..~~~',
  '~~...................................................................S.......~~~',
  '~~...........T....................PP.........................................~~~',
  '~~....HH..........................PP....................................S....~~~',
  '~~....HH.......................T..................HH.........................~~~',
  '~~.T.................T.....T.................................................~~~',
  '~~..............HH...................PP...............................S.....T~~~',
  '~~...................................PP......................................~~~',
  '~~~..T..................................................T....................~~~',
  '~~~.......................HH.....PP..........................................~~~',
  '~~~..............T........HH.....PP...........T...................T..........~~~',
  '~~.......T............T.......PP.............................................~~~',
  '~~....................................T......................................~~~',
  '~~...........................................................................~~~',
]
const MAP_W = rows[0].length
const MAP_H = rows.length


// --- Regions ---------------------------------------------------------------
// Named rectangles of the map (in tiles). A banner shows when you walk into one.
interface Region {
    name: string
    subtitle: string
    col0: number   // left and right edges (inclusive)
    col1: number
    row0: number   // top and bottom edges (inclusive)
    row1: number
}

// The first matching region wins, so smaller ones (like the border) go first.
const regions: Region[] = [
    { name: 'Syene, the Roman Border', subtitle: 'Egypt ends here, and Rome guards the frontier', col0: 0, col1: 45, row0: 22, row1: 29 },
    { name: 'Egypt', subtitle: 'North of Kush, the land of the pharaohs', col0: 0, col1: 45, row0: 0, row1: 29 },
    { name: 'The Red Sea Coast', subtitle: 'Greek and Roman ships trade along these shores', col0: 46, col1: 79, row0: 0, row1: 29 },
    { name: 'Aksum', subtitle: 'A rising kingdom in the highlands to the southeast', col0: 40, col1: 79, row0: 30, row1: 59 },
    { name: 'Kush', subtitle: 'Your homeland: Meroë and its villages along the Nile', col0: 0, col1: 39, row0: 30, row1: 59 },
]

function regionAt(col: number, row: number): Region | undefined {
    return regions.find(r => col >= r.col0 && col <= r.col1 && row >= r.row0 && row <= r.row1)
}

let currentRegion = ''                   // name of the region you are standing in
let bannerRegion: Region | null = null   // the region shown in the banner
let bannerStartedAt = -99999             // when the banner appeared


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
        name: "Amadi", col: 6, row: 35, color: '#8e3b8e', outfit: 'kilt', hair: 'short',
        lines: [
            "Good day, traveler! I am a farmer, and I grow grain by the Nile.",
            "When the river floods, it leaves rich dark soil behind. That is why our barley and sorghum grow so well.",
        ],
    },
    {
        name: "Mustafa", col: 20, row: 41, color: '#00ff84', outfit: 'kilt', hair: 'bald',
        lines: [
            "The fire in my forge never goes cold.",
            "Iron makes our tools and our spears strong. Meroë is famous for its ironworking!",
        ],
    },
    {
        name: "Fatima", col: 8, row: 47, color: '#9b2525', outfit: 'dress', hair: 'braids',
        lines: [
            "I am a trader. I carry goods up and down the Nile.",
            "Kush sends gold, ivory and ebony to faraway lands, and brings back fine goods in return.",
        ],
    },
    {
        name: "Mahmoud", col: 30, row: 52, color: '#1c060a', outfit: 'robe', hair: 'short',
        lines: [
            "Welcome to Meroë, traveler! For hundreds of years this city was the capital of the Kingdom of Kush.",
            "Look at the pyramids, where our kings and queens rest. They are much steeper than the pyramids of Egypt.",
        ],
    },
    {
        name: "Kasha", col: 32, row: 35, color: '#5f12ff', outfit: 'dress', hair: 'headwrap',
        lines: [
            "I am a scribe. I write in the Meroitic script, the alphabet of our people.",
            "Scholars today can read its sounds, but they still do not understand most of our language!",
        ],
    },
    {
        name: "Hori", col: 14, row: 12, color: '#e8e0c8', outfit: 'robe', hair: 'bald',
        lines: [
            "Welcome to Egypt, traveler. I serve in the temple of the god Amun.",
            "The people of Kush worship Amun too. They built a great temple to him at Jebel Barkal.",
        ],
    },
    {
        name: "Nebet", col: 30, row: 8, color: '#2f6fb5', outfit: 'dress', hair: 'headwrap',
        lines: [
            "Egypt has always wanted what Kush has: gold, ivory and ebony.",
            "The lands to the south are rich, and we trade for their goods.",
        ],
    },
    {
        name: "Marcus", col: 24, row: 27, color: '#a02020', outfit: 'robe', hair: 'short',
        lines: [
            "I am a soldier of Rome, posted at the border at Syene.",
            "Rome rules Egypt now. Not long ago, a Kushite queen attacked this town. We have not forgotten.",
        ],
    },
    {
        name: "Demetrios", col: 66, row: 14, color: '#b8860b', outfit: 'robe', hair: 'short',
        lines: [
            "I am a Greek merchant. My ships sail the Red Sea.",
            "Frankincense, ivory and gold: that is what my buyers want.",
        ],
    },
    {
        name: "Berhane", col: 58, row: 40, color: '#2e7d32', outfit: 'robe', hair: 'headwrap',
        lines: [
            "Welcome to Aksum! Our caravans cross the highlands to the sea.",
            "Our port, Adulis, trades with Egypt, Arabia and India.",
        ],
    },
    {
        name: "Dawit", col: 66, row: 52, color: '#8a8f98', outfit: 'kilt', hair: 'bald',
        lines: [
            "I carve the tall stone pillars of Aksum, called stelae.",
            "Some are cut from a single block of granite and are taller than most buildings.",
        ],
    },
]

// Items still lying on the ground (a copy, so picking one up doesn't change items.ts)
const worldItems: ItemDef[] = itemDefs.filter(i => i.col >= 0)

// Treasure chests: which ones you have opened so far
const openedChests = new Set<string>()

// Returns true if a tile (or villager) is solid
function isSolid(col: number, row: number): boolean {
    const char = rows[row]?.[col]
    return (
    char === undefined ||
    char === '~' || char === 'H' || char === 'T' || char === 'P' || char === 'S' ||
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

// An item close enough to pick up
function nearbyItem(): ItemDef | undefined {
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return worldItems.find(i => Math.hypot(px - (i.col * TILE + TILE / 2), py - (i.row * TILE + TILE / 2)) < 40)
}

// A closed chest close enough to open
function nearbyChest(): ChestDef | undefined {
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return chestDefs.find(c =>
        !openedChests.has(c.id) &&
        Math.hypot(px - (c.col * TILE + TILE / 2), py - (c.row * TILE + TILE / 2)) < 44)
}


// Defining player + adding characteristics (starts near the middle of the village)
const player = { x: 13 * TILE + 6, y: 40 * TILE + 6, size: 20, speed: 2, facing: 'down' as Facing, moving: false }

// What the player looks like (changed in the character designer)
const appearance = {
    skin: PLAYER_SKINS[2],
    cloth: CLOTH_COLORS[0],
    accent: '#d4a82a',
    outfit: 'kilt' as Outfit,
    hair: 'short' as Hair,
}
let playerName = 'Traveler'

// Which screen are we on, and which pop-ups are open?
type Screen = 'title' | 'designer' | 'playing'
let screen: Screen = 'title'
let inventoryOpen = false
let mapOpen = false
let codexOpen = false
let codexIndex = 0   // which civilization is selected in the Codex

// --- Inventory -------------------------------------------------------------
const inventory: string[] = []   // item ids

// Civilizations you have learned about (their Codex pages are unlocked)
const discovered = new Set<string>()

function addItem(id: string) {
    inventory.push(id)
    const civ = itemDefs.find(i => i.id === id)?.civ
    if (civ) discovered.add(civ)
}

function hasItem(id: string): boolean {
    return inventory.includes(id)
}

function removeItem(id: string) {
    const i = inventory.indexOf(id)
    if (i >= 0) inventory.splice(i, 1)
}

// --- Dialogue + quests -----------------------------------------------------


// Remember who you are talking to
let talkingTo: Npc | null = null
let lineIndex = 0

type QuestState = 'new' | 'active' | 'done'
const questState = new Map<string, QuestState>() // quest id goes into the state
let currentLines: string[] = []

function stateOf(id: string): QuestState {
    return questState.get(id) ?? 'new'
}

/// Has the quest this one depends on been finished? (quests without `requires` are always available)
function isAvailable(q: Quest): boolean {
    return !q.requires || stateOf(q.requires) === 'done'
}

// Which of the items this quest needs are you still missing?
function missingItems(q: Quest): string[] {
    return (q.needs ?? []).filter(id => !hasItem(id))
}

// What should the villager say right now?
function linesFor(npc: Npc): string[] {
    for (const q of quests) {
        if (stateOf(q.id) === 'new' && isAvailable(q) && q.giver == npc.name) return q.offer
        if (stateOf(q.id) === 'active' && q.target == npc.name) {
            if (missingItems(q).length > 0) return q.reminder ?? ['Come back when you have what I asked for.']
            return q.thanks
        }
    }
    return npc.lines // if not in a quest just small talk
}

// The gold "!" or "?" above a villager's head (null = nothing to show)
function markerFor(npc: Npc): string | null {
    for (const q of quests) {
        if (stateOf(q.id) === 'new' && isAvailable(q) && q.giver === npc.name) return '!'
        if (stateOf(q.id) === 'active' && q.target === npc.name) {
            return missingItems(q).length === 0 ? '?' : null
        }
    }
    return null
}

// Open the dialogue box with some lines
function startDialogue(speaker: Npc, lines: string[]) {
    talkingTo = speaker
    currentLines = lines
    lineIndex = 0
    dialogueOpenedAt = performance.now()
    lineStartedAt = dialogueOpenedAt + OPEN_MS   // start typing once the box is in
}

// A made-up speaker, so the dialogue box can show things like "Did you know?"
function speakerNamed(name: string): Npc {
    return { name, col: -1, row: -1, color: '#d4a82a', outfit: 'kilt', hair: 'short', lines: [] }
}

// Pick an item up off the ground
function pickUp(item: ItemDef) {
    addItem(item.id)
    worldItems.splice(worldItems.indexOf(item), 1)
    startDialogue(speakerNamed(`Found: ${item.name}`), [item.fact])
}

// Open a chest: its loot goes into your inventory, and each piece teaches you something
function openChest(chest: ChestDef) {
    openedChests.add(chest.id)
    const lines: string[] = []
    for (const id of chest.loot) {
        const def = itemDefs.find(i => i.id === id)
        if (!def) continue
        const isNew = def.civ !== undefined && !discovered.has(def.civ)
        addItem(id)
        lines.push(`${def.name}: ${def.fact}`)
        if (isNew) {
            const civ = civs.find(c => c.id === def.civ)
            if (civ) lines.push(`New Codex entry unlocked: ${civ.name}. Press C to read it.`)
        }
    }
    startDialogue(speakerNamed('Treasure Chest'), lines)
}

// Called when the last line of a conversation is dismissed
function finishTalking(npc: Npc) {
    for (const q of quests) {
        if (stateOf(q.id) === 'new' && isAvailable(q) && q.giver === npc.name) {
            questState.set(q.id, 'active') // accepted
            break
        }
        if (stateOf(q.id) === 'active' && q.target === npc.name) {
            if (missingItems(q).length > 0) break // you don't have everything yet
            for (const id of q.needs ?? []) removeItem(id) // hand the items over
            questState.set(q.id, 'done') // completed
            // reuse the dialogue box to show the fact
            talkingTo = speakerNamed('Did you know?')
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

// What happens when you press E while playing
function interact() {
    if (talkingTo === null) {
        const item = nearbyItem()
        if (item) {
            pickUp(item)
            return
        }
        const chest = nearbyChest()
        if (chest) {
            openChest(chest)
            return
        }
        const npc = nearbyNpc()
        if (npc) startDialogue(npc, linesFor(npc))
    } else if (charsShown() < currentLines[lineIndex].length) {
        lineStartedAt = 0
    } else {
        lineIndex++
        lineStartedAt = performance.now()
        if (lineIndex >= currentLines.length) finishTalking(talkingTo)
    }
}

function changeOption(dir: number) {
    if (designerRow === 1) appearance.skin = cycle(PLAYER_SKINS, appearance.skin, dir)
    else if (designerRow === 2) appearance.outfit = cycle(OUTFITS, appearance.outfit, dir)
    else if (designerRow === 3) appearance.hair = cycle(HAIRS, appearance.hair, dir)
    else if (designerRow === 4) appearance.cloth = cycle(CLOTH_COLORS, appearance.cloth, dir)
}

function designerData(): DesignerRow[] {
    const cursor = designerRow === 0 && Math.floor(performance.now() / 500) % 2 === 0 ? '_' : ''
    return [
        { label: 'Name', text: playerName + cursor },
        { label: 'Skin', text: `Tone ${PLAYER_SKINS.indexOf(appearance.skin) + 1}`, swatch: appearance.skin },
        { label: 'Outfit', text: cap(appearance.outfit) },
        { label: 'Hair', text: cap(appearance.hair) },
        { label: 'Colors', text: `Style ${CLOTH_COLORS.indexOf(appearance.cloth) + 1}`, swatch: appearance.cloth },
    ]
}

function handleDesignerKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        if (playerName.trim() === '') playerName = 'Traveler'
        screen = 'playing'
    } else if (e.key === 'ArrowUp') designerRow = (designerRow + DESIGNER_ROWS - 1) % DESIGNER_ROWS
    else if (e.key === 'ArrowDown') designerRow = (designerRow + 1) % DESIGNER_ROWS
    else if (e.key === 'ArrowLeft') changeOption(-1)
    else if (e.key === 'ArrowRight') changeOption(1)
    else if (designerRow === 0) {
        // the name row: type letters, Backspace deletes
        if (e.key === 'Backspace') playerName = playerName.slice(0, -1)
        else if (/^[a-zA-Z ]$/.test(e.key) && playerName.length < 12) playerName += e.key
    }
}

// --- Quest map -------------------------------------------------------------
function questMarkers(): MapMarker[] {
    const marks: MapMarker[] = npcs.map(n => ({ col: n.col, row: n.row, kind: 'villager', label: n.name }))
    for (const q of quests) {
        const st = stateOf(q.id)
        if (st === 'new') {
            // a villager with a quest for you
            const giver = npcs.find(n => n.name === q.giver)
            if (giver && markerFor(giver) === '!') marks.push({ col: giver.col, row: giver.row, kind: 'quest' })
        } else if (st === 'active') {
            const missing = missingItems(q)
            if (missing.length === 0) {
                // you have everything: go to the villager
                const target = npcs.find(n => n.name === q.target)
                if (target) marks.push({ col: target.col, row: target.row, kind: 'quest' })
            } else {
                // still looking: show where the items lie
                for (const id of missing) {
                    const item = worldItems.find(i => i.id === id)
                    if (item) marks.push({ col: item.col, row: item.row, kind: 'quest' })
                }
            }
        }
    }
    return marks
}

// --- Codex -----------------------------------------------------------------
function codexEntries(): CodexEntry[] {
    return civs.map(c => ({
        name: c.name,
        years: c.years,
        relation: c.relation,
        summary: c.summary,
        unlocked: discovered.has(c.id),
    }))
}

// --- Keys ------------------------------------------------------------------

// --- Character designer ---------------------------------------------------------------------
const DESIGNER_ROWS = 5
let designerRow = 0

function cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

// Go to the next (dir = 1) or previous (dir = -1) item in a list, wrapping around
function cycle<T>(list: T[], current: T, dir: number): T {
    const i = list.indexOf(current)
    return list[(i + dir + list.length) % list.length]
}


// Assigning the keys
const keys = new Set<string>()

// Event listeners for keys
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))

// See if you are pressing E
// Keys that do something once per press (not held down)
addEventListener('keydown', (e) => {
    if (e.repeat) return
    const key = e.key.toLowerCase()

    if (screen === 'title') {
        if (key === 'enter') screen = 'designer'
        return
    }
    if (screen === 'designer') {
        handleDesignerKey(e)
        return
    }

    // screen === 'playing'
    if (key === 'escape') {
        inventoryOpen = false
        mapOpen = false
        codexOpen = false
    } else if (talkingTo !== null) {
        if (key === 'e') interact()   // while talking, only E does anything
    } else if (key === 'i') {
        inventoryOpen = !inventoryOpen
        mapOpen = false
        codexOpen = false
    } else if (key === 'm') {
        mapOpen = !mapOpen
        inventoryOpen = false
        codexOpen = false
    } else if (key === 'c') {
        codexOpen = !codexOpen
        inventoryOpen = false
        mapOpen = false
    } else if (codexOpen && (key === 'arrowup' || key === 'arrowdown')) {
        const step = key === 'arrowup' ? -1 : 1
        codexIndex = (codexIndex + step + civs.length) % civs.length
    } else if (key === 'e' && !inventoryOpen && !mapOpen && !codexOpen) {
        interact()
    }
})


// Function to update the key listeners, fix diagonal speed, and clamping the player's
// boundaries
function update() {
    let dx = 0
    let dy = 0

    // You can't walk while you're talking
    if (talkingTo !== null || inventoryOpen || mapOpen || codexOpen) {
        player.moving = false
        return
    }

    // Which region are we in? Show a banner when it changes
    const region = regionAt(toTile(player.x + player.size / 2), toTile(player.y + player.size / 2))
    if (region && region.name !== currentRegion) {
        currentRegion = region.name
        bannerRegion = region
        bannerStartedAt = performance.now()
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
    player.x = Math.max(0, Math.min(MAP_W * TILE - player.size, player.x))
    player.y = Math.max(0, Math.min(MAP_H * TILE - player.size, player.y))
}

// --- Camera ----------------------------------------------------------------
let camX = 0
let camY = 0

// Where the camera sits on one axis. If the whole map fits in the window, center it.
function cameraAxis(playerPos: number, view: number, world: number): number {
    if (world <= view) return -(view - world) / 2
    return Math.max(0, Math.min(world - view, playerPos - view / 2))
}

// --- Drawing ---------------------------------------------------------------

// Drawing the canvas
function draw() {
    const time = performance.now()
    const w = canvas.width
    const h = canvas.height

    camX = cameraAxis(player.x + player.size / 2, w, MAP_W * TILE)
    camY = cameraAxis(player.y + player.size / 2, h, MAP_H * TILE)

    ctx.fillStyle = '#1b120a'
    ctx.fillRect(0, 0, w, h)

    // Everything in here is drawn in the "world", shifted by the camera
    ctx.save()
    ctx.translate(-Math.round(camX), -Math.round(camY))

    // Draws only the tiles you can see (the art for each tile is in art.ts)
    const firstCol = Math.max(0, Math.floor(camX / TILE))
    const lastCol = Math.min(MAP_W - 1, Math.floor((camX + w) / TILE))
    const firstRow = Math.max(0, Math.floor(camY / TILE))
    const lastRow = Math.min(MAP_H - 1, Math.floor((camY + h) / TILE))
    for (let row = firstRow; row <= lastRow; row++) {
        for (let col = firstCol; col <= lastCol; col++) {
            const neighbors = {
                up: rows[row - 1]?.[col] ?? ' ',
                down: rows[row + 1]?.[col] ?? ' ',
                left: rows[row][col - 1] ?? ' ',
                right: rows[row][col + 1] ?? ' ',
            }
            drawTileArt(ctx, rows[row][col], col * TILE, row * TILE, col, row, time, neighbors)
        }
    }

    // Items lying on the ground
    for (const item of worldItems) {
        drawItem(ctx, item.col * TILE, item.row * TILE, item.color, time)
    }

    // Treasure chests
    for (const chest of chestDefs) {
        drawChest(ctx, chest.col * TILE, chest.row * TILE, openedChests.has(chest.id), time)
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

    // Draws the player (the look comes from the character designer)
    drawPerson(ctx, player.x, player.y, player.size, appearance, player.facing, player.moving, time)

    // Name tags and quest markers go on top of all the people
    for (const npc of npcs) {
        const cx = npc.col * TILE + TILE / 2
        drawNameTag(ctx, npc.name, cx, npc.row * TILE - 20)
        const marker = markerFor(npc)
        if (marker) drawMarker(ctx, marker, cx, npc.row * TILE - 46, time)
    }
    drawNameTag(ctx, playerName, player.x + player.size / 2, player.y - 26)

    ctx.restore()

    // From here on we draw on the screen itself (not shifted by the camera)
    if (screen === 'title') {
        drawTitleScreen(ctx, w, h, time)
        return
    }
    if (screen === 'designer') {
        drawDesigner(ctx, w, h, designerData(), designerRow, appearance, time)
        return
    }

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

    // The "ENTERING ..." banner
    if (bannerRegion && time - bannerStartedAt < 3400) {
        drawRegionBanner(ctx, w, bannerRegion.name, bannerRegion.subtitle, time - bannerStartedAt)
    }

    if (inventoryOpen) {
        const entries = inventory.flatMap(id => {
            const def = itemDefs.find(i => i.id === id)
            return def ? [{ name: def.name, color: def.color }] : []
        })
        drawInventory(ctx, w, h, entries, time)
    }

    if (mapOpen) {
        drawQuestMap(ctx, w, h, rows, questMarkers(), toTile(player.x + player.size / 2), toTile(player.y + player.size / 2), time)
    }

    if (codexOpen) {
        drawCodex(ctx, w, h, codexEntries(), codexIndex)
    }

    // Dialogue box
    if (talkingTo !== null) {
        // The animated box (slide-in, typewriter text) is drawn in art.ts
        const open = Math.min(1, (time - dialogueOpenedAt) / OPEN_MS)
        drawDialogue(ctx, w, h, talkingTo.name, currentLines[lineIndex], open, charsShown(), time)
    }
}

// Loop to run all the functions and update the frames
function loop() {
    if (screen === 'playing') update()
    draw()
    requestAnimationFrame(loop)
}

loop()
