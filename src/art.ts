/******************************************************************************
 * File:        art.ts
 * Author:      Kieran Provost
 * Date:        10-26-26 (Last edit)
 * Description: The drawing code (tiles, buildings and characters) for the Rise
 *              of Meroe. Everything is drawn with canvas shapes.
 * 
 * License:     MIT
 ******************************************************************************/

export const TILE = 32

export type Facing = 'up' | 'down' | 'left' | 'right'

// How a person is dressed and how their hair looks
export type Outfit = 'kilt' | 'robe' | 'dress' | 'tunic' | 'leopard'
export type Hair = 'short' | 'braids' | 'bald' | 'headwrap' | 'curly' | 'long' | 'cap'

// The characters of the tiles around one tile. Used for shorelines and to
// draw multi-tile buildings (like the 2x2 pyramids) as one picture.
export interface Neighbors {
    up: string
    down: string
    left: string
    right: string
    // for big buildings: which tile of the building this is, and how big the building is
    block?: { ox: number; oy: number; w: number; h: number }
}

export interface PersonLook {
    skin: string
    cloth: string
    accent: string
    outfit: Outfit
    hair: Hair
    hairColor?: string   // (black if not given)
    extra?: string       // 'necklace', 'earrings', 'armbands', 'feather' or nothing
    crown?: boolean      // the gold crown you get for finishing the capital
}

