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
    civ?: string // which outside civilization it comes from (see civs.ts)
}
// Items with col: -1 and row: -1 are not on the ground. They are found in chests (see chests.ts).

export const itemDefs: ItemDef[] = [
    {
        id: 'iron-ore', name: 'Iron Ore', col: 25, row: 44, color: '#5b5f66',
        fact: 'Iron ore! Kushite smiths heated ore like this in furnaces fueled by charcoal. Meroë was so busy with ironworking that mounds of leftover slag are still there today.',
    },
    {
        id: 'gold-nugget', name: 'Gold Nugget', col: 27, row: 34, color: '#e8c75a',
        fact: 'Gold! Nubia, the land of Kush, was famous for its gold. Its name may even come from the old Egyptian word for gold.',
    },
    {
        id: 'sandstone', name: 'Sandstone Block', col: 32, row: 47, color: '#c9a265',
        fact: 'A block of sandstone! Meroë\'s pyramids were built from sandstone blocks, and many had a small chapel built against one side for offerings.',
    },
    {
        id: 'scarab', name: 'Egyptian Scarab', col: -1, row: -1, color: '#2f9e8f', civ: 'egypt',
        fact: 'A scarab amulet from Egypt. Kush and Egypt traded for centuries, and Kushite kings even ruled Egypt as the 25th Dynasty, starting around 744 BCE.',
    },
    {
        id: 'assyrian-sword', name: 'Assyrian Iron Sword', col: -1, row: -1, color: '#8a8f98', civ: 'assyria',
        fact: 'An iron sword of the Assyrian army. In the 670s BCE, Assyria drove the Kushite pharaoh Taharqa out of Egypt.',
    },
    {
        id: 'persian-daric', name: 'Persian Gold Coin', col: -1, row: -1, color: '#e0b030', civ: 'persia',
        fact: 'A gold coin of the Persian Empire. The Greek writer Herodotus says a Persian army sent toward Kush around 525 BCE ran out of food and turned back.',
    },
    {
        id: 'greek-amphora', name: 'Greek Wine Jar', col: -1, row: -1, color: '#b5654a', civ: 'greece',
        fact: 'A wine jar from the Mediterranean world. Greek and Roman wine, glass and bronze vessels were brought to Kush through trade.',
    },
    {
        id: 'augustus-head', name: 'Bronze Head of Augustus', col: -1, row: -1, color: '#b08d57', civ: 'rome',
        fact: 'A bronze head of the Roman emperor Augustus. One like it was found buried at Meroë, probably taken in a raid led by Queen Amanirenas around 25 BCE.',
    },
    {
        id: 'aksum-coin', name: 'Aksumite Gold Coin', col: -1, row: -1, color: '#d9b13a', civ: 'aksum',
        fact: 'A gold coin from Aksum, a rising kingdom in the highlands of Ethiopia. Aksum grew strong in the same centuries that Meroë faded.',
    },
    {
        id: 'ivory', name: 'Ivory Tusk', col: 33, row: 58, color: '#efe6cf',
        fact: 'Ivory! Elephant tusks were among the most valuable goods traded out of Africa. Craftsmen carved them into jewelry, boxes and furniture.',
    },
    {
        id: 'ebony', name: 'Ebony Log', col: 7, row: 38, color: '#2b2018',
        fact: 'Ebony is a very dark, very hard wood from Africa. Egyptians prized it for fine furniture and carvings.',
    },
    {
        id: 'iron-bar', name: 'Iron Bar', col: 23, row: 43, color: '#6b6f75',
        fact: 'An iron bar, ready for the smith. Iron tools and weapons were stronger than bronze, which made ironworking a source of power.',
    },
    {
        id: 'incense', name: 'Frankincense', col: 47, row: 45, color: '#d8c27a',
        fact: 'Frankincense is a sweet-smelling tree resin burned in temples. It was one of the most valuable trade goods of the ancient world.',
    },
    {
        id: 'granite', name: 'Granite Block', col: 75, row: 55, color: '#a39e96',
        fact: 'Granite is an extremely hard stone. Builders in Aksum cut and raised huge granite pillars without modern machines.',
    },
]