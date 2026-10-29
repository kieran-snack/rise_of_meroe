/******************************************************************************
 * File:        audio.ts
 * Author:      Kieran Provost
 * Date:        10-28-26 (Last edit)
 * Description: Sound effects and background music. Everything is made with the
 *              Web Audio API while the game runs, so there are no sound files.
 *
 * License:     MIT
 ******************************************************************************/

let ac: AudioContext | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let noise: AudioBuffer | null = null   // a short burst of random noise, for the drum

let musicOn = true
let sfxOn = true

// Browsers only allow sound after the player has clicked or pressed a key,
// so main.ts calls this from its key and mouse handlers.
export function unlockAudio() {
    if (!ac) {
        ac = new AudioContext()
        const master = ac.createGain()
        master.gain.value = 0.8
        master.connect(ac.destination)
        musicGain = ac.createGain()
        musicGain.gain.value = musicOn ? 0.5 : 0
        musicGain.connect(master)
        sfxGain = ac.createGain()
        sfxGain.gain.value = sfxOn ? 0.6 : 0
        sfxGain.connect(master)
        noise = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate)
        const data = noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        setInterval(scheduleMusic, 100)
    }
    if (ac.state === 'suspended') ac.resume()
}

export function setMusic(on: boolean) {
    musicOn = on
    if (ac && musicGain) musicGain.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.2)
}

export function setSfx(on: boolean) {
    sfxOn = on
    if (ac && sfxGain) sfxGain.gain.setTargetAtTime(on ? 0.6 : 0, ac.currentTime, 0.05)
}

// One note: it starts at `at` seconds, rises quickly, then fades away
function note(freq: number, at: number, length: number, type: OscillatorType, volume: number, out: GainNode) {
    if (!ac) return
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(volume, at + 0.01)
    env.gain.exponentialRampToValueAtTime(0.0001, at + length)
    osc.connect(env)
    env.connect(out)
    osc.start(at)
    osc.stop(at + length + 0.05)
}

// --- Sound effects ---------------------------------------------------------
export type Sfx = 'click' | 'pickup' | 'open' | 'craft' | 'build' | 'quest' | 'codex' | 'smelt'

export function sfx(name: Sfx) {
    if (!ac || !sfxGain || !sfxOn) return
    const t = ac.currentTime
    const out = sfxGain
    switch (name) {
        case 'click':
            note(880, t, 0.06, 'triangle', 0.25, out)
            break
        case 'pickup':   // two quick rising notes
            note(660, t, 0.12, 'triangle', 0.35, out)
            note(990, t + 0.07, 0.18, 'triangle', 0.3, out)
            break
        case 'open':     // a soft wooden knock and a note
            note(196, t, 0.12, 'sine', 0.4, out)
            note(392, t + 0.05, 0.25, 'triangle', 0.25, out)
            break
        case 'craft':    // a metal clink
            note(1320, t, 0.15, 'triangle', 0.25, out)
            note(1980, t + 0.02, 0.12, 'sine', 0.15, out)
            note(660, t + 0.08, 0.2, 'triangle', 0.2, out)
            break
        case 'smelt':
            note(220, t, 0.3, 'sawtooth', 0.08, out)
            note(1320, t + 0.15, 0.15, 'triangle', 0.2, out)
            break
        case 'build':    // a deep thud, then rising notes
            note(80, t, 0.5, 'sine', 0.6, out)
            ;[392, 494, 587, 784].forEach((f, i) => note(f, t + 0.15 + i * 0.1, 0.4, 'triangle', 0.25, out))
            break
        case 'quest':    // a little fanfare
            ;[523, 659, 784, 1046].forEach((f, i) => note(f, t + i * 0.09, 0.35, 'triangle', 0.28, out))
            break
        case 'codex':    // a soft bell
            note(784, t, 0.6, 'sine', 0.3, out)
            note(1175, t + 0.12, 0.7, 'sine', 0.2, out)
            break
    }
}

// --- Background music ------------------------------------------------------
// A short piece that loops: a plucked lyre plays the tune, a breathy flute answers,
// with held chords, a bass line, a hand drum and a shaker, all inside a big stone hall (reverb).
// The scale is D "Hijaz" (D, E flat, F sharp, G, A, B flat, C), common in Egyptian and Sudanese music.

const D4 = 293.66
const HIJAZ = [0, 1, 4, 5, 7, 8, 10]   // the scale as semitones above D
// a scale step (0 = D4, 7 = D5, -7 = D3 ...) as a frequency
function degree(d: number): number {
    const octave = Math.floor(d / 7)
    const semis = HIJAZ[((d % 7) + 7) % 7] + octave * 12
    return D4 * Math.pow(2, semis / 12)
}

const STEP = 60 / 84 / 4   // one sixteenth note at 84 beats per minute
const BAR = 16             // steps in a bar

