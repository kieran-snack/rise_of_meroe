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
