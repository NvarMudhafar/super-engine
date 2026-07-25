import type {
  ChecklistItem,
  PlaceCategory,
  Priority,
  TripData,
} from '../types';
import { addDays, todayISO, uid } from './util';

/* ------------------------------------------------------------ blank trip */

export function emptyTrip(): TripData {
  const start = addDays(todayISO(), 60);
  return {
    version: 1,
    trip: {
      name: 'Spain',
      startDate: start,
      endDate: addDays(start, 13),
      travelers: 2,
      currency: 'EUR',
      homeCurrency: 'USD',
      fxRate: 0,
      budgetTotal: 6000,
      notes: '',
    },
    cities: [],
    stays: [],
    restaurants: [],
    places: [],
    legs: [],
    expenses: [],
    checklist: [],
    blocks: [],
  };
}

/** First-run state: a blank trip plus the pre-departure checklist. */
export function starterTrip(): TripData {
  return { ...emptyTrip(), checklist: defaultChecklist() };
}

export function defaultChecklist(): ChecklistItem[] {
  const items: Array<[string, string]> = [
    ['Documents', 'Passport valid 3+ months past return date'],
    ['Documents', 'Check whether you need an ETIAS authorisation'],
    ['Documents', 'Travel insurance sorted'],
    ['Documents', 'Photos of passport + cards saved offline'],
    ['Documents', 'Driving licence / IDP if renting a car'],
    ['Before you go', 'Book Alhambra tickets (sell out 2–3 months ahead)'],
    ['Before you go', 'Book Sagrada Família + Park Güell time slots'],
    ['Before you go', 'Reserve any tasting-menu restaurants'],
    ['Before you go', 'Book long-distance trains (cheaper 2+ months out)'],
    ['Before you go', 'Tell your bank you are travelling'],
    ['Before you go', 'Download offline maps for each city'],
    ['Before you go', 'Set up an eSIM or check roaming'],
    ['Before you go', 'Learn 20 words of Spanish'],
    ['Packing', 'Type-C / Type-F plug adapter'],
    ['Packing', 'Comfortable broken-in walking shoes'],
    ['Packing', 'Shoulder-covering layer for cathedrals'],
    ['Packing', 'Sun hat + high-SPF sunscreen'],
    ['Packing', 'Refillable water bottle'],
    ['Packing', 'Light layers — mornings and evenings cool off'],
    ['Packing', 'Crossbody bag that zips (pickpockets in Barcelona/Madrid)'],
    ['Packing', 'Swimwear'],
    ['Packing', 'Power bank'],
    ['On arrival', 'Buy a transit card in each big city'],
    ['On arrival', 'Withdraw some cash — small bars are cash-only'],
    ['On arrival', 'Shift your dinner clock: lunch 2pm, dinner 9pm'],
  ];
  return items.map(([group, label]) => ({ id: uid(), group, label, done: false }));
}

/* --------------------------------------------------------- curated library */

export interface LibRestaurant {
  name: string;
  cuisine: string;
  area: string;
  priceTier: number;
  mustGo: boolean;
  /** Rough per-person spend, EUR. */
  estCostPerPerson: number;
  /** True for places that realistically need booking ahead. */
  bookAhead: boolean;
  notes: string;
}

export interface LibPlace {
  name: string;
  category: PlaceCategory;
  priority: Priority;
  ticketNeeded: boolean;
  cost: number;
  hours: string;
  notes: string;
}

export interface LibraryCity {
  name: string;
  region: string;
  blurb: string;
  /** Suggested number of nights. */
  nights: number;
  restaurants: LibRestaurant[];
  places: LibPlace[];
}

const r = (
  name: string,
  cuisine: string,
  area: string,
  priceTier: number,
  estCostPerPerson: number,
  notes: string,
  opts: { mustGo?: boolean; bookAhead?: boolean } = {},
): LibRestaurant => ({
  name,
  cuisine,
  area,
  priceTier,
  estCostPerPerson,
  notes,
  mustGo: opts.mustGo ?? false,
  bookAhead: opts.bookAhead ?? false,
});

const p = (
  name: string,
  category: PlaceCategory,
  priority: Priority,
  cost: number,
  notes: string,
  opts: { ticketNeeded?: boolean; hours?: string } = {},
): LibPlace => ({
  name,
  category,
  priority,
  cost,
  notes,
  ticketNeeded: opts.ticketNeeded ?? false,
  hours: opts.hours ?? '',
});

