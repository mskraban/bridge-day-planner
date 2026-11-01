/* Text for the interface in English and Slovenian, plus the plural rules of both languages. */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.I18n = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var STR = {
    en: {
      title: 'Bridge Day Planner',
      tagline: 'Take fewer days off. Get longer breaks.',
      intro: 'Pick your country and how many leave days you have. We find the days that turn public holidays into the longest possible breaks.',
      country: 'Country', year: 'Year', leave: 'Leave days you have', minBreak: 'Count breaks of at least', workWeek: 'Your working days',
      region: 'Region', regionAll: 'Whole country (no region)', regionHint: 'Some holidays only apply in some regions.',
      closures: 'Company-wide days off', closuresHint: 'Summer or winter shutdown, for example. These days are free and cost no leave. The plan builds around them.', from: 'From', to: 'To', addClosure: 'Add', removeClosure: 'Remove', closureName: 'Company break', badRange: 'Pick a start date, and an end date that is not before it.', noClosures: 'None added.',
      loading: 'Loading holidays…', retry: 'Try again',
      errLoad: 'Could not load the holidays. Check your connection and try again.', errStale: 'Showing saved data because the holiday service did not answer.',
      noWork: 'Pick at least one working day.',
      sumTitle: 'Your {year} plan',
      sumBig: '{n} days off', sumFrom: 'using {leave}', sumBase: 'Without planning you get {n} days in breaks of {min}+ days',
      sumBreaks: '{n} breaks', sumLongest: 'longest: {n} days', sumUnused: '{n} leave days left over to use anywhere you like',
      tabPlan: 'Best plan', tabBridges: 'Bridge days', tabCal: 'Calendar', tabHol: 'Holidays',
      take: 'Take off', flexible: 'Flexible', flexHint: 'Not tied to a holiday. Any similar weekend works.', gain: '{n} off for {leave}', fromHol: 'Includes', freeTitle: 'Long weekends with no leave needed', none: 'Nothing here.',
      planEmpty: 'No breaks of that length can be made with these leave days. Try more leave days or a shorter break.',
      bridgesIntro: 'The classic trick: one or a few working days sitting between a holiday and a weekend.',
      bridgesEmpty: 'No bridge days this year. Holidays that fall on a weekend cannot be bridged.',
      marginTitle: 'What each leave day gets you', marginHint: 'Total days off in breaks of {min}+ days, by number of leave days used.',
      print: 'Print calendar', ics: 'Add to my calendar', copy: 'Copy link', copied: 'Link copied.', copyFail: 'Could not copy. Copy the address bar instead.',
      legendHol: 'Public holiday', legendWe: 'Weekend / day off', legendLeave: 'Take leave', legendBreak: 'Part of a break',
      holWeekend: 'falls on a weekend', holWeekendNote: '{n} holidays fall on a weekend this year, so they add no extra day off.',
      holCount: '{n} public holidays',
      lang: 'Language', faq: 'Questions', other: 'Other countries',
      mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
      dayOne: 'day', dayMany: 'days', leaveOne: 'leave day', leaveMany: 'leave days',
      icsBreak: 'Break: {n} days off', icsDesc: 'Take off: {days}',
      footA: 'Holiday data from Nager.Date. Always check your employer\'s calendar, since some holidays and regional days differ.',
      footB: 'No accounts, no cookies. The hosted site only counts anonymous page views (Vercel Web Analytics).',
      printTitle: '{country} {year}: holidays and planned time off',
    },
    sl: {
      title: 'Bridge Day Planner',
      tagline: 'Vzemite manj dopusta. Imejte daljše počitnice.',
      intro: 'Izberite državo in število dni dopusta. Poiščemo dneve, s katerimi iz praznikov naredite čim daljši počitek.',
      country: 'Država', year: 'Leto', leave: 'Dnevi dopusta, ki jih imate', minBreak: 'Štej počitek, dolg vsaj', workWeek: 'Vaši delovni dnevi',
      region: 'Regija', regionAll: 'Cela država (brez regije)', regionHint: 'Nekateri prazniki veljajo le v nekaterih regijah.',
      closures: 'Skupni prosti dnevi podjetja', closuresHint: 'Na primer poletni ali zimski kolektivni dopust. Ti dnevi so prosti in ne porabijo dopusta. Načrt se prilagodi okoli njih.', from: 'Od', to: 'Do', addClosure: 'Dodaj', removeClosure: 'Odstrani', closureName: 'Kolektivni dopust', badRange: 'Izberite začetni datum in končni datum, ki ni pred njim.', noClosures: 'Ni dodanih.',
      loading: 'Nalagam praznike…', retry: 'Poskusi znova',
      errLoad: 'Praznikov ni bilo mogoče naložiti. Preverite povezavo in poskusite znova.', errStale: 'Prikazani so shranjeni podatki, ker storitev s prazniki ni odgovorila.',
      noWork: 'Izberite vsaj en delovni dan.',
      sumTitle: 'Vaš načrt za {year}',
      sumBig: '{n} prostih dni', sumFrom: 'z uporabo {leave}', sumBase: 'Brez načrtovanja imate {n} dni v počitku, dolgem {min}+ dni',
      sumBreaks: '{n} počitkov', sumLongest: 'najdaljši: {n} dni', sumUnused: 'še {n} dni dopusta lahko porabite kjerkoli',
      tabPlan: 'Najboljši načrt', tabBridges: 'Mostički', tabCal: 'Koledar', tabHol: 'Prazniki',
      take: 'Vzemite prosto', flexible: 'Prilagodljivo', flexHint: 'Ni vezano na praznik. Deluje vsak podoben vikend.', gain: '{n} prostih za {leave}', fromHol: 'Vključuje', freeTitle: 'Podaljšani vikendi brez dopusta', none: 'Tu ni ničesar.',
      planEmpty: 'S temi dnevi dopusta ni mogoče sestaviti počitka te dolžine. Poskusite z več dnevi dopusta ali krajšim počitkom.',
      bridgesIntro: 'Klasični trik: en delovni dan ali nekaj dni med praznikom in vikendom.',
      bridgesEmpty: 'Letos ni mostičkov. Praznikov, ki padejo na vikend, ni mogoče premostiti.',
      marginTitle: 'Koliko prinese vsak dan dopusta', marginHint: 'Skupaj prostih dni v počitkih, dolgih {min}+ dni, glede na porabljene dni dopusta.',
      print: 'Natisni koledar', ics: 'Dodaj v moj koledar', copy: 'Kopiraj povezavo', copied: 'Povezava kopirana.', copyFail: 'Kopiranje ni uspelo. Kopirajte naslov iz naslovne vrstice.',
      legendHol: 'Državni praznik', legendWe: 'Vikend / prost dan', legendLeave: 'Vzemite dopust', legendBreak: 'Del počitka',
      holWeekend: 'pade na vikend', holWeekendNote: '{n} praznikov letos pade na vikend, zato ne prinesejo dodatnega prostega dne.',
      holCount: '{n} državnih praznikov',
      lang: 'Jezik', faq: 'Vprašanja', other: 'Druge države',
      mon: 'pon', tue: 'tor', wed: 'sre', thu: 'čet', fri: 'pet', sat: 'sob', sun: 'ned',
      icsBreak: 'Počitek: {n} prostih dni', icsDesc: 'Vzemite prosto: {days}',
      footA: 'Podatki o praznikih: Nager.Date. Vedno preverite koledar svojega delodajalca, ker se nekateri prazniki in regionalni dnevi razlikujejo.',
      footB: 'Brez računov, brez piškotkov. Gostovana stran šteje le anonimne ogled strani (Vercel Web Analytics).',
      printTitle: '{country} {year}: prazniki in načrtovan dopust',
    },
  }

  /** "day / days" with the right plural for the language. Slovenian has singular, dual, few and many. */
  function days(lang, n) {
    if (lang === 'sl') {
      var m = Math.abs(n) % 100
      var form = m === 1 ? 'dan' : m === 2 ? 'dneva' : m === 3 || m === 4 ? 'dnevi' : 'dni'
      return n + ' ' + form
    }
    return n + ' ' + (Math.abs(n) === 1 ? 'day' : 'days')
  }
  function leaveDays(lang, n) {
    if (lang === 'sl') return days('sl', n) + ' dopusta'
    return n + ' ' + (Math.abs(n) === 1 ? 'leave day' : 'leave days')
  }

  function fmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m })
  }

  function t(lang, key, vars) {
    var table = STR[lang] || STR.en
    var s = table[key] != null ? table[key] : STR.en[key]
    return fmt(s == null ? key : s, vars)
  }

  return { STR: STR, t: t, days: days, leaveDays: leaveDays, fmt: fmt }
})
