import { describe, expect, it, beforeEach } from 'vitest'
import {
  addToCompare,
  removeFromCompare,
  isCompareFull,
  canCompare,
  encodeCompareIds,
  parseCompareIds,
  loadCompareIds,
  saveCompareIds,
  buildAmenityDiff,
  MAX_COMPARE,
  COMPARE_STORAGE_KEY,
} from '@/lib/compare'

describe('addToCompare', () => {
  it('adds a new listing', () => {
    expect(addToCompare(['a'], 'b')).toEqual({ ids: ['a', 'b'], added: true })
  })

  it('rejects a 4th with a full error rather than replacing', () => {
    const result = addToCompare(['a', 'b', 'c'], 'd')
    expect(result.added).toBe(false)
    expect(result.error).toBe('full')
    expect(result.ids).toEqual(['a', 'b', 'c'])
  })

  it('rejects duplicates as a no-op', () => {
    const result = addToCompare(['a', 'b'], 'a')
    expect(result.added).toBe(false)
    expect(result.error).toBe('duplicate')
    expect(result.ids).toEqual(['a', 'b'])
  })
})

describe('tray helpers', () => {
  it('removes a listing', () => {
    expect(removeFromCompare(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('knows when full', () => {
    expect(isCompareFull(['a', 'b', 'c'])).toBe(true)
    expect(isCompareFull(['a', 'b'])).toBe(false)
  })

  it('requires at least two to compare', () => {
    expect(canCompare(['a'])).toBe(false)
    expect(canCompare(['a', 'b'])).toBe(true)
  })
})

describe('URL sharing', () => {
  it('encodes and parses ids symmetrically', () => {
    expect(encodeCompareIds(['a', 'b', 'c'])).toBe('a,b,c')
    expect(parseCompareIds('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('caps at MAX_COMPARE and de-duplicates', () => {
    expect(parseCompareIds('a, b , c, d, a')).toEqual(['a', 'b', 'c'])
    expect(encodeCompareIds(['a', 'a', 'b', 'c', 'd'])).toBe('a,b,c')
  })

  it('handles empty / missing input', () => {
    expect(parseCompareIds('')).toEqual([])
    expect(parseCompareIds(null)).toEqual([])
    expect(parseCompareIds(undefined)).toEqual([])
  })
})

describe('sessionStorage persistence', () => {
  function makeStorage() {
    const map = new Map<string, string>()
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      _map: map,
    }
  }

  let storage: ReturnType<typeof makeStorage>
  beforeEach(() => {
    storage = makeStorage()
  })

  it('round-trips compare ids (survives navigation within a session)', () => {
    saveCompareIds(['a', 'b'], storage)
    expect(storage._map.get(COMPARE_STORAGE_KEY)).toBe(JSON.stringify(['a', 'b']))
    expect(loadCompareIds(storage)).toEqual(['a', 'b'])
  })

  it('caps stored ids at MAX_COMPARE', () => {
    saveCompareIds(['a', 'b', 'c', 'd'], storage)
    expect(loadCompareIds(storage)).toHaveLength(MAX_COMPARE)
  })

  it('returns empty on malformed storage', () => {
    storage.setItem(COMPARE_STORAGE_KEY, '{not json')
    expect(loadCompareIds(storage)).toEqual([])
  })

  it('is a no-op without storage', () => {
    expect(() => saveCompareIds(['a'], null)).not.toThrow()
    expect(loadCompareIds(null)).toEqual([])
  })
})

describe('buildAmenityDiff', () => {
  it('reports per-listing availability and highlights differences', () => {
    const rows = buildAmenityDiff([
      { amenities: ['wifi', 'parking'] },
      { amenities: ['wifi'] },
    ])
    const wifi = rows.find((r) => r.amenity === 'wifi')!
    const parking = rows.find((r) => r.amenity === 'parking')!
    expect(wifi.availability).toEqual([true, true])
    expect(wifi.differs).toBe(false)
    expect(parking.availability).toEqual([true, false])
    expect(parking.differs).toBe(true)
  })

  it('sorts amenities and unions across listings', () => {
    const rows = buildAmenityDiff([{ amenities: ['pool'] }, { amenities: ['ac', 'pool'] }])
    expect(rows.map((r) => r.amenity)).toEqual(['ac', 'pool'])
  })
})
