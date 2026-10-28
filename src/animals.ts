/******************************************************************************
 * File:        animals.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: The animals that wander around the lands of Kush.
 *
 * License:     MIT
 ******************************************************************************/

export interface AnimalDef {
    kind: string     // tells art.ts which picture to draw
    name: string
    area: string     // where they live (a named area from worldgen.ts)
    count: number    // how many
    fact: string     // shown when you press E next to one
}

export const animalDefs: AnimalDef[] = [
    {
        kind: 'cattle', name: 'Cattle', area: 'meroe', count: 4,
        fact: 'Cattle were a sign of wealth in Kush. At Kerma, hundreds of cattle skulls were laid around the graves of important people.',
    },
    {
        kind: 'cattle', name: 'Cattle', area: 'kerma', count: 3,
        fact: 'Cattle were a sign of wealth in Kush. At Kerma, hundreds of cattle skulls were laid around the graves of important people.',
    },
    {
        kind: 'ostrich', name: 'Ostrich', area: 'napata', count: 3,
        fact: 'Ostriches lived in the deserts of Nubia. Their feathers were traded to Egypt, and their eggshells were cut into beads.',
    },
    {
        kind: 'gazelle', name: 'Gazelle', area: 'syene', count: 3,
        fact: 'Gazelles live in the dry lands along the Nile. They appear often in the art of Egypt and Nubia.',
    },
    {
        kind: 'elephant', name: 'African Elephant', area: 'naqa', count: 2,
        fact: 'Elephants appear all over the temples of Musawwarat es-Sufra. Some historians think the Kushites captured and trained elephants there.',
    },
    {
        kind: 'giraffe', name: 'Giraffe', area: 'aksum', count: 2,
        fact: 'Giraffes were sent from Nubia to Egypt as gifts and tribute, and they appear in rock art all across the region.',
    },
]