// The tunes: [step in the phrase, scale step, length in steps]. Each phrase is 2 bars long.
type Phrase = [number, number, number][]
const PHRASE_A: Phrase = [[0, 4, 4], [4, 5, 2], [6, 4, 2], [8, 3, 4], [12, 2, 2], [14, 1, 2], [16, 2, 6], [22, 1, 2], [24, 0, 8]]
const PHRASE_ANSWER: Phrase = [[0, 0, 2], [2, 1, 2], [4, 2, 4], [8, 3, 2], [10, 2, 2], [12, 1, 4], [16, 2, 3], [19, 3, 1], [20, 2, 2], [22, 1, 2], [24, 0, 8]]
const PHRASE_B: Phrase = [[0, 7, 3], [3, 6, 1], [4, 5, 4], [8, 4, 2], [10, 5, 2], [12, 6, 4], [16, 7, 4], [20, 5, 2], [22, 4, 2], [24, 4, 8]]
const PHRASE_HIGH: Phrase = [[0, 11, 4], [4, 12, 2], [6, 11, 2], [8, 10, 4], [12, 9, 2], [14, 8, 2], [16, 9, 6], [22, 8, 2], [24, 7, 8]]

// The song, 2 bars at a time: which phrase, played by which instrument (null = only drums and chords)
const SONG: [Phrase | null, 'lyre' | 'flute'][] = [
    [PHRASE_A, 'lyre'], [PHRASE_ANSWER, 'lyre'], [PHRASE_B, 'flute'], [PHRASE_ANSWER, 'flute'],
    [null, 'lyre'], [PHRASE_HIGH, 'lyre'], [PHRASE_ANSWER, 'lyre'], [null, 'flute'],
]
// The chord (bass note, as a scale step) for each bar of the song
const CHORDS = [0, 0, -2, 0, 0, -3, -2, 0, 0, 0, -2, 0, 0, -3, -2, 0]

let musicIn: GainNode | null = null   // every instrument plays into this; it goes to the speakers dry and through the reverb
let nextStepAt = 0
let step = 0

function setupMusic() {
    if (!ac || !musicGain) return
    musicIn = ac.createGain()
    musicIn.connect(musicGain)
    // reverb: the sound of a big stone hall, made from noise that fades away over 2.5 seconds
    const reverb = ac.createConvolver()
    const length = ac.sampleRate * 2.5
    const impulse = ac.createBuffer(2, length, ac.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch)
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3)
    }
    reverb.buffer = impulse
    const wet = ac.createGain()
    wet.gain.value = 0.35
    musicIn.connect(reverb)
    reverb.connect(wet)
    wet.connect(musicGain)
}

function scheduleMusic() {
    if (!ac || !musicGain || !musicOn) {
        nextStepAt = 0
        return
    }
    if (!musicIn) setupMusic()
    if (nextStepAt < ac.currentTime) nextStepAt = ac.currentTime + 0.1
    // plan the notes for the next half second
    while (nextStepAt < ac.currentTime + 0.5) {
        playStep(step, nextStepAt)
        nextStepAt += STEP
        step = (step + 1) % (SONG.length * 2 * BAR)
    }
}

function playStep(s: number, at: number) {
    const bar = Math.floor(s / BAR)
    const inBar = s % BAR
    const [phrase, instrument] = SONG[Math.floor(bar / 2)]
    const inPhrase = s % (BAR * 2)
    const chord = CHORDS[bar % CHORDS.length]

    // the hand drum: the "maqsum" rhythm, DUM tek - tek DUM - tek -
    if (inBar === 0 || inBar === 8) doum(at)
    if (inBar === 4 || inBar === 6 || inBar === 12) tek(at, 0.18)
    if (inBar === 14 && bar % 4 === 3) tek(at, 0.12)      // a little extra at the end of every 4th bar
    // the shaker on the off-beats
    if (s % 2 === 1) shaker(at, inBar % 4 === 3 ? 0.05 : 0.025)

    // bass and held chords at the start of each bar
    if (inBar === 0) {
        bass(degree(chord - 14), at, STEP * 7)
        pad([degree(chord - 7), degree(chord - 3), degree(chord)], at, STEP * BAR)
    }
    if (inBar === 8) bass(degree(chord - 14), at, STEP * 6)

    // the tune
    if (phrase) {
        for (const [start, deg, len] of phrase) {
            if (start !== inPhrase) continue
            // sometimes a quick grace note just before a long note, so it never sounds exactly the same
            if (len >= 4 && Math.random() < 0.3) {
                if (instrument === 'lyre') lyre(degree(deg + 1), at - STEP * 0.5, STEP * 0.8, 0.07)
                else flute(degree(deg + 1), at - STEP * 0.5, STEP * 0.6, 0.04)
            }
            if (instrument === 'lyre') lyre(degree(deg), at, STEP * len, 0.12)
            else flute(degree(deg), at, STEP * len, 0.07)
        }
    }
}