// Gives the same "random" number for the same tile every frame, so the
// speckles in the sand don't flicker.
function rand(col: number, row: number, i: number): number {
    let h = Math.imul(col, 374761393) + Math.imul(row, 668265263) + Math.imul(i, 2147483647)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

const SAND_SHADES = ['#f0d9a0', '#edd69b', '#f3dda8']

function drawSand(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, n: Neighbors) {
    ctx.fillStyle = SAND_SHADES[Math.floor(rand(col, row, 99) * SAND_SHADES.length)]
    ctx.fillRect(x, y, TILE, TILE)

    // little pebbles and grains
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#d9bd7d' : '#fbeac0'
        const px = x + Math.floor(rand(col, row, i * 2) * (TILE - 2))
        const py = y + Math.floor(rand(col, row, i * 2 + 1) * (TILE - 2))
        ctx.fillRect(px, py, 2, 2)
    }

    // wet sand next to the Nile
    if (n.left === '~') {
        ctx.fillStyle = 'rgba(150, 110, 60, 0.35)'
        ctx.fillRect(x, y, 6, TILE)
    }
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, time: number, n: Neighbors) {
    // which sides touch land? (' ' is off the map: treat it as more water)
    const land = (c: string) => c !== '~' && c !== ' '
    const up = land(n.up)
    const down = land(n.down)
    const left = land(n.left)
    const right = land(n.right)
    const shore = up || down || left || right

    // the color drifts slowly across the water in big soft patches, so it never looks like tiles
    const v = Math.sin(col * 0.33 + row * 0.21 + time / 2600) * 0.5 + Math.sin(col * 0.12 - row * 0.29 - time / 3900) * 0.5
    const r = Math.round(36 + v * 7 + (shore ? 26 : 0))
    const g = Math.round(122 + v * 12 + (shore ? 40 : 0))
    const b = Math.round(190 + v * 10 + (shore ? 8 : 0))
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(x, y, TILE, TILE)

    // shallow, lighter water along the edges that touch land
    ctx.fillStyle = 'rgba(140, 215, 215, 0.35)'
    if (up) ctx.fillRect(x, y, TILE, 9)
    if (down) ctx.fillRect(x, y + TILE - 9, TILE, 9)
    if (left) ctx.fillRect(x, y, 9, TILE)
    if (right) ctx.fillRect(x + TILE - 9, y, 9, TILE)

    // little waves: each tile has two, in its own spot, that slowly appear, drift and fade
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    for (let i = 0; i < 2; i++) {
        const hash = Math.abs((col * 73856093) ^ (row * 19349663) ^ (i * 83492791))
        const ox = hash % 18
        const oy = 5 + ((hash >> 5) % 22)
        const phase = ((hash >> 10) % 100) / 16
        const a = (Math.sin(time / 800 + phase) + 1) / 2
        if (a < 0.15) continue
        const drift = Math.sin(time / 1100 + phase) * 3
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * a})`
        ctx.beginPath()
        ctx.moveTo(x + ox + drift, y + oy)
        ctx.quadraticCurveTo(x + ox + 5 + drift, y + oy - 3, x + ox + 10 + drift, y + oy)
        ctx.stroke()
    }

    // now and then the sun glints on the water
    const glint = Math.abs((col * 92837111) ^ (row * 689287499)) % 9
    if (glint === 0) {
        const t = (Math.sin(time / 380 + col + row * 2) + 1) / 2
        if (t > 0.6) {
            ctx.fillStyle = `rgba(255, 255, 240, ${(t - 0.6) * 2.2})`
            ctx.beginPath()
            ctx.moveTo(x + 20, y + 12)
            ctx.lineTo(x + 22, y + 14)
            ctx.lineTo(x + 20, y + 16)
            ctx.lineTo(x + 18, y + 14)
            ctx.fill()
        }
    }

    // white foam where the water laps against the shore
    if (shore) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
        ctx.lineWidth = 2
        const wob = (k: number) => Math.sin(time / 500 + k * 0.4 + col + row) * 1.5
        ctx.beginPath()
        if (up) {
            ctx.moveTo(x, y + 2 + wob(0))
            for (let k = 8; k <= TILE; k += 8) ctx.lineTo(x + k, y + 2 + wob(k))
        }
        if (down) {
            ctx.moveTo(x, y + TILE - 2 + wob(1))
            for (let k = 8; k <= TILE; k += 8) ctx.lineTo(x + k, y + TILE - 2 + wob(k + 1))
        }
        if (left) {
            ctx.moveTo(x + 2 + wob(2), y)
            for (let k = 8; k <= TILE; k += 8) ctx.lineTo(x + 2 + wob(k + 2), y + k)
        }
        if (right) {
            ctx.moveTo(x + TILE - 2 + wob(3), y)
            for (let k = 8; k <= TILE; k += 8) ctx.lineTo(x + TILE - 2 + wob(k + 3), y + k)
        }
        ctx.stroke()
    }
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, col: number) {
    // shadow on the ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
    ctx.beginPath()
    ctx.ellipse(x + 18, y + 29, 9, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // trunk
    ctx.strokeStyle = '#7a5230'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 29)
    ctx.quadraticCurveTo(x + 19, y + 20, x + 16, y + 12)
    ctx.stroke()

    // fronds fanning out from the top of the trunk, swaying a little
    const cx = x + 16
    const cy = y + 12
    const sway = Math.sin(time / 700 + col) * 1.5
    for (let i = 0; i < 6; i++) {
        const a = ((-170 + i * 32) * Math.PI) / 180
        const tipX = cx + Math.cos(a) * 13 + sway
        const tipY = cy + Math.sin(a) * 8 + 6
        const ctrlX = cx + Math.cos(a) * 8
        const ctrlY = cy + Math.sin(a) * 12 - 2
        ctx.strokeStyle = '#2e7d32'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
        ctx.stroke()
        ctx.strokeStyle = '#4caf50'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.quadraticCurveTo(ctrlX, ctrlY - 1, tipX, tipY)
        ctx.stroke()
    }

    // dates
    ctx.fillStyle = '#8a4b1a'
    ctx.beginPath()
    ctx.arc(cx - 2, cy + 3, 2, 0, Math.PI * 2)
    ctx.arc(cx + 2, cy + 4, 2, 0, Math.PI * 2)
    ctx.fill()
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

// A cheap "random" number from a number, used to scatter details the same way every frame
const jitter = (n: number) => {
    const s = Math.sin(n * 12.9898) * 43758.5453
    return s - Math.floor(s)
}

// Big buildings (pyramids, houses, pylons, the mesa) are painted ONCE into a hidden canvas
// and then copied onto the map one tile at a time. That is far faster than painting a whole
// pyramid again for every one of its tiles on every frame.
const blockSprites = new Map<string, HTMLCanvasElement>()

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, char: string, n: Neighbors, paint: Painter) {
    const b = n.block ?? { ox: 0, oy: 0, w: 1, h: 1 }
    const key = char + ':' + b.w + 'x' + b.h
    let sprite = blockSprites.get(key)
    if (!sprite) {
        sprite = document.createElement('canvas')
        sprite.width = b.w * TILE
        sprite.height = b.h * TILE
        paint(sprite.getContext('2d')!, b.w * TILE, b.h * TILE)
        blockSprites.set(key, sprite)
    }
    ctx.drawImage(sprite, b.ox * TILE, b.oy * TILE, TILE, TILE, x, y, TILE, TILE)
}

// A mud-brick house, in the style of Nubian houses: plastered walls with a painted band,
// wooden roof beams sticking out, arched doors and small latticed windows. Bigger buildings get more of each.
function paintHouse(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // a fixed "random" so the same size of house always looks the same
    let seed = w * 7 + h * 13
    const rand = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
    }

    // plastered walls, slightly uneven
    const wall = ctx.createLinearGradient(0, 0, 0, h)
    wall.addColorStop(0, '#d9a874')
    wall.addColorStop(1, '#c48e5c')
    ctx.fillStyle = wall
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < (w * h) / 60; i++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(255, 240, 210, 0.18)' : 'rgba(110, 60, 25, 0.14)'
        ctx.fillRect(rand() * w, 12 + rand() * (h - 12), 2, 1)
    }
    // faint bricks showing through the plaster near the bottom
    ctx.fillStyle = 'rgba(110, 60, 25, 0.18)'
    for (let by = h - 14; by < h - 2; by += 5) {
        ctx.fillRect(0, by, w, 1)
        for (let bx = (by % 10) / 2; bx < w; bx += 10) ctx.fillRect(bx, by, 1, 5)
    }

    // the flat roof with a low wall (parapet) around it
    ctx.fillStyle = '#9a6a40'
    ctx.fillRect(0, 0, w, 8)
    ctx.fillStyle = '#b78250'
    ctx.fillRect(0, 0, w, 2)
    ctx.fillStyle = '#7a4f2c'
    ctx.fillRect(0, 8, w, 2)
    // the ends of the wooden roof beams poke out under the roof
    ctx.fillStyle = '#5a3820'
    for (let bx = 6; bx < w - 4; bx += 12) ctx.fillRect(bx, 10, 4, 3)

    // a painted band under the roof: white with ochre triangles, like Nubian house decoration
    ctx.fillStyle = '#efe2c4'
    ctx.fillRect(0, 14, w, 5)
    ctx.fillStyle = '#b8642e'
    for (let tx = 0; tx < w; tx += 8) {
        ctx.beginPath()
        ctx.moveTo(tx, 19)
        ctx.lineTo(tx + 4, 14)
        ctx.lineTo(tx + 8, 19)
        ctx.fill()
    }

    // doors: one for every 3 tiles of width, arched, made of planks, with a stone step
    const doors = Math.max(1, Math.round(w / 96))
    const dh = Math.min(22, h - 22)
    for (let k = 0; k < doors; k++) {
        const cx = Math.round(((k + 0.5) * w) / doors)
        ctx.fillStyle = '#efe2c4'                     // the white frame around the door
        ctx.fillRect(cx - 8, h - dh - 2, 16, dh + 2)
        ctx.beginPath()
        ctx.arc(cx, h - dh - 2, 8, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = '#6b4226'                     // the wooden door
        ctx.fillRect(cx - 6, h - dh, 12, dh)
        ctx.beginPath()
        ctx.arc(cx, h - dh, 6, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = '#4e2f1a'                     // the planks
        ctx.fillRect(cx - 2, h - dh - 4, 1, dh + 4)
        ctx.fillRect(cx + 2, h - dh - 4, 1, dh + 4)
        ctx.fillStyle = '#e8c75a'                     // a small metal ring
        ctx.fillRect(cx + 3, h - dh / 2, 2, 2)
        ctx.fillStyle = '#a89070'                     // the step
        ctx.fillRect(cx - 9, h - 2, 18, 2)
    }

    // small windows with wooden lattice, beside the doors (and higher up on tall buildings)
    for (let wy = 26; wy < h - 26; wy += 34) {
        for (let k = 0; k < doors; k++) {
            for (const side of [-1, 1]) {
                const wx = Math.round(((k + 0.5) * w) / doors + side * Math.min(22, w / doors / 3)) - 4
                if (wx < 3 || wx > w - 11) continue
                ctx.fillStyle = '#3b2414'
                ctx.fillRect(wx, wy, 8, 8)
                ctx.fillStyle = '#8a5a35'
                ctx.fillRect(wx + 3.5, wy, 1, 8)
                ctx.fillRect(wx, wy + 3.5, 8, 1)
                ctx.fillStyle = '#efe2c4'
                ctx.fillRect(wx - 1, wy + 8, 10, 1.5)      // the white sill
            }
        }
    }

    // shading: the right edge and the bottom are darker, for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
    ctx.fillRect(w - 4, 10, 4, h - 10)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.fillRect(0, h - 3, w, 3)
}

// Kushite pyramids are much steeper than Egyptian ones.
function paintPyramid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const apexX = w / 2
    const apexY = 2
    const baseY = h
    const left = 3
    const right = w - 3

    // shadow on the sand
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(right - 2, baseY - 4, 6, 4)

    // lit left face and shaded right face
    ctx.fillStyle = '#e0b673'
    ctx.beginPath()
    ctx.moveTo(apexX, apexY)
    ctx.lineTo(left, baseY)
    ctx.lineTo(apexX, baseY)
    ctx.fill()

    ctx.fillStyle = '#b98a4a'
    ctx.beginPath()
    ctx.moveTo(apexX, apexY)
    ctx.lineTo(right, baseY)
    ctx.lineTo(apexX, baseY)
    ctx.fill()

    // stone courses
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.35)'
    ctx.lineWidth = 1
    for (let yy = apexY + 6; yy < baseY; yy += 5) {
        const half = ((yy - apexY) / (baseY - apexY)) * (w / 2 - left)
        ctx.beginPath()
        ctx.moveTo(apexX - half, yy)
        ctx.lineTo(apexX + half, yy)
        ctx.stroke()
    }

    // the little offering chapel at the base
    ctx.fillStyle = '#5b3a1a'
    ctx.fillRect(apexX - 3, baseY - 8, 6, 8)
}

// A temple pylon: a massive sandstone tower with a carved cornice
function paintPylon(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#d3b27c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(90, 60, 25, 0.25)'        // courses of stone blocks
    for (let y = 12; y < h; y += 9) ctx.fillRect(0, y, w, 1)
    ctx.fillStyle = '#b38a52'                       // the cornice along the top
    ctx.fillRect(0, 0, w, 9)
    ctx.fillStyle = '#e4c892'
    ctx.fillRect(0, 0, w, 2)
    ctx.fillStyle = '#8f6a3a'
    ctx.fillRect(0, 9, w, 2)
    ctx.fillStyle = 'rgba(70, 45, 20, 0.35)'        // carved relief figures in rows
    for (let y = 16; y < h - 8; y += 14) {
        for (let x = 8; x < w - 8; x += 10) ctx.fillRect(x, y, 3, 7)
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'            // shading on the right and bottom
    ctx.fillRect(w - 4, 11, 4, h - 11)
    ctx.fillRect(0, h - 3, w, 3)
}

// Jebel Barkal: a sandstone mesa with strata and one tall pinnacle
function paintMesa(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const top = (x: number) => {
        let y = 16 + 14 * jitter(x / 8)
        const d = Math.abs(x / w - 0.72)
        if (d < 0.05) y = d * 280                   // the pinnacle
        return y
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#e4b878')
    grad.addColorStop(1, '#9c6a3a')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, top(0))
    for (let x = 8; x < w; x += 8) ctx.lineTo(x, top(x))
    ctx.lineTo(w, top(w))
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(70, 40, 15, 0.3)'       // layers of rock
    ctx.lineWidth = 1
    for (let y = 24; y < h; y += 11) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 6; x <= w; x += 6) ctx.lineTo(x, y + 2 * Math.sin(x / 9 + y))
        ctx.stroke()
    }
    ctx.fillStyle = 'rgba(40, 20, 5, 0.3)'          // dark cracks running down
    for (let x = 14; x < w - 8; x += 22) ctx.fillRect(x + 5 * jitter(x), top(x) + 6, 2, h * 0.5)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'           // shade on the right-hand side
    ctx.fillRect(w - 10, 20, 10, h - 20)
}

// A tall carved stone pillar, like the stelae of Aksum. It is taller than its tile,
// so it overlaps the tile above (that tile is drawn first, so the pillar goes on top).
function drawStela(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 29, 11, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    const bx = x + 9      // left edge at the base
    const top = y - 30    // top of the pillar

    // lit left half
    ctx.fillStyle = '#9a968e'
    ctx.beginPath()
    ctx.moveTo(bx, y + 29)
    ctx.lineTo(bx + 7, y + 29)
    ctx.lineTo(bx + 7, top)
    ctx.quadraticCurveTo(bx + 2, top - 1, bx + 1, top + 8)
    ctx.closePath()
    ctx.fill()

    // shaded right half
    ctx.fillStyle = '#76726b'
    ctx.beginPath()
    ctx.moveTo(bx + 7, y + 29)
    ctx.lineTo(bx + 14, y + 29)
    ctx.lineTo(bx + 12, top + 8)
    ctx.quadraticCurveTo(bx + 11, top - 1, bx + 7, top)
    ctx.closePath()
    ctx.fill()

    // carved "windows" up the side and a door at the base
    ctx.fillStyle = 'rgba(40, 36, 30, 0.55)'
    for (let wy = y - 18; wy < y + 14; wy += 12) {
        ctx.fillRect(bx + 3, wy, 3, 5)
        ctx.fillRect(bx + 8, wy, 3, 5)
    }
    ctx.fillStyle = '#4d4a45'
    ctx.fillRect(bx + 4, y + 19, 6, 10)
}

// ---- the ground types you can walk on ----

function drawDune(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = '#e6c883'
    ctx.fillRect(x, y, TILE, TILE)
    ctx.strokeStyle = 'rgba(255, 244, 205, 0.55)'     // light ripples
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
        const yy = y + 6 + i * 10 + rand(col, row, i) * 4
        ctx.beginPath()
        ctx.moveTo(x + 2, yy)
        ctx.quadraticCurveTo(x + 16, yy - 5, x + 30, yy)
        ctx.stroke()
    }
    ctx.fillStyle = 'rgba(150, 105, 50, 0.18)'        // a shadow under each ripple
    ctx.fillRect(x, y + 28, TILE, 4)
}

function drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = rand(col, row, 7) > 0.5 ? '#8fb05c' : '#86a955'
    ctx.fillRect(x, y, TILE, TILE)
    for (let i = 0; i < 9; i++) {                      // blades of grass
        ctx.fillStyle = i % 3 === 0 ? '#b6cf7c' : '#6f9440'
        const bx = x + Math.floor(rand(col, row, i * 2) * (TILE - 3))
        const by = y + Math.floor(rand(col, row, i * 2 + 1) * (TILE - 5))
        ctx.fillRect(bx, by, 1, 4)
        ctx.fillRect(bx + 2, by + 1, 1, 3)
    }
}

function drawPaved(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = '#d2c5a2'
    ctx.fillRect(x, y, TILE, TILE)
    ctx.fillStyle = 'rgba(80, 60, 30, 0.28)'          // joints between the slabs
    ctx.fillRect(x, y + 15, TILE, 1)
    ctx.fillRect(x + (row % 2 === 0 ? 15 : 8), y, 1, 15)
    ctx.fillRect(x + (row % 2 === 0 ? 8 : 22), y + 16, 1, 16)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.fillRect(x + 1, y + 1, 12, 2)
    if (rand(col, row, 3) > 0.7) {
        ctx.fillStyle = 'rgba(120, 90, 50, 0.2)'
        ctx.fillRect(x + 18, y + 20, 7, 5)
    }
}

function drawRoad(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = '#c9a56b'
    ctx.fillRect(x, y, TILE, TILE)
    ctx.fillStyle = 'rgba(110, 75, 35, 0.22)'          // wheel ruts
    ctx.fillRect(x, y + 8, TILE, 3)
    ctx.fillRect(x, y + 21, TILE, 3)
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#a98550' : '#e0c48e'
        ctx.fillRect(x + Math.floor(rand(col, row, i) * 28), y + Math.floor(rand(col, row, i + 9) * 28), 2, 2)
    }
}

function drawField(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = '#7b5632'
    ctx.fillRect(x, y, TILE, TILE)
    for (let i = 0; i < 4; i++) {                      // furrows with young plants
        const yy = y + 3 + i * 8
        ctx.fillStyle = 'rgba(40, 20, 5, 0.35)'
        ctx.fillRect(x, yy + 4, TILE, 2)
        ctx.fillStyle = '#5f9f3a'
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 3 + k * 8 + (rand(col, row, i * 4 + k) > 0.5 ? 1 : 0), yy - 1, 2, 5)
    }
}

function drawReeds(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, time: number) {
    drawGrass(ctx, x, y, col, row)
    for (let i = 0; i < 6; i++) {                      // tall reeds that sway a little
        const bx = x + 3 + i * 5 + rand(col, row, i) * 3
        const sway = Math.sin(time / 500 + bx) * 1.5
        ctx.strokeStyle = '#4d8a37'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bx, y + 30)
        ctx.lineTo(bx + sway, y + 8 + rand(col, row, i + 5) * 6)
        ctx.stroke()
        ctx.fillStyle = '#7a4f24'
        ctx.fillRect(bx + sway - 1, y + 5 + rand(col, row, i + 5) * 6, 3, 5)
    }
}

// ---- things that stand on the ground ----

// A wall segment (W = mud brick, # = sandstone)
function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, stone: boolean) {
    const body = stone ? '#cdb48a' : '#b9794a'
    const cap = stone ? '#e8d3a6' : '#d49a68'
    const joint = stone ? 'rgba(80, 60, 30, 0.3)' : 'rgba(70, 35, 10, 0.3)'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(x + 1, y + 28, TILE - 1, 4)
    ctx.fillStyle = body
    ctx.fillRect(x, y + 4, TILE, 26)
    ctx.fillStyle = cap
    ctx.fillRect(x, y + 2, TILE, 7)
    ctx.fillStyle = joint
    for (let k = 0; k < 3; k++) {
        ctx.fillRect(x, y + 14 + k * 6, TILE, 1)
        ctx.fillRect(x + ((k + (stone ? 0 : 1)) % 2 === 0 ? 8 : 20), y + 9 + k * 6, 1, 6)
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
    ctx.fillRect(x, y + 26, TILE, 4)
}

// A column with a lotus-shaped top. It is taller than its tile.
function drawColumn(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(x + 17, y + 28, 10, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c7a972'                           // the base
    ctx.fillRect(x + 8, y + 22, 16, 6)
    const grad = ctx.createLinearGradient(x + 10, 0, x + 22, 0)   // the round shaft
    grad.addColorStop(0, '#ead3a2')
    grad.addColorStop(0.55, '#d3b67e')
    grad.addColorStop(1, '#9d7e4e')
    ctx.fillStyle = grad
    ctx.fillRect(x + 10, y - 12, 12, 36)
    ctx.fillStyle = 'rgba(80, 50, 20, 0.25)'
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 10, y - 6 + k * 8, 12, 1)
    ctx.fillStyle = '#e4c88f'                           // the flared top
    ctx.beginPath()
    ctx.moveTo(x + 10, y - 12)
    ctx.lineTo(x + 5, y - 20)
    ctx.lineTo(x + 27, y - 20)
    ctx.lineTo(x + 22, y - 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#b8955a'
    ctx.fillRect(x + 4, y - 24, 24, 5)
}

// A ram-headed sphinx, the guardian of the temple avenues of Amun
function drawSphinx(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 28, 13, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c9a76f'                           // the lion's body
    ctx.beginPath()
    ctx.roundRect(x + 5, y + 14, 22, 13, 4)
    ctx.fill()
    ctx.fillRect(x + 3, y + 22, 10, 6)                  // front paws
    ctx.fillStyle = '#a98850'
    ctx.fillRect(x + 20, y + 16, 7, 10)
    ctx.fillStyle = '#c9a76f'                           // the ram's head
    ctx.fillRect(x + 4, y + 8, 9, 10)
    ctx.fillStyle = '#a98850'
    ctx.beginPath()
    ctx.arc(x + 12, y + 11, 4, -Math.PI / 2, Math.PI)  // a curled horn
    ctx.lineWidth = 2
    ctx.strokeStyle = '#8a6a38'
    ctx.stroke()
    ctx.fillStyle = '#2a1a08'
    ctx.fillRect(x + 6, y + 11, 2, 2)
}

function drawBrazier(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 8, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#5a3d20'                           // the stand
    ctx.fillRect(x + 14, y + 17, 4, 10)
    ctx.fillStyle = '#7c5428'                           // the bowl
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 12)
    ctx.lineTo(x + 24, y + 12)
    ctx.lineTo(x + 20, y + 19)
    ctx.lineTo(x + 12, y + 19)
    ctx.closePath()
    ctx.fill()
    for (let i = 0; i < 3; i++) {                       // flames that flicker
        const f = Math.sin(time / 120 + i * 2) * 2
        ctx.fillStyle = i === 1 ? '#ffd36a' : '#ff8a2a'
        ctx.beginPath()
        ctx.moveTo(x + 11 + i * 5, y + 12)
        ctx.quadraticCurveTo(x + 12 + i * 5 + f, y + 4 - i, x + 13 + i * 5, y + 12)
        ctx.fill()
    }
}

function drawWell(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 12, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#9d9486'                           // the stone ring
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 22, 11, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2f6f9b'                           // the water
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 21, 8, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6e4a26'                           // posts and the beam
    ctx.fillRect(x + 6, y + 6, 3, 17)
    ctx.fillRect(x + 23, y + 6, 3, 17)
    ctx.fillRect(x + 5, y + 5, 22, 3)
    ctx.fillStyle = '#3d2a14'                           // the bucket
    ctx.fillRect(x + 14, y + 9, 5, 5)
}

function drawTent(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(x + 3, y + 27, 27, 3)
    ctx.fillStyle = '#b8452e'
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 3)
    ctx.lineTo(x + 30, y + 28)
    ctx.lineTo(x + 2, y + 28)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#efe2c2'                           // a cream stripe
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 3)
    ctx.lineTo(x + 22, y + 28)
    ctx.lineTo(x + 12, y + 28)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#2a1a08'                           // the doorway
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 14)
    ctx.lineTo(x + 20, y + 28)
    ctx.lineTo(x + 12, y + 28)
    ctx.closePath()
    ctx.fill()
}

function drawStall(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(x + 3, y + 28, 27, 3)
    ctx.fillStyle = '#7a5530'                           // the counter
    ctx.fillRect(x + 4, y + 18, 24, 10)
    const goods = ['#d9a441', '#9b3b2e', '#4a8a4a', '#d8d2c0']
    for (let k = 0; k < 4; k++) {                       // goods on the counter
        ctx.fillStyle = goods[Math.floor(rand(col, row, k) * goods.length)]
        ctx.fillRect(x + 6 + k * 5, y + 15, 4, 4)
    }
    ctx.fillStyle = '#6e4a26'                           // poles
    ctx.fillRect(x + 4, y + 6, 2, 14)
    ctx.fillRect(x + 26, y + 6, 2, 14)
    for (let k = 0; k < 6; k++) {                       // the striped awning
        ctx.fillStyle = k % 2 === 0 ? '#b8452e' : '#efe2c2'
        ctx.fillRect(x + 2 + k * 4.5, y + 3, 4.5, 8)
    }
}

function drawBoulder(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 12, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    const big = 0.8 + rand(col, row, 4) * 0.4
    const rock = (cx: number, cy: number, s: number, color: string) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(cx - 9 * s, cy + 6 * s)
        ctx.lineTo(cx - 6 * s, cy - 5 * s)
        ctx.lineTo(cx + 3 * s, cy - 8 * s)
        ctx.lineTo(cx + 10 * s, cy - 1 * s)
        ctx.lineTo(cx + 8 * s, cy + 6 * s)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.fillRect(cx - 3 * s, cy - 6 * s, 5 * s, 2)
    }
    rock(x + 13, y + 20, big, '#8f8a80')
    rock(x + 23, y + 23, 0.55, '#a39e94')
}

// A heap of slag: the dark waste left over from smelting iron
function drawSlag(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 13, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2e2926'
    ctx.beginPath()
    ctx.moveTo(x + 2, y + 28)
    ctx.lineTo(x + 8, y + 12 + rand(col, row, 1) * 4)
    ctx.lineTo(x + 17, y + 6 + rand(col, row, 2) * 4)
    ctx.lineTo(x + 26, y + 13)
    ctx.lineTo(x + 31, y + 28)
    ctx.closePath()
    ctx.fill()
    for (let i = 0; i < 7; i++) {                       // rusty flecks and a few shiny bits
        ctx.fillStyle = i % 3 === 0 ? '#8a4b2a' : i % 3 === 1 ? '#5a5048' : '#b0643a'
        ctx.fillRect(x + 6 + Math.floor(rand(col, row, i + 10) * 20), y + 12 + Math.floor(rand(col, row, i + 20) * 14), 2, 2)
    }
}

// Which ground is under a tile (what you see around the things standing on it)
function drawGround(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, col: number, row: number, time: number, n: Neighbors) {
    switch (ch) {
        case 'd': drawDune(ctx, x, y, col, row); break
        case 'g': drawGrass(ctx, x, y, col, row); break
        case 'f': drawPaved(ctx, x, y, col, row); break
        case '=': drawRoad(ctx, x, y, col, row); break
        case 'k': drawField(ctx, x, y, col, row); break
        case 'r': drawReeds(ctx, x, y, col, row, time); break
        default: drawSand(ctx, x, y, col, row, n)
    }
}

// Draws the correct picture for one map character. `time` is in milliseconds
// and is used for the moving water, swaying palms and flickering flames.
export function drawTileArt(
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    col: number,
    row: number,
    time: number,
    n: Neighbors,
) {
    switch (char) {
        case '~':
            drawWater(ctx, x, y, col, row, time, n)
            break
        case 'H':
            drawSand(ctx, x, y, col, row, n)
            drawBlock(ctx, x, y, 'H', n, paintHouse)
            break
        case 'P':
            drawSand(ctx, x, y, col, row, n)
            drawBlock(ctx, x, y, 'P', n, paintPyramid)
            break
        case 'G':
            drawGround(ctx, 'f', x, y, col, row, time, n)
            drawBlock(ctx, x, y, 'G', n, paintPylon)
            break
        case 'B':
            drawSand(ctx, x, y, col, row, n)
            drawBlock(ctx, x, y, 'B', n, paintMesa)
            break
        case 'T':
            drawSand(ctx, x, y, col, row, n)
            drawPalm(ctx, x, y, time, col)
            break
        case 'S':
            drawSand(ctx, x, y, col, row, n)
            drawStela(ctx, x, y)
            break
        case 'W':
        case '#':
            drawSand(ctx, x, y, col, row, n)
            drawWall(ctx, x, y, char === '#')
            break
        case 'c':
            drawGround(ctx, 'f', x, y, col, row, time, n)
            drawColumn(ctx, x, y)
            break
        case 'x':
            drawGround(ctx, 'f', x, y, col, row, time, n)
            drawBrazier(ctx, x, y, time)
            break
        case 'a':
            drawGround(ctx, '=', x, y, col, row, time, n)
            drawSphinx(ctx, x, y)
            break
        case 'w':
            drawSand(ctx, x, y, col, row, n)
            drawWell(ctx, x, y)
            break
        case 't':
            drawSand(ctx, x, y, col, row, n)
            drawTent(ctx, x, y)
            break
        case 'M':
            drawSand(ctx, x, y, col, row, n)
            drawStall(ctx, x, y, col, row)
            break
        case 'b':
            drawSand(ctx, x, y, col, row, n)
            drawBoulder(ctx, x, y, col, row)
            break
        case 'i':
            drawSand(ctx, x, y, col, row, n)
            drawSlag(ctx, x, y, col, row)
            break
        default:
            drawGround(ctx, char, x, y, col, row, time, n)   // sand, dunes, grass, paving, roads, fields, reeds
    }
}

const SKIN_TONES = ['#8d5a3b', '#6b4226', '#a06b46', '#5a3825']

// Picks a skin tone from a name, so each villager always looks the same.
export function skinFor(name: string): string {
    let sum = 0
    for (const c of name) sum += c.charCodeAt(0)
    return SKIN_TONES[sum % SKIN_TONES.length]
}

// Draws a person. (x, y) and `size` are the player's collision box; the
// feet stand on the bottom of the box and the head sticks out above it.
export function drawPerson(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    look: PersonLook,
    facing: Facing,
    moving: boolean,
    time: number,
) {
    ctx.save()
    ctx.translate(x + size / 2, y + size) // origin = the middle of the feet

    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    const swing = moving ? Math.sin(time / 100) * 3 : 0
    const bob = moving ? Math.abs(Math.sin(time / 100)) * -1 : 0
    const long = look.outfit === 'robe' || look.outfit === 'dress' // robes and dresses reach the ground

    // legs (long outfits only show the feet under the hem)
    ctx.fillStyle = look.skin
    if (long) {
        ctx.fillRect(-5, -2 - Math.max(0, swing) / 2, 4, 2)
        ctx.fillRect(1, -2 - Math.max(0, -swing) / 2, 4, 2)
    } else {
        ctx.fillRect(-5, -9 - Math.max(0, swing), 4, 9)
        ctx.fillRect(1, -9 - Math.max(0, -swing), 4, 9)
    }

    // arms (robes get sleeves)
    ctx.fillRect(-9, -21 + bob - swing / 2, 3, 8)
    ctx.fillRect(6, -21 + bob + swing / 2, 3, 8)
    if (look.outfit === 'robe') {
        ctx.fillStyle = look.cloth
        ctx.fillRect(-9, -21 + bob - swing / 2, 3, 5)
        ctx.fillRect(6, -21 + bob + swing / 2, 3, 5)
    } else if (look.outfit === 'tunic') {
        ctx.fillStyle = look.cloth                       // short sleeves
        ctx.fillRect(-9, -21 + bob - swing / 2, 3, 3)
        ctx.fillRect(6, -21 + bob + swing / 2, 3, 3)
    }
    if (look.extra === 'armbands') {
        ctx.fillStyle = look.accent
        ctx.fillRect(-9, -17 + bob - swing / 2, 3, 1.5)
        ctx.fillRect(6, -17 + bob + swing / 2, 3, 1.5)
    }

    // body
    if (look.outfit === 'kilt' || look.outfit === 'leopard') {
        ctx.fillStyle = look.skin
        ctx.fillRect(-6, -22 + bob, 12, 8) // bare chest
        ctx.fillStyle = look.cloth
        ctx.fillRect(-6, -15 + bob, 12, 8) // kilt
        ctx.fillStyle = look.accent
        ctx.fillRect(-6, -9 + bob, 12, 1) // gold hem
        ctx.fillRect(-5, -22 + bob, 10, 2) // gold collar
        if (look.outfit === 'leopard') {
            // a priest: a leopard skin worn over one shoulder
            ctx.fillStyle = '#d8a24a'
            ctx.beginPath()
            ctx.moveTo(-6, -22 + bob)
            ctx.lineTo(-1, -22 + bob)
            ctx.lineTo(6, -12 + bob)
            ctx.lineTo(6, -8 + bob)
            ctx.lineTo(1, -8 + bob)
            ctx.lineTo(-6, -17 + bob)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = '#3a2210'
            for (const [sx, sy] of [[-4, -20], [-1, -17], [2, -14], [4, -10], [-3, -16]]) ctx.fillRect(sx, sy + bob, 1.5, 1.5)
        }
    } else if (look.outfit === 'tunic') {
        ctx.fillStyle = look.cloth
        ctx.fillRect(-6, -22 + bob, 12, 14) // tunic down to the knees
        ctx.fillStyle = look.accent
        ctx.fillRect(-6, -15 + bob, 12, 2) // belt
        ctx.fillRect(-6, -9 + bob, 12, 1) // hem
        ctx.fillStyle = look.skin
        ctx.fillRect(-2, -22 + bob, 4, 2) // neck
    } else if (look.outfit === 'robe') {
        ctx.fillStyle = look.cloth
        ctx.fillRect(-6, -22 + bob, 12, 20) // long robe
        ctx.fillStyle = look.accent
        ctx.fillRect(-6, -3, 12, 1) // hem
        ctx.fillRect(-1, -20 + bob, 2, 16) // front trim
        ctx.fillStyle = look.skin
        ctx.fillRect(-2, -22 + bob, 4, 2) // neck
    } else {
        // dress: bare shoulders, a skirt that widens, and a gold sash
        ctx.fillStyle = look.skin
        ctx.fillRect(-6, -22 + bob, 12, 2)
        ctx.fillStyle = look.cloth
        ctx.beginPath()
        ctx.moveTo(-5, -20 + bob)
        ctx.lineTo(5, -20 + bob)
        ctx.lineTo(7, -2)
        ctx.lineTo(-7, -2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = look.accent
        ctx.fillRect(-5, -14 + bob, 10, 2) // sash
        ctx.fillRect(-7, -3, 14, 1) // hem
    }

    // head
    ctx.fillStyle = look.skin
    ctx.beginPath()
    ctx.arc(0, -27 + bob, 5, 0, Math.PI * 2)
    ctx.fill()

    // a cap over the top of the head (the whole head when seen from behind)
    const back = facing === 'up'
    const cap = (color: string) => {
        ctx.fillStyle = color
        ctx.beginPath()
        if (back) ctx.arc(0, -27 + bob, 5, 0, Math.PI * 2)
        else ctx.arc(0, -28 + bob, 5, Math.PI, 0)
        ctx.fill()
    }

    if (look.hair === 'headwrap') {
        cap(look.cloth)
        ctx.beginPath()
        ctx.arc(0, -33 + bob, 2.5, 0, Math.PI * 2) // knot on top
        ctx.fill()
        ctx.fillStyle = look.accent
        ctx.fillRect(-5, -29 + bob, 10, 1)
    } else if (look.hair === 'cap') {
        // the close-fitting cap of Kushite kings, with a band and two little cobras on the front
        cap('#2a2018')
        ctx.fillStyle = look.accent
        ctx.fillRect(-5, -28 + bob, 10, 1.5)
        if (!back) {
            ctx.fillRect(-2, -32 + bob, 1.5, 3)
            ctx.fillRect(0.5, -32 + bob, 1.5, 3)
        }
    } else if (look.hair !== 'bald') {
        const hc = look.hairColor ?? '#1c1410'
        if (look.hair === 'curly') {
            // a round puff of curls
            ctx.fillStyle = hc
            ctx.beginPath()
            if (back) ctx.arc(0, -28 + bob, 6.5, 0, Math.PI * 2)
            else ctx.arc(0, -28.5 + bob, 6.5, Math.PI * 0.92, Math.PI * 2.08)
            ctx.fill()
            for (const [bx, by] of [[-5, -32], [0, -34], [5, -32]]) {
                ctx.beginPath()
                ctx.arc(bx, by + bob, 2.5, 0, Math.PI * 2)
                ctx.fill()
            }
        } else {
            cap(hc)
        }
        if (look.hair === 'braids' || look.hair === 'long') {
            ctx.fillStyle = hc
            const wide = look.hair === 'long' ? 3 : 2
            ctx.fillRect(-6, -27 + bob, wide, look.hair === 'long' ? 10 : 9)
            ctx.fillRect(6 - wide, -27 + bob, wide, look.hair === 'long' ? 10 : 9)
            if (back && look.hair === 'long') ctx.fillRect(-5, -27 + bob, 10, 9)
            if (look.hair === 'braids') {
                ctx.fillStyle = look.accent
                ctx.fillRect(-6, -19 + bob, 2, 2) // beads
                ctx.fillRect(4, -19 + bob, 2, 2)
            }
        }
        if (look.hair !== 'curly') {
            ctx.fillStyle = look.accent
            ctx.fillRect(-5, -29 + bob, 10, 2) // headband
        }
    }

    // extras
    if (look.crown) {
        ctx.fillStyle = '#e8c75a'
        ctx.fillRect(-5.5, -32 + bob, 11, 2.5)
        for (const cx of [-4.5, 0, 4.5]) {
            ctx.beginPath()
            ctx.moveTo(cx - 1.8, -31.5 + bob)
            ctx.lineTo(cx, -36 + bob)
            ctx.lineTo(cx + 1.8, -31.5 + bob)
            ctx.fill()
        }
        ctx.fillStyle = '#b0412e'
        ctx.fillRect(-0.8, -31.5 + bob, 1.6, 1.6)
    }
    if (look.extra === 'feather') {
        // an ostrich feather stuck in the hair, like Nubian archers wore
        ctx.save()
        ctx.translate(3, -33 + bob)
        ctx.rotate(0.35)
        ctx.fillStyle = '#f3ede0'
        ctx.beginPath()
        ctx.ellipse(0, -5, 2.2, 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#9a948a'
        ctx.fillRect(-0.4, -10, 0.8, 11)
        ctx.restore()
    }
    if (look.extra === 'necklace') {
        for (let i = -4; i <= 4; i += 2) {
            ctx.fillStyle = i % 4 === 0 ? look.accent : '#3aa6c4'
            ctx.fillRect(i - 0.75, -20.5 + bob + Math.abs(i) * -0.2, 1.6, 1.6)
        }
    }
    if (look.extra === 'earrings' && !back) {
        ctx.fillStyle = look.accent
        ctx.fillRect(-5.8, -25 + bob, 1.6, 2)
        ctx.fillRect(4.2, -25 + bob, 1.6, 2)
    }

    // eyes
    if (!back) {
        const shift = facing === 'left' ? -1.5 : facing === 'right' ? 1.5 : 0
        ctx.fillStyle = '#1c1410'
        ctx.fillRect(-3 + shift, -26 + bob, 1.5, 1.5)
        ctx.fillRect(1.5 + shift, -26 + bob, 1.5, 1.5)
    }

    ctx.restore()
}

// Fonts (loaded in main.ts): Cinzel is carved-inscription style for titles,
// Cormorant Garamond is an easy-to-read serif for the actual sentences.
const FONT_TITLE = "'Cinzel', serif"
const FONT_BODY = "'Cormorant Garamond', serif"

// Splits text into lines that fit in maxWidth. Set ctx.font BEFORE calling.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const out: string[] = []
    let line = ''
    for (const word of text.split(' ')) {
        const test = line ? line + ' ' + word : word
        if (line && ctx.measureText(test).width > maxWidth) {
            out.push(line)
            line = word
        } else {
            line = test
        }
    }
    if (line) out.push(line)
    return out
}

// Overshoots a little then settles, so the box feels like it "pops" into place.
function easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx + r, cy)
    ctx.lineTo(cx, cy + r)
    ctx.lineTo(cx - r, cy)
    ctx.closePath()
    ctx.fill()
}

// Draws the dialogue box at the bottom of the screen.
//   open  = 0..1, how far the box has opened (it slides up and fades in)
//   shown = how many characters of `text` to show (the typewriter effect)
export function drawDialogue(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    name: string,
    text: string,
    open: number,
    shown: number,
    time: number,
) {
    const boxW = canvasW - 80
    const boxH = 132
    const x = 40
    const y = canvasH - boxH - 24 + (1 - easeOutBack(open)) * 70 // slides up from below
    addButton('dialogue', x, y, boxW, boxH)   // click the box to go on

    ctx.save()
    ctx.globalAlpha = Math.min(1, open * 1.6)

    // dark panel with a double gold border
    ctx.fillStyle = 'rgba(26, 17, 10, 0.95)'
    ctx.beginPath()
    ctx.roundRect(x, y, boxW, boxH, 8)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x + 7, y + 7, boxW - 14, boxH - 14, 4)
    ctx.stroke()

    // gold diamonds in the corners
    ctx.fillStyle = '#e8c75a'
    for (const [cx, cy] of [[x, y], [x + boxW, y], [x, y + boxH], [x + boxW, y + boxH]]) {
        diamond(ctx, cx, cy, 6)
    }

    // name plate sitting on the top border
    ctx.font = `700 16px ${FONT_TITLE}`
    const plateW = ctx.measureText(name.toUpperCase()).width + 40
    const grad = ctx.createLinearGradient(0, y - 16, 0, y + 12)
    grad.addColorStop(0, '#f0d36e')
    grad.addColorStop(1, '#b8901f')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(x + 30, y - 16, plateW, 30, 6)
    ctx.fill()
    ctx.fillStyle = '#2a1a08'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.toUpperCase(), x + 50, y - 1)

    // the sentence, revealed one letter at a time
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f3ead6'
    ctx.font = `600 22px ${FONT_BODY}`
    let left = shown
    wrapText(ctx, text, boxW - 70).forEach((line, i) => {
        if (left <= 0) return
        ctx.fillText(line.slice(0, left), x + 35, y + 52 + i * 28)
        left -= line.length + 1
    })

    // bobbing arrow + hint once the whole sentence is showing
    if (shown >= text.length) {
        const bob = Math.sin(time / 180) * 2
        ctx.fillStyle = '#e8c75a'
        ctx.font = `700 12px ${FONT_TITLE}`
        ctx.textAlign = 'right'
        ctx.fillText('PRESS E', x + boxW - 44, y + boxH - 16)
        ctx.textAlign = 'left'
        ctx.beginPath()
        ctx.moveTo(x + boxW - 34, y + boxH - 24 + bob)
        ctx.lineTo(x + boxW - 22, y + boxH - 24 + bob)
        ctx.lineTo(x + boxW - 28, y + boxH - 15 + bob)
        ctx.closePath()
        ctx.fill()
    }

    ctx.restore()
}

// Draws the quest panel in the top-left corner of the screen.
//   done / total = how many quests are finished (shown as diamonds)
//   title        = name of the active quest, or null if there isn't one
//   text         = the goal, or a hint like "Talk to a villager."
export function drawQuestPanel(
    ctx: CanvasRenderingContext2D,
    done: number,
    total: number,
    title: string | null,
    text: string,
): number {
    const x = 16
    const y = 16
    const w = 340

    ctx.save()

    // work out how tall the panel needs to be before drawing it
    ctx.font = `600 18px ${FONT_BODY}`
    const lines = wrapText(ctx, text, w - 32)
    const rows = lines.length + (title ? 1 : 0)
    const h = 30 + rows * 22 + 12

    // dark panel with a gold border
    ctx.fillStyle = 'rgba(26, 17, 10, 0.92)'
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 8)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#e8c75a'
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        diamond(ctx, cx, cy, 4)
    }

    // header: "QUESTS" on the left, one diamond per quest on the right
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = `700 13px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('QUESTS', x + 16, y + 16)
    ctx.strokeStyle = '#e8c75a'
    ctx.lineWidth = 1.5
    for (let i = 0; i < total; i++) {
        const cx = x + w - 22 - (total - 1 - i) * (total > 10 ? 13 : 18)
        if (i < done) {
            diamond(ctx, cx, y + 16, 5)
        } else {
            ctx.beginPath()
            ctx.moveTo(cx, y + 11)
            ctx.lineTo(cx + 5, y + 16)
            ctx.lineTo(cx, y + 21)
            ctx.lineTo(cx - 5, y + 16)
            ctx.closePath()
            ctx.stroke()
        }
    }

    // thin divider under the header
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)'
    ctx.beginPath()
    ctx.moveTo(x + 12, y + 32)
    ctx.lineTo(x + w - 12, y + 32)
    ctx.stroke()

    // quest name (small gold capitals), then the goal in the readable font
    ctx.textBaseline = 'alphabetic'
    let ty = y + 30 + 22
    if (title) {
        ctx.font = `700 13px ${FONT_TITLE}`
        ctx.fillStyle = '#f0d36e'
        ctx.fillText(title.toUpperCase(), x + 16, ty)
        ty += 22
    }
    ctx.font = `600 18px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    for (const line of lines) {
        ctx.fillText(line, x + 16, ty)
        ty += 22
    }

    ctx.restore()
    return y + h   // the bottom of the panel
}

// The tutorial box under the quest panel: one step at a time
export function drawTutorial(ctx: CanvasRenderingContext2D, top: number, step: number, total: number, text: string, time: number) {
    const x = 16
    const y = top + 12
    const w = 340
    ctx.save()
    ctx.font = `600 17px ${FONT_BODY}`
    const lines = wrapText(ctx, text, w - 32)
    const h = 38 + lines.length * 21 + 26

    // a soft gold glow that pulses, so you notice a new step
    const glow = 0.35 + Math.sin(time / 350) * 0.25
    ctx.fillStyle = 'rgba(32, 22, 10, 0.94)'
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 8)
    ctx.fill()
    ctx.strokeStyle = `rgba(246, 220, 130, ${0.5 + glow})`
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.font = `700 13px ${FONT_TITLE}`
    ctx.fillStyle = '#f6dc82'
    ctx.fillText('TUTORIAL', x + 16, y + 17)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#c9b98a'
    ctx.fillText(`STEP ${step} OF ${total}`, x + w - 16, y + 17)
    // progress bar
    ctx.fillStyle = 'rgba(201, 162, 39, 0.25)'
    ctx.fillRect(x + 16, y + 30, w - 32, 3)
    ctx.fillStyle = '#e8c75a'
    ctx.fillRect(x + 16, y + 30, (w - 32) * ((step - 1) / total), 3)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `600 17px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    lines.forEach((l, i) => ctx.fillText(l, x + 16, y + 54 + i * 21))
    ctx.font = `600 13px ${FONT_BODY}`
    ctx.fillStyle = '#9a8a6a'
    ctx.fillText('You can turn the tutorial off in Settings (Esc).', x + 16, y + h - 10)
    ctx.restore()
}


