// TypeScript interfaces for Career Simulation feature

export interface CareerSimulation {
  id: string;
  timeHorizon: 5 | 10 | 15;
  pathName: string;
  confidence: number;
  outcome: CareerOutcome;
  stats: CareerStats;
  timeline: {
    milestones: TimelineNode[];
  };
  globalComparison: GlobalComparison;
  zoomIns: ZoomIns;
  societalImpact: SocietalImpact;
  alternatePaths: AlternatePath[];
}

export interface CareerOutcome {
  title: string;
  company: string;
  totalComp: number;
  location: string;
  satisfaction: number; // 0-5 stars
}

export interface CareerStats {
  compensation: {
    base: number;
    equity: number;
  };
  growth: {
    promotions: number;
    yearsToSenior: number;
    teamSize: number;
  };
  workLife: {
    hoursPerWeek: number;
    burnoutRisk: 'Low' | 'Medium' | 'High';
    flexibility: 'Low' | 'Medium' | 'High';
  };
  skills: {
    technical: string;
    leadership: string;
    expertise: string;
  };
}

export interface TimelineNode {
  year: number;
  title: string;
  company: string;
  salary: number;
  description?: string;
}

export interface Tradeoffs {
  pros: string[];
  cons: string[];
}

export interface Assumption {
  text: string;
  likelihood: number; // 0-100
  icon: '✓' | '⚠️' | '❌';
}

export interface GlobalComparison {
  income: {
    yourComp: number;
    globalPercentile: number;
    globalAverage: number;
    usAverage: number;
    topEarners: { range: string; group: string };
    developingMarkets: { min: number; max: number };
  };
  careerProgression: {
    yourLevel: string;
    globalPercentile: number;
    mostCommon: string;
    fastest: string;
    many: string;
  };
  workLife: {
    yourHours: number;
    globalPercentile: number;
    range: { min: number; minLabel: string; max: number; maxLabel: string };
    bestBalance: string;
    worstBalance: string;
  };
  equity: {
    yourEquity: number;
    globalPercentile: number;
    mostEngineers: string;
    lotteryWinners: { range: string; percentage: number };
    note: string;
  };
  geographic: {
    northAmerica: number;
    europe: number;
    asia: number;
    latinAmerica: number;
    note: string;
  };
  globalReality: string;
}

export interface RegretMoment {
  year: number;
  title: string;
  description: string;
}

export interface ZoomIns {
  regretMoments: RegretMoment[];
  reflection: string;
  cards: Array<{ id: string; title: string; icon: string }>;
  randomTuesday: RandomTuesdayData;
  theEmail: EmailData;
  calendar: CalendarData;
  teamFeedback: FeedbackData;
  inbox: InboxData;
}

export interface SocietalImpact {
  productsShipped: string[];
  peopleInfluenced: string[];
  industryContributions: string[];
  rippleEffect: string;
  honestAssessment: string;
}

export interface RandomTuesdayData {
  date: string;
  notifications: Notification[];
  timeline: TimelineActivity[];
  stats: {
    decisionsMade: number;
    imposterSyndromeMoments: number;
  };
}

export interface Notification {
  app: string;
  icon: string;
  title: string;
  body: string;
  time: string;
}

export interface TimelineActivity {
  time: string;
  icon: string;
  title: string;
  description: string;
}

export interface EmailData {
  from: string;
  to: string;
  subject: string;
  timestamp: string;
  body: string;
  metadata: {
    folder: string;
    timesOpened: number;
    lastUpdate: string;
  };
}

export interface CalendarData {
  current: CalendarView;
  future: CalendarView;
  stats: {
    meetingsPerWeek: { current: number; future: number };
    stressLevel: { current: string; future: string };
    controlLevel: { current: string; future: string };
    lastOpenedFigma: { current: string; future: string };
  };
}

export interface CalendarView {
  year: number;
  events: CalendarEvent[];
}

export interface CalendarEvent {
  day: string;
  time: string;
  title: string;
  color: string;
  duration: number; // minutes
}

export interface FeedbackData {
  messages: SlackMessage[];
  finalMessage: string;
}

export interface SlackMessage {
  author: string;
  avatar: string;
  timestamp: string;
  message: string;
  reactions: { emoji: string; count: number }[];
}

export interface InboxData {
  current: InboxView;
  future: InboxView;
  stats: {
    responseTime: { current: string; future: string };
    stressLevel: { current: string; future: string };
  };
}

export interface InboxView {
  year: number;
  emails: InboxEmail[];
  filteredCount?: number;
}

export interface InboxEmail {
  sender: string;
  subject: string;
  time: string;
  unread: boolean;
  important?: boolean;
}

export interface AlternatePath {
  id: string;
  label: string;
}

export interface SetupFormData {
  currentRole: string;
  company: string;
  salary: string;
  timeHorizon: 5 | 10 | 15;
}