export const SPAIN_LIBRARY: LibraryCity[] = [
  {
    name: 'Madrid',
    region: 'Community of Madrid',
    blurb:
      'Big, unpretentious and open late. The art is world-class and the tapas culture is neighbourhood-by-neighbourhood.',
    nights: 3,
    restaurants: [
      r('Sobrino de Botín', 'Castilian roast', 'Sol / La Latina', 3, 55,
        'Opened 1725 and claims the title of oldest restaurant in the world. Order the cochinillo (roast suckling pig).',
        { mustGo: true, bookAhead: true }),
      r('Casa Lucio', 'Castilian', 'Cava Baja', 3, 55,
        'Famous for huevos rotos — fried eggs broken over potatoes. Books out; ask for the ground floor.',
        { bookAhead: true }),
      r('Taberna La Bola', 'Castilian', 'Ópera', 2, 35,
        'Cocido madrileño cooked in clay pots over coals. Lunch only for the cocido. Cash only.',
        { bookAhead: true }),
      r('Bodega de la Ardosa', 'Tapas', 'Malasaña', 1, 18,
        'Stand-up bar. Tortilla de patatas, salmorejo and vermouth on tap. No reservations.',
        { mustGo: true }),
      r('Casa Labra', 'Tapas', 'Sol', 1, 12,
        'Battered cod (soldaditos de Pavía) at the counter since 1860. Queue, order, eat standing.'),
      r('Mercado de San Fernando', 'Market', 'Lavapiés', 1, 15,
        'The market locals actually use — much less touristy than San Miguel.'),
      r('Sala de Despiece', 'Modern tapas', 'Chamberí', 2, 40,
        'Counter seating around a butcher-block workbench. Theatrical and very good.',
        { bookAhead: true }),
      r('StreetXO', 'Fusion', 'Serrano', 4, 90,
        "Dabiz Muñoz's loud, chaotic fusion counter. Books open a month out.",
        { bookAhead: true }),
    ],
    places: [
      p('Museo del Prado', 'museum', 'must', 15,
        'Velázquez, Goya, Bosch. Free the last two hours daily, but it is packed then. Two hours minimum.',
        { ticketNeeded: true, hours: 'Mon–Sat 10:00–20:00, Sun 10:00–19:00' }),
      p('Museo Reina Sofía', 'museum', 'must', 12,
        "Guernica is here. Free evenings Mon/Wed–Sat 19:00–21:00.",
        { ticketNeeded: true, hours: 'Wed–Mon 10:00–21:00, closed Tue' }),
      p('Museo Thyssen-Bornemisza', 'museum', 'want', 14,
        'Fills the gaps the other two leave — Impressionists, early modern.', { ticketNeeded: true }),
      p('Parque del Retiro', 'park', 'must', 0,
        'Rent a rowboat, see the Palacio de Cristal. Sunday afternoons are a scene.'),
      p('Palacio Real', 'landmark', 'want', 14,
        'Largest royal palace in western Europe by floor area. Changing of the guard on Wednesdays.',
        { ticketNeeded: true }),
      p('Plaza Mayor & Mercado de San Miguel', 'landmark', 'want', 0,
        'Worth one loop. Eat elsewhere — San Miguel is a tourist food hall now.'),
      p('Templo de Debod', 'viewpoint', 'want', 0,
        'A real Egyptian temple, gifted to Spain. Best sunset spot in the city.'),
      p('Malasaña & Chueca', 'neighbourhood', 'must', 0,
        'Where to spend an evening. Vintage shops by day, bar-hopping after 22:00.'),
      p('Azotea del Círculo de Bellas Artes', 'viewpoint', 'want', 6,
        'Rooftop bar with the best 360° view of the centre. Small entry fee.'),
      p('Toledo (day trip)', 'daytrip', 'want', 30,
        '33 min by AVE from Atocha. Medieval hill city — cathedral, El Greco, Mirador del Valle.'),
      p('Segovia (day trip)', 'daytrip', 'maybe', 30,
        'Roman aqueduct and a fairytale alcázar, 30 min by train. Eat cochinillo at Casa Cándido.'),
    ],
  },
  {
    name: 'Barcelona',
    region: 'Catalonia',
    blurb:
      'Modernista architecture, a working beach and the densest concentration of great small bars in Spain. Book the big sights before you fly.',
    nights: 4,
    restaurants: [
      r('Quimet & Quimet', 'Montaditos', 'Poble-sec', 2, 30,
        'Standing-room bodega, walls of bottles. The tinned-seafood montaditos are the whole point. Closed weekends + August.',
        { mustGo: true }),
      r('Cal Pep', 'Seafood tapas', 'El Born', 3, 60,
        'Sit at the counter and let Pep decide. No menu needed. Arrive at opening or queue.',
        { mustGo: true }),
      r('Bar Cañete', 'Andalusian tapas', 'El Raval', 3, 55,
        'Immaculate produce, white-jacketed waiters, counter seats are the good ones.',
        { bookAhead: true }),
      r('La Cova Fumada', 'Tapas', 'Barceloneta', 1, 20,
        'The bomba (spicy potato fritter) was invented here. No sign on the door. Lunch only, cash only.',
        { mustGo: true }),
      r('Bar del Pla', 'Catalan tapas', 'El Born', 2, 35,
        'Reliably excellent neighbourhood bar near the Picasso Museum.'),
      r('Can Solé', 'Paella', 'Barceloneta', 3, 55,
        'Century-old arrocería. Proper rice, not the tourist paella on the Rambla.',
        { bookAhead: true }),
      r('Disfrutar', 'Avant-garde', 'Eixample', 4, 300,
        'Three Michelin stars, ex-elBulli chefs. Reservations open months ahead and vanish.',
        { bookAhead: true }),
      r('Bodega 1900', 'Vermuteria', 'Sant Antoni', 2, 45,
        "Albert Adrià's take on a pre-war vermouth bar. Order the mollete."),
    ],
    places: [
      p('Sagrada Família', 'landmark', 'must', 26,
        'Timed entry, sells out days ahead. Pay extra for a tower. Go late afternoon for the west windows.',
        { ticketNeeded: true, hours: 'Daily 09:00–20:00 (seasonal)' }),
      p('Park Güell', 'park', 'must', 18,
        'Only the Monumental Zone is ticketed and it is capped per half-hour. Book a slot.',
        { ticketNeeded: true }),
      p('Casa Batlló', 'landmark', 'must', 35,
        "Gaudí's most joyful facade. The audio-tour tablet is genuinely good.", { ticketNeeded: true }),
      p('La Pedrera (Casa Milà)', 'landmark', 'want', 28,
        'The rooftop chimney warriors. The night visit with rooftop projections is worth the premium.',
        { ticketNeeded: true }),
      p('Palau de la Música Catalana', 'landmark', 'want', 20,
        'A stained-glass concert hall. Better as a concert than a guided tour if timing allows.',
        { ticketNeeded: true }),
      p('Gothic Quarter', 'neighbourhood', 'must', 0,
        'Get lost between the cathedral and Plaça del Pi. Early morning is empty and beautiful.'),
      p('Mercat de la Boqueria', 'market', 'want', 0,
        'Go before 10:00 or skip it. Eat at El Quim de la Boqueria at the counter.'),
      p('Bunkers del Carmel', 'viewpoint', 'must', 0,
        'Civil-war anti-aircraft platform, best free view of the whole city. Bring a drink for sunset.'),
      p('Montjuïc & MNAC', 'museum', 'want', 12,
        'Romanesque frescoes rescued from Pyrenean churches — quietly one of Europe’s great collections.'),
      p('Museu Picasso', 'museum', 'want', 12,
        'Strongest on the early years, which is more interesting than it sounds.', { ticketNeeded: true }),
      p('Hospital de Sant Pau', 'landmark', 'maybe', 16,
        'Modernista hospital complex, a fraction of the crowds of the Gaudí sites.'),
      p('Barceloneta / Bogatell beach', 'beach', 'want', 0,
        'Bogatell is where locals go; Barceloneta is where everyone else does.'),
      p('Montserrat (day trip)', 'daytrip', 'maybe', 40,
        'Serrated mountain monastery an hour out. Go early, hear the boys’ choir at 13:00.'),
    ],
  },
  {
    name: 'Seville',
    region: 'Andalusia',
    blurb:
      'The most atmospheric city in Spain. Orange trees, tiled courtyards, flamenco and a tapas scene you can walk between all night. Brutally hot July–August.',
    nights: 3,
    restaurants: [
      r('Bar Eslava', 'Modern tapas', 'San Lorenzo', 2, 30,
        'The best tapas in the city and it knows it. Slow-cooked egg over mushroom cake; honey-glazed pork ribs. No reservations for the bar — arrive at 20:30.',
        { mustGo: true }),
      r('El Rinconcillo', 'Traditional tapas', 'Santa Catalina', 2, 28,
        'Open since 1670. Spinach with chickpeas, and the tab chalked on the wooden counter.',
        { mustGo: true }),
      r('Bar Las Teresas', 'Traditional tapas', 'Santa Cruz', 2, 30,
        'Hams hanging over a narrow marble bar in the old Jewish quarter.'),
      r('La Brunilda', 'Modern tapas', 'Arenal', 2, 30,
        'Small, bright, always full. Book or turn up at opening.', { bookAhead: true }),
      r('Bodega Santa Cruz (Las Columnas)', 'Tapas', 'Santa Cruz', 1, 12,
        'Stand on the street with a beer and a montadito. Cheap and permanently busy.'),
      r('Casa Morales', 'Bodega', 'Centro', 1, 18,
        'Huge clay wine jars, 1850s fittings, minimal fuss.'),
      r('Mercado de Triana', 'Market', 'Triana', 1, 20,
        'Cross the bridge, eat at the counters, then walk Calle Betis at dusk.'),
    ],
    places: [
      p('Real Alcázar', 'landmark', 'must', 15,
        'Mudéjar palace still used by the royal family. Book the first slot of the day; add the Cuarto Real Alto.',
        { ticketNeeded: true, hours: 'Daily 09:30–17:00/19:00 seasonal' }),
      p('Catedral de Sevilla & Giralda', 'landmark', 'must', 12,
        'Largest Gothic cathedral in the world; Columbus’s tomb. The Giralda is a ramp, not stairs.',
        { ticketNeeded: true }),
      p('Plaza de España', 'landmark', 'must', 0,
        'Go at 08:00 for the tiles without the crowds, or at dusk when it is lit.'),
      p('Flamenco at Casa de la Memoria', 'nightlife', 'must', 20,
        'Small, serious, no dinner-show nonsense. 50 seats — book a few days ahead.',
        { ticketNeeded: true }),
      p('Metropol Parasol (Las Setas)', 'viewpoint', 'want', 15,
        'Giant timber lattice with a walkway on top. Sunset ticket includes a drink.', { ticketNeeded: true }),
      p('Barrio Santa Cruz', 'neighbourhood', 'must', 0,
        'The old Jewish quarter — deliberately maze-like. Wander without a destination.'),
      p('Triana', 'neighbourhood', 'want', 0,
        'Ceramics workshops, the market, and the best river views back at the city.'),
      p('Archivo General de Indias', 'museum', 'maybe', 0,
        'The paper trail of the Spanish empire. Free and quiet.'),
      p('Parque de María Luisa', 'park', 'want', 0,
        'Shade, tiled benches and ponds. The relief you need at 4pm in summer.'),
      p('Itálica (day trip)', 'daytrip', 'maybe', 2,
        'Roman amphitheatre 20 min out; Game of Thrones filmed here. Half a morning.'),
    ],
  },
  {
    name: 'Granada',
    region: 'Andalusia',
    blurb:
      'One monument dominates everything, and it deserves to. Below it: free tapas with every drink, and the Albaicín climbing the opposite hill.',
    nights: 2,
    restaurants: [
      r('Bodegas Castañeda', 'Tapas', 'Centro', 1, 18,
        'Free tapa with each drink, as is the Granada custom. Order the tabla de montaditos.',
        { mustGo: true }),
      r('Los Diamantes', 'Fried fish', 'Navas', 1, 20,
        'Standing-room, paper on the counter, fried seafood in baskets. Calle Navas branch is the original.',
        { mustGo: true }),
      r('Taberna La Tana', 'Wine bar', 'Realejo', 2, 25,
        'A tiny wine list done seriously — tell them what you like and trust them.'),
      r('Bar Ávila', 'Tapas', 'Centro', 1, 15,
        'Generous free tapas, locals three-deep at the bar.'),
      r('Carmela Restaurante', 'Andalusian', 'Centro', 2, 35,
        'Sit-down option when you have had enough of standing.'),
      r('Restaurante FM', 'Modern', 'Chana', 3, 60,
        'Chef Fran Martínez, no menu, whatever the market gave him.', { bookAhead: true }),
    ],
    places: [
      p('Alhambra & Generalife', 'landmark', 'must', 19,
        'BOOK 2–3 MONTHS AHEAD. Nasrid Palaces have a hard timed entry printed on your ticket — miss it and you are out. Bring the passport you booked with.',
        { ticketNeeded: true, hours: 'Daily 08:30–20:00; night visits Tue–Sat' }),
      p('Mirador de San Nicolás', 'viewpoint', 'must', 0,
        'The postcard view of the Alhambra against the Sierra Nevada. Sunset, buskers, pickpockets.'),
      p('Albaicín', 'neighbourhood', 'must', 0,
        'Whitewashed Moorish quarter of walled carmen gardens. Walk up, taxi down.'),
      p('Sacromonte & zambra flamenco', 'nightlife', 'want', 25,
        'Cave-dwelling gitano quarter; zambra is its own flamenco form. Cueva de la Rocío is the known one.',
        { ticketNeeded: true }),
      p('Capilla Real', 'landmark', 'want', 6,
        'Ferdinand and Isabella are buried here. Small, sombre, 30 minutes.'),
      p('Catedral de Granada', 'landmark', 'want', 6,
        'Renaissance, and startlingly white inside after the Alhambra.'),
      p('Hammam Al Ándalus', 'other', 'want', 45,
        'Arab baths near the cathedral. Book a slot for the evening you arrive — it fixes travel legs.',
        { ticketNeeded: true }),
      p('Sierra Nevada / Las Alpujarras (day trip)', 'daytrip', 'maybe', 35,
        'White villages up the mountain — Pampaneira, Bubión, Capileira. Needs a car.'),
    ],
  },
  {
    name: 'San Sebastián',
    region: 'Basque Country',
    blurb:
      'Arguably the best place to eat on earth per square kilometre, wrapped around a perfect shell-shaped bay. Pintxos are eaten standing, one per bar, then you move on.',
    nights: 2,
    restaurants: [
      r('Bar Nestor', 'Pintxos', 'Parte Vieja', 2, 35,
        'One tortilla at 13:00 and one at 20:00, ten wedges each — put your name down an hour before. Txuleta and tomato salad otherwise.',
        { mustGo: true }),
      r('La Cuchara de San Telmo', 'Pintxos', 'Parte Vieja', 2, 35,
        'Cooked-to-order pintxos, not counter display. Veal cheek in wine; foie.',
        { mustGo: true }),
      r('Borda Berri', 'Pintxos', 'Parte Vieja', 2, 30,
        'Risotto de Idiazábal and the beef-cheek. Ordering is a scrum; be assertive.',
        { mustGo: true }),
      r('Bar Zeruko', 'Pintxos', 'Parte Vieja', 2, 32,
        'The theatrical end — smoking cod "la hoguera" arrives on a mini brazier.'),
      r('Gandarias', 'Pintxos', 'Parte Vieja', 2, 30,
        'Solid all-rounder on Calle 31 de Agosto. Good solomillo montadito.'),
      r('Asador Etxebarri', 'Grill', 'Axpe (1 hr away)', 4, 250,
        'Everything cooked over embers of different woods. Books open a year out; regularly named among the best restaurants in the world.',
        { bookAhead: true }),
      r('Arzak', 'Basque avant-garde', 'Alto de Miracruz', 4, 260,
        'Three stars, family-run since 1897. Book 2–3 months ahead.', { bookAhead: true }),
    ],
    places: [
      p('Parte Vieja pintxos crawl', 'neighbourhood', 'must', 0,
        'The main event. One pintxo and one small drink per bar, then move. Start 20:00, work Calle 31 de Agosto.'),
      p('Playa de la Concha', 'beach', 'must', 0,
        'The bay everyone photographs. The promenade railing is a design icon.'),
      p('Monte Igueldo', 'viewpoint', 'must', 4,
        'Wooden funicular to a creaky vintage amusement park with the definitive view over the bay.',
        { ticketNeeded: true }),
      p('Peine del Viento', 'landmark', 'want', 0,
        'Chillida’s steel combs at the end of Ondarreta, with blowholes that boom in a swell.'),
      p('Monte Urgull', 'viewpoint', 'want', 0,
        'Free walk up from the old town to the fortress and the Christ statue.'),
      p('Playa de la Zurriola', 'beach', 'maybe', 0,
        'The surf beach, younger crowd, on the far side of the river.'),
      p('Getaria & Zarautz (day trip)', 'daytrip', 'maybe', 20,
        'Fishing village that grills whole turbot over coals — Elkano is the famous one. 30 min by bus.'),
    ],
  },
  {
    name: 'Valencia',
    region: 'Valencian Community',
    blurb:
      'Where paella actually comes from, plus Calatrava’s science-fiction skyline and a 9 km park in a drained riverbed. Underrated and much cheaper than Barcelona.',
    nights: 2,
    restaurants: [
      r('Casa Carmela', 'Paella', 'Malvarrosa', 3, 45,
        'Paella over orange-wood fire since 1922. Lunch only, book days ahead. Order paella valenciana — chicken and rabbit, no seafood.',
        { mustGo: true, bookAhead: true }),
      r('Casa Montaña', 'Tapas / bodega', 'El Cabanyal', 2, 35,
        'Barrel-lined 1836 bodega with a serious sherry and wine list.', { bookAhead: true }),
      r('Central Bar', 'Tapas', 'Mercado Central', 1, 20,
        'Ricard Camarena’s counter inside the market. The best cheap lunch in the city.',
        { mustGo: true }),
      r('La Pepica', 'Paella', 'Malvarrosa', 3, 45,
        'Beachfront institution; Hemingway ate here. Touristy but the rice is real.'),
      r('Horchatería Santa Catalina', 'Horchata', 'Centro', 1, 6,
        'Horchata and fartons at a tiled counter. Mid-afternoon ritual.'),
      r('Ricard Camarena Restaurant', 'Modern', 'Bombas Gens', 4, 190,
        'Two stars. Broths and vegetables as the centre of the plate.', { bookAhead: true }),
    ],
    places: [
      p('Ciudad de las Artes y las Ciencias', 'landmark', 'must', 0,
        'Free to walk around; pay only for the aquarium (Oceanogràfic, ~€35) or the science museum. Best at blue hour.'),
      p('Mercado Central', 'market', 'must', 0,
        'One of the largest fresh-food markets in Europe, under a modernista dome. Closed Sundays.'),
      p('La Lonja de la Seda', 'landmark', 'want', 2,
        'Gothic silk exchange with spiral columns. UNESCO, and empty. 30 minutes.'),
      p('Turia Gardens by bike', 'park', 'must', 12,
        'Rent a bike and ride the old riverbed from the old town to the Ciudad de las Artes.'),
      p('Barrio del Carmen', 'neighbourhood', 'want', 0,
        'Street art, medieval gates, the bars you will end up in.'),
      p('Valencia Cathedral', 'landmark', 'want', 9,
        'Holds a chalice claimed as the Holy Grail. Climb the Micalet tower.', { ticketNeeded: true }),
      p('Playa de la Malvarrosa', 'beach', 'want', 0,
        'City beach, wide and walkable, tram from the centre.'),
      p('Albufera sunset boat', 'daytrip', 'want', 15,
        'The rice-paddy lagoon the paella rice grows in. Flat-bottomed boat at sunset from El Palmar.'),
    ],
  },
  {
    name: 'Córdoba',
    region: 'Andalusia',
    blurb:
      'A one-monument city where the monument is unlike anything else in Europe. Easy stop between Madrid and Seville — 45 min by AVE.',
    nights: 1,
    restaurants: [
      r('Bodegas Campos', 'Andalusian', 'San Pedro', 3, 45,
        'Warren of patios and barrels signed by visitors. Salmorejo and oxtail.', { bookAhead: true }),
      r('Taberna Salinas', 'Traditional', 'Centro', 1, 20,
        'Since 1879, tiled and cheap. Orange-and-cod salad.', { mustGo: true }),
      r('Taberna San Miguel "El Pisto"', 'Tapas', 'Centro', 1, 20,
        'Bullfighting photos, Montilla-Moriles wine from the barrel.'),
      r('Casa Pepe de la Judería', 'Andalusian', 'Judería', 2, 40,
        'Rooftop with a Mezquita view. Go for the terrace at sunset.', { bookAhead: true }),
      r('Noor', 'Andalusí avant-garde', 'Cañero', 4, 200,
        'Two stars. Cooking reconstructed from medieval al-Andalus sources.', { bookAhead: true }),
    ],
    places: [
      p('Mezquita-Catedral', 'landmark', 'must', 13,
        'A cathedral built inside a 9th-century mosque; 850 columns. Free entry 08:30–09:30 Mon–Sat (no groups, no photos allowed then).',
        { ticketNeeded: true, hours: 'Mon–Sat 10:00–19:00, Sun 08:30–11:30 + 15:00–19:00' }),
      p('Alcázar de los Reyes Cristianos', 'landmark', 'want', 5,
        'Terraced water gardens; where Columbus pitched his voyage.', { ticketNeeded: true }),
      p('Judería & Calleja de las Flores', 'neighbourhood', 'must', 0,
        'The old Jewish quarter. Very crowded 11:00–17:00 — walk it early or after dinner.'),
      p('Roman Bridge & Calahorra Tower', 'landmark', 'want', 0,
        'Cross at dusk and look back at the Mezquita lit up.'),
      p('Palacio de Viana', 'landmark', 'want', 12,
        'Twelve patios, each different. If you visit in May, the whole city opens its patios for a festival.'),
      p('Medina Azahara', 'daytrip', 'maybe', 3,
        'Ruined 10th-century caliphal city 8 km out, sacked after 70 years. Bus from the centre.'),
    ],
  },
  {
    name: 'Bilbao',
    region: 'Basque Country',
    blurb:
      'A post-industrial city that rebuilt itself around one museum and pulled it off. Great pintxos, fewer crowds than San Sebastián.',
    nights: 2,
    restaurants: [
      r('La Viña del Ensanche', 'Pintxos', 'Abando', 2, 40,
        'Iberian ham cut to order and the best tortilla in Bilbao.', { mustGo: true }),
      r('Gure Toki', 'Pintxos', 'Casco Viejo', 2, 30,
        'On Plaza Nueva, creative pintxos that win the local competitions.', { mustGo: true }),
      r('El Globo', 'Pintxos', 'Abando', 1, 22,
        'Txangurro (spider-crab) gratin. Locals’ standby.'),
      r('Mina Restaurante', 'Modern Basque', 'Bilbao La Vieja', 3, 110,
        'One star, riverside, tasting menu only.', { bookAhead: true }),
      r('Azurmendi', 'Basque avant-garde', 'Larrabetzu (20 min)', 4, 240,
        'Three stars, and one of the greenest restaurants in the world. Book far ahead.',
        { bookAhead: true }),
    ],
    places: [
      p('Guggenheim Bilbao', 'museum', 'must', 18,
        'Gehry’s titanium building outshines most of what is in it — walk the whole exterior too. Puppy the flower dog out front.',
        { ticketNeeded: true, hours: 'Tue–Sun 10:00–19:00, closed Mon (open Mon in summer)' }),
      p('Casco Viejo & Siete Calles', 'neighbourhood', 'must', 0,
        'The seven original streets. Plaza Nueva for the pintxo circuit, Sundays for the flea market.'),
      p('Mercado de la Ribera', 'market', 'want', 0,
        'Riverside market hall, one of the biggest covered markets in Europe.'),
      p('Funicular de Artxanda', 'viewpoint', 'want', 5,
        'Three minutes up for the view over the whole valley.', { ticketNeeded: true }),
      p('Museo de Bellas Artes', 'museum', 'want', 10,
        'The better art collection in town, and nearly empty.'),
      p('San Juan de Gaztelugatxe (day trip)', 'daytrip', 'want', 0,
        'Hermitage on a rock joined by a stone bridge — 241 steps. Free but needs a timed permit in season. An hour by car.',
        { ticketNeeded: true }),
    ],
  },
  {
    name: 'Málaga',
    region: 'Andalusia',
    blurb:
      'The Costa del Sol gateway that turned into a real art city. Warm enough to swim most of the year and the best-value flights into the south.',
    nights: 2,
    restaurants: [
      r('El Pimpi', 'Andalusian', 'Centro', 2, 35,
        'Rambling bodega, barrels signed by Antonio Banderas. Touristy, still fun; sit on the terrace facing the Roman theatre.'),
      r('Antigua Casa de Guardia', 'Sweet wine', 'Centro', 1, 10,
        'Since 1840. Wine straight from the barrel, tab chalked on the wooden bar. Stand up and drink.',
        { mustGo: true }),
      r('Los Patios de Beatas', 'Wine bar', 'Centro', 2, 40,
        'Serious wine list in a restored townhouse.', { bookAhead: true }),
      r('Casa Lola', 'Tapas', 'Centro', 1, 20,
        'Vermouth and montaditos, quick and cheap.'),
      r('El Tintero', 'Fried fish', 'El Palo', 2, 25,
        'Waiters walk the terrace shouting dishes; you flag down what you want. Chaotic beach lunch.',
        { mustGo: true }),
    ],
    places: [
      p('Alcazaba & Roman Theatre', 'landmark', 'must', 5,
        'Moorish fortress stacked on a Roman theatre in the middle of town. Combined ticket with Gibralfaro.',
        { ticketNeeded: true }),
      p('Castillo de Gibralfaro', 'viewpoint', 'want', 4,
        'Walk up from the Alcazaba for the view over the bullring and port.'),
      p('Museo Picasso Málaga', 'museum', 'must', 12,
        'In his birth city, in a Renaissance palace. Strong on the later work.', { ticketNeeded: true }),
      p('Centre Pompidou Málaga', 'museum', 'maybe', 9,
        'The glass cube on the port. Small, good rotating shows.'),
      p('Playa de la Malagueta', 'beach', 'want', 0,
        'City beach; get espetos (sardines grilled on a skewer) at a chiringuito.'),
      p('Caminito del Rey (day trip)', 'daytrip', 'want', 10,
        'Walkway pinned to a gorge wall, 100 m up. Timed tickets sell out weeks ahead; one-way, book the shuttle.',
        { ticketNeeded: true }),
      p('Ronda (day trip)', 'daytrip', 'want', 25,
        'Town split by a 120 m gorge with a bridge across it. 2 hrs by train, and worth every minute.'),
    ],
  },
  {
    name: 'Toledo',
    region: 'Castilla–La Mancha',
    blurb:
      'Christian, Jewish and Muslim Spain layered on one fortified hill. Doable from Madrid in a day, but far better with a night once the coaches leave.',
    nights: 1,
    restaurants: [
      r('Alfileritos 24', 'Castilian', 'Centro', 2, 35, 'Vaulted dining rooms, modernised local cooking.'),
      r('La Abadía', 'Tapas', 'Centro', 1, 25, 'Cellar bar in an old palace. Good tasting menu for the price.'),
      r('Adolfo', 'Castilian', 'Catedral', 3, 65,
        'Partridge, venison and a famous wine cellar under a 14th-century house.', { bookAhead: true }),
    ],
    places: [
      p('Catedral Primada', 'landmark', 'must', 12,
        'One of the great Gothic cathedrals; El Greco and Caravaggio inside. Two hours.', { ticketNeeded: true }),
      p('Iglesia de Santo Tomé', 'landmark', 'must', 4,
        'Holds El Greco’s Burial of the Count of Orgaz, in the church it was painted for.'),
      p('Sinagoga del Tránsito & Museo Sefardí', 'museum', 'want', 3,
        '14th-century synagogue with Mudéjar plasterwork.'),
      p('Alcázar & Army Museum', 'museum', 'maybe', 5, 'Dominates the skyline; the museum is exhaustive.'),
      p('Mirador del Valle', 'viewpoint', 'must', 0,
        'Across the Tagus for the classic view of the whole city. Taxi up at sunset.'),
    ],
  },
];

