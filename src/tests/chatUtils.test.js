/**
 * src/tests/chatUtils.test.js
 * Unit tests for the citation-parsing helpers used in Chat.vue.
 * These are pure functions extracted for testing without mounting a component.
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Pure helpers (copy of Chat.vue inline functions)
// ---------------------------------------------------------------------------

function extractCitationIds(text) {
    const s = String(text || '')
    const re = /\[(P\d+)\]/g
    const out = []
    const seen = new Set()
    let m
    while ((m = re.exec(s)) !== null) {
        const id = m[1]
        if (!seen.has(id)) {
            seen.add(id)
            out.push(id)
        }
    }
    return out
}

function splitByCitations(text) {
    const s = String(text || '')
    const re = /\[(P\d+)\]/g
    const parts = []
    let last = 0
    let m
    while ((m = re.exec(s)) !== null) {
        const start = m.index
        const end = m.index + m[0].length
        if (start > last) parts.push({ type: 'text', value: s.slice(last, start) })
        parts.push({ type: 'cite', value: m[1] })
        last = end
    }
    if (last < s.length) parts.push({ type: 'text', value: s.slice(last) })
    return parts
}

function segmentsForMessage(msg) {
    if (!msg || msg.role !== 'assistant') return [{ type: 'text', value: msg?.content || '' }]
    return splitByCitations(msg.content)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('extractCitationIds', () => {
    it('returns empty array for text with no citations', () => {
        expect(extractCitationIds('Hello world')).toEqual([])
    })

    it('extracts single citation', () => {
        expect(extractCitationIds('See [P1] for details')).toEqual(['P1'])
    })

    it('extracts multiple unique citations in order', () => {
        expect(extractCitationIds('[P3] and [P1], see also [P2]')).toEqual(['P3', 'P1', 'P2'])
    })

    it('deduplicates repeated citations', () => {
        expect(extractCitationIds('[P1] again [P1]')).toEqual(['P1'])
    })

    it('handles null / undefined gracefully', () => {
        expect(extractCitationIds(null)).toEqual([])
        expect(extractCitationIds(undefined)).toEqual([])
    })
})

describe('splitByCitations', () => {
    it('returns single text segment when no citations', () => {
        const parts = splitByCitations('Just text')
        expect(parts).toEqual([{ type: 'text', value: 'Just text' }])
    })

    it('splits text and citation correctly', () => {
        const parts = splitByCitations('See [P1] here')
        expect(parts).toEqual([
            { type: 'text', value: 'See ' },
            { type: 'cite', value: 'P1' },
            { type: 'text', value: ' here' },
        ])
    })

    it('handles citation at start', () => {
        const parts = splitByCitations('[P1] starts here')
        expect(parts[0]).toEqual({ type: 'cite', value: 'P1' })
    })

    it('handles citation at end', () => {
        const parts = splitByCitations('Ends with [P2]')
        expect(parts[parts.length - 1]).toEqual({ type: 'cite', value: 'P2' })
    })
})

describe('segmentsForMessage', () => {
    it('returns text segment for user message', () => {
        const msg = { role: 'user', content: 'Hello [P1]' }
        const segs = segmentsForMessage(msg)
        expect(segs).toEqual([{ type: 'text', value: 'Hello [P1]' }])
    })

    it('parses citations in assistant message', () => {
        const msg = { role: 'assistant', content: 'See [P1] and [P2]' }
        const segs = segmentsForMessage(msg)
        expect(segs.some(s => s.type === 'cite')).toBe(true)
    })

    it('handles null message gracefully', () => {
        const segs = segmentsForMessage(null)
        expect(segs).toEqual([{ type: 'text', value: '' }])
    })
})
