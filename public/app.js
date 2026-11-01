/* Bridge Day Planner: the page. Everything runs in the browser; holidays come from Nager.Date. */
;(function () {
  'use strict'
  var P = window.Planner, I = window.I18n, H = window.Holidays
  var root = document.getElementById('app')
  if (!root) return

  /* ------------------------------------------------------------------ state */

  var now = new Date()
  var thisYear = now.getFullYear()
  var params = new URLSearchParams(location.search)

  function detectLang() { return 'en' } // English only
  function detectCountry() {
    var q = (params.get('c') || '').toUpperCase()
    if (/^[A-Z]{2}$/.test(q)) return q
    var fromPage = document.body.getAttribute('data-cc')
    if (fromPage) return fromPage
    var m = /-([A-Z]{2})\b/.exec(navigator.language || '')
    if (m) return m[1]
    return /^sl\b/i.test(navigator.language || '') ? 'SI' : 'SI'
  }
  var SUNDAY_FIRST = { US: 1, CA: 1, IL: 1, JP: 1, BR: 1, MX: 1, IN: 1, ZA: 1, PH: 1, KR: 1, TW: 1 }
  var FRI_SAT = { IL: 1, EG: 1, SA: 1, KW: 1, QA: 1, BH: 1, OM: 1, JO: 1, IQ: 1, DZ: 1, SY: 1, YE: 1, LY: 1, SD: 1, AF: 1 }

  function defaultWork(cc) { return FRI_SAT[cc] ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5] }

  var state = {
    lang: detectLang(),
    cc: detectCountry(),
    year: parseInt(params.get('y'), 10) || (now.getMonth() >= 9 ? thisYear + 1 : thisYear),
    budget: clamp(parseInt(params.get('n'), 10) || 10, 1, 40),
    minBreak: [3, 4, 5, 7, 9].indexOf(parseInt(params.get('m'), 10)) >= 0 ? parseInt(params.get('m'), 10) : 4,
    region: params.get('r') || '',
    work: null,
    closures: (params.get('cl') || '').split(',').map(function (x) { return x.split('_') }).filter(function (r) { return /^\d{4}-\d{2}-\d{2}$/.test(r[0]) && /^\d{4}-\d{2}-\d{2}$/.test(r[1]) && r[1] >= r[0] }).slice(0, 10),
    tab: 'plan',
  }
  var w = (params.get('w') || '').split('').map(Number).filter(function (d) { return d >= 0 && d <= 6 })
  state.work = w.length ? w : defaultWork(state.cc)

  var countryList = []
  var data = { list: [], stale: false, error: false, loading: true }
  var result = null // computed plan
  var countryNames = null

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }
  function t(key, vars) { return I.t(state.lang, key, vars) }
  function locale() { return state.lang === 'sl' ? 'sl-SI' : 'en-GB' }

  /* ----------------------------------------------------------------- dom helpers */

  function h(tag, props) {
    var el = document.createElement(tag)
    props = props || {}
    Object.keys(props).forEach(function (k) {
      var v = props[k]
      if (v == null || v === false) return
      if (k === 'class') el.className = v
      else if (k === 'text') el.textContent = v
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v)
      else if (v === true) el.setAttribute(k, '')
      else el.setAttribute(k, v)
    })
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i])
    return el
  }
  function add(el, c) {
    if (c == null || c === false) return
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x) })
    else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild) }

  /* ------------------------------------------------------------------ formatting */

  function dateFmt(opts) { return new Intl.DateTimeFormat(locale(), Object.assign({ timeZone: 'UTC' }, opts)) }
  function fmtDay(s) { return dateFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(P.parseISO(s)) }
  function fmtShort(s) { return dateFmt({ day: 'numeric', month: 'short' }).format(P.parseISO(s)) }
  function fmtRange(a, b) {
    if (a === b) return fmtDay(a)
    return fmtDay(a) + ' – ' + fmtDay(b)
  }
  function fmtLong(s) { return dateFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(P.parseISO(s)) }

  function countryName(cc) {
    try {
      if (!countryNames || countryNames.lang !== state.lang) countryNames = { lang: state.lang, dn: new Intl.DisplayNames([state.lang === 'sl' ? 'sl' : 'en'], { type: 'region' }) }
      return countryNames.dn.of(cc) || cc
    } catch (e) { return cc }
  }

  /* --------------------------------------------------------------------- compute */

  function compute() {
    if (data.error || !data.list.length) { result = null; return }
    var realHol = P.holidayMap(data.list, state.region || null)
    var clo = P.closureMap(state.closures, t('closureName'))
    var hol = Object.assign({}, clo, realHol)
    var days = P.buildDays({ from: (state.year - 1) + '-11-15', to: (state.year + 1) + '-01-31', holidays: hol, workDays: state.work })
    var plan = P.plan(days, { year: state.year, budget: state.budget, minBreak: state.minBreak })
    var bridges = P.bridges(days, { year: state.year, maxGap: 3 })
    var margin = []
    var from = state.year + '-01-01', to = state.year + '-12-31'
    for (var b = 0; b <= state.budget; b++) {
      var opt = P.optimize(days, { budget: b, minBreak: state.minBreak, leaveFrom: from, leaveTo: to })
      margin.push(opt.score)
    }
    var holInYear = Object.keys(realHol).filter(function (s) { return s.slice(0, 4) === String(state.year) }).sort()
    result = { hol: hol, clo: clo, days: days, plan: plan, bridges: bridges, margin: margin, holInYear: holInYear }
  }

  /* ----------------------------------------------------------------------- views */

  var els = {}

  function build() {
    clear(root)
    els.controls = h('form', { class: 'controls', onsubmit: function (e) { e.preventDefault() } })
    els.status = h('div', { class: 'status', role: 'status' })
    els.out = h('div', { class: 'out' })
    root.append(els.controls, els.status, els.out)
    renderControls()
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'lbl', text: label }), control, hint ? h('span', { class: 'hint', text: hint }) : null)
  }

  function renderControls() {
    var c = els.controls
    clear(c)

    var sel = h('select', { 'aria-label': t('country'), onchange: function () { state.cc = sel.value; state.region = ''; state.work = defaultWork(state.cc); reload() } })
    var list = countryList.slice().map(function (x) { return { code: x.countryCode, label: countryName(x.countryCode) } })
    if (!list.some(function (x) { return x.code === state.cc })) list.push({ code: state.cc, label: countryName(state.cc) })
    list.sort(function (a, b) { return a.label.localeCompare(b.label, locale()) })
    list.forEach(function (x) { sel.appendChild(h('option', { value: x.code, selected: x.code === state.cc, text: x.label })) })

    var yr = h('select', { 'aria-label': t('year'), onchange: function () { state.year = parseInt(yr.value, 10); reload() } })
    for (var y = thisYear; y <= thisYear + 2; y++) yr.appendChild(h('option', { value: y, selected: y === state.year, text: String(y) }))
    if (state.year < thisYear || state.year > thisYear + 2) yr.appendChild(h('option', { value: state.year, selected: true, text: String(state.year) }))

    var num = h('input', { type: 'number', min: '1', max: '40', value: String(state.budget), 'aria-label': t('leave'), inputmode: 'numeric' })
    var range = h('input', { type: 'range', min: '1', max: '40', value: String(state.budget), 'aria-label': t('leave') })
    function setBudget(v) {
      v = clamp(parseInt(v, 10) || 1, 1, 40)
      state.budget = v; num.value = v; range.value = v
      scheduleRender()
    }
    num.addEventListener('input', function () { setBudget(num.value) })
    range.addEventListener('input', function () { setBudget(range.value) })

    var minSel = h('select', { 'aria-label': t('minBreak'), onchange: function () { state.minBreak = parseInt(minSel.value, 10); update() } })
    ;[3, 4, 5, 7, 9].forEach(function (n) { minSel.appendChild(h('option', { value: n, selected: n === state.minBreak, text: I.days(state.lang, n) })) })

    var weekDays = [1, 2, 3, 4, 5, 6, 0]
    var keys = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }
    var chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('workWeek') })
    weekDays.forEach(function (d) {
      var on = state.work.indexOf(d) >= 0
      chips.appendChild(h('button', {
        type: 'button', class: 'chip' + (on ? ' on' : ''), 'aria-pressed': String(on), text: t(keys[d]),
        onclick: function () {
          var i = state.work.indexOf(d)
          if (i >= 0) state.work.splice(i, 1); else state.work.push(d)
          renderControls(); update()
        },
      }))
    })

    var regions = result || data.list.length ? P.regionsOf(data.list) : []
    var regionSel = null
    if (regions.length) {
      regionSel = h('select', { 'aria-label': t('region'), onchange: function () { state.region = regionSel.value; update() } },
        h('option', { value: '', selected: !state.region, text: t('regionAll') }),
        regions.map(function (r) { return h('option', { value: r, selected: r === state.region, text: r }) }))
    }

    var langBtn = h('div', { class: 'langs', role: 'group', 'aria-label': t('lang') },
      ['en', 'sl'].map(function (l) {
        return h('button', { type: 'button', class: 'chip' + (state.lang === l ? ' on' : ''), 'aria-pressed': String(state.lang === l), text: l.toUpperCase(), onclick: function () { setLang(l) } })
      }))


    var cFrom = h('input', { type: 'date', 'aria-label': t('from') })
    var cTo = h('input', { type: 'date', 'aria-label': t('to') })
    var cMsg = h('span', { class: 'hint bad', role: 'alert' })
    var cList = h('ul', { class: 'cloList' }, state.closures.length ? state.closures.map(function (r, i) {
      return h('li', null, h('span', { text: r[0] === r[1] ? fmtLong(r[0]) : fmtRange(r[0], r[1]) }),
        h('button', { type: 'button', class: 'x', 'aria-label': t('removeClosure'), title: t('removeClosure'), text: '\u2715', onclick: function () { state.closures.splice(i, 1); renderControls(); update() } }))
    }) : h('li', { class: 'none', text: t('noClosures') }))
    var cAdd = h('button', { type: 'button', class: 'btn small', text: t('addClosure'), onclick: function () {
      var a = cFrom.value, b = cTo.value || cFrom.value
      if (!a || b < a) { cMsg.textContent = t('badRange'); return }
      if (state.closures.length >= 10) return
      state.closures.push([a, b]); state.closures.sort(function (x, y) { return x[0] < y[0] ? -1 : 1 })
      renderControls(); update()
    } })
    var closureField = h('div', { class: 'field wide' }, h('span', { class: 'lbl', text: t('closures') }),
      h('div', { class: 'cloRow' }, h('label', { class: 'mini' }, t('from'), cFrom), h('label', { class: 'mini' }, t('to'), cTo), cAdd),
      cMsg, cList, h('span', { class: 'hint', text: t('closuresHint') }))

    c.append(
      h('div', { class: 'row' },
        field(t('country'), sel), field(t('year'), yr),
        field(t('minBreak'), minSel)),
      h('div', { class: 'row' },
        h('div', { class: 'field wide' }, h('span', { class: 'lbl', text: t('leave') }), h('div', { class: 'leavebox' }, num, range))),
      h('div', { class: 'row' },
        h('div', { class: 'field wide' }, h('span', { class: 'lbl', text: t('workWeek') }), chips),
        regionSel ? field(t('region'), regionSel, t('regionHint')) : null,
        null),
      h('div', { class: 'row' }, closureField))
  }

  function setLang(l) {
    state.lang = l
    try { localStorage.setItem('bdp:lang', l) } catch (e) { /* ignore */ }
    document.documentElement.lang = l
    updateStaticText()
    renderControls()
    renderAll()
  }

  function updateStaticText() {
    document.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = t(n.getAttribute('data-t')) })
    document.querySelectorAll('[data-lang-show]').forEach(function (n) { n.hidden = n.getAttribute('data-lang-show') !== state.lang })
  }

  /* ------------------------------------------------------------------- loading */

  var renderTimer = null
  function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(update, 120) }

  async function reload() {
    data = { list: data.list, stale: false, error: false, loading: true }
    els.status.textContent = t('loading')
    els.status.className = 'status'
    clear(els.out)
    try {
      var d = await H.around(state.cc, state.year)
      data = { list: d.list, stale: d.stale, error: false, loading: false }
    } catch (e) {
      data = { list: [], stale: false, error: true, loading: false }
    }
    renderControls()
    update()
  }

  function update() {
    if (!state.work.length) { els.status.textContent = t('noWork'); els.status.className = 'status bad'; clear(els.out); return }
    compute()
    syncUrl()
    renderAll()
  }

  function renderAll() {
    els.status.className = 'status'
    els.status.textContent = ''
    if (data.error) {
      els.status.className = 'status bad'
      els.status.append(t('errLoad') + ' ', h('button', { class: 'btn small', type: 'button', onclick: reload, text: t('retry') }))
      clear(els.out)
      return
    }
    if (data.stale) { els.status.textContent = t('errStale') }
    if (!result) return
    renderResults()
  }

  function syncUrl() {
    var q = new URLSearchParams()
    q.set('c', state.cc); q.set('y', state.year); q.set('n', state.budget); q.set('m', state.minBreak)
    if (state.region) q.set('r', state.region)
    if (state.work.slice().sort().join('') !== defaultWork(state.cc).slice().sort().join('')) q.set('w', state.work.slice().sort().join(''))
    if (state.closures.length) q.set('cl', state.closures.map(function (r) { return r.join('_') }).join(','))
    try { history.replaceState(null, '', location.pathname + '?' + q.toString()) } catch (e) { /* ignore */ }
  }
  function detectLangBase() { return /^sl\b/i.test(navigator.language || '') ? 'sl' : 'en' }

  /* ------------------------------------------------------------------- results */

  function renderResults() {
    var out = els.out
    clear(out)
    var p = result.plan

    var summary = h('section', { class: 'summary', 'aria-label': t('sumTitle', { year: state.year }) },
      h('h2', { text: t('sumTitle', { year: state.year }) + ' · ' + countryName(state.cc) }),
      h('div', { class: 'big' }, h('span', { class: 'num', text: p.totalOff }), h('span', { class: 'cap', text: ' ' + t('sumBig', { n: '' }).replace(/^\s+/, '').trim() })),
      h('p', { class: 'from', text: t('sumFrom', { leave: I.leaveDays(state.lang, p.used) }) }),
      h('ul', { class: 'facts' },
        h('li', { text: t('sumBase', { n: p.baselineOff, min: state.minBreak }) }),
        h('li', { text: t('sumBreaks', { n: p.breaks.length + p.free.length }) + ' · ' + t('sumLongest', { n: p.longest }) }),
        p.used < state.budget ? h('li', { text: t('sumUnused', { n: state.budget - p.used }) }) : null))
    // the big number reads "32 days off": keep the word after the number in the right language
    summary.querySelector('.cap').textContent = ' ' + (state.lang === 'sl' ? 'prostih dni' : 'days off')

    var actions = h('div', { class: 'actions' },
      h('button', { class: 'btn', type: 'button', onclick: doPrint, text: '🖨️ ' + t('print') }),
      h('button', { class: 'btn ghost', type: 'button', onclick: doIcs, text: '📅 ' + t('ics') }),
      h('button', { class: 'btn ghost', type: 'button', onclick: doCopy, text: '🔗 ' + t('copy') }))

    var tabs = h('div', { class: 'tabs', role: 'tablist' },
      [['plan', 'tabPlan'], ['bridges', 'tabBridges'], ['cal', 'tabCal'], ['hol', 'tabHol']].map(function (x) {
        return h('button', { type: 'button', role: 'tab', class: 'tab' + (state.tab === x[0] ? ' on' : ''), 'aria-selected': String(state.tab === x[0]), text: t(x[1]), onclick: function () { state.tab = x[0]; renderResults() } })
      }))

    var body = h('div', { class: 'tabbody', role: 'tabpanel' })
    if (state.tab === 'plan') body.append(viewPlan())
    else if (state.tab === 'bridges') body.append(viewBridges())
    else if (state.tab === 'cal') body.append(viewCalendar())
    else body.append(viewHolidays())

    out.append(summary, margin(), actions, tabs, body)
  }

  function breakCard(b, extra) {
    var gainLeave = b.leave ? b.leave.length : b.gap
    var takeList = gainLeave > 0 ? (b.leave ? b.leave : b.gapDays) : []
    var hols = b.holidays || []
    return h('article', { class: 'break' + (hols.length ? '' : ' flexi') },
      h('header', { class: 'when' },
        h('strong', { text: fmtRange(b.start, b.end) }),
        h('span', { class: 'len' }, h('b', { text: String(b.length) }), ' ' + (b.length === 1 ? 'day' : 'days'))),
      takeList.length ? h('div', { class: 'take' },
        h('span', { class: 'k', text: t('take') }),
        h('span', { class: 'v', text: takeList.map(fmtDay).join(', ') })) : null,
      h('p', { class: 'eff', text: t('gain', { n: I.days(state.lang, b.length), leave: I.leaveDays(state.lang, gainLeave || 0) }) }),
      hols.length ? h('ul', { class: 'incl' }, hols.map(function (x) {
        return h('li', null, h('span', { class: 'hd', text: fmtShort(x.iso) }), h('span', { class: 'hn', text: x.name.split(' (')[0] }))
      })) : h('p', { class: 'flexnote' }, h('span', { class: 'pill flex', text: t('flexible') }), ' ' + t('flexHint')),
      extra || null)
  }

  function viewPlan() {
    var p = result.plan
    var wrap = h('div')
    if (!p.breaks.length && !p.free.length) {
      wrap.append(h('p', { class: 'empty', text: t('planEmpty') }))
      return wrap
    }
    wrap.append(h('div', { class: 'breaks' }, p.breaks.map(function (b) { return breakCard(b) })))
    if (p.free.length) {
      wrap.append(h('h3', { text: t('freeTitle') }), h('div', { class: 'breaks free' }, p.free.map(function (b) { return breakCard(b) })))
    }
    return wrap
  }

  function viewBridges() {
    var b = result.bridges.slice(0, 14)
    var wrap = h('div', null, h('p', { class: 'note', text: t('bridgesIntro') }))
    if (!b.length) { wrap.append(h('p', { class: 'empty', text: t('bridgesEmpty') })); return wrap }
    wrap.append(h('div', { class: 'breaks' }, b.map(function (x) { return breakCard(x) })))
    return wrap
  }

  function viewHolidays() {
    var list = result.holInYear
    var onWe = 0
    var rows = list.map(function (s) {
      var d = result.days.filter(function (x) { return x.iso === s })[0]
      var we = d && d.weekend
      if (we) onWe++
      return h('li', { class: we ? 'weekend' : '' }, h('span', { class: 'd', text: fmtLong(s) }), h('span', { class: 'n', text: result.hol[s] }), we ? h('span', { class: 'pill we', text: t('holWeekend') }) : null)
    })
    return h('div', null, h('p', { class: 'note', text: t('holCount', { n: list.length }) + (onWe ? ' · ' + t('holWeekendNote', { n: onWe }) : '') }), h('ul', { class: 'hollist' }, rows))
  }

  function viewCalendar() {
    var plan = result.plan
    var leave = {}
    plan.leave.forEach(function (s) { leave[s] = true })
    var inBreak = {}
    plan.breaks.concat(plan.free).forEach(function (b) {
      for (var i = 0; i < b.length; i++) inBreak[P.addDays(b.start, i)] = true
    })
    var byIso = {}
    result.days.forEach(function (d) { byIso[d.iso] = d })
    var first = SUNDAY_FIRST[state.cc] ? 0 : 1
    var wd = [].concat([1, 2, 3, 4, 5, 6, 0])
    if (first === 0) wd = [0, 1, 2, 3, 4, 5, 6]
    var keys = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }
    var months = h('div', { class: 'months' })
    for (var m = 0; m < 12; m++) {
      var monthStart = state.year + '-' + (m < 9 ? '0' : '') + (m + 1) + '-01'
      var title = dateFmt({ month: 'long' }).format(P.parseISO(monthStart))
      var grid = h('div', { class: 'grid' }, wd.map(function (d) { return h('span', { class: 'dh', text: t(keys[d]) }) }))
      var offset = (P.dow(monthStart) - first + 7) % 7
      for (var i = 0; i < offset; i++) grid.appendChild(h('span', { class: 'blank' }))
      var daysInMonth = new Date(Date.UTC(state.year, m + 1, 0)).getUTCDate()
      for (var dd = 1; dd <= daysInMonth; dd++) {
        var s = state.year + '-' + (m < 9 ? '0' : '') + (m + 1) + '-' + (dd < 10 ? '0' : '') + dd
        var d = byIso[s]
        var cls = 'day'
        if (leave[s]) cls += ' leave'
        else if (d && result.clo[s] && !d.weekend) cls += ' clo'
        else if (d && d.holiday) cls += ' hol'
        else if (d && d.weekend) cls += ' we'
        if (inBreak[s]) cls += ' brk'
        grid.appendChild(h('span', { class: cls, title: d && d.holiday ? d.holiday : '', text: String(dd) }))
      }
      months.appendChild(h('section', { class: 'month' }, h('h4', { text: title }), grid))
    }
    var legend = h('ul', { class: 'legend' },
      h('li', null, h('i', { class: 'sw hol' }), t('legendHol')), state.closures.length ? h('li', null, h('i', { class: 'sw clo' }), t('closureName')) : null, h('li', null, h('i', { class: 'sw we' }), t('legendWe')),
      h('li', null, h('i', { class: 'sw leave' }), t('legendLeave')), h('li', null, h('i', { class: 'sw brk' }), t('legendBreak')))
    return h('div', { class: 'calwrap' }, h('h3', { class: 'printonly', text: t('printTitle', { country: countryName(state.cc), year: state.year }) }), legend, months)
  }

  function margin() {
    var m = result.margin
    var max = Math.max.apply(null, m.concat([1]))
    var w = 18, gap = 5, hgt = 90
    var n = m.length
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 ' + (n * (w + gap)) + ' ' + (hgt + 22))
    svg.setAttribute('class', 'chart')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', t('marginTitle'))
    m.forEach(function (v, i) {
      var bh = Math.max(1, (v / max) * hgt)
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', i * (w + gap)); rect.setAttribute('y', hgt - bh); rect.setAttribute('width', w); rect.setAttribute('height', bh); rect.setAttribute('rx', 3)
      rect.setAttribute('class', i === result.plan.used ? 'bar on' : 'bar')
      var title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = I.leaveDays(state.lang, i) + ': ' + v
      rect.appendChild(title)
      svg.appendChild(rect)
      if (n <= 20 || i % 5 === 0) {
        var tx = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        tx.setAttribute('x', i * (w + gap) + w / 2); tx.setAttribute('y', hgt + 16); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('class', 'tick')
        tx.textContent = String(i)
        svg.appendChild(tx)
      }
    })
    return h('section', { class: 'margin' }, h('h3', { text: t('marginTitle') }), h('p', { class: 'note', text: t('marginHint', { min: state.minBreak }) }), svg)
  }

  /* ----------------------------------------------------------------------- actions */

  function doPrint() {
    state.tab = 'cal'
    renderResults()
    setTimeout(function () { window.print() }, 60)
  }

  function doIcs() {
    var plan = result.plan
    var items = plan.breaks.concat(plan.free).map(function (b) {
      return { start: b.start, end: b.end, title: t('icsBreak', { n: b.length }), description: b.leave.length ? t('icsDesc', { days: b.leave.map(fmtDay).join(', ') }) : '' }
    })
    var text = P.toICS(items)
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
    var a = h('a', { href: URL.createObjectURL(blob), download: 'time-off-' + state.cc + '-' + state.year + '.ics' })
    document.body.appendChild(a); a.click(); a.remove()
  }

  function doCopy() {
    var url = location.href
    function ok() { toast(t('copied')) }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { toast(t('copyFail')) })
    else toast(t('copyFail'))
  }

  var toastTimer
  function toast(msg) {
    var el = document.getElementById('toast')
    if (!el) { el = h('div', { id: 'toast', role: 'status' }); document.body.appendChild(el) }
    el.textContent = msg
    el.className = 'on'
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { el.className = '' }, 2600)
  }

  /* ----------------------------------------------------------------------- start */

  document.documentElement.lang = state.lang
  build()
  updateStaticText()
  H.countries().then(function (c) {
    countryList = c.list
    renderControls()
  })
  reload()
})()
