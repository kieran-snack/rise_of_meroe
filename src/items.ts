/******************************************************************************
 * File:        items.ts
 * Author:      Kieran Provost
 * Date:        10-26-26 (Last edit)
 * Description: The things you can pick up in the Rise of Meroe.
 * 
 * License:     MIT
 ******************************************************************************/
export interface ItemDef {
    id: string // used by quests (the `needs` list) and the inventory
    name: string
    col: number // where it lies on the map (col and row)
    row: number 
    color: string
    fact: string // shown when you pick it up
}

export const itemDefs: ItemDef[] = [
    {
        id: 'iron-ore', name: 'Iron Ore', col: 25, row: 14, color: '#5b5f66',
        fact: 'Iron ore! Kushite smiths heated ore like this in furnaces fueled by charcoal. Meroe was so busy with ironworking that mounds of leftover slag are still there today.',
    },
    {
        id: 'gold-nugget', name: 'Gold Nugget', col: 27, row: 4, color: '#e8c75a',
        fact: 'Gold! Nubia, the land of Kush, was famous for its gold. Its name may even come from the old Egyptian word for gold.',
    },
    {
        id: 'sandstone', name: 'Sandstone Block', col: 32, row: 17, color: '#c9a265',
        fact: 'A block of sandstone! Meroë\'s pyramids were built from sandstone blocks, and many had a small chapel built against one side for offerings.',
    }
]