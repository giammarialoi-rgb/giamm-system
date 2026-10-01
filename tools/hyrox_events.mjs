// The HYROX race calendar the app and the site show (web/hyrox-events.json).
//
//   node tools/hyrox_events.mjs          rebuild the file from the list below
//
// The list is copied from the official calendar (https://hyrox.com/find-my-race/):
// one race per line, "City | country code | first day | last day | page".
// A race with no date yet has empty dates and is shown as "date to be
// announced". Update the lines and SOURCE_DATE, run this, commit: the site's
// pages for the races and the app's list follow the file.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SOURCE_DATE = '2026-10-01';
const SEASON = '2026/27';
const BASE = 'https://hyrox.com/event/';

const LINES = `
Bordeaux | FR | 2026-09-30 | 2026-10-04 | hyrox-bordeaux-s26-27
Karlsruhe | DE | 2026-10-01 | 2026-10-04 | hyrox-karlsruhe
Toronto | CA | 2026-10-01 | 2026-10-04 | goodlife-hyrox-toronto-26-27
Boston | US | 2026-10-08 | 2026-10-11 | hwpo-hyrox-boston-26-27
Ginevra | CH | 2026-10-09 | 2026-10-11 | hyrox-geneva
Danzica | PL | 2026-10-10 | 2026-10-11 | hyrox-gdansk
Valencia | ES | 2026-10-15 | 2026-10-18 | hyrox-valencia
San Paolo | BR | 2026-10-17 | 2026-10-18 | hyrox-sao-paulo-2
Budapest | HU | 2026-10-17 | 2026-10-17 | hyrox-budapest
Tampa | US | 2026-10-22 | 2026-10-25 | hyrox-tampa
Abu Dhabi | AE | 2026-10-23 | 2026-10-25 | hyrox-abu-dhabi
Birmingham | GB | 2026-10-27 | 2026-11-01 | hyrox-birmingham
Amburgo | DE | 2026-10-28 | 2026-11-01 | intersport-hyrox-hamburg
Nizza | FR | 2026-10-29 | 2026-11-01 | hyrox-nice-s26-27
Città del Messico | MX | 2026-10-29 | 2026-11-01 | hyrox-mexico-city
Shanghai | CN | 2026-10-31 | 2026-11-01 | hyrox-shanghai-1031
Dublino | IE | 2026-11-11 | 2026-11-15 | hyrox-dublin
Düsseldorf | DE | 2026-11-11 | 2026-11-15 | hyrox-dusseldorf
Barcellona | ES | 2026-11-11 | 2026-11-15 | hyrox-barcelona-2
Denver | US | 2026-11-12 | 2026-11-15 | hyrox-denver
Seul | KR | 2026-11-13 | 2026-11-15 | hyrox-seoul
Il Cairo | EG | 2026-11-14 | 2026-11-15 | hyrox-cairo
Dallas | US | 2026-11-18 | 2026-11-22 | hyrox-dallas
Poznań | PL | 2026-11-20 | 2026-11-22 | hyrox-poznan
Guangzhou | CN | 2026-11-21 | 2026-11-22 | hyrox-guangzhou
Rio de Janeiro | BR | 2026-11-21 | 2026-11-22 | hyrox-rio-de-janeiro
Singapore | SG | 2026-11-26 | 2026-11-29 | aia-hyrox-singapore
Johannesburg | ZA | 2026-11-26 | 2026-11-29 | virgin-active-hyrox-johannesburg-26-27
Utrecht | NL | 2026-11-26 | 2026-11-30 | hyrox-utrecht
Gujarat | IN | 2026-11-26 | 2026-11-28 | hyrox-gujarat
Dubai | AE | 2026-11-27 | 2026-11-28 | hyrox-dubai
Londra | GB | 2026-12-02 | 2026-12-06 | hyrox-london-excel
Anaheim | US | 2026-12-03 | 2026-12-06 | hyrox-anaheim-26-27
Milano | IT | 2026-12-04 | 2026-12-06 | hyrox-milan
Sanya | CN | 2026-12-05 | 2026-12-06 | 30454
Melbourne | AU | 2026-12-09 | 2026-12-13 | hyrox-melbourne
Nashville | US | 2026-12-09 | 2026-12-13 | hyrox-nashville
Stoccolma | SE | 2026-12-10 | 2026-12-13 | intersport-hyrox-stockholm-arena
Francoforte | DE | 2026-12-10 | 2026-12-13 | fitness-first-hyrox-frankfurt
Kuala Lumpur | MY | 2026-12-10 | 2026-12-13 | hyrox-kuala-lumpur
Parigi | FR | 2026-12-12 | 2026-12-20 | hyrox-paris-s26-27
Gand | BE | 2026-12-17 | 2026-12-20 | hyrox-gent
Vancouver | CA | 2026-12-17 | 2026-12-20 | hyrox-vancouver
Helsinki | FI | 2026-12-18 | 2026-12-20 | hyrox-helsinki-2
Hong Kong | HK | 2027-01-07 | 2027-01-10 | hyrox-hong-kong
Noida | IN | 2027-01-15 | 2027-01-17 | hyrox-noida
Manchester | GB | 2027-01-20 | 2027-01-31 | hyrox-manchester
Osaka | JP | 2027-01-21 | 2027-01-25 | byd-hyrox-osaka
Amsterdam | NL | 2027-01-22 | 2027-01-31 | hyrox-amsterdam
Verona | IT | 2027-01-28 | 2027-01-31 | hyrox-verona
Tolosa | FR | 2027-02-03 | 2027-02-07 | hyrox-toulouse-s26-27
Auckland | NZ | 2027-02-04 | 2027-02-07 | hyrox-auckland
Bilbao | ES | 2027-02-06 | 2027-02-07 | hyrox-bilbao
Bangkok | TH | 2027-02-11 | 2027-02-14 | hyrox-bangkok
Chicago | US | 2027-02-11 | 2027-02-15 | hyrox-chicago-26-27
Basilea | CH | 2027-02-12 | 2027-02-14 | hyrox-basel
Katowice | PL | 2027-02-19 | 2027-02-21 | hyrox-katowice
Vienna | AT | 2027-02-19 | 2027-02-21 | hyrox-vienna
Cancún | MX | 2027-02-19 | 2027-02-21 | hyrox-cancun
Phoenix | US | 2027-02-25 | 2027-02-28 | inbody-hyrox-phoenix-26-27
Mechelen | BE | 2027-03-03 | 2027-03-07 | hyrox-mechelen
Glasgow | GB | 2027-03-10 | 2027-03-14 | hyrox-glasgow-2
Taipei | TW | 2027-03-12 | 2027-03-14 | hyrox-taipei
Las Vegas | US | 2027-03-12 | 2027-03-14 | hyrox-las-vegas-26-27
Madrid | ES | 2027-03-17 | 2027-03-21 | hyrox-madrid
Guadalajara | MX | 2027-03-19 | 2027-03-21 | hyrox-guadalajara
Buenos Aires | AR | 2027-03-20 | 2027-03-21 | hyrox-buenos-aires
Copenaghen | DK | | | hyrox-copenhagen
Miami Beach | US | 2027-03-26 | 2027-03-28 | sweat-pals-hyrox-miami-beach-26-27
Città del Capo | ZA | 2027-03-26 | 2027-03-28 | virgin-active-hyrox-cape-town
Brisbane | AU | 2027-03-31 | 2027-04-04 | hyrox-brisbane
Rotterdam | NL | 2027-04-01 | 2027-04-04 | hyrox-rotterdam
Houston | US | 2027-04-01 | 2027-04-04 | hyrox-houston-26-27
Bari | IT | 2027-04-02 | 2027-04-04 | hyrox-bari
Varsavia | PL | 2027-04-07 | 2027-04-11 | hyrox-warsaw-26-27
Parigi Grand Palais | FR | 2027-04-08 | 2027-04-12 | hyrox-paris-grand-palais-s26-27
Colonia | DE | 2027-04-08 | 2027-04-11 | all-inclusive-fitness-hyrox-cologne
Malaga | ES | 2027-04-14 | 2027-04-18 | hyrox-malaga
Nagoya | JP | 2027-04-16 | 2027-04-18 | hyrox-nagoya
Helsinki (primavera) | FI | 2027-04-16 | 2027-04-18 | hyrox-helsinki
Monterrey | MX | 2027-04-16 | 2027-04-18 | hyrox-monterrey
Ottawa | CA | 2027-04-21 | 2027-04-25 | hyrox-ottawa-26-27
Atlanta | US | 2027-04-23 | 2027-04-25 | factor_-hyrox-atlanta
Cracovia | PL | 2027-05-07 | 2027-05-09 | hyrox-krakow-26-27
San Paolo (maggio) | BR | 2027-05-08 | 2027-05-09 | hyrox-sao-paulo
Lione | FR | 2027-05-12 | 2027-05-16 | hyrox-lyon-s26-27
Bengaluru | IN | 2027-05-12 | 2027-05-16 | hyrox-bengaluru
Incheon | KR | 2027-05-13 | 2027-05-16 | hyrox-incheon
San Diego | US | 2027-05-13 | 2027-05-16 | hyrox-san-diego-26-27
Cardiff | GB | 2027-05-20 | 2027-05-29 | hyrox-cardiff-2
Portland | US | 2027-05-21 | 2027-05-23 | hyrox-portland-26-27
Rimini | IT | 2027-05-27 | 2027-05-30 | cisalfa-hyrox-rimini
Riga | LV | 2027-05-28 | 2027-05-30 | hyrox-riga
Hong Kong · Campionati del mondo | HK | 2027-06-10 | 2027-06-13 | puma-hyrox-world-championships-hong-kong
New York | US | | | hyrox-new-york
`;

