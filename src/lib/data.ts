import type { City, Decision, GraphData, Rules, TheoryMapData, TimePoint } from '../types';

const BASE = import.meta.env.BASE_URL || './';

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(`${BASE}data/${file}`);
  if (!response.ok) {
    throw new Error(`无法加载数据文件 ${file}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const loadCities = () => fetchJson<{ metadata: Record<string, unknown>; cities: City[] }>('cities.json');
export const loadTimeSeries = () => fetchJson<{ metadata: Record<string, unknown>; series: TimePoint[] }>('timeseries.json');
export const loadDecisions = () => fetchJson<{ metadata: Record<string, unknown>; decisions: Decision[] }>('decisions.json');
export const loadTheoryMap = () => fetchJson<TheoryMapData>('theory-map.json');
export const loadGraph = () => fetchJson<GraphData>('graph.json');
export const loadRules = () => fetchJson<Rules>('simulation-rules.json');
