/******************************************************************************
 * File:        buildings.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: The buildings you raise to make Meroë a great capital again.
 *
 * License:     MIT
 ******************************************************************************/

import type { Ingredient } from './recipes.ts'

export interface BuildingDef {
    id: string          // also tells art.ts which picture to draw
    name: string
    plot: string        // the named area where it goes (see worldgen.ts)
    cost: Ingredient[]
    blurb: string       // shown in the build window
    fact: string        // shown when it is finished
}

export const buildingDefs: BuildingDef[] = [
    {
        id: 'houses', name: 'Mud-Brick Houses', plot: 'plot-houses',
        cost: [{ id: 'mud-brick', count: 4 }],
        blurb: 'A capital needs people, and people need homes. Ordinary houses were built of mud brick.',
        fact: 'Most people in Meroë lived in houses of mud brick. Rich families used fired brick and stone.',
    },
    {
        id: 'ironworks', name: 'The Ironworks', plot: 'plot-ironworks',
        cost: [{ id: 'mud-brick', count: 3 }, { id: 'iron-bar', count: 2 }],
        blurb: 'Furnaces and forges that turn ore into iron. Meroë became famous for its iron.',
        fact: 'Meroë had huge ironworking areas. Heaps of slag, the waste left by smelting, still cover parts of the site.',
    },
    {
        id: 'hafir', name: 'The Hafir Reservoir', plot: 'plot-hafir',
        cost: [{ id: 'cut-block', count: 4 }],
        blurb: 'A hafir is a big water tank dug into the ground. It stores rainwater for the dry months.',
        fact: 'Kush built hafirs, such as the one at Musawwarat es-Sufra, to collect rain in a land with little water.',
    },
    {
        id: 'cemetery', name: 'The Royal Pyramids', plot: 'plot-cemetery',
        cost: [{ id: 'cut-block', count: 6 }],
        blurb: 'Steep sandstone pyramids where the kings and queens of Kush were buried.',
        fact: 'Over 200 pyramids still stand in Sudan, more than in Egypt. They are small and steep, with a chapel on the east side.',
    },
    {
        id: 'temple', name: 'Temple of Amun', plot: 'plot-temple',
        cost: [{ id: 'cut-block', count: 4 }, { id: 'granite', count: 2 }, { id: 'gold-leaf', count: 2 }, { id: 'incense', count: 1 }],
        blurb: 'The great temple of the god Amun, with tall columns and gold on its walls.',
        fact: 'The Kushites worshipped Amun, as the Egyptians did, but also Apedemak, a lion god of their own.',
    },
    {
        id: 'baths', name: 'The Royal Baths', plot: 'plot-baths',
        cost: [{ id: 'cut-block', count: 4 }, { id: 'mud-brick', count: 3 }],
        blurb: 'A pool surrounded by columns, in the style of Roman baths.',
        fact: 'The Royal Baths at Meroë have a pool and decorations that show influence from the Roman world.',
    },
    {
        id: 'enclosure', name: 'The Royal Enclosure', plot: 'plot-enclosure',
        cost: [{ id: 'cut-block', count: 3 }, { id: 'mud-brick', count: 2 }, { id: 'ivory', count: 1 }, { id: 'ebony', count: 1 }, { id: 'gold-leaf', count: 2 }],
        blurb: 'The walled palace of the Kandake, where the queens ruled Kush.',
        fact: 'The Royal City of Meroë held palaces, temples and a walled royal enclosure. It was the capital of Kush for centuries.',
    },
]
