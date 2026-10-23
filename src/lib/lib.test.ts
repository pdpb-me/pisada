import { describe, expect, it } from 'vitest'
import { addDays, toISODate, weekOf } from '@/lib/dates'
import { num } from '@/lib/ladder'
import { painBand, painLabel, painLevelFor } from '@/lib/pain'
import { tinglingLabel } from '@/lib/tingling'
import { compare, dailySeries } from '@/lib/trends'
import { changeText, weightChange } from '@/lib/weight'

describe('dates (local calendar days)', () => {
  it('adds days across the end of summer time (25 Oct 2026, Europe)', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
  it('gives Monday to Sunday', () => {
    expect(weekOf('2026-11-19')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
    expect(weekOf('2026-11-22')[0]).toBe('2026-11-16') // Sunday belongs to the week before
    expect(weekOf('2026-11-01')[0]).toBe('2026-10-26') // across a month
  })
  it('uses the local date, not UTC', () => {
    expect(toISODate(new Date(2026, 9, 25, 0, 30))).toBe('2026-10-25')
  })
})

describe('pain and tingling words', () => {
  it('maps any 0–10 score to its word', () => {
    expect([0, 1, 3, 4, 6, 7, 8, 9, 10].map(painLabel)).toEqual([
      'None',
      'Mild',
      'Mild',
      'Moderate',
      'Moderate',
      'Severe',
      'Severe',
      'Unbearable',
      'Unbearable',
    ])
    expect(painLevelFor(5)).toBe(5)
    expect(painBand(3)).toBe('low')
    expect(painBand(4)).toBe('mid')
    expect(painBand(7)).toBe('high')
  })
  it('tingling has three words', () => {
    expect([0, 2, 5, 8].map(tinglingLabel)).toEqual(['None', 'A bit', 'A lot', 'A lot'])
  })
})

describe('trends', () => {
  const day = (date: string, score: number) => ({ date, body_area: 'neck', timing: 'evening', score })
  it('keeps one value per day (the highest), null when not answered', () => {
    const s = dailySeries([day('2026-11-18', 2), day('2026-11-18', 5), day('2026-11-16', 0)], 'neck', '2026-11-19', 4)
    expect(s.map((d) => d.score)).toEqual([0, null, 5, null])
  })
  it('compares only with at least 3 answers on each side, and ±1 point counts', () => {
    expect(compare([2, 2], [5, 5, 5]).verdict).toBe('none')
    expect(compare([2, 2, 2], [5, 5, 5]).verdict).toBe('better')
    expect(compare([2, 2, 2], [2, 2, 2.5]).verdict).toBe('same')
    expect(compare([5, 5, 5, null], [2, 2, 2]).verdict).toBe('worse')
  })
})

describe('weight', () => {
  const w = (date: string, kg: number) => ({ date, kg })
  it('compares weekly averages, needing 2 entries a week', () => {
    const list = [w('2026-11-05', 73.4), w('2026-11-08', 73.2), w('2026-11-13', 72.8), w('2026-11-15', 72.6)]
    const { change } = weightChange(list, '2026-11-15', 7)
    expect(change).toBeCloseTo(-0.6)
    expect(changeText(change, 'last week')).toBe('↓ 0.6 kg vs last week')
    expect(weightChange([w('2026-11-15', 72)], '2026-11-15', 7).change).toBeNull()
  })
})

describe('ladder numbers', () => {
  it('writes decimals with a comma', () => {
    expect(num(1.5)).toBe('1,5')
    expect(num('2')).toBe('2')
  })
})
