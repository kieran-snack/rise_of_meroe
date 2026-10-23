/******************************************************************************
 * File:        art.ts
 * Description: All the drawing code for tiles and characters in the Rise of
 *              Meroe. Everything is drawn with canvas shapes (no image files).
 ******************************************************************************/

export const TILE = 32

export type Facing = 'up' | 'down' | 'left' | 'right'

// The characters of the tiles around one tile. Used for shorelines and to
// draw multi-tile buildings (like the 2x2 pyramids) as one picture.
export interface Neighbors {
    up: string
    down: string
    left: string
    right: string
}

export interface PersonLook {
    skin: string
    cloth: string
    accent: string
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

// Buildings are 1 or 2 tiles wide/tall in the map. This draws the WHOLE
// building as one picture, but clipped to the one tile we're working on,
// so the 2x2 pyramids and houses join up seamlessly.
// (Assumes buildings are at most 2x2 tiles.)
function drawBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    char: string,
    n: Neighbors,
    paint: (w: number, h: number) => void,
) {
    const ox = n.left === char ? 1 : 0
    const oy = n.up === char ? 1 : 0
    const w = n.left === char || n.right === char ? 2 : 1
    const h = n.up === char || n.down === char ? 2 : 1

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, TILE, TILE)
    ctx.clip()
    ctx.translate(x - ox * TILE, y - oy * TILE)
    paint(w * TILE, h * TILE)
    ctx.restore()
}

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

    // arched door in the middle
    const dh = Math.min(20, h - 14)
    ctx.fillStyle = '#3b2414'
    ctx.fillRect(w / 2 - 6, h - dh, 12, dh)
    ctx.beginPath()
    ctx.arc(w / 2, h - dh, 6, Math.PI, 0)
    ctx.fill()

    // a window slit on taller houses
    if (h >= TILE * 2) {
        ctx.fillStyle = '#3b2414'
        ctx.fillRect(w / 4 - 2, 24, 4, 8)
        ctx.fillRect((w * 3) / 4 - 2, 24, 4, 8)
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

// Draws the correct picture for one map character. `time` is in milliseconds
// and is only used for the moving water and swaying palms.
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
            drawBlock(ctx, x, y, 'H', n, (w, h) => paintHouse(ctx, w, h))
            break
        case 'P':
            drawSand(ctx, x, y, col, row, n)
            drawBlock(ctx, x, y, 'P', n, (w, h) => paintPyramid(ctx, w, h))
            break
        case 'T':
            drawSand(ctx, x, y, col, row, n)
            drawPalm(ctx, x, y, time, col)
            break
        default:
            drawSand(ctx, x, y, col, row, n)
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

    // legs (the foot on the swinging side lifts)
    ctx.fillStyle = look.skin
    ctx.fillRect(-5, -9 - Math.max(0, swing), 4, 9)
    ctx.fillRect(1, -9 - Math.max(0, -swing), 4, 9)

    // arms
    ctx.fillRect(-9, -21 + bob - swing / 2, 3, 8)
    ctx.fillRect(6, -21 + bob + swing / 2, 3, 8)

    // bare chest
    ctx.fillRect(-6, -22 + bob, 12, 8)

    // kilt, with a gold hem
    ctx.fillStyle = look.cloth
    ctx.fillRect(-6, -15 + bob, 12, 8)
    ctx.fillStyle = look.accent
    ctx.fillRect(-6, -9 + bob, 12, 1)

    // collar
    ctx.fillRect(-5, -22 + bob, 10, 2)

    // head and hair
    ctx.fillStyle = look.skin
    ctx.beginPath()
    ctx.arc(0, -27 + bob, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#1c1410'
    ctx.beginPath()
    ctx.arc(0, -28 + bob, 5, Math.PI, 0) // top half of the head
    ctx.fill()
    if (facing === 'up') {
        ctx.beginPath()
        ctx.arc(0, -27 + bob, 5, 0, Math.PI * 2) // back of the head: all hair
        ctx.fill()
    }

    // headband
    ctx.fillStyle = look.accent
    ctx.fillRect(-5, -29 + bob, 10, 2)

    // eyes
    if (facing !== 'up') {
        const shift = facing === 'left' ? -1.5 : facing === 'right' ? 1.5 : 0
        ctx.fillStyle = '#1c1410'
        ctx.fillRect(-3 + shift, -26 + bob, 1.5, 1.5)
        ctx.fillRect(1.5 + shift, -26 + bob, 1.5, 1.5)
    }

    ctx.restore()
}
