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
    col: number       // where it sits on the map (tile column and row)
    row: number
    loot: string[]    // item ids (see items.ts) you get when you open it
}

export const chestDefs: ChestDef[] = [
    { id: 'chest-nile', col: 4, row: 40, loot: ['scarab'] },
    { id: 'chest-forge', col: 14, row: 56, loot: ['assyrian-sword'] },
    { id: 'chest-north', col: 22, row: 32, loot: ['persian-daric'] },
    { id: 'chest-market', col: 18, row: 45, loot: ['greek-amphora'] },
    { id: 'chest-pyramid', col: 36, row: 50, loot: ['augustus-head'] },
    { id: 'chest-east', col: 38, row: 42, loot: ['aksum-coin'] },
]
