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
        case 'S':
            drawSand(ctx, x, y, col, row, n)
            drawStela(ctx, x, y)
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
    diamond(ctx, cx, oy, 7)

    ctx.font = `600 ${Math.max(18, size * 0.32)}px ${FONT_BODY}`
    ctx.fillStyle = '#f3ead6'
    ctx.fillText('A journey through the Kingdom of Kush', cx, cy + size * 0.5)

    // blinking prompt
    if (Math.floor(time / 600) % 2 === 0) {
        ctx.font = `700 18px ${FONT_TITLE}`
        ctx.fillStyle = '#e8c75a'
        ctx.fillText('PRESS ENTER TO BEGIN', cx, cy + size * 1.3)
    }

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

    // the options
    const rx = px + pw * 0.5
    const rw = pw * 0.46
    const rowH = Math.min(52, (ph - 130) / rows.length)
    rows.forEach((row, i) => {
        const ry = py + 78 + i * rowH
        const on = i === selected
        ctx.fillStyle = on ? 'rgba(201, 162, 39, 0.16)' : 'rgba(255, 255, 255, 0.04)'
        ctx.beginPath()
        ctx.roundRect(rx, ry, rw, rowH - 8, 6)
        ctx.fill()
        ctx.strokeStyle = on ? '#e8c75a' : 'rgba(201, 162, 39, 0.35)'
        ctx.lineWidth = on ? 2 : 1
        ctx.stroke()

        const mid = ry + (rowH - 8) / 2
        ctx.textAlign = 'left'
        ctx.font = `700 12px ${FONT_TITLE}`
        ctx.fillStyle = '#e8c75a'
        ctx.fillText(row.label.toUpperCase(), rx + 14, mid)

        ctx.textAlign = 'right'
        ctx.font = `600 20px ${FONT_BODY}`
        ctx.fillStyle = '#f3ead6'
        const textX = rx + rw - (on ? 34 : 16)
        ctx.fillText(row.text, textX, mid)
        if (row.swatch) {
            const tw = ctx.measureText(row.text).width
            ctx.fillStyle = row.swatch
            ctx.beginPath()
            ctx.arc(textX - tw - 16, mid, 8, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
            ctx.lineWidth = 1
            ctx.stroke()
        }

        // little arrow on the selected row
        if (on) {
            ctx.fillStyle = '#e8c75a'
            ctx.beginPath()
            ctx.moveTo(rx + rw - 22, mid - 6)
            ctx.lineTo(rx + rw - 12, mid)
            ctx.lineTo(rx + rw - 22, mid + 6)
            ctx.closePath()
            ctx.fill()
        }
    })

    ctx.textAlign = 'center'
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('UP / DOWN: CHOOSE      LEFT / RIGHT: CHANGE      ENTER: BEGIN', w / 2, py + ph - 24)
    ctx.restore()
}

// A thing in the inventory, ready to draw.
export interface InventoryEntry {
    name: string
    color: string
}

export function drawInventory(ctx: CanvasRenderingContext2D, w: number, h: number, entries: InventoryEntry[], time: number) {
    ctx.save()
    ctx.fillStyle = 'rgba(14, 9, 5, 0.7)'
    ctx.fillRect(0, 0, w, h)

    const cols = 5
    const slot = 92
    const gap = 12
    const gridRows = Math.max(2, Math.ceil(entries.length / cols))
    const pw = cols * slot + (cols - 1) * gap + 60
    const ph = 110 + gridRows * (slot + gap) + 20
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
    ctx.font = `700 22px ${FONT_TITLE}`
    ctx.fillStyle = '#e8c75a'
    ctx.fillText('INVENTORY', w / 2, py + 36)

    for (let i = 0; i < cols * gridRows; i++) {
        const sx = px + 30 + (i % cols) * (slot + gap)
        const sy = py + 70 + Math.floor(i / cols) * (slot + gap)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.beginPath()
        ctx.roundRect(sx, sy, slot, slot, 6)
        ctx.fill()
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.45)'
        ctx.lineWidth = 1
        ctx.stroke()

        const entry = entries[i]
        if (!entry) continue
        drawItem(ctx, sx + (slot - TILE) / 2, sy + 8, entry.color, time)
        ctx.font = `600 15px ${FONT_BODY}`
        ctx.fillStyle = '#f3ead6'
        ctx.fillText(entry.name, sx + slot / 2, sy + slot - 14)
    }

    if (entries.length === 0) {
        ctx.font = `600 18px ${FONT_BODY}`
        ctx.fillStyle = '#c9b98a'
        ctx.fillText('Your pack is empty. Explore the land to find things.', w / 2, py + ph - 52)
    }
    ctx.font = `700 12px ${FONT_TITLE}`
    ctx.fillStyle = '#c9b98a'
    ctx.fillText('PRESS I TO CLOSE', w / 2, py + ph - 24)
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
    '~': '#2f86c8',
    '.': '#e8d3a0',
    H: '#a9714b',
    P: '#c9974f',
    T: '#e8d3a0',
    S: '#8d8a84',
}

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
    const ts = Math.max(5, Math.floor(Math.min((w - 100) / cols, (h - 170) / mapRows.length)))
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
    ctx.fillText('MAP OF KUSH', w / 2, oy - 32)

    // the land
    mapRows.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
            const ch = line[c]
            ctx.fillStyle = MAP_COLORS[ch] ?? MAP_COLORS['.']
            ctx.fillRect(ox + c * ts, oy + r * ts, ts, ts)
            if (ch === 'T') {
                ctx.fillStyle = '#3f8f3f'
                ctx.beginPath()
                ctx.arc(ox + c * ts + ts / 2, oy + r * ts + ts / 2, ts * 0.38, 0, Math.PI * 2)
                ctx.fill()
            }
        }
    })

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
            ctx.font = `700 10px ${FONT_TITLE}`
            ctx.fillStyle = '#2a1a08'
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
        ctx.fillStyle = on ? 'rgba(201, 162, 39, 0.18)' : 'rgba(255, 255, 255, 0.04)'
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
