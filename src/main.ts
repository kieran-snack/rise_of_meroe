/******************************************************************************
 * File:        main.ts
 * Author:      Kieran Provost
 * Date:        10-28-26 (Last edit)
 * Description: The backend and rendering for the Rise of Meroe.
 * 
 * License:     MIT
 ******************************************************************************/


// All the tile and character drawing lives in art.ts
// (TILE, the size of one square in pixels, is defined there)
import type { BuildLine, CodexEntry, CraftRow, DesignerRow, Facing, Hair, MapMarker, MenuItem, Outfit, Slot } from './art.ts'
import {
    CHEST_SIZE, CLOTH_COLORS, EXTRAS, HAIR_COLORS, HAIRS, LOOK_NAMES, TRIM_COLORS, HOTBAR_SLOTS, OUTFITS, PACK_SIZE, PLAYER_SKINS, TILE,
    buttonAt, clearButtons, drawAnimal,
    drawBuildScreen, drawBuilding, drawCapitalProgress,
    drawChest,
    drawChestScreen, drawCodex, drawCraftScreen, drawDesigner, drawDialogue, drawEnding, drawFurnaceScreen, drawHeld, drawHotbar, drawHowToPlay, drawKeyHint, HOWTO_TAB_COUNT,
    drawInventory, drawItem, drawMarker, drawNameTag, drawNotice,
    drawPauseMenu, drawBuildTimer,
    drawPerson,
    drawPlotOutline,
    drawQuestMap, drawQuestPanel,
    drawRegionBanner, drawStamina,
    drawStation, drawTutorial,
    drawTileArt, drawTitleScreen, drawTooltip, drawPathArrow, drawWaypointArrow, drawWaypointBeacon, mapView, pointer, skinFor, windowLayout,
} from './art.ts'
import type { Held, Slots, Stack } from './inventory.ts'
import { MAX_STACK, addTo, countIn, leftClick, makeSlots, removeFrom, rightClick, shiftClick, takeOne } from './inventory.ts'
// Importing our items and quests
import type { AnimalDef } from './animals.ts'
import { animalDefs } from './animals.ts'
import { buildingDefs } from './buildings.ts'
import { setMusic, setSfx, sfx, unlockAudio } from './audio.ts'
import type { ChestDef } from './chests.ts'
import { chestDefs, lootTable } from './chests.ts'
import { civs } from './civs.ts'
import type { ItemDef } from './items.ts'
import { itemDefs } from './items.ts'
import type { Quest } from './quests.ts'
import { quests } from './quests.ts'
import { FURNACE_BAR, FURNACE_FUEL, FURNACE_ORE, SMELT_MS, recipes, stationNames } from './recipes.ts'
import { BLOCK_CHARS, REGIONS, blockInfo, buildWorld, isSolidChar } from './worldgen.ts'

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
// The world (it is built in worldgen.ts): the map, the named places and the named areas
const WORLD = buildWorld()
const rows = WORLD.rows
const at = (name: string) => WORLD.anchors[name]   // a named place, like at('start')
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
const regions: Region[] = REGIONS.map(r => ({ name: r.name, subtitle: r.subtitle, ...WORLD.areas[r.area] }))

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
    outfit: Outfit   // 'kilt' | 'robe' | 'dress' | 'tunic' | 'leopard'
    hair: Hair       // 'short' | 'braids' | 'bald' | 'headwrap' | 'curly' | 'long' | 'cap'
    hairColor?: string
    accent?: string  // the color of the trim (gold if not given)
    extra?: string   // 'necklace', 'earrings', 'armbands' or 'feather'
    lines: string[]  // what they say when they have no quest for you
}

// Making list of villagers
const npcs: Npc[] = [
    {
        name: "Amadi", ...at('amadi'), color: '#8e3b8e', outfit: 'tunic', hair: 'short',
        lines: [
            "Good day, traveler! I am a farmer, and I grow grain by the Nile.",
            "When the river floods, it leaves rich dark soil behind. That is why our barley and sorghum grow so well.",
        ],
    },
    {
        name: "Mustafa", ...at('mustafa'), color: '#00ff84', outfit: 'kilt', hair: 'bald', extra: 'armbands',
        lines: [
            "The fire in my forge never goes cold.",
            "Iron makes our tools and our spears strong. Meroë is famous for its ironworking!",
        ],
    },
    {
        name: "Fatima", ...at('fatima'), color: '#9b2525', outfit: 'dress', hair: 'braids', extra: 'earrings',
        lines: [
            "I am a trader. I carry goods up and down the Nile.",
            "Kush sends gold, ivory and ebony to faraway lands, and brings back fine goods in return.",
        ],
    },
    {
        name: "Mahmoud", ...at('mahmoud'), color: '#1c060a', outfit: 'robe', hair: 'cap', extra: 'necklace',
        lines: [
            "Welcome to Meroë, traveler! For hundreds of years this city was the capital of the Kingdom of Kush.",
            "Look at the pyramids, where our kings and queens rest. They are much steeper than the pyramids of Egypt.",
        ],
    },
    {
        name: "Kasha", ...at('kasha'), color: '#5f12ff', outfit: 'dress', hair: 'headwrap', extra: 'necklace', accent: '#3aa6a0',
        lines: [
            "I am a scribe. I write in the Meroitic script, the alphabet of our people.",
            "Scholars today can read its sounds, but they still do not understand most of our language!",
        ],
    },
    {
        name: "Tebe", ...at('tebe'), color: '#b5654a', outfit: 'dress', hair: 'curly', extra: 'earrings',
        lines: [
            "I make pottery in the old style of Kerma.",
            "Kerma potters were famous for thin bowls with a shiny black top and a red body.",
        ],
    },
    {
        name: "Kheli", ...at('kheli'), color: '#3b6e3b', outfit: 'kilt', hair: 'short', extra: 'feather',
        lines: [
            "I am an archer. The Egyptians called our land Ta-Seti, the Land of the Bow.",
            "Kushite archers were so famous that kings of other lands wanted them in their armies.",
        ],
    },
    {
        name: "Sarem", ...at('sarem'), color: '#8a2b2b', outfit: 'leopard', hair: 'bald', extra: 'necklace',
        lines: [
            "I serve Apedemak, the lion god, in this temple at Naqa.",
            "The walls show our kings and queens standing among the gods.",
        ],
    },
    {
        name: "Hori", ...at('hori'), color: '#e8e0c8', outfit: 'leopard', hair: 'bald',
        lines: [
            "Welcome to Egypt, traveler. I serve in the temple of the god Amun.",
            "The people of Kush worship Amun too. They built a great temple to him at Jebel Barkal.",
        ],
    },
    {
        name: "Nebet", ...at('nebet'), color: '#2f6fb5', outfit: 'dress', hair: 'long', extra: 'earrings',
        lines: [
            "Egypt has always wanted what Kush has: gold, ivory and ebony.",
            "The lands to the south are rich, and we trade for their goods.",
        ],
    },
    {
        name: "Marcus", ...at('marcus'), color: '#a02020', outfit: 'tunic', hair: 'short', accent: '#c0c4c8',
        lines: [
            "I am a soldier of Rome, posted at the border at Syene.",
            "Rome rules Egypt now. Not long ago, a Kushite queen attacked this town. We have not forgotten.",
        ],
    },
    {
        name: "Demetrios", ...at('demetrios'), color: '#b8860b', outfit: 'robe', hair: 'curly', hairColor: '#9a948a',
        lines: [
            "I am a Greek merchant. My ships sail the Red Sea.",
            "Frankincense, ivory and gold: that is what my buyers want.",
        ],
    },
    {
        name: "Berhane", ...at('berhane'), color: '#2e7d32', outfit: 'robe', hair: 'curly', extra: 'necklace',
        lines: [
            "Welcome to Aksum! Our caravans cross the highlands to the sea.",
            "Our port, Adulis, trades with Egypt, Arabia and India.",
        ],
    },
    {
        name: "Dawit", ...at('dawit'), color: '#8a8f98', outfit: 'tunic', hair: 'short', hairColor: '#9a948a', extra: 'armbands',
        lines: [
            "I carve the tall stone pillars of Aksum, called stelae.",
            "Some are cut from a single block of granite and are taller than most buildings.",
        ],
    },
]

// Items lying on the ground. They are put at random spots when the game starts (see scatterWorld below)
const worldItems: ItemDef[] = []

// Treasure chests: which ones you have opened so far
const openedChests = new Set<string>()

// The chests as they are placed in THIS game (their spots are picked at random when the game starts)
const chests: ChestDef[] = chestDefs.map(c => ({ ...c }))

// What is inside each chest you have opened (rolled the first time you open it)
const chestContents = new Map<string, Slots>()

// The chest window: which chest is open
interface ChestUi {
    chest: ChestDef
    furnace?: boolean   // the furnace window uses the chest window code (its 3 slots are 'slot:chest:0..2')
}
let chestUi: ChestUi | null = null

// --- Stations, crafting and building --------------------------------------
// The workplaces in Meroë. They are solid, so you stand next to one and press E.
const STATIONS = ['furnace', 'stoneworks', 'goldsmith', 'brickyard', 'kiln']
const stationTiles = STATIONS.map(name => ({ name, ...at(name) }))

// The furnace: slot 0 = ore, slot 1 = fuel, slot 2 = the bars that come out
const FURNACE_CHEST: ChestDef = { id: 'furnace', col: 0, row: 0, loot: [], area: '' }
const furnaceSlots: Slots = makeSlots(3)
chestContents.set('furnace', furnaceSlots)
let furnaceProgress = 0   // 0..1 while smelting
let lastFurnaceTick = performance.now()

// The crafting window (for a station) or the building window (for a plot) that is open
interface PanelUi {
    kind: 'craft' | 'build'
    id: string   // the station name, or the building id
}
let panelUi: PanelUi | null = null

// The building plots in the plaza, and which buildings are finished (building id -> when it was started)
const plots = buildingDefs.map(def => ({ def, ...WORLD.areas[def.plot] }))
const built = new Map<string, number>()
const announced = new Set<string>()   // finished buildings whose fact has been shown

// How long a building takes to go up: half a second for every tile of its plot (15 to 40 seconds)
function buildMs(p: { col0: number; col1: number; row0: number; row1: number }): number {
    return (p.col1 - p.col0 + 1) * (p.row1 - p.row0 + 1) * 500
}

