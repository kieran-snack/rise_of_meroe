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
    group?: 'kush'    // pages about Kush itself (the others are about its neighbors)
}

export const civs: Civ[] = [
    // ---- Kush itself ----
    {
        id: 'kerma', group: 'kush',
        name: 'Kerma',
        years: 'About 2500 to 1500 BCE',
        relation: 'The first kingdom of Kush',
        summary: 'The first great kingdom of Nubia grew up around the city of Kerma, near the Third Cataract of the Nile. Its people built a huge mud-brick temple, the Western Deffufa, and buried their kings under large round mounds. Kerma potters made famous thin beakers with a black top and a red body. Around 1500 BCE Egypt conquered Kerma.',
    },
    {
        id: 'pharaohs', group: 'kush',
        name: 'The Black Pharaohs',
        years: 'About 744 to 656 BCE',
        relation: 'Kush rules Egypt',
        summary: 'A new Kushite kingdom grew strong at Napata, near the holy mountain Jebel Barkal. King Piye marched north and conquered Egypt, and his family ruled it as the 25th Dynasty. Taharqa, the most famous of them, built temples from Napata to Karnak and was buried in the largest pyramid at Nuri. The Assyrians later drove the Kushite kings back south.',
    },
    {
        id: 'meroe', group: 'kush',
        name: 'Meroë',
        years: 'About 590 BCE to 350 CE',
        relation: 'The capital of Kush',
        summary: 'The capital of Kush moved south to Meroë, between the Nile and the Atbara River. Rain fell there, so farmers and herders could live away from the river. The city had palaces, temples, the Royal Baths and huge iron workshops, and more than 200 steep pyramids stand in the region. Meroë declined in the 300s CE, as Aksum grew strong.',
    },
    {
        id: 'kandake', group: 'kush',
        name: 'The Kandakes',
        years: 'Ruling queens of Kush',
        relation: 'Women in power',
        summary: 'Kandake was the title of the queen mother, and several Kandakes ruled Kush themselves. Queen Amanirenas led the war against Rome around 25 BCE, and Queen Amanitore built temples at Naqa and Meroë. Kushite art shows queens as strong rulers. In 1834 a treasure hunter found gold jewelry in the pyramid of Queen Amanishakheto.',
    },
    {
        id: 'script', group: 'kush',
        name: 'Meroitic Writing',
        years: 'From about 200 BCE',
        relation: 'The language of Kush',
        summary: 'The Kushites first wrote in Egyptian hieroglyphs, but later made their own writing for their own language. Meroitic had a picture form for monuments and a quick cursive form for everyday writing. Scholars can read the sounds of the letters today, but they still understand only a few words of the language.',
    },
    {
        id: 'apedemak', group: 'kush',
        name: 'Apedemak, the Lion God',
        years: 'The gods of Kush',
        relation: 'Religion',
        summary: 'Kushites worshipped Egyptian gods such as Amun, but also gods of their own. Apedemak, a war god with the head of a lion, had temples at Naqa and Musawwarat es-Sufra. On the Lion Temple at Naqa he is shown with three lion heads and four arms, and with the body of a snake.',
    },
    {
        id: 'iron', group: 'kush',
        name: 'Iron and Trade',
        years: 'The riches of Kush',
        relation: 'How Kush grew rich',
        summary: 'Meroë was a great center of iron. Smiths smelted ore in furnaces burning charcoal, and heaps of slag still lie around the city. Kush also sent gold, ivory, ebony, incense and animal skins north to Egypt and the Mediterranean, and east to the Red Sea. Trade made Kush rich and powerful.',
    },
    // ---- The world around Kush ----
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
