/******************************************************************************
 * File:        worldgen.ts
 * Author:      Kieran Provost
 * Date:        10-28-26 (Last edit)
 * Description: Builds the big world of the Rise of Meroe: the Nile, the Red
 *              Sea, and the villages, temples and pyramids in between.
 *              Nothing in here draws anything. It only makes the map.
 *
 * License:     MIT
 ******************************************************************************/

export const WORLD_W = 160
export const WORLD_H = 120

// A rectangle of the map, in tiles (edges included)
export interface Area {
    col0: number
    col1: number
    row0: number
    row1: number
}

// A single tile
export interface Spot {
    col: number
    row: number
}

export interface World {
    rows: string[]                       // the map, one string per row
    anchors: Record<string, Spot>        // named places: villagers, stations, ...
    areas: Record<string, Area>          // named rectangles: regions, building plots, ...
}

// ---------------------------------------------------------------------------
// The tile alphabet
//
//   walkable:  .  sand            d  dune             g  grass
//              f  paved stone     =  road             k  crop field
//              r  reeds
//   solid:     ~  water           H  house (mud brick)   P  pyramid
//              T  palm tree       S  stela (pillar)      W  mud-brick wall
//              #  stone wall      c  column              G  temple pylon
//              b  boulder         a  ram sphinx          x  brazier
//              w  well            t  tent                M  market stall
//              B  rock mesa       i  slag heap (iron-working waste)
// ---------------------------------------------------------------------------
const SOLID = '~HPTSW#cGbaxwtMBi'

// Is this map character something you cannot walk through? (Off the map counts as solid.)
export function isSolidChar(ch: string | undefined): boolean {
    return ch === undefined || SOLID.includes(ch)
}

// Characters that are drawn as ONE big rectangle (a whole pyramid, a whole house)
export const BLOCK_CHARS = 'HPGB'

export interface BlockInfo {
    ox: number   // which tile of the block this is (0 = the left / top edge)
    oy: number
    w: number    // how many tiles wide and tall the whole block is
    h: number
}

// Work out which block a tile belongs to. (Blocks are always full rectangles.)
export function blockInfo(rows: string[], col: number, row: number): BlockInfo {
    const ch = rows[row][col]
    let c0 = col
    let r0 = row
    while (c0 > 0 && rows[row][c0 - 1] === ch) c0--
    while (r0 > 0 && rows[r0 - 1][col] === ch) r0--
    let w = 1
    while (rows[r0][c0 + w] === ch) w++
    let h = 1
    while (rows[r0 + h]?.[c0] === ch) h++
    return { ox: col - c0, oy: row - r0, w, h }
}

// The named parts of the world. Their order matters: the first one that contains you wins.
export interface RegionDef {
    name: string
    subtitle: string
    area: string
}
export const REGIONS: RegionDef[] = [
    { name: 'Syene, the Roman Border', subtitle: 'Egypt ends here, and Rome guards the frontier', area: 'syene' },
    { name: 'Egypt', subtitle: 'North of Kush, the land of the pharaohs', area: 'egypt' },
    { name: 'The Red Sea Coast', subtitle: 'Greek and Roman ships trade along these shores', area: 'coast' },
    { name: 'Kerma', subtitle: 'The first great kingdom of Kush, long before Meroë', area: 'kerma' },
    { name: 'Napata and Jebel Barkal', subtitle: 'The sacred mountain of the god Amun', area: 'napata' },
    { name: 'Meroë', subtitle: 'The royal city of Kush, and your home', area: 'meroe' },
    { name: 'Naqa and Musawwarat', subtitle: 'Temples of Apedemak, the lion god', area: 'naqa' },
    { name: 'Aksum', subtitle: 'A rising kingdom in the highlands to the southeast', area: 'aksum' },
]

