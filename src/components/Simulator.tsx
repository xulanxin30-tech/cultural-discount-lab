import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { loadDecisions, loadRules, loadTheoryMap } from '../lib/data';
import { comparePaths, defaultChoices, percent, runSimulation } from '../lib/engine';
import type { Decision, Rules, TheoryMapData } from '../types';

export default function Simulator() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [theoryMap, setTheoryMap] = useState<TheoryMapData | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const curveEl = useRef<HTMLDivElement | null>(null);
  const curveChart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    Promise.all([loadDecisions(), loadRules(), loadTheoryMap()])
      .then(([decisionData, ruleData, theoryData]) => {
        setDecisions(decisionData.decisions);
        setRules(ruleData);
        setTheoryMap(theoryData);
        setChoices(defaultChoices(decisionData.decisions, ruleData));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!curveEl.current) return;
    curveChart.current = echarts.init(curveEl.current);
    const resize = () => curveChart.current?.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      curveChart.current?.dispose();
    };
  }, []);

  const result = useMemo(
    () => (rules && decisions.length ? runSimulation(choices, decisions, rules) : null),
    [choices, decisions, rules],
  );

  const comparisons = useMemo(
    () => (rules && decisions.length ? comparePaths(decisions, rules) : []),
    [decisions, rules],
  );

  useEffect(() => {
    if (!result || !curveChart.current) return;
    curveChart.current.setOption(
      {
        animationDuration: 450,
        tooltip: {
          trigger: 'axis',
          formatter: (params: unknown) => {
            const list = params as { axisValue: string; value: number }[];
            const item = list[0];
            return `${item.axisValue}<br/>文化折扣：${percent(item.value)}`;
          },
        },
        grid: { left: 52, right: 24, top: 30, bottom: 92 },
        xAxis: {
          type: 'category',
          data: result.curve.map((p) => (p.label.length > 13 ? `${p.label.slice(0, 13)}…` : p.label)),
          axisLabel: { rotate: 38, fontSize: 10, color: '#6b7280' },
          axisLine: { lineStyle: { color: '#c9d0da' } },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 1,
          axisLabel: { formatter: (value: number) => `${Math.round(value * 100)}%` },
          splitLine: { lineStyle: { color: '#eef1f6' } },
        },
        series: [
          {
            name: '文化折扣指数',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            data: result.curve.map((p) => p.discount),
            itemStyle: { color: '#c0392b' },
            areaStyle: { color: 'rgba(192,57,43,0.10)' },
            markLine: {
              silent: true,
              symbol: 'none',
              label: { formatter: '目标 30%', fontSize: 11 },
              lineStyle: { color: '#2e8b57', type: 'dashed' },
              data: [{ yAxis: 0.3 }],
            },
          },
        ],
      },
      true,
    );
  }, [result]);

  if (loading) return <div className="panel loading">正在加载决策节点与模拟规则…</div>;
  if (error || !rules || !result) return <div className="panel error">数据加载失败：{error}</div>;

  const current = decisions[Math.min(step, decisions.length - 1)];
  const isFinished = step >= decisions.length;
  const chosenOption = current?.options.find((o) => o.id === choices[current.id]);
  const theoryNames = current?.theory
    .map((id) => theoryMap?.theories.find((t) => t.id === id)?.name ?? id)
    .join(' · ');

  const applyPath = (key: string) => {
    const path = rules.paths[key];
    if (!path) return;
    setChoices({ ...path.choices });
    setStep(decisions.length);
  };

  const rows = [
    ...comparisons,
    {
      label: '你的策略',
      choices,
      ...result,
    },
  ];

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">策略模拟器 · 15 个决策节点</h2>
            <p className="panel-sub">每个选项都是一组参数改动。做选择，看文化折扣指数如何实时变化。</p>
          </div>
          <span className="badge">当前第 {Math.min(step + 1, decisions.length)} / {decisions.length} 步</span>
        </div>

        <div className="progress-line"><div style={{ width: `${(Math.min(step, decisions.length) / decisions.length) * 100}%` }} /></div>

        <div className="decision-layout">
          <div>
            {isFinished ? (
              <div className="decision-card">
                <span className="stage-tag">模拟完成</span>
                <h3>所有决策已做出</h3>
                <p className="question">综合得分 <b style={{ color: '#c0392b', fontSize: 28 }}>{result.successScore}</b> / 100。下方曲线与对比表已更新。</p>
                <div className="button-row">
                  <button className="btn primary" onClick={() => setStep(0)}>从头调整</button>
                  <button className="btn" onClick={() => applyPath('paper')}>复刻论文路径</button>
                </div>
              </div>
            ) : (
              <div className="decision-card">
                <span className="stage-tag">{current.stage}</span>
                <h3>{current.title}</h3>
                <p className="question">{current.question}</p>
                <div>
                  {current.theory.map((id) => (
                    <span className="theory-tag" key={id}>{theoryMap?.theories.find((t) => t.id === id)?.name ?? id}</span>
                  ))}
                </div>

                <div className="option-list">
                  {current.options.map((option) => {
                    const selected = choices[current.id] === option.id;
                    const e = option.effects;
                    const deltas = [
                      e.discount ? `折扣 ${e.discount > 0 ? '+' : ''}${(e.discount * 100).toFixed(0)}%` : '',
                      e.reach ? `触达 +${(e.reach * 100).toFixed(0)}%` : '',
                      e.credibility ? `可信 +${(e.credibility * 100).toFixed(0)}%` : '',
                      e.community ? `社群 +${(e.community * 100).toFixed(0)}%` : '',
                      e.tourism ? `文旅 +${(e.tourism * 100).toFixed(0)}%` : '',
                      e.budget ? `预算 ${(e.budget * 100).toFixed(0)}%` : '',
                    ].filter(Boolean).join(' · ');
                    return (
                      <button
                        key={option.id}
                        className={selected ? 'option selected' : 'option'}
                        onClick={() => setChoices({ ...choices, [current.id]: option.id })}
                      >
                        <strong>{option.label}{selected ? ' ✓' : ''}</strong>
                        <span>{option.description}</span>
                        <span className="effects">{deltas}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="button-row">
                  <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button>
                  <button className="btn primary" onClick={() => setStep(step + 1)}>{step === decisions.length - 1 ? '查看结果' : '下一步'}</button>
                  <button className="btn" onClick={() => setChoices({ ...choices, [current.id]: current.recommended })}>采用论文选择</button>
                </div>
                <p className="panel-sub" style={{ marginTop: 12 }}>论文依据：{current.paperEvidence}</p>
              </div>
            )}

            <div className="panel" style={{ marginTop: 18, boxShadow: 'none' }}>
              <div className="panel-head">
                <div>
                  <h3 className="panel-title">文化折扣实时曲线</h3>
                  <p className="panel-sub">起点 78%，目标 30%；曲线随每一步选择即时重算。</p>
                </div>
                <span className="badge warn">理论映射：{theoryNames}</span>
              </div>
              <div className="chart-box" ref={curveEl} />
              <p className="panel-sub">
                当前选择：{chosenOption?.label ?? '未选择'} · 折扣 {percent(result.metrics.discount)} ·
                预算使用 {(result.metrics.budgetUsed * 100).toFixed(0)}%
                {result.overBudget > 0 ? ` · 超预算 ${(result.overBudget * 100).toFixed(0)}%` : ''}
                {result.overRisk > 0 ? ` · 风险偏高 ${(result.overRisk * 100).toFixed(0)}%` : ''}
              </p>
            </div>
          </div>

          <aside className="side-stack">
            <div className="panel" style={{ boxShadow: 'none' }}>
              <h3 className="panel-title">当前状态</h3>
              <div className="metric-grid">
                <div className="metric"><div className="k">文化折扣</div><div className="v">{percent(result.metrics.discount)}</div></div>
                <div className="metric"><div className="k">圈层触达</div><div className="v">{percent(result.metrics.reach)}</div></div>
                <div className="metric"><div className="k">公信力</div><div className="v">{percent(result.metrics.credibility)}</div></div>
                <div className="metric"><div className="k">社群粘性</div><div className="v">{percent(result.metrics.community)}</div></div>
                <div className="metric"><div className="k">文旅溢出</div><div className="v">{percent(result.metrics.tourism)}</div></div>
                <div className="metric"><div className="k">综合得分</div><div className="v">{result.successScore}</div></div>
              </div>
              <div className="button-row">
                <button className="btn" onClick={() => applyPath('paper')}>论文路径</button>
                <button className="btn" onClick={() => applyPath('conservative')}>保守路径</button>
                <button className="btn" onClick={() => applyPath('balanced')}>均衡路径</button>
              </div>
            </div>

            <div className="panel" style={{ boxShadow: 'none' }}>
              <h3 className="panel-title">决策轨迹</h3>
              <div className="history-list">
                {decisions.map((d, index) => {
                  const option = d.options.find((o) => o.id === choices[d.id]);
                  return (
                    <button
                      key={d.id}
                      className={index === step ? 'history-item current' : 'history-item'}
                      style={{ textAlign: 'left', width: '100%' }}
                      onClick={() => setStep(index)}
                    >
                      {index + 1}. {d.title}<br /><span style={{ color: '#6b7280' }}>{option?.label ?? '未选择'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">最终对比报告</h2>
            <p className="panel-sub">预测值由论文基准值按策略参数换算，用于相对比较，不构成真实预测。</p>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="compare-table">
            <thead>
              <tr>
                <th>策略</th><th>得分</th><th>折扣</th><th>触达</th><th>可信</th><th>社群</th><th>文旅</th><th>预算</th><th>播放量(M)</th><th>票房(M$)</th><th>文旅(M¥)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={row.label === '你的策略' ? 'highlight' : ''}>
                  <td>{row.label}</td>
                  <td>{row.successScore}</td>
                  <td>{percent(row.metrics.discount)}</td>
                  <td>{percent(row.metrics.reach)}</td>
                  <td>{percent(row.metrics.credibility)}</td>
                  <td>{percent(row.metrics.community)}</td>
                  <td>{percent(row.metrics.tourism)}</td>
                  <td>{(row.metrics.budgetUsed * 100).toFixed(0)}%</td>
                  <td>{row.predictedViewsM}</td>
                  <td>{row.predictedBoxOfficeUsdM}</td>
                  <td>{row.predictedTourismCnyM}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
