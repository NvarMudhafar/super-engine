export type ID = string;

/** ISO date, `YYYY-MM-DD`. */
export type DateStr = string;

export type BookingStatus = 'idea' | 'booked' | 'paid';

export type ReservationStatus = 'not-needed' | 'todo' | 'requested' | 'confirmed';

export type Priority = 'must' | 'want' | 'maybe';

export type PlaceCategory =
  | 'museum'
  | 'landmark'
  | 'neighbourhood'
  | 'park'
  | 'beach'
  | 'viewpoint'
  | 'market'
  | 'shopping'
  | 'nightlife'
  | 'daytrip'
  | 'other';

export type TransportMode = 'train' | 'flight' | 'bus' | 'car' | 'ferry' | 'other';

export type BudgetCategory =
  | 'Lodging'
  | 'Transport'
  | 'Food'
  | 'Activities'
  | 'Shopping'
  | 'Other';

export interface Trip {
  name: string;
  startDate: DateStr;
  endDate: DateStr;
  travelers: number;
  /** Currency everything is entered in. */
  currency: string;
  /** Optional second currency for a converted read-out on the budget page. */
  homeCurrency: string;
  /** 1 unit of `currency` = `fxRate` units of `homeCurrency`. 0 disables it. */
  fxRate: number;
  budgetTotal: number;
  notes: string;
}

export interface City {
  id: ID;
  name: string;
  region: string;
  arrive: DateStr;
  depart: DateStr;
  notes: string;
  /** Index into the accent palette, for the city's colour chip. */
  accent: number;
}

export interface Stay {
  id: ID;
  cityId: ID;
  name: string;
  address: string;
  checkIn: DateStr;
  checkOut: DateStr;
  /** Total for the whole stay, for the whole party. */
  cost: number;
  confirmation: string;
  link: string;
  status: BookingStatus;
  notes: string;
}

export interface Restaurant {
  id: ID;
  cityId: ID;
  name: string;
  cuisine: string;
  area: string;
  /** 1–4, read as €–€€€€. */
  priceTier: number;
  mustGo: boolean;
  reservation: ReservationStatus;
  /** Local datetime, `YYYY-MM-DDTHH:mm`. Empty when unscheduled. */
  reservedAt: string;
  /** Estimate per person. */
  estCostPerPerson: number;
  link: string;
  notes: string;
  visited: boolean;
}

export interface Place {
  id: ID;
  cityId: ID;
  name: string;
  category: PlaceCategory;
  priority: Priority;
  ticketNeeded: boolean;
  ticketBooked: boolean;
  /** Total for the whole party. */
  cost: number;
  hours: string;
  address: string;
  link: string;
  notes: string;
  done: boolean;
}

export interface Leg {
  id: ID;
  mode: TransportMode;
  /** City id, or a free-text label for anywhere that isn't a trip city. */
  from: string;
  to: string;
  date: DateStr;
  depTime: string;
  arrTime: string;
  provider: string;
  confirmation: string;
  cost: number;
  link: string;
  status: BookingStatus;
  notes: string;
}

export interface Expense {
  id: ID;
  label: string;
  category: BudgetCategory;
  cityId: ID | '';
  amount: number;
  date: DateStr;
  paid: boolean;
  notes: string;
}

export interface ChecklistItem {
  id: ID;
  label: string;
  group: string;
  done: boolean;
}

/** One entry on a day of the itinerary. */
export interface Block {
  id: ID;
  date: DateStr;
  time: string;
  label: string;
  /** Set when the block was created from a saved place or restaurant. */
  refType?: 'place' | 'restaurant';
  refId?: ID;
  note: string;
}

export interface TripData {
  version: number;
  trip: Trip;
  cities: City[];
  stays: Stay[];
  restaurants: Restaurant[];
  places: Place[];
  legs: Leg[];
  expenses: Expense[];
  checklist: ChecklistItem[];
  blocks: Block[];
}

export type ViewId =
  | 'overview'
  | 'cities'
  | 'itinerary'
  | 'transport'
  | 'budget'
  | 'checklist'
  | 'library'
  | 'settings';
