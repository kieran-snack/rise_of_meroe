/******************************************************************************
 * File:        chests.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: The treasure chests hidden around the Rise of Meroe map.
 * 
 * License:     MIT
 ******************************************************************************/

export interface ChestDef {
    id: string
    col: number       // where it sits on the map. The game picks a random spot inside its area
    row: number       // every time you start, so these two start at 0
    loot: string[]    // items this chest ALWAYS holds (item ids, see items.ts)
    rolls?: number    // how many random extras it also holds, drawn from lootTable (default 1)
    area: string      // the named part of the world where it may be hidden (see worldgen.ts)
}

// The random extras. Each chest adds a few of these when you open it for the first time.
export const lootTable: string[] = [
    'cowrie', 'faience-beads', 'ostrich-feathers', 'leopard-skin',
    'sorghum', 'dates', 'glass-beads', 'copper-bracelet',
]

export const chestDefs: ChestDef[] = [
    { id: 'chest-scarab', col: 0, row: 0, loot: ['scarab'], rolls: 1, area: 'kerma' },
    { id: 'chest-sword', col: 0, row: 0, loot: ['assyrian-sword'], rolls: 1, area: 'egypt' },
    { id: 'chest-daric', col: 0, row: 0, loot: ['persian-daric'], rolls: 2, area: 'egypt' },
    { id: 'chest-amphora', col: 0, row: 0, loot: ['greek-amphora'], rolls: 1, area: 'coast' },
    { id: 'chest-augustus', col: 0, row: 0, loot: ['augustus-head'], rolls: 2, area: 'meroe' },
    { id: 'chest-aksum', col: 0, row: 0, loot: ['aksum-coin'], rolls: 2, area: 'aksum' },
]
