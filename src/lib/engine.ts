import type { ComparisonRow, Decision, DecisionOption, Metrics, Rules, SimResult } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * 策略模拟引擎（前端版）
 * 与 server/main.py 中的 simulate() 保持同一套公式，便于静态部署与 API 部署双模式。
 */
export function runSimulation(
  choices: Record<string, string>,
  decisions: Decision[],
  rules: Rules,
): SimResult {
  const c = rules.constants;
  const metrics: Metrics = {
    discount: c.initialDiscount,
    reach: c.initialReach,
    credibility: c.initialCredibility,
    community: c.initialCommunity,
    tourism: c.initialTourism,
    budgetUsed: 0,
    risk: c.initialRisk,
  };

  const curve = [{ step: 0, label: '起点', discount: metrics.discount }];

  decisions.forEach((decision, index) => {
    const choiceId = choices[decision.id] ?? decision.options[0].id;
    const option = decision.options.find((item) => item.id === choiceId) ?? decision.options[0];
    const e = option.effects;

    metrics.discount = clamp(metrics.discount + (e.discount ?? 0), 0.05, 0.95);
    metrics.reach = clamp(metrics.reach + (e.reach ?? 0), 0, 1);
    metrics.credibility = clamp(metrics.credibility + (e.credibility ?? 0), 0, 1);
    metrics.community = clamp(metrics.community + (e.community ?? 0), 0, 1);
    metrics.tourism = clamp(metrics.tourism + (e.tourism ?? 0), 0, 1);
    metrics.budgetUsed += e.budget ?? 0;
    metrics.risk = clamp(metrics.risk + (e.risk ?? 0), 0, 1);

    curve.push({
      step: index + 1,
      label: `${index + 1}. ${decision.title}`,
      discount: Number(metrics.discount.toFixed(4)),
    });
  });

  const overBudget = Math.max(0, metrics.budgetUsed - c.budgetCap);
  const overRisk = Math.max(0, metrics.risk - 0.25);

  const successScore = Math.round(
    100 *
      (0.35 * (1 - metrics.discount) +
        0.25 * metrics.reach +
        0.2 * metrics.credibility +
        0.12 * metrics.community +
        0.08 * metrics.tourism) -
      12 * overBudget -
      8 * overRisk,
  );

  return {
    metrics,
    curve,
    successScore,
    predictedViewsM: Math.round(c.baselineViewsM * (0.35 + 0.65 * metrics.reach) * (1.25 - metrics.discount)),
    predictedAudience: Math.round(c.baselineAudience * (0.3 + 0.7 * metrics.reach) * (1.2 - metrics.discount)),
    predictedBoxOfficeUsdM: Math.round(c.baselineBoxOfficeUsdM * (0.25 + 0.75 * metrics.tourism) * (1.15 - metrics.discount)),
    predictedTourismCnyM: Math.round(c.baselineTourismCnyM * metrics.tourism),
    overBudget,
    overRisk,
  };
}

export function comparePaths(decisions: Decision[], rules: Rules): ComparisonRow[] {
  return Object.entries(rules.paths).map(([key, path]) => ({
    label: path.label,
    choices: path.choices,
    ...runSimulation(path.choices, decisions, rules),
  }));
}

export function defaultChoices(decisions: Decision[], rules: Rules): Record<string, string> {
  const paperPath = rules.paths.paper?.choices ?? {};
  return Object.fromEntries(decisions.map((d) => [d.id, paperPath[d.id] ?? d.options[0].id]));
}

export const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/* ------------------------------------------------------------------ *
 * 曝光量 / 粉丝增长预测
 * ------------------------------------------------------------------ */

export interface OptionImpact {
  optionId: string;
  label: string;
  exposureDeltaM: number;
  followersDeltaM: number;
  score: number;
}

export interface PredictionPoint {
  step: number;
  label: string;
  shortLabel: string;
  stage: string;
  chosenLabel: string;
  exposureDeltaM: number;
  followersDeltaM: number;
  exposureM: number;
  followersM: number;
}

export interface PredictionResult {
  points: PredictionPoint[];
  finalExposureM: number;
  finalFollowersM: number;
}

export interface StageRow {
  stage: string;
  decisions: number;
  options: string[];
  exposureM: number;
  followersM: number;
}