// ---------------------------------------------------------------------------
// Small tools: random numbers and smooth noise (the same seed always gives the same world)
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
    let a = seed
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function hash2(x: number, y: number, seed: number): number {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Smooth value noise between 0 and 1
function noise(x: number, y: number, seed: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const smooth = (t: number) => t * t * (3 - 2 * t)
    const u = smooth(x - xi)
    const v = smooth(y - yi)
    const a = hash2(xi, yi, seed)
    const b = hash2(xi + 1, yi, seed)
    const c = hash2(xi, yi + 1, seed)
    const d = hash2(xi + 1, yi + 1, seed)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------
export function buildWorld(seed = 7): World {
    const W = WORLD_W
    const H = WORLD_H
    const rand = mulberry32(seed)
    const g: string[][] = Array.from({ length: H }, () => Array(W).fill('.'))
    const anchors: Record<string, Spot> = {}

    // The parts of the world (the banner names are in REGIONS above)
    const areas: Record<string, Area> = {
        egypt: { col0: 12, col1: 100, row0: 0, row1: 34 },
        syene: { col0: 12, col1: 100, row0: 35, row1: 47 },
        coast: { col0: 101, col1: 159, row0: 0, row1: 47 },
        kerma: { col0: 12, col1: 100, row0: 48, row1: 69 },
        napata: { col0: 12, col1: 100, row0: 70, row1: 93 },
        meroe: { col0: 12, col1: 100, row0: 94, row1: 119 },
        naqa: { col0: 101, col1: 123, row0: 48, row1: 119 },
        aksum: { col0: 124, col1: 159, row0: 48, row1: 119 },
    }

    const get = (c: number, r: number): string | undefined => g[r]?.[c]
    const set = (c: number, r: number, ch: string) => {
        if (c >= 0 && c < W && r >= 0 && r < H) g[r][c] = ch
    }
    const fill = (c: number, r: number, w: number, h: number, ch: string) => {
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) set(x, y, ch)
    }
    // the outline of a rectangle
    const box = (c: number, r: number, w: number, h: number, ch: string) => {
        fill(c, r, w, 1, ch)
        fill(c, r + h - 1, w, 1, ch)
        fill(c, r, 1, h, ch)
        fill(c + w - 1, r, 1, h, ch)
    }
    const anchor = (name: string, c: number, r: number) => {
        anchors[name] = { col: c, row: r }
    }
    const area = (name: string, c: number, r: number, w: number, h: number) => {
        areas[name] = { col0: c, col1: c + w - 1, row0: r, row1: r + h - 1 }
    }

    // Every landmark reserves its space, so two of them can never overlap
    const reserved: { name: string; c: number; r: number; w: number; h: number }[] = []
    const reserve = (name: string, c: number, r: number, w: number, h: number) => {
        for (const o of reserved) {
            if (c < o.c + o.w + 1 && c + w + 1 > o.c && r < o.r + o.h + 1 && r + h + 1 > o.r) {
                throw new Error('worldgen: ' + name + ' overlaps ' + o.name)
            }
        }
        reserved.push({ name, c, r, w, h })
    }
    const isReserved = (c: number, r: number, margin = 1) =>
        reserved.some(o => c >= o.c - margin && c < o.c + o.w + margin && r >= o.r - margin && r < o.r + o.h + margin)

    // ----------------------------------------------------------------- 1. the land
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const n = noise(c / 10, r / 10, seed)
            if (n > 0.66) g[r][c] = 'd'
            else if (c >= 124 && r >= 48 && n < 0.5) g[r][c] = 'g'   // the green highlands of Aksum
        }
    }

    // ----------------------------------------------------------------- 2. the Nile (west) and the Red Sea (east)
    const riverX = (r: number) => 5 + 2.5 * Math.sin(r / 11) + 1.5 * Math.sin(r / 4.7 + 1)
    const riverHalf = (r: number) => 1.6 + 0.6 * Math.sin(r / 7 + 2)
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (Math.abs(c - riverX(r)) <= riverHalf(r)) g[r][c] = '~'
        }
        // grassy banks with a few reeds
        const edge = Math.ceil(riverX(r) + riverHalf(r))
        for (let k = 0; k < 3; k++) if (get(edge + k, r) !== '~') set(edge + k, r, 'g')
        if (rand() < 0.45) set(edge, r, 'r')
    }

    const coast = (r: number) => 153 + 2 * Math.sin(r / 6)
    const gulf = (r: number) => (r >= 6 && r <= 40 ? 139 + 3 * Math.sin(r / 5) : 999)
    for (let r = 0; r < H; r++) {
        const shore = Math.min(coast(r), gulf(r))
        for (let c = Math.floor(shore) - 2; c < W; c++) {
            if (c >= shore) g[r][c] = '~'
            else if (get(c, r) !== '~') set(c, r, 'd')
        }
    }

    // ----------------------------------------------------------------- 3. roads
    const roadSet = (c: number, r: number) => {
        if ('.dgr'.includes(get(c, r) ?? '#')) set(c, r, '=')
    }
    // a road that goes along a row, then along a column
    const road = (c0: number, r0: number, c1: number, r1: number) => {
        for (let c = c0; c !== c1; c += Math.sign(c1 - c0)) roadSet(c, r0)
        for (let r = r0; r !== r1; r += Math.sign(r1 - r0)) roadSet(c1, r)
        roadSet(c1, r1)
    }
    road(17, 1, 17, 118)   // the river road, all the way down the east bank of the Nile

    // ----------------------------------------------------------------- 4. building blocks for landmarks

    // A village: a road along the middle, houses on both sides, a well, market stalls and fields.
    const village = (name: string, c: number, r: number, w: number, h: number, fields = true) => {
        reserve(name, c, r, w, h)
        const mid = r + Math.floor(h / 2)
        fill(c, mid, w, 1, '=')
        for (let x = c + 1; x + 2 <= c + w - 1; x += 5) {
            fill(x, r + 1, 2, 2, 'H')                // houses north of the road
            fill(x, mid + 3, 2, 2, 'H')              // houses south of the road
            fill(x, r + 3, 2, 1, '.')                // (a little yard in front of each)
        }
        set(c + Math.floor(w / 2), mid - 1, 'w')     // the well
        set(c + Math.floor(w / 2) + 2, mid + 1, 'M') // market stalls
        set(c + Math.floor(w / 2) - 2, mid + 1, 'M')
        if (fields) {
            fill(c + w + 1, r + 1, 5, 3, 'k')        // crop fields beside the village
            fill(c + w + 1, r + h - 4, 5, 3, 'k')
        }
        anchor(name + '-road', c + Math.floor(w / 2), mid)
    }

    // A temple: a walled compound with two pylon towers and a gate, a columned court and
    // hall, a sanctuary, and an avenue of ram sphinxes leading up to the gate.
    // (w should be an even number)
    const temple = (name: string, c: number, r: number, w: number, h: number, towerW: number, towerH: number) => {
        const avenue = 8
        reserve(name, c, r, w, h + avenue)
        box(c, r, w, h, '#')
        fill(c + 1, r + 1, w - 2, h - 2, 'f')
        // the two towers on the front wall, with the gate between them
        fill(c, r + h - towerH, towerW, towerH, 'G')
        fill(c + w - towerW, r + h - towerH, towerW, towerH, 'G')
        const mid = c + Math.floor(w / 2)
        fill(mid - 2, r + h - 1, 4, 1, 'f')
        // columns along both sides of the courtyard
        for (let y = r + h - towerH - 2; y > r + Math.floor(h / 2); y -= 2) {
            set(c + 2, y, 'c')
            set(c + w - 3, y, 'c')
        }
        // the columned hall
        for (let y = r + 7; y < r + Math.floor(h / 2); y += 2) {
            for (let x = c + 4; x < c + w - 3; x += 3) set(x, y, 'c')
        }
        // the sanctuary at the back, with braziers
        box(mid - 3, r + 1, 7, 5, '#')
        set(mid, r + 5, 'f')
        set(mid - 1, r + 3, 'x')
        set(mid + 1, r + 3, 'x')
        // the avenue of sphinxes
        for (let i = 0; i < avenue; i++) {
            const y = r + h + i
            fill(mid - 2, y, 4, 1, '=')
            if (i % 2 === 1) {
                set(mid - 3, y, 'a')
                set(mid + 2, y, 'a')
            }
        }
        anchor(name + '-gate', mid, r + h + 2)
        road(17, r + h + avenue - 1, mid, r + h + avenue - 1)
    }

    // A grid of pyramids
    const pyramids = (name: string, c: number, r: number, nx: number, ny: number, size: number, gap: number) => {
        reserve(name, c, r, nx * (size + gap) - gap, ny * (size + gap) - gap)
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) fill(c + i * (size + gap), r + j * (size + gap), size, size, 'P')
        }
    }

    // ----------------------------------------------------------------- 5. EGYPT (north)
    temple('karnak', 28, 2, 32, 24, 11, 5)                     // the great Temple of Amun
    anchor('hori', 28 + 16, 2 + 24 + 1)
    pyramids('giza', 68, 3, 1, 1, 9, 0)                        // three big pyramids
    pyramids('giza-2', 80, 8, 1, 1, 7, 0)
    pyramids('giza-3', 90, 12, 1, 1, 5, 0)
    village('egyptian-village', 66, 21, 22, 11)
    anchor('nebet', 66 + 11, 21 + 5)
    road(17, 26, 66, 26)

    // ----------------------------------------------------------------- 6. SYENE (the Roman border)
    {
        // a Roman fort: stone walls, corner towers, a gate in the south wall, barracks inside
        const c = 40, r = 36, w = 20, h = 10
        reserve('roman-fort', c, r, w, h + 2)
        box(c, r, w, h, '#')
        fill(c + 1, r + 1, w - 2, h - 2, 'f')
        fill(c, r, 2, 2, 'G')
        fill(c + w - 2, r, 2, 2, 'G')
        fill(c, r + h - 2, 2, 2, 'G')
        fill(c + w - 2, r + h - 2, 2, 2, 'G')
        fill(c + 9, r + h - 1, 3, 1, 'f')                      // the gate
        fill(c + 4, r + 2, 4, 2, 'H')                          // barracks
        fill(c + 12, r + 2, 4, 2, 'H')
        set(c + 10, r + 5, 'x')
        fill(c + 9, r + h, 3, 2, '=')
        road(17, r + h + 1, c + 10, r + h + 1)
        anchor('marcus', c + 10, r + h + 1)
    }
    village('aswan-village', 68, 37, 18, 9, false)

    // ----------------------------------------------------------------- 7. THE RED SEA COAST
    {
        // a port town on the west shore of the gulf, with piers reaching into the water
        const c = 112, r = 10, w = 24, h = 20
        reserve('port', c, r, w + 14, h)
        fill(c, r, w, h, 'f')
        box(c, r, w, h, '=')
        for (let x = c + 2; x + 4 < c + w; x += 6) {
            fill(x, r + 2, 4, 3, 'H')                          // warehouses
            fill(x, r + h - 5, 4, 3, 'H')
        }
        for (let x = c + 3; x < c + w - 2; x += 4) set(x, r + 9, 'M')   // the market
        set(c + 12, r + 11, 'w')
        for (const y of [r + 5, r + 9, r + 14]) fill(c + w, y, 14, 2, 'f')   // piers over the water
        anchor('demetrios', c + 10, r + 10)
        road(100, r + 10, c, r + 10)
    }
    village('coast-village', 108, 34, 18, 9, false)

    // ----------------------------------------------------------------- 8. KERMA
    {
        // the Western Deffufa: a huge mud-brick temple inside a walled yard
        const c = 28, r = 50, w = 20, h = 15
        reserve('deffufa', c, r, w, h + 2)
        box(c, r, w, h, 'W')
        fill(c + 1, r + 1, w - 2, h - 2, 'f')
        fill(c + 5, r + 2, 10, 8, 'H')
        fill(c + 9, r + h - 1, 3, 1, 'f')                      // the gate
        fill(c + 9, r + h, 3, 2, '=')
        road(17, r + h + 1, c + 10, r + h + 1)
        anchor('deffufa-gate', c + 10, r + h + 1)
    }
    village('kerma-village', 58, 52, 22, 11)
    anchor('tebe', 58 + 11, 52 + 5)
    // the old cemetery: burial mounds scattered over the plain
    for (let i = 0; i < 28; i++) {
        const x = 52 + Math.floor(rand() * 40)
        const y = 64 + Math.floor(rand() * 5)
        if (!isReserved(x, y, 2) && get(x, y) !== '=') set(x, y, 'b')
    }

    // ----------------------------------------------------------------- 9. NAPATA and JEBEL BARKAL
    temple('barkal-temple', 28, 72, 28, 12, 9, 4)
    {
        // Jebel Barkal: the sacred sandstone mesa, with a tall pinnacle
        reserve('jebel-barkal', 62, 72, 18, 10)
        fill(62, 72, 18, 10, 'B')
    }
    pyramids('nuri', 62, 85, 6, 2, 2, 2)                       // the small pyramids of the Napatan kings
    village('napata-village', 84, 72, 16, 9, false)
    anchor('kheli', 84 + 8, 72 + 4)

    // ----------------------------------------------------------------- 10. MEROE (home)
    village('meroe-village', 22, 98, 26, 14, false)
    fill(23, 94, 14, 3, 'k')                                   // the farm fields north of the village
    anchor('start', 22 + 13, 98 + 7)
    anchor('amadi', 22 + 4, 98 + 7)
    anchor('mustafa', 22 + 20, 98 + 7)
    anchor('fatima', 22 + 8, 98 + 7)
    anchor('mahmoud', 22 + 16, 98 + 7)
    anchor('kasha', 49, 105)
    anchor('kiln', 22 + 3, 98 + 5)
    anchor('brickyard', 15, 105)
    anchor('furnace', 22 + 21, 98 + 5)
    anchor('goldsmith', 22 + 8, 98 + 9)
    anchor('stoneworks', 50, 100)
    // iron-working slag heaps near the river
    {
        reserve('slag-hills', 14, 100, 6, 12)
        for (let i = 0; i < 18; i++) {
            const x = 14 + Math.floor(rand() * 6)
            const y = 100 + Math.floor(rand() * 12)
            if (get(x, y) !== '=' && !(x === 15 && y === 105)) set(x, y, 'i')
        }
        area('slag', 14, 100, 6, 12)
    }
    // the capital: a paved plaza where the buildings will go up
    {
        reserve('plaza', 52, 96, 36, 22)
        fill(52, 96, 36, 22, 'f')
        box(52, 96, 36, 22, '=')
        area('plot-houses', 54, 98, 6, 5)
        area('plot-ironworks', 62, 98, 7, 5)
        area('plot-hafir', 71, 98, 9, 6)
        area('plot-cemetery', 82, 98, 6, 6)
        area('plot-temple', 54, 107, 9, 8)
        area('plot-baths', 65, 107, 8, 7)
        area('plot-enclosure', 75, 107, 10, 8)
        road(48, 105, 52, 105)
    }
    pyramids('meroe-pyramids', 91, 94, 2, 5, 3, 2)             // the royal cemeteries on the ridge

    // ----------------------------------------------------------------- 11. NAQA and MUSAWWARAT
    temple('lion-temple', 104, 54, 16, 14, 5, 3)               // the Lion Temple of Apedemak
    anchor('sarem', 104 + 8, 54 + 14 + 2)
    {
        // the Great Enclosure: long walls, courtyards and ramps
        const c = 104, r = 80, w = 20, h = 22
        reserve('great-enclosure', c, r, w, h)
        box(c, r, w, h, '#')
        fill(c + 1, r + 1, w - 2, h - 2, 'f')
        fill(c + 1, r + 6, 8, 1, '#')
        fill(c + 11, r + 6, 8, 1, '#')
        fill(c + 1, r + 13, 6, 1, '#')
        fill(c + 9, r + 13, 10, 1, '#')
        fill(c + 9, r + h - 1, 3, 1, 'f')                      // the entrance
        for (let y = r + 2; y < r + 5; y += 2) set(c + 4, y, 'c')
        area('enclosure-yard', c + 1, r + 7, w - 2, 5)
    }
    village('naqa-village', 103, 106, 17, 8, false)

    // ----------------------------------------------------------------- 12. AKSUM
    {
        // the field of stelae: tall carved stone pillars standing in rows
        reserve('stelae-field', 128, 54, 24, 12)
        for (let y = 56; y < 66; y += 3) {
            for (let x = 130; x < 150; x += 4) set(x, y, (x + y) % 8 === 0 ? 'b' : 'S')
        }
        fill(128, 66, 24, 1, '=')
    }
    village('aksum-village', 128, 76, 22, 11)
    anchor('berhane', 128 + 11, 76 + 5)
    anchor('dawit', 128 + 4, 76 + 5)
    {
        // the granite quarry
        reserve('quarry', 130, 98, 18, 12)
        for (let i = 0; i < 26; i++) {
            const x = 130 + Math.floor(rand() * 18)
            const y = 98 + Math.floor(rand() * 12)
            if (get(x, y) !== '=') set(x, y, 'b')
        }
        area('granite-quarry', 130, 98, 18, 12)
    }

    // ----------------------------------------------------------------- 13. long roads between the places
    road(17, 62, 58, 62)
    road(17, 83, 28, 83)
    road(80, 105, 103, 110)
    road(103, 110, 103, 88)
    road(103, 88, 124, 88)
    road(124, 88, 128, 81)
    road(100, 60, 128, 60)
    road(100, 26, 112, 26)
    road(17, 72, 28, 72)

    // ----------------------------------------------------------------- 14. trees and rocks
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (get(c, r) === '~' || isReserved(c, r, 1) || !'.dg'.includes(get(c, r) ?? '#')) continue
            const nearRiver = c < 30
            const chance = nearRiver ? 0.05 : c >= 124 ? 0.012 : 0.02
            if (rand() < chance) set(c, r, 'T')
            else if (rand() < 0.006) set(c, r, 'b')
        }
    }

    return { rows: g.map(row => row.join('')), anchors, areas }
}