// Is this building finished (not just started)?
function isFinished(id: string): boolean {
    const p = plots.find(q => q.def.id === id)
    const startedAt = built.get(id)
    return p !== undefined && startedAt !== undefined && performance.now() - startedAt >= buildMs(p)
}

// Has the player done every quest this building needs?
function questsDoneFor(def: { requires?: string[] }): boolean {
    return (def.requires ?? []).every(id => stateOf(id) === 'done')
}

function canBuild(def: { cost: { id: string; count: number }[]; requires?: string[] }): boolean {
    return questsDoneFor(def) && def.cost.every(c => hasItem(c.id, c.count))
}

function finishedCount(): number {
    return plots.filter(p => isFinished(p.def.id)).length
}

// A building that has just been finished: a gold burst, a fanfare and the fact about it
function checkFinishedBuildings() {
    for (const p of plots) {
        if (announced.has(p.def.id) || !isFinished(p.def.id)) continue
        if (talkingTo !== null) return   // wait until the dialogue box is free
        announced.add(p.def.id)
        for (let i = 0; i < 6; i++) burst(p.col0 + Math.floor(Math.random() * (p.col1 - p.col0 + 1)), p.row0 + Math.floor(Math.random() * (p.row1 - p.row0 + 1)), '#e8c75a')
        sfx('quest')
        startDialogue(speakerNamed('Finished: ' + p.def.name), [p.def.fact])
    }
}
const craftedBefore = new Set<string>()   // recipes you have crafted at least once (the first time shows a fact)

function isBuilt(col: number, row: number): boolean {
    return plots.some(p => built.has(p.def.id) && col >= p.col0 && col <= p.col1 && row >= p.row0 && row <= p.row1)
}

// A short message shown at the top of the screen (like "New Codex entry unlocked")
let noticeText = ''
let noticeAt = -99999
function notify(text: string) {
    noticeText = text
    noticeAt = performance.now()
}

// Returns true if a tile (or villager) is solid
function isSolid(col: number, row: number): boolean {
    return isSolidChar(rows[row]?.[col]) || npcs.some(n => n.col === col && n.row === row) ||
        stationTiles.some(s => s.col === col && s.row === row) || isBuilt(col, row)
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
    return chests.find(c =>
        Math.hypot(px - (c.col * TILE + TILE / 2), py - (c.row * TILE + TILE / 2)) < 44)
}


// Defining player + adding characteristics (starts near the middle of the village)
const player = { x: at('start').col * TILE + 6, y: at('start').row * TILE + 6, size: 20, speed: 2, facing: 'down' as Facing, moving: false }

// What the player looks like (changed in the character designer)
const appearance = {
    skin: PLAYER_SKINS[2],
    cloth: CLOTH_COLORS[0],
    accent: '#d4a82a',
    outfit: 'kilt' as Outfit,
    hair: 'short' as Hair,
    hairColor: HAIR_COLORS[0][1],
    extra: 'none',
}
let playerName = 'Traveler'

// Which screen are we on, and which pop-ups are open?
type Screen = 'title' | 'howto' | 'designer' | 'playing' | 'ending'
let screen: Screen = 'title'
let inventoryOpen = false
let mapOpen = false

// Your waypoint (set by clicking the World Map), or null if you have none
let waypoint: { col: number; row: number } | null = null

// The walking route to your waypoint: a list of tiles. It is worked out again when you reach a new tile.
let waypointPath: { col: number; row: number }[] = []
let pathFor = ''   // which start tile, waypoint and buildings the route was worked out for

// Finds the shortest walking route from one tile to (next to) another, around anything solid.
// It spreads out from the start one ring of tiles at a time (a "breadth-first search"),
// remembering where it came from, then follows those steps back from the end.
function findPath(fromCol: number, fromRow: number, toCol: number, toRow: number): { col: number; row: number }[] {
    const cols = rows[0].length
    const cameFrom = new Int32Array(cols * rows.length).fill(-1)
    const start = fromRow * cols + fromCol
    cameFrom[start] = start
    const queue = [start]
    let end = -1
    for (let head = 0; head < queue.length; head++) {
        const k = queue[head]
        const c = k % cols
        const r = (k - c) / cols
        if (Math.abs(c - toCol) <= 1 && Math.abs(r - toRow) <= 1) {
            end = k   // close enough (the waypoint itself might be on something solid)
            break
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dx
            const nr = r + dy
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows.length) continue
            const nk = nr * cols + nc
            if (cameFrom[nk] !== -1 || isSolid(nc, nr)) continue
            cameFrom[nk] = k
            queue.push(nk)
        }
    }
    if (end < 0) return []   // no way to get there
    const path: { col: number; row: number }[] = []
    for (let k = end; k !== start; k = cameFrom[k]) path.push({ col: k % cols, row: Math.floor(k / cols) })
    return path.reverse()
}

function updateWaypointPath() {
    if (!waypoint) {
        waypointPath = []
        pathFor = ''
        return
    }
    const col = toTile(player.x + player.size / 2)
    const row = toTile(player.y + player.size / 2)
    const key = col + ',' + row + ',' + waypoint.col + ',' + waypoint.row + ',' + built.size
    if (key !== pathFor) {
        pathFor = key
        waypointPath = findPath(col, row, waypoint.col, waypoint.row)
    }
}
let codexOpen = false
let codexIndex = 0   // which page is selected in the Codex
let codexTab: 'kush' | 'world' = 'kush'   // which tab of the Codex is showing

// --- Inventory -------------------------------------------------------------
// Your inventory: 36 slots. Slots 0-8 are the hotbar, slots 9-35 are the 3 big rows.
const inventory: Slots = makeSlots(PACK_SIZE)

// The stack stuck to your mouse cursor while you move things around
const held: Held = { stack: null }

// Which hotbar slot is selected (keys 1-9 or the mouse wheel), and when you last changed it
let hotbarIndex = 0
let hotbarChangedAt = -99999

function selectHotbar(i: number) {
    hotbarIndex = i
    hotbarChangedAt = performance.now()
}

// Civilizations you have learned about (their Codex pages are unlocked)
const discovered = new Set<string>()

// Unlocks the Codex page for any relic that is now in your inventory
function checkDiscoveries() {
    for (const s of inventory) {
        const civId = s ? itemDefs.find(i => i.id === s.id)?.civ : undefined
        if (civId && !discovered.has(civId)) {
            discovered.add(civId)
            const civ = civs.find(c => c.id === civId)
            if (civ) notify('New Codex entry unlocked: ' + civ.name + '. Press C to read it.')
            sfx('codex')
        }
    }
}

// Items lying on the ground because you dropped them (with Q, or because your inventory was full)
interface Drop {
    id: string
    col: number
    row: number
    count: number
}
const drops: Drop[] = []

// --- Animals ---------------------------------------------------------------
// They wander around near the spot where they started
interface Animal {
    def: AnimalDef
    x: number
    y: number
    homeX: number
    homeY: number
    targetX: number
    targetY: number
    facing: Facing
    moving: boolean
    waitUntil: number   // they stand still until this time
}
const animals: Animal[] = []
const seenAnimals = new Set<string>()   // kinds of animal you have learned about

// An animal can't walk into anything solid, or onto the paved plaza where the capital is built
function animalBlocked(x: number, y: number): boolean {
    for (const [cx, cy] of [[x, y], [x + 20, y], [x, y + 20], [x + 20, y + 20]]) {
        const col = toTile(cx)
        const row = toTile(cy)
        if (isSolid(col, row) || rows[row]?.[col] === 'f') return true
    }
    return false
}

function tickAnimals() {
    const now = performance.now()
    for (const a of animals) {
        if (now < a.waitUntil) {
            a.moving = false
            continue
        }
        const dx = a.targetX - a.x
        const dy = a.targetY - a.y
        const d = Math.hypot(dx, dy)
        if (d < 1) {
            // got there: rest a moment, then pick a new spot near home
            a.waitUntil = now + 1000 + Math.random() * 3000
            a.targetX = a.homeX + (Math.random() * 8 - 4) * TILE
            a.targetY = a.homeY + (Math.random() * 8 - 4) * TILE
            continue
        }
        const step = Math.min(d, 0.7 * frameScale)
        const nx = a.x + (dx / d) * step
        const ny = a.y + (dy / d) * step
        if (animalBlocked(nx, ny)) {
            a.targetX = a.x   // something is in the way: give up and pick a new spot next time
            a.targetY = a.y
            continue
        }
        a.x = nx
        a.y = ny
        a.moving = true
        a.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
    }
}

function nearbyAnimal(): Animal | undefined {
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return animals.find(a => Math.hypot(px - (a.x + 10), py - (a.y + 10)) < 56)
}

// Drop items on the tile you are standing on
function dropAt(id: string, count: number) {
    const col = toTile(player.x + player.size / 2)
    const row = toTile(player.y + player.size / 2)
    const same = drops.find(d => d.id === id && d.col === col && d.row === row)
    if (same) same.count += count
    else drops.push({ id, col, row, count })
}

function addItem(id: string, n = 1) {
    const left = addTo(inventory, id, n)
    if (left > 0) {
        dropAt(id, left)
        notify('Your inventory is full, so it was dropped.')
    }
}

function hasItem(id: string, n = 1): boolean {
    return countIn(inventory, id) >= n
}

function removeItem(id: string, n = 1) {
    removeFrom(inventory, id, n)
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
    const needs = q.needs ?? []
    // (an id can be in the list more than once, which means you need that many)
    return needs.filter((id, i) => needs.indexOf(id) === i && !hasItem(id, needs.filter(n => n === id).length))
}

// Which quest a villager wants to talk about right now, and how. Handing in a finished
// quest comes first, then offering a new one, then reminding you what they are waiting for.
function questFor(npc: Npc): { q: Quest; kind: 'thanks' | 'offer' | 'reminder' } | null {
    const ready = quests.find(q => stateOf(q.id) === 'active' && q.target === npc.name && missingItems(q).length === 0)
    if (ready) return { q: ready, kind: 'thanks' }
    const offer = quests.find(q => stateOf(q.id) === 'new' && isAvailable(q) && q.giver === npc.name)
    if (offer) return { q: offer, kind: 'offer' }
    const waiting = quests.find(q => stateOf(q.id) === 'active' && q.target === npc.name)
    if (waiting) return { q: waiting, kind: 'reminder' }
    return null
}

