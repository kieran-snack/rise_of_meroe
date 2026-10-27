export interface Quest {
    id: string
    title: string
    giver: string
    target: string
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
]
