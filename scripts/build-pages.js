// Builds the static pages: the home page, one page per country (for search), sitemap and robots.
//   node scripts/build-pages.js            (uses https://bridgedays.vercel.app)
//   SITE_URL=https://example.com node scripts/build-pages.js
const fs = require('fs')
const path = require('path')

const SITE = (process.env.SITE_URL || 'https://bridgedays.vercel.app').replace(/\/$/, '')
const OUT = path.join(__dirname, '..', 'public')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const COUNTRIES = ['SI', 'AT', 'DE', 'HR', 'IT', 'HU', 'CZ', 'SK', 'PL', 'RS', 'BA', 'CH', 'FR', 'ES', 'PT', 'NL', 'BE', 'GB', 'IE', 'US', 'CA', 'AU', 'SE', 'NO', 'DK', 'FI']
const en = new Intl.DisplayNames(['en'], { type: 'region' })
const slug = (cc) => en.of(cc).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
const pageName = (cc) => 'bridge-days-' + slug(cc)

const ANALYTICS = `    <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
    <script defer src="/_vercel/insights/script.js"></script>`

const FAQ = {
  en: [
    ['What is a bridge day?', 'A working day that sits between a public holiday and a weekend. Taking just that day off gives you a long break for the price of one leave day.'],
    ['How does the planner pick the days?', 'It checks every way of spending your leave days and keeps the plan that gives you the most days off inside breaks of the length you choose. It never uses more leave than you have, and it never takes leave on a holiday or a weekend.'],
    ['Where do the holidays come from?', 'From the free Nager.Date holiday service. Always compare with your employer\'s calendar, because company days and some regional holidays can differ.'],
    ['Does it work if my weekend is not Saturday and Sunday?', 'Yes. Tap the days you work. For example, choose Sunday to Thursday if your weekend is Friday and Saturday.'],
    ['Is anything stored about me?', 'Only on your own device: your language and the holiday list, so the page loads faster next time. There are no accounts and no cookies. The hosted site counts anonymous page views with Vercel Web Analytics.'],
  ],
  sl: [
    ['Kaj je mostiček?', 'Delovni dan med praznikom in vikendom. Če vzamete le ta dan prosto, dobite dolg počitek za ceno enega dneva dopusta.'],
    ['Kako načrtovalnik izbere dneve?', 'Preveri vse načine porabe dni dopusta in obdrži načrt, ki da največ prostih dni v počitkih izbrane dolžine. Nikoli ne porabi več dopusta, kot ga imate, in nikoli ne vzame dopusta na praznik ali vikend.'],
    ['Od kod so prazniki?', 'Iz brezplačne storitve Nager.Date. Vedno primerjajte s koledarjem svojega delodajalca, ker se lahko podjetniški dnevi in nekateri regionalni prazniki razlikujejo.'],
    ['Ali deluje, če vikend ni sobota in nedelja?', 'Da. Izberite dneve, ko delate. Če je vaš vikend petek in sobota, izberite od nedelje do četrtka.'],
    ['Se o meni kaj shranjuje?', 'Samo na vaši napravi: jezik in seznam praznikov, da se stran naslednjič naloži hitreje. Ni računov in ni piškotkov. Gostovana stran šteje anonimne oglede z Vercel Web Analytics.'],
  ],
}

function head({ title, desc, path: p, lang, extra = '' }) {
  const url = SITE + p
  return `<!doctype html>
<html lang="${lang}"${lang === 'sl' ? ' data-default-lang="sl"' : ''}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${url}" />
    <meta name="theme-color" content="#0f766e" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Bridge Day Planner" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${SITE}/og.png" />
    <link rel="stylesheet" href="/style.css" />
${extra}${ANALYTICS}
  </head>`
}

function others(current) {
  const links = COUNTRIES.filter((c) => c !== current).map((c) => `<a href="/${pageName(c)}">${esc(en.of(c))}</a>`)
  return links.join('\n          ')
}