// A plucked string: bright at first, then mellow as it fades
function lyre(freq: number, at: number, length: number, volume: number) {
    if (!ac || !musicIn) return
    const osc = ac.createOscillator()
    const osc2 = ac.createOscillator()
    const filter = ac.createBiquadFilter()
    const env = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc2.type = 'sawtooth'
    osc2.frequency.value = freq * 1.003   // slightly out of tune with the first one: sounds richer
    const sawGain = ac.createGain()
    sawGain.gain.value = 0.25
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(4200, at)
    filter.frequency.exponentialRampToValueAtTime(700, at + 0.35)
    const end = at + Math.max(0.4, length * 1.6)
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(volume, at + 0.005)
    env.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(filter)
    osc2.connect(sawGain)
    sawGain.connect(filter)
    filter.connect(env)
    env.connect(musicIn)
    osc.start(at)
    osc2.start(at)
    osc.stop(end + 0.05)
    osc2.stop(end + 0.05)
}

// A soft, breathy flute with a little wobble (vibrato)
function flute(freq: number, at: number, length: number, volume: number) {
    if (!ac || !musicIn || !noise) return
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const vibrato = ac.createOscillator()
    const depth = ac.createGain()
    vibrato.frequency.value = 5
    depth.gain.setValueAtTime(0, at)
    depth.gain.linearRampToValueAtTime(freq * 0.008, at + 0.3)   // the wobble starts a moment after the note
    vibrato.connect(depth)
    depth.connect(osc.frequency)
    const env = ac.createGain()
    const end = at + length
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(volume, at + 0.06)
    env.gain.setValueAtTime(volume, end - 0.05)
    env.gain.exponentialRampToValueAtTime(0.0001, end + 0.15)
    osc.connect(env)
    env.connect(musicIn)
    // a little breath noise on top
    const breath = ac.createBufferSource()
    breath.buffer = noise
    breath.loop = true
    const band = ac.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = freq * 2
    band.Q.value = 2
    const breathGain = ac.createGain()
    breathGain.gain.setValueAtTime(0.0001, at)
    breathGain.gain.exponentialRampToValueAtTime(volume * 0.25, at + 0.05)
    breathGain.gain.exponentialRampToValueAtTime(0.0001, end + 0.1)
    breath.connect(band)
    band.connect(breathGain)
    breathGain.connect(musicIn)
    for (const o of [osc, vibrato]) {
        o.start(at)
        o.stop(end + 0.2)
    }
    breath.start(at)
    breath.stop(end + 0.2)
}

// Held chords: soft, slightly out-of-tune saw waves, filtered so they sit quietly in the background
function pad(freqs: number[], at: number, length: number) {
    if (!ac || !musicIn) return
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const env = ac.createGain()
    const end = at + length
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(0.03, at + length * 0.3)
    env.gain.exponentialRampToValueAtTime(0.0001, end + 0.4)
    filter.connect(env)
    env.connect(musicIn)
    for (const f of freqs) {
        for (const detune of [-6, 6]) {
            const osc = ac.createOscillator()
            osc.type = 'sawtooth'
            osc.frequency.value = f
            osc.detune.value = detune
            osc.connect(filter)
            osc.start(at)
            osc.stop(end + 0.5)
        }
    }
}

// A round bass note
function bass(freq: number, at: number, length: number) {
    if (!ac || !musicIn) return
    const osc = ac.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const env = ac.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(0.16, at + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, at + length)
    osc.connect(env)
    env.connect(musicIn)
    osc.start(at)
    osc.stop(at + length + 0.05)
}

// The deep hit in the middle of the drum ("doum"): a low note that drops in pitch
function doum(at: number) {
    if (!ac || !musicIn) return
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, at)
    osc.frequency.exponentialRampToValueAtTime(55, at + 0.18)
    const env = ac.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(0.45, at + 0.005)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
    osc.connect(env)
    env.connect(musicIn)
    osc.start(at)
    osc.stop(at + 0.4)
}

// The sharp hit at the edge of the drum ("tek")
function tek(at: number, volume: number) {
    noiseHit(at, volume, 'bandpass', 2400, 0.08)
}

function shaker(at: number, volume: number) {
    noiseHit(at, volume, 'highpass', 6000, 0.05)
}

function noiseHit(at: number, volume: number, type: BiquadFilterType, freq: number, length: number) {
    if (!ac || !musicIn || !noise) return
    const src = ac.createBufferSource()
    src.buffer = noise
    const filter = ac.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    const env = ac.createGain()
    env.gain.setValueAtTime(volume, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + length)
    src.connect(filter)
    filter.connect(env)
    env.connect(musicIn)
    src.start(at)
    src.stop(at + length + 0.02)
}
