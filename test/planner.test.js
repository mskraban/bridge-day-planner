const test = require('node:test')
const assert = require('node:assert/strict')
const P = require('../public/planner.js')

// Real Slovenian public holidays (Nager.Date, "Public" days only), 2026-2028
const SI = {
  2026: '01-01 01-02 02-08 04-05 04-06 04-27 05-01 05-02 05-24 06-25 08-15 10-31 11-01 12-25 12-26',
  2027: '01-01 01-02 02-08 03-28 03-29 04-27 05-01 05-02 05-16 06-25 08-15 10-31 11-01 12-25 12-26',
  2028: '01-01 01-02 02-08 04-16 04-17 04-27 05-01 05-02 06-04 06-25 08-15 10-31 11-01 12-25 12-26',
}
const holidays = {}
for (const y of Object.keys(SI)) for (const md of SI[y].split(' ')) holidays[`${y}-${md}`] = 'Holiday ' + md
const daysFor = (y, work) => P.buildDays({ from: `${y - 1}-11-15`, to: `${y + 1}-01-31`, holidays, workDays: work })

test('date helpers are timezone-proof', () => {
  assert.equal(P.addDays('2027-03-27', 1), '2027-03-28') // European clock change
  assert.equal(P.addDays('2027-03-13', 1), '2027-03-14') // US clock change
  assert.equal(P.addDays('2027-12-31', 1), '2028-01-01')
  assert.equal(P.dow('2027-11-01'), 1) // a Monday
  assert.equal(P.diffDays('2027-01-01', '2028-01-01'), 365)
})

test('buildDays marks weekends, holidays and leave-able days', () => {
  const d = daysFor(2027)
  const byIso = Object.fromEntries(d.map((x) => [x.iso, x]))
  assert.equal(byIso['2027-11-01'].canLeave, false) // holiday
  assert.equal(byIso['2027-11-01'].off, true)
  assert.equal(byIso['2027-10-30'].weekend, true) // Saturday
  assert.equal(byIso['2027-11-02'].canLeave, true) // ordinary Tuesday
  const fri = P.buildDays({ from: '2027-01-01', to: '2027-01-10', workDays: [0, 1, 2, 3, 4] })
  assert.equal(fri.find((x) => x.iso === '2027-01-01').weekend, true) // Friday is the weekend in this schedule
})

test('holiday map: only real days off, regions respected', () => {
  const list = [
    { date: '2027-01-01', name: 'New Year', localName: 'Neujahr', global: true, types: ['Public'] },
    { date: '2027-01-06', name: 'Epiphany', localName: 'Heilige Drei Könige', global: false, counties: ['DE-BY'], types: ['Public'] },
    { date: '2027-05-02', name: 'Trubar Day', localName: 'Trubar', global: true, types: ['Observance'] },
    { date: '2027-08-08', name: 'Peace Festival', localName: 'Friedensfest', global: false, counties: ['DE-BY'], types: ['Public'] },
  ]
  assert.deepEqual(Object.keys(P.holidayMap(list, null)), ['2027-01-01'])
  assert.deepEqual(Object.keys(P.holidayMap(list, 'DE-BY')), ['2027-01-01', '2027-01-06', '2027-08-08'])
  assert.deepEqual(Object.keys(P.holidayMap(list, 'DE-BE')), ['2027-01-01'])
  assert.deepEqual(P.regionsOf(list), ['DE-BY'])
  assert.equal(P.holidayMap(list, null)['2027-01-01'], 'New Year (Neujahr)')
})

test('optimizer matches brute force on random small calendars', () => {
  let seed = 12345
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let trial = 0; trial < 60; trial++) {
    const n = 22 + Math.floor(rnd() * 8)
    const days = []
    for (let i = 0; i < n; i++) {
      const off = i % 7 === 5 || i % 7 === 6 || rnd() < 0.12
      days.push({ iso: P.addDays('2027-01-01', i), off, canLeave: !off })
    }
    const M = 3 + Math.floor(rnd() * 3)
    const K = Math.floor(rnd() * 4)
    const work = days.map((d, i) => (d.canLeave ? i : -1)).filter((i) => i >= 0)
    const score = (extra) => {
      let total = 0, run = 0
      for (let i = 0; i <= n; i++) {
        const off = i < n && (days[i].off || extra.has(i))
        if (off) run++
        else { if (run >= M) total += run; run = 0 }
      }
      return total
    }
    let best = score(new Set())
    const pick = (start, left, chosen) => {
      best = Math.max(best, score(new Set(chosen)))
      if (left === 0) return
      for (let j = start; j < work.length; j++) pick(j + 1, left - 1, [...chosen, work[j]])
    }
    pick(0, K, [])
    const res = P.optimize(days, { budget: K, minBreak: M })
    assert.equal(res.score, best, `trial ${trial}: n=${n} M=${M} K=${K}`)
    assert.ok(res.used <= K)
    // the score really is what the chosen days produce
    assert.equal(score(new Set(res.leave.map((s) => days.findIndex((d) => d.iso === s)))), res.score)
  }
})

test('never takes leave on a holiday, a weekend or outside the year', () => {
  const d = daysFor(2027)
  const res = P.optimize(d, { budget: 15, minBreak: 4, leaveFrom: '2027-01-01', leaveTo: '2027-12-31' })
  const byIso = Object.fromEntries(d.map((x) => [x.iso, x]))
  for (const s of res.leave) {
    assert.ok(byIso[s].canLeave, s)
    assert.ok(s >= '2027-01-01' && s <= '2027-12-31', s)
  }
})

