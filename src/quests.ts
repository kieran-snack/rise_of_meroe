/******************************************************************************
 * File:        quests.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: All quests that you have to complete.
 * 
 * License:     MIT
 ******************************************************************************/

import type { Ingredient } from './recipes.ts'

export interface Quest {
    id: string
    title: string
    giver: string
    target: string
    requires?: string    // id of a quest that must be finished first
    needs?: string[]     // item ids you must bring (see items.ts). Put an id in twice to need 2 of it
    reward?: Ingredient[] // what you get when it is done
    offer: string[]
    goal: string
    reminder?: string[]  // what the target says if you don't have the items yet
    thanks: string[]
    fact: string
}

export const quests: Quest[] = [
    {
        id: 'iron',
        reward: [{ id: 'wood', count: 3 }, { id: 'gold-nugget', count: 1 }],
        title: 'The Iron Message',
        giver: 'Mustafa',
        target: 'Fatima',
        needs: ['iron-ore', 'iron-ore'],
        offer: [
            'Welcome to Meroë! My forge needs iron ore to make tools.',
            'Look for it near the old slag heaps by the river, on the west side of Meroë, then take it to Fatima. She trades my iron for me.',
        ],
        goal: 'Find 2 iron ore and bring them to Fatima.',
        reminder: ['Have you found the iron ore yet? Mustafa said to look near the slag heaps by the river.'],
        thanks: ['Iron ore! Wonderful. Mustafa will be pleased.'],
        fact: 'Meroë was one of the great iron-working centers of ancient Africa. Large heaps of leftover iron slag can still be seen at the site today.',
    },
    {
        id: 'queen',
        reward: [{ id: 'cut-block', count: 4 }],
        title: 'Word of the Queen',
        giver: 'Fatima',
        target: 'Amadi',
        needs: ['gold-nugget', 'gold-nugget'],
        offer: [
            'Our land is ruled by a Kandake, a queen.',
            'Her officials collect gold. Find a gold nugget in the desert around Napata, north of Meroë, and take it to Amadi.',
        ],
        goal: 'Find 2 gold nuggets and bring them to Amadi.',
        reminder: ['I am waiting for the gold nugget. Try the desert around Napata, to the north.'],
        thanks: ['Gold for the Kandake! I will carry it to her officials. Long live the Kandake!'],
        fact: 'Kush was sometimes ruled by powerful queens called Kandake. Around 25 BCE, the Kushite queen Amanirenas fought against the Roman Empire.',
    },
    {
        id: 'pyramids',
        reward: [{ id: 'cut-block', count: 6 }],
        title: 'The Steep Pyramids',
        giver: 'Mahmoud',
        target: 'Kasha',
        needs: ['sandstone', 'sandstone', 'sandstone'],
        offer: [
            'Do you see the pyramids to the east?',
            'The builders need sandstone. Find a block lying near the pyramids and take it to Kasha, who keeps count of the stone.',
        ],
        goal: 'Find 3 sandstone blocks and bring them to Kasha.',
        reminder: ['I still need a block of sandstone. There should be one near the pyramids.'],
        thanks: ['Sandstone! I will mark it in my records.'],
        fact: 'Sudan has more pyramids than Egypt, over 200 of them. Kushite pyramids are smaller and much steeper than Egyptian ones.',
    },
    {
        id: 'egypt-trade',
        reward: [{ id: 'gold-leaf', count: 4 }],
        title: 'Gifts for Egypt',
        giver: 'Fatima',
        target: 'Nebet',
        requires: 'queen',
        needs: ['ivory', 'ebony'],
        offer: [
            "Egypt pays well for the riches of Kush.",
            "Find some ivory on the Red Sea coast and some ebony near Kerma, then travel north into Egypt and give them to Nebet.",
        ],
        goal: 'Find ivory and ebony, then take them north to Nebet in Egypt.',
        reminder: ["Do you have the ivory and the ebony? I cannot trade with empty hands."],
        thanks: ["Ivory and ebony, just as promised. Egypt thanks you, traveler."],
        fact: 'For thousands of years, Egypt imported gold, ivory, ebony and other rare goods from Nubia and the lands farther south. Trade made Kush rich.',
    },
    {
        id: 'pharaoh',
        reward: [{ id: 'granite', count: 2 }],
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
        reward: [{ id: 'gold-nugget', count: 3 }],
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
        reward: [{ id: 'glass-beads', count: 2 }, { id: 'gold-nugget', count: 2 }],
        title: 'Spices of the Red Sea',
        giver: 'Demetrios',
        target: 'Demetrios',
        requires: 'egypt-trade',
        needs: ['incense', 'incense'],
        offer: [
            "My ships carry goods across the Red Sea to Egypt and beyond.",
            "Frankincense is in high demand. Find some in the highlands of Aksum and bring it to me.",
        ],
        goal: 'Find 2 frankincense in Aksum and bring them to Demetrios.',
        reminder: ["No frankincense yet? Try the highlands of Aksum, to the southeast."],
        thanks: ["Frankincense! My buyers will pay well for this."],
        fact: 'Greek and Roman ships used Red Sea ports to trade for ivory, incense and spices. The Ptolemies of Egypt even hunted war elephants along the Red Sea coast.',
    },
    {
        id: 'aksum-caravan',
        reward: [{ id: 'ivory', count: 2 }],
        title: 'The Caravan',
        giver: 'Berhane',
        target: 'Berhane',
        needs: ['iron-bar', 'iron-bar'],
        offer: [
            "Aksum is a crossroads of trade between Africa, Arabia and India.",
            "My caravan needs iron for tools. Bring me 2 iron bars. Smelt iron ore with wood at the furnace in Meroë.",
        ],
        goal: 'Bring 2 iron bars from Kush to Berhane in Aksum.',
        reminder: ["I need 2 iron bars. Smelt iron ore with wood at the furnace in Meroë."],
        thanks: ["Good iron! My caravan can leave at dawn."],
        fact: 'Aksum grew rich as a trading crossroads. Its port, Adulis, linked Africa to Egypt, Arabia and India, and Aksum made its own gold, silver and bronze coins.',
    },
    {
        id: 'stelae',
        reward: [{ id: 'cut-block', count: 6 }],
        title: 'The Great Stelae',
        giver: 'Dawit',
        target: 'Dawit',
        needs: ['granite', 'granite'],
        offer: [
            "The tall stelae of Aksum mark the tombs of kings and nobles.",
            "Find a block of fine granite at the quarry in the far southeast of Aksum for my next pillar.",
        ],
        goal: 'Find 2 granite blocks and bring them to Dawit.',
        reminder: ["I still need good granite from the quarry."],
        thanks: ["Perfect granite! This pillar will stand for centuries."],
        fact: 'Aksum raised huge stone stelae, carved from single blocks of granite. The tallest still standing is about 24 meters high, and the largest ever, now fallen, was about 33 meters.',
    },
    {
        id: 'kerma-pots',
        title: 'The Potter of Kerma',
        giver: 'Tebe',
        target: 'Tebe',
        needs: ['clay', 'clay', 'clay', 'wood'],
        reward: [{ id: 'mud-brick', count: 6 }],
        offer: [
            'I make pots the way the potters of Kerma did, thin as an eggshell.',
            'Bring me 3 lumps of Nile clay and some acacia wood for my kiln. I will pay you in mud bricks for your building.',
        ],
        goal: 'Bring 3 Nile clay and 1 acacia wood to Tebe in Kerma.',
        reminder: ['I need 3 clay and 1 wood. Clay lies around Kerma, and acacia wood near Napata.'],
        thanks: ['Good clay, and dry wood! Here are the bricks I promised.'],
        fact: 'Kerma potters made beakers with walls only a few millimeters thick, with a shiny black rim and a red body. They are among the finest pots of the ancient world.',
    },
    {
        id: 'archers',
        title: 'The Land of the Bow',
        giver: 'Kheli',
        target: 'Kheli',
        needs: ['wood', 'wood', 'wood'],
        reward: [{ id: 'gold-nugget', count: 3 }],
        offer: [
            'My bow broke at practice this morning.',
            'Bring me 3 pieces of acacia wood so I can make new bows. I will give you some gold from the hills.',
        ],
        goal: 'Bring 3 acacia wood to Kheli in Napata.',
        reminder: ['Three pieces of acacia wood, friend. Look around Napata.'],
        thanks: ['Strong, springy wood. A fine bow will come from this!'],
        fact: 'Egyptians called Nubia Ta-Seti, the Land of the Bow. Kushite archers served in Egyptian armies and were famous across the ancient world.',
    },
    {
        id: 'black-pharaohs',
        title: 'The Shabti of the King',
        giver: 'Mahmoud',
        target: 'Mahmoud',
        requires: 'pyramids',
        needs: ['taharqa-shabti'],
        reward: [{ id: 'cut-block', count: 6 }],
        offer: [
            'Long ago, our kings ruled Egypt. The greatest was Taharqa.',
            'A shabti, a little figure from his tomb, is hidden in a chest near Napata. Bring it to me, and I will give you stone for your building.',
        ],
        goal: 'Find the Shabti of Taharqa in a chest near Napata and bring it to Mahmoud.',
        reminder: ['Search the chests around Napata for the shabti of King Taharqa.'],
        thanks: ['The king\'s shabti! Our history is in your hands, traveler.'],
        fact: 'Taharqa ruled both Kush and Egypt. He was buried at Nuri, near Jebel Barkal, in the largest pyramid ever built in Nubia.',
    },
    {
        id: 'script',
        title: 'Words of Kush',
        giver: 'Kasha',
        target: 'Kasha',
        requires: 'pyramids',
        needs: ['meroitic-tablet'],
        reward: [{ id: 'gold-nugget', count: 2 }],
        offer: [
            'I collect writings in our own Meroitic script.',
            'There is a carved tablet hidden in a chest near the temples of Naqa. Will you bring it to me?',
        ],
        goal: 'Find the Meroitic Tablet in a chest at Naqa and bring it to Kasha.',
        reminder: ['The tablet should be in a chest somewhere around Naqa.'],
        thanks: ['Wonderful! I will copy every sign of it.'],
        fact: 'Meroitic is one of the oldest written languages of Africa. Its letters can be read aloud, but the language itself has still not been fully understood.',
    },
    {
        id: 'apedemak',
        title: 'The Lion God',
        giver: 'Sarem',
        target: 'Sarem',
        needs: ['lion-amulet'],
        reward: [{ id: 'incense', count: 2 }],
        offer: [
            'An amulet of Apedemak, our lion god, was lost near this temple.',
            'It is in a chest somewhere around Naqa. Please bring it back to me.',
        ],
        goal: 'Find the Lion Amulet in a chest at Naqa and bring it to Sarem.',
        reminder: ['The amulet must be in a chest near Naqa.'],
        thanks: ['The lion returns to his temple! Take this incense, with my thanks.'],
        fact: 'The Lion Temple at Naqa was built by King Natakamani and Queen Amanitore about 2,000 years ago. Its walls show the royal couple next to Apedemak.',
    },
    {
        id: 'kandake',
        title: "The Queen's Ring",
        giver: 'Fatima',
        target: 'Mahmoud',
        requires: 'queen',
        needs: ['kandake-ring'],
        reward: [{ id: 'gold-leaf', count: 4 }],
        offer: [
            'A gold ring that belonged to a Kandake was lost somewhere near Meroë.',
            'It must be in a chest. Find it and bring it to Mahmoud, who keeps the royal records.',
        ],
        goal: "Find the Queen's Gold Ring in a chest near Meroë and bring it to Mahmoud.",
        reminder: ["Have you found the queen's ring? Fatima said it was in a chest near Meroë."],
        thanks: ['The ring of a Kandake! It will go back to the royal treasury.'],
        fact: 'Kandakes such as Amanirenas, Amanitore and Amanishakheto ruled Kush. Amanishakheto\'s pyramid at Meroë held a treasure of gold jewelry, now in museums in Berlin and Munich.',
    },
]
