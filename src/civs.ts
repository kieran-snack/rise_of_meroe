/******************************************************************************
 * File:        civs.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: The outside civilizations that Kush met (shown in the Codex).
 * 
 * License:     MIT
 ******************************************************************************/

export interface Civ {
    id: string        // matches the `civ` field on items in items.ts
    name: string
    years: string
    relation: string  // how Kush and this civilization got along
    summary: string
}

export const civs: Civ[] = [
    {
        id: 'egypt',
        name: 'Egypt',
        years: 'Neighbors for thousands of years',
        relation: 'Trade, war and shared gods',
        summary: 'Egypt, to the north, controlled parts of Nubia for centuries and traded with Kush. Around 744 BCE the Kushite king Piye conquered Egypt, and Kushite pharaohs ruled it as the 25th Dynasty for almost a century. Kush kept many Egyptian customs, including pyramid burials and the worship of the god Amun.',
    },
    {
        id: 'assyria',
        name: 'Assyria',
        years: '600s BCE',
        relation: 'War',
        summary: 'The Assyrian empire, from what is now Iraq, invaded Egypt in the 670s BCE with iron weapons and drove out the Kushite pharaoh Taharqa. The Kushites retreated south into their homeland and never ruled Egypt again.',
    },
    {
        id: 'persia',
        name: 'Persia',
        years: 'From 525 BCE',
        relation: 'Conquest of Egypt, no conquest of Kush',
        summary: 'The Persian king Cambyses II conquered Egypt in 525 BCE. The Greek writer Herodotus says he then sent an army toward Kush, but it ran out of food and turned back. Kush stayed free of Persian rule, though Persian records list the Kushites among the peoples who sent gifts.',
    },
    {
        id: 'greece',
        name: 'Greece and the Ptolemies',
        years: '300s to 30 BCE',
        relation: 'Trade and ideas',
        summary: 'After Alexander the Great conquered Egypt, Greek kings called the Ptolemies ruled it from 305 BCE. Greek writers called the lands to the south Aithiopia and wrote about Kush. Greek wine jars, glass and bronze vessels reached Meroë through trade.',
    },
    {
        id: 'rome',
        name: 'Rome',
        years: 'From 30 BCE',
        relation: 'War, then peace',
        summary: 'Rome took over Egypt in 30 BCE. Around 25 BCE the Kushite queen Amanirenas attacked the Roman border town of Syene. A bronze head of Emperor Augustus, found buried under the steps of a temple at Meroë, is thought to be loot from that raid. Rome struck back, but a peace treaty around 21 BCE ended the war, and Kush kept its independence.',
    },
    {
        id: 'aksum',
        name: 'Aksum',
        years: '100s to 300s CE',
        relation: 'A rising rival',
        summary: 'Aksum, a powerful kingdom in the highlands of present-day Ethiopia and Eritrea, grew rich on Red Sea trade and made its own gold coins. By the 300s CE Meroë was weakening, and an Aksumite king named Ezana wrote about campaigns along the Nile. Soon after, the kingdom of Meroë came to an end.',
    },
]