// ---------------------------------------------------------------------------
// Character designer options
// ---------------------------------------------------------------------------
export const PLAYER_SKINS = ['#5a3825', '#6b4226', '#7a4a2e', '#8d5a3b', '#a06b46', '#c28a5f']
export const OUTFITS: Outfit[] = ['kilt', 'robe', 'dress', 'tunic', 'leopard']
export const HAIRS: Hair[] = ['short', 'braids', 'bald', 'headwrap', 'curly', 'long', 'cap']
export const CLOTH_COLORS = ['#f3ead6', '#9b2525', '#2f6fb5', '#2e7d32', '#7b3fa0', '#e0a030', '#b5654a', '#3aa6c4', '#2a2a2a']
export const HAIR_COLORS: [string, string][] = [['Black', '#1c1410'], ['Brown', '#4a2e1c'], ['Gray', '#9a948a']]
export const TRIM_COLORS: [string, string][] = [['Gold', '#d4a82a'], ['Silver', '#c0c4c8'], ['Red', '#b0412e'], ['Turquoise', '#3aa6a0'], ['White', '#f3ead6']]
export const EXTRAS = ['none', 'necklace', 'earrings', 'armbands', 'feather']
// how each choice is called in the character creator
export const LOOK_NAMES: Record<string, string> = {
    kilt: 'Kilt', robe: 'Robe', dress: 'Dress', tunic: 'Tunic', leopard: 'Priest',
    short: 'Short', braids: 'Braids', bald: 'Bald', headwrap: 'Headwrap', curly: 'Curly', long: 'Long', cap: 'Kushite cap',
    none: 'None', necklace: 'Necklace', earrings: 'Earrings', armbands: 'Armbands', feather: 'Feather',
}

// ---------------------------------------------------------------------------
// Name tags, quest markers and items on the ground (drawn inside the camera)
// ---------------------------------------------------------------------------

// A small pill with a name in it. (cx, cy) is the middle of the pill.
export function drawNameTag(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
    ctx.save()
    const label = text.toUpperCase()
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const w = ctx.measureText(label).width + 16
    ctx.fillStyle = 'rgba(26, 17, 10, 0.85)'
    ctx.beginPath()
    ctx.roundRect(cx - w / 2, cy - 9, w, 18, 9)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#f3ead6'
    ctx.fillText(label, cx, cy + 0.5)
    ctx.restore()
}

// A bobbing gold "!" (new quest) or "?" (ready to hand in) above a villager.
export function drawMarker(ctx: CanvasRenderingContext2D, symbol: string, cx: number, cy: number, time: number) {
    ctx.save()
    const y = cy + Math.sin(time / 250) * 3
    ctx.fillStyle = '#e8c75a'
    ctx.strokeStyle = '#6e4d0f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#2a1a08'
    ctx.font = `700 14px ${FONT_TITLE}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(symbol, cx, y + 1)
    ctx.restore()
}

// Makes a "#rrggbb" color lighter (amount > 0) or darker (amount < 0)
function shade(color: string, amount: number): string {
    const n = parseInt(color.slice(1), 16)
    const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)))
    const r = ch((n >> 16) & 255)
    const g = ch((n >> 8) & 255)
    const b = ch(n & 255)
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

// Draws an item: on the ground, in a slot, or stuck to the mouse. Every item has its own picture
// (picked by its id); anything without one is drawn as a plain lump in its color.
export function drawItem(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number, id = '') {
    const bob = Math.sin(time / 300 + x) * 2

    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 9, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(x, y + bob)   // from here on, (0, 0) is the top-left of the 32x32 item square
    const dark = shade(color, -0.22)
    const light = shade(color, 0.22)
    const rect = (rx: number, ry: number, rw: number, rh: number, c: string) => {
        ctx.fillStyle = c
        ctx.fillRect(rx, ry, rw, rh)
    }
    const circle = (cx: number, cy: number, r: number, c: string) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
    }
    const oval = (cx: number, cy: number, rx: number, ry: number, rot: number, c: string) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
        ctx.fill()
    }
    const shape = (points: number[], c: string) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.moveTo(points[0], points[1])
        for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
        ctx.closePath()
        ctx.fill()
    }
    const line = (points: number[], c: string, width: number) => {
        ctx.strokeStyle = c
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(points[0], points[1])
        for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
        ctx.stroke()
    }
    // a stone block seen from a little above: top, front and side
    const block = (bx: number, by: number, bw: number, bh: number, c: string) => {
        shape([bx, by + 4, bx + 4, by, bx + bw + 4, by, bx + bw, by + 4], shade(c, 0.18))
        rect(bx, by + 4, bw, bh, c)
        shape([bx + bw, by + 4, bx + bw + 4, by, bx + bw + 4, by + bh, bx + bw, by + bh + 4], shade(c, -0.2))
    }
    // a string of beads along a curve
    const beads = (c1: string, c2: string) => {
        for (let i = 0; i < 9; i++) {
            const a = Math.PI * (0.1 + i * 0.1)
            circle(16 + Math.cos(a) * 10, 9 + Math.sin(a) * 12, 2.6, i % 2 ? c1 : c2)
        }
    }
    // a gold coin with something on it
    const coin = (c: string) => {
        circle(16, 18, 9, shade(c, -0.25))
        circle(16, 17, 9, c)
        circle(16, 17, 6.5, shade(c, 0.12))
        ctx.strokeStyle = shade(c, -0.3)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(16, 17, 7.5, 0, Math.PI * 2)
        ctx.stroke()
    }

    switch (id) {
        // ---- resources ----
        case 'iron-ore':
            shape([7, 24, 9, 14, 16, 10, 24, 13, 26, 22, 20, 26], color)
            shape([16, 10, 24, 13, 26, 22, 18, 18], dark)
            for (const [sx, sy] of [[11, 18], [15, 22], [20, 15], [13, 14]]) rect(sx, sy, 2.5, 2.5, '#a0522d')   // rusty specks
            break
        case 'gold-nugget':
            oval(16, 19, 9, 6.5, -0.2, dark)
            oval(15, 18, 8, 6, -0.2, color)
            oval(12, 16, 3, 2, -0.3, '#fff6c8')
            break
        case 'sandstone':
            block(7, 12, 16, 11, color)
            line([7, 20, 23, 20], dark, 1)                     // layers in the stone
            line([7, 24, 23, 24], dark, 1)
            break
        case 'cut-block':
            block(5, 16, 11, 8, color)
            block(15, 16, 11, 8, color)
            block(10, 8, 11, 8, light)
            break
        case 'granite':
            block(7, 12, 16, 12, color)
            for (const [sx, sy, c] of [[10, 18, '#3a3a3a'], [15, 21, '#f0f0f0'], [19, 17, '#3a3a3a'], [12, 23, '#f0f0f0'], [20, 23, '#5a5a5a']] as [number, number, string][]) rect(sx, sy, 2, 2, c)
            break
        case 'mud-brick':
            block(6, 15, 19, 8, color)
            for (const [sx, sy] of [[9, 21], [14, 23], [19, 20], [11, 25]]) rect(sx, sy, 3, 1, '#e0c070')   // bits of straw
            break
        case 'clay':
            oval(16, 20, 10, 6, 0, dark)
            oval(16, 18, 9, 6, 0, color)
            oval(18, 17, 3, 2, 0, dark)                          // a thumb print
            oval(11, 16, 2.5, 1.2, -0.4, 'rgba(255, 255, 255, 0.35)')
            break
        case 'wood':
        case 'ebony': {
            rect(6, 13, 18, 10, color)                           // the log
            rect(6, 13, 18, 2, light)
            circle(24, 18, 5, light)                             // the cut end, with rings
            ctx.strokeStyle = dark
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(24, 18, 3, 0, Math.PI * 2)
            ctx.stroke()
            circle(24, 18, 1, dark)
            break
        }
        case 'ivory':
            line([7, 25, 10, 15, 17, 9, 25, 8], dark, 6)
            line([7, 24, 10, 14, 17, 8, 25, 7], color, 4.5)
            break
        case 'iron-bar':
            shape([6, 24, 9, 15, 24, 15, 27, 24], color)
            shape([9, 15, 24, 15, 22, 13, 11, 13], light)
            rect(11, 19, 10, 1.5, 'rgba(255, 255, 255, 0.35)')
            break
        case 'gold-leaf':
            shape([6, 20, 18, 15, 26, 19, 14, 24], dark)
            shape([7, 16, 19, 11, 26, 15, 14, 20], color)
            line([10, 16, 18, 13], '#fff6c8', 1)
            break
        case 'incense':
            circle(12, 21, 4, color)
            circle(19, 22, 3.5, dark)
            circle(16, 17, 3.5, light)
            line([16, 12, 14, 8, 17, 5, 15, 2], 'rgba(220, 220, 220, 0.6)', 1.5)   // a wisp of smoke
            break

        // ---- treasures from other lands ----
        case 'scarab':
            line([9, 14, 23, 24], '#1c1410', 1.5)                // legs
            line([23, 14, 9, 24], '#1c1410', 1.5)
            line([8, 19, 24, 19], '#1c1410', 1.5)
            oval(16, 20, 6, 7, 0, color)
            circle(16, 11, 3.5, dark)
            line([16, 14, 16, 26], dark, 1)
            break
        case 'assyrian-sword':
            shape([9, 22, 22, 7, 25, 8, 11, 24], color)          // blade
            line([10, 21, 12, 23], '#fff', 1)
            line([6, 20, 13, 27], '#6b4226', 3)                  // guard
            line([8, 25, 5, 28], '#3a2a1a', 3)                   // grip
            break
        case 'persian-daric':
            coin(color)
            rect(14, 12, 2.5, 9, shade(color, -0.35))            // the archer king
            line([18, 12, 20, 17, 18, 22], shade(color, -0.35), 1.5)
            break
        case 'aksum-coin':
            coin(color)
            circle(16, 17, 2, shade(color, -0.35))               // the disc and crescent of early Aksum
            ctx.strokeStyle = shade(color, -0.35)
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(16, 15, 4.5, 0.2 * Math.PI, 0.8 * Math.PI)
            ctx.stroke()
            break
        case 'greek-amphora':
            oval(16, 17, 6, 8, 0, color)
            rect(14, 5, 4, 6, color)
            shape([13, 24, 19, 24, 17, 28, 15, 28], color)
            line([13, 7, 10, 10, 12, 13], color, 1.5)
            line([19, 7, 22, 10, 20, 13], color, 1.5)
            rect(10, 15, 12, 2, '#1c1410')
            break
        case 'augustus-head':
            rect(13, 21, 7, 6, dark)                             // neck
            circle(16, 15, 7.5, color)
            rect(9, 8, 14, 4, dark)                              // hair
            rect(19, 14, 2, 1.5, '#f3ead6')                      // eye
            break

        // ---- things from chests ----
        case 'cowrie':
            oval(16, 18, 9, 6, -0.3, shade(color, -0.12))
            oval(15, 17, 8, 5.5, -0.3, color)
            line([9, 21, 22, 14], '#8a6a4a', 1.5)
            break
        case 'faience-beads':
        case 'glass-beads':
            beads(color, light)
            break
        case 'ostrich-feathers':
            for (const [a, c] of [[-0.4, '#d8d0c0'], [0, color], [0.4, '#d8d0c0']] as [number, string][]) {
                ctx.save()
                ctx.translate(16, 26)
                ctx.rotate(a)
                oval(0, -10, 4, 10, 0, c)
                rect(-0.5, -18, 1, 18, '#8a8070')
                ctx.restore()
            }
            break
        case 'leopard-skin':
            shape([6, 12, 12, 9, 20, 9, 26, 12, 24, 20, 26, 26, 18, 24, 14, 24, 6, 26, 8, 20], color)
            for (const [sx, sy] of [[11, 14], [17, 13], [21, 17], [13, 19], [18, 21], [10, 22]]) circle(sx, sy, 1.5, '#3a2210')
            break
        case 'sorghum':
            line([16, 28, 16, 12], '#6b8a3a', 2)
            line([16, 20, 11, 16], '#7a9a4a', 1.5)
            for (let i = 0; i < 9; i++) circle(13 + (i % 3) * 3, 6 + Math.floor(i / 3) * 3, 1.8, i % 2 ? color : dark)
            break
        case 'dates':
            line([16, 6, 16, 11], '#6b8a3a', 1.5)
            for (const [sx, sy] of [[12, 15], [16, 13], [20, 15], [14, 20], [18, 20], [16, 25]]) oval(sx, sy, 2.5, 3.5, 0, (sx + sy) % 2 ? color : dark)
            break
        case 'copper-bracelet':
            ctx.strokeStyle = dark
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.ellipse(16, 19, 9, 5, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.strokeStyle = color
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.ellipse(16, 18, 9, 5, 0, 0, Math.PI * 2)
            ctx.stroke()
            break

        // ---- relics of Kush ----
        case 'kerma-beaker':
            shape([9, 7, 23, 7, 19, 26, 13, 26], color)          // red body
            shape([9, 7, 23, 7, 22, 12, 10, 12], '#1a110a')       // shiny black top
            line([11, 9, 13, 9], 'rgba(255, 255, 255, 0.5)', 1)
            break
        case 'taharqa-shabti':
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.roundRect(11, 5, 10, 22, [5, 5, 2, 2])
            ctx.fill()
            rect(12, 9, 8, 4, '#8a5a3b')                         // face
            rect(11, 15, 10, 1.5, dark)                          // crossed arms
            for (let i = 0; i < 3; i++) rect(13, 18 + i * 3, 6, 1, dark)   // a line of writing
            break
        case 'kandake-ring':
            ctx.strokeStyle = color
            ctx.lineWidth = 3.5
            ctx.beginPath()
            ctx.arc(16, 19, 7, 0, Math.PI * 2)
            ctx.stroke()
            circle(16, 11, 4, '#b02a3a')                         // the gem
            circle(15, 10, 1.2, '#ffb0b8')
            break
        case 'meroitic-tablet':
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.roundRect(8, 6, 16, 21, [8, 8, 1, 1])
            ctx.fill()
            for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rect(11 + c * 4, 11 + r * 4, (r + c) % 2 ? 2 : 3, 2, dark)
            break
        case 'lion-amulet':
            circle(16, 17, 9, dark)                              // mane
            circle(16, 18, 6, color)                             // face
            rect(13, 16, 2, 2, '#1c1410')
            rect(17, 16, 2, 2, '#1c1410')
            shape([15, 20, 17, 20, 16, 22], '#1c1410')
            line([16, 4, 16, 8], '#c9a227', 1.5)                 // the loop for the string
            break

        // ---- things you craft ----
        case 'gold-collar':
            for (const [r, c] of [[12, color], [9.5, '#3aa6c4'], [7, color]] as [number, string][]) {
                ctx.strokeStyle = c
                ctx.lineWidth = 2.5
                ctx.beginPath()
                ctx.arc(16, 8, r, 0.15 * Math.PI, 0.85 * Math.PI)
                ctx.stroke()
            }
            break
        case 'bead-necklace':
            beads(color, '#e8d4a2')
            oval(16, 24, 3, 4, 0, '#f1e3cf')                     // a cowrie shell in the middle
            break
        case 'copper-mirror':
            line([16, 18, 16, 28], '#6b4226', 3)
            circle(16, 12, 8, dark)
            circle(16, 12, 6.5, color)
            oval(13, 10, 2, 3, -0.5, 'rgba(255, 255, 255, 0.5)')
            break
        case 'iron-spear':
            line([6, 27, 21, 10], '#8a5a2b', 2.5)
            shape([19, 12, 26, 5, 23, 14], color)
            break
        case 'iron-hoe':
            line([8, 27, 20, 9], '#8a5a2b', 2.5)
            shape([18, 9, 27, 13, 25, 17, 19, 12], color)
            break
        case 'lion-statue':
            rect(6, 18, 20, 7, color)                            // body lying down
            circle(23, 15, 5, dark)                              // mane
            circle(24, 16, 3, color)                             // face
            rect(5, 15, 2, 6, dark)                              // tail
            rect(6, 25, 20, 2, dark)                             // base
            break
        case 'offering-table':
            block(7, 12, 16, 9, color)
            shape([13, 25, 17, 25, 16, 29, 14, 29], color)       // the spout
            ctx.strokeStyle = dark
            ctx.lineWidth = 1
            ctx.strokeRect(10, 15, 10, 6)
            break
        case 'feather-fan':
            line([16, 28, 16, 16], '#8a5a2b', 2)
            for (let i = -2; i <= 2; i++) {
                ctx.save()
                ctx.translate(16, 16)
                ctx.rotate(i * 0.38)
                oval(0, -7, 3, 7, 0, i % 2 ? '#d8d0c0' : color)
                ctx.restore()
            }
            break
        case 'leopard-cloak':
            shape([10, 7, 22, 7, 26, 26, 6, 26], color)
            rect(12, 6, 8, 2, '#6b4226')                         // the tie at the neck
            for (const [sx, sy] of [[11, 13], [17, 12], [21, 17], [13, 20], [19, 22], [9, 23]]) circle(sx, sy, 1.4, '#3a2210')
            break
        case 'sorghum-bread':
            oval(16, 19, 10, 6, 0, dark)
            oval(16, 17, 10, 6, 0, color)
            line([11, 15, 13, 19], dark, 1)
            line([15, 14, 17, 19], dark, 1)
            line([19, 15, 21, 19], dark, 1)
            break
        case 'date-cakes':
            for (let i = 0; i < 3; i++) {
                oval(16, 24 - i * 5, 9, 3.5, 0, dark)
                oval(16, 23 - i * 5, 9, 3.5, 0, color)
            }
            break
        case 'black-pot':
            circle(16, 19, 9, color)
            oval(16, 11, 7, 3, 0, '#1a110a')                     // the shiny black rim
            rect(9, 10, 14, 3, '#1a110a')
            oval(12, 17, 2, 3, -0.4, 'rgba(255, 255, 255, 0.25)')
            break

        case 'water-jar':
            circle(16, 19, 8, color)
            rect(12, 7, 8, 6, dark)
            rect(11, 6, 10, 2, light)
            oval(12, 17, 2, 3, -0.3, 'rgba(255, 255, 255, 0.3)')
            line([9, 23, 23, 23], dark, 1)
            break
        case 'faience-amulet':
            line([16, 4, 16, 9], '#c9a227', 1.5)
            oval(16, 17, 6, 8, 0, color)
            oval(14, 14, 2, 3, -0.3, 'rgba(255, 255, 255, 0.5)')
            rect(14, 15, 4, 6, dark)              // a little figure of a god
            circle(16, 13, 2, dark)
            break
        case 'archer-bow':
            ctx.strokeStyle = color
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.arc(8, 16, 13, -1.1, 1.1)
            ctx.stroke()
            line([13, 4, 13, 28], '#e8e0d0', 1)   // the string
            line([6, 16, 27, 16], '#6b4226', 1.5) // an arrow
            shape([27, 16, 23, 13, 23, 19], '#8a8f98')
            break
        default: {
            // anything else: a lumpy rock in the item's color
            shape([8, 24, 11, 15, 19, 12, 25, 19, 23, 25], color)
            rect(14, 16, 4, 2, 'rgba(255, 255, 255, 0.45)')
        }
    }
    ctx.restore()

    // twinkling sparkle so you notice it
    const s = (Math.sin(time / 200 + x * 0.3) + 1) / 2
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.6 * s})`
    diamond(ctx, x + 25, y + 8 + bob, 2 + s * 2)
}

// ---------------------------------------------------------------------------
// Full-screen screens (drawn on top of the world, after the camera is reset)
// ---------------------------------------------------------------------------

// One button in a menu
export interface MenuItem {
    id: string
    label: string
    detail?: string   // a smaller line under the label
}

