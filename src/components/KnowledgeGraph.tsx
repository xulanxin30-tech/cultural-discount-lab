// @ts-nocheck — vis-network 的 ESM 类型声明在部分版本不完整，这里用运行时 API。
import { useEffect, useRef, useState } from 'react';
import { DataSet, Network } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';
import { loadGraph } from '../lib/data';
import type { GraphData, GraphNode } from '../types';

const groupStyle: Record<string, { background: string; border: string }> = {
  person: { background: '#c0392b', border: '#922b21' },
  theory: { background: '#2563a6', border: '#1d4e89' },
  event: { background: '#d97706', border: '#a85c05' },
  strategy: { background: '#2e8b57', border: '#216c43' },
  outcome: { background: '#7c3aed', border: '#5b21b6' },
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
        color: { color: '#b8c2d0', highlight: '#c0392b' },
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
          <h2 className="panel-title">知识图谱 · 理论如何驱动结果</h2>
          <p className="panel-sub">点击节点查看定义与论文依据；蓝色为理论、红色为人物、橙色为事件、绿色为策略、紫色为结果。</p>
        </div>
        <span className="badge">{graph.nodes.length} 节点 · {graph.edges.length} 关系</span>
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
