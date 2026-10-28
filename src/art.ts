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
export type Outfit = 'kilt' | 'robe' | 'dress'
export type Hair = 'short' | 'braids' | 'bald' | 'headwrap'

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
    ctx.fillStyle = '#2f86c8'
    ctx.fillRect(x, y, TILE, TILE)
    ctx.fillStyle = '#3a95d8'
    ctx.fillRect(x, y + 16, TILE, 16)

    // gently moving waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    for (let i = 0; i < 2; i++) {
        const wy = y + 9 + i * 14
        const shift = Math.sin(time / 600 + col * 0.5 + row * 0.8 + i * 2) * 4
        ctx.beginPath()
        ctx.moveTo(x + 5 + shift, wy)
        ctx.quadraticCurveTo(x + 12 + shift, wy - 3, x + 19 + shift, wy)
        ctx.stroke()
    }

    // foam where the water meets the shore
    if (n.right !== '~') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.fillRect(x + TILE - 4, y, 4, TILE)
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

// A mud-brick house. Bigger buildings get more doors and windows.
function paintHouse(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // mud-brick walls
    ctx.fillStyle = '#c9915f'
    ctx.fillRect(0, 0, w, h)

    // brick rows (staggered)
    ctx.fillStyle = 'rgba(90, 50, 20, 0.28)'
    let r = 0
    for (let by = 14; by < h; by += 6) {
        ctx.fillRect(0, by, w, 1)
        for (let bx = r % 2 === 0 ? 5 : 10; bx < w; bx += 10) ctx.fillRect(bx, by - 6, 1, 6)
        r++
    }

    // flat roof with a shadow lip
    ctx.fillStyle = '#8a5a35'
    ctx.fillRect(0, 0, w, 9)
    ctx.fillStyle = '#6e4526'
    ctx.fillRect(0, 9, w, 2)
    ctx.fillStyle = '#a06c42'
    ctx.fillRect(0, 0, w, 2)

    // shaded right edge and bottom for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
    ctx.fillRect(w - 3, 11, 3, h - 11)
    ctx.fillRect(0, h - 2, w, 2)

    // one arched door for every 3 tiles of width
    const doors = Math.max(1, Math.round(w / 96))
    const dh = Math.min(20, h - 14)
    for (let k = 0; k < doors; k++) {
        const cx = ((k + 0.5) * w) / doors
        ctx.fillStyle = '#3b2414'
        ctx.fillRect(cx - 6, h - dh, 12, dh)
        ctx.beginPath()
        ctx.arc(cx, h - dh, 6, Math.PI, 0)
        ctx.fill()
    }

    // window slits: one row on tall houses, more rows on huge ones
    ctx.fillStyle = '#3b2414'
    for (let wy = 24; wy < h - 30; wy += 40) {
        for (let k = 0; k < doors * 2; k++) {
            ctx.fillRect(((k + 0.5) * w) / (doors * 2) - 2, wy, 4, 8)
        }
    }
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
    const long = look.outfit !== 'kilt' // robes and dresses reach the ground

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
    }

    // body
    if (look.outfit === 'kilt') {
        ctx.fillStyle = look.skin
        ctx.fillRect(-6, -22 + bob, 12, 8) // bare chest
        ctx.fillStyle = look.cloth
        ctx.fillRect(-6, -15 + bob, 12, 8) // kilt
        ctx.fillStyle = look.accent
        ctx.fillRect(-6, -9 + bob, 12, 1) // gold hem
        ctx.fillRect(-5, -22 + bob, 10, 2) // gold collar
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
    } else if (look.hair !== 'bald') {
        cap('#1c1410')
        if (look.hair === 'braids') {
            ctx.fillStyle = '#1c1410'
            ctx.fillRect(-6, -27 + bob, 2, 9)
            ctx.fillRect(4, -27 + bob, 2, 9)
            ctx.fillStyle = look.accent
            ctx.fillRect(-6, -19 + bob, 2, 2) // beads
            ctx.fillRect(4, -19 + bob, 2, 2)
        }
        ctx.fillStyle = look.accent
        ctx.fillRect(-5, -29 + bob, 10, 2) // headband
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
) {
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
    ctx.textBaseline = 'middle'
    ctx.font = `700 13px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('QUESTS', x + 16, y + 16)
    ctx.strokeStyle = '#e8c75a'
    ctx.lineWidth = 1.5
    for (let i = 0; i < total; i++) {
        const cx = x + w - 22 - (total - 1 - i) * 18
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
}


// ---------------------------------------------------------------------------
// Character designer options
// ---------------------------------------------------------------------------
export const PLAYER_SKINS = ['#5a3825', '#6b4226', '#7a4a2e', '#8d5a3b', '#a06b46', '#c28a5f']
export const OUTFITS: Outfit[] = ['kilt', 'robe', 'dress']
export const HAIRS: Hair[] = ['short', 'braids', 'bald', 'headwrap']
export const CLOTH_COLORS = ['#f3ead6', '#9b2525', '#2f6fb5', '#2e7d32', '#7b3fa0', '#e0a030']

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

// An item lying on the ground. (x, y) is the top-left corner of its tile.
export function drawItem(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number) {
    const bob = Math.sin(time / 300 + x) * 2

    // shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 27, 8, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // a lumpy rock / nugget shape
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 24 + bob)
    ctx.lineTo(x + 11, y + 15 + bob)
    ctx.lineTo(x + 19, y + 12 + bob)
    ctx.lineTo(x + 25, y + 19 + bob)
    ctx.lineTo(x + 23, y + 25 + bob)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 1
    ctx.stroke()

    // shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.fillRect(x + 14, y + 16 + bob, 4, 2)

    // twinkling sparkle so you notice it
    const s = (Math.sin(time / 200 + x * 0.3) + 1) / 2
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.6 * s})`
    diamond(ctx, x + 24, y + 11 + bob, 2 + s * 2)
}

