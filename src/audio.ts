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
// A slow plucked melody over a low drone, with a soft hand drum.
// The scale (D, E flat, F sharp, G, A, B flat, C) gives it a desert sound.
const SCALE = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 261.63, 293.66, 311.13, 369.99, 392.0, 440.0]
const BEAT = 60 / 76 / 2            // one eighth note at 76 beats per minute
let nextBeatAt = 0
let beat = 0
let melodyStep = 4
let drone: OscillatorNode[] = []

function scheduleMusic() {
    if (!ac || !musicGain || !noise) return
    if (!musicOn) {
        // stop the drone while the music is off
        drone.forEach(o => o.stop())
        drone = []
        nextBeatAt = 0
        return
    }
    if (drone.length === 0) {
        // the drone: two low notes that keep sounding
        for (const f of [73.42, 110.0]) {
            const o = ac.createOscillator()
            const g = ac.createGain()
            o.type = 'sine'
            o.frequency.value = f
            g.gain.value = 0.07
            o.connect(g)
            g.connect(musicGain)
            o.start()
            drone.push(o)
        }
    }
    if (nextBeatAt < ac.currentTime) nextBeatAt = ac.currentTime + 0.1
    // plan the notes for the next half second
    while (nextBeatAt < ac.currentTime + 0.5) {
        const at = nextBeatAt
        // the drum: low on the first beat of the bar, softer on the third
        if (beat % 8 === 0 || beat % 8 === 5) drum(at, beat % 8 === 0 ? 0.5 : 0.3, beat % 8 === 0 ? 300 : 600)
        // the melody: wanders up and down the scale, with some rests
        if (Math.random() < 0.55) {
            melodyStep = Math.max(0, Math.min(SCALE.length - 1, melodyStep + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]))
            note(SCALE[melodyStep] * 2, at, BEAT * 3, 'triangle', 0.12, musicGain)
            note(SCALE[melodyStep] * 4, at, BEAT * 1.5, 'sine', 0.03, musicGain)   // a little shine on top
        }
        nextBeatAt += BEAT
        beat++
    }
}

function drum(at: number, volume: number, cutoff: number) {
    if (!ac || !musicGain || !noise) return
    const src = ac.createBufferSource()
    src.buffer = noise
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const env = ac.createGain()
    env.gain.setValueAtTime(volume, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
    src.connect(filter)
    filter.connect(env)
    env.connect(musicGain)
    src.start(at)
    src.stop(at + 0.3)
}