test('Slovenia 2027 with the leave in your pocket: a better plan with more days', () => {
  const d = daysFor(2027)
  const small = P.plan(d, { year: 2027, budget: 5, minBreak: 4 })
  const big = P.plan(d, { year: 2027, budget: 12, minBreak: 4 })
  assert.ok(small.used <= 5 && big.used <= 12)
  assert.ok(small.totalOff > small.baselineOff, 'planning should beat doing nothing')
  assert.ok(big.totalOff >= small.totalOff)
  assert.ok(big.longest >= small.longest)
  // efficiency: each leave day buys more than one extra day off
  assert.ok((small.totalOff - small.baselineOff) / small.used > 1.5)
  // every planned break contains the leave days it is credited with, and they are inside the year
  for (const b of big.breaks) {
    assert.ok(b.length >= 4)
    assert.ok(b.leave.length > 0)
  }
})

test('more leave never makes the plan worse, and never uses more than the budget', () => {
  const d = daysFor(2027)
  let last = -1
  for (const budget of [0, 1, 3, 6, 10, 15, 25]) {
    const p = P.plan(d, { year: 2027, budget, minBreak: 4 })
    assert.ok(p.used <= budget)
    assert.ok(p.totalOff >= last, `budget ${budget}`)
    last = p.totalOff
  }
  assert.equal(P.plan(d, { year: 2027, budget: 0, minBreak: 4 }).used, 0)
})

test('bridge days: Monday 2 Nov 2026 style gaps are found', () => {
  // 2027: Labour Day 1 May is a Saturday and 2 May a Sunday (no bridge), but 27 April (Tuesday) is a classic bridge
  const d = daysFor(2027)
  const b = P.bridges(d, { year: 2027 })
  const apr = b.find((x) => x.gapDays.includes('2027-04-26'))
  assert.ok(apr, 'Monday 26 April bridges the weekend and Uprising Day')
  assert.equal(apr.gap, 1)
  assert.equal(apr.start, '2027-04-24') // Saturday
  assert.equal(apr.end, '2027-04-27')
  assert.equal(apr.length, 4)
  assert.equal(apr.efficiency, 4)
  // sorted best first
  for (let i = 1; i < b.length; i++) assert.ok(b[i - 1].efficiency >= b[i].efficiency)
  // a bridge always touches a holiday
  for (const x of b) assert.ok(x.holidays.length > 0)
})

test('blocks join holidays, weekends and leave into one break', () => {
  const d = daysFor(2027)
  const bl = P.blocks(d, ['2027-04-26'], 4)
  const b = bl.find((x) => x.start === '2027-04-24')
  assert.ok(b)
  assert.equal(b.end, '2027-04-27')
  assert.deepEqual(b.leave, ['2027-04-26'])
  assert.equal(b.holidays[0].iso, '2027-04-27')
})

test('works for a Friday-Saturday weekend country', () => {
  const holidaysFS = { '2027-06-23': 'Wednesday holiday' } // 23 June 2027 is a Wednesday
  const d = P.buildDays({ from: '2027-06-01', to: '2027-07-10', holidays: holidaysFS, workDays: [0, 1, 2, 3, 4] })
  const res = P.optimize(d, { budget: 2, minBreak: 4 })
  assert.ok(res.score >= 4)
  const bl = P.blocks(d, res.leave, 4)
  assert.ok(bl.length >= 1)
})

test('ics file is valid-looking: dates, escaping, folding, exclusive end', () => {
  const ics = P.toICS([{ start: '2027-04-24', end: '2027-04-27', title: 'Break, 4 days; relax', description: 'Take Monday 26 April off.\nEnjoy' }], { stamp: '20271101T000000Z' })
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
  assert.match(ics, /DTSTART;VALUE=DATE:20270424\r\n/)
  assert.match(ics, /DTEND;VALUE=DATE:20270428\r\n/) // exclusive end
  assert.match(ics, /SUMMARY:Break\\, 4 days\; relax/)
  assert.match(ics, /DESCRIPTION:Take Monday 26 April off\.\\nEnjoy/)
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
  const long = P.toICS([{ start: '2027-01-01', end: '2027-01-02', title: 'x'.repeat(200) }])
  for (const line of long.split('\r\n')) assert.ok(line.length <= 76, line.length)
})

test('company closures are free days off that cost no leave', () => {
  const clo = P.closureMap([['2027-08-02', '2027-08-13'], ['bad', 'x'], ['2027-12-31', '2027-12-30']], 'Break')
  assert.equal(Object.keys(clo).length, 12)
  const days = P.buildDays({ from: '2027-07-01', to: '2027-09-30', holidays: clo })
  const plan = P.plan(days, { year: 2027, budget: 0, minBreak: 4 })
  assert.equal(plan.used, 0)
  const b = plan.breaks.concat(plan.free).find(x => x.start <= '2027-08-02' && x.end >= '2027-08-13')
  assert.ok(b && b.length >= 16) // Sat 31 Jul .. Sun 15 Aug
  const withLeave = P.plan(days, { year: 2027, budget: 2, minBreak: 4 })
  assert.ok(withLeave.totalOff >= plan.totalOff)
  assert.ok(!withLeave.leave.some(d => clo[d]))
})
