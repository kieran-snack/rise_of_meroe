/******************************************************************************
 * File:        recipes.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: What you can craft, and where. The furnace is special: it has its own window.
 *
 * License:     MIT
 ******************************************************************************/

export interface Ingredient {
    id: string      // an item id (see items.ts)
    count: number
}

export interface Recipe {
    id: string
    station: string   // which station crafts it (an anchor name from worldgen.ts)
    name: string
    inputs: Ingredient[]
    output: Ingredient
    fact: string      // shown after you craft it
}

// The name shown at the top of each station's window
export const stationNames: Record<string, string> = {
    furnace: 'Furnace',
    stoneworks: 'Stoneworks',
    goldsmith: 'Goldsmith',
    brickyard: 'Brickyard',
}

export const recipes: Recipe[] = [
    {
        id: 'cut-block', station: 'stoneworks', name: 'Cut Sandstone',
        inputs: [{ id: 'sandstone', count: 1 }], output: { id: 'cut-block', count: 2 },
        fact: 'Stonecutters at Meroë shaped sandstone into neat blocks for pyramids and temples.',
    },
    {
        id: 'gold-leaf', station: 'goldsmith', name: 'Gold Leaf',
        inputs: [{ id: 'gold-nugget', count: 1 }], output: { id: 'gold-leaf', count: 2 },
        fact: 'Kushite goldsmiths hammered gold into thin sheets to decorate temples and jewelry.',
    },
    {
        id: 'mud-brick', station: 'brickyard', name: 'Mud Bricks',
        inputs: [{ id: 'clay', count: 1 }], output: { id: 'mud-brick', count: 2 },
        fact: 'Most homes in ancient Kush were built of mud brick, which stays cool in the heat.',
    },
]

// The furnace: ore + fuel makes a bar, and it takes a few seconds
export const FURNACE_ORE = 'iron-ore'
export const FURNACE_FUEL = 'wood'
export const FURNACE_BAR = 'iron-bar'
export const SMELT_MS = 4000
