/******************************************************************************
 * File:        quests.ts
 * Author:      Kieran Provost
 * Date:        10-26-26 (Last edit)
 * Description: The quest and fact data for the Rise of Meroe.
 * 
 * License:     MIT
 ******************************************************************************/

export interface Quest {
    id: string
    title: string
    giver: string
    target: string
    offer: string[]
    goal: string
    thanks: string[]
    fact: string
}

export const quests: Quest[] = [
    {
        id: 'iron',
        title: 'The Iron Message',
        giver: 'Mustafa',
        target: 'Fatima',
        offer: ['Welcome to Meroë! Our smiths make iron tools.', 'Please tell Fatima her iron order is ready.'],
        goal: 'Tell Fatima the iron is ready.',
        thanks: ['Wonderful! The iron is ready at last.'],
        fact: 'Meroë was one of the great iron-working centers of ancient Africa. Large heaps of leftover iron slag can still be seen at the site today.',
    },
    {
        id: 'queen',
        title: 'Word of the Queen',
        giver: 'Fatima',
        target: 'Amadi',
        offer: ['Our land is ruled by a Kandake, a queen.', 'Please bring this news to Amadi.'],
        goal: 'Bring the news of the Kandake to Amadi.',
        thanks: ['Long live the Kandake!'],
        fact: 'Kush was sometimes ruled by powerful queens called Kandake. Around 25 BCE, the Kushite queen Amanirenas fought against the Roman Empire.',
    },
    {
        id: 'pyramids',
        title: 'The Steep Pyramids',
        giver: 'Mahmoud',
        target: 'Kasha',
        offer: ['Do you see the pyramids to the south?', 'Tell Kasha the builders need more stone.'],
        goal: 'Tell Kasha the builders need stone.',
        thanks: ['I will send stone to the builders today.'],
        fact: 'Sudan has more pyramids than Egypt, over 200 of them. Kushite pyramids are smaller and much steeper than Egyptian ones.',
    }
        
]