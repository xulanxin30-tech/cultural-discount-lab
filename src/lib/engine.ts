import type { ComparisonRow, Decision, Metrics, Rules, SimResult } from '../types';

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