// A menu button: gold when selected (by keyboard) or under the mouse
function drawMenuButton(ctx: CanvasRenderingContext2D, item: MenuItem, cx: number, y: number, bw: number, bh: number, selected: boolean) {
    const x = cx - bw / 2
    const on = selected || hovering(x, y, bw, bh)
    ctx.fillStyle = on ? '#e8c75a' : 'rgba(26, 17, 10, 0.88)'
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 10)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 17px ${FONT_TITLE}`
    ctx.fillStyle = on ? '#1a110a' : '#f3ead6'
    ctx.fillText(item.label, cx, item.detail ? y + bh / 2 - 9 : y + bh / 2)
    if (item.detail) {
        ctx.font = `600 15px ${FONT_BODY}`
        ctx.fillStyle = on ? '#4a3510' : '#c9b98a'
        ctx.fillText(item.detail, cx, y + bh / 2 + 12)
    }
    addButton(item.id, x, y, bw, bh)
}

// The main menu, drawn over the slowly moving world
export function drawTitleScreen(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, items: MenuItem[], selected: number) {
    ctx.save()
    // darken the world, more at the edges
    ctx.fillStyle = 'rgba(14, 9, 5, 0.62)'
    ctx.fillRect(0, 0, w, h)
    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75)
    vignette.addColorStop(0, 'rgba(14, 9, 5, 0)')
    vignette.addColorStop(1, 'rgba(14, 9, 5, 0.85)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, w, h)

    // gold dust drifting up
    for (let i = 0; i < 40; i++) {
        const sx = ((i * 197.3 + time * 0.012 * (1 + (i % 3))) % (w + 40)) - 20
        const sy = h - ((i * 131.7 + time * 0.02 * (1 + (i % 4))) % (h + 40)) + 20
        ctx.fillStyle = `rgba(246, 220, 130, ${0.15 + (i % 5) * 0.08})`
        ctx.fillRect(sx, sy, 2 + (i % 2), 2 + (i % 2))
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cx = w / 2
    const size = Math.max(30, Math.min(84, w * 0.07))
    const ty = Math.max(size + 20, h * 0.24)

    // the title, with a shadow and a gold gradient
    const title = 'THE RISE OF MEROË'
    ctx.font = `700 ${size}px ${FONT_TITLE}`
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillText(title, cx + 3, ty + 3)
    const grad = ctx.createLinearGradient(0, ty - size * 0.5, 0, ty + size * 0.5)
    grad.addColorStop(0, '#f6dc82')
    grad.addColorStop(1, '#b8901f')
    ctx.fillStyle = grad
    ctx.fillText(title, cx, ty)

    // ornament: a line, a diamond, a line
    const oy = ty + size * 0.62
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 200, oy)
    ctx.lineTo(cx - 16, oy)
    ctx.moveTo(cx + 16, oy)
    ctx.lineTo(cx + 200, oy)
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    diamond(ctx, cx, oy, 7 + Math.sin(time / 400) * 1.5)

    ctx.font = `600 ${Math.max(18, size * 0.3)}px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    ctx.fillText('Rebuild Meroë, the capital of Kush :)', cx, oy + 30)

    // the menu
    const bw = Math.min(380, w - 40)
    let y = oy + 66
    items.forEach((item, i) => {
        const bh = item.detail ? 60 : 48
        drawMenuButton(ctx, item, cx, y, bw, bh, i === selected)
        y += bh + 12
    })

    ctx.font = `600 15px ${FONT_BODY}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('UP / DOWN and ENTER, or click', cx, h - 52)
    ctx.fillText('Ancient Empires Project about Ancient Kush, by Kieran Provost :)', cx, h - 28)
    ctx.restore()
}

// The pause menu (Esc while playing)
export function drawPauseMenu(ctx: CanvasRenderingContext2D, w: number, h: number, items: MenuItem[], selected: number, savedText: string, title = 'PAUSED') {
    ctx.save()
    const pw = Math.min(500, w - 40)
    const heightOf = (item: MenuItem) => (item.detail ? 58 : 48)
    const ph = 130 + items.reduce((t, item) => t + heightOf(item) + 12, 0) - 12
    const { py } = drawCenterPanel(ctx, w, h, pw, ph, title)
    addButton('panel', (w - pw) / 2, py, pw, ph)
    let by = py + 70
    items.forEach((item, i) => {
        drawMenuButton(ctx, item, w / 2, by, pw - 80, heightOf(item), i === selected)
        by += heightOf(item) + 12
    })
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 15px ${FONT_BODY}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText(savedText, w / 2, py + ph - 26)
    ctx.restore()
}

// A gold-bordered panel in the middle of the screen (used by the How to Play and ending screens)
function drawCenterPanel(ctx: CanvasRenderingContext2D, w: number, h: number, pw: number, ph: number, title: string) {
    ctx.fillStyle = 'rgba(14, 9, 5, 0.88)'
    ctx.fillRect(0, 0, w, h)
    const px = (w - pw) / 2
    const py = (h - ph) / 2
    ctx.fillStyle = 'rgba(26, 17, 10, 0.97)'
    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, 10)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
        diamond(ctx, cx, cy, 6)
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 24px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText(title, w / 2, py + 38)
    return { px, py }
}

// The How to Play pages: each tab is a list of rows. A row with a key is drawn as "KEY   what it does";
// a row with an empty key is a plain paragraph.
const HOWTO_TABS: { name: string; rows: [string, string][] }[] = [
    {
        name: 'CONTROLS',
        rows: [
            ['WASD / ARROWS', 'Walk around. Hold SHIFT to run (it uses stamina, shown above the hotbar).'],
            ['E', 'Use whatever is closest: talk, pick up, open a chest, use a workshop or a building plot.'],
            ['I', 'Inventory. Click to pick up and put down, right-click for half or one, shift-click to move a stack.'],
            ['Q', 'Drop one item (from your hotbar, or the one under the mouse in the inventory).'],
            ['1 - 9 / WHEEL', 'Choose a hotbar slot.'],
            ['M', 'The World Map. Click it to set a waypoint: gold arrows on the ground lead you there.'],
            ['C', 'The Codex, with pages about Kush and the lands around it.'],
            ['ESC', 'Close a window, or open the pause menu (with Settings and Save).'],
        ],
    },
    {
        name: 'GOAL',
        rows: [
            ['', 'You are a traveler in the Kingdom of Kush, in what is now Sudan. Its capital, Meroë, was once one of the great cities of Africa, famous for its pyramids, its temples and its iron.'],
            ['', 'Your job is to build the capital back up. On the big paved plaza east of the village are 7 building plots, marked with gold outlines.'],
            ['', 'Gather materials, turn them into building parts at the workshops, and raise all 7 buildings. The gold diamonds in the top-right corner show how many are done.'],
            ['', 'When the last building goes up, the capital is complete and you win. Along the way, the villagers and the Codex teach you the real history of Kush.'],
        ],
    },
    {
        name: 'GATHER & CRAFT',
        rows: [
            ['MATERIALS', 'Things to gather lie on the ground all over the land. Walk up to one and press E.'],
            ['WHERE', 'Sandstone near the pyramids of Meroë, iron ore by the slag heaps west of the village, wood around Napata, clay around Kerma, gold around Napata, granite and incense in Aksum, ivory on the Red Sea coast.'],
            ['STONEWORKS', '1 sandstone makes 2 cut sandstone.'],
            ['BRICKYARD', '1 clay makes 2 mud bricks.'],
            ['GOLDSMITH', '1 gold nugget makes 2 gold leaf.'],
            ['FURNACE', 'Put iron ore in the top slot and wood in the bottom slot. Wait for the arrow to fill, then take the iron bar.'],
            ['KILN', 'Bread, cakes and pottery. Nice to have, but not needed for the buildings.'],
        ],
    },
    {
        name: 'BUILD',
        rows: [
            ['', 'Walk up to a gold outline on the plaza and press E. A window shows what the building needs, and how much of it you have.'],
            ['', 'When every line is green, click BUILD. The building rises from the ground, and you learn a fact about the real one.'],
            ['TIP', 'Recipes marked FOR THE CAPITAL in a workshop make parts the buildings need. Start with the Hafir (only cut sandstone) and the houses (only mud bricks).'],
            ['TIP', 'Iron bars for the Ironworks come from the furnace. Gold leaf for the Temple and the Royal Enclosure comes from the goldsmith.'],
        ],
    },
    {
        name: 'QUESTS & CODEX',
        rows: [
            ['!', 'A villager with a gold ! has a quest for you. Press E to talk.'],
            ['?', 'A gold ? means you have what they asked for. Talk to them to hand it in.'],
            ['REWARDS', 'Every quest gives you building materials, so quests help you build the capital faster.'],
            ['CHESTS', 'Chests are hidden all over the land. Some hold relics that unlock pages in the Codex.'],
            ['CODEX', 'Press C. One tab is about Kush itself, the other about the lands around it: Egypt, Assyria, Persia, Greece, Rome and Aksum.'],
            ['MAP', 'Press M. Gold diamonds show where your quests lead.'],
        ],
    },
]
export const HOWTO_TAB_COUNT = HOWTO_TABS.length

// The How to Play screen, with tabs
export function drawHowToPlay(ctx: CanvasRenderingContext2D, w: number, h: number, tab: number) {
    ctx.save()
    const pw = Math.min(820, w - 40)
    const ph = Math.min(560, h - 40)
    const { px, py } = drawCenterPanel(ctx, w, h, pw, ph, 'HOW TO PLAY')
    addButton('panel', px, py, pw, ph)

    // the tabs
    const tw = (pw - 48) / HOWTO_TABS.length
    HOWTO_TABS.forEach((t, i) => {
        const tx = px + 24 + i * tw
        const ty = py + 62
        const on = i === tab
        ctx.fillStyle = on ? '#e8c75a' : hovering(tx + 2, ty, tw - 4, 30) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)'
        ctx.beginPath()
        ctx.roundRect(tx + 2, ty, tw - 4, 30, 15)
        ctx.fill()
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `700 ${tw < 140 ? 10 : 12}px ${FONT_TITLE}`
        ctx.fillStyle = on ? '#1a110a' : '#e8c75a'
        ctx.fillText(t.name, tx + tw / 2, ty + 15)
        addButton('howto-tab-' + i, tx + 2, ty, tw - 4, 30)
    })

    // the page
    const rows = HOWTO_TABS[tab].rows
    const keyW = rows.some(r => r[0]) ? 150 : 0
    const textX = px + 32 + keyW
    const textW = pw - 64 - keyW
    let y = py + 122
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    for (const [key, text] of rows) {
        ctx.font = `600 18px ${FONT_BODY}`
        const lines = wrapText(ctx, text, key ? textW : pw - 64)
        if (key) {
            ctx.font = `700 13px ${FONT_TITLE}`
            ctx.fillStyle = '#e8c75a'
            ctx.fillText(key, px + 32, y)
        }
        ctx.font = `600 18px ${FONT_BODY}`
        ctx.fillStyle = '#f3ead6'
        lines.forEach((l, i) => ctx.fillText(l, key ? textX : px + 32, y + i * 22))
        y += lines.length * 22 + (key ? 12 : 16)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('LEFT / RIGHT: CHANGE TAB', w / 2, py + ph - 72)
    drawPillButton(ctx, 'howto-continue', 'CONTINUE  (OR PRESS ENTER)', w / 2, py + ph - 38, 320, 44)
    ctx.restore()
}

// The ending screen (shown when every quest is done)
export function drawEnding(ctx: CanvasRenderingContext2D, w: number, h: number, name: string, stats: string[], time: number) {
    ctx.save()
    const pw = Math.min(720, w - 40)
    const ph = Math.min(520, h - 40)
    const { py } = drawCenterPanel(ctx, w, h, pw, ph, 'THE RISE OF MEROË')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 13px ${FONT_TITLE}`
    ctx.fillStyle = '#f6dc82'
    ctx.fillText('YOU ARE NOW: BUILDER OF MEROË', w / 2, py + 66)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 22px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    const story = `Well done, ${name}! You gathered, crafted and built until the great city of Meroë stood again, with its temple, its pyramids, its ironworks and the palace of the Kandake. For hundreds of years it was the capital of a rich and powerful kingdom, and its pyramids, iron and gold are still remembered today.`
    const lines = wrapText(ctx, story, pw - 80)
    lines.forEach((l, i) => ctx.fillText(l, w / 2, py + 104 + i * 28))

    ctx.font = `700 13px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    // the stats in two columns
    stats.forEach((s, i) => ctx.fillText(s.toUpperCase(), w / 2 + (i % 2 ? 130 : -130), py + 104 + lines.length * 28 + 30 + Math.floor(i / 2) * 24))

    diamond(ctx, w / 2, py + ph - 88, 6 + Math.sin(time / 400) * 1.5)
    drawPillButton(ctx, 'ending-continue', 'KEEP EXPLORING', w / 2, py + ph - 42, 280, 44)
    ctx.restore()
}

// The stamina bar above the hotbar (only drawn while it is not full)
export function drawStamina(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, tired: boolean) {
    const bw = 180
    const x = (w - bw) / 2
    const y = h - 98
    ctx.save()
    ctx.fillStyle = 'rgba(26, 17, 10, 0.85)'
    ctx.beginPath()
    ctx.roundRect(x - 2, y - 2, bw + 4, 10, 4)
    ctx.fill()
    ctx.fillStyle = tired ? '#b5543a' : '#e8c75a'
    ctx.beginPath()
    ctx.roundRect(x, y, Math.max(1, bw * amount), 6, 3)
    ctx.fill()
    ctx.restore()
}

// One line in the character designer.
export interface DesignerRow {
    label: string
    text: string
    swatch?: string   // a color circle to show next to the text
}

export function drawDesigner(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rows: DesignerRow[],
    selected: number,
    look: PersonLook,
    time: number,
) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.88)'
    ctx.fillRect(0, 0, w, h)

    const pw = Math.min(780, w - 40)
    const ph = Math.min(540, h - 40)
    const px = (w - pw) / 2
    const py = (h - ph) / 2

    // panel
    ctx.fillStyle = 'rgba(26, 17, 10, 0.97)'
    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, 10)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
        diamond(ctx, cx, cy, 6)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 24px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('CREATE YOUR TRAVELER', w / 2, py + 38)

    // the preview: a big character that slowly turns around
    const scale = Math.max(3, Math.min(6, ph / 75))
    const pvx = px + pw * 0.26
    const pvy = py + ph * 0.8
    ctx.fillStyle = 'rgba(201, 162, 39, 0.18)'
    ctx.beginPath()
    ctx.ellipse(pvx, pvy + 4, 12 * scale, 2.5 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    // (never the back view here: from behind the whole head is hair, which looks like a black flash)
    const faces: Facing[] = ['down', 'right', 'down', 'left']
    ctx.save()
    ctx.scale(scale, scale)
    drawPerson(ctx, pvx / scale - 10, pvy / scale - 20, 20, look, faces[Math.floor(time / 1500) % 4], true, time)
    ctx.restore()

    // the options: click a row to pick it, click the arrows to change it (or use the keyboard)
    const rx = px + pw * 0.5
    const rw = pw * 0.46
    const rowH = Math.min(52, (ph - 150) / rows.length)
    rows.forEach((row, i) => {
        const ry = py + 78 + i * rowH
        const rh = rowH - 8
        const on = i === selected
        ctx.fillStyle = on ? 'rgba(201, 162, 39, 0.16)' : hovering(rx, ry, rw, rh) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.04)'
        ctx.beginPath()
        ctx.roundRect(rx, ry, rw, rh, 6)
        ctx.fill()
        ctx.strokeStyle = on ? '#e8c75a' : 'rgba(201, 162, 39, 0.35)'
        ctx.lineWidth = on ? 2 : 1
        ctx.stroke()
        addButton('designer-row-' + i, rx, ry, rw, rh)   // (the arrows are added after this, so they win)

        const mid = ry + rh / 2
        ctx.textAlign = 'left'
        ctx.font = `700 12px ${FONT_TITLE}`
        ctx.fillStyle = '#e8c75a'
        ctx.fillText(row.label.toUpperCase(), rx + 14, mid)

        // the value, between two arrows (the Name row has none: you type there instead)
        const hasArrows = i > 0
        const textX = hasArrows ? rx + rw - 100 : rx + rw - 16
        ctx.textAlign = hasArrows ? 'center' : 'right'
        ctx.font = `600 20px ${FONT_BODY}`
        ctx.fillStyle = '#f3ead6'
        ctx.fillText(row.text, textX, mid)
        if (row.swatch) {
            const tw = ctx.measureText(row.text).width
            ctx.fillStyle = row.swatch
            ctx.beginPath()
            ctx.arc(textX - (hasArrows ? tw / 2 : tw) - 16, mid, 8, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
            ctx.lineWidth = 1
            ctx.stroke()
        }
        if (hasArrows) {
            for (const dir of [-1, 1]) {
                const ax = dir < 0 ? rx + rw - 180 : rx + rw - 20
                ctx.fillStyle = hovering(ax - 14, ry, 28, rh) ? '#fff3b0' : '#e8c75a'
                ctx.beginPath()
                ctx.moveTo(ax - dir * 6, mid - 7)
                ctx.lineTo(ax - dir * 6, mid + 7)
                ctx.lineTo(ax + dir * 6, mid)
                ctx.closePath()
                ctx.fill()
                addButton('designer-' + (dir < 0 ? 'left-' : 'right-') + i, ax - 14, ry, 28, rh)
            }
        }
    })

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('CLICK THE ARROWS, OR USE THE ARROW KEYS      TYPE YOUR NAME ON THE FIRST ROW', w / 2, py + ph - 72)
    drawPillButton(ctx, 'designer-begin', 'BEGIN YOUR JOURNEY', w / 2, py + ph - 40, 280, 42)
    ctx.restore()
}

// ---------------------------------------------------------------------------
// Mouse support: every clickable thing registers itself while it is being drawn
// ---------------------------------------------------------------------------

// Where the mouse is (main.ts keeps this up to date)
export const pointer = { x: -1, y: -1 }

// A clickable rectangle. The id says what it is, like 'close' or 'slot:hotbar:3'.
interface Button {
    id: string
    x: number
    y: number
    w: number
    h: number
}
const buttons: Button[] = []

// Forget all the buttons (main.ts calls this at the start of every frame)
export function clearButtons() {
    buttons.length = 0
}

// Make a rectangle clickable (call this while drawing the thing)
export function addButton(id: string, x: number, y: number, w: number, h: number) {
    buttons.push({ id, x, y, w, h })
}

// Which button is under (x, y)? The one drawn last is on top.
export function buttonAt(x: number, y: number): string | null {
    for (let i = buttons.length - 1; i >= 0; i--) {
        const b = buttons[i]
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.id
    }
    return null
}

// Is the mouse over this rectangle?
function hovering(x: number, y: number, w: number, h: number): boolean {
    return pointer.x >= x && pointer.x < x + w && pointer.y >= y && pointer.y < y + h
}

// A little "X" in the top-right corner of a window
function drawCloseButton(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number) {
    const s = 26
    const x = px + pw - s - 12
    const y = py + 10
    const on = hovering(x, y, s, s)
    ctx.fillStyle = on ? 'rgba(201, 162, 39, 0.35)' : 'rgba(255, 255, 255, 0.06)'
    ctx.beginPath()
    ctx.roundRect(x, y, s, s, 5)
    ctx.fill()
    ctx.strokeStyle = on ? '#e8c75a' : 'rgba(201, 162, 39, 0.6)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.strokeStyle = '#e8c75a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 8)
    ctx.lineTo(x + s - 8, y + s - 8)
    ctx.moveTo(x + s - 8, y + 8)
    ctx.lineTo(x + 8, y + s - 8)
    ctx.stroke()
    addButton('close', x, y, s, s)
}

// A gold button with a label. (cx, cy) is its middle.
function drawPillButton(ctx: CanvasRenderingContext2D, id: string, label: string, cx: number, cy: number, w: number, h: number) {
    const x = cx - w / 2
    const y = cy - h / 2
    const on = hovering(x, y, w, h)
    const grad = ctx.createLinearGradient(0, y, 0, y + h)
    grad.addColorStop(0, on ? '#f6dc82' : '#e8c75a')
    grad.addColorStop(1, on ? '#d4a82a' : '#b8901f')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, h / 2)
    ctx.fill()
    ctx.strokeStyle = '#6e4d0f'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#2a1a08'
    ctx.font = `700 15px ${FONT_TITLE}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy + 1)
    addButton(id, x, y, w, h)
}

// ---------------------------------------------------------------------------
// Inventory, chest and hotbar (Minecraft-style slots that you work with the mouse)
// ---------------------------------------------------------------------------

// What a slot needs to be drawn: the item's look, and how many there are.
export interface Slot {
    id: string
    name: string
    color: string
    count: number
    fact: string
}

export const HOTBAR_SLOTS = 9                      // slots 0-8 of the inventory are the hotbar
export const MAIN_SLOTS = 27                       // the 3 big rows of the inventory
export const PACK_SIZE = HOTBAR_SLOTS + MAIN_SLOTS // 36 slots in all
export const CHEST_SIZE = 27                       // a chest has 3 rows of slots
const SLOT_COLS = 9

// Where one slot is on the screen
interface SlotRect {
    x: number
    y: number
    size: number
}

// Where everything in the inventory window or the chest window goes
export interface WindowLayout {
    px: number      // the panel
    py: number
    pw: number
    ph: number
    size: number    // how big each slot is
    chest: SlotRect[]    // empty unless the chest window is open
    main: SlotRect[]     // main[i] is inventory slot 9 + i
    hotbar: SlotRect[]   // hotbar[i] is inventory slot i
    box: { x: number; y: number; w: number; h: number }   // the box for your character (inventory window only)
}

// Work out the layout. The same numbers are used for drawing and for clicking.
export function windowLayout(w: number, h: number, withChest: boolean): WindowLayout {
    const gap = 4
    const margin = 24
    const leftW = withChest ? 0 : 230
    const sideSpace = margin * 2 + (withChest ? 0 : leftW + margin)
    const maxW = withChest ? 640 : 920

    // how tall the panel is for a given slot size
    const heightFor = (s: number) => 60 + (withChest ? 3 * s + 2 * gap + 34 : 0) + 3 * s + 2 * gap + 14 + s + 40
    let size = Math.min(52, Math.floor((Math.min(maxW, w - 40) - sideSpace - (SLOT_COLS - 1) * gap) / SLOT_COLS))
    while (size > 30 && heightFor(size) > h - 30) size--
    size = Math.max(30, size)

    const gridW = SLOT_COLS * size + (SLOT_COLS - 1) * gap
    const pw = sideSpace + gridW
    const ph = heightFor(size)
    const px = Math.round((w - pw) / 2)
    const py = Math.round((h - ph) / 2)
    const gx = px + margin + (withChest ? 0 : leftW + margin)
    const top = py + 60

    const rect = (index: number, y0: number): SlotRect => ({
        x: gx + (index % SLOT_COLS) * (size + gap),
        y: y0 + Math.floor(index / SLOT_COLS) * (size + gap),
        size,
    })
    const chest: SlotRect[] = []
    if (withChest) for (let i = 0; i < CHEST_SIZE; i++) chest.push(rect(i, top))
    const mainTop = top + (withChest ? 3 * size + 2 * gap + 34 : 0)
    const main: SlotRect[] = []
    for (let i = 0; i < MAIN_SLOTS; i++) main.push(rect(i, mainTop))
    const hotbarTop = mainTop + 3 * size + 2 * gap + 14
    const hotbar: SlotRect[] = []
    for (let i = 0; i < HOTBAR_SLOTS; i++) hotbar.push(rect(i, hotbarTop))

    return { px, py, pw, ph, size, chest, main, hotbar, box: { x: px + margin, y: top, w: leftW, h: hotbarTop + size - top } }
}

// One square slot with a bevelled edge, like a Minecraft inventory.
function drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, slot: Slot | null, hover: boolean) {
    ctx.fillStyle = '#2b2118'
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#120d08'   // dark top and left edge: the slot looks sunk in
    ctx.fillRect(x, y, size, 3)
    ctx.fillRect(x, y, 3, size)
    ctx.fillStyle = '#5a4733'   // light bottom and right edge
    ctx.fillRect(x, y + size - 3, size, 3)
    ctx.fillRect(x + size - 3, y, 3, size)

    if (slot) {
        // (passing -ix * 300 as the time cancels the bobbing, so items sit still in their slots)
        const ix = x + (size - TILE) / 2
        drawItem(ctx, ix, y + (size - TILE) / 2, slot.color, -ix * 300, slot.id)
        if (slot.count > 1) {
            ctx.font = `700 14px ${FONT_TITLE}`
            ctx.textAlign = 'right'
            ctx.textBaseline = 'alphabetic'
            ctx.fillStyle = '#000'
            ctx.fillText(String(slot.count), x + size - 3, y + size - 4)
            ctx.fillStyle = '#fff'
            ctx.fillText(String(slot.count), x + size - 4, y + size - 5)
        }
    }
    if (hover) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(x + 3, y + 3, size - 6, size - 6)
    }
}

// Draw a slot and make it clickable
function drawClickableSlot(ctx: CanvasRenderingContext2D, r: SlotRect, slot: Slot | null, id: string) {
    drawSlot(ctx, r.x, r.y, r.size, slot, hovering(r.x, r.y, r.size, r.size))
    addButton(id, r.x, r.y, r.size, r.size)
}

// The dark panel with a gold border that every window sits on
function drawPanel(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
    ctx.fillStyle = 'rgba(26, 17, 10, 0.97)'
    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, 10)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    for (const [cx, cy] of [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]]) {
        diamond(ctx, cx, cy, 6)
    }
    addButton('panel', px, py, pw, ph)   // clicking the panel does nothing, but clicking outside it drops what you carry
}

