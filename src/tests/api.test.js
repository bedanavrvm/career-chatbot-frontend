/**
 * src/tests/api.test.js
 * Unit tests for api.js utility functions and error paths.
 * These tests use Vitest globals and do not need a browser / DOM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers extracted from api.js (duplicated here to test in isolation)
// ---------------------------------------------------------------------------

function normalizeErrorEnvelope(data) {
    if (!data) return { detail: 'Request failed', code: '', fields: null }
    if (typeof data === 'string') return { detail: data, code: '', fields: null }
    const d = data.detail ?? data.message ?? data.error ?? 'Request failed'
    const detail = typeof d === 'string' ? d : (Array.isArray(d) ? d.map(e => e?.msg ?? String(e)).join('; ') : String(d))
    const code = String(data.code ?? data.error_code ?? '')
    const fields = data.fields ?? data.non_field_errors ?? null
    return { detail, code, fields }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('normalizeErrorEnvelope', () => {
    it('returns fallback for null', () => {
        const out = normalizeErrorEnvelope(null)
        expect(out.detail).toBe('Request failed')
        expect(out.code).toBe('')
        expect(out.fields).toBeNull()
    })

    it('handles string payload', () => {
        const out = normalizeErrorEnvelope('Unauthorized')
        expect(out.detail).toBe('Unauthorized')
        expect(out.code).toBe('')
    })

    it('extracts detail from object', () => {
        const out = normalizeErrorEnvelope({ detail: 'Token expired', code: 'token_expired' })
        expect(out.detail).toBe('Token expired')
        expect(out.code).toBe('token_expired')
    })

    it('falls back to message key', () => {
        const out = normalizeErrorEnvelope({ message: 'Server error' })
        expect(out.detail).toBe('Server error')
    })

    it('extracts fields', () => {
        const out = normalizeErrorEnvelope({ detail: 'Bad request', fields: { email: ['Enter a valid email.'] } })
        expect(out.fields).toEqual({ email: ['Enter a valid email.'] })
    })
})

// ---------------------------------------------------------------------------
// SSE parser helper (same logic as in convStreamMessage)
// ---------------------------------------------------------------------------

describe('SSE frame parser', () => {
    function parseFrames(raw) {
        const events = []
        const frames = raw.split('\n\n')
        for (const frame of frames) {
            if (!frame.trim()) continue
            let event = 'message'
            let data = ''
            for (const line of frame.split('\n')) {
                if (line.startsWith('event:')) event = line.slice(6).trim()
                else if (line.startsWith('data:')) data = line.slice(5).trim()
            }
            if (data) events.push({ event, data: data.replace(/\\n/g, '\n') })
        }
        return events
    }

    it('parses a delta event', () => {
        const raw = 'event: delta\ndata: Hello world\n\n'
        const parsed = parseFrames(raw)
        expect(parsed).toHaveLength(1)
        expect(parsed[0].event).toBe('delta')
        expect(parsed[0].data).toBe('Hello world')
    })

    it('parses consecutive delta + done events', () => {
        const raw = 'event: delta\ndata: chunk1\n\nevent: delta\ndata: chunk2\n\nevent: done\ndata: {}\n\n'
        const parsed = parseFrames(raw)
        expect(parsed).toHaveLength(3)
        expect(parsed[2].event).toBe('done')
    })

    it('restores escaped newlines in data', () => {
        const raw = 'event: delta\ndata: line1\\nline2\n\n'
        const parsed = parseFrames(raw)
        expect(parsed[0].data).toBe('line1\nline2')
    })
})
