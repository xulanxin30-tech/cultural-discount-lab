import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Simulator from './components/Simulator';
import KnowledgeGraph from './components/KnowledgeGraph';

type Tab = 'dashboard' | 'simulator' | 'graph';

const tabs: { id: Tab; index: string; label: string; hint: string }[] = [
  { id: 'dashboard', index: '01', label: '数据', hint: '地理分布、时间轴与选择预测' },
  { id: 'simulator', index: '02', label: '模拟', hint: '15 个决策节点与策略对比' },
  { id: 'graph', index: '03', label: '图谱', hint: '理论、事件与因果链' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">CDI</div>
          <div className="brand-copy">
            <span className="eyebrow">Cultural Discount Index / 2026</span>
            <h1>文化折扣指数</h1>
            <p>华语流行音乐出海策略研究 · 以 G.E.M. 邓紫棋为个案</p>
          </div>
        </div>
        <div className="header-meta">
          <span>Research note 01</span>
          <span>Xu Lanxin · HKMU</span>
        </div>
        <nav className="tabs" aria-label="主导航">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'tab active' : 'tab'}
              onClick={() => setTab(item.id)}
              title={item.hint}
            >
              <span className="tab-index">{item.index}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="method-strip">
        <span><b>01</b> 理论拆成变量</span>
        <span><b>02</b> 参数进入决策</span>
        <span><b>03</b> 反馈形成曲线</span>
        <span><b>04</b> 结果回到理论</span>
      </div>

      <main className="main-content">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'simulator' && <Simulator />}
        {tab === 'graph' && <KnowledgeGraph />}
      </main>

      <footer className="site-footer">
        <span>数据来源：《破茧成蝶，声动全球》公开披露口径 + 示意估算</span>
        <span>徐兰欣 · 香港都会大学 · 2026</span>
      </footer>
    </div>
  );
}