// The inventory window: your character on the left, your slots on the right.
export function drawInventory(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    layout: WindowLayout,
    pack: (Slot | null)[],
    look: PersonLook,
    name: string,
    stats: string[],
    time: number,
) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.75)'
    ctx.fillRect(0, 0, w, h)
    const { px, py, pw, ph } = layout
    drawPanel(ctx, px, py, pw, ph)
    drawCloseButton(ctx, px, py, pw)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 22px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('INVENTORY', w / 2, py + 34)

    // your character
    const b = layout.box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.beginPath()
    ctx.roundRect(b.x, b.y, b.w, b.h, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
    // the character shrinks a little when the box is short, so the stats below always fit
    const scale = Math.max(1.8, Math.min(4, (b.h - 64 - stats.length * 17) / 31))
    const feetY = b.y + 12 + 31 * scale
    ctx.fillStyle = 'rgba(201, 162, 39, 0.18)'
    ctx.beginPath()
    ctx.ellipse(b.x + b.w / 2, feetY + 2, 12 * scale, 2.5 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.scale(scale, scale)
    drawPerson(ctx, (b.x + b.w / 2) / scale - 10, feetY / scale - 20, 20, look, 'down', false, time)
    ctx.restore()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 14px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText(name.toUpperCase(), b.x + b.w / 2, feetY + 22)
    ctx.font = `600 15px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    const lineH = Math.max(13, Math.min(17, (b.y + b.h - 8 - (feetY + 44)) / Math.max(1, stats.length - 1)))
    stats.forEach((line, i) => ctx.fillText(line, b.x + b.w / 2, feetY + 44 + i * lineH))

    // the slots: the 3 big rows, then the hotbar below them
    layout.main.forEach((r, i) => drawClickableSlot(ctx, r, pack[HOTBAR_SLOTS + i], 'slot:main:' + i))
    layout.hotbar.forEach((r, i) => drawClickableSlot(ctx, r, pack[i], 'slot:hotbar:' + i))

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('CLICK: PICK UP / PUT DOWN      RIGHT CLICK: HALF / ONE      SHIFT CLICK: MOVE      Q: DROP', w / 2, py + ph - 18)
    ctx.restore()
}

// The chest window: the chest's slots on top, your own slots below.
export function drawChestScreen(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    layout: WindowLayout,
    chest: (Slot | null)[],
    pack: (Slot | null)[],
) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.75)'
    ctx.fillRect(0, 0, w, h)
    const { px, py, pw, ph } = layout
    drawPanel(ctx, px, py, pw, ph)
    drawCloseButton(ctx, px, py, pw)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 20px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('TREASURE CHEST', w / 2, py + 32)

    layout.chest.forEach((r, i) => drawClickableSlot(ctx, r, chest[i], 'slot:chest:' + i))

    const first = layout.main[0]
    ctx.textAlign = 'left'
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('YOUR INVENTORY', first.x, first.y - 16)
    layout.main.forEach((r, i) => drawClickableSlot(ctx, r, pack[HOTBAR_SLOTS + i], 'slot:main:' + i))
    layout.hotbar.forEach((r, i) => drawClickableSlot(ctx, r, pack[i], 'slot:hotbar:' + i))

    ctx.textAlign = 'center'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('CLICK: PICK UP / PUT DOWN      SHIFT CLICK: MOVE ACROSS      E OR ESC: CLOSE', w / 2, py + ph - 18)
    ctx.restore()
}

// --- Animals ---------------------------------------------------------------
// Draws an animal. (x, y) is its 20x20 box, like a person's; the feet stand on the bottom of the box.
export function drawAnimal(ctx: CanvasRenderingContext2D, x: number, y: number, kind: string, facing: Facing, moving: boolean, time: number) {
    ctx.save()
    ctx.translate(x + 10, y + 20)   // origin = the middle of the feet
    // shadow
    const big = kind === 'elephant' ? 1.6 : 1
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(0, 0, 12 * big, 3.5 * big, 0, 0, Math.PI * 2)
    ctx.fill()
    if (facing === 'left') ctx.scale(-1, 1)   // every animal is drawn facing right, and flipped for left
    const step = moving ? Math.sin(time / 90) * 2 : 0
    const legs = (color: string, xs: number[], top: number, len: number, wid: number) => {
        ctx.fillStyle = color
        xs.forEach((lx, i) => ctx.fillRect(lx, top + (i % 2 === 0 ? step : -step) * 0.5, wid, len))
    }

    if (kind === 'cattle') {
        legs('#5a3a24', [-9, -5, 4, 8], -8, 8, 3)
        ctx.fillStyle = '#8a5a3b'
        ctx.fillRect(-11, -16, 22, 10)                 // body
        ctx.fillStyle = '#f1e6d2'
        ctx.fillRect(-4, -15, 7, 6)                    // white patch
        ctx.fillStyle = '#8a5a3b'
        ctx.fillRect(9, -19, 7, 7)                     // head
        ctx.fillStyle = '#efe6cf'                      // long curved horns, like the cattle painted at Kerma
        ctx.beginPath()
        ctx.moveTo(10, -19)
        ctx.quadraticCurveTo(6, -27, 9, -29)
        ctx.lineTo(11, -28)
        ctx.quadraticCurveTo(9, -25, 12, -19)
        ctx.moveTo(14, -19)
        ctx.quadraticCurveTo(19, -27, 16, -29)
        ctx.lineTo(18, -28)
        ctx.quadraticCurveTo(20, -24, 16, -19)
        ctx.fill()
        ctx.fillStyle = '#1c1410'
        ctx.fillRect(13, -17, 1.5, 1.5)
        ctx.fillStyle = '#5a3a24'
        ctx.fillRect(-13, -15, 2, 7)                   // tail
    } else if (kind === 'ostrich') {
        legs('#c99a8a', [-3, 2], -10, 10, 2)
        ctx.fillStyle = '#1c1410'
        ctx.beginPath()
        ctx.ellipse(0, -14, 9, 6, 0, 0, Math.PI * 2)   // round black body
        ctx.fill()
        ctx.fillStyle = '#f1ece0'
        ctx.fillRect(-10, -16, 4, 4)                   // white tail feathers
        ctx.fillStyle = '#c9a59a'
        ctx.fillRect(5, -30, 2.5, 15)                  // long neck
        ctx.fillRect(5, -32, 6, 4)                     // head
        ctx.fillStyle = '#e0a060'
        ctx.fillRect(11, -31, 3, 2)                    // beak
    } else if (kind === 'gazelle') {
        legs('#8a5f3a', [-7, -4, 4, 7], -8, 8, 1.5)
        ctx.fillStyle = '#c8934e'
        ctx.fillRect(-9, -15, 18, 7)                   // body
        ctx.fillStyle = '#f3ead6'
        ctx.fillRect(-8, -10, 16, 2)                   // white belly
        ctx.fillStyle = '#c8934e'
        ctx.fillRect(7, -21, 3, 8)                     // neck
        ctx.fillRect(7, -23, 7, 4)                     // head
        ctx.fillStyle = '#2b1a10'
        ctx.fillRect(8, -29, 1.5, 6)                   // horns
        ctx.fillRect(10.5, -29, 1.5, 6)
    } else if (kind === 'elephant') {
        legs('#6f6a66', [-14, -8, 6, 12], -10, 10, 5)
        ctx.fillStyle = '#8a8580'
        ctx.beginPath()
        ctx.roundRect(-17, -30, 32, 22, 8)             // big body
        ctx.fill()
        ctx.beginPath()
        ctx.roundRect(11, -33, 12, 14, 5)              // head
        ctx.fill()
        ctx.fillStyle = '#77726d'
        ctx.beginPath()
        ctx.ellipse(10, -25, 6, 9, 0, 0, Math.PI * 2)  // big ear
        ctx.fill()
        ctx.fillStyle = '#8a8580'
        ctx.fillRect(20, -22, 4, 15 + step * 0.5)      // trunk
        ctx.fillStyle = '#f3ead6'
        ctx.fillRect(19, -21, 5, 2)                    // tusk
        ctx.fillStyle = '#1c1410'
        ctx.fillRect(17, -29, 2, 2)
    } else {
        // giraffe
        legs('#c8963e', [-7, -3, 4, 8], -12, 12, 2)
        ctx.fillStyle = '#e0b050'
        ctx.fillRect(-9, -20, 19, 9)                   // body
        ctx.save()
        ctx.translate(8, -20)
        ctx.rotate(-0.25)
        ctx.fillRect(0, -20, 4, 21)                    // long neck
        ctx.restore()
        ctx.fillStyle = '#e0b050'
        ctx.fillRect(10, -42, 8, 5)                    // head
        ctx.fillStyle = '#8a5a2b'                      // spots
        for (const [sx, sy] of [[-6, -18], [-1, -15], [4, -19], [7, -14], [11, -28], [12, -34]]) ctx.fillRect(sx, sy, 3, 3)
        ctx.fillRect(11, -45, 1.5, 3)                  // little horns
        ctx.fillRect(14, -45, 1.5, 3)
        ctx.fillStyle = '#1c1410'
        ctx.fillRect(15, -41, 1.5, 1.5)
    }
    ctx.restore()
}

// --- Codex pictures --------------------------------------------------------
// A small painted scene for each Codex page. `locked` hides it behind a dark "?".
export function drawCodexPicture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, id: string, locked: boolean, time: number) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 6)
    ctx.clip()
    ctx.translate(x, y)

    // every picture is drawn on a 230 x 166 canvas and scaled to fit
    const s = Math.min(w / 230, h / 166)
    ctx.scale(s, s)
    const W = 230
    const H = 166
    const GROUND = 118   // where the land meets the sky

    const rect = (rx: number, ry: number, rw: number, rh: number, c: string) => {
        ctx.fillStyle = c
        ctx.fillRect(rx, ry, rw, rh)
    }
    const poly = (pts: number[], c: string) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
        ctx.closePath()
        ctx.fill()
    }
    const circle = (cx: number, cy: number, r: number, c: string) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
    }
    const outline = (c = 'rgba(40, 24, 10, 0.55)', width = 1.5) => {
        ctx.strokeStyle = c
        ctx.lineWidth = width
        ctx.stroke()
    }
    const palm = (px: number, py: number, tall: number) => {
        ctx.strokeStyle = '#7a5230'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.quadraticCurveTo(px + 4, py - tall / 2, px + 2, py - tall)
        ctx.stroke()
        for (let i = 0; i < 6; i++) {
            ctx.save()
            ctx.translate(px + 2, py - tall)
            ctx.rotate(-2.6 + i * 0.85 + Math.sin(time / 900 + i) * 0.05)
            ctx.fillStyle = i % 2 ? '#3f6b26' : '#5a8a32'
            ctx.beginPath()
            ctx.ellipse(11, 0, 12, 3, 0.25, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    }
    // a steep Kushite pyramid with stepped courses, lit from the left
    const pyramid = (cx: number, base: number, half: number, tall: number) => {
        poly([cx - half, base, cx, base - tall, cx + half, base], '#e2c48c')
        poly([cx, base - tall, cx + half, base, cx + half * 0.1, base], '#b38a52')
        ctx.fillStyle = 'rgba(120, 85, 40, 0.3)'
        for (let k = 1; k < 9; k++) {
            const yy = base - (tall * k) / 9
            const hw = half * (1 - k / 9)
            ctx.fillRect(cx - hw, yy, hw * 2, 1)
        }
        // the chapel at the front
        rect(cx - half * 0.35, base - 14, half * 0.7, 14, '#c9a46a')
        rect(cx - 3, base - 10, 6, 10, '#4a3218')
    }

    // ---- the background: sky, sun, far dunes, near ground ----
    const night = id === 'apedemak' || id === 'script'   // a couple of pictures are inside temples: warmer and darker
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND)
    sky.addColorStop(0, night ? '#6b3a22' : '#f0b46a')
    sky.addColorStop(1, night ? '#c07a42' : '#fbe4b0')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, GROUND)
    if (!night) {
        const glow = ctx.createRadialGradient(182, 34, 4, 182, 34, 44)
        glow.addColorStop(0, 'rgba(255, 250, 220, 1)')
        glow.addColorStop(0.3, 'rgba(255, 240, 190, 0.8)')
        glow.addColorStop(1, 'rgba(255, 230, 170, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(130, 0, 100, 90)
        // two birds
        ctx.strokeStyle = 'rgba(80, 50, 30, 0.6)'
        ctx.lineWidth = 1.2
        for (const [bx, by] of [[60, 26], [74, 34]]) {
            const flap = Math.sin(time / 200 + bx) * 2
            ctx.beginPath()
            ctx.moveTo(bx - 5, by - flap)
            ctx.quadraticCurveTo(bx - 2, by - 3, bx, by)
            ctx.quadraticCurveTo(bx + 2, by - 3, bx + 5, by - flap)
            ctx.stroke()
        }
    }
    // far dunes, then nearer dunes
    ctx.fillStyle = night ? '#a8683a' : '#e8c28a'
    ctx.beginPath()
    ctx.moveTo(0, GROUND - 14)
    ctx.quadraticCurveTo(50, GROUND - 34, 100, GROUND - 16)
    ctx.quadraticCurveTo(160, GROUND - 4, 230, GROUND - 26)
    ctx.lineTo(W, GROUND)
    ctx.lineTo(0, GROUND)
    ctx.fill()
    const ground = ctx.createLinearGradient(0, GROUND - 8, 0, H)
    ground.addColorStop(0, night ? '#9a5e34' : '#e2b87a')
    ground.addColorStop(1, night ? '#6e3e22' : '#c89a5c')
    ctx.fillStyle = ground
    ctx.beginPath()
    ctx.moveTo(0, GROUND)
    ctx.quadraticCurveTo(80, GROUND - 8, 160, GROUND + 2)
    ctx.quadraticCurveTo(200, GROUND + 6, 230, GROUND - 2)
    ctx.lineTo(W, H)
    ctx.lineTo(0, H)
    ctx.fill()
    ctx.fillStyle = 'rgba(120, 80, 40, 0.18)'                 // little ripples in the sand
    for (let i = 0; i < 14; i++) ctx.fillRect((i * 37) % W, GROUND + 14 + ((i * 23) % 30), 10, 1.5)

    switch (id) {
        case 'kerma': {
            // the Western Deffufa, a huge mud-brick temple, with a black-topped beaker in front
            rect(34, 44, 116, 76, '#a8683f')
            rect(34, 44, 116, 8, '#c27c4c')
            rect(138, 52, 12, 68, '#8a5230')
            rect(70, 22, 40, 26, '#b47044')
            rect(70, 22, 40, 5, '#c98858')
            ctx.fillStyle = 'rgba(70, 35, 15, 0.35)'
            for (let k = 0; k < 6; k++) ctx.fillRect(40, 62 + k * 10, 96, 1.5)
            rect(84, 88, 16, 32, '#3a2216')
            ctx.beginPath()
            ctx.arc(92, 88, 8, Math.PI, 0)
            ctx.fill()
            // the beaker
            poly([166, 96, 194, 96, 186, 140, 174, 140], '#9a3a24')
            poly([166, 96, 194, 96, 192, 106, 168, 106], '#1a110a')
            ctx.beginPath()
            ctx.moveTo(166, 96)
            ctx.lineTo(194, 96)
            ctx.lineTo(186, 140)
            ctx.lineTo(174, 140)
            ctx.closePath()
            outline()
            rect(170, 99, 8, 2, 'rgba(255, 255, 255, 0.5)')
            palm(18, 128, 50)
            break
        }
        case 'pharaohs': {
            // Jebel Barkal, the holy mountain, behind a Kushite king wearing the cap crown with two cobras
            poly([0, GROUND, 10, 56, 70, 50, 84, GROUND], '#b8784a')
            poly([60, 52, 66, 20, 76, 22, 74, 54], '#a8683a')       // the pinnacle
            poly([60, 52, 70, 50, 84, GROUND, 70, GROUND], 'rgba(0, 0, 0, 0.15)')
            // the king, from the chest up
            ctx.fillStyle = '#e8d4a2'
            ctx.beginPath()
            ctx.moveTo(100, H)
            ctx.quadraticCurveTo(102, 112, 150, 108)
            ctx.quadraticCurveTo(198, 112, 200, H)
            ctx.fill()
            ctx.fillStyle = '#c9a227'                                 // broad gold collar
            ctx.beginPath()
            ctx.ellipse(150, 116, 34, 12, 0, 0, Math.PI)
            ctx.fill()
            rect(138, 92, 24, 22, '#7a4a2b')                          // neck and face
            circle(150, 78, 22, '#8a5a3b')
            ctx.fillStyle = '#1c1410'                                 // the cap crown
            ctx.beginPath()
            ctx.arc(150, 74, 24, Math.PI * 1.02, Math.PI * 1.98)
            ctx.lineTo(174, 80)
            ctx.lineTo(126, 80)
            ctx.fill()
            rect(126, 74, 48, 6, '#c9a227')                           // gold band
            for (const cx of [143, 157]) {                            // two cobras
                rect(cx - 2, 50, 4, 14, '#c9a227')
                circle(cx, 49, 3.5, '#c9a227')
            }
            rect(158, 80, 6, 3, '#1c1410')                            // eye
            rect(160, 94, 6, 2, '#5a3020')                            // mouth
            break
        }
        case 'meroe': {
            // the royal cemetery of Meroë: rows of steep pyramids on a ridge, with palms by the river
            rect(0, GROUND + 22, W, 10, '#4f9ac0')                    // a glimpse of the Nile
            rect(0, GROUND + 22, W, 2, '#8cc8e0')
            pyramid(46, GROUND + 10, 18, 70)
            pyramid(92, GROUND + 6, 22, 90)
            pyramid(140, GROUND + 8, 20, 78)
            pyramid(184, GROUND + 12, 16, 60)
            palm(16, GROUND + 26, 40)
            palm(212, GROUND + 26, 46)
            break
        }
        case 'kandake': {
            // a Kandake (queen) in a tall crown, with a spear and a long robe, in front of a temple wall
            rect(0, 30, W, 90, '#d6b98a')
            ctx.fillStyle = 'rgba(110, 75, 35, 0.3)'
            for (let k = 0; k < 8; k++) ctx.fillRect(0, 40 + k * 10, W, 1)
            rect(150, 14, 4, 140, '#6b4226')                          // spear
            poly([146, 16, 152, 0, 158, 16], '#c0c4c8')
            ctx.fillStyle = '#7a2a5a'                                 // robe
            ctx.beginPath()
            ctx.moveTo(98, 72)
            ctx.lineTo(142, 72)
            ctx.lineTo(158, H)
            ctx.lineTo(82, H)
            ctx.closePath()
            ctx.fill()
            outline()
            rect(92, 108, 56, 6, '#c9a227')                           // sash
            ctx.fillStyle = '#c9a227'                                 // collar
            ctx.beginPath()
            ctx.ellipse(120, 74, 24, 8, 0, 0, Math.PI)
            ctx.fill()
            rect(114, 56, 12, 16, '#6b4226')
            circle(120, 48, 15, '#7a4a2b')                            // head
            rect(105, 18, 30, 22, '#c9a227')                          // crown
            rect(112, 6, 16, 14, '#e8c75a')
            circle(120, 6, 5, '#b0412e')
            rect(126, 46, 5, 3, '#1c1410')
            rect(140, 80, 10, 6, '#7a4a2b')                           // hand on the spear
            break
        }
        case 'script': {
            // a carved offering table / stone tablet, lit by a lamp inside a temple
            rect(0, 0, W, GROUND, 'rgba(60, 30, 15, 0.35)')
            ctx.fillStyle = '#b8a27a'
            ctx.beginPath()
            ctx.roundRect(60, 20, 110, 120, [50, 50, 4, 4])
            ctx.fill()
            outline('rgba(60, 40, 20, 0.6)', 2)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
            ctx.fillRect(66, 40, 6, 90)
            ctx.fillStyle = '#5e4a2e'
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 6; c++) {
                    const sx = 76 + c * 14
                    const sy = 46 + r * 13
                    const k = (r * 5 + c * 3) % 5
                    if (k === 0) ctx.fillRect(sx, sy, 3, 9)
                    else if (k === 1) ctx.fillRect(sx, sy + 3, 9, 3)
                    else if (k === 2) { ctx.beginPath(); ctx.arc(sx + 4, sy + 4, 3.5, 0, Math.PI * 2); ctx.fill() }
                    else if (k === 3) { ctx.fillRect(sx, sy, 3, 9); ctx.fillRect(sx, sy, 8, 3) }
                    else { ctx.beginPath(); ctx.moveTo(sx, sy + 9); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx + 8, sy + 9); ctx.fill() }
                }
            }
            // an oil lamp with a flickering flame
            poly([180, 140, 206, 140, 200, 130, 186, 130], '#8a5a3a')
            const fl = Math.sin(time / 90) * 2
            circle(193, 124 - fl / 2, 5 + fl / 3, '#ffb040')
            circle(193, 126, 2.5, '#fff0b0')
            const lampGlow = ctx.createRadialGradient(193, 124, 2, 193, 124, 60)
            lampGlow.addColorStop(0, 'rgba(255, 190, 90, 0.35)')
            lampGlow.addColorStop(1, 'rgba(255, 190, 90, 0)')
            ctx.fillStyle = lampGlow
            ctx.fillRect(130, 64, 100, 102)
            break
        }
        case 'apedemak': {
            // Apedemak: a lion-headed god with a crown, carved on a temple wall at Naqa
            rect(0, 0, W, H, 'rgba(70, 35, 15, 0.25)')
            ctx.fillStyle = '#d8b07a'
            ctx.beginPath()
            ctx.roundRect(40, 10, 150, 150, 8)
            ctx.fill()
            ctx.fillStyle = 'rgba(110, 70, 30, 0.25)'
            for (let k = 0; k < 14; k++) ctx.fillRect(40, 18 + k * 10, 150, 1)
            // the mane, as rays
            ctx.fillStyle = '#b06a28'
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2
                ctx.beginPath()
                ctx.moveTo(115 + Math.cos(a) * 20, 88 + Math.sin(a) * 20)
                ctx.lineTo(115 + Math.cos(a + 0.2) * 48, 88 + Math.sin(a + 0.2) * 48)
                ctx.lineTo(115 + Math.cos(a + 0.4) * 20, 88 + Math.sin(a + 0.4) * 20)
                ctx.fill()
            }
            circle(115, 88, 36, '#c27a34')
            circle(115, 92, 26, '#e0a050')                            // face
            circle(104, 84, 4, '#1c1410')
            circle(126, 84, 4, '#1c1410')
            circle(105, 83, 1.2, '#fff')
            circle(127, 83, 1.2, '#fff')
            poly([108, 98, 122, 98, 115, 106], '#5a2a14')             // nose
            ctx.strokeStyle = '#5a2a14'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(115, 106)
            ctx.quadraticCurveTo(108, 112, 102, 108)
            ctx.moveTo(115, 106)
            ctx.quadraticCurveTo(122, 112, 128, 108)
            ctx.stroke()
            // the double crown on top
            poly([98, 52, 132, 52, 128, 30, 102, 30], '#e8c75a')
            rect(110, 14, 10, 18, '#e8d4a2')
            circle(115, 12, 5, '#b0412e')
            break
        }
        case 'iron': {
            // an iron furnace with leather bellows, smoke rising, a slag heap and finished iron bars
            ctx.fillStyle = '#7a4a32'
            ctx.beginPath()
            ctx.moveTo(40, GROUND + 22)
            ctx.lineTo(56, 40)
            ctx.lineTo(90, 40)
            ctx.lineTo(106, GROUND + 22)
            ctx.closePath()
            ctx.fill()
            outline()
            poly([78, 40, 90, 40, 106, GROUND + 22, 90, GROUND + 22], '#5e3624')
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
            for (let k = 0; k < 6; k++) ctx.fillRect(50, 56 + k * 14, 50, 1.5)
            ctx.fillStyle = '#1a0d06'
            ctx.beginPath()
            ctx.arc(73, GROUND + 22, 16, Math.PI, 0)
            ctx.fill()
            const f = Math.sin(time / 90) * 3
            ctx.fillStyle = '#ff9a3c'
            ctx.beginPath()
            ctx.arc(73, GROUND + 22, 11 + f / 2, Math.PI, 0)
            ctx.fill()
            circle(73, GROUND + 18, 5, '#ffe080')
            for (let i = 0; i < 3; i++) {                             // smoke
                const t = ((time / 1500) + i / 3) % 1
                circle(73 + Math.sin(t * 5) * 6, 34 - t * 40, 6 + t * 10, `rgba(200, 195, 190, ${0.5 * (1 - t)})`)
            }
            ctx.fillStyle = '#8a5a2b'                                 // bellows
            ctx.beginPath()
            ctx.ellipse(22, GROUND + 10, 14, 9 + Math.sin(time / 300) * 2, 0, 0, Math.PI * 2)
            ctx.fill()
            for (const [sx, sy, r] of [[150, GROUND + 26, 18], [176, GROUND + 30, 14], [134, GROUND + 32, 12]] as [number, number, number][]) {
                ctx.fillStyle = '#2e2a28'
                ctx.beginPath()
                ctx.arc(sx, sy, r, Math.PI, 0)
                ctx.fill()
                rect(sx - r / 3, sy - r * 0.7, 4, 2, 'rgba(140, 130, 150, 0.6)')
            }
            for (let i = 0; i < 4; i++) {                             // iron bars
                rect(170 + (i % 2) * 6, GROUND + 4 - i * 9, 46, 7, '#6b6f75')
                rect(170 + (i % 2) * 6, GROUND + 4 - i * 9, 46, 2, '#a0a6ae')
            }
            break
        }
        case 'egypt': {
            // the Great Pyramids and the Sphinx, wide and low compared to the pyramids of Kush
            rect(0, GROUND + 24, W, 8, '#4f9ac0')
            for (const [cx, half, tall] of [[60, 52, 62], [128, 60, 76], [186, 34, 42]] as [number, number, number][]) {
                poly([cx - half, GROUND + 10, cx, GROUND + 10 - tall, cx + half, GROUND + 10], '#e8cc96')
                poly([cx, GROUND + 10 - tall, cx + half, GROUND + 10, cx + 6, GROUND + 10], '#bf9a5e')
            }
            // the sphinx lying in front
            rect(20, GROUND + 4, 70, 16, '#c9a265')
            rect(20, GROUND + 4, 70, 3, '#ddb97a')
            rect(80, GROUND - 16, 22, 26, '#c9a265')
            poly([76, GROUND - 16, 106, GROUND - 16, 102, GROUND - 2, 80, GROUND - 2], '#2f6fb5')
            rect(86, GROUND - 10, 4, 3, '#1c1410')
            palm(212, GROUND + 28, 44)
            break
        }
        case 'assyria': {
            // an Assyrian iron sword in front of a stone relief of a winged bull
            rect(0, 24, W, 96, '#c8b48a')
            ctx.fillStyle = 'rgba(90, 70, 40, 0.5)'
            ctx.fillRect(20, 60, 70, 40)                              // the bull's body
            ctx.fillRect(84, 44, 22, 30)                              // head
            poly([30, 60, 60, 30, 74, 60], 'rgba(90, 70, 40, 0.5)')   // wing
            for (const lx of [24, 40, 64, 80]) ctx.fillRect(lx, 100, 6, 18)
            // the sword
            ctx.save()
            ctx.translate(160, 90)
            ctx.rotate(-0.5)
            poly([-5, 20, 0, -70, 5, 20], '#9aa0a8')
            poly([0, -70, 5, 20, 1, 20], '#70767e')
            rect(-20, 18, 40, 7, '#6b4226')
            rect(-4, 25, 8, 24, '#3a2a1a')
            circle(0, 52, 6, '#c9a227')
            ctx.restore()
            break
        }
        case 'persia': {
            // a gold daric coin showing the running archer king, on cloth
            rect(0, GROUND - 10, W, H, '#7a2a3a')
            circle(118, 84, 52, '#9a7a1a')
            circle(115, 81, 52, '#c9a227')
            circle(115, 81, 44, '#e8c75a')
            ctx.strokeStyle = '#b8901f'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(115, 81, 48, 0, Math.PI * 2)
            ctx.stroke()
            ctx.fillStyle = '#9a7a1a'                                 // the archer king, kneeling with his bow
            circle(104, 54, 7, '#9a7a1a')
            poly([96, 48, 112, 48, 110, 40, 98, 40], '#9a7a1a')       // crown
            poly([98, 60, 112, 60, 118, 100, 92, 100], '#9a7a1a')
            ctx.strokeStyle = '#9a7a1a'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.arc(116, 76, 20, -1.3, 1.3)
            ctx.stroke()
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(110, 58)
            ctx.lineTo(140, 72)
            ctx.stroke()
            ctx.fillStyle = 'rgba(255, 250, 220, 0.6)'
            ctx.beginPath()
            ctx.ellipse(92, 58, 8, 14, -0.6, 0, Math.PI * 2)
            ctx.fill()
            break
        }
        case 'greece': {
            // a Greek wine amphora with black figures, by a ship's sail on the sea
            rect(0, GROUND - 6, W, 14, '#4f8ab0')
            poly([170, GROUND - 6, 196, GROUND - 6, 192, GROUND, 174, GROUND], '#6b4226')
            rect(182, 50, 2, GROUND - 56, '#5a3a1a')
            poly([184, 54, 210, 76, 184, 96], '#efe6d0')
            ctx.fillStyle = '#b5654a'
            ctx.beginPath()
            ctx.ellipse(96, 92, 34, 46, 0, 0, Math.PI * 2)
            ctx.fill()
            outline()
            rect(86, 28, 20, 24, '#b5654a')
            rect(82, 26, 28, 6, '#a05238')
            poly([88, 134, 104, 134, 100, 152, 92, 152], '#b5654a')
            ctx.strokeStyle = '#b5654a'
            ctx.lineWidth = 6
            ctx.beginPath()
            ctx.arc(74, 52, 12, Math.PI * 0.5, Math.PI * 1.5)
            ctx.moveTo(118, 40)
            ctx.arc(118, 52, 12, Math.PI * 1.5, Math.PI * 0.5)
            ctx.stroke()
            rect(64, 78, 64, 26, '#1c1410')                           // the black-figure band
            ctx.fillStyle = '#b5654a'
            for (const fx of [76, 96, 116]) {
                circle(fx, 84, 3.5, '#b5654a')
                ctx.fillRect(fx - 3, 88, 6, 12)
            }
            break
        }
        case 'rome': {
            // the bronze head of Augustus, found buried under a temple step at Meroë
            rect(0, GROUND + 8, W, H, '#b8a07a')                      // the temple step
            rect(0, GROUND + 8, W, 4, '#d8c49a')
            ctx.fillStyle = '#9a7240'
            ctx.beginPath()
            ctx.ellipse(115, 74, 40, 48, 0, 0, Math.PI * 2)
            ctx.fill()
            outline('rgba(50, 30, 10, 0.6)', 2)
            rect(98, 112, 34, 22, '#8a6234')                          // neck
            ctx.fillStyle = '#6e4e26'                                 // hair
            ctx.beginPath()
            ctx.ellipse(115, 40, 40, 20, 0, Math.PI, 0)
            ctx.fill()
            for (let i = 0; i < 6; i++) rect(80 + i * 12, 38, 6, 8, '#6e4e26')
            ctx.fillStyle = '#f3ead6'                                 // the glass and stone eyes that still survive
            ctx.beginPath()
            ctx.ellipse(100, 72, 9, 5, 0, 0, Math.PI * 2)
            ctx.ellipse(130, 72, 9, 5, 0, 0, Math.PI * 2)
            ctx.fill()
            circle(101, 72, 3.5, '#5a3a1a')
            circle(131, 72, 3.5, '#5a3a1a')
            rect(112, 76, 6, 16, '#8a6234')                           // nose
            rect(104, 98, 22, 3, '#5a3a1a')                           // mouth
            ctx.fillStyle = 'rgba(80, 140, 110, 0.35)'                // green patches of old bronze
            ctx.fillRect(84, 90, 10, 8)
            ctx.fillRect(138, 54, 8, 10)
            break
        }
        default: {
            // aksum: tall carved granite stelae on green highlands
            ctx.fillStyle = '#7a9a4a'
            ctx.beginPath()
            ctx.moveTo(0, GROUND - 6)
            ctx.quadraticCurveTo(110, GROUND - 26, 230, GROUND - 4)
            ctx.lineTo(W, H)
            ctx.lineTo(0, H)
            ctx.fill()
            const stela = (cx: number, tall: number, wide: number) => {
                ctx.fillStyle = '#8a8f98'
                ctx.beginPath()
                ctx.moveTo(cx - wide, GROUND + 20)
                ctx.lineTo(cx - wide * 0.85, GROUND + 20 - tall)
                ctx.arc(cx, GROUND + 20 - tall, wide * 0.85, Math.PI, 0)
                ctx.lineTo(cx + wide, GROUND + 20)
                ctx.closePath()
                ctx.fill()
                outline('rgba(40, 40, 50, 0.5)', 1.5)
                rect(cx + wide * 0.3, GROUND + 20 - tall, wide * 0.55, tall, 'rgba(0, 0, 0, 0.15)')
                ctx.fillStyle = '#6b7078'
                const floors = Math.floor(tall / 16)
                for (let i = 0; i < floors; i++) {
                    ctx.fillRect(cx - wide * 0.6, GROUND + 12 - tall + 8 + i * 16, wide * 1.2, 3)
                    ctx.fillRect(cx - wide * 0.4, GROUND + 18 - tall + 8 + i * 16, 4, 4)       // carved windows
                    ctx.fillRect(cx + wide * 0.2, GROUND + 18 - tall + 8 + i * 16, 4, 4)
                }
                rect(cx - 5, GROUND + 6, 10, 14, '#5a5e66')                                   // false door
            }
            stela(70, 70, 12)
            stela(120, 112, 16)
            stela(168, 86, 13)
        }
    }

    if (locked) {
        // hide the picture: a dark wash with a question mark
        ctx.fillStyle = 'rgba(26, 17, 10, 0.88)'
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `700 52px ${FONT_TITLE}`
        ctx.fillStyle = '#6e6350'
        ctx.fillText('?', W / 2, H / 2)
    }
    ctx.restore()

    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 6)
    ctx.stroke()
}

// --- Crafting, building and the stations -----------------------------------

// The furnace window: ore goes in the top slot, fuel in the bottom slot, and the bar comes out the right.
// The slots are 'slot:chest:0' (ore), 'slot:chest:1' (fuel) and 'slot:chest:2' (bar), so the chest clicking code works.
export function drawFurnaceScreen(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    layout: WindowLayout,
    furnace: (Slot | null)[],
    progress: number,   // 0..1, how far the smelting has got (0 = not smelting)
    pack: (Slot | null)[],
    time: number,
) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.75)'
    ctx.fillRect(0, 0, w, h)
    const { px, py, pw, ph, size } = layout
    drawPanel(ctx, px, py, pw, ph)
    drawCloseButton(ctx, px, py, pw)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 20px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('FURNACE', w / 2, py + 32)

    const top = layout.chest[0].y
    const cx = w / 2
    const input: SlotRect = { x: cx - size * 2.6, y: top, size }
    const fuel: SlotRect = { x: cx - size * 2.6, y: top + size * 2, size }
    const output: SlotRect = { x: cx + size * 1.6, y: top + size, size }
    drawClickableSlot(ctx, input, furnace[0], 'slot:chest:0')
    drawClickableSlot(ctx, fuel, furnace[1], 'slot:chest:1')
    drawClickableSlot(ctx, output, furnace[2], 'slot:chest:2')

    ctx.font = `700 10px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('IRON ORE', input.x + size / 2, input.y - 8)
    ctx.fillText('FUEL: WOOD', fuel.x + size / 2, fuel.y + size + 10)
    ctx.fillText('IRON BAR', output.x + size / 2, output.y - 8)

    // the flame between the two input slots (it flickers while smelting)
    const fx = input.x + size / 2
    const fy = input.y + size * 1.5
    const burning = progress > 0
    const flick = burning ? Math.sin(time / 90) * 2 : 0
    ctx.fillStyle = burning ? '#ff9a3c' : '#4a3a2a'
    ctx.beginPath()
    ctx.moveTo(fx, fy - 12 - flick)
    ctx.quadraticCurveTo(fx + 10, fy + 2, fx, fy + 10)
    ctx.quadraticCurveTo(fx - 10, fy + 2, fx, fy - 12 - flick)
    ctx.fill()
    if (burning) {
        ctx.fillStyle = '#ffd36b'
        ctx.beginPath()
        ctx.ellipse(fx, fy + 3, 4, 6, 0, 0, Math.PI * 2)
        ctx.fill()
    }

    // the arrow, which fills from left to right
    const ax = input.x + size + 18
    const aw = output.x - ax - 18
    const ay = output.y + size / 2
    ctx.fillStyle = '#4a3a2a'
    ctx.fillRect(ax, ay - 6, aw, 12)
    ctx.beginPath()
    ctx.moveTo(ax + aw, ay - 14)
    ctx.lineTo(ax + aw + 16, ay)
    ctx.lineTo(ax + aw, ay + 14)
    ctx.fill()
    ctx.fillStyle = '#e8c75a'
    ctx.fillRect(ax, ay - 6, aw * progress, 12)

    const first = layout.main[0]
    ctx.textAlign = 'left'
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('YOUR INVENTORY', first.x, first.y - 16)
    layout.main.forEach((r, i) => drawClickableSlot(ctx, r, pack[HOTBAR_SLOTS + i], 'slot:main:' + i))
    layout.hotbar.forEach((r, i) => drawClickableSlot(ctx, r, pack[i], 'slot:hotbar:' + i))

    ctx.textAlign = 'center'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('1 ORE + 1 WOOD = 1 IRON BAR      SHIFT CLICK: MOVE      E OR ESC: CLOSE', w / 2, py + ph - 18)
    ctx.restore()
}

// One ingredient in a recipe, with how many you have
export interface CraftPart {
    id: string
    name: string
    color: string
    have: number
    need: number
}

// A recipe in the crafting window
export interface CraftRow {
    id: string
    name: string
    inputs: CraftPart[]
    output: Slot          // what you get (its count is how many)
    forCapital: boolean   // needed for the buildings of the capital
    canCraft: boolean
}

// The crafting window of a station: one card per recipe
export function drawCraftScreen(ctx: CanvasRenderingContext2D, w: number, h: number, station: string, title: string, rows: CraftRow[], time: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.75)'
    ctx.fillRect(0, 0, w, h)
    const rowH = Math.max(56, Math.min(78, Math.floor((h - 190) / Math.max(1, rows.length))))
    const pw = Math.min(720, w - 40)
    const ph = Math.min(h - 30, 150 + rows.length * rowH)
    const px = Math.round((w - pw) / 2)
    const py = Math.round((h - ph) / 2)
    drawPanel(ctx, px, py, pw, ph)
    addButton('panel', px, py, pw, ph)
    drawCloseButton(ctx, px, py, pw)

    // the header: the station's picture next to its name
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 24px ${FONT_TITLE}`
    const tw = ctx.measureText(title).width
    drawStation(ctx, w / 2 - tw / 2 - 46, py + 18, station, time)
    ctx.fillStyle = '#e8c75a'
    ctx.fillText(title, w / 2, py + 36)
    ctx.font = `600 16px ${FONT_BODY}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('Click CRAFT to make an item from the materials you carry.', w / 2, py + 66)

    rows.forEach((row, i) => {
        const x = px + 22
        const y = py + 88 + i * rowH
        const cw = pw - 44
        const ch = rowH - 8
        // the card
        ctx.fillStyle = row.canCraft ? 'rgba(232, 199, 90, 0.09)' : 'rgba(255, 255, 255, 0.04)'
        ctx.beginPath()
        ctx.roundRect(x, y, cw, ch, 8)
        ctx.fill()
        ctx.strokeStyle = row.canCraft ? 'rgba(232, 199, 90, 0.6)' : 'rgba(201, 162, 39, 0.22)'
        ctx.lineWidth = 1
        ctx.stroke()

        // what you make, in a slot on the left
        const ss = Math.min(48, ch - 8)
        drawSlot(ctx, x + 8, y + (ch - ss) / 2, ss, row.output, false)

        // its name (and a tag if the capital needs it)
        const tx = x + ss + 22
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.font = `700 14px ${FONT_TITLE}`
        ctx.fillStyle = '#f3ead6'
        const nameY = y + ch * 0.32
        ctx.fillText(row.name.toUpperCase(), tx, nameY)
        if (row.forCapital) {
            const nw = ctx.measureText(row.name.toUpperCase()).width
            ctx.font = `700 9px ${FONT_TITLE}`
            const tagW = ctx.measureText('FOR THE CAPITAL').width + 12
            ctx.fillStyle = '#c9a227'
            ctx.beginPath()
            ctx.roundRect(tx + nw + 10, nameY - 8, tagW, 16, 8)
            ctx.fill()
            ctx.fillStyle = '#1a110a'
            ctx.fillText('FOR THE CAPITAL', tx + nw + 16, nameY + 1)
        }

        // the ingredients: a small picture of each, with have / need
        let cx = tx
        const chipY = y + ch * 0.72
        for (const part of row.inputs) {
            ctx.save()
            ctx.translate(cx - 4, chipY - 11)
            ctx.scale(0.65, 0.65)
            drawItem(ctx, 0, 0, part.color, -(cx * 300), part.id)   // (a fixed "time", so it does not bob)
            ctx.restore()
            ctx.font = `600 16px ${FONT_BODY}`
            const ok = part.have >= part.need
            ctx.fillStyle = ok ? '#a8d98a' : '#e08a7a'
            const count = Math.min(part.have, 99) + '/' + part.need
            ctx.fillText(count, cx + 18, chipY)
            const cwid = ctx.measureText(count).width
            ctx.fillStyle = '#d8ccb0'
            ctx.fillText(part.name, cx + 22 + cwid, chipY)
            cx += 22 + cwid + ctx.measureText(part.name).width + 18
        }

        // the button
        const bw = 96
        const bh = Math.min(38, ch - 16)
        const bx = x + cw - bw - 12
        const by = y + (ch - bh) / 2
        const on = row.canCraft && hovering(bx, by, bw, bh)
        ctx.fillStyle = !row.canCraft ? '#3a2e22' : on ? '#f6dc82' : '#e8c75a'
        ctx.beginPath()
        ctx.roundRect(bx, by, bw, bh, bh / 2)
        ctx.fill()
        ctx.textAlign = 'center'
        ctx.font = `700 13px ${FONT_TITLE}`
        ctx.fillStyle = row.canCraft ? '#1a110a' : '#7a6a52'
        ctx.fillText('CRAFT', bx + bw / 2, by + bh / 2 + 1)
        if (row.canCraft) addButton('craft:' + row.id, bx, by, bw, bh)
    })

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('E OR ESC: CLOSE', w / 2, py + ph - 18)
    ctx.restore()
}

