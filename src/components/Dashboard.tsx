import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import L from 'leaflet';
import { loadCities, loadTimeSeries } from '../lib/data';
import type { City, TimePoint } from '../types';

export default function Dashboard() {
  const [cities, setCities] = useState<City[]>([]);
  const [series, setSeries] = useState<TimePoint[]>([]);
  const [year, setYear] = useState(2026);
  const [selected, setSelected] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lineEl = useRef<HTMLDivElement | null>(null);
  const barEl = useRef<HTMLDivElement | null>(null);
  const lineChart = useRef<echarts.ECharts | null>(null);
  const barChart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    Promise.all([loadCities(), loadTimeSeries()])
      .then(([cityData, timeData]) => {
        setCities(cityData.cities);
        setSeries(timeData.series);
        setSelected(cityData.cities.find((c) => c.id === 'sanya') ?? cityData.cities[0]);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapInst.current) return;
    const map = L.map(mapEl.current).setView([28, 70], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    layer.current = L.layerGroup().addTo(map);
    mapInst.current = map;
    return () => {
      map.remove();
      mapInst.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    cities
      .filter((c) => c.year <= year)
      .forEach((city) => {
        const intensity = Math.min(1, (city.boxOfficeUsdM + city.tourismCnyM / 12) / 80);
        const marker = L.circleMarker([city.lat, city.lng], {
          radius: 5 + intensity * 11,
          color: '#c0392b',
          weight: 1,
          fillColor: intensity > 0.5 ? '#e74c3c' : '#f39c12',
          fillOpacity: 0.55,
        })
          .bindPopup(
            `<b>${city.name}</b><br/>${city.year} · ${city.stage}<br/>票房 ${city.boxOfficeUsdM} 百万美元<br/>文旅消费 ${city.tourismCnyM} 百万元`,
          );
        marker.on('click', () => setSelected(city));
        marker.addTo(layer.current!);
      });
  }, [cities, year]);

  useEffect(() => {
    if (!lineEl.current || !barEl.current) return;
    lineChart.current = echarts.init(lineEl.current);
    barChart.current = echarts.init(barEl.current);
    const resize = () => {
      lineChart.current?.resize();
      barChart.current?.resize();
    };
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      lineChart.current?.dispose();
      barChart.current?.dispose();
    };
  }, []);

  useEffect(() => {
    lineChart.current?.setOption(
      {
        animationDuration: 600,
        tooltip: { trigger: 'axis' },
        legend: { top: 0, textStyle: { color: '#4b5563' } },
        grid: { left: 50, right: 54, top: 38, bottom: 30 },
        xAxis: { type: 'category', data: series.map((p) => p.year), axisLine: { lineStyle: { color: '#c9d0da' } } },
        yAxis: [
          { type: 'value', name: '百万', splitLine: { lineStyle: { color: '#eef1f6' } } },
          {
            type: 'value',
            name: '折扣',
            min: 0,
            max: 1,
            axisLabel: { formatter: (value: number) => `${Math.round(value * 100)}%` },
            splitLine: { show: false },
          },
        ],
        series: [
          { name: 'YouTube 播放量（百万）', type: 'line', smooth: true, symbolSize: 7, data: series.map((p) => p.youtubeViewsM), itemStyle: { color: '#c0392b' } },
          { name: '粉丝量（百万）', type: 'line', smooth: true, symbolSize: 7, data: series.map((p) => p.followersM), itemStyle: { color: '#2563a6' } },
          {
            name: '文化折扣指数（模型）',
            type: 'line',
            yAxisIndex: 1,
            smooth: true,
            data: series.map((p) => p.discountIndex),
            itemStyle: { color: '#d97706' },
            areaStyle: { color: 'rgba(217,119,6,0.10)' },
          },
        ],
      },
      true,
    );
  }, [series]);

  useEffect(() => {
    const topCities = [...cities]
      .filter((c) => c.year <= year)
      .sort((a, b) => b.tourismCnyM - a.tourismCnyM)
      .slice(0, 8)
      .reverse();
    barChart.current?.setOption(
      {
        animationDuration: 500,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 90, right: 30, top: 12, bottom: 26 },
        xAxis: { type: 'value', name: '百万元', splitLine: { lineStyle: { color: '#eef1f6' } } },
        yAxis: { type: 'category', data: topCities.map((c) => c.name), axisLine: { lineStyle: { color: '#c9d0da' } } },
        series: [
          {
            type: 'bar',
            data: topCities.map((c) => c.tourismCnyM),
            barWidth: '55%',
            itemStyle: { color: '#e07a5f', borderRadius: [0, 6, 6, 0] },
            label: { show: true, position: 'right', fontSize: 11 },
          },
        ],
      },
      true,
    );
  }, [cities, year]);

  const filtered = useMemo(() => cities.filter((c) => c.year <= year), [cities, year]);
  const totals = useMemo(
    () => ({
      shows: filtered.reduce((sum, c) => sum + c.shows, 0),
      attendance: filtered.reduce((sum, c) => sum + c.attendance, 0),
      boxOffice: filtered.reduce((sum, c) => sum + c.boxOfficeUsdM, 0),
      tourism: filtered.reduce((sum, c) => sum + c.tourismCnyM, 0),
    }),
    [filtered],
  );

  if (loading) return <div className="panel loading">正在加载城市与时间轴数据…</div>;
  if (error) return <div className="panel error">数据加载失败：{error}</div>;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">数据仪表盘 · 世界巡演热力图</h2>
            <p className="panel-sub">拖动时间轴，观察巡演版图与文旅溢出如何逐年扩展；点击圆点查看城市详情。</p>
          </div>
          <span className="badge">样本城市 {filtered.length} / {cities.length}</span>
        </div>

        <div className="slider-row">
          <span>截至年份</span>
          <input
            type="range"
            min={2014}
            max={2026}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="选择截止年份"
          />
          <span className="year-chip">{year}</span>
        </div>

        <div className="dashboard-grid">
          <div>
            <div className="map-canvas" ref={mapEl} />
            <div className="legend" style={{ marginTop: 8 }}>
              <span><i style={{ background: '#f39c12' }} />较低强度</span>
              <span><i style={{ background: '#e74c3c' }} />较高强度（票房 + 文旅消费）</span>
              <span>底图 © OpenStreetMap contributors</span>
            </div>
          </div>

          <div className="side-stack">
            <div className="stat-grid">
              <div className="stat-card"><div className="value">{totals.shows}</div><div className="label">累计场次（样本）</div></div>
              <div className="stat-card"><div className="value">{(totals.attendance / 10000).toFixed(1)} 万</div><div className="label">累计观众（样本）</div></div>
              <div className="stat-card"><div className="value">{totals.boxOffice.toFixed(0)} M</div><div className="label">票房样本（美元）</div></div>
              <div className="stat-card"><div className="value">{totals.tourism.toFixed(0)} M</div><div className="label">文旅消费样本（人民币）</div></div>
            </div>

            <div className="city-card">
              <h4>{selected ? `${selected.name} · ${selected.year}` : '点击地图选择城市'}</h4>
              {selected ? (
                <>
                  <p>{selected.country} / {selected.region} · {selected.stage}</p>
                  <p>场次 {selected.shows} · 上座率 {selected.occupancy ? `${(selected.occupancy * 100).toFixed(0)}%` : '数字市场'}</p>
                  <p>票房 {selected.boxOfficeUsdM} 百万美元 · 文旅消费 {selected.tourismCnyM} 百万元</p>
                  <p className="source-note">{selected.note}（{selected.source === 'paper' ? '论文口径' : '示意估算'}）</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">时间轴：从「被听见」到「被尊重」</h2>
            <p className="panel-sub">播放量与粉丝来自论文披露；文化折扣指数为模型估算，随策略演进下降。</p>
          </div>
        </div>
        <div className="chart-box" ref={lineEl} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">文旅溢出 · 城市 TOP 8</h2>
            <p className="panel-sub">「艺人 IP + 城市地标 + 文旅经济」的城市品牌机制。</p>
          </div>
          <span className="badge ok">单位：人民币百万元</span>
        </div>
        <div className="chart-box small" ref={barEl} />
      </section>
    </>
  );
}
