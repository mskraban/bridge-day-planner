/* Loads public holidays from Nager.Date (free, no key, works from the browser) and remembers them on this device. */
;(function () {
  'use strict'
  var API = 'https://date.nager.at/api/v3'
  var DAY = 86400000

  function readCache(key, maxAge) {
    try {
      var raw = JSON.parse(localStorage.getItem(key) || 'null')
      if (!raw || !raw.data) return null
      return { data: raw.data, fresh: Date.now() - raw.t < maxAge }
    } catch (e) { return null }
  }
  function writeCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data: data })) } catch (e) { /* private mode or full: fine */ }
  }

  async function getJson(url) {
    var res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.json()
  }

  /** [{ countryCode, name }]. A short built-in list keeps the page usable if the service is down. */
  async function countries() {
    var key = 'bdp:countries:v1'
    var c = readCache(key, 30 * DAY)
    if (c && c.fresh) return { list: c.data, stale: false }
    try {
      var list = await getJson(API + '/AvailableCountries')
      writeCache(key, list)
      return { list: list, stale: false }
    } catch (e) {
      if (c) return { list: c.data, stale: true }
      return { list: FALLBACK, stale: true }
    }
  }

  /** Holidays for one country and year, as the raw Nager list. */
  async function year(cc, y) {
    var key = 'bdp:h:' + cc + ':' + y
    var c = readCache(key, 7 * DAY)
    if (c && c.fresh) return { list: c.data, stale: false }
    try {
      var list = await getJson(API + '/PublicHolidays/' + y + '/' + cc)
      writeCache(key, list)
      return { list: list, stale: false }
    } catch (e) {
      if (c) return { list: c.data, stale: true }
      throw e
    }
  }

  /** The year before, the year itself and the year after, so breaks around New Year are right. */
  async function around(cc, y) {
    var parts = await Promise.all([year(cc, y - 1).catch(function () { return null }), year(cc, y), year(cc, y + 1).catch(function () { return null })])
    var list = []
    parts.forEach(function (p) { if (p) list = list.concat(p.list) })
    return { list: list, stale: parts.some(function (p) { return p && p.stale }) }
  }

  var FALLBACK = ['SI', 'AT', 'DE', 'HR', 'IT', 'HU', 'CZ', 'SK', 'PL', 'RS', 'BA', 'CH', 'FR', 'ES', 'PT', 'NL', 'BE', 'GB', 'IE', 'US', 'CA', 'AU', 'SE', 'NO', 'DK', 'FI']
    .map(function (c) { return { countryCode: c, name: c } })

  window.Holidays = { countries: countries, year: year, around: around }
})()
