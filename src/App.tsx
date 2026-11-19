import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Simulator from './components/Simulator';
import KnowledgeGraph from './components/KnowledgeGraph';

type Tab = 'dashboard' | 'simulator' | 'graph';

const tabs: { id: Tab; label: string; hint: string }[] = [
  { id: 'dashboard', label: '数据仪表盘', hint: '地图 · 时间轴 · 城市详情' },
  { id: 'simulator', label: '策略模拟器', hint: '决策树 · 折扣曲线 · 对比报告' },
  { id: 'graph', label: '知识图谱', hint: '理论 · 事件 · 因果链' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">CD</div>
          <div>
            <h1>文化折扣实验室</h1>
            <p>华语流行音乐出海策略沙盘 · 基于邓紫棋个案研究</p>
          </div>
        </div>
        <nav className="tabs" aria-label="主导航">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'tab active' : 'tab'}
              onClick={() => setTab(item.id)}
              title={item.hint}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="loop-banner">
        <span>理论 → 参数</span>
        <b>→</b>
        <span>参数 → 决策</span>
        <b>→</b>
        <span>决策 → 反馈曲线</span>
        <b>→</b>
        <span>反馈 → 理论验证</span>
      </div>

      <main className="main-content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'simulator' && <Simulator />}
        {tab === 'graph' && <KnowledgeGraph />}
      </main>

      <footer className="site-footer">
        <span>数据来源：《破茧成蝶，声动全球》论文公开披露口径 + 教学示意估算</span>
        <span>徐兰欣 · 香港都会大学 · 2026</span>
      </footer>
    </div>
  );
}
