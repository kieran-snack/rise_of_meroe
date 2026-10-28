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
    kiln: 'Kiln',
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

    // ---- Things you can make for yourself (they are not needed for the buildings) ----
    {
        id: 'gold-collar', station: 'goldsmith', name: 'Gold Collar',
        inputs: [{ id: 'gold-leaf', count: 2 }, { id: 'faience-beads', count: 1 }], output: { id: 'gold-collar', count: 1 },
        fact: 'Kushite kings and queens wore wide collars of gold and blue faience. Many are carved on their temple walls.',
    },
    {
        id: 'bead-necklace', station: 'goldsmith', name: 'Bead Necklace',
        inputs: [{ id: 'glass-beads', count: 1 }, { id: 'cowrie', count: 1 }], output: { id: 'bead-necklace', count: 1 },
        fact: 'Necklaces of beads and cowrie shells were buried with people all over Kush, from Kerma to Meroë.',
    },
    {
        id: 'copper-mirror', station: 'goldsmith', name: 'Copper Mirror',
        inputs: [{ id: 'copper-bracelet', count: 2 }], output: { id: 'copper-mirror', count: 1 },
        fact: 'Before glass mirrors, people used polished copper or bronze. Mirrors like this were found in Kushite graves.',
    },
    {
        id: 'iron-spear', station: 'goldsmith', name: 'Iron Spear',
        inputs: [{ id: 'iron-bar', count: 1 }, { id: 'wood', count: 1 }], output: { id: 'iron-spear', count: 1 },
        fact: 'Iron spears and arrowheads made the soldiers of Kush strong. Queen Amanirenas led such an army against Rome.',
    },
    {
        id: 'iron-hoe', station: 'goldsmith', name: 'Iron Hoe',
        inputs: [{ id: 'iron-bar', count: 1 }, { id: 'wood', count: 1 }], output: { id: 'iron-hoe', count: 1 },
        fact: 'Iron tools helped farmers clear land and dig fields, so Meroë could feed a large city.',
    },
    {
        id: 'lion-statue', station: 'stoneworks', name: 'Lion Statue',
        inputs: [{ id: 'cut-block', count: 2 }], output: { id: 'lion-statue', count: 1 },
        fact: 'Stone lions guarded the temples of Apedemak, the lion god. Some still stand at Naqa and Musawwarat es-Sufra.',
    },
    {
        id: 'offering-table', station: 'stoneworks', name: 'Offering Table',
        inputs: [{ id: 'granite', count: 1 }, { id: 'cut-block', count: 1 }], output: { id: 'offering-table', count: 1 },
        fact: 'Offering tables were carved with prayers in Meroitic and placed at tombs. They are one of the best sources of Meroitic writing.',
    },
    {
        id: 'feather-fan', station: 'brickyard', name: 'Ostrich Feather Fan',
        inputs: [{ id: 'ostrich-feathers', count: 2 }, { id: 'wood', count: 1 }], output: { id: 'feather-fan', count: 1 },
        fact: 'Fans of ostrich feathers were carried by servants of kings in Egypt and Kush. The feathers came from Nubia.',
    },
    {
        id: 'leopard-cloak', station: 'brickyard', name: 'Leopard-Skin Cloak',
        inputs: [{ id: 'leopard-skin', count: 1 }], output: { id: 'leopard-cloak', count: 1 },
        fact: 'Priests in Egypt and Kush wore leopard skins in ceremonies. The skins were a valuable trade good from the south.',
    },
    {
        id: 'sorghum-bread', station: 'kiln', name: 'Sorghum Bread',
        inputs: [{ id: 'sorghum', count: 2 }], output: { id: 'sorghum-bread', count: 1 },
        fact: 'Sorghum, a grain that grows well in dry country, was a main food in Kush. It is still eaten in Sudan today.',
    },
    {
        id: 'date-cakes', station: 'kiln', name: 'Date Cakes',
        inputs: [{ id: 'dates', count: 2 }], output: { id: 'date-cakes', count: 1 },
        fact: 'Sweet dates from the palms along the Nile were dried, pressed and baked, and kept for long journeys.',
    },
    {
        id: 'black-pot', station: 'kiln', name: 'Black-Topped Pot',
        inputs: [{ id: 'clay', count: 1 }, { id: 'wood', count: 1 }], output: { id: 'black-pot', count: 1 },
        fact: 'Kerma potters fired their pots upside down in the ashes, which turned the rim shiny black and left the body red.',
    },
]

// The furnace: ore + fuel makes a bar, and it takes a few seconds
export const FURNACE_ORE = 'iron-ore'
export const FURNACE_FUEL = 'wood'
export const FURNACE_BAR = 'iron-bar'
export const SMELT_MS = 4000