/* ------------------------------------------------------- fully-worked demo */

/**
 * A realistic two-week loop, used by Settings → "Load sample trip" so the
 * empty app can be seen full before any data is entered.
 */
export function sampleTrip(): TripData {
  const start = addDays(todayISO(), 75);
  const base = emptyTrip();

  const plan: Array<{ lib: string; nights: number }> = [
    { lib: 'Madrid', nights: 3 },
    { lib: 'Córdoba', nights: 1 },
    { lib: 'Seville', nights: 3 },
    { lib: 'Granada', nights: 2 },
    { lib: 'Valencia', nights: 2 },
    { lib: 'Barcelona', nights: 3 },
  ];

  const data: TripData = {
    ...base,
    trip: {
      ...base.trip,
      name: 'Spain — grand loop',
      startDate: start,
      endDate: addDays(start, plan.reduce((a, s) => a + s.nights, 0)),
      budgetTotal: 7500,
      notes:
        'Two weeks, five AVE legs, no rental car. Alhambra and Sagrada Família booked before flights.',
    },
    checklist: defaultChecklist(),
  };

  let cursor = start;
  let accent = 0;
  const cityIds: string[] = [];

  for (const step of plan) {
    const lib = SPAIN_LIBRARY.find((c) => c.name === step.lib);
    if (!lib) continue;
    const id = uid();
    cityIds.push(id);
    const arrive = cursor;
    const depart = addDays(cursor, step.nights);
    data.cities.push({
      id,
      name: lib.name,
      region: lib.region,
      arrive,
      depart,
      notes: lib.blurb,
      accent: accent++ % 8,
    });

    data.stays.push({
      id: uid(),
      cityId: id,
      name: `Hotel in ${lib.name}`,
      address: '',
      checkIn: arrive,
      checkOut: depart,
      cost: step.nights * 165,
      confirmation: '',
      link: '',
      status: 'idea',
      notes: 'Placeholder — swap in the real booking.',
    });

    // Top picks only, so the sample reads as a plan rather than a directory.
    for (const lr of lib.restaurants.filter((x) => x.mustGo).slice(0, 3)) {
      data.restaurants.push({
        id: uid(),
        cityId: id,
        name: lr.name,
        cuisine: lr.cuisine,
        area: lr.area,
        priceTier: lr.priceTier,
        mustGo: true,
        reservation: lr.bookAhead ? 'todo' : 'not-needed',
        reservedAt: '',
        estCostPerPerson: lr.estCostPerPerson,
        link: '',
        notes: lr.notes,
        visited: false,
      });
    }
    for (const lp of lib.places.filter((x) => x.priority === 'must').slice(0, 4)) {
      data.places.push({
        id: uid(),
        cityId: id,
        name: lp.name,
        category: lp.category,
        priority: lp.priority,
        ticketNeeded: lp.ticketNeeded,
        ticketBooked: false,
        cost: lp.cost,
        hours: lp.hours,
        address: '',
        link: '',
        notes: lp.notes,
        done: false,
      });
    }

    cursor = depart;
  }

  // Trains between consecutive cities, plus the flights in and out.
  data.legs.push({
    id: uid(),
    mode: 'flight',
    from: 'Home',
    to: cityIds[0] ?? '',
    date: start,
    depTime: '',
    arrTime: '',
    provider: '',
    confirmation: '',
    cost: 1400,
    link: '',
    status: 'idea',
    notes: 'Return into Madrid, out of Barcelona.',
  });
  for (let i = 0; i < cityIds.length - 1; i++) {
    const to = data.cities.find((c) => c.id === cityIds[i + 1]);
    data.legs.push({
      id: uid(),
      mode: 'train',
      from: cityIds[i],
      to: cityIds[i + 1],
      date: to?.arrive ?? '',
      depTime: '10:00',
      arrTime: '12:30',
      provider: 'Renfe AVE',
      confirmation: '',
      cost: 90,
      link: 'https://www.renfe.com',
      status: 'idea',
      notes: '',
    });
  }
  data.legs.push({
    id: uid(),
    mode: 'flight',
    from: cityIds[cityIds.length - 1] ?? '',
    to: 'Home',
    date: data.trip.endDate,
    depTime: '',
    arrTime: '',
    provider: '',
    confirmation: '',
    cost: 0,
    link: '',
    status: 'idea',
    notes: 'Part of the return ticket.',
  });

  return data;
}