const COUNTRIES = {
  AE: 'Emirati Arabi Uniti', AR: 'Argentina', AT: 'Austria', AU: 'Australia', BE: 'Belgio', BR: 'Brasile', CA: 'Canada', CH: 'Svizzera',
  CN: 'Cina', DE: 'Germania', DK: 'Danimarca', EG: 'Egitto', ES: 'Spagna', FI: 'Finlandia', FR: 'Francia', GB: 'Regno Unito', HK: 'Hong Kong',
  HU: 'Ungheria', IE: 'Irlanda', IN: 'India', IT: 'Italia', JP: 'Giappone', KR: 'Corea del Sud', LV: 'Lettonia', MX: 'Messico', MY: 'Malesia',
  NL: 'Paesi Bassi', NZ: 'Nuova Zelanda', PL: 'Polonia', SE: 'Svezia', SG: 'Singapore', TH: 'Thailandia', TW: 'Taiwan', US: 'Stati Uniti', ZA: 'Sudafrica'
};
const slug = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const events = LINES.trim().split('\n').map((line) => {
  const [city, country, start, end, page] = line.split('|').map((x) => x.trim());
  if (!COUNTRIES[country]) throw new Error('Unknown country in: ' + line);
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('Bad date in: ' + line);
  return { id: slug(city) + (start ? '-' + start.slice(0, 7) : ''), city, country, countryName: COUNTRIES[country], start, end: end || start, url: BASE + page + '/' };
});
const ids = new Set();
events.forEach((e) => { if (ids.has(e.id)) throw new Error('Two races with the same id: ' + e.id); ids.add(e.id); });
const out = { season: SEASON, updated: SOURCE_DATE, source: 'https://hyrox.com/find-my-race/', events };
fs.writeFileSync(path.join(ROOT, 'web', 'hyrox-events.json'), JSON.stringify(out, null, 1) + '\n');
console.log(events.length + ' races, ' + events.filter((e) => e.country === 'IT').length + ' in Italy -> web/hyrox-events.json');
