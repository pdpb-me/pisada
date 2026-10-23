import { describe, expect, it } from 'vitest'
import { dueCheckIns } from '@/lib/check-ins'
import { addDays, appDay, daysBetween, toISODate, weekOf } from '@/lib/dates'
import { ladderStatus, num } from '@/lib/ladder'
import { painBand, painLabel, painLevelFor } from '@/lib/pain'
import { tinglingLabel } from '@/lib/tingling'
import { areaSummary, compare, dailySeries, headline, zoneLine } from '@/lib/trends'
import { rightOfLeft, testDays } from '@/lib/tests'
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
    expect(changeText(change, 'last week')).toBe('0.6 kg less than last week')
    expect(weightChange([w('2026-11-15', 72)], '2026-11-15', 7).change).toBeNull()
  })
})

describe('ladder', () => {
  it('writes minutes plainly', () => {
    expect(num(1.5)).toBe('1.5')
    expect(num('2')).toBe('2')
  })
  const run = (date: string, run_step: number, clean: boolean | null) => ({ date, run_step, clean })
  it('counts clean runs in a row at the last step, skipping undecided ones', () => {
    const s = ladderStatus([run('2026-11-18', 4, null), run('2026-11-14', 4, true), run('2026-11-11', 4, true), run('2026-11-07', 3, true)], null)
    expect(s.cleanInARow).toBe(2)
    expect(s.last?.run_step).toBe(4)
    expect(s.recent.map((r) => r.date)).toEqual(['2026-11-07', '2026-11-11', '2026-11-14', '2026-11-18'])
  })
  it('stops at a run that was not clean', () => {
    expect(ladderStatus([run('2026-11-18', 4, true), run('2026-11-14', 4, false)], null).cleanInARow).toBe(1)
    expect(ladderStatus([], null).last).toBeNull()
  })
})

describe('which check-in is due', () => {
  it('asks the morning from the start of the day, the evening from 18:00', () => {
    expect(dueCheckIns('2026-11-19', '2026-11-19', 7)).toEqual({ morning: 'now', evening: 'later' })
    expect(dueCheckIns('2026-11-19', '2026-11-19', 19)).toEqual({ morning: 'now', evening: 'now' })
    expect(dueCheckIns('2026-11-19', '2026-11-19', 1)).toEqual({ morning: 'now', evening: 'now' })
    expect(dueCheckIns('2026-11-18', '2026-11-19', 7)).toEqual({ morning: 'fill-in', evening: 'fill-in' })
    expect(dueCheckIns('2026-11-20', '2026-11-19', 7)).toEqual({ morning: 'none', evening: 'none' })
  })
})

describe('the app day', () => {
  it('starts at 04:00', () => {
    expect(appDay(new Date(2026, 10, 19, 0, 30))).toBe('2026-11-18')
    expect(appDay(new Date(2026, 10, 19, 4, 0))).toBe('2026-11-19')
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2) // across the summer-time change
  })
})

describe('area summary and headline', () => {
  const s = (date: string, score: number) => ({ date, body_area: 'arch', timing: 'next_morning', score })
  it('shows the worse of the week and the latest answer', () => {
    const list = [s('2026-11-13', 2), s('2026-11-14', 0), s('2026-11-15', 0), s('2026-11-16', 8)]
    const a = areaSummary(list, 'arch', '2026-11-16')
    expect(a.typical).toBe(3) // (2 + 0 + 0 + 8) / 4 = 2.5 → 3
    expect(a.latest).toEqual({ date: '2026-11-16', score: 8 })
    expect(a.worst).toBe(8)
    expect(a.badDays).toBe(2)
  })
  it('says nothing with fewer than 3 answers', () => {
    expect(areaSummary([s('2026-11-16', 0)], 'arch', '2026-11-16').typical).toBeNull()
  })
  it('writes one plain sentence', () => {
    expect(headline({ arch: 'same', neck: 'worse', hands: 'same' })).toBe('Neck worse than the week before. Arch and hands about the same.')
    expect(headline({ arch: 'none', neck: 'none', hands: 'none' })).toBe('Not enough check-ins yet to compare weeks.')
  })
})

describe('heel-raise tests', () => {
  it('groups results per day and compares the right with the left', () => {
    const days = testDays([
      { date: '2026-10-26', side: 'R', value: 17 },
      { date: '2026-09-17', side: 'L', value: 21 },
      { date: '2026-10-26', side: 'L', value: 23 },
      { date: '2026-09-17', side: 'R', value: 12 },
    ])
    expect(days).toEqual([
      { date: '2026-09-17', L: 21, R: 12 },
      { date: '2026-10-26', L: 23, R: 17 },
    ])
    expect(rightOfLeft(days[1])).toBe(74)
  })
})

describe('a flare is never hidden', () => {
  const s = (date: string, score: number) => ({ date, body_area: 'arch', timing: 'next_morning', score })
  it('puts a hard latest answer first in the headline and the zone line', () => {
    expect(headline({ arch: 'same', neck: 'none', hands: 'none' }, ['Arch Severe on Fri.'])).toBe('Arch Severe on Fri. Arch about the same.')
    const a = areaSummary([s('2026-11-13', 2), s('2026-11-14', 2), s('2026-11-15', 2), s('2026-11-16', 8)], 'arch', '2026-11-16')
    expect(zoneLine(a, painLabel)).toBe('Latest answer Severe: stop zone. Rest it today and tell your coach.')
  })
})
