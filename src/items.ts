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
    spawn?: { area: string; count: number; nearWater?: boolean; gap?: number } // lies on the ground at random spots in this part of the world (see worldgen.ts)
}
// Items with col: -1 and row: -1 are not on the ground. They are found in chests (see chests.ts).

export const itemDefs: ItemDef[] = [
    {
        id: 'iron-ore', name: 'Iron Ore', col: -1, row: -1, spawn: { area: 'slag', count: 6, gap: 2 }, color: '#5b5f66',
        fact: 'Iron ore! Kushite smiths heated ore like this in furnaces fueled by charcoal. Meroë was so busy with ironworking that mounds of leftover slag are still there today.',
    },
    {
        id: 'gold-nugget', name: 'Gold Nugget', col: -1, row: -1, spawn: { area: 'napata', count: 5 }, color: '#e8c75a',
        fact: 'Gold! Nubia, the land of Kush, was famous for its gold. Its name may even come from the old Egyptian word for gold.',
    },
    {
        id: 'sandstone', name: 'Sandstone Block', col: -1, row: -1, spawn: { area: 'meroe', count: 14 }, color: '#c9a265',
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
        id: 'ivory', name: 'Ivory Tusk', col: -1, row: -1, spawn: { area: 'coast', count: 3 }, color: '#efe6cf',
        fact: 'Ivory! Elephant tusks were among the most valuable goods traded out of Africa. Craftsmen carved them into jewelry, boxes and furniture.',
    },
    {
        id: 'ebony', name: 'Ebony Log', col: -1, row: -1, spawn: { area: 'kerma', count: 3 }, color: '#2b2018',
        fact: 'Ebony is a very dark, very hard wood from Africa. Egyptians prized it for fine furniture and carvings.',
    },
    {
        id: 'iron-bar', name: 'Iron Bar', col: -1, row: -1, color: '#6b6f75', civ: 'iron',
        fact: 'An iron bar, ready for the smith. Iron tools and weapons were stronger than bronze, which made ironworking a source of power.',
    },
    {
        id: 'incense', name: 'Frankincense', col: -1, row: -1, spawn: { area: 'aksum', count: 3 }, color: '#d8c27a',
        fact: 'Frankincense is a sweet-smelling tree resin burned in temples. It was one of the most valuable trade goods of the ancient world.',
    },
    {
        id: 'granite', name: 'Granite Block', col: -1, row: -1, spawn: { area: 'granite-quarry', count: 4 }, color: '#a39e96',
        fact: 'Granite is an extremely hard stone. Builders in Aksum cut and raised huge granite pillars without modern machines.',
    },
    {
        id: 'wood', name: 'Acacia Wood', col: -1, row: -1, color: '#8a5a2b', spawn: { area: 'napata', count: 12 },
        fact: 'Wood and charcoal fueled the furnaces of Meroë. Smelting iron used so much fuel that the forests around the city were cut down.',
    },
    {
        id: 'clay', name: 'Nile Clay', col: -1, row: -1, color: '#9a6b4a', spawn: { area: 'kerma', count: 10 },
        fact: 'Clay from the banks of the Nile was shaped into bricks and pots, and dried in the sun or baked in a kiln.',
    },
    {
        id: 'mud-brick', name: 'Mud Brick', col: -1, row: -1, color: '#b0764a',
        fact: 'Mud bricks are made of clay and straw, dried in the sun. They keep houses cool in the desert heat.',
    },
    {
        id: 'cut-block', name: 'Cut Sandstone', col: -1, row: -1, color: '#d6b57a', civ: 'meroe',
        fact: 'Cut sandstone blocks were stacked to build the pyramids and temples of Kush.',
    },
    {
        id: 'gold-leaf', name: 'Gold Leaf', col: -1, row: -1, color: '#f0d060',
        fact: 'Gold can be hammered into sheets so thin that a little covers a large surface. Temples and tombs were decorated with it.',
    },
    {
        id: 'kerma-beaker', name: 'Kerma Beaker', col: -1, row: -1, color: '#9a3a24', civ: 'kerma',
        fact: 'A thin clay beaker from Kerma, red with a shiny black top. Kerma potters were among the best of the ancient world.',
    },
    {
        id: 'taharqa-shabti', name: 'Shabti of Taharqa', col: -1, row: -1, color: '#5aa88f', civ: 'pharaohs',
        fact: 'A small stone figure from the tomb of King Taharqa. Over 1,000 shabtis were buried with him to work for him in the afterlife.',
    },
    {
        id: 'kandake-ring', name: "Queen's Gold Ring", col: -1, row: -1, color: '#e8b830', civ: 'kandake',
        fact: 'A gold ring like the ones found in the pyramid of Queen Amanishakheto at Meroë, decorated with gods and gems.',
    },
    {
        id: 'meroitic-tablet', name: 'Meroitic Tablet', col: -1, row: -1, color: '#a8946e', civ: 'script',
        fact: 'A stone carved in Meroitic writing. We can read the letters aloud today, but nobody knows what most of the words mean.',
    },
    {
        id: 'lion-amulet', name: 'Lion Amulet', col: -1, row: -1, color: '#c98a3a', civ: 'apedemak',
        fact: 'A small lion charm for Apedemak, the lion god of Kush, who protected the king in war.',
    },
    {
        id: 'gold-collar', name: 'Gold Collar', col: -1, row: -1, color: '#f0c840',
        fact: 'A wide collar of gold and blue faience, the kind worn by the kings and queens of Kush.',
    },
    {
        id: 'bead-necklace', name: 'Bead Necklace', col: -1, row: -1, color: '#5ab8a8',
        fact: 'A necklace of glass beads and cowrie shells. Jewelry like this was worn all over Kush.',
    },
    {
        id: 'copper-mirror', name: 'Copper Mirror', col: -1, row: -1, color: '#d08a50',
        fact: 'A polished copper mirror. People in Kush used mirrors like this long before glass mirrors.',
    },
    {
        id: 'iron-spear', name: 'Iron Spear', col: -1, row: -1, color: '#7a7f88',
        fact: 'An iron spear. Iron weapons helped Kush defend itself, even against Rome.',
    },
    {
        id: 'iron-hoe', name: 'Iron Hoe', col: -1, row: -1, color: '#6b6f75',
        fact: 'An iron hoe for digging fields. Iron tools helped farmers grow more food.',
    },
    {
        id: 'lion-statue', name: 'Lion Statue', col: -1, row: -1, color: '#d9b878',
        fact: 'A small stone lion for Apedemak, the lion god of Kush.',
    },
    {
        id: 'offering-table', name: 'Offering Table', col: -1, row: -1, color: '#9a958d',
        fact: 'A stone offering table, carved with a prayer in Meroitic writing.',
    },
    {
        id: 'feather-fan', name: 'Ostrich Feather Fan', col: -1, row: -1, color: '#f5efe2',
        fact: 'A royal fan of ostrich feathers on a wooden handle.',
    },
    {
        id: 'leopard-cloak', name: 'Leopard-Skin Cloak', col: -1, row: -1, color: '#d8a24a',
        fact: 'A cloak of leopard skin, worn by priests in ceremonies.',
    },
    {
        id: 'sorghum-bread', name: 'Sorghum Bread', col: -1, row: -1, color: '#c8964f',
        fact: 'A flat loaf of sorghum bread, a main food of Kush.',
    },
    {
        id: 'date-cakes', name: 'Date Cakes', col: -1, row: -1, color: '#7a4422',
        fact: 'Sweet cakes of pressed dates, good food for a long journey.',
    },
    {
        id: 'black-pot', name: 'Black-Topped Pot', col: -1, row: -1, color: '#8a2e1c',
        fact: 'A red pot with a shiny black rim, made the old way of the Kerma potters.',
    },
    {
        id: 'cowrie', name: 'Cowrie Shell', col: -1, row: -1, color: '#f1e3cf',
        fact: 'Cowrie shells come from the sea, yet they turn up in graves far inland in Africa. People wore them as jewelry, and traders carried them far from the coast.',
    },
    {
        id: 'faience-beads', name: 'Blue Faience Beads', col: -1, row: -1, color: '#3aa6c4',
        fact: 'Bright blue faience, made from ground quartz with a glassy glaze, was used for beads and amulets in both Egypt and Kush.',
    },
    {
        id: 'ostrich-feathers', name: 'Ostrich Feathers', col: -1, row: -1, color: '#efe9dc',
        fact: 'Ostrich feathers from the deserts south of Egypt were prized for fans and headdresses. They were a classic trade good from Nubia.',
    },
    {
        id: 'leopard-skin', name: 'Leopard Skin', col: -1, row: -1, color: '#c8963e',
        fact: 'Leopard skins from the lands south of Egypt, including Nubia, were worn by Egyptian priests during religious ceremonies.',
    },
    {
        id: 'sorghum', name: 'Sorghum Grain', col: -1, row: -1, color: '#b9873f',
        fact: 'Sorghum is a hardy grain that grows well in dry country. It was an important food in ancient Sudan.',
    },
    {
        id: 'dates', name: 'Dates', col: -1, row: -1, color: '#6b3a1d',
        fact: 'Date palms grew along the Nile. Dates are sweet and keep well, which made them good food for travelers.',
    },
    {
        id: 'glass-beads', name: 'Glass Beads', col: -1, row: -1, color: '#4aa38f',
        fact: 'Glass beads made in the Roman world reached Kush through trade, and some were buried with the people who owned them.',
    },
    {
        id: 'copper-bracelet', name: 'Copper Bracelet', col: -1, row: -1, color: '#b86f3d',
        fact: 'Metalworkers in Kush made jewelry and tools from copper and bronze, as well as from iron and gold.',
    },
]