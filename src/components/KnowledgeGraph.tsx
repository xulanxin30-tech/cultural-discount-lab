// @ts-nocheck — vis-network 的 ESM 类型声明在部分版本不完整，这里用运行时 API。
import { useEffect, useRef, useState } from 'react';
import { DataSet, Network } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';
import { loadGraph } from '../lib/data';
import type { GraphData, GraphNode } from '../types';

const groupStyle: Record<string, { background: string; border: string }> = {
  person: { background: '#a63d2f', border: '#7f2d23' },
  theory: { background: '#3d5a6c', border: '#2c4352' },
  event: { background: '#a67c3d', border: '#7d5c2d' },
  strategy: { background: '#5f735c', border: '#44553f' },
  outcome: { background: '#6b5b73', border: '#4e4254' },
};

export default function KnowledgeGraph() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    loadGraph()
      .then((data) => {
        setGraph(data);
        setSelected(data.nodes.find((n) => n.id === 'cd') ?? data.nodes[0]);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!graph || !containerRef.current || networkRef.current) return;

    const nodes = new DataSet(
      graph.nodes.map((node) => ({
        ...node,
        shape: 'dot',
        size: node.group === 'theory' ? 20 : 15,
        color: groupStyle[node.group] ?? { background: '#64748b', border: '#475569' },
        font: { size: 13, color: '#1f2933', face: 'PingFang SC, Microsoft YaHei, sans-serif' },
        borderWidth: 2,
      })),
    );

    const edges = new DataSet(
      graph.edges.map((edge, index) => ({
        ...edge,
        id: index,
        arrows: 'to',
        label: edge.label,
        font: { size: 10, color: '#6b7280', align: 'middle' },
        color: { color: '#c9c2b6', highlight: '#a63d2f' },
      })),
    );

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      {
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: { gravitationalConstant: -60, centralGravity: 0.012, springLength: 130, springConstant: 0.06 },
          stabilization: { iterations: 220 },
        },
        interaction: { hover: true, tooltipDelay: 120, navigationButtons: true, zoomView: true },
        edges: { smooth: { enabled: true, type: 'dynamic' }, selectionWidth: 2 },
        nodes: { shadow: { enabled: true, size: 8, x: 2, y: 2, color: 'rgba(0,0,0,0.10)' } },
      },
    );

    network.on('click', (params: { nodes: string[] }) => {
      if (!params.nodes.length) return;
      const node = graph.nodes.find((item) => item.id === params.nodes[0]);
      if (node) setSelected(node);
    });

    networkRef.current = network;
    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [graph]);

  const related = selected
    ? (graph?.edges ?? []).filter((edge) => edge.from === selected.id || edge.to === selected.id)
    : [];

  if (error) return <div className="panel error">知识图谱加载失败：{error}</div>;
  if (!graph) return <div className="panel loading">正在构建理论—事件—策略图谱…</div>;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">知识图谱 · 理论与结果的因果链</h2>
          <p className="panel-sub">点击节点查看定义与论文依据；深蓝为理论、朱红为人物、赭石为事件、灰绿为策略、灰紫为结果。</p>
        </div>
        <span className="badge">{graph.nodes.length} Nodes / {graph.edges.length} Edges</span>
      </div>

      <div className="graph-layout">
        <div className="graph-canvas" ref={containerRef} />
        <aside className="detail-panel">
          {selected ? (
            <>
              <span className="badge">{selected.group}</span>
              <h3 style={{ marginTop: 10 }}>{selected.label}</h3>
              <p><b>{selected.title}</b></p>
              <p>{selected.detail}</p>
              <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>关联关系</h4>
              <div className="history-list">
                {related.map((edge, index) => (
                  <div className="history-item" key={`${edge.from}-${edge.to}-${index}`}>
                    {edge.from} → {edge.to}<br />
                    <span style={{ color: '#6b7280' }}>{edge.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>点击左侧节点查看详情。</p>
          )}
        </aside>
      </div>
    </section>
  );
}