// ---------------------------------------------------------------------------
// Full-screen screens (drawn on top of the world, after the camera is reset)
// ---------------------------------------------------------------------------

export function drawTitleScreen(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.72)'
    ctx.fillRect(0, 0, w, h)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cx = w / 2
    const cy = h / 2
    const size = Math.max(28, Math.min(84, w * 0.075))

    // the title, with a shadow and a gold gradient
    const title = 'THE RISE OF MEROË'
    ctx.font = `700 ${size}px ${FONT_TITLE}`
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillText(title, cx + 3, cy - size * 0.6 + 3)
    const grad = ctx.createLinearGradient(0, cy - size * 1.1, 0, cy - size * 0.1)
    grad.addColorStop(0, '#f6dc82')
    grad.addColorStop(1, '#b8901f')
    ctx.fillStyle = grad
    ctx.fillText(title, cx, cy - size * 0.6)

    // ornament: a line, a diamond, a line
    const oy = cy + size * 0.05
    ctx.strokeStyle = '#c9a227'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 200, oy)
    ctx.lineTo(cx - 16, oy)
    ctx.moveTo(cx + 16, oy)
    ctx.lineTo(cx + 200, oy)
    ctx.stroke()
    ctx.fillStyle = '#e8c75a'
    diamond(ctx, cx, oy, 7 + Math.sin(time / 400) * 1.5)   // the ornament pulses gently

    ctx.font = `600 ${Math.max(18, size * 0.32)}px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    ctx.fillText('A journey through the Kingdom of Kush', cx, cy + size * 0.5)

    // the start button (clicking it or pressing Enter both work)
    drawPillButton(ctx, 'title-start', 'BEGIN  (OR PRESS ENTER)', cx, cy + size * 1.3, 320, 46)

    // controls
    ctx.font = `600 17px ${FONT_BODY}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('WASD / Arrows: move      E: talk and pick up      I: inventory      M: map      C: codex', cx, h - 36)
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
    const ph = Math.min(440, h - 40)
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
    const faces: Facing[] = ['down', 'right', 'up', 'left']
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
        drawItem(ctx, ix, y + (size - TILE) / 2, slot.color, -ix * 300)
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
    const scale = Math.max(2.5, Math.min(4, (b.h - 100) / 31))
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
    stats.forEach((line, i) => ctx.fillText(line, b.x + b.w / 2, feetY + 44 + i * 17))

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
    drawItem(ctx, ix, pointer.y - TILE / 2, slot.color, -ix * 300)
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
    kind: 'villager' | 'quest'
    label?: string
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

