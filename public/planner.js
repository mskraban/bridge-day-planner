/* Bridge Day Planner: the maths. Pure functions, no DOM, no network.
   Works in the browser (window.Planner) and in Node (require). All dates are ISO strings "YYYY-MM-DD",
   handled in UTC so daylight saving can never shift a day. */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.Planner = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var DAY = 86400000

  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  }
  function iso(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate())
  }
  function addDays(s, n) { return iso(new Date(parseISO(s).getTime() + n * DAY)) }
  function dow(s) { return parseISO(s).getUTCDay() } // 0 = Sunday
  function diffDays(a, b) { return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DAY) }

  /**
   * One entry per calendar day from `from` to `to` (inclusive).
   * opts.workDays: weekday numbers that are normal working days (0 = Sunday ... 6 = Saturday). Default Mon-Fri.
   * opts.holidays: { 'YYYY-MM-DD': 'Name' }.
   * A day is `off` when it is a public holiday or not a working weekday. `canLeave` is true on ordinary working days.
   */
  function buildDays(opts) {
    var work = {}
    ;(opts.workDays || [1, 2, 3, 4, 5]).forEach(function (d) { work[d] = true })
    var hol = opts.holidays || {}
    var out = []
    var n = diffDays(opts.from, opts.to)
    for (var i = 0; i <= n; i++) {
      var s = addDays(opts.from, i)
      var w = dow(s)
      var h = hol[s] || null
      var weekend = !work[w]
      out.push({ iso: s, dow: w, holiday: h, weekend: weekend, off: !!h || weekend, canLeave: !h && !weekend })
    }
    return out
  }

  /**
   * The best use of up to `budget` leave days.
   * Goal: maximise the number of days that sit inside breaks of at least `minBreak` consecutive days off.
   * Uses the fewest leave days that reach the best score. opts: { budget, minBreak, leaveFrom, leaveTo }.
   * Returns { leave: [iso...], score, used }.
   */
  function optimize(days, opts) {
    var n = days.length
    var K = Math.max(0, opts.budget | 0)
    var M = Math.max(2, opts.minBreak | 0)
    var lf = opts.leaveFrom || '0000-00-00', lt = opts.leaveTo || '9999-99-99'
    var S = M + 1
    var NEG = -1e9
    var size = (n + 1) * (K + 1) * S
    var dp = new Float64Array(size).fill(NEG)
    var prev = new Int32Array(size).fill(-1)
    var took = new Uint8Array(size)
    var idx = function (i, k, r) { return (i * (K + 1) + k) * S + r }
    dp[idx(0, 0, 0)] = 0

    function relax(to, val, from, leave) {
      if (val > dp[to]) { dp[to] = val; prev[to] = from; took[to] = leave }
    }
    for (var i = 0; i < n; i++) {
      var day = days[i]
      var can = day.canLeave && day.iso >= lf && day.iso <= lt
      for (var k = 0; k <= K; k++) {
        for (var r = 0; r < S; r++) {
          var cur = dp[idx(i, k, r)]
          if (cur <= NEG / 2) continue
          var from = idx(i, k, r)
          var nr = Math.min(r + 1, M)
          var gain = r + 1 === M ? M : r >= M ? 1 : 0
          if (day.off) {
            relax(idx(i + 1, k, nr), cur + gain, from, 0)
          } else {
            relax(idx(i + 1, k, 0), cur, from, 0)
            if (can && k < K) relax(idx(i + 1, k + 1, nr), cur + gain, from, 1)
          }
        }
      }
    }
    var best = NEG, bestState = -1
    for (var kk = 0; kk <= K; kk++) {
      for (var rr = 0; rr < S; rr++) {
        var v = dp[idx(n, kk, rr)]
        if (v > best) { best = v; bestState = idx(n, kk, rr) }
      }
    }
    var leave = []
    var st = bestState
    for (var step = n; step > 0; step--) {
      if (took[st]) leave.push(days[step - 1].iso)
      st = prev[st]
    }
    leave.reverse()
    return { leave: leave, score: best, used: leave.length }
  }

  /**
   * Maximal runs of consecutive days off (holidays, non-working days and the given leave days).
   * Returns [{ start, end, length, leave: [iso], holidays: [{iso, name}] }] for runs of at least `minLen` days.
   */
  function blocks(days, leaveList, minLen) {
    var L = {}
    ;(leaveList || []).forEach(function (s) { L[s] = true })
    var out = []
    var cur = null
    function close() { if (cur && cur.length >= (minLen || 1)) out.push(cur); cur = null }
    days.forEach(function (d) {
      var off = d.off || L[d.iso]
      if (!off) return close()
      if (!cur) cur = { start: d.iso, end: d.iso, length: 0, leave: [], holidays: [] }
      cur.end = d.iso
      cur.length++
      if (L[d.iso]) cur.leave.push(d.iso)
      if (d.holiday) cur.holidays.push({ iso: d.iso, name: d.holiday })
    })
    close()
    return out
  }

  /**
   * A full plan for one year.
   * opts: { year, budget, minBreak }. `days` must cover at least a few weeks either side of the year.
   */
  function plan(days, opts) {
    var y = opts.year
    var yStart = y + '-01-01', yEnd = y + '-12-31'
    var best = optimize(days, { budget: opts.budget, minBreak: opts.minBreak, leaveFrom: yStart, leaveTo: yEnd })
    var inYear = function (b) { return b.end >= yStart && b.start <= yEnd }
    var all = blocks(days, best.leave, opts.minBreak).filter(inYear)
    var planned = all.filter(function (b) { return b.leave.length > 0 })
    var free = all.filter(function (b) { return b.leave.length === 0 })
    function offInYear(list) {
      return list.reduce(function (t, b) {
        var s = b.start < yStart ? yStart : b.start
        var e = b.end > yEnd ? yEnd : b.end
        return t + diffDays(s, e) + 1
      }, 0)
    }
    var baseline = blocks(days, [], opts.minBreak).filter(inYear)
    return {
      leave: best.leave, used: best.used, breaks: planned, free: free,
      totalOff: offInYear(all), baselineOff: offInYear(baseline),
      longest: all.reduce(function (m, b) { return Math.max(m, b.length) }, 0),
    }
  }

  /**
   * Classic bridge days: one to maxGap working days sitting between two blocks of days off,
   * where at least one of the blocks contains a public holiday.
   * Sorted by days off gained per leave day.
   */
  function bridges(days, opts) {
    opts = opts || {}
    var maxGap = opts.maxGap || 3
    var y = opts.year
    var bl = blocks(days, [], 1)
    var out = []
    for (var i = 0; i + 1 < bl.length; i++) {
      var a = bl[i], b = bl[i + 1]
      var gap = diffDays(a.end, b.start) - 1
      if (gap < 1 || gap > maxGap) continue
      if (!a.holidays.length && !b.holidays.length) continue
      var length = a.length + gap + b.length
      if (length < (opts.minLength || 4)) continue
      if (y && (b.end < y + '-01-01' || a.start > y + '-12-31')) continue
      var gapDays = []
      for (var g = 1; g <= gap; g++) gapDays.push(addDays(a.end, g))
      out.push({
        start: a.start, end: b.end, length: length, gapDays: gapDays, gap: gap, efficiency: length / gap,
        holidays: a.holidays.concat(b.holidays),
      })
    }
    out.sort(function (p, q) { return q.efficiency - p.efficiency || q.length - p.length || (p.start < q.start ? -1 : 1) })
    return out
  }

  /* ---------------------------------------------------------------- calendar file */

  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n') }
  function icsDate(s) { return s.replace(/-/g, '') }

  /** items: [{ start, end (inclusive), title, description }]. Returns the text of an .ics file. */
  function toICS(items, opts) {
    opts = opts || {}
    var stamp = (opts.stamp || new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''))
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bridge Day Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
    items.forEach(function (it, i) {
      lines.push('BEGIN:VEVENT')
      lines.push('UID:bridge-' + icsDate(it.start) + '-' + i + '@bridge-day-planner')
      lines.push('DTSTAMP:' + stamp)
      lines.push('DTSTART;VALUE=DATE:' + icsDate(it.start))
      lines.push('DTEND;VALUE=DATE:' + icsDate(addDays(it.end, 1)))
      lines.push('SUMMARY:' + icsEscape(it.title))
      if (it.description) lines.push('DESCRIPTION:' + icsEscape(it.description))
      lines.push('TRANSP:TRANSPARENT')
      lines.push('END:VEVENT')
    })
    lines.push('END:VCALENDAR')
    // lines longer than 75 characters are folded as the format requires
    return lines.map(function (l) {
      var out = '', rest = l
      while (rest.length > 75) { out += rest.slice(0, 75) + '\r\n '; rest = rest.slice(75) }
      return out + rest
    }).join('\r\n') + '\r\n'
  }

  /* ------------------------------------------------------------- holiday data */

  /**
   * Turn Nager.Date holidays into { iso: name } for one region.
   * Only real days off count: type "Public" or "Bank". Regional holidays count only for the chosen region.
   */
  function holidayMap(list, region) {
    var map = {}
    ;(list || []).forEach(function (h) {
      var types = h.types || []
      if (types.indexOf('Public') < 0 && types.indexOf('Bank') < 0) return
      var applies = h.global || !h.counties || (region && h.counties.indexOf(region) >= 0)
      if (!applies) return
      var name = h.localName && h.localName !== h.name ? h.name + ' (' + h.localName + ')' : h.name
      map[h.date] = map[h.date] ? (map[h.date].indexOf(h.name) >= 0 ? map[h.date] : map[h.date] + ' / ' + h.name) : name
    })
    return map
  }

  /** Sorted list of regions that have their own holidays in this data. */
  function regionsOf(list) {
    var seen = {}
    ;(list || []).forEach(function (h) { if (!h.global && h.counties) h.counties.forEach(function (c) { seen[c] = true }) })
    return Object.keys(seen).sort()
  }

  return {
    parseISO: parseISO, iso: iso, addDays: addDays, dow: dow, diffDays: diffDays, buildDays: buildDays, optimize: optimize,
    blocks: blocks, plan: plan, bridges: bridges, toICS: toICS, holidayMap: holidayMap, regionsOf: regionsOf,
  }
})