// What should the villager say right now?
function linesFor(npc: Npc): string[] {
    const found = questFor(npc)
    if (!found) return npc.lines // if not in a quest just small talk
    if (found.kind === 'offer') return found.q.offer
    if (found.kind === 'thanks') return found.q.thanks
    return found.q.reminder ?? ['Come back when you have what I asked for.']
}

// The gold "!" or "?" above a villager's head (null = nothing to show)
function markerFor(npc: Npc): string | null {
    const found = questFor(npc)
    if (found?.kind === 'offer') return '!'
    if (found?.kind === 'thanks') return '?'
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

// --- Sparkles --------------------------------------------------------------
// Little particles that fly out when you pick something up or open a chest
interface Spark { x: number; y: number; vx: number; vy: number; born: number; color: string }
const sparks: Spark[] = []
const SPARK_MS = 700

function burst(col: number, row: number, color: string) {
    const now = performance.now()
    for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.6 + Math.random() * 1.6
        sparks.push({
            x: col * TILE + TILE / 2, y: row * TILE + TILE / 2,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
            born: now, color: i % 3 === 0 ? '#fff6c8' : color,
        })
    }
}

// When you pressed Begin: the world fades in from black
let playStartedAt = -99999

// Pick an item up off the ground
// Perks: a wearable gives its bonus while it is anywhere in your inventory
function hasPerk(id: string): boolean {
    return hasItem(id)
}

// Items you have picked up at least once (the first time shows the item's fact)
const seenItems = new Set<string>()

function pickUp(item: ItemDef) {
    burst(item.col, item.row, item.color)
    addItem(item.id)
    let extra = 0
    if (hasPerk('iron-hoe') && ['clay', 'wood', 'sandstone', 'sorghum'].includes(item.id)) extra++
    if (hasPerk('bead-necklace') && Math.random() < 0.25) extra++
    if (extra > 0) addItem(item.id, extra)
    worldItems.splice(worldItems.indexOf(item), 1)
    sfx('pickup')
    tutorialDid('pickup')
    if (settings.factsEveryTime || !seenItems.has(item.id)) {
        seenItems.add(item.id)
        startDialogue(speakerNamed(`Found: ${item.name}`), [item.fact])
    } else {
        notify('+' + (1 + extra) + ' ' + item.name + (extra > 0 ? ' (perk bonus!)' : ''))
    }
}

