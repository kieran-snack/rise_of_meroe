/******************************************************************************
 * File:        inventory.ts
 * Author:      Kieran Provost
 * Date:        10-27-26 (Last edit)
 * Description: The rules for slots, stacks and moving items around with the
 *              mouse, like in Minecraft. No drawing happens in here.
 *
 * License:     MIT
 ******************************************************************************/

// A pile of identical items, like "12 Dates".
export interface Stack {
    id: string
    count: number
}

// A row of slots. A slot is either a stack or null (empty).
export type Slots = (Stack | null)[]

export const MAX_STACK = 64

// The stack stuck to the mouse cursor while you carry it around.
export interface Held {
    stack: Stack | null
}

export function makeSlots(n: number): Slots {
    return Array.from({ length: n }, () => null)
}

// How many of this item are in the slots, in total?
export function countIn(slots: Slots, id: string): number {
    let total = 0
    for (const s of slots) {
        if (s && s.id === id) total += s.count
    }
    return total
}

// Put n of an item into slots from..to-1. It tops up half-full stacks first,
// then uses empty slots. Returns how many did NOT fit.
export function addTo(slots: Slots, id: string, n = 1, from = 0, to = slots.length): number {
    let left = n
    for (let i = from; i < to && left > 0; i++) {
        const s = slots[i]
        if (s && s.id === id && s.count < MAX_STACK) {
            const put = Math.min(MAX_STACK - s.count, left)
            s.count += put
            left -= put
        }
    }
    for (let i = from; i < to && left > 0; i++) {
        if (slots[i] === null) {
            const put = Math.min(MAX_STACK, left)
            slots[i] = { id, count: put }
            left -= put
        }
    }
    return left
}

// Take n of an item out of the slots. If there aren't enough, it takes nothing and returns false.
export function removeFrom(slots: Slots, id: string, n = 1): boolean {
    if (countIn(slots, id) < n) return false
    let left = n
    for (let i = slots.length - 1; i >= 0 && left > 0; i--) {
        const s = slots[i]
        if (s && s.id === id) {
            const take = Math.min(s.count, left)
            s.count -= take
            left -= take
            if (s.count === 0) slots[i] = null
        }
    }
    return true
}

// LEFT click on slot i: pick up, put down, merge or swap the whole stack
export function leftClick(slots: Slots, i: number, held: Held): void {
    const s = slots[i]
    const h = held.stack
    if (h === null) {
        if (s) {
            held.stack = s          // pick it up
            slots[i] = null
        }
    } else if (s === null) {
        slots[i] = h                // put it down
        held.stack = null
    } else if (s.id === h.id) {
        const put = Math.min(MAX_STACK - s.count, h.count)   // merge as much as fits
        s.count += put
        h.count -= put
        if (h.count === 0) held.stack = null
    } else {
        slots[i] = h                // different items: swap
        held.stack = s
    }
}

// RIGHT click on slot i: pick up half a stack, or put down just one item
export function rightClick(slots: Slots, i: number, held: Held): void {
    const s = slots[i]
    const h = held.stack
    if (h === null) {
        if (s) {
            const take = Math.ceil(s.count / 2)
            held.stack = { id: s.id, count: take }
            s.count -= take
            if (s.count === 0) slots[i] = null
        }
    } else if (s === null) {
        slots[i] = { id: h.id, count: 1 }
        h.count--
        if (h.count === 0) held.stack = null
    } else if (s.id === h.id) {
        if (s.count < MAX_STACK) {
            s.count++
            h.count--
            if (h.count === 0) held.stack = null
        }
    } else {
        slots[i] = h                // different items: swap, like a left click
        held.stack = s
    }
}

// Where shift-click may send a stack: slots from..to-1 of a list
export interface Target {
    slots: Slots
    from: number
    to: number
}

// SHIFT click on slot i: send the whole stack to the first place it fits
export function shiftClick(slots: Slots, i: number, targets: Target[]): void {
    const s = slots[i]
    if (!s) return
    slots[i] = null   // lift the stack out first, so it can never merge into itself
    let left = s.count
    for (const t of targets) {
        left = addTo(t.slots, s.id, left, t.from, t.to)
        if (left === 0) break
    }
    if (left > 0) slots[i] = { id: s.id, count: left }   // whatever did not fit goes back
}

// Take ONE item out of slot i (for dropping with Q). Returns its id, or null if the slot is empty.
export function takeOne(slots: Slots, i: number): string | null {
    const s = slots[i]
    if (!s) return null
    s.count--
    const id = s.id
    if (s.count === 0) slots[i] = null
    return id
}
