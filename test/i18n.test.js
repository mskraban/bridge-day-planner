const test = require('node:test')
const assert = require('node:assert/strict')
const I = require('../public/i18n.js')

test('every English key exists in Slovenian and the other way round', () => {
  const en = Object.keys(I.STR.en).filter((k) => !/^(dayOne|dayMany|leaveOne|leaveMany)$/.test(k)).sort()
  const sl = Object.keys(I.STR.sl).sort()
  assert.deepEqual(sl.filter((k) => !en.includes(k)), [], 'extra Slovenian keys')
  assert.deepEqual(en.filter((k) => !sl.includes(k)), [], 'missing Slovenian keys')
})

test('placeholders match between languages', () => {
  for (const k of Object.keys(I.STR.sl)) {
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')
    assert.equal(ph(I.STR.sl[k]), ph(I.STR.en[k]), k)
  }
})

test('English plurals', () => {
  assert.equal(I.days('en', 1), '1 day')
  assert.equal(I.days('en', 4), '4 days')
  assert.equal(I.leaveDays('en', 1), '1 leave day')
  assert.equal(I.leaveDays('en', 10), '10 leave days')
})

test('Slovenian plurals: dan, dneva, dnevi, dni', () => {
  assert.equal(I.days('sl', 1), '1 dan')
  assert.equal(I.days('sl', 2), '2 dneva')
  assert.equal(I.days('sl', 3), '3 dnevi')
  assert.equal(I.days('sl', 4), '4 dnevi')
  assert.equal(I.days('sl', 5), '5 dni')
  assert.equal(I.days('sl', 11), '11 dni')
  assert.equal(I.days('sl', 21), '21 dni') // CLDR: only ...01 is singular and ...02 dual
  assert.equal(I.days('sl', 22), '22 dni')
  assert.equal(I.days('sl', 101), '101 dan')
  assert.equal(I.days('sl', 102), '102 dneva')
  assert.equal(I.leaveDays('sl', 2), '2 dneva dopusta')
})

test('t fills placeholders and falls back to English', () => {
  assert.equal(I.t('en', 'sumTitle', { year: 2027 }), 'Your 2027 plan')
  assert.equal(I.t('sl', 'sumTitle', { year: 2027 }), 'Vaš načrt za 2027')
  assert.equal(I.t('de', 'tabCal'), 'Calendar')
  assert.equal(I.t('en', 'nope'), 'nope')
})
