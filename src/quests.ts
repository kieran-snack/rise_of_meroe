/******************************************************************************
 * File:        quests.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: All quests that you have to complete.
 * 
 * License:     MIT
 ******************************************************************************/

export interface Quest {
    id: string
    title: string
    giver: string
    target: string
    requires?: string    // id of a quest that must be finished first
    needs?: string[]     // item ids you must bring (see items.ts)
    offer: string[]
    goal: string
    reminder?: string[]  // what the target says if you don't have the items yet
    thanks: string[]
    fact: string
}

export const quests: Quest[] = [
    {
        id: 'iron',
        title: 'The Iron Message',
        giver: 'Mustafa',
        target: 'Fatima',
        needs: ['iron-ore'],
        offer: [
            'Welcome to Meroë! My forge needs iron ore to make tools.',
            'Search the sandy ground east of my forge for some, then take it to Fatima. She trades my iron for me.',
        ],
        goal: 'Find iron ore and bring it to Fatima.',
        reminder: ['Have you found the iron ore yet? Mustafa said to look east of his forge.'],
        thanks: ['Iron ore! Wonderful. Mustafa will be pleased.'],
        fact: 'Meroë was one of the great iron-working centers of ancient Africa. Large heaps of leftover iron slag can still be seen at the site today.',
    },
    {
        id: 'queen',
        title: 'Word of the Queen',
        giver: 'Fatima',
        target: 'Amadi',
        needs: ['gold-nugget'],
        offer: [
            'Our land is ruled by a Kandake, a queen.',
            'Her officials collect gold. Find a gold nugget in the northeast desert and take it to Amadi.',
        ],
        goal: 'Find a gold nugget and bring it to Amadi.',
        reminder: ['I am waiting for the gold nugget. Try the desert in the northeast.'],
        thanks: ['Gold for the Kandake! I will carry it to her officials. Long live the Kandake!'],
        fact: 'Kush was sometimes ruled by powerful queens called Kandake. Around 25 BCE, the Kushite queen Amanirenas fought against the Roman Empire.',
    },
    {
        id: 'pyramids',
        title: 'The Steep Pyramids',
        giver: 'Mahmoud',
        target: 'Kasha',
        needs: ['sandstone'],
        offer: [
            'Do you see the pyramids to the east?',
            'The builders need sandstone. Find a block near the pyramids and take it to Kasha, who keeps count of the stone.',
        ],
        goal: 'Find a sandstone block and bring it to Kasha.',
        reminder: ['I still need a block of sandstone. There should be one near the pyramids.'],
        thanks: ['Sandstone! I will mark it in my records.'],
        fact: 'Sudan has more pyramids than Egypt, over 200 of them. Kushite pyramids are smaller and much steeper than Egyptian ones.',
    },
    {
        id: 'egypt-trade',
        title: 'Gifts for Egypt',
        giver: 'Fatima',
        target: 'Nebet',
        requires: 'queen',
        needs: ['ivory', 'ebony'],
        offer: [
            "Egypt pays well for the riches of Kush.",
            "Find some ivory and some ebony, then travel north into Egypt and give them to Nebet.",
        ],
        goal: 'Find ivory and ebony, then take them north to Nebet in Egypt.',
        reminder: ["Do you have the ivory and the ebony? I cannot trade with empty hands."],
        thanks: ["Ivory and ebony, just as promised. Egypt thanks you, traveler."],
        fact: 'For thousands of years, Egypt imported gold, ivory, ebony and other rare goods from Nubia and the lands farther south. Trade made Kush rich.',
    },
    {
        id: 'pharaoh',
        title: 'The Kushite Pharaohs',
        giver: 'Hori',
        target: 'Hori',
        needs: ['scarab'],
        offer: [
            "Long ago, kings from Kush ruled all of Egypt as pharaohs.",
            "A scarab amulet, a symbol of Egypt, lies in a chest far to the south in Kush. Bring it to me.",
        ],
        goal: 'Find the Egyptian scarab in a chest in Kush and bring it to Hori.',
        reminder: ["Have you found the scarab? Search the chests of Kush."],
        thanks: ["The scarab! A fine piece. You have honored both Egypt and Kush."],
        fact: 'Kushite pharaohs such as Taharqa built monuments in both Kush and Egypt, including at Karnak. Their rule is known as the 25th Dynasty.',
    },
    {
        id: 'rome-peace',
        title: 'Peace with Rome',
        giver: 'Marcus',
        target: 'Marcus',
        requires: 'queen',
        needs: ['augustus-head'],
        offer: [
            "Years ago, Kushite raiders took a bronze head of our emperor from this very town.",
            "If you can find it in Kush and bring it back, it may help keep the peace.",
        ],
        goal: 'Find the bronze head of Augustus in Kush and return it to Marcus.',
        reminder: ["The bronze head of our emperor. Have you found it yet?"],
        thanks: ["The emperor's head, back at last! Perhaps there can be peace after all."],
        fact: 'After the war, Kush and Rome made a peace treaty around 21 BCE. The Roman writer Strabo says Emperor Augustus gave up the tribute Rome had demanded from Kush.',
    },
    {
        id: 'red-sea',
        title: 'Spices of the Red Sea',
        giver: 'Demetrios',
        target: 'Demetrios',
        requires: 'egypt-trade',
        needs: ['incense'],
        offer: [
            "My ships carry goods across the Red Sea to Egypt and beyond.",
            "Frankincense is in high demand. Find some in the highlands of Aksum and bring it to me.",
        ],
        goal: 'Find frankincense in Aksum and bring it to Demetrios.',
        reminder: ["No frankincense yet? Try the highlands of Aksum, to the southeast."],
        thanks: ["Frankincense! My buyers will pay well for this."],
        fact: 'Greek and Roman ships used Red Sea ports to trade for ivory, incense and spices. The Ptolemies of Egypt even hunted war elephants along the Red Sea coast.',
    },
    {
        id: 'aksum-caravan',
        title: 'The Caravan',
        giver: 'Berhane',
        target: 'Berhane',
        needs: ['iron-bar'],
        offer: [
            "Aksum is a crossroads of trade between Africa, Arabia and India.",
            "My caravan needs iron for tools. Bring me an iron bar from the forges of Kush.",
        ],
        goal: 'Bring an iron bar from Kush to Berhane in Aksum.',
        reminder: ["Iron from the forges of Kush would help my caravan a great deal."],
        thanks: ["Good iron! My caravan can leave at dawn."],
        fact: 'Aksum grew rich as a trading crossroads. Its port, Adulis, linked Africa to Egypt, Arabia and India, and Aksum made its own gold, silver and bronze coins.',
    },
    {
        id: 'stelae',
        title: 'The Great Stelae',
        giver: 'Dawit',
        target: 'Dawit',
        needs: ['granite'],
        offer: [
            "The tall stelae of Aksum mark the tombs of kings and nobles.",
            "Find a block of fine granite at the quarry in the far southeast for my next pillar.",
        ],
        goal: 'Find a block of granite and bring it to Dawit.',
        reminder: ["I still need good granite from the quarry."],
        thanks: ["Perfect granite! This pillar will stand for centuries."],
        fact: 'Aksum raised huge stone stelae, carved from single blocks of granite. The tallest still standing is about 24 meters high, and the largest ever, now fallen, was about 33 meters.',
    },
]
