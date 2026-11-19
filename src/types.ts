export interface Effects {
  discount?: number;
  reach?: number;
  credibility?: number;
  community?: number;
  tourism?: number;
  budget?: number;
  risk?: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  effects: Effects;
}

export interface Decision {
  id: string;
  stage: string;
  title: string;
  question: string;
  theory: string[];
  options: DecisionOption[];
  recommended: string;
  paperEvidence: string;
  source: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  year: number;
  stage: string;
  shows: number;
  attendance: number;
  boxOfficeUsdM: number;
  occupancy: number;
  tourismCnyM: number;
  youtubeViewsM: number;
  source: 'paper' | 'illustrative';
  note: string;
}

export interface TimePoint {
  year: number;
  youtubeViewsM: number;
  followersM: number;
  boxOfficeUsdM: number;
  discountIndex: number;
  event: string;
  source: string;
}

export interface Theory {
  id: string;
  name: string;
  english: string;
  scholar: string;
  definition: string;
  paperRef: string;
}

export interface Mapping {
  decision: string;
  theories: string[];
  rule: string;
  formula: string;
}

export interface TheoryMapData {
  theories: Theory[];
  mappings: Mapping[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  title: string;
  detail: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Rules {
  constants: Record<string, number>;
  formula: Record<string, string>;
  paths: Record<string, { label: string; choices: Record<string, string> }>;
}

export interface Metrics {
  discount: number;
  reach: number;
  credibility: number;
  community: number;
  tourism: number;
  budgetUsed: number;
  risk: number;
}

export interface CurvePoint {
  step: number;
  label: string;
  discount: number;
}

export interface SimResult {
  metrics: Metrics;
  curve: CurvePoint[];
  successScore: number;
  predictedViewsM: number;
  predictedAudience: number;
  predictedBoxOfficeUsdM: number;
  predictedTourismCnyM: number;
  overBudget: number;
  overRisk: number;
}

export interface ComparisonRow extends SimResult {
  label: string;
  choices: Record<string, string>;
}
