import type { FloorId, ParkingBay, ParkingLot, SavedVehicle } from '../types/parking';

export const USER_AVATAR_URL = '/src/assets/images/user_avatar_portrait_1795607311719.jpg';

const IMG_PRESTIGE_MAIN = '/src/assets/images/prestige_garage_main_1795607309358.jpg';
const IMG_PRESTIGE_AERIAL = '/src/assets/images/prestige_garage_aerial_1795607309802.jpg';
const IMG_CENTRAL_PLAZA = '/src/assets/images/central_plaza_garage_1795607312182.jpg';
const IMG_METRO_EV = '/src/assets/images/metro_ev_parking_1795607312046.jpg';

function buildFloorBays(
  floor: FloorId,
  prefix: string,
  occupiedLabels: string[],
  evLabels: string[] = []
): ParkingBay[] {
  const occupiedSet = new Set(occupiedLabels);
  const evSet = new Set(evLabels);
  const bays: ParkingBay[] = [];

  // 5 rows, left = odd (01, 03, 05, 07, 09), right = even (02, 04, 06, 08, 10)
  for (let row = 0; row < 5; row++) {
    const leftNum = String(row * 2 + 1).padStart(2, '0');
    const rightNum = String(row * 2 + 2).padStart(2, '0');
    const leftLabel = `${prefix}-${leftNum}`;
    const rightLabel = `${prefix}-${rightNum}`;

    bays.push({
      id: `${floor}-${leftLabel}`,
      label: leftLabel,
      floor,
      side: 'left',
      rowIndex: row,
      baseOccupied: occupiedSet.has(leftLabel),
      evReady: evSet.has(leftLabel),
    });

    bays.push({
      id: `${floor}-${rightLabel}`,
      label: rightLabel,
      floor,
      side: 'right',
      rowIndex: row,
      baseOccupied: occupiedSet.has(rightLabel),
      evReady: evSet.has(rightLabel),
    });
  }

  return bays;
}