export interface BuildLine {
    name: string
    have: number
    need: number
    text?: string   // shown instead of "have / need" (used for required quests)
}

// The window for a building plot: what it costs and a Build button
export function drawBuildScreen(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    name: string,
    blurb: string,
    lines: BuildLine[],
    canBuild: boolean,
) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.75)'
    ctx.fillRect(0, 0, w, h)
    const pw = Math.min(560, w - 40)
    ctx.font = `600 18px ${FONT_BODY}`
    const blurbLines = wrapText(ctx, blurb, pw - 60)
    const ph = Math.min(h - 30, 190 + blurbLines.length * 22 + lines.length * 28)
    const px = Math.round((w - pw) / 2)
    const py = Math.round((h - ph) / 2)
    drawPanel(ctx, px, py, pw, ph)
    addButton('panel', px, py, pw, ph)
    drawCloseButton(ctx, px, py, pw)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 22px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText(name.toUpperCase(), w / 2, py + 34)

    ctx.font = `600 18px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    blurbLines.forEach((l, i) => ctx.fillText(l, w / 2, py + 72 + i * 22))

    let y = py + 90 + blurbLines.length * 22
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('MATERIALS NEEDED', w / 2, y)
    y += 24
    for (const l of lines) {
        const ok = l.have >= l.need
        ctx.textAlign = 'left'
        ctx.font = `600 19px ${FONT_BODY}`
        ctx.fillStyle = '#f3ead6'
        ctx.fillText(l.name, px + 80, y)
        ctx.textAlign = 'right'
        ctx.fillStyle = ok ? '#a8d98a' : '#e08a7a'
        ctx.fillText(l.text ?? Math.min(l.have, 99) + ' / ' + l.need, px + pw - 80, y)
        y += 28
    }

    const by = py + ph - 46
    const bx = w / 2
    const on = canBuild && hovering(bx - 110, by - 20, 220, 40)
    ctx.fillStyle = !canBuild ? '#4a3a2a' : on ? '#f6dc82' : '#e8c75a'
    ctx.beginPath()
    ctx.roundRect(bx - 110, by - 20, 220, 40, 20)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.font = `700 15px ${FONT_TITLE}`
    ctx.fillStyle = canBuild ? '#1a110a' : '#8a7a62'
    ctx.fillText(canBuild ? 'BUILD' : 'MISSING MATERIALS', bx, by)
    if (canBuild) addButton('build', bx - 110, by - 20, 220, 40)
    ctx.restore()
}

// "Meroë: 3 of 7 built", top right
export function drawCapitalProgress(ctx: CanvasRenderingContext2D, w: number, built: number, total: number) {
    ctx.save()
    const bw = 190
    const x = w - bw - 16
    const y = 16
    ctx.fillStyle = 'rgba(26, 17, 10, 0.88)'
    ctx.beginPath()
    ctx.roundRect(x, y, bw, 52, 8)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('THE CAPITAL OF MEROË', x + 12, y + 16)
    for (let i = 0; i < total; i++) {
        ctx.fillStyle = i < built ? '#e8c75a' : 'rgba(201, 162, 39, 0.25)'
        diamond(ctx, x + 20 + i * 24, y + 36, 7)
    }
    ctx.restore()
}

// --- The workshops in the village ---
// Each one stands on one tile but is drawn a bit bigger, reaching up above its tile.
export function drawStation(ctx: CanvasRenderingContext2D, x: number, y: number, kind: string, time: number) {
    ctx.save()
    ctx.translate(x, y)   // (0, 0) is the top-left of the station's tile; the ground line is at y = 30
    const shadow = (w: number) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.beginPath()
        ctx.ellipse(16, 30, w, 5, 0, 0, Math.PI * 2)
        ctx.fill()
    }
    const smoke = (sx: number, sy: number) => {
        for (let i = 0; i < 3; i++) {
            const t = ((time / 1400) + i / 3) % 1
            ctx.fillStyle = `rgba(210, 205, 195, ${0.45 * (1 - t)})`
            ctx.beginPath()
            ctx.arc(sx + Math.sin(t * 6 + i) * 4, sy - t * 30, 3 + t * 5, 0, Math.PI * 2)
            ctx.fill()
        }
    }
    const flicker = Math.sin(time / 90) * 0.5 + Math.sin(time / 37) * 0.5

    if (kind === 'furnace') {
        // a Meroitic iron furnace: a clay chimney on a round base, with leather bellows beside it
        shadow(18)
        ctx.fillStyle = '#7a4a32'
        ctx.beginPath()
        ctx.moveTo(4, 30)
        ctx.lineTo(9, -6)
        ctx.lineTo(23, -6)
        ctx.lineTo(28, 30)
        ctx.fill()
        ctx.fillStyle = '#5e3624'
        ctx.beginPath()
        ctx.moveTo(18, -6)
        ctx.lineTo(23, -6)
        ctx.lineTo(28, 30)
        ctx.lineTo(21, 30)
        ctx.fill()
        ctx.fillStyle = '#8f5a3c'
        ctx.fillRect(8, -9, 16, 4)                        // the rim at the top
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        for (let ry = 2; ry < 28; ry += 7) ctx.fillRect(7, ry, 19, 1)   // clay rings
        // the glowing opening at the bottom
        ctx.fillStyle = '#1a0d06'
        ctx.beginPath()
        ctx.arc(16, 30, 7, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = `rgba(255, ${140 + flicker * 40}, 40, 0.95)`
        ctx.beginPath()
        ctx.arc(16, 30, 5 + flicker, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 150, 50, 0.18)'
        ctx.beginPath()
        ctx.arc(16, 28, 14, 0, Math.PI * 2)
        ctx.fill()
        // the bellows: a leather bag with a pipe into the furnace
        const puff = Math.sin(time / 300) * 1.5
        ctx.fillStyle = '#8a5a2b'
        ctx.beginPath()
        ctx.ellipse(-3, 24, 6, 4 + puff, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#5a3a1a'
        ctx.fillRect(2, 24, 6, 2)
        smoke(16, -10)
    } else if (kind === 'stoneworks') {
        // stacked sandstone blocks, one half-cut block with a chisel and mallet, and chips on the ground
        shadow(20)
        const block = (bx: number, by: number, bw: number, bh: number) => {
            ctx.fillStyle = '#e2c48c'
            ctx.fillRect(bx, by, bw, 3)                        // top
            ctx.fillStyle = '#d0aa6c'
            ctx.fillRect(bx, by + 3, bw, bh - 3)               // front
            ctx.fillStyle = '#a8834c'
            ctx.fillRect(bx + bw - 3, by + 3, 3, bh - 3)       // side
            ctx.fillStyle = 'rgba(120, 85, 40, 0.35)'
            ctx.fillRect(bx + 2, by + bh / 2 + 1, bw - 6, 1)   // a layer in the stone
        }
        block(-4, 18, 14, 12)
        block(10, 18, 14, 12)
        block(2, 6, 14, 12)
        // the rough block being worked on
        ctx.fillStyle = '#c9a265'
        ctx.beginPath()
        ctx.moveTo(24, 30)
        ctx.lineTo(25, 20)
        ctx.lineTo(31, 17)
        ctx.lineTo(37, 21)
        ctx.lineTo(37, 30)
        ctx.fill()
        // a chisel and a wooden mallet
        ctx.fillStyle = '#8a8f98'
        ctx.save()
        ctx.translate(30, 15)
        ctx.rotate(0.5)
        ctx.fillRect(-1, -9, 2, 9)
        ctx.restore()
        const swing = Math.max(0, Math.sin(time / 260)) * 0.5
        ctx.save()
        ctx.translate(36, 8)
        ctx.rotate(-0.6 - swing)
        ctx.fillStyle = '#6b4226'
        ctx.fillRect(-1, 0, 2, 10)
        ctx.fillStyle = '#8a5a35'
        ctx.fillRect(-4, -4, 8, 5)
        ctx.restore()
        ctx.fillStyle = '#e2c48c'
        for (const [cx, cy] of [[28, 31], [33, 32], [21, 32], [38, 31]]) ctx.fillRect(cx, cy, 2, 1.5)
    } else if (kind === 'goldsmith') {
        // a table under a striped cloth shade, with a glowing crucible and gold pieces
        shadow(20)
        ctx.fillStyle = '#5a3a1a'
        ctx.fillRect(-2, -6, 2, 36)                        // shade poles
        ctx.fillRect(32, -6, 2, 36)
        for (let i = 0; i < 6; i++) {                      // the striped cloth
            ctx.fillStyle = i % 2 ? '#e8d4a2' : '#b0412e'
            ctx.fillRect(-4 + i * 7, -10, 7, 7)
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
        ctx.fillRect(-4, -3, 42, 2)
        ctx.fillStyle = '#8a5a3b'                          // the table
        ctx.fillRect(0, 16, 32, 5)
        ctx.fillStyle = '#6b4226'
        ctx.fillRect(2, 21, 3, 9)
        ctx.fillRect(27, 21, 3, 9)
        ctx.fillStyle = '#3a2a1a'                          // the crucible, glowing with melted gold
        ctx.beginPath()
        ctx.arc(9, 14, 5, 0, Math.PI)
        ctx.fill()
        ctx.fillStyle = `rgba(255, ${190 + flicker * 30}, 60, 1)`
        ctx.fillRect(5, 12, 8, 2)
        ctx.fillStyle = '#e8c75a'                          // gold pieces and a finished ring
        ctx.fillRect(17, 12, 5, 4)
        ctx.fillRect(23, 13, 3, 3)
        ctx.strokeStyle = '#e8c75a'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(28, 13, 2.5, 0, Math.PI * 2)
        ctx.stroke()
        const shine = (Math.sin(time / 300) + 1) / 2
        ctx.fillStyle = `rgba(255, 246, 200, ${0.3 + shine * 0.6})`
        ctx.fillRect(18, 12, 2, 1)
    } else if (kind === 'kiln') {
        // a round, beehive-shaped clay kiln with a fire, and finished pots beside it
        shadow(19)
        const kiln = ctx.createLinearGradient(0, -6, 0, 30)
        kiln.addColorStop(0, '#b8774a')
        kiln.addColorStop(1, '#8a5232')
        ctx.fillStyle = kiln
        ctx.beginPath()
        ctx.moveTo(1, 30)
        ctx.quadraticCurveTo(0, 2, 15, -4)
        ctx.quadraticCurveTo(30, 2, 29, 30)
        ctx.fill()
        ctx.fillStyle = '#9a6038'
        ctx.fillRect(11, -7, 8, 5)                         // the vent at the top
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)'
        ctx.lineWidth = 1
        for (let ry = 6; ry < 28; ry += 7) {                // rings of clay
            ctx.beginPath()
            ctx.moveTo(3, ry)
            ctx.quadraticCurveTo(15, ry + 3, 27, ry)
            ctx.stroke()
        }
        ctx.fillStyle = '#1a0d06'                          // the fire mouth
        ctx.beginPath()
        ctx.arc(15, 30, 7, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = `rgba(255, ${130 + flicker * 50}, 40, 0.95)`
        ctx.beginPath()
        ctx.arc(15, 30, 4.5 + flicker, Math.PI, 0)
        ctx.fill()
        // pots: one black-topped Kerma pot and a round water jar
        ctx.fillStyle = '#9a3a24'
        ctx.beginPath()
        ctx.moveTo(31, 18)
        ctx.lineTo(39, 18)
        ctx.lineTo(37, 30)
        ctx.lineTo(33, 30)
        ctx.fill()
        ctx.fillStyle = '#1a110a'
        ctx.fillRect(31, 17, 8, 4)
        ctx.fillStyle = '#c08a5a'
        ctx.beginPath()
        ctx.arc(-5, 25, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(-7, 18, 4, 3)
        smoke(15, -9)
    } else {
        // brickyard: rows of mud bricks drying in the sun, a wooden mold and a pile of wet clay
        shadow(22)
        ctx.fillStyle = '#9a6b4a'                          // the clay pile
        ctx.beginPath()
        ctx.ellipse(-2, 25, 8, 5, 0, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(-10, 25, 16, 5)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.fillRect(-5, 21, 4, 1.5)
        const brick = (bx: number, by: number) => {
            ctx.fillStyle = '#c08050'
            ctx.fillRect(bx, by, 9, 4)
            ctx.fillStyle = '#9a6038'
            ctx.fillRect(bx, by + 4, 9, 2)
            ctx.fillStyle = 'rgba(230, 200, 120, 0.6)'     // straw in the brick
            ctx.fillRect(bx + 2, by + 1, 3, 0.8)
        }
        for (let i = 0; i < 3; i++) brick(8 + i * 10, 24)  // a row on the ground
        for (let i = 0; i < 2; i++) brick(13 + i * 10, 18) // and a stack on top
        brick(18, 12)
        ctx.strokeStyle = '#6b4226'                        // the wooden brick mold
        ctx.lineWidth = 2
        ctx.strokeRect(29, 6, 11, 6)
        ctx.beginPath()
        ctx.moveTo(34.5, 6)
        ctx.lineTo(34.5, 12)
        ctx.stroke()
    }
    ctx.restore()
}

// A small "press E" bubble, shown above a workshop or plot when you stand next to it
export function drawKeyHint(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, time: number) {
    ctx.save()
    const y = cy + Math.sin(time / 250) * 2
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(text).width
    const w = tw + 34
    const x = cx - w / 2
    ctx.fillStyle = 'rgba(232, 199, 90, 0.95)'
    ctx.beginPath()
    ctx.roundRect(x, y - 11, w, 22, 11)
    ctx.fill()
    ctx.fillStyle = '#1a110a'                              // the key
    ctx.beginPath()
    ctx.roundRect(x + 5, y - 8, 16, 16, 4)
    ctx.fill()
    ctx.fillStyle = '#f6dc82'
    ctx.textAlign = 'center'
    ctx.fillText('E', x + 13, y + 0.5)
    ctx.fillStyle = '#1a110a'
    ctx.textAlign = 'left'
    ctx.fillText(text, x + 27, y + 0.5)
    ctx.restore()
}

// A plot that is still empty: a gold dashed outline and its name
export function drawPlotOutline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, time: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(184, 144, 31, 0.2)'
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6)
    ctx.strokeStyle = '#a67c12'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 7])
    ctx.lineDashOffset = -time / 60
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6)
    ctx.setLineDash([])
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = 'rgba(255, 246, 214, 0.85)'
    ctx.fillText(label.toUpperCase(), x + w / 2 + 1, y + h / 2 + 1)
    ctx.fillStyle = '#5a3d0a'
    ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2)
    ctx.restore()
}

// A finished building. (x, y, w, h) is the whole plot. `progress` 0..1 is the building animation:
// the building rises from the ground, with scaffolding around it until it is done.
export function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, id: string, time: number, progress: number) {
    ctx.save()
    ctx.beginPath()
    const rise = progress < 1 ? Math.max(0, (progress - 0.12) / 0.88) : 1   // (the first 12% is the foundation)
    ctx.rect(x - 8, y + h * (1 - rise) - (rise < 1 ? 0 : 40), w + 16, h * rise + (rise < 1 ? 0 : 48))
    ctx.clip()
    ctx.translate(x, y)   // from here on (0, 0) is the top-left of the plot

    const sand = '#dcc08a'
    const sandMid = '#c9a46a'
    const sandDark = '#a5814c'
    const rect = (rx: number, ry: number, rw: number, rh: number, c: string) => {
        ctx.fillStyle = c
        ctx.fillRect(rx, ry, rw, rh)
    }
    const poly = (pts: number[], c: string) => {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
        ctx.closePath()
        ctx.fill()
    }
    // a stone block of a building seen from a little above: roof on top, wall in front, shade on the right
    const box = (bx: number, by: number, bw: number, bh: number, roof: number, wall: string, top: string) => {
        rect(bx, by, bw, roof, top)
        rect(bx, by + roof, bw, bh - roof, wall)
        rect(bx, by + roof, bw, 2, 'rgba(0, 0, 0, 0.18)')
        rect(bx + bw - 4, by + roof, 4, bh - roof, 'rgba(0, 0, 0, 0.15)')
    }
    // a pylon tower: wider at the bottom, with lines carved across it
    const pylon = (px: number, py: number, pw: number, ph: number) => {
        poly([px, py + ph, px + 5, py, px + pw - 5, py, px + pw, py + ph], sandMid)
        poly([px + pw - 10, py, px + pw - 5, py, px + pw, py + ph, px + pw - 6, py + ph], sandDark)
        rect(px + 3, py, pw - 6, 4, sand)
        ctx.fillStyle = 'rgba(110, 75, 35, 0.35)'
        for (let ly = py + 12; ly < py + ph - 6; ly += 10) ctx.fillRect(px + 7, ly, pw - 16, 1.5)
        // a carved king, very simply
        rect(px + pw / 2 - 3, py + ph * 0.35, 6, ph * 0.35, 'rgba(110, 75, 35, 0.45)')
        ctx.fillStyle = 'rgba(110, 75, 35, 0.45)'
        ctx.beginPath()
        ctx.arc(px + pw / 2, py + ph * 0.32, 3.5, 0, Math.PI * 2)
        ctx.fill()
    }
    const column = (cx: number, top: number, bottom: number) => {
        rect(cx - 4, top, 8, bottom - top, '#ecdcb4')
        rect(cx + 1, top, 3, bottom - top, '#cdb98c')
        rect(cx - 6, top - 4, 12, 4, '#c9a227')            // gold capital
        rect(cx - 6, bottom - 2, 12, 3, sandDark)
    }
    const ram = (rx: number, ry: number) => {                // a small ram statue, like the ones at Amun temples
        rect(rx - 6, ry + 4, 12, 5, sandDark)               // plinth
        rect(rx - 5, ry - 2, 10, 6, sandMid)                // body
        ctx.fillStyle = sandMid
        ctx.beginPath()
        ctx.arc(rx + 5, ry - 3, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#8a6a3a'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(rx + 4, ry - 3, 2.5, 0.5, Math.PI * 1.8)    // curled horn
        ctx.stroke()
    }
    const lion = (lx: number, ly: number, flip: boolean) => {
        ctx.save()
        ctx.translate(lx, ly)
        if (flip) ctx.scale(-1, 1)
        rect(-8, 2, 16, 5, sandDark)
        rect(-7, -3, 12, 6, sandMid)
        ctx.fillStyle = sandDark
        ctx.beginPath()
        ctx.arc(5, -3, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = sandMid
        ctx.beginPath()
        ctx.arc(6, -2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
    const water = (wx: number, wy: number, ww: number, wh: number, deep: string, light: string) => {
        const g = ctx.createLinearGradient(0, wy, 0, wy + wh)
        g.addColorStop(0, light)
        g.addColorStop(1, deep)
        ctx.fillStyle = g
        ctx.fillRect(wx, wy, ww, wh)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        for (let i = 0; i < Math.floor(ww * wh / 1800); i++) {
            const rx = wx + 8 + ((i * 97 + time / 30) % Math.max(1, ww - 30))
            const ry = wy + 8 + ((i * 53) % Math.max(1, wh - 16))
            ctx.fillRect(rx, ry, 10 + (i % 3) * 4, 1.5)
        }
    }

    if (id === 'houses') {
        // three mud-brick houses of different sizes around a little courtyard
        const houses: [number, number, number, number][] = [[8, 18, 64, 70], [80, 6, 56, 82], [142, 24, 46, 64]]
        for (const [hx, hy, hw, hh] of houses) {
            ctx.save()
            ctx.translate(hx, hy)
            paintHouse(ctx, hw, hh)
            ctx.restore()
        }
        // the courtyard wall with a gate, a water jar and a little palm
        rect(4, 112, w - 8, 10, '#c48e5c')
        rect(4, 112, w - 8, 3, '#d9a874')
        rect(w / 2 - 14, 112, 28, 10, '#efe2c4')
        rect(w / 2 - 10, 114, 20, 8, '#6b4226')
        ctx.fillStyle = '#c08a5a'
        ctx.beginPath()
        ctx.arc(40, 104, 6, 0, Math.PI * 2)
        ctx.fill()
        rect(37, 96, 6, 3, '#a8703f')
        rect(w - 30, 70, 4, 40, '#8a5a2b')                  // palm trunk
        for (let i = 0; i < 5; i++) {
            ctx.save()
            ctx.translate(w - 28, 70)
            ctx.rotate(-1.4 + i * 0.7)
            ctx.fillStyle = i % 2 ? '#4f7a2e' : '#6b9a3a'
            ctx.beginPath()
            ctx.ellipse(12, 0, 13, 3.5, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    } else if (id === 'ironworks') {
        // a workshop with a shade roof, three furnaces in a row, a heap of slag and a stack of iron bars
        box(6, 8, 96, 70, 14, '#b88456', '#8a6a44')
        rect(6, 8, 96, 4, '#a07c50')                          // the reed roof
        ctx.fillStyle = 'rgba(80, 55, 25, 0.35)'
        for (let rx = 10; rx < 100; rx += 6) ctx.fillRect(rx, 8, 2, 14)
        rect(30, 50, 22, 28, '#3b2414')                       // a wide doorway, glowing inside
        rect(33, 60, 16, 18, 'rgba(255, 140, 50, 0.35)')
        for (let i = 0; i < 3; i++) drawStation(ctx, 120 + i * 34, 70, 'furnace', time + i * 400)
        // the slag heap: dark glassy lumps
        for (const [sx, sy, r] of [[30, 130, 14], [50, 136, 12], [16, 138, 10], [40, 120, 10]] as [number, number, number][]) {
            ctx.fillStyle = '#2e2a28'
            ctx.beginPath()
            ctx.arc(sx, sy, r, Math.PI, 0)
            ctx.fill()
            ctx.fillStyle = 'rgba(120, 110, 130, 0.5)'
            ctx.fillRect(sx - r / 2, sy - r * 0.7, 3, 2)
        }
        for (let i = 0; i < 4; i++) {                         // iron bars stacked by the door
            rect(70 + (i % 2) * 6, 140 - i * 6, 40, 5, '#6b6f75')
            rect(70 + (i % 2) * 6, 140 - i * 6, 40, 1.5, '#9aa0a8')
        }
        rect(118, 128, 14, 6, '#4a4e55')                      // the anvil
        rect(121, 134, 8, 8, '#3a3e44')
    } else if (id === 'hafir') {
        // a big round-cornered water tank dug into the ground, with stone steps down and lions guarding it
        ctx.fillStyle = '#c8a46c'                              // the earth bank
        ctx.beginPath()
        ctx.roundRect(4, 4, w - 8, h - 8, 40)
        ctx.fill()
        ctx.fillStyle = '#b08a52'
        ctx.beginPath()
        ctx.roundRect(16, 16, w - 32, h - 32, 32)
        ctx.fill()
        ctx.fillStyle = '#9a7646'                              // a stone step around the water
        ctx.beginPath()
        ctx.roundRect(26, 26, w - 52, h - 52, 26)
        ctx.fill()
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(34, 34, w - 68, h - 68, 22)
        ctx.clip()
        water(34, 34, w - 68, h - 68, '#2b6f9a', '#4fa3c8')
        ctx.restore()
        for (let i = 0; i < 4; i++) rect(w / 2 - 16, h - 32 + i * 6 - 18, 32, 4, i % 2 ? '#b08a52' : '#c8a46c')   // steps down
        lion(w / 2 - 34, h - 14, false)
        lion(w / 2 + 34, h - 14, true)
        ctx.fillStyle = '#5a8a3a'                              // reeds in the corners
        for (const [rx, ry] of [[44, 44], [w - 50, 46], [46, h - 56]]) {
            for (let i = 0; i < 4; i++) ctx.fillRect(rx + i * 3, ry - (i % 2) * 4, 1.5, 10)
        }
    } else if (id === 'cemetery') {
        // three steep royal pyramids, each with a small chapel at its front, inside a low wall
        rect(2, h - 12, w - 4, 8, sandDark)
        rect(2, h - 12, w - 4, 3, sandMid)
        const pyr: [number, number, number, number][] = [[6, 30, 70, 120], [110, 20, 76, 132], [62, 70, 72, 104]]
        for (const [px, py, pw, ph] of pyr) {
            ctx.save()
            ctx.translate(px, py)
            paintPyramid(ctx, pw, ph)
            ctx.restore()
            // the chapel in front: a little pylon gateway
            const cx = px + pw / 2
            const cy = py + ph
            pylon(cx - 16, cy - 18, 12, 18)
            pylon(cx + 4, cy - 18, 12, 18)
            rect(cx - 4, cy - 14, 8, 14, '#5a3d0a')
        }
    } else if (id === 'temple') {
        // the Temple of Amun: a great pylon gateway with flags, a columned hall behind, and an avenue of rams
        box(30, 6, w - 60, 96, 16, '#d6b98a', sand)            // the hall behind the gate
        for (let i = 0; i < 6; i++) column(48 + i * ((w - 96) / 5), 34, 100)
        rect(30, 6, w - 60, 4, '#c9a227')
        // the pylon gateway
        pylon(18, 70, 110, 110)
        pylon(w - 128, 70, 110, 110)
        rect(126, 96, w - 252, 84, sandDark)                  // the gate between the towers
        rect(w / 2 - 16, 116, 32, 64, '#3a2a1a')
        rect(w / 2 - 20, 108, 40, 8, '#c9a227')               // a gold winged sun over the door
        poly([w / 2 - 34, 112, w / 2 - 20, 108, w / 2 - 20, 116], '#c9a227')
        poly([w / 2 + 34, 112, w / 2 + 20, 108, w / 2 + 20, 116], '#c9a227')
        for (const fx of [34, 108, w - 108, w - 34]) {        // flagpoles with red flags
            rect(fx, 40, 3, 60, '#6b4226')
            const flap = Math.sin(time / 300 + fx) * 3
            poly([fx + 3, 42, fx + 18, 46 + flap, fx + 3, 52], '#b0412e')
        }
        // the avenue of rams leading to the gate
        for (let i = 0; i < 3; i++) {
            ram(w / 2 - 44, 196 + i * 20)
            ram(w / 2 + 44, 196 + i * 20)
        }
        rect(w / 2 - 22, 182, 44, h - 186, 'rgba(255, 240, 200, 0.25)')   // the paved way
    } else if (id === 'baths') {
        // the Royal Baths: a pool with patterned tiles, columns all around, and water spouting from lion heads
        rect(4, 4, w - 8, h - 8, '#d9c39a')                   // the floor
        rect(4, 4, w - 8, 10, '#b88456')                      // the back wall
        rect(4, 4, w - 8, 3, '#c9a227')
        const px = 40
        const py = 46
        const pw = w - 80
        const ph = h - 96
        rect(px - 6, py - 6, pw + 12, ph + 12, '#7aa8b8')    // the blue tiled edge
        water(px, py, pw, ph, '#1f6f94', '#5ab8d4')
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'        // tiles under the water
        ctx.lineWidth = 1
        for (let gx = px + 16; gx < px + pw; gx += 16) {
            ctx.beginPath()
            ctx.moveTo(gx, py)
            ctx.lineTo(gx, py + ph)
            ctx.stroke()
        }
        for (let gy = py + 16; gy < py + ph; gy += 16) {
            ctx.beginPath()
            ctx.moveTo(px, gy)
            ctx.lineTo(px + pw, gy)
            ctx.stroke()
        }
        for (let i = 0; i < 3; i++) {                          // lion-head spouts on the back edge, with water arcs
            const sx = px + pw * (0.25 + i * 0.25)
            rect(sx - 5, py - 12, 10, 8, sandDark)
            ctx.strokeStyle = 'rgba(200, 235, 255, 0.8)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(sx, py - 5)
            ctx.quadraticCurveTo(sx + 4, py + 2, sx + 2, py + 10 + Math.sin(time / 150 + i) * 1.5)
            ctx.stroke()
        }
        for (let i = 0; i < 6; i++) {                          // columns along both sides
            column(18, 30 + i * ((h - 60) / 5), 30 + i * ((h - 60) / 5) + 22)
            column(w - 18, 30 + i * ((h - 60) / 5), 30 + i * ((h - 60) / 5) + 22)
        }
        rect(w / 2 - 20, h - 40, 40, 30, '#d9c39a')           // steps into the pool
        for (let i = 0; i < 3; i++) rect(w / 2 - 20, h - 46 + i * 6, 40, 3, '#b8a07a')
    } else {
        // the Royal Enclosure: thick walls with towers, and the palace of the Kandake inside
        rect(0, 10, w, h - 10, '#b48a58')                     // outer wall
        rect(14, 24, w - 28, h - 38, '#d8c294')               // the courtyard inside
        rect(0, 10, w, 4, '#c9a46a')
        for (let i = 0; i < w; i += 14) rect(i, 4, 8, 7, '#b48a58')   // the wall's top
        for (const [tx, ty] of [[0, 0], [w - 28, 0], [0, h - 40], [w - 28, h - 40]]) {   // corner towers
            box(tx, ty, 28, 40, 8, '#a87e4c', '#c9a46a')
            rect(tx + 10, ty + 18, 8, 10, '#3b2414')
        }
        // the palace: a wide lower floor and a smaller upper floor
        box(54, 60, w - 108, 120, 14, '#e8d8b0', '#c9a46a')
        box(94, 30, w - 188, 44, 12, '#efe2c4', '#c9a46a')
        rect(54, 60, w - 108, 4, '#c9a227')                   // gold trim
        rect(94, 30, w - 188, 4, '#c9a227')
        for (let i = 0; i < 7; i++) {                          // windows
            const wx = 70 + i * ((w - 150) / 6)
            rect(wx, 92, 10, 14, '#3b2414')
            rect(wx - 1, 106, 12, 2, '#c9a227')
        }
        for (let i = 0; i < 4; i++) rect(112 + i * ((w - 234) / 3), 52, 8, 10, '#3b2414')
        pylon(w / 2 - 44, 132, 30, 48)                        // the palace gate
        pylon(w / 2 + 14, 132, 30, 48)
        rect(w / 2 - 14, 146, 28, 34, '#3b2414')
        rect(w / 2 - 16, 140, 32, 6, '#c9a227')
        rect(w / 2 - 16, h - 14, 32, 14, '#3b2414')           // the main gate in the outer wall
        rect(w / 2 - 20, h - 18, 40, 4, '#c9a227')
    }
    ctx.restore()

    if (progress < 1) {
        // --- building site: foundation stones, scaffolding, workers and dust ---
        const rise = Math.max(0, (progress - 0.12) / 0.88)
        const top = y + h * (1 - rise)
        ctx.save()
        // the foundation: a ring of stones laid out around the plot, appearing one by one
        const stones = Math.floor(Math.min(1, progress / 0.12) * ((w + h) / 8))
        ctx.fillStyle = '#a5814c'
        for (let i = 0; i < stones; i++) {
            const t = i / ((w + h) / 8)
            const along = t * 2 * (w + h)
            let sx: number
            let sy: number
            if (along < w) { sx = x + along; sy = y + h - 8 }
            else if (along < w + h) { sx = x + w - 8; sy = y + h - (along - w) }
            else if (along < 2 * w + h) { sx = x + w - (along - w - h); sy = y }
            else { sx = x; sy = y + (along - 2 * w - h) }
            ctx.fillRect(sx, sy, 7, 7)
        }
        // piles of stone and bricks waiting by the plot
        ctx.fillStyle = '#c9a46a'
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 6 + (i % 2) * 9, y + h + 2 + Math.floor(i / 2) * -6, 8, 5)
        if (rise > 0) {
            // wooden scaffolding up to just above the walls
            ctx.strokeStyle = '#8a5a2b'
            ctx.lineWidth = 3
            const poles = Math.max(3, Math.round(w / 48))
            const scaffoldTop = Math.max(y - 10, top - 16)
            for (let i = 0; i <= poles; i++) {
                const px = x + 4 + (i * (w - 8)) / poles
                ctx.beginPath()
                ctx.moveTo(px, y + h)
                ctx.lineTo(px, scaffoldTop)
                ctx.stroke()
            }
            ctx.lineWidth = 4
            ctx.strokeStyle = '#a0703a'
            for (let py = y + h - 20; py > scaffoldTop; py -= 26) {   // planks to stand on
                ctx.beginPath()
                ctx.moveTo(x, py)
                ctx.lineTo(x + w, py)
                ctx.stroke()
            }
            ctx.lineWidth = 1.5
            ctx.strokeStyle = 'rgba(110, 70, 30, 0.8)'
            for (let i = 0; i < poles; i++) {                        // cross braces
                const x1 = x + 4 + (i * (w - 8)) / poles
                const x2 = x + 4 + ((i + 1) * (w - 8)) / poles
                ctx.beginPath()
                ctx.moveTo(x1, y + h)
                ctx.lineTo(x2, Math.max(scaffoldTop, y + h - 60))
                ctx.stroke()
            }
            // a few workers walking back and forth on the planks, carrying stones
            const workers = Math.max(2, Math.round(w / 90))
            for (let i = 0; i < workers; i++) {
                const plank = y + h - 20 - 26 * (i % Math.max(1, Math.floor((y + h - scaffoldTop) / 26)))
                const walk = (Math.sin(time / (1400 + i * 300) + i * 2) + 1) / 2
                const wx = x + 10 + walk * (w - 40)
                const goingRight = Math.cos(time / (1400 + i * 300) + i * 2) > 0
                drawPerson(ctx, wx, plank - 20, 20, { skin: i % 2 ? '#6b4226' : '#8d5a3b', cloth: '#f3ead6', accent: '#a5814c', outfit: 'kilt', hair: i % 2 ? 'bald' : 'short' }, goingRight ? 'right' : 'left', true, time + i * 500)
                ctx.fillStyle = '#d0aa6c'
                ctx.fillRect(wx + 4, plank - 34, 12, 6)                 // the stone on their head
            }
        }
        // dust puffing up at the bottom
        for (let i = 0; i < 4; i++) {
            const t = ((time / 1200) + i / 4) % 1
            ctx.fillStyle = `rgba(230, 210, 170, ${0.4 * (1 - t)})`
            ctx.beginPath()
            ctx.arc(x + ((i * 71) % w), y + h - t * 26, 5 + t * 9, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.restore()
    }
}

// The hotbar along the bottom of the screen. Keys 1-9 (or the mouse wheel) pick a slot.
export function drawHotbar(ctx: CanvasRenderingContext2D, w: number, h: number, pack: (Slot | null)[], selected: number, age: number) {
    ctx.save()
    const size = 44
    const gap = 4
    const total = HOTBAR_SLOTS * size + (HOTBAR_SLOTS - 1) * gap
    const x0 = Math.round((w - total) / 2)
    const y = h - size - 16

    ctx.fillStyle = 'rgba(14, 9, 5, 0.65)'
    ctx.beginPath()
    ctx.roundRect(x0 - 8, y - 8, total + 16, size + 16, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.55)'
    ctx.lineWidth = 2
    ctx.stroke()

    for (let i = 0; i < HOTBAR_SLOTS; i++) {
        const x = x0 + i * (size + gap)
        drawSlot(ctx, x, y, size, pack[i], hovering(x, y, size, size))
        ctx.font = `700 11px ${FONT_TITLE}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.fillText(String(i + 1), x + 5, y + 4)
        if (i === selected) {
            ctx.strokeStyle = '#e8c75a'
            ctx.lineWidth = 3
            ctx.strokeRect(x - 1.5, y - 1.5, size + 3, size + 3)
        }
        addButton('hotbar:' + i, x, y, size, size)
    }

    // the name of the selected item shows for a moment when you change slots
    const slot = pack[selected]
    if (slot && age < 2500) {
        ctx.globalAlpha = Math.min(1, (2500 - age) / 500)
        ctx.font = `700 14px ${FONT_TITLE}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#000'
        ctx.fillText(slot.name.toUpperCase(), w / 2 + 1, y - 15)
        ctx.fillStyle = '#f3ead6'
        ctx.fillText(slot.name.toUpperCase(), w / 2, y - 16)
    }
    ctx.restore()
}

// The item stuck to the mouse cursor
export function drawHeld(ctx: CanvasRenderingContext2D, slot: Slot) {
    ctx.save()
    const ix = pointer.x - TILE / 2
    drawItem(ctx, ix, pointer.y - TILE / 2, slot.color, -ix * 300, slot.id)
    if (slot.count > 1) {
        ctx.font = `700 14px ${FONT_TITLE}`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#000'
        ctx.fillText(String(slot.count), pointer.x + 17, pointer.y + 17)
        ctx.fillStyle = '#fff'
        ctx.fillText(String(slot.count), pointer.x + 16, pointer.y + 16)
    }
    ctx.restore()
}

// The box that appears next to the mouse and tells you about the item under it
export function drawTooltip(ctx: CanvasRenderingContext2D, w: number, h: number, slot: Slot) {
    ctx.save()
    const bw = 330
    ctx.font = `600 16px ${FONT_BODY}`
    const lines = wrapText(ctx, slot.fact, bw - 28)
    const bh = 20 + 26 + lines.length * 20 + 12
    let tx = pointer.x + 18
    let ty = pointer.y + 18
    if (tx + bw > w - 8) tx = pointer.x - bw - 12
    if (ty + bh > h - 8) ty = h - 8 - bh
    if (tx < 8) tx = 8
    if (ty < 8) ty = 8

    ctx.fillStyle = 'rgba(14, 9, 5, 0.96)'
    ctx.beginPath()
    ctx.roundRect(tx, ty, bw, bh, 6)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `700 14px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText(slot.name.toUpperCase(), tx + 14, ty + 26)
    if (slot.count > 1) {
        ctx.textAlign = 'right'
        ctx.fillStyle = '#c9b98a'
        ctx.fillText('x' + slot.count, tx + bw - 14, ty + 26)
        ctx.textAlign = 'left'
    }
    ctx.font = `600 16px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    lines.forEach((line, i) => ctx.fillText(line, tx + 14, ty + 50 + i * 20))
    ctx.restore()
}

// A short message pill near the top of the screen, like "New Codex entry unlocked".
export function drawNotice(ctx: CanvasRenderingContext2D, w: number, text: string, age: number) {
    const fadeIn = Math.min(1, age / 250)
    const fadeOut = Math.min(1, Math.max(0, (3500 - age) / 500))
    const alpha = Math.min(fadeIn, fadeOut)
    if (alpha <= 0) return

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = `600 18px ${FONT_BODY}`
    const bw = Math.min(w - 40, ctx.measureText(text).width + 56)
    const bx = (w - bw) / 2
    const by = 118
    ctx.fillStyle = 'rgba(26, 17, 10, 0.94)'
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, 38, 19)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    diamond(ctx, bx + 18, by + 19, 5)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f3ead6'
    ctx.fillText(text, w / 2 + 8, by + 20)
    ctx.restore()
}

// A spot on the quest map.
export interface MapMarker {
    col: number
    row: number
    kind: 'villager' | 'quest' | 'resource' | 'chest'
    label?: string
    color?: string
}

const MAP_COLORS: Record<string, string> = {
    '~': '#2f86c8',   // water
    '.': '#e8d3a0',   // sand
    d: '#dcbf7a',     // dune
    g: '#8fb05c',     // grass
    f: '#cbbd98',     // paving
    '=': '#b99456',   // road
    k: '#7b5632',     // field
    r: '#5f9f3a',     // reeds
    H: '#a9714b',     // house
    P: '#c9974f',     // pyramid
    T: '#e8d3a0',     // palm (a green dot is drawn on top)
    S: '#8d8a84',     // stela
    W: '#a9714b',     // mud wall
    '#': '#bfa57a',   // stone wall
    c: '#c7a972',     // column
    G: '#b08a52',     // pylon
    b: '#8f8a80',     // boulder
    a: '#c9a76f',     // sphinx
    x: '#cbbd98',     // brazier
    w: '#2f6f9b',     // well
    t: '#b8452e',     // tent
    M: '#b8452e',     // market stall
    B: '#a8723f',     // rock mesa
    i: '#3a3532',     // slag heap
}

// The land of the map overlay is painted once into a hidden canvas (there are thousands of tiles)
let mapCache: { rows: string[]; ts: number; canvas: HTMLCanvasElement } | null = null

// Where the map was last drawn, so main.ts can turn a click into a tile
export const mapView = { ox: 0, oy: 0, ts: 1 }

export function drawQuestMap(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    mapRows: string[],
    markers: MapMarker[],
    playerCol: number,
    playerRow: number,
    facing: Facing,
    regions: { name: string; col0: number; col1: number; row0: number; row1: number }[],
    waypoint: { col: number; row: number } | null,
    time: number,
) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.85)'
    ctx.fillRect(0, 0, w, h)

    const cols = mapRows[0].length
    const ts = Math.max(3, Math.floor(Math.min((w - 100) / cols, (h - 170) / mapRows.length)))
    const mw = cols * ts
    const mh = mapRows.length * ts
    const ox = Math.round((w - mw) / 2)
    const oy = Math.round((h - mh) / 2) + 6
    mapView.ox = ox
    mapView.oy = oy
    mapView.ts = ts

    // frame
    ctx.fillStyle = 'rgba(26, 17, 10, 0.97)'
    ctx.beginPath()
    ctx.roundRect(ox - 18, oy - 58, mw + 36, mh + 112, 10)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 20px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('WORLD MAP', w / 2, oy - 32)
    drawCloseButton(ctx, ox - 18, oy - 58, mw + 36)

    // the land
    if (!mapCache || mapCache.rows !== mapRows || mapCache.ts !== ts) {
        const canvas = document.createElement('canvas')
        canvas.width = cols * ts
        canvas.height = mapRows.length * ts
        const m = canvas.getContext('2d')!
        mapRows.forEach((line, r) => {
            for (let c = 0; c < line.length; c++) {
                const ch = line[c]
                m.fillStyle = MAP_COLORS[ch] ?? MAP_COLORS['.']
                m.fillRect(c * ts, r * ts, ts, ts)
                if (ch === 'T') {
                    m.fillStyle = '#3f8f3f'
                    m.beginPath()
                    m.arc(c * ts + ts / 2, r * ts + ts / 2, ts * 0.38, 0, Math.PI * 2)
                    m.fill()
                }
            }
        })
        mapCache = { rows: mapRows, ts, canvas }
    }
    ctx.drawImage(mapCache.canvas, ox, oy)

    addButton('map', ox, oy, mw, mh)   // click anywhere on the land to set a waypoint

    // the names of the lands, near the top of each one
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const r of regions) {
        const name = r.name.toUpperCase()
        const areaW = (r.col1 - r.col0 + 1) * ts
        const size = Math.max(10, Math.min(20, Math.floor(areaW / (name.length * 0.85))))
        ctx.font = `700 ${size}px ${FONT_TITLE}`
        const lx = ox + ((r.col0 + r.col1 + 1) / 2) * ts
        const ly = oy + r.row0 * ts + size + 4
        ctx.lineWidth = 4
        ctx.lineJoin = 'round'
        ctx.strokeStyle = 'rgba(26, 17, 10, 0.85)'
        ctx.strokeText(name, lx, ly)
        ctx.fillStyle = 'rgba(255, 238, 190, 0.95)'
        ctx.fillText(name, lx, ly)
    }

    // villagers: a dot and a name
    // materials (with the copper mirror) and chests (with the hunting bow)
    for (const m of markers) {
        if (m.kind !== 'resource' && m.kind !== 'chest') continue
        const mx = ox + m.col * ts + ts / 2
        const my = oy + m.row * ts + ts / 2
        const r = Math.max(2.5, ts * 0.45)
        ctx.fillStyle = m.kind === 'chest' ? '#8a5a2b' : m.color ?? '#ffffff'
        ctx.strokeStyle = m.kind === 'chest' ? '#e8c75a' : 'rgba(26, 17, 10, 0.8)'
        ctx.lineWidth = 1
        ctx.fillRect(mx - r, my - r, r * 2, r * 2)
        ctx.strokeRect(mx - r, my - r, r * 2, r * 2)
    }

    for (const m of markers) {
        if (m.kind !== 'villager') continue
        const mx = ox + m.col * ts + ts / 2
        const my = oy + m.row * ts + ts / 2
        ctx.fillStyle = '#f3ead6'
        ctx.strokeStyle = '#2a1a08'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(mx, my, Math.max(3, ts * 0.38), 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        if (m.label) {
            ctx.font = `700 9px ${FONT_TITLE}`
            ctx.fillStyle = '#fff3d0'
            ctx.strokeStyle = '#2a1a08'
            ctx.lineWidth = 3
            ctx.strokeText(m.label.toUpperCase(), mx, my - ts * 0.9 - 4)
            ctx.fillText(m.label.toUpperCase(), mx, my - ts * 0.9 - 4)
        }
    }

    // quest goals: a pulsing gold diamond
    const pulse = 1 + Math.sin(time / 250) * 0.18
    for (const m of markers) {
        if (m.kind !== 'quest') continue
        const mx = ox + m.col * ts + ts / 2
        const my = oy + m.row * ts + ts / 2
        const r = Math.max(5, ts * 0.8) * pulse
        ctx.fillStyle = '#e8c75a'
        ctx.strokeStyle = '#6e4d0f'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(mx, my - r)
        ctx.lineTo(mx + r, my)
        ctx.lineTo(mx, my + r)
        ctx.lineTo(mx - r, my)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
    }

    // your waypoint: a gold pin
    if (waypoint) {
        const wx = ox + waypoint.col * ts + ts / 2
        const wy = oy + waypoint.row * ts + ts / 2
        const bob = Math.sin(time / 250) * 2
        ctx.fillStyle = '#e8c75a'
        ctx.strokeStyle = '#1a110a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(wx, wy + bob)                          // the point of the pin
        ctx.arc(wx, wy - 14 + bob, 7, Math.PI * 0.75, Math.PI * 0.25)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#1a110a'
        ctx.beginPath()
        ctx.arc(wx, wy - 14 + bob, 2.5, 0, Math.PI * 2)
        ctx.fill()
    }

    // you: a navigation arrow pointing the way you face, with a pulsing glow under it
    {
        const mx = ox + playerCol * ts + ts / 2
        const my = oy + playerRow * ts + ts / 2
        const s = Math.max(11, ts * 2.2)
        const pulse = (time % 1600) / 1600
        ctx.fillStyle = `rgba(232, 199, 90, ${0.45 * (1 - pulse)})`
        ctx.beginPath()
        ctx.arc(mx, my, s * (0.8 + pulse * 1.2), 0, Math.PI * 2)
        ctx.fill()
        const angle = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[facing]
        ctx.save()
        ctx.translate(mx, my)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, -s)
        ctx.lineTo(s * 0.75, s * 0.8)
        ctx.lineTo(0, s * 0.35)
        ctx.lineTo(-s * 0.75, s * 0.8)
        ctx.closePath()
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#1a110a'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()
    }

    // legend
    const ly = oy + mh + 28
    ctx.textAlign = 'left'
    ctx.font = `600 16px ${FONT_BODY}`
    ctx.fillStyle = '#e8c75a'
    diamond(ctx, ox + 8, ly, 6)
    ctx.fillStyle = '#f3ead6'
    ctx.fillText('Quest goal', ox + 22, ly)
    ctx.beginPath()
    ctx.arc(ox + 140, ly, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText('Villager', ox + 152, ly)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(ox + 250, ly, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f3ead6'
    ctx.fillText('You', ox + 262, ly)
    ctx.textAlign = 'right'
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('CLICK: WAYPOINT    M: CLOSE', ox + mw, ly)
    ctx.restore()
}


// ---------------------------------------------------------------------------
// Treasure chests and the Codex
// ---------------------------------------------------------------------------

// A wooden chest with gold bands. (x, y) is the top-left corner of its tile.
export function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean, time: number) {
    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 12, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // the box
    ctx.fillStyle = '#7a4a24'
    ctx.fillRect(x + 6, y + 15, 20, 11)
    ctx.fillStyle = '#5b3416'
    ctx.fillRect(x + 6, y + 23, 20, 3)
    ctx.fillStyle = '#d4a82a'
    ctx.fillRect(x + 9, y + 15, 3, 11)
    ctx.fillRect(x + 20, y + 15, 3, 11)

    if (open) {
        // dark inside with a golden glow, and the lid tipped back
        ctx.fillStyle = '#2a1a08'
        ctx.fillRect(x + 7, y + 15, 18, 3)
        ctx.fillStyle = 'rgba(240, 211, 110, 0.55)'
        ctx.fillRect(x + 10, y + 15, 12, 2)
        ctx.fillStyle = '#8b5a2b'
        ctx.beginPath()
        ctx.moveTo(x + 6, y + 15)
        ctx.lineTo(x + 9, y + 6)
        ctx.lineTo(x + 23, y + 6)
        ctx.lineTo(x + 26, y + 15)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#d4a82a'
        ctx.fillRect(x + 9, y + 7, 3, 7)
        ctx.fillRect(x + 20, y + 7, 3, 7)
    } else {
        // rounded lid, a lock, and a sparkle so you notice it
        ctx.fillStyle = '#8b5a2b'
        ctx.beginPath()
        ctx.roundRect(x + 6, y + 8, 20, 9, [6, 6, 0, 0])
        ctx.fill()
        ctx.fillStyle = '#d4a82a'
        ctx.fillRect(x + 9, y + 9, 3, 8)
        ctx.fillRect(x + 20, y + 9, 3, 8)
        ctx.fillStyle = '#f0d36e'
        ctx.fillRect(x + 14, y + 14, 4, 5)
        const s = (Math.sin(time / 220 + x) + 1) / 2
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.6 * s})`
        diamond(ctx, x + 25, y + 6, 2 + s * 2)
    }
}

