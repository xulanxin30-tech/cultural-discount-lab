# 文化折扣指数 · Cultural Discount Index

> 把传播学理论变成可计算参数的华语音乐出海策略沙盘。  
> 基于论文《破茧成蝶，声动全球：华语流行音乐出海跨文化宣发范式的案例研究——以 G.E.M. 邓紫棋为例》。

**在线演示**：<https://xulanxin30-tech.github.io/cultural-discount-lab/>  
**仓库**：<https://github.com/xulanxin30-tech/cultural-discount-lab>

---

## 一、动机

华语流行音乐出海长期面临三重瓶颈：语言隔阂、文化折扣、国际话语权不足。论文以邓紫棋为个案，提出「内容为王 + 事件营销 + 全域覆盖」的内地打法和「阶段性布局 + 本地化运营 + 平台化传播」的海外路径，但没有把这些经验变成**可操作、可比较、可反馈**的工具。

本作品把论文中的定性结论转译为一个决策沙盘：

- 传播学概念 → 可计算参数（例如「母语演唱 → 文化折扣降低 20%」）；
- 案例事件 → 15 个决策节点与选项权重；
- 理论因果 → 知识图谱与实时反馈曲线；
- 个人经验 → 三条策略路径的对比报告。

核心闭环：**理论 → 参数 → 决策 → 反馈曲线 → 理论验证**。

---

## 二、理论基础

| 理论 | 论文依据 | 本作品中的参数化方式 |
| :--- | :--- | :--- |
| 文化折扣 Cultural Discount | Hoskins & Mirus；论文第二部分、六部分 | `discount` 初始 0.78，各策略产生负增量，目标降至 0.30 |
| 高 / 低语境文化 | Hall；论文第五部分（三） | 母语演唱 `-0.20`；多语言致谢 `-0.06` |
| 媒介事件 Media Event | 《我是歌手》、S15 主题曲 | `credibility`、`reach` 的正增量 |
| 三阶段全球化路径 | 论文表 1 | 决策按阶段分组：东南亚 → 欧美 → 全球 |
| 本地化运营 | 本土 KOL、西语专辑、分平台社媒 | `local_kol` `-0.10`，`spanish_album` `-0.18` |
| 粉丝社群经济 | 「棋士联盟」 | `community` 权重 0.12 进入综合得分 |
| 软实力 / 城市品牌 | Nye、Kavaratzis | 顶级舞台背书与「艺人 IP + 城市地标 + 文旅经济」 |

完整映射见 `public/data/theory-map.json`，可在「知识图谱」页交互查看。

---

## 三、技术架构

```
React 18 + TypeScript + Vite
├── ECharts      数据仪表盘曲线 / 模拟折扣曲线 / 文旅 TOP 8
├── Leaflet      世界巡演热力图（OpenStreetMap 底图）
├── vis-network  理论—事件—策略知识图谱
└── 静态 JSON    public/data/*.json（GitHub Pages 零后端可运行）

可选后端（Render 等）
└── Python FastAPI + SQLite
    ├── GET  /api/cities /api/timeseries /api/decisions /api/graph /api/rules
    ├── POST /api/simulate   运行模拟并写入数据库
    └── GET  /api/history    查看最近模拟记录
```

前端与后端使用同一套模拟公式（`src/lib/engine.ts` 与 `server/main.py`），保证静态模式与 API 模式结果一致。

---

## 四、数据说明

数据源分两类，并在每条城市记录里用 `source` 字段标注：

- `paper`：论文直接披露或明确引用的口径，例如 4.24 亿美元票房、69 城 182 场、《光年之外》3 亿播放、三亚 4.53 亿元文旅消费。
- `illustrative`：为可视化演示而做的合理估算，不应当作论文原始数据或真实商业预测。

主要聚合口径：

| 指标 | 数值 |
| :--- | :--- |
| 巡演周期 | 2023-12 广州 → 2026-10 深圳 |
| 覆盖范围 | 3 大洲、7 国、69 城、182 场（体育场 170 场） |
| 观众 | 700 万+ |
| 票房 | 4.24 亿美元（截至 2025-03） |
| 《光年之外》MV | 2025 年底 3 亿播放 |
| 粉丝增长 | 2014 年节目后三个月 +800 万 |
| 文旅溢出 | 三亚两站预计带动 4.53 亿元人民币 |