// Roll what a chest holds: the items it always has, plus a few random extras
function rollChest(chest: ChestDef): string[] {
    const found = [...chest.loot]
    const pool = [...lootTable]
    const rolls = (chest.rolls ?? 1) + (hasPerk('leopard-cloak') ? 1 : 0)
    for (let i = 0; i < rolls && pool.length > 0; i++) {
        // take a random item out of the pool, so the same extra can't show up twice
        found.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    return found
}

// Open a chest: the first time, what is inside gets rolled and put into its slots
function openChest(chest: ChestDef) {
    if (!chestContents.has(chest.id)) {
        const slots = makeSlots(CHEST_SIZE)
        for (const id of rollChest(chest)) addTo(slots, id)
        chestContents.set(chest.id, slots)
    }
    openedChests.add(chest.id)
    burst(chest.col, chest.row, '#e8c75a')
    sfx('open')
    chestUi = { chest }
}

// A dropped item close enough to pick up
function nearbyDrop(): Drop | undefined {
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return drops.find(d => Math.hypot(px - (d.col * TILE + TILE / 2), py - (d.row * TILE + TILE / 2)) < 40)
}

function pickUpDrop(d: Drop) {
    drops.splice(drops.indexOf(d), 1)
    addItem(d.id, d.count)   // (if it does not all fit, the rest is dropped again)
    sfx('pickup')
    notify('+' + d.count + ' ' + nameOf(d.id))
    tutorialDid('pickup')
}

// What a stack looks like on screen (its name, color and fact come from items.ts)
function viewOne(s: Stack | null): Slot | null {
    if (!s) return null
    const def = itemDefs.find(i => i.id === s.id)
    return def ? { id: s.id, name: def.name, color: def.color, count: s.count, fact: def.perk ? def.fact + ' PERK (while you carry it): ' + def.perk : def.fact } : null
}

function viewOf(slots: Slots): (Slot | null)[] {
    return slots.map(viewOne)
}

// The item under a 'slot:...' or 'hotbar:...' button (null if it is empty or not a slot)
function slotForButton(id: string | null): Slot | null {
    if (!id) return null
    if (id.startsWith('hotbar:')) return viewOne(inventory[Number(id.slice(7))])
    if (!id.startsWith('slot:')) return null
    const [, region, num] = id.split(':')
    const i = Number(num)
    if (region === 'hotbar') return viewOne(inventory[i])
    if (region === 'main') return viewOne(inventory[HOTBAR_SLOTS + i])
    if (region === 'chest' && chestUi) return viewOne(chestContents.get(chestUi.chest.id)?.[i] ?? null)
    return null
}

// Close every window. Anything stuck to the mouse goes back into your inventory.
function closeWindows() {
    if (held.stack) {
        const left = addTo(inventory, held.stack.id, held.stack.count)
        if (left > 0) dropAt(held.stack.id, left)
        held.stack = null
    }
    inventoryOpen = false
    mapOpen = false
    codexOpen = false
    chestUi = null
    panelUi = null
}

// A click on one of the slots in the inventory or chest window
function slotClick(id: string, mouseButton: number, shift: boolean) {
    const [, region, num] = id.split(':')
    const chestSlots = chestUi ? chestContents.get(chestUi.chest.id) : undefined
    let slots: Slots
    let index: number
    if (region === 'chest' && chestSlots) {
        slots = chestSlots
        index = Number(num)
    } else if (region === 'hotbar') {
        slots = inventory
        index = Number(num)
    } else if (region === 'main') {
        slots = inventory
        index = HOTBAR_SLOTS + Number(num)
    } else {
        return
    }

    // the furnace only takes ore and fuel, and nothing can be put into its output slot
    if (chestUi?.furnace && region === 'chest' && held.stack) {
        const ok = index === 0 ? FURNACE_ORE : index === 1 ? FURNACE_FUEL : null
        if (held.stack.id !== ok) return
    }

    if (shift) {
        // shift-click sends the whole stack to the other side
        if (region === 'chest') {
            shiftClick(slots, index, [
                { slots: inventory, from: 0, to: HOTBAR_SLOTS },
                { slots: inventory, from: HOTBAR_SLOTS, to: PACK_SIZE },
            ])
        } else if (chestSlots && chestUi?.furnace) {
            // ore goes into the first furnace slot, wood into the second, everything else stays
            const id = slots[index]?.id
            const to = id === FURNACE_ORE ? 0 : id === FURNACE_FUEL ? 1 : -1
            if (to >= 0) shiftClick(slots, index, [{ slots: chestSlots, from: to, to: to + 1 }])
        } else if (chestSlots) {
            shiftClick(slots, index, [{ slots: chestSlots, from: 0, to: CHEST_SIZE }])
        } else if (region === 'hotbar') {
            shiftClick(slots, index, [{ slots: inventory, from: HOTBAR_SLOTS, to: PACK_SIZE }])
        } else {
            shiftClick(slots, index, [{ slots: inventory, from: 0, to: HOTBAR_SLOTS }])
        }
    } else if (mouseButton === 2) {
        rightClick(slots, index, held)
    } else {
        leftClick(slots, index, held)
    }
}

// Q drops ONE item: the one under the mouse in a window, the one stuck to the mouse,
// or the one in your selected hotbar slot when no window is open
function dropWithQ() {
    if (!inventoryOpen && chestUi === null) {
        if (talkingTo !== null || mapOpen || codexOpen || panelUi !== null) return
        const id = takeOne(inventory, hotbarIndex)
        if (id) dropAt(id, 1)
        return
    }
    const under = buttonAt(pointer.x, pointer.y)
    if (under && under.startsWith('slot:') && !under.startsWith('slot:chest:')) {
        const [, region, num] = under.split(':')
        const index = region === 'hotbar' ? Number(num) : HOTBAR_SLOTS + Number(num)
        const id = takeOne(inventory, index)
        if (id) dropAt(id, 1)
    } else if (held.stack) {
        dropAt(held.stack.id, 1)
        held.stack.count--
        if (held.stack.count === 0) held.stack = null
    }
}

// Called when the last line of a conversation is dismissed
function finishTalking(npc: Npc) {
    const found = questFor(npc)
    if (found?.kind === 'offer') {
        questState.set(found.q.id, 'active') // accepted
        tutorialDid('quest')
    } else if (found?.kind === 'thanks') {
        const q = found.q
        for (const id of q.needs ?? []) removeItem(id) // hand the items over
        const bonus = hasPerk('gold-collar') ? 1 : 0   // (the gold collar gives 1 more of each reward)
        for (const r of q.reward ?? []) addItem(r.id, r.count + bonus) // and get the reward
        if (q.reward) notify('Reward: ' + q.reward.map(r => (r.count + bonus) + ' ' + nameOf(r.id)).join(', '))
        questState.set(q.id, 'done') // completed
        sfx('quest')
        // reuse the dialogue box to show the fact
        talkingTo = speakerNamed('Did you know?')
        currentLines = [q.fact]
        lineIndex = 0
        lineStartedAt = performance.now() // the fact types out like any other line
        return
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

// A station (furnace, stoneworks, ...) close enough to use
function nearbyStation(): string | undefined {
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return stationTiles.find(s => Math.hypot(px - (s.col * TILE + TILE / 2), py - (s.row * TILE + TILE / 2)) < 56)?.name
}

// An empty building plot you are standing at (or next to)
function nearbyPlot() {
    const px = player.x + player.size / 2
    const py = player.y + player.size / 2
    return plots.find(p => !built.has(p.def.id) &&
        px >= p.col0 * TILE - 30 && px <= (p.col1 + 1) * TILE + 30 &&
        py >= p.row0 * TILE - 30 && py <= (p.row1 + 1) * TILE + 30)
}

function openStation(name: string) {
    sfx('open')
    if (name === 'furnace') chestUi = { chest: FURNACE_CHEST, furnace: true }
    else panelUi = { kind: 'craft', id: name }
}

// Smelting goes on all the time, even while the window is closed
function tickFurnace() {
    const now = performance.now()
    const dt = Math.min(500, now - lastFurnaceTick)
    lastFurnaceTick = now
    const [ore, fuel, bar] = furnaceSlots
    const canSmelt = ore?.id === FURNACE_ORE && fuel?.id === FURNACE_FUEL &&
        (bar === null || (bar.id === FURNACE_BAR && bar.count < MAX_STACK))
    if (!canSmelt) {
        furnaceProgress = 0
        return
    }
    furnaceProgress += dt / (SMELT_MS * (hasPerk('faience-amulet') ? 0.5 : 1))
    if (furnaceProgress >= 1) {
        furnaceProgress = 0
        for (const i of [0, 1]) {
            const s = furnaceSlots[i]!
            furnaceSlots[i] = s.count > 1 ? { id: s.id, count: s.count - 1 } : null
        }
        furnaceSlots[2] = { id: FURNACE_BAR, count: (bar?.count ?? 0) + 1 }
        tutorialDid('craft')   // smelting counts as crafting too
        const f = at('furnace')
        burst(f.col, f.row, '#ff9a3c')
        if (chestUi?.furnace) sfx('smelt')   // (only heard while the furnace window is open)
    }
}

// What an item is called
function nameOf(id: string): string {
    return itemDefs.find(i => i.id === id)?.name ?? id
}

// Craft one recipe (the button in a station window)
function craftRecipe(id: string) {
    const r = recipes.find(x => x.id === id)
    if (!r || !r.inputs.every(i => hasItem(i.id, i.count))) return
    for (const i of r.inputs) removeItem(i.id, i.count)
    addItem(r.output.id, r.output.count)
    notify('Crafted ' + r.output.count + ' ' + nameOf(r.output.id))
    sfx('craft')
    tutorialDid('craft')
    if (!craftedBefore.has(r.id)) {
        craftedBefore.add(r.id)
        startDialogue(speakerNamed('Did you know?'), [r.fact])
    }
}

// If the player overlaps something solid (like a building that just went up), move them to the nearest free spot
function unstick() {
    if (!blocked(player.x, player.y)) return
    const col0 = toTile(player.x + player.size / 2)
    const row0 = toTile(player.y + player.size / 2)
    for (let ring = 1; ring < 12; ring++) {
        for (let dy = -ring; dy <= ring; dy++) {
            for (let dx = -ring; dx <= ring; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue   // only the edge of this ring
                const x = (col0 + dx) * TILE + 6
                const y = (row0 + dy) * TILE + 6
                if (!blocked(x, y)) {
                    player.x = x
                    player.y = y
                    return
                }
            }
        }
    }
}

// Build the building of the plot window that is open
function constructBuilding() {
    const plot = plots.find(p => p.def.id === panelUi?.id)
    if (!plot || built.has(plot.def.id) || !canBuild(plot.def)) return
    for (const c of plot.def.cost) removeItem(c.id, c.count)
    built.set(plot.def.id, performance.now())
    sfx('build')
    unstick()   // if you were standing on (or at the edge of) the plot, step out of it
    // items you dropped on the plot are pushed out to just below it
    for (const d of drops) {
        if (d.col >= plot.col0 && d.col <= plot.col1 && d.row >= plot.row0 && d.row <= plot.row1) d.row = plot.row1 + 1
    }
    for (let i = 0; i < 3; i++) burst(plot.col0 + Math.floor(Math.random() * (plot.col1 - plot.col0 + 1)), plot.row1, '#e8c75a')
    panelUi = null
    notify('The builders are at work on ' + plot.def.name + '. It will take ' + Math.round(buildMs(plot) / 1000) + ' seconds.')
}

// What happens when you press E while playing
function interact() {
    if (talkingTo === null) {
        // Everything you could use from where you stand, with how far away it is. The closest one wins.
        const px = player.x + player.size / 2
        const py = player.y + player.size / 2
        const dist = (col: number, row: number) => Math.hypot(px - (col * TILE + TILE / 2), py - (row * TILE + TILE / 2))
        const options: { d: number; use: () => void }[] = []

        const item = nearbyItem()
        if (item) options.push({ d: dist(item.col, item.row), use: () => pickUp(item) })
        const drop = nearbyDrop()
        if (drop) options.push({ d: dist(drop.col, drop.row), use: () => pickUpDrop(drop) })
        const chest = nearbyChest()
        if (chest) options.push({ d: dist(chest.col, chest.row), use: () => openChest(chest) })
        const station = stationTiles.find(s => s.name === nearbyStation())
        if (station) options.push({ d: dist(station.col, station.row), use: () => openStation(station.name) })
        const plot = nearbyPlot()
        if (plot) {
            // distance to the edge of the plot (0 when you stand on it)
            const dx = Math.max(plot.col0 * TILE - px, 0, px - (plot.col1 + 1) * TILE)
            const dy = Math.max(plot.row0 * TILE - py, 0, py - (plot.row1 + 1) * TILE)
            options.push({ d: Math.hypot(dx, dy), use: () => {
                panelUi = { kind: 'build', id: plot.def.id }
                tutorialDid('plot')
            } })
        }
        const npc = nearbyNpc()
        if (npc) options.push({ d: dist(npc.col, npc.row), use: () => startDialogue(npc, linesFor(npc)) })
        const animal = nearbyAnimal()
        if (animal) {
            options.push({
                d: Math.hypot(px - (animal.x + 10), py - (animal.y + 10)),
                use: () => {
                    seenAnimals.add(animal.def.kind)
                    startDialogue(speakerNamed(animal.def.name), [animal.def.fact])
                },
            })
        }

        options.sort((a, b) => a.d - b.d)
        options[0]?.use()
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
    else if (designerRow === 4) appearance.hairColor = cycle(HAIR_COLORS.map(c => c[1]), appearance.hairColor, dir)
    else if (designerRow === 5) appearance.cloth = cycle(CLOTH_COLORS, appearance.cloth, dir)
    else if (designerRow === 6) appearance.accent = cycle(TRIM_COLORS.map(c => c[1]), appearance.accent, dir)
    else if (designerRow === 7) appearance.extra = cycle(EXTRAS, appearance.extra, dir)
}

function designerData(): DesignerRow[] {
    const cursor = designerRow === 0 && Math.floor(performance.now() / 500) % 2 === 0 ? '_' : ''
    return [
        { label: 'Name', text: playerName + cursor },
        { label: 'Skin', text: `Tone ${PLAYER_SKINS.indexOf(appearance.skin) + 1}`, swatch: appearance.skin },
        { label: 'Outfit', text: LOOK_NAMES[appearance.outfit] },
        { label: 'Hair', text: LOOK_NAMES[appearance.hair] },
        { label: 'Hair color', text: HAIR_COLORS.find(c => c[1] === appearance.hairColor)?.[0] ?? 'Black', swatch: appearance.hairColor },
        { label: 'Clothes', text: `Color ${CLOTH_COLORS.indexOf(appearance.cloth) + 1}`, swatch: appearance.cloth },
        { label: 'Trim', text: TRIM_COLORS.find(c => c[1] === appearance.accent)?.[0] ?? 'Gold', swatch: appearance.accent },
        { label: 'Extra', text: LOOK_NAMES[appearance.extra] ?? 'None' },
    ]
}

function handleDesignerKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        startPlaying()
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
    // perks: the copper mirror shows every material, the hunting bow shows unopened chests
    if (hasPerk('copper-mirror')) for (const it of worldItems) marks.push({ col: it.col, row: it.row, kind: 'resource', color: it.color })
    if (hasPerk('archer-bow')) for (const c of chests) if (!openedChests.has(c.id)) marks.push({ col: c.col, row: c.row, kind: 'chest' })
    return marks
}

// --- Codex -----------------------------------------------------------------
function codexEntries(): CodexEntry[] {
    return civs.filter(c => (c.group ?? 'world') === codexTab).map(c => ({
        id: c.id,
        name: c.name,
        years: c.years,
        relation: c.relation,
        summary: c.summary,
        unlocked: discovered.has(c.id),
    }))
}

// --- Keys ------------------------------------------------------------------

// --- Character designer ---------------------------------------------------------------------
const DESIGNER_ROWS = 8
let designerRow = 0


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

// What happens when a button is clicked. The ids come from the draw functions in art.ts.
function onButton(id: string, mouseButton: number, shift: boolean) {
    if (settingsOpen) {
        if (id.startsWith('set-')) useSettings(id)
        return
    }
    if (screen === 'title') {
        if (id.startsWith('menu-')) useMenu(id)
        return
    }
    if (screen === 'howto') {
        if (id.startsWith('howto-tab-')) howtoTab = Number(id.slice(10))
        if (id === 'howto-continue') screen = howtoBack
        return
    }
    if (screen === 'ending') {
        if (id === 'ending-continue') screen = 'playing'
        return
    }
    if (screen === 'designer') {
        if (id.startsWith('designer-row-')) {
            designerRow = Number(id.slice(13))
        } else if (id.startsWith('designer-left-')) {
            designerRow = Number(id.slice(14))
            changeOption(-1)
        } else if (id.startsWith('designer-right-')) {
            designerRow = Number(id.slice(15))
            changeOption(1)
        } else if (id === 'designer-begin') {
            startPlaying()
        }
        return
    }

    // screen === 'playing'
    if (pauseOpen) {
        if (id.startsWith('pause-')) usePause(id)
        return
    }
    if (id === 'dialogue') {
        if (talkingTo !== null) interact()   // only while a conversation is open
    } else if (id === 'close') closeWindows()
    else if (id === 'map') {
        // which tile was clicked? (the opposite of how the map is drawn)
        const col = Math.floor((pointer.x - mapView.ox) / mapView.ts)
        const row = Math.floor((pointer.y - mapView.oy) / mapView.ts)
        const nearOld = waypoint !== null && Math.abs(waypoint.col - col) <= 2 && Math.abs(waypoint.row - row) <= 2
        if (mouseButton === 2 || nearOld) waypoint = null   // right-click, or clicking the pin again, removes it
        else waypoint = { col, row }
        sfx('click')
    }
    else if (id.startsWith('codex-entry-')) codexIndex = Number(id.slice(12))
    else if (id.startsWith('codex-tab-')) {
        codexTab = id.slice(10) === 'kush' ? 'kush' : 'world'
        codexIndex = 0
    }
    else if (id.startsWith('hotbar:')) selectHotbar(Number(id.slice(7)))
    else if (id.startsWith('slot:')) slotClick(id, mouseButton, shift)
    else if (id.startsWith('craft:')) craftRecipe(id.slice(6))
    else if (id === 'build') constructBuilding()
}

// Keys that do something once per press (not held down)
addEventListener('keydown', (e) => {
    if (e.repeat) return
    const key = e.key.toLowerCase()
    unlockAudio()

    if (settingsOpen) {
        const items = settingsItems()
        if (key === 'escape') settingsOpen = false
        else if (key === 'arrowup' || key === 'w') settingsIndex = (settingsIndex + items.length - 1) % items.length
        else if (key === 'arrowdown' || key === 's') settingsIndex = (settingsIndex + 1) % items.length
        else if (key === 'enter') useSettings(items[settingsIndex].id)
        return
    }

    if (screen === 'title') {
        const items = menuItems()
        if (key === 'arrowup' || key === 'w') menuIndex = (menuIndex + items.length - 1) % items.length
        else if (key === 'arrowdown' || key === 's') menuIndex = (menuIndex + 1) % items.length
        else if (key === 'enter') useMenu(items[Math.min(menuIndex, items.length - 1)].id)
        return
    }
    if (screen === 'howto') {
        if (key === 'arrowleft' || key === 'a') howtoTab = (howtoTab + HOWTO_TAB_COUNT - 1) % HOWTO_TAB_COUNT
        else if (key === 'arrowright' || key === 'd') howtoTab = (howtoTab + 1) % HOWTO_TAB_COUNT
        if (key === 'enter') screen = howtoBack
        else if (key === 'escape') screen = 'title'
        return
    }
    if (screen === 'ending') {
        if (key === 'enter' || key === 'escape') screen = 'playing'
        return
    }
    if (screen === 'designer') {
        handleDesignerKey(e)
        return
    }

    // screen === 'playing'
    if (pauseOpen) {
        const items = pauseItems()
        if (key === 'escape') pauseOpen = false
        else if (key === 'arrowup' || key === 'w') pauseIndex = (pauseIndex + items.length - 1) % items.length
        else if (key === 'arrowdown' || key === 's') pauseIndex = (pauseIndex + 1) % items.length
        else if (key === 'enter') usePause(items[pauseIndex].id)
        return
    }
    if (key === 'escape') {
        // Esc closes whatever is open. With nothing open, it opens the pause menu.
        if (inventoryOpen || mapOpen || codexOpen || chestUi !== null || panelUi !== null) closeWindows()
        else if (talkingTo === null) {
            pauseOpen = true
            pauseIndex = 0
        }
        return
    }
    if (key === 'q') {
        dropWithQ()
        return
    }
    if (chestUi !== null) {
        if (key === 'e' || key === 'i') closeWindows()   // like in Minecraft, E closes the chest
        return
    }
    if (talkingTo !== null) {
        if (key === 'e') interact()   // while talking, only E does anything
        return
    }
    if (panelUi !== null) {
        if (key === 'e' || key === 'i') closeWindows()
        return
    }
    if (key === 'i') {
        const wasOpen = inventoryOpen
        closeWindows()
        inventoryOpen = !wasOpen
        if (inventoryOpen) tutorialDid('inventory')
    } else if (key === 'm') {
        const wasOpen = mapOpen
        closeWindows()
        mapOpen = !wasOpen
        if (mapOpen) tutorialDid('map')
    } else if (key === 'c') {
        const wasOpen = codexOpen
        closeWindows()
        codexOpen = !wasOpen
        if (codexOpen) tutorialDid('map')
    } else if (codexOpen && (key === 'arrowup' || key === 'arrowdown')) {
        const step = key === 'arrowup' ? -1 : 1
        const count = codexEntries().length
        codexIndex = (codexIndex + step + count) % count
    } else if (codexOpen && (key === 'arrowleft' || key === 'arrowright')) {
        codexTab = codexTab === 'kush' ? 'world' : 'kush'
        codexIndex = 0
    } else if (key === 'e') {
        if (inventoryOpen) closeWindows()
        else if (!mapOpen && !codexOpen) interact()
    } else if (key.length === 1 && key >= '1' && key <= '9' && !inventoryOpen && !mapOpen && !codexOpen) {
        selectHotbar(Number(key) - 1)
    }
})

// --- Mouse -----------------------------------------------------------------
// Remember where the mouse is (art.ts uses this for hover highlights and tooltips)
function setPointer(e: MouseEvent) {
    const r = canvas.getBoundingClientRect()
    pointer.x = e.clientX - r.left
    pointer.y = e.clientY - r.top
}
addEventListener('mousemove', setPointer)

// No right-click menu on the game
canvas.addEventListener('contextmenu', (e) => e.preventDefault())

canvas.addEventListener('mousedown', (e) => {
    setPointer(e)
    unlockAudio()
    const id = buttonAt(pointer.x, pointer.y)
    if (id === null) {
        // clicking outside a window while carrying something drops it, like in Minecraft
        if (screen === 'playing' && (inventoryOpen || chestUi !== null) && held.stack) {
            dropAt(held.stack.id, held.stack.count)
            held.stack = null
        }
        return
    }
    onButton(id, e.button, e.shiftKey)
})

// The mouse wheel changes the selected hotbar slot
addEventListener('wheel', (e) => {
    if (screen !== 'playing' || pauseOpen || inventoryOpen || mapOpen || codexOpen || chestUi !== null || panelUi !== null || talkingTo !== null) return
    selectHotbar((hotbarIndex + (e.deltaY > 0 ? 1 : HOTBAR_SLOTS - 1)) % HOTBAR_SLOTS)
}, { passive: true })


// Function to update the key listeners, fix diagonal speed, and clamping the player's
// boundaries
// Stamina for sprinting: 1 = full
let stamina = 1
let tired = false

function update() {
    let dx = 0
    let dy = 0

    // You can't walk while you're talking
    if (pauseOpen || talkingTo !== null || inventoryOpen || mapOpen || codexOpen || chestUi !== null || panelUi !== null) {
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

    // Sprinting: hold Shift while walking. It uses stamina; when it runs out you must rest a bit.
    const wantsSprint = keys.has('shift') && (keys.has('a') || keys.has('d') || keys.has('w') || keys.has('s') ||
        keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown'))
    if (tired && stamina > 0.3) tired = false
    const sprinting = wantsSprint && !tired
    if (sprinting) {
        stamina = Math.max(0, stamina - 0.004 * frameScale * (hasPerk('water-jar') ? 0.5 : 1))
        if (stamina === 0) tired = true
    } else {
        stamina = Math.min(1, stamina + 0.003 * frameScale * (hasPerk('feather-fan') ? 2 : 1))
    }
    const speed = player.speed * (sprinting ? 1.6 : 1) * (hasPerk('iron-spear') ? 1.15 : 1) * frameScale

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
    if (player.moving) tutorialDid('move')
    if (dx < 0) player.facing = 'left'
    else if (dx > 0) player.facing = 'right'
    else if (dy < 0) player.facing = 'up'
    else if (dy > 0) player.facing = 'down'

    // Run our collision-detecting functions and store the output
    // in variables
    const nextX = player.x + dx * speed
    if (!blocked(nextX, player.y)) player.x = nextX
    
    const nextY = player.y + dy * speed
    if (!blocked(player.x, nextY)) player.y = nextY

    // Makes sure the player cannot go outside the boundaries
    player.x = Math.max(0, Math.min(MAP_W * TILE - player.size, player.x))
    player.y = Math.max(0, Math.min(MAP_H * TILE - player.size, player.y))

    // Reached your waypoint? Then it disappears
    if (waypoint) {
        const dx = waypoint.col * TILE + TILE / 2 - (player.x + player.size / 2)
        const dy = waypoint.row * TILE + TILE / 2 - (player.y + player.size / 2)
        if (Math.hypot(dx, dy) < TILE * 1.5) {
            waypoint = null
            notify('You reached your waypoint.')
            sfx('pickup')
        }
    }
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
    clearButtons()   // the draw functions below list everything that can be clicked
    const time = performance.now()
    const w = canvas.width
    const h = canvas.height

    let focusX = player.x + player.size / 2
    let focusY = player.y + player.size / 2
    if (celebrationStartedAt >= 0 && !endingShown) {
        const t = Math.min(1, (time - celebrationStartedAt) / 2500)
        const ease = t * t * (3 - 2 * t)
        const pan = Math.sin((time - celebrationStartedAt) / 3000) * 6 * TILE
        focusX = focusX + (70 * TILE + pan - focusX) * ease
        focusY = focusY + (106 * TILE - focusY) * ease
    }
    if (screen === 'title') {
        const t = (1 - Math.cos(time / 14000)) / 2   // 0 -> 1 -> 0, slowly
        focusX = (35 + (84 - 35) * t) * TILE
        focusY = (104 + (102 - 104) * t) * TILE
    }
    camX = cameraAxis(focusX, w, MAP_W * TILE)
    camY = cameraAxis(focusY, h, MAP_H * TILE)

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
                block: BLOCK_CHARS.includes(rows[row][col]) ? blockInfo(rows, col, row) : undefined,
            }
            drawTileArt(ctx, rows[row][col], col * TILE, row * TILE, col, row, time, neighbors)
        }
    }

    // The building plots (empty ones show an outline, finished ones show the building) and the stations
    for (const p of plots) {
        const bx = p.col0 * TILE
        const by = p.row0 * TILE
        const bw = (p.col1 - p.col0 + 1) * TILE
        const bh = (p.row1 - p.row0 + 1) * TILE
        if (bx + bw < camX || bx > camX + w || by + bh < camY || by > camY + h) continue
        const startedAt = built.get(p.def.id)
        if (startedAt === undefined) drawPlotOutline(ctx, bx, by, bw, bh, p.def.name, time)
        else drawBuilding(ctx, bx, by, bw, bh, p.def.id, time, Math.min(1, (time - startedAt) / buildMs(p)))
    }
    for (const s of stationTiles) drawStation(ctx, s.col * TILE, s.row * TILE, s.name, time)

    // Items lying on the ground
    for (const item of worldItems) {
        drawItem(ctx, item.col * TILE, item.row * TILE, item.color, time, item.id)
    }

    // Items you dropped
    for (const d of drops) {
        const def = itemDefs.find(i => i.id === d.id)
        if (def) drawItem(ctx, d.col * TILE, d.row * TILE, def.color, time, d.id)
    }

    // Treasure chests
    for (const chest of chests) {
        drawChest(ctx, chest.col * TILE, chest.row * TILE, openedChests.has(chest.id), time)
    }

    // Draws the villagers (each one keeps its own color for its clothes)
    for (const npc of npcs) {
        drawPerson(
            ctx,
            npc.col * TILE + 6,
            npc.row * TILE + 6,
            20,
            { skin: skinFor(npc.name), cloth: npc.color, accent: npc.accent ?? '#d4a82a', outfit: npc.outfit, hair: npc.hair, hairColor: npc.hairColor, extra: npc.extra },
            'down',
            false,
            time,
        )
    }

    // Sparkles (they rise, slow down, fall a little and fade out)
    for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i]
        const age = time - sp.born
        if (age > SPARK_MS) {
            sparks.splice(i, 1)
            continue
        }
        const t = age / 16
        const px = sp.x + sp.vx * t * 0.9
        const py = sp.y + sp.vy * t * 0.9 + 0.012 * t * t
        ctx.globalAlpha = 1 - age / SPARK_MS
        ctx.fillStyle = sp.color
        ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4)
    }
    ctx.globalAlpha = 1

    // The animals
    for (const a of animals) {
        if (a.x < camX - 60 || a.x > camX + w + 60 || a.y < camY - 60 || a.y > camY + h + 60) continue
        drawAnimal(ctx, a.x, a.y, a.def.kind, a.facing, a.moving, time)
    }

    // Your waypoint: a column of light, and a trail of arrows on the ground that leads there
    if (waypoint) {
        drawWaypointBeacon(ctx, waypoint.col * TILE, waypoint.row * TILE, time)
        updateWaypointPath()
        const shown = Math.min(waypointPath.length, 60)
        for (let i = 0; i < shown; i += 2) {   // an arrow on every second tile
            const here = waypointPath[i]
            const next = waypointPath[i + 1] ?? waypoint
            const angle = Math.atan2(next.row - here.row, next.col - here.col)
            // a glow runs along the trail toward the waypoint; arrows fade out far ahead
            const wave = (Math.sin(time / 160 - i * 0.5) + 1) / 2
            const fade = 1 - i / (shown + 8)
            drawPathArrow(ctx, here.col * TILE + TILE / 2, here.row * TILE + TILE / 2, angle, (0.35 + 0.6 * wave) * fade)
        }
    }

    // During the celebration, a crowd cheers along the road below the plaza
    if (celebrationStartedAt >= 0 && !endingShown) {
        for (let i = 0; i < 16; i++) {
            const npc = npcs[i % npcs.length]
            const jump = Math.max(0, Math.sin(time / 180 + i * 1.7)) * 6
            drawPerson(ctx, (54 + i * 2) * TILE + 6, 116 * TILE + 6 - jump, 20,
                { skin: skinFor(npc.name), cloth: npc.color, accent: npc.accent ?? '#d4a82a', outfit: npc.outfit, hair: npc.hair, hairColor: npc.hairColor, extra: npc.extra },
                'up', jump > 0, time + i * 300)
        }
    }

    // Draws the player (the look comes from the character designer)
    drawPerson(ctx, player.x, player.y, player.size, { ...appearance, crown: endingShown || celebrationStartedAt >= 0 }, player.facing, player.moving, time)

    // Name tags and quest markers go on top of all the people
    for (const npc of npcs) {
        const cx = npc.col * TILE + TILE / 2
        drawNameTag(ctx, npc.name, cx, npc.row * TILE - 20)
        const marker = markerFor(npc)
        if (marker) drawMarker(ctx, marker, cx, npc.row * TILE - 46, time)
    }
    drawNameTag(ctx, playerName, player.x + player.size / 2, player.y - 26)

    // Timers over buildings that are going up
    for (const p of plots) {
        const startedAt = built.get(p.def.id)
        if (startedAt === undefined || isFinished(p.def.id)) continue
        const left = (buildMs(p) - (time - startedAt)) / 1000
        drawBuildTimer(ctx, ((p.col0 + p.col1 + 1) / 2) * TILE, p.row0 * TILE - 30, p.def.name, left, (time - startedAt) / buildMs(p))
    }

    // Name tags over the workshops, and a "press E" hint over whatever you are standing next to
    const nearStation = nearbyStation()
    for (const st of stationTiles) {
        const cx = st.col * TILE + TILE / 2
        drawNameTag(ctx, stationNames[st.name] ?? st.name, cx, st.row * TILE - 24)
        if (st.name === nearStation && screen === 'playing' && talkingTo === null) {
            drawKeyHint(ctx, st.name === 'furnace' ? 'SMELT IRON' : 'CRAFT', cx, st.row * TILE - 50, time)
        }
    }
    const nearPlot = !nearStation && screen === 'playing' && talkingTo === null ? nearbyPlot() : undefined
    if (nearPlot) {
        const ready = canBuild(nearPlot.def)
        drawKeyHint(ctx, ready ? 'BUILD ' + nearPlot.def.name.toUpperCase() : 'SEE WHAT IT NEEDS', ((nearPlot.col0 + nearPlot.col1 + 1) / 2) * TILE, nearPlot.row0 * TILE - 14, time)
    }

    ctx.restore()

    // From here on we draw on the screen itself (not shifted by the camera)

    // An arrow at the edge of the screen pointing to your waypoint when you can't see it
    if (waypoint && screen === 'playing') {
        const dx = waypoint.col * TILE + TILE / 2 - (player.x + player.size / 2)
        const dy = waypoint.row * TILE + TILE / 2 - (player.y + player.size / 2)
        const onScreen = Math.abs(dx) < w / 2 - 40 && Math.abs(dy) < h / 2 - 40
        if (!onScreen) drawWaypointArrow(ctx, w, h, dx, dy, Math.round(Math.hypot(dx, dy) / TILE))
    }
    if (screen === 'title') {
        drawTitleScreen(ctx, w, h, time, menuItems(), Math.min(menuIndex, menuItems().length - 1))
        if (settingsOpen) drawPauseMenu(ctx, w, h, settingsItems(), settingsIndex, 'Settings are kept in this browser', 'SETTINGS')
        return
    }
    if (screen === 'howto') {
        drawHowToPlay(ctx, w, h, howtoTab)
        return
    }
    if (screen === 'designer') {
        drawDesigner(ctx, w, h, designerData(), designerRow, appearance, time)
        return
    }
    if (screen === 'ending') {
        drawEnding(ctx, w, h, playerName, [
            'Quests: ' + quests.filter(q => stateOf(q.id) === 'done').length + ' of ' + quests.length,
            'Codex: ' + discovered.size + ' of ' + civs.length,
            'Chests opened: ' + openedChests.size + ' of ' + chests.length,
            'Buildings: ' + finishedCount() + ' of ' + buildingDefs.length,
            'Animals met: ' + seenAnimals.size + ' of ' + new Set(animalDefs.map(a => a.kind)).size,
            'Time played: ' + Math.floor(playMs / 60000) + ' min ' + String(Math.floor(playMs / 1000) % 60).padStart(2, '0') + ' s',
        ], time)
        return
    }

    // Quest box (top-left): the first quest that's active
    const active = quests.find(q => stateOf(q.id) === 'active')
    const done = quests.filter(q => stateOf(q.id) === 'done').length
    // (the styling is in art.ts)
    const questBottom = drawQuestPanel(
        ctx,
        done,
        quests.length,
        active ? active.title : null,
        active ? active.goal : done === quests.length ? 'All quests complete! Finish building the capital.' : 'Talk to a villager with a gold !, or gather materials to build Meroë.',
    )

    // The tutorial box, under the quest panel
    if (settings.tutorial && tutorialStep < TUTORIAL.length) {
        drawTutorial(ctx, questBottom, tutorialStep + 1, TUTORIAL.length, TUTORIAL[tutorialStep].text, time)
    }

    // The "ENTERING ..." banner
    if (bannerRegion && time - bannerStartedAt < 3400) {
        drawRegionBanner(ctx, w, bannerRegion.name, bannerRegion.subtitle, time - bannerStartedAt)
    }

    // How much of the capital is built
    drawCapitalProgress(ctx, w, finishedCount(), buildingDefs.length)

    // The stamina bar (only while it is not full)
    if (stamina < 1) drawStamina(ctx, w, h, stamina, tired)

    // The hotbar along the bottom (hidden while a window or the dialogue box is open)
    if (!pauseOpen && !inventoryOpen && !mapOpen && !codexOpen && chestUi === null && panelUi === null && talkingTo === null) {
        drawHotbar(ctx, w, h, viewOf(inventory), hotbarIndex, time - hotbarChangedAt)
    }

    if (inventoryOpen) {
        const stats = [
            'Quests: ' + done + ' of ' + quests.length,
            'Codex: ' + discovered.size + ' of ' + civs.length,
            'Chests opened: ' + openedChests.size + ' of ' + chests.length,
            'Buildings: ' + finishedCount() + ' of ' + buildingDefs.length,
            'Animals: ' + seenAnimals.size + ' of ' + new Set(animalDefs.map(a => a.kind)).size,
        ]
        drawInventory(ctx, w, h, windowLayout(w, h, false), viewOf(inventory), appearance, playerName, stats, time)
    }

    if (mapOpen) {
        drawQuestMap(ctx, w, h, rows, questMarkers(), toTile(player.x + player.size / 2), toTile(player.y + player.size / 2), player.facing, regions, waypoint, time)
    }

    if (codexOpen) {
        drawCodex(ctx, w, h, codexEntries(), codexIndex, codexTab, time)
    }

    if (chestUi !== null) {
        const inside = chestContents.get(chestUi.chest.id) ?? makeSlots(CHEST_SIZE)
        if (chestUi.furnace) {
            drawFurnaceScreen(ctx, w, h, windowLayout(w, h, true), viewOf(inside), furnaceProgress, viewOf(inventory), time)
        } else {
            drawChestScreen(ctx, w, h, windowLayout(w, h, true), viewOf(inside), viewOf(inventory))
        }
    }

    if (panelUi !== null && panelUi.kind === 'craft') {
        const colorOf = (id: string) => itemDefs.find(i => i.id === id)?.color ?? '#888'
        const rows: CraftRow[] = recipes.filter(r => r.station === panelUi!.id).map(r => ({
            id: r.id,
            name: r.name,
            inputs: r.inputs.map(i => ({ id: i.id, name: nameOf(i.id), color: colorOf(i.id), have: countIn(inventory, i.id), need: i.count })),
            output: viewOne({ id: r.output.id, count: r.output.count })!,
            forCapital: buildingDefs.some(b => b.cost.some(c => c.id === r.output.id)),
            canCraft: r.inputs.every(i => hasItem(i.id, i.count)),
        }))
        drawCraftScreen(ctx, w, h, panelUi.id, (stationNames[panelUi.id] ?? panelUi.id).toUpperCase(), rows, time)
    }

    if (panelUi !== null && panelUi.kind === 'build') {
        const plot = plots.find(p => p.def.id === panelUi!.id)
        if (plot) {
            const lines: BuildLine[] = plot.def.cost.map(c => ({ name: nameOf(c.id), have: countIn(inventory, c.id), need: c.count }))
            for (const qid of plot.def.requires ?? []) {
                const q = quests.find(x => x.id === qid)
                const done = stateOf(qid) === 'done'
                lines.push({ name: 'Quest: ' + (q?.title ?? qid), have: done ? 1 : 0, need: 1, text: done ? 'DONE' : 'NOT YET' })
            }
            drawBuildScreen(ctx, w, h, plot.def.name, plot.def.blurb, lines, canBuild(plot.def))
        }
    }

    // Fade in from black when the game starts
    const fade = 1 - (time - playStartedAt) / 900
    if (fade > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${fade})`
        ctx.fillRect(0, 0, w, h)
    }

    if (pauseOpen) {
        const ago = lastSavedAt > 0 ? Math.round((time - lastSavedAt) / 1000) : -1
        const savedText = !settings.autosave ? 'Auto-save is off' : ago < 0 ? 'Not saved yet' : 'Last saved ' + ago + ' seconds ago'
        drawPauseMenu(ctx, w, h, pauseItems(), pauseIndex, savedText)
        if (settingsOpen) drawPauseMenu(ctx, w, h, settingsItems(), settingsIndex, 'Settings are kept in this browser', 'SETTINGS')
    }

    // The short message at the top (new Codex entries and so on)
    if (time - noticeAt < 3500) {
        drawNotice(ctx, w, noticeText, time - noticeAt)
    }

    // Dialogue box
    if (talkingTo !== null) {
        // The animated box (slide-in, typewriter text) is drawn in art.ts
        const open = Math.min(1, (time - dialogueOpenedAt) / OPEN_MS)
        drawDialogue(ctx, w, h, talkingTo.name, currentLines[lineIndex], open, charsShown(), time)
    }

    // The item stuck to the mouse, or else a tooltip for whatever the mouse is over
    if (held.stack) {
        const view = viewOne(held.stack)
        if (view) drawHeld(ctx, view)
    } else {
        const tip = slotForButton(buttonAt(pointer.x, pointer.y))
        if (tip) drawTooltip(ctx, w, h, tip)
    }
}

// --- Random spots ----------------------------------------------------------
// Which tiles can the player walk to from the start? (so nothing ends up behind water or a wall)
function reachableTiles(): Set<string> {
    const startCol = toTile(player.x)
    const startRow = toTile(player.y)
    const seen = new Set<string>([startCol + ',' + startRow])
    const queue: [number, number][] = [[startCol, startRow]]
    for (let head = 0; head < queue.length; head++) {
        const [c, r] = queue[head]
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const key = (c + dx) + ',' + (r + dy)
            if (!seen.has(key) && !isSolid(c + dx, r + dy)) {
                seen.add(key)
                queue.push([c + dx, r + dy])
            }
        }
    }
    return seen
}

// Is (col, row) within d tiles of anything in the list?
function nearAny(col: number, row: number, list: { col: number; row: number }[], d: number): boolean {
    return list.some(o => Math.abs(o.col - col) <= d && Math.abs(o.row - row) <= d)
}

const reachable = reachableTiles()

// Spots that chests, resource nodes and animals have already been given
const taken: { col: number; row: number }[] = []

// Pick `count` random spots inside a named area of the world. A spot has to be open ground
// you can walk to, with room around it, away from villagers and away from spots already given out.
function pickSpots(
    areaName: string,
    count: number,
    opts: { gap?: number; nearWater?: boolean } = {},
): { col: number; row: number }[] {
    const a = WORLD.areas[areaName]
    const gap = opts.gap ?? 3
    const candidates: { col: number; row: number }[] = []
    for (let r = a.row0; r <= a.row1; r++) {
        for (let c = a.col0; c <= a.col1; c++) {
            if (!'.dg'.includes(rows[r]?.[c] ?? '#') || !reachable.has(c + ',' + r)) continue
            const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !isSolidChar(rows[r + dy]?.[c + dx])).length
            if (open < 3 || nearAny(c, r, npcs, 2)) continue
            if (opts.nearWater) {
                let water = false
                for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (rows[r + dy]?.[c + dx] === '~') water = true
                if (!water) continue
            }
            candidates.push({ col: c, row: r })
        }
    }
    const picked: { col: number; row: number }[] = []
    while (picked.length < count && candidates.length > 0) {
        const i = Math.floor(Math.random() * candidates.length)
        const spot = candidates.splice(i, 1)[0]
        if (taken.some(t => Math.hypot(t.col - spot.col, t.row - spot.row) < gap)) continue
        picked.push(spot)
        taken.push(spot)
    }
    if (picked.length < count) console.warn('only found ' + picked.length + ' of ' + count + ' spots in ' + areaName)
    return picked
}

// Put the resources on the ground at random spots, then give every chest a random spot inside its area
function scatterWorld() {
    for (const def of itemDefs) {
        if (!def.spawn) continue
        for (const spot of pickSpots(def.spawn.area, def.spawn.count, { gap: def.spawn.gap ?? 5, nearWater: def.spawn.nearWater })) {
            worldItems.push({ ...def, col: spot.col, row: spot.row })
        }
    }

    for (const chest of chests) {
        const [spot] = pickSpots(chest.area, 1, { gap: 7 })
        if (spot) {
            chest.col = spot.col
            chest.row = spot.row
        }
    }

    for (const def of animalDefs) {
        for (const spot of pickSpots(def.area, def.count, { gap: 4 })) {
            const x = spot.col * TILE + 6
            const y = spot.row * TILE + 6
            animals.push({ def, x, y, homeX: x, homeY: y, targetX: x, targetY: y, facing: 'right', moving: false, waitUntil: 0 })
        }
    }
}

let endingShown = false   // the ending screen is only shown once

// The celebration when the capital is finished (then the ending screen)
let celebrationStartedAt = -1
let nextFireworkAt = 0
const FIREWORK_COLORS = ['#e8c75a', '#ff9a3c', '#3aa6c4', '#f3ead6', '#b0412e']

// How long you have played (only counts while you are playing)
let playMs = 0

let lastFrameAt = performance.now()
let frameScale = 1   // 1 at 60 frames a second, 2 at 30, and so on

// --- Settings --------------------------------------------------------------
// Kept in the browser on their own, so they stay even when auto-save is off
const SETTINGS_KEY = 'rise-of-meroe-settings-1'
const settings = {
    music: true,
    sfx: true,
    autosave: true,          // false: nothing is saved unless you choose Save Game
    factsEveryTime: false,   // true: show an item's fact every time you pick it up
    tutorial: true,          // show the tutorial steps
}
try {
    Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'))
} catch {
    // no storage: use the defaults
}
setMusic(settings.music)
setSfx(settings.sfx)

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
        // no storage
    }
}

let settingsOpen = false
let settingsIndex = 0
let confirmDelete = false   // Delete Saved Game was clicked once and now asks "are you sure?"

function openSettings() {
    settingsOpen = true
    settingsIndex = 0
    confirmDelete = false
}

function settingsItems(): MenuItem[] {
    const onOff = (on: boolean) => (on ? 'ON' : 'OFF')
    return [
        { id: 'set-music', label: 'MUSIC: ' + onOff(settings.music) },
        { id: 'set-sfx', label: 'SOUND EFFECTS: ' + onOff(settings.sfx) },
        {
            id: 'set-autosave',
            label: 'AUTO-SAVE: ' + onOff(settings.autosave),
            detail: settings.autosave ? 'The game saves itself every few seconds' : 'Only saves when you choose Save Game',
        },
        { id: 'set-facts', label: 'ITEM FACTS: ' + (settings.factsEveryTime ? 'EVERY TIME' : 'FIRST TIME ONLY') },
        { id: 'set-tutorial', label: 'TUTORIAL: ' + onOff(settings.tutorial) },
        {
            id: 'set-delete',
            label: confirmDelete ? 'DELETE? CLICK AGAIN' : 'DELETE SAVED GAME',
            detail: savedGame ? 'Removes the save from this browser' : 'There is no saved game',
        },
        { id: 'set-back', label: 'BACK' },
    ]
}

function useSettings(id: string) {
    sfx('click')
    if (id === 'set-music') {
        settings.music = !settings.music
        setMusic(settings.music)
    } else if (id === 'set-sfx') {
        settings.sfx = !settings.sfx
        setSfx(settings.sfx)
    } else if (id === 'set-autosave') {
        settings.autosave = !settings.autosave
    } else if (id === 'set-facts') {
        settings.factsEveryTime = !settings.factsEveryTime
    } else if (id === 'set-tutorial') {
        settings.tutorial = !settings.tutorial
        if (settings.tutorial && tutorialStep >= TUTORIAL.length) tutorialStep = 0   // turned back on: start again
    } else if (id === 'set-delete') {
        if (!savedGame) return
        if (!confirmDelete) {
            confirmDelete = true
            return
        }
        try {
            localStorage.removeItem(SAVE_KEY)
        } catch {
            // no storage
        }
        savedGame = null
        notify('Saved game deleted.')
    } else if (id === 'set-back') {
        settingsOpen = false
    }
    confirmDelete = false
    saveSettings()
}

// --- Tutorial --------------------------------------------------------------
// A short checklist for new players. Each step moves on when you actually do the thing.
type TutorialEvent = 'move' | 'quest' | 'pickup' | 'inventory' | 'craft' | 'plot' | 'map'
const TUTORIAL: { event: TutorialEvent; text: string }[] = [
    { event: 'move', text: 'Welcome to Meroë! Walk around with WASD or the arrow keys. Hold Shift to run.' },
    { event: 'quest', text: 'Villagers with a gold ! over their heads have a quest for you. Walk up to one (Mustafa is in the village) and press E to talk.' },
    { event: 'pickup', text: 'Materials lie on the ground all over the land. Walk up to one and press E to pick it up. Your quest says where to look.' },
    { event: 'inventory', text: 'Press I to open your inventory and see what you are carrying.' },
    { event: 'craft', text: 'The workshops in the village turn materials into building parts. Stand next to the stoneworks (east of the village) with sandstone and press E, then click CRAFT.' },
    { event: 'plot', text: 'The capital is built on the big paved plaza east of the village. Walk up to one of the gold outlines and press E to see what it needs.' },
    { event: 'map', text: 'Press M for the map (gold diamonds show where quests lead) and C for the Codex. Build all 7 buildings to restore Meroë!' },
]
let tutorialStep = 0   // TUTORIAL.length means it is finished

function tutorialDid(event: TutorialEvent) {
    if (!settings.tutorial || tutorialStep >= TUTORIAL.length || TUTORIAL[tutorialStep].event !== event) return
    tutorialStep++
    sfx('codex')
    if (tutorialStep === TUTORIAL.length) notify('Tutorial complete. Good luck, builder of Meroë!')
}

// --- Saving ----------------------------------------------------------------
// The game saves itself in the browser (localStorage) every few seconds, and when you leave the page.
const SAVE_KEY = 'rise-of-meroe-save-1'

interface SaveData {
    version: 1
    name: string
    look: typeof appearance
    x: number
    y: number
    inventory: Slots
    hotbar: number
    drops: Drop[]
    items: { id: string; col: number; row: number }[]   // resources still lying around
    chests: { id: string; col: number; row: number }[]  // where the chests are in this world
    opened: string[]
    contents: [string, Slots][]                         // what is inside each opened chest (and the furnace)
    quests: [string, QuestState][]
    codex: string[]
    built: string[]
    crafted: string[]
    animals: string[]
    ending: boolean
    seen?: string[]   // items picked up before (older saves do not have this)
    tutorial?: number
    waypoint?: { col: number; row: number } | null
    playMs?: number
}

let gameStarted = false   // true once you are playing (a new game or a loaded one)
let lastSavedAt = 0

function readSave(): SaveData | null {
    try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return null
        const data = JSON.parse(raw)
        return data && data.version === 1 ? data : null
    } catch {
        return null   // no storage (private window) or a broken save: just start fresh
    }
}
let savedGame = readSave()

function saveGame() {
    if (!gameStarted) return
    const data: SaveData = {
        version: 1,
        name: playerName,
        look: { ...appearance },
        x: player.x,
        y: player.y,
        inventory: inventory.map(s => (s ? { ...s } : null)),
        hotbar: hotbarIndex,
        drops: drops.map(d => ({ ...d })),
        items: worldItems.map(i => ({ id: i.id, col: i.col, row: i.row })),
        chests: chests.map(c => ({ id: c.id, col: c.col, row: c.row })),
        opened: [...openedChests],
        contents: [...chestContents.entries()],
        quests: [...questState.entries()],
        codex: [...discovered],
        built: [...built.keys()],
        crafted: [...craftedBefore],
        animals: [...seenAnimals],
        ending: endingShown,
        seen: [...seenItems],
        tutorial: tutorialStep,
        waypoint,
        playMs,
    }
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data))
        savedGame = data
        lastSavedAt = performance.now()
    } catch {
        // storage is full or blocked: the game still works, it just can't be saved
    }
}

function loadGame(d: SaveData) {
    playerName = d.name
    Object.assign(appearance, d.look)
    player.x = d.x
    player.y = d.y
    d.inventory.forEach((s, i) => { inventory[i] = s })
    hotbarIndex = d.hotbar
    drops.length = 0
    drops.push(...d.drops)
    worldItems.length = 0
    for (const it of d.items) {
        const def = itemDefs.find(i => i.id === it.id)
        if (def) worldItems.push({ ...def, col: it.col, row: it.row })
    }
    for (const c of d.chests) {
        const chest = chests.find(x => x.id === c.id)
        if (chest) {
            chest.col = c.col
            chest.row = c.row
        }
    }
    openedChests.clear()
    d.opened.forEach(id => openedChests.add(id))
    for (const [id, slots] of d.contents) {
        if (id === 'furnace') slots.forEach((s, i) => { furnaceSlots[i] = s })
        else chestContents.set(id, slots)
    }
    questState.clear()
    for (const [id, st] of d.quests) questState.set(id, st)
    discovered.clear()
    d.codex.forEach(id => discovered.add(id))
    built.clear()
    d.built.forEach(id => built.set(id, -999999))   // long ago, so they are finished
    announced.clear()
    d.built.forEach(id => announced.add(id))
    craftedBefore.clear()
    d.crafted.forEach(id => craftedBefore.add(id))
    seenAnimals.clear()
    d.animals.forEach(k => seenAnimals.add(k))
    endingShown = d.ending
    seenItems.clear()
    ;(d.seen ?? []).forEach(id => seenItems.add(id))
    waypoint = d.waypoint ?? null
    playMs = d.playMs ?? 0
    tutorialStep = d.tutorial ?? TUTORIAL.length   // (an old save has already been played: skip the tutorial)
}

function autoSave() {
    if (settings.autosave) saveGame()
}
setInterval(autoSave, 10000)
addEventListener('beforeunload', autoSave)

// --- Main menu and pause menu ----------------------------------------------
let menuIndex = 0          // which button is selected with the keyboard
let confirmNew = false     // New Game was clicked once and now asks "are you sure?"
let pauseOpen = false
let pauseIndex = 0
let howtoBack: 'title' | 'designer' = 'designer'   // where How to Play goes when you continue
let howtoTab = 0   // which tab of How to Play is showing

function menuItems(): MenuItem[] {
    const items: MenuItem[] = []
    const save = savedGame
    if (gameStarted || save) {
        const name = gameStarted ? playerName : save!.name
        const b = gameStarted ? finishedCount() : save!.built.length
        items.push({ id: 'menu-continue', label: 'CONTINUE', detail: name + ': ' + b + ' of ' + buildingDefs.length + ' buildings built' })
    }
    items.push({
        id: 'menu-new',
        label: confirmNew ? 'START OVER? CLICK AGAIN' : 'NEW GAME',
        detail: confirmNew ? 'Your saved game will be deleted' : undefined,
    })
    items.push({ id: 'menu-howto', label: 'HOW TO PLAY' })
    items.push({ id: 'menu-settings', label: 'SETTINGS' })
    return items
}

function startPlaying() {
    if (playerName.trim() === '') playerName = 'Traveler'
    screen = 'playing'
    gameStarted = true
    playStartedAt = performance.now()
    autoSave()
}

function useMenu(id: string) {
    sfx('click')
    if (id === 'menu-settings') {
        openSettings()
        return
    }
    if (id === 'menu-continue') {
        if (!gameStarted && savedGame) loadGame(savedGame)
        startPlaying()
    } else if (id === 'menu-new') {
        if (gameStarted || savedGame) {
            if (!confirmNew) {
                confirmNew = true
                return
            }
            // forget the save and start again from a fresh page
            try {
                localStorage.removeItem(SAVE_KEY)
                sessionStorage.setItem('meroe-new-game', '1')
            } catch {
                // (no storage: the reload just shows the menu again)
            }
            removeEventListener('beforeunload', autoSave)
            location.reload()
            return
        }
        howtoBack = 'designer'
        screen = 'howto'
    } else if (id === 'menu-howto') {
        howtoBack = 'title'
        screen = 'howto'
    }
    confirmNew = false
}

// After "start over" the page reloads and goes straight to How to Play
try {
    if (sessionStorage.getItem('meroe-new-game')) {
        sessionStorage.removeItem('meroe-new-game')
        savedGame = null
        screen = 'howto'
    }
} catch {
    // no storage
}

function pauseItems(): MenuItem[] {
    return [
        { id: 'pause-resume', label: 'RESUME' },
        { id: 'pause-save', label: 'SAVE GAME' },
        { id: 'pause-settings', label: 'SETTINGS' },
        { id: 'pause-quit', label: settings.autosave ? 'SAVE AND RETURN TO MENU' : 'RETURN TO MENU' },
    ]
}

function usePause(id: string) {
    sfx('click')
    if (id === 'pause-settings') openSettings()
    else if (id === 'pause-resume') pauseOpen = false
    else if (id === 'pause-save') {
        saveGame()
        notify('Game saved.')
    } else if (id === 'pause-quit') {
        autoSave()
        pauseOpen = false
        closeWindows()
        talkingTo = null
        screen = 'title'
        menuIndex = 0
    }
}


// Loop to run all the functions and update the frames
function loop() {
    // How long the last frame took, compared to a normal 60-frames-a-second frame. On a slow computer
    // frames take longer, so everything moves further each frame and the speed stays the same.
    const now = performance.now()
    frameScale = Math.min(3, (now - lastFrameAt) / (1000 / 60))
    lastFrameAt = now

    if (screen === 'playing') {
        update()
        if (!pauseOpen) tickFurnace()   // the pause menu freezes the world
        if (talkingTo === null && !pauseOpen) tickAnimals()
        checkDiscoveries()
        // the whole capital is built (and the last building's fact has been read): the ending
        if (!pauseOpen) {
            checkFinishedBuildings()
            playMs += Math.min(100, frameScale * (1000 / 60))
        }
        // every building finished, and the last one's fact has been read: the queen comes to thank you
        if (!endingShown && celebrationStartedAt < 0 && talkingTo === null && announced.size === buildingDefs.length) {
            celebrationStartedAt = now
            closeWindows()
            sfx('quest')
            startDialogue(speakerNamed('Kandake Amanitore'), [
                'Builder! Look at our city. The temple of Amun shines, the pyramids rise over the plain, and the forges glow day and night.',
                'Because of you, Meroë is once again the jewel of Kush. Wear this crown, so that all the kingdom knows what you have done!',
            ])
        }
        if (celebrationStartedAt >= 0 && !endingShown) {
            // fireworks of gold over the capital
            if (now > nextFireworkAt) {
                nextFireworkAt = now + 250 + Math.random() * 300
                const p = plots[Math.floor(Math.random() * plots.length)]
                burst(p.col0 + Math.random() * (p.col1 - p.col0), p.row0 + Math.random() * (p.row1 - p.row0), FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)])
                if (Math.random() < 0.3) sfx('codex')
            }
            // after the queen has spoken and the fireworks have gone on a while: the ending screen
            if (talkingTo === null && now - celebrationStartedAt > 9000) {
                endingShown = true
                closeWindows()
                screen = 'ending'
            }
        }
    }
    draw()
    // a pointing hand over anything you can click
    const under = buttonAt(pointer.x, pointer.y)
    canvas.style.cursor = under !== null && under !== 'panel' ? 'pointer' : 'default'
    requestAnimationFrame(loop)
}

scatterWorld()   // put the resources and chests in random places
loop()