// One page of the Codex.
export interface CodexEntry {
    id: string
    name: string
    years: string
    relation: string
    summary: string
    unlocked: boolean
}

// The Codex: two tabs (Kush, and the world around it), a list on the left, and the selected page on the right
export function drawCodex(ctx: CanvasRenderingContext2D, w: number, h: number, entries: CodexEntry[], selected: number, tab: string, time: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.85)'
    ctx.fillRect(0, 0, w, h)

    const pw = Math.min(960, w - 40)
    const ph = Math.min(560, h - 40)
    const px = (w - pw) / 2
    const py = (h - ph) / 2
    drawPanel(ctx, px, py, pw, ph)
    addButton('panel', px, py, pw, ph)
    drawCloseButton(ctx, px, py, pw)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 22px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('CODEX', w / 2, py + 32)

    // the two tabs
    const tabs: [string, string][] = [['kush', 'THE KINGDOM OF KUSH'], ['world', 'THE WORLD AROUND KUSH']]
    const tw = Math.min(250, (pw - 80) / 2)
    tabs.forEach(([id, label], i) => {
        const tx = w / 2 - tw - 6 + i * (tw + 12)
        const ty = py + 54
        const on = tab === id
        ctx.fillStyle = on ? '#e8c75a' : hovering(tx, ty, tw, 30) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)'
        ctx.beginPath()
        ctx.roundRect(tx, ty, tw, 30, 15)
        ctx.fill()
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.font = `700 12px ${FONT_TITLE}`
        ctx.fillStyle = on ? '#1a110a' : '#e8c75a'
        ctx.fillText(label, tx + tw / 2, ty + 15)
        addButton('codex-tab-' + id, tx, ty, tw, 30)
    })
    const found = entries.filter(e => e.unlocked).length
    ctx.font = `600 15px ${FONT_BODY}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText(`Pages discovered: ${found} of ${entries.length}`, w / 2, py + 100)

    // the list on the left
    const listX = px + 24
    const listW = Math.min(240, pw * 0.27)
    const rowH = Math.min(46, (ph - 160) / Math.max(1, entries.length))
    entries.forEach((entry, i) => {
        const ry = py + 120 + i * rowH
        const rh = rowH - 6
        const on = i === selected
        addButton('codex-entry-' + i, listX, ry, listW, rh)
        ctx.fillStyle = on ? 'rgba(201, 162, 39, 0.18)' : hovering(listX, ry, listW, rh) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.04)'
        ctx.beginPath()
        ctx.roundRect(listX, ry, listW, rh, 6)
        ctx.fill()
        ctx.strokeStyle = on ? '#e8c75a' : 'rgba(201, 162, 39, 0.3)'
        ctx.lineWidth = on ? 2 : 1
        ctx.stroke()
        ctx.textAlign = 'left'
        ctx.font = `700 12px ${FONT_TITLE}`
        ctx.fillStyle = entry.unlocked ? '#f3ead6' : '#6e6350'
        ctx.fillText(entry.unlocked ? entry.name.toUpperCase() : '???', listX + 14, ry + rh / 2)
    })

    // the page on the right: a picture in the top right corner, the text beside and below it
    const pageX = listX + listW + 28
    const pageW = px + pw - 26 - pageX
    const entry = entries[selected]
    if (entry) {
        const picW = Math.min(230, pageW * 0.42)
        const picH = Math.round(picW * 0.72)
        const picX = pageX + pageW - picW
        const picY = py + 120
        drawCodexPicture(ctx, picX, picY, picW, picH, entry.id, !entry.unlocked, time)
        const textW = pageW - picW - 22

        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        if (entry.unlocked) {
            ctx.font = `700 22px ${FONT_TITLE}`
            ctx.fillStyle = '#e8c75a'
            const nameLines = wrapText(ctx, entry.name.toUpperCase(), textW)
            nameLines.forEach((l, i) => ctx.fillText(l, pageX, py + 134 + i * 26))
            const top = py + 134 + (nameLines.length - 1) * 26   // everything below moves down if the name takes 2 lines
            ctx.font = `700 11px ${FONT_TITLE}`
            ctx.fillStyle = '#c9b98a'
            ctx.fillText(entry.years.toUpperCase(), pageX, top + 32)
            ctx.fillText(entry.relation.toUpperCase(), pageX, top + 50)
            ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(pageX, top + 66)
            ctx.lineTo(pageX + textW, top + 66)
            ctx.stroke()
            // the text runs beside the picture, then uses the full width once it is below it
            ctx.textBaseline = 'alphabetic'
            ctx.font = `600 19px ${FONT_BODY}`
            ctx.fillStyle = '#f3ead6'
            let lineY = top + 94
            let line = ''
            const widthAt = (yy: number) => (yy - 18 < picY + picH + 6 ? textW : pageW)
            for (const word of entry.summary.split(' ')) {
                const test = line ? line + ' ' + word : word
                if (line && ctx.measureText(test).width > widthAt(lineY)) {
                    ctx.fillText(line, pageX, lineY)
                    lineY += 25
                    line = word
                } else {
                    line = test
                }
            }
            if (line) ctx.fillText(line, pageX, lineY)
        } else {
            ctx.font = `700 22px ${FONT_TITLE}`
            ctx.fillStyle = '#6e6350'
            ctx.fillText('UNDISCOVERED', pageX, py + 134)
            ctx.textBaseline = 'alphabetic'
            ctx.font = `600 19px ${FONT_BODY}`
            ctx.fillStyle = '#c9b98a'
            const hint = tab === 'kush'
                ? 'Find relics of Kush in treasure chests, or craft goods in Meroë, to unlock this page.'
                : 'Find treasure chests hidden around the land. Objects from other civilizations will unlock their pages.'
            wrapText(ctx, hint, textW).forEach((l, i) => ctx.fillText(l, pageX, py + 180 + i * 25))
        }
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('UP / DOWN: BROWSE      LEFT / RIGHT: SWITCH TAB      C OR ESC: CLOSE', w / 2, py + ph - 18)
    ctx.restore()
}

// ---------------------------------------------------------------------------
// The banner that appears when you cross into a new region
// ---------------------------------------------------------------------------

// age = milliseconds since the banner appeared. It fades in, stays, then fades out.
export function drawRegionBanner(ctx: CanvasRenderingContext2D, w: number, title: string, subtitle: string, age: number) {
    const fadeIn = Math.min(1, age / 400)
    const fadeOut = Math.min(1, Math.max(0, (3400 - age) / 600))
    const alpha = Math.min(fadeIn, fadeOut)
    if (alpha <= 0) return

    const bw = Math.min(560, w - 40)
    const bh = 84
    const bx = (w - bw) / 2
    const by = 18 - (1 - fadeIn) * 20   // slides down a little as it fades in

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(26, 17, 10, 0.92)'
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 8)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    for (const [cx, cy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) {
        diamond(ctx, cx, cy, 4)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('ENTERING', w / 2, by + 18)
    ctx.font = `700 24px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText(title.toUpperCase(), w / 2, by + 42)
    ctx.font = `600 16px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    ctx.fillText(subtitle, w / 2, by + 67)
    ctx.restore()
}

// A column of gold light standing on your waypoint (drawn in the world)
export function drawWaypointBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    const glow = 0.35 + Math.sin(time / 300) * 0.15
    const grad = ctx.createLinearGradient(0, y - 160, 0, y + 16)
    grad.addColorStop(0, 'rgba(232, 199, 90, 0)')
    grad.addColorStop(1, `rgba(232, 199, 90, ${glow})`)
    ctx.fillStyle = grad
    ctx.fillRect(x + 8, y - 160, 16, 176)
    ctx.fillStyle = '#e8c75a'
    diamond(ctx, x + 16, y + 16, 6)
}

// An arrow at the edge of the screen pointing to the waypoint when it is off screen.
// (dx, dy) is the direction to the waypoint, `tiles` is how far away it is.
export function drawWaypointArrow(ctx: CanvasRenderingContext2D, w: number, h: number, dx: number, dy: number, tiles: number) {
    const angle = Math.atan2(dy, dx)
    // push the arrow out from the middle until it reaches the edge (with a margin)
    const margin = 50
    const scale = Math.min((w / 2 - margin) / Math.abs(Math.cos(angle) || 0.001), (h / 2 - margin) / Math.abs(Math.sin(angle) || 0.001))
    const ax = w / 2 + Math.cos(angle) * scale
    const ay = h / 2 + Math.sin(angle) * scale
    ctx.save()
    ctx.translate(ax, ay)
    ctx.rotate(angle)
    ctx.fillStyle = '#e8c75a'
    ctx.strokeStyle = '#1a110a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(16, 0)
    ctx.lineTo(-10, -12)
    ctx.lineTo(-4, 0)
    ctx.lineTo(-10, 12)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 13px ${FONT_TITLE}`
    ctx.fillStyle = '#1a110a'
    ctx.fillText(tiles + 'm', ax + 1, ay + 23)
    ctx.fillStyle = '#f6dc82'
    ctx.fillText(tiles + 'm', ax, ay + 22)
    ctx.restore()
}