---

## 五、用户旅程

1. **数据仪表盘**：拖动 2014—2026 时间轴，地图热力点逐年增加；点击城市查看场次、票房、上座率与文旅消费；下方曲线显示播放量、粉丝与文化折扣指数的关系。新增的「不同选择的预测对比」用**柱状图**展示同一决策下各选项的曝光/粉丝增量，用**折线图**展示三条策略路径的累计预测，并按阶段拆解贡献差异。
2. **策略模拟器**：依次回答 15 个问题（参加《我是歌手》？坚持母语演唱？发行西语专辑？办体育场巡演？……）。每次选择立即重算文化折扣曲线；可一键复刻「论文路径 / 保守路径 / 均衡路径」。新增**曝光量与粉丝增减预测图**（当前策略 vs 论文路径）、**每一步边际增量柱状图**和**阶段差异化分析表**，让不同阶段、不同选择的预测差异一目了然。
3. **最终对比报告**：查看综合得分、预测播放量、票房与文旅消费，并和三条基准路径横向比较。
4. **知识图谱**：点击「文化折扣」「母语演唱」「媒介事件」等节点，查看理论定义、论文依据及因果关系边。

演示脚本见 [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)（≤3 分钟）。

---

## 六、模拟规则

初始状态：折扣 78%、触达 18%、公信力 25%、社群 15%、文旅 5%、风险 8%。

综合得分：

```
score = 100 × [0.35(1-discount) + 0.25·reach + 0.20·credibility
             + 0.12·community + 0.08·tourism]
        - 12 × 超预算比例 - 8 × 超额风险
```

预算上限 1.5（相对投入单位）。所有参数均为教学演示值，完整公式见 `public/data/simulation-rules.json`。

---

## 七、本地运行

```bash
git clone https://github.com/xulanxin30-tech/cultural-discount-lab.git
cd cultural-discount-lab
npm install
npm run dev
```

打开 <http://localhost:5173>。

构建静态站点：

```bash
npm run build      # 输出到 dist/
npm run preview
```

启动可选 API：

```bash
pip install -r server/requirements.txt
python server/main.py
# GET http://localhost:8000/api/health
# POST http://localhost:8000/api/simulate  {"choices": {...}}
```

---

## 八、部署

- **前端**：推送到 `main` 后，在 GitHub 仓库 Settings → Pages 选择 “GitHub Actions” 或 “Deploy from a branch / main / root”，即可通过 `https://xulanxin30-tech.github.io/cultural-discount-lab/` 访问。
- **后端**：`server/` 可直接作为 Render Web Service 部署，启动命令 `uvicorn server.main:app --host 0.0.0.0 --port $PORT`。
- **纯静态模式**：不部署后端也能完整运行；API 只是额外能力。

---

## 九、反思

1. **量化不是还原真实**：把「文化折扣降低 20%」写进代码是为了让理论可讨论，并非论文实测的因果效应。数值应当被公开标注为演示参数，这一点已在数据与 README 中反复说明。
2. **成功难以完全归因**：播放量、票房、粉丝量来自平台公开口径，无法区分华人圈层与主流圈层的真实比例，这也是论文自陈的局限。
3. **技术有边界**：AI 多语言翻唱与虚拟演出能放大传播势能，但无法替代内容本身的情感厚度——模型里把 `ai_virtual` 的折扣收益设得有限，同时增加风险项。
4. **可迁移性**：个案不可复制的是才华与人设，可复制的是「内容本地化 + 社群精细化 + 平台数据化」的组合打法，这也是模拟器真正想让使用者体会的部分。

---

## 十、许可与引用

- 代码：MIT License，见 [LICENSE](LICENSE)。
- 论文引用：徐兰欣《破茧成蝶，声动全球：华语流行音乐出海跨文化宣发范式的案例研究——以 G.E.M. 邓紫棋为例》，2026。
- 地图数据 © OpenStreetMap contributors。

Made with React, TypeScript, ECharts, Leaflet, vis-network, FastAPI & SQLite.