function page({ cc, lang, title, desc, h1, p }) {
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ[lang].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  const extra = `    <script type="application/ld+json">${JSON.stringify(faqLd).replace(/</g, '\\u003c')}</script>\n`
  const faqHtml = ['en', 'sl'].map((l) => `<div data-lang-show="${l}"${l !== lang ? ' hidden' : ''}>
          ${FAQ[l].map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n          ')}
        </div>`).join('\n        ')
  return `${head({ title, desc, path: p, lang, extra })}
  <body${cc ? ` data-cc="${cc}"` : ''}>
    <header class="top">
      <a class="brand" href="/"><span class="logo">🌉</span> <span data-t="title">${lang === 'sl' ? 'Načrtovalec mostičkov' : 'Bridge Day Planner'}</span></a>
      <nav aria-label="Countries"><a href="/bridge-days-slovenia">Slovenia</a><a href="/bridge-days-germany">Germany</a><a href="/bridge-days-austria">Austria</a><a href="/bridge-days-united-kingdom">UK</a><a href="/bridge-days-united-states">USA</a></nav>
    </header>
    <main class="wrap">
      <h1>${esc(h1)}</h1>
      <p class="lead" data-t="tagline">${lang === 'sl' ? 'Vzemite manj dopusta. Imejte daljše počitnice.' : 'Take fewer days off. Get longer breaks.'}</p>
      <p class="intro" data-t="intro">${lang === 'sl' ? 'Izberite državo in število dni dopusta. Poiščemo dneve, s katerimi iz praznikov naredite čim daljši počitek.' : 'Pick your country and how many leave days you have. We find the days that turn public holidays into the longest possible breaks.'}</p>
      <noscript><p class="status bad">This planner needs JavaScript to load the holidays and do the maths in your browser.</p></noscript>
      <div id="app"></div>
      <section class="info">
        <div data-lang-show="en"${lang !== 'en' ? ' hidden' : ''}>
          <h2>How it works</h2>
          <ol><li>Choose your country, the year and how many leave days you have.</li><li>The planner finds the days to take off so that public holidays and weekends join into long breaks.</li><li>Print the calendar, add the breaks to your own calendar, or share the link.</li></ol>
        </div>
        <div data-lang-show="sl"${lang !== 'sl' ? ' hidden' : ''}>
          <h2>Kako deluje</h2>
          <ol><li>Izberite državo, leto in število dni dopusta.</li><li>Načrtovalnik poišče dneve za dopust, da se prazniki in vikendi združijo v dolge počitke.</li><li>Natisnite koledar, dodajte počitke v svoj koledar ali delite povezavo.</li></ol>
        </div>
      </section>
      <section class="info">
        <h2 data-t="faq">${lang === 'sl' ? 'Vprašanja' : 'Questions'}</h2>
        ${faqHtml}
      </section>
      <section class="info">
        <h2 data-t="other">${lang === 'sl' ? 'Druge države' : 'Other countries'}</h2>
        <div class="countries">
          ${others(cc)}
        </div>
      </section>
    </main>
    <footer class="foot">
      <p data-t="footA">${lang === 'sl' ? 'Podatki o praznikih: Nager.Date. Vedno preverite koledar svojega delodajalca, ker se nekateri prazniki in regionalni dnevi razlikujejo.' : 'Holiday data from Nager.Date. Always check your employer\'s calendar, since some holidays and regional days differ.'}</p>
      <p data-t="footB">${lang === 'sl' ? 'Brez računov, brez piškotkov. Gostovana stran šteje le anonimne ogled strani (Vercel Web Analytics).' : 'No accounts, no cookies. The hosted site only counts anonymous page views (Vercel Web Analytics).'}</p>
    </footer>
    <script src="/planner.js"></script>
    <script src="/i18n.js"></script>
    <script src="/holidays.js"></script>
    <script src="/app.js"></script>
  </body>
</html>
`
}

const pages = []
function write(name, html, p) { fs.writeFileSync(path.join(OUT, name), html); pages.push(p) }

write('index.html', page({
  cc: '', lang: 'en',
  title: 'Bridge Day Planner: take fewer days off, get longer breaks (free)',
  desc: 'Find the best days to take off around public holidays. Pick your country and your leave days and get the longest possible breaks, a printable calendar and a calendar file. Free, no sign-up.',
  h1: 'Bridge Day Planner', p: '/',
}), '/')

for (const cc of COUNTRIES) {
  const name = en.of(cc)
  write(pageName(cc) + '.html', page({
    cc, lang: 'en',
    title: `Bridge days and long weekends in ${name}: best days to take off`,
    desc: `Plan your leave around ${name}'s public holidays. See which days to take off for the longest breaks, with a printable year calendar. Free, no sign-up.`,
    h1: `Bridge days in ${name}`, p: '/' + pageName(cc),
  }), '/' + pageName(cc))
}

write('mosticki-slovenija.html', page({
  cc: 'SI', lang: 'sl',
  title: 'Mostički in podaljšani vikendi v Sloveniji: kdaj vzeti dopust',
  desc: 'Načrtujte dopust okoli slovenskih praznikov. Poglejte, kateri dnevi vam prinesejo najdaljši počitek, in natisnite letni koledar. Brezplačno, brez prijave.',
  h1: 'Mostički v Sloveniji', p: '/mosticki-slovenija',
}), '/mosticki-slovenija')

fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((u) => `  <url><loc>${SITE}${u === '/' ? '/' : u}</loc></url>`).join('\n')}\n</urlset>\n`)
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`built ${pages.length} pages for ${SITE}`)