// One small arrow of the trail that leads to your waypoint (drawn on the ground)
export function drawPathArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, alpha: number) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#f6dc82'
    ctx.strokeStyle = 'rgba(26, 17, 10, 0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(7, 0)
    ctx.lineTo(-5, -6)
    ctx.lineTo(-2, 0)
    ctx.lineTo(-5, 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
}

// The timer over a building that is going up: a small panel with the time left and a progress bar
export function drawBuildTimer(ctx: CanvasRenderingContext2D, cx: number, cy: number, name: string, secondsLeft: number, progress: number) {
    ctx.save()
    const w = 170
    const x = cx - w / 2
    ctx.fillStyle = 'rgba(26, 17, 10, 0.9)'
    ctx.beginPath()
    ctx.roundRect(x, cy - 22, w, 40, 8)
    ctx.fill()
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 10px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    const m = Math.floor(secondsLeft / 60)
    const sec = Math.ceil(secondsLeft % 60)
    ctx.fillText('BUILDING ' + name.toUpperCase(), cx, cy - 11)
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#f3ead6'
    ctx.fillText(m + ':' + String(sec === 60 ? 59 : sec).padStart(2, '0'), cx, cy + 3)
    ctx.fillStyle = 'rgba(201, 162, 39, 0.25)'
    ctx.fillRect(x + 10, cy + 11, w - 20, 3)
    ctx.fillStyle = '#e8c75a'
    ctx.fillRect(x + 10, cy + 11, (w - 20) * progress, 3)
    ctx.restore()
}