export const PARKING_LOTS: ParkingLot[] = [
  {
    id: 'prestige-parking',
    name: 'Prestige Parking',
    tagline: 'Premium, safe, and easy parking for everyone.',
    address: '123 Central Avenue, Downtown District',
    district: 'Downtown District',
    openHours: 'Open 6AM - Close 10PM',
    pricePerHour: 20,
    categories: ['car', 'bike', 'ev'],
    images: [IMG_PRESTIGE_MAIN, IMG_PRESTIGE_AERIAL, IMG_CENTRAL_PLAZA],
    description:
      'Experience premium, secure, and hassle-free parking in the heart of Downtown District. Featuring wide angled bays, bright LED guidance, license-plate gate entry, and 24/7 monitored access.',
    facilities: [
      '24/7 CCTV Security',
      'Covered Bays',
      'EV Fast Charging',
      'Elevator Access',
      'Contactless Gate',
    ],
    distanceKm: 0.4,
    rating: 4.9,
    reviewCount: 418,
    reviews: [
      {
        id: 'rev-prestige-1',
        author: 'Daniel Park',
        initials: 'DP',
        rating: 5,
        dateLabel: '2 days ago',
        comment:
          'Wide angled bays make pulling in effortless, and the contactless license-plate gate opened right away.',
      },
      {
        id: 'rev-prestige-2',
        author: 'Maya Alvarez',
        initials: 'MA',
        rating: 5,
        dateLabel: '1 week ago',
        comment:
          'Spotless lighting and clear LED signs to open bays. Charged my EV on the ground floor while at dinner.',
      },
      {
        id: 'rev-prestige-3',
        author: 'Trevor Lin',
        initials: 'TL',
        rating: 4,
        dateLabel: '2 weeks ago',
        comment:
          'Very secure and steps from Central Avenue offices. Slightly busy around 6 PM, so booking ahead helps.',
      },
    ],
    coordinates: { x: 48, y: 42 },
    position: { lat: 37.7897, lng: -122.4014 },
    // Ground: 5 open (G-02, G-03, G-06, G-07, G-10) — exact reference match!
    // 1st Floor: 4 open, 2nd Floor: 3 open => Total = 12 Space available (exact reference match!)
    floors: {
      ground: buildFloorBays(
        'ground',
        'G',
        ['G-01', 'G-04', 'G-05', 'G-08', 'G-09'],
        ['G-02', 'G-03']
      ),
      first: buildFloorBays(
        'first',
        'F1',
        ['F1-01', 'F1-02', 'F1-04', 'F1-06', 'F1-08', 'F1-09'],
        ['F1-03', 'F1-05']
      ),
      second: buildFloorBays(
        'second',
        'F2',
        ['F2-01', 'F2-02', 'F2-03', 'F2-05', 'F2-06', 'F2-08', 'F2-10'],
        ['F2-04']
      ),
    },
  },
  {
    id: 'central-plaza-garage',
    name: 'Central Plaza Garage',
    tagline: 'Sunlit multi-level deck steps from civic plazas.',
    address: '480 Market Street, Civic Center',
    district: 'Civic Center',
    openHours: 'Open 24 Hours',
    pricePerHour: 16,
    categories: ['car', 'bike', 'bus'],
    images: [IMG_CENTRAL_PLAZA, IMG_PRESTIGE_AERIAL, IMG_PRESTIGE_MAIN],
    description:
      'Spacious concrete-and-glass urban parking hub with extra-tall clearance on the ground level for vans and shuttles, plus express pedestrian exits directly onto Market Street.',
    facilities: [
      '24/7 Access',
      'High Clearance',
      'Covered Bays',
      'Wheelchair Friendly',
      'Security Patrol',
    ],
    distanceKm: 0.9,
    rating: 4.8,
    reviewCount: 294,
    reviews: [
      {
        id: 'rev-central-1',
        author: 'Hannah Brooks',
        initials: 'HB',
        rating: 5,
        dateLabel: '3 days ago',
        comment:
          'Open 24/7 with generous ceiling clearance on the ground deck. My SUV fit with plenty of room to spare.',
      },
      {
        id: 'rev-central-2',
        author: 'Omar Siddiqui',
        initials: 'OS',
        rating: 5,
        dateLabel: '6 days ago',
        comment:
          'Great value for Civic Center and the Market Street pedestrian exit saved us a five-minute walk.',
      },
      {
        id: 'rev-central-3',
        author: 'Claire Sato',
        initials: 'CS',
        rating: 4,
        dateLabel: '3 weeks ago',
        comment:
          'Clean ramps and visible security patrol at night. Upper levels are quieter if you want extra door space.',
      },
    ],
    coordinates: { x: 26, y: 31 },
    position: { lat: 37.7852, lng: -122.4089 },
    floors: {
      ground: buildFloorBays('ground', 'G', ['G-02', 'G-05', 'G-07', 'G-08']),
      first: buildFloorBays('first', 'F1', ['F1-01', 'F1-03', 'F1-04', 'F1-07', 'F1-10']),
      second: buildFloorBays('second', 'F2', ['F2-02', 'F2-04', 'F2-06', 'F2-08', 'F2-09']),
    },
  },
  {
    id: 'metro-green-ev',
    name: 'Metro Green EV Hub',
    tagline: 'Dedicated EV chargers and sheltered bike bays.',
    address: '88 Parkview Blvd, Tech Quarter',
    district: 'Tech Quarter',
    openHours: 'Open 5AM - Close 11PM',
    pricePerHour: 18,
    categories: ['car', 'bike', 'ev'],
    images: [IMG_METRO_EV, IMG_PRESTIGE_MAIN, IMG_PRESTIGE_AERIAL],
    description:
      'Smart indoor parking facility purpose-built for electric vehicles and daily two-wheel commuters. Every EV bay delivers up to 22kW AC charging with real-time bay guidance.',
    facilities: [
      '22kW EV Chargers',
      'Sheltered Bike Zone',
      'Smart LED Guidance',
      '24/7 CCTV Security',
      'Restrooms',
    ],
    distanceKm: 1.2,
    rating: 4.9,
    reviewCount: 216,
    reviews: [
      {
        id: 'rev-metro-1',
        author: 'Priya Nair',
        initials: 'PN',
        rating: 5,
        dateLabel: '1 day ago',
        comment:
          'Every ground-floor EV charger worked on the first try and delivered steady 22kW charging during my workday.',
      },
      {
        id: 'rev-metro-2',
        author: 'Lucas Meyer',
        initials: 'LM',
        rating: 5,
        dateLabel: '5 days ago',
        comment:
          'Best sheltered bike area in the Tech Quarter. Well-lit, dry during rain, and super easy check-in.',
      },
      {
        id: 'rev-metro-3',
        author: 'Elena Ross',
        initials: 'ER',
        rating: 4,
        dateLabel: '2 weeks ago',
        comment:
          'Modern layout with accurate open-bay indicators. Wish it stayed open past 11 PM on weekends.',
      },
    ],
    coordinates: { x: 74, y: 35 },
    position: { lat: 37.7924, lng: -122.3948 },
    floors: {
      ground: buildFloorBays(
        'ground',
        'G',
        ['G-01', 'G-03', 'G-06', 'G-09'],
        ['G-02', 'G-04', 'G-05', 'G-07', 'G-08', 'G-10']
      ),
      first: buildFloorBays(
        'first',
        'F1',
        ['F1-02', 'F1-05', 'F1-06', 'F1-08', 'F1-09'],
        ['F1-01', 'F1-03', 'F1-04']
      ),
      second: buildFloorBays('second', 'F2', ['F2-01', 'F2-04', 'F2-05', 'F2-07', 'F2-08', 'F2-10']),
    },
  },
  {
    id: 'grand-transit-deck',
    name: 'Grand Transit Deck',
    tagline: 'Wide commercial bays and coach-ready terminal.',
    address: '210 Union Station Way, Midtown',
    district: 'Midtown',
    openHours: 'Open 6AM - Close 12AM',
    pricePerHour: 40,
    categories: ['car', 'bus', 'ev'],
    images: [IMG_PRESTIGE_AERIAL, IMG_CENTRAL_PLAZA, IMG_PRESTIGE_MAIN],
    description:
      'Executive valet-grade parking adjacent to Union Station with dedicated bus & coach lanes, oversized SUV bays, luggage assistance, and rapid highway ramp exits.',
    facilities: [
      'Coach & Bus Lanes',
      'Valet Assistance',
      '24/7 CCTV Security',
      'EV Fast Charging',
      'Express Exit',
    ],
    distanceKm: 1.6,
    rating: 4.7,
    reviewCount: 163,
    reviews: [
      {
        id: 'rev-grand-1',
        author: 'Victor Chen',
        initials: 'VC',
        rating: 5,
        dateLabel: '4 days ago',
        comment:
          'Right next to Union Station with fast highway exit lanes. Staff helped load luggage smoothly.',
      },
      {
        id: 'rev-grand-2',
        author: 'Nadia Kowalski',
        initials: 'NK',
        rating: 5,
        dateLabel: '1 week ago',
        comment:
          'Wide oversized spaces and zero hassle getting our shuttle van in and out during morning rush.',
      },
      {
        id: 'rev-grand-3',
        author: 'Samir Patel',
        initials: 'SP',
        rating: 4,
        dateLabel: '3 weeks ago',
        comment:
          'Pricier per hour than nearby lots, but unbeatable convenience when catching an early train.',
      },
    ],
    coordinates: { x: 64, y: 68 },
    position: { lat: 37.7844, lng: -122.3976 },
    floors: {
      ground: buildFloorBays('ground', 'G', ['G-01', 'G-02', 'G-05', 'G-08', 'G-09', 'G-10']),
      first: buildFloorBays('first', 'F1', ['F1-01', 'F1-04', 'F1-07', 'F1-08']),
      second: buildFloorBays('second', 'F2', ['F2-02', 'F2-03', 'F2-06', 'F2-09', 'F2-10']),
    },
  },
  {
    id: 'westside-bike-ride',
    name: 'Westside Bike & Ride',
    tagline: 'Affordable commuter parking for bikes and compacts.',
    address: '15 Oakridge Lane, Arts District',
    district: 'Arts District',
    openHours: 'Open 6AM - Close 10PM',
    pricePerHour: 10,
    categories: ['bike', 'car'],
    images: [IMG_METRO_EV, IMG_CENTRAL_PLAZA, IMG_PRESTIGE_AERIAL],
    description:
      'Friendly neighborhood covered garage featuring helmet lockers, ground-level motorcycle bays, and compact car spaces right off Oakridge Promenade.',
    facilities: [
      'Helmet Lockers',
      'Covered Bays',
      '24/7 CCTV Security',
      'Bike Repair Stand',
    ],
    distanceKm: 1.9,
    rating: 4.8,
    reviewCount: 129,
    reviews: [
      {
        id: 'rev-westside-1',
        author: 'Chloe Bennett',
        initials: 'CB',
        rating: 5,
        dateLabel: '2 days ago',
        comment:
          'Built-in helmet lockers and affordable hourly rates make this my go-to stop in the Arts District.',
      },
      {
        id: 'rev-westside-2',
        author: 'Mateo Ruiz',
        initials: 'MR',
        rating: 5,
        dateLabel: '1 week ago',
        comment:
          'Compact car spaces are neatly marked and covered from the sun. Even has a handy bike repair stand.',
      },
      {
        id: 'rev-westside-3',
        author: 'Grace Kim',
        initials: 'GK',
        rating: 4,
        dateLabel: '2 weeks ago',
        comment:
          'Quiet neighborhood garage with friendly entry signage. Best suited for motorcycles and smaller cars.',
      },
    ],
    coordinates: { x: 24, y: 66 },
    position: { lat: 37.7819, lng: -122.4046 },
    floors: {
      ground: buildFloorBays('ground', 'G', ['G-04', 'G-06', 'G-09']),
      first: buildFloorBays('first', 'F1', ['F1-02', 'F1-05', 'F1-08', 'F1-09']),
      second: buildFloorBays('second', 'F2', ['F2-01', 'F2-03', 'F2-06', 'F2-07', 'F2-10']),
    },
  },
];

export const INITIAL_VEHICLES: SavedVehicle[] = [
  {
    id: 'veh-1',
    label: 'Polestar 2 · White',
    plate: 'CA-8KLP24',
    category: 'car',
  },
  {
    id: 'veh-2',
    label: 'Vespa Primavera',
    plate: 'MC-4092',
    category: 'bike',
  },
];