/** 不同阶段对曝光/粉丝的放大系数不同，体现「差异化分析」。 */
const STAGE_PROFILE: Record<string, { exposure: number; followers: number }> = {
  品牌地基: { exposure: 3, followers: 0.3 },
  内地破圈: { exposure: 10, followers: 1.4 },
  东南亚深耕: { exposure: 6, followers: 0.7 },
  欧美试水: { exposure: 8, followers: 0.9 },
  拉美本地化: { exposure: 7, followers: 0.8 },
  全球扩张: { exposure: 12, followers: 1.5 },
  技术展望: { exposure: 5, followers: 0.5 },
};

const STAGE_ORDER = Object.keys(STAGE_PROFILE);

/** 把一个选项的效果换算为曝光量（百万次）与粉丝增量（百万人）。 */
export function optionImpact(decision: Decision, option: DecisionOption): OptionImpact {
  const profile = STAGE_PROFILE[decision.stage] ?? { exposure: 8, followers: 0.6 };
  const e = option.effects;
  const score =
    0.5 +
    4 * (e.reach ?? 0) +
    2.5 * (e.credibility ?? 0) +
    3 * Math.max(0, -(e.discount ?? 0)) +
    2 * (e.community ?? 0) +
    1.5 * (e.tourism ?? 0) -
    1.5 * Math.max(0, e.risk ?? 0) -
    0.5 * (e.budget ?? 0);

  return {
    optionId: option.id,
    label: option.label,
    exposureDeltaM: Math.max(1, Math.round(profile.exposure * score)),
    followersDeltaM: Math.max(0.01, Math.round(profile.followers * score * 100) / 100),
    score: Number(score.toFixed(3)),
  };
}

/** 按决策顺序累计曝光量与粉丝量。 */
export function predictTrajectory(choices: Record<string, string>, decisions: Decision[], rules: Rules): PredictionResult {
  let exposureM = rules.constants.initialExposureM ?? 180;
  let followersM = rules.constants.initialFollowersM ?? 25;
  const points: PredictionPoint[] = [];

  decisions.forEach((decision, index) => {
    const choiceId = choices[decision.id] ?? decision.options[0].id;
    const option = decision.options.find((item) => item.id === choiceId) ?? decision.options[0];
    const impact = optionImpact(decision, option);
    exposureM += impact.exposureDeltaM;
    followersM += impact.followersDeltaM;
    points.push({
      step: index + 1,
      label: `${index + 1}. ${decision.title}`,
      shortLabel: `${index + 1}`,
      stage: decision.stage,
      chosenLabel: option.label,
      exposureDeltaM: impact.exposureDeltaM,
      followersDeltaM: impact.followersDeltaM,
      exposureM: Math.round(exposureM),
      followersM: Math.round(followersM * 10) / 10,
    });
  });

  return {
    points,
    finalExposureM: Math.round(exposureM),
    finalFollowersM: Math.round(followersM * 10) / 10,
  };
}

/** 按阶段汇总，当前策略与论文路径可并排对比。 */
export function stageAnalysis(decisions: Decision[], choices: Record<string, string>): StageRow[] {
  const buckets = new Map<string, StageRow>();
  decisions.forEach((decision) => {
    const choiceId = choices[decision.id] ?? decision.options[0].id;
    const option = decision.options.find((item) => item.id === choiceId) ?? decision.options[0];
    const impact = optionImpact(decision, option);
    const row = buckets.get(decision.stage) ?? {
      stage: decision.stage,
      decisions: 0,
      options: [],
      exposureM: 0,
      followersM: 0,
    };
    row.decisions += 1;
    row.options.push(`${decision.title}：${option.label}`);
    row.exposureM += impact.exposureDeltaM;
    row.followersM = Math.round((row.followersM + impact.followersDeltaM) * 100) / 100;
    buckets.set(decision.stage, row);
  });
  return STAGE_ORDER.filter((stage) => buckets.has(stage)).map((stage) => buckets.get(stage)!);
}

export function comparePredictions(decisions: Decision[], rules: Rules) {
  return Object.entries(rules.paths).map(([key, path]) => ({
    label: path.label,
    choices: path.choices,
    ...predictTrajectory(path.choices, decisions, rules),
  }));
}