export function drawQuestMap(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    mapRows: string[],
    markers: MapMarker[],
    playerCol: number,
    playerRow: number,
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

    // villagers: a dot and a name
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

    // you: a blinking white dot with a gold ring
    if (Math.floor(time / 350) % 2 === 0) {
        const mx = ox + playerCol * ts + ts / 2
        const my = oy + playerRow * ts + ts / 2
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#c9a227'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(mx, my, Math.max(4, ts * 0.5), 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
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
    ctx.fillText('PRESS M TO CLOSE', ox + mw, ly)
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
    name: string
    years: string
    relation: string
    summary: string
    unlocked: boolean
}

// The Codex: a list of civilizations on the left, the selected one on the right.
export function drawCodex(ctx: CanvasRenderingContext2D, w: number, h: number, entries: CodexEntry[], selected: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.85)'
    ctx.fillRect(0, 0, w, h)

    const pw = Math.min(920, w - 40)
    const ph = Math.min(540, h - 40)
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

    drawCloseButton(ctx, px, py, pw)
    const found = entries.filter(e => e.unlocked).length
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 22px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('CODEX: THE WORLD AROUND KUSH', w / 2, py + 36)
    ctx.font = `600 16px ${FONT_BODY}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText(`Civilizations discovered: ${found} of ${entries.length}`, w / 2, py + 64)

    // the list on the left
    const listX = px + 24
    const listW = Math.min(250, pw * 0.3)
    entries.forEach((entry, i) => {
        const ry = py + 92 + i * 52
        const on = i === selected
        addButton('codex-entry-' + i, listX, ry, listW, 44)
        ctx.fillStyle = on ? 'rgba(201, 162, 39, 0.18)' : hovering(listX, ry, listW, 44) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.04)'
        ctx.beginPath()
        ctx.roundRect(listX, ry, listW, 44, 6)
        ctx.fill()
        ctx.strokeStyle = on ? '#e8c75a' : 'rgba(201, 162, 39, 0.3)'
        ctx.lineWidth = on ? 2 : 1
        ctx.stroke()
        ctx.textAlign = 'left'
        ctx.font = `700 13px ${FONT_TITLE}`
        ctx.fillStyle = entry.unlocked ? '#f3ead6' : '#6e6350'
        ctx.fillText(entry.unlocked ? entry.name.toUpperCase() : '???', listX + 14, ry + 22)
    })

    // the page on the right
    const pageX = listX + listW + 30
    const pageW = px + pw - 28 - pageX
    const entry = entries[selected]
    if (entry) {
        ctx.textAlign = 'left'
        if (entry.unlocked) {
            ctx.font = `700 24px ${FONT_TITLE}`
            ctx.fillStyle = '#e8c75a'
            ctx.fillText(entry.name.toUpperCase(), pageX, py + 112)
            ctx.font = `700 12px ${FONT_TITLE}`
            ctx.fillStyle = '#c9b98a'
            ctx.fillText(`${entry.years.toUpperCase()}   |   ${entry.relation.toUpperCase()}`, pageX, py + 142)
            ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(pageX, py + 158)
            ctx.lineTo(pageX + pageW, py + 158)
            ctx.stroke()
            ctx.textBaseline = 'alphabetic'
            ctx.font = `600 21px ${FONT_BODY}`
            ctx.fillStyle = '#f3ead6'
            wrapText(ctx, entry.summary, pageW).forEach((line, i) => {
                ctx.fillText(line, pageX, py + 192 + i * 28)
            })
            ctx.textBaseline = 'middle'
        } else {
            ctx.font = `700 24px ${FONT_TITLE}`
            ctx.fillStyle = '#6e6350'
            ctx.fillText('UNDISCOVERED', pageX, py + 112)
            ctx.textBaseline = 'alphabetic'
            ctx.font = `600 21px ${FONT_BODY}`
            ctx.fillStyle = '#c9b98a'
            wrapText(ctx, 'Find treasure chests hidden around the land. Objects from other civilizations will unlock their pages.', pageW)
                .forEach((line, i) => ctx.fillText(line, pageX, py + 192 + i * 28))
            ctx.textBaseline = 'middle'
        }
    }

    ctx.textAlign = 'center'
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('UP / DOWN: BROWSE      PRESS C TO CLOSE', w / 2, py + ph - 22)
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
