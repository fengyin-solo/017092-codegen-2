/**
 * 知识分布分析页面 - 按商家 / 行业查看知识数量与覆盖情况
 * 统计口径与概览页柱状图、饼图一致：
 *   商家维度合计 = MockStore.getOverviewStats().merchantKnowledgeCount
 *   行业维度合计 = MockStore.getOverviewStats().industryKnowledgeCount
 * @module DistributionPage
 */
(function (global) {
  'use strict';

  var Utils = App.Utils;

  // ====================== 页面状态 ======================
  var state = {
    dimension: 'merchant', // 'merchant' | 'industry'
    onlyUncovered: false,
    rows: []               // [{ id, name, sub, count }]
  };

  var chart = null;

  // 与概览柱状图 / 饼图同源配色（chartColors / chartColorsLight）
  var DIMENSION_CONFIG = {
    merchant: {
      coveredBg: '#a78bfa',        // 商家知识 light
      coveredBorder: '#7c3aed',    // 商家知识 deep
      objectLabel: '商家',
      objectUnit: '家',
      chartTitle: '各商家知识数量',
      tableTitle: '商家分布明细',
      managePage: 'merchant.html',
      manageParam: 'merchantId',
      columns: ['商家 ID', '商家名称', '知识数量', '覆盖状态', '操作']
    },
    industry: {
      coveredBg: '#34d399',        // 行业知识 light
      coveredBorder: '#059669',    // 行业知识 deep
      objectLabel: '行业',
      objectUnit: '个',
      chartTitle: '各行业知识数量',
      tableTitle: '行业分布明细',
      managePage: 'industry.html',
      manageParam: 'industryId',
      columns: ['行业 ID', '行业名称', '行业分类', '知识数量', '覆盖状态', '操作']
    }
  };

  // 未覆盖（0 条）柱条配色：沿用页面 slate 辅助色系
  var UNCOVERED_BG = '#f1f5f9';
  var UNCOVERED_BORDER = '#cbd5e1';

  // ====================== 数据加载（每次进入页面实时读取 localStorage）======================
  /**
   * 组装当前维度的分布行，数量为 0 的对象同样返回
   */
  function buildRows() {
    if (state.dimension === 'merchant') {
      return MockStore.getMerchants().map(function (m) {
        return {
          id: m.id,
          name: m.name,
          sub: null,
          count: (MockStore.getMerchantKnowledge(m.id) || []).length
        };
      });
    }

    // 行业：一级行业在前、其下二级行业紧随，排序方式与行业知识页一致
    var industries = MockStore.getIndustries();
    var level1Only = industries.filter(function (i) { return !i.level2; });
    var level2List = industries.filter(function (i) { return i.level2; });

    var level1Order = [];
    level1Only.forEach(function (i) {
      if (level1Order.indexOf(i.level1) === -1) level1Order.push(i.level1);
    });
    level2List.forEach(function (i) {
      if (level1Order.indexOf(i.level1) === -1) level1Order.push(i.level1);
    });

    var rows = [];
    level1Order.forEach(function (l1) {
      var parent = level1Only.find(function (i) { return i.level1 === l1; });
      if (parent) {
        rows.push({
          id: parent.id,
          name: parent.level1,
          sub: '一级行业',
          count: (MockStore.getIndustryKnowledge(parent.id) || []).length
        });
      }
      level2List.filter(function (i) { return i.level1 === l1; }).forEach(function (c) {
        rows.push({
          id: c.id,
          name: c.level2,
          sub: '二级 · ' + c.level1,
          count: (MockStore.getIndustryKnowledge(c.id) || []).length
        });
      });
    });
    return rows;
  }

  function getVisibleRows() {
    if (!state.onlyUncovered) return state.rows;
    return state.rows.filter(function (r) { return r.count === 0; });
  }

  // ====================== 汇总指标 ======================
  function renderStats(rows) {
    var cfg = DIMENSION_CONFIG[state.dimension];
    var covered = rows.filter(function (r) { return r.count > 0; }).length;
    var uncovered = rows.length - covered;
    var totalCount = rows.reduce(function (sum, r) { return sum + r.count; }, 0);

    var items = [
      { label: cfg.objectLabel + '总数', value: rows.length, unit: cfg.objectUnit, icon: 'lucide:boxes' },
      { label: '已覆盖', value: covered, unit: cfg.objectUnit, icon: 'lucide:circle-check' },
      { label: '未覆盖', value: uncovered, unit: cfg.objectUnit, icon: 'lucide:circle-alert' },
      { label: '知识总数', value: totalCount, unit: '条', icon: 'lucide:book-open' }
    ];

    var wrap = document.getElementById('distStats');
    wrap.innerHTML = items.map(function (item) {
      return '<div class="stat-card">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<span class="iconify text-slate-400" data-icon="' + item.icon + '" data-width="16" data-height="16"></span>' +
          '<span class="stat-card-label !mb-0">' + item.label + '</span>' +
        '</div>' +
        '<div class="flex items-baseline gap-1">' +
          '<span class="stat-card-value tabular-nums">' + Number(item.value) + '</span>' +
          '<span class="stat-card-unit">' + item.unit + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('dimSummaryText').textContent =
      '共 ' + rows.length + ' ' + cfg.objectUnit + cfg.objectLabel + ' · 已覆盖 ' + covered + ' · 未覆盖 ' + uncovered;
  }

  // ====================== 柱状图（横向，零值柱条同样可见）======================
  /** 柱尾数值标注插件：非零显示「N」，零值显示「0 条」 */
  function createValueLabelPlugin(cfg) {
    return {
      id: 'distValueLabels',
      afterDatasetsDraw: function (chartInstance) {
        var ctx = chartInstance.ctx;
        var metas = [chartInstance.getDatasetMeta(0), chartInstance.getDatasetMeta(1)];
        ctx.save();
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        chartInstance.data.labels.forEach(function (_, i) {
          var isZero = chartInstance.data.datasets[0].data[i] == null;
          // 已覆盖取数据集 0 的柱条，未覆盖取数据集 1 的桩条
          var bar = isZero ? metas[1].data[i] : metas[0].data[i];
          if (!bar || bar.x == null || bar.width <= 0) return;
          ctx.fillStyle = isZero ? '#94a3b8' : cfg.coveredBorder;
          ctx.textAlign = 'left';
          ctx.fillText(isZero ? '0 条' : String(chartInstance.data.datasets[0].data[i]), bar.x + 6, bar.y);
        });
        ctx.restore();
      }
    };
  }

  function renderChart(rows) {
    var cfg = DIMENSION_CONFIG[state.dimension];
    var canvas = document.getElementById('distChart');
    var wrap = document.getElementById('distChartWrap');

    if (chart) {
      chart.destroy();
      chart = null;
    }
    if (typeof Chart === 'undefined' || !canvas) return;

    // 按条数动态撑高，保证商家 / 行业较多时柱条不拥挤
    wrap.style.height = Math.max(300, rows.length * 38 + 56) + 'px';

    var labels = rows.map(function (r) { return r.name; });
    var coveredData = rows.map(function (r) { return r.count > 0 ? r.count : null; });
    var uncoveredData = rows.map(function (r) { return r.count === 0 ? 0 : null; });

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '已配置知识（>0 条）',
            data: coveredData,
            backgroundColor: cfg.coveredBg,
            borderColor: cfg.coveredBorder,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.62,
            categoryPercentage: 0.7,
            minBarLength: 2
          },
          {
            label: '未配置知识（0 条）',
            data: uncoveredData,
            backgroundColor: UNCOVERED_BG,
            borderColor: UNCOVERED_BORDER,
            borderWidth: 1,
            borderDash: [4, 3],
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.62,
            categoryPercentage: 0.7,
            minBarLength: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          // 图例样式与概览饼图一致：圆点、12px、slate 字色
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { font: { size: 12 }, color: '#475569', padding: 14, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.9)',
            padding: 12,
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            filter: function (item) { return item.raw != null; },
            callbacks: {
              label: function (ctx) {
                if (ctx.datasetIndex === 1) return '未配置知识：0 条';
                return '知识数量：' + ctx.raw + ' 条';
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            stacked: false,
            title: {
              display: true,
              text: '数值',
              font: { size: 12 },
              color: '#64748b'
            },
            ticks: {
              font: { size: 12 },
              color: '#94a3b8',
              stepSize: 1,
              precision: 0,
              callback: function (v) { return Number.isInteger(v) ? v : ''; }
            },
            grid: { color: 'rgba(148,163,184,0.2)' }
          },
          y: {
            stacked: false,
            ticks: { font: { size: 11 }, color: '#64748b' },
            grid: { display: false }
          }
        }
      },
      plugins: [createValueLabelPlugin(cfg)]
    });
  }

  // ====================== 明细表 =======================
  function renderTable(rows) {
    var cfg = DIMENSION_CONFIG[state.dimension];
    var head = document.getElementById('distTableHead');
    var body = document.getElementById('distTableBody');

    head.innerHTML = cfg.columns.map(function (c, i) {
      var cls = (i === cfg.columns.length - 1) ? 'text-right' : '';
      return '<th class="' + cls + '">' + c + '</th>';
    }).join('');

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="' + cfg.columns.length + '" class="text-center text-slate-400 py-10">' +
        '<span class="iconify inline-block align-[-2px] mr-1" data-icon="lucide:circle-check" data-width="16" data-height="16"></span>' +
        '没有未覆盖的' + cfg.objectLabel + '，知识已全部配置。' +
      '</td></tr>';
    } else {
      body.innerHTML = rows.map(function (r) {
        var uncovered = r.count === 0;
        var status = uncovered
          ? '<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><span class="iconify" data-icon="lucide:circle-alert" data-width="13" data-height="13"></span>未覆盖</span>'
          : '<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="iconify" data-icon="lucide:circle-check" data-width="13" data-height="13"></span>已覆盖</span>';
        var manageHref = cfg.managePage + '?' + cfg.manageParam + '=' + encodeURIComponent(r.id);

        if (state.dimension === 'merchant') {
          return '<tr>' +
            '<td class="font-mono text-xs text-slate-500">' + Utils.escapeHtml(r.id) + '</td>' +
            '<td class="text-slate-800">' + Utils.escapeHtml(r.name) + '</td>' +
            '<td class="tabular-nums font-medium ' + (uncovered ? 'text-slate-400' : 'text-slate-900') + '">' + r.count + ' 条</td>' +
            '<td>' + status + '</td>' +
            '<td class="text-right"><a class="btn-link inline-flex items-center gap-1" href="' + manageHref + '"><span class="iconify" data-icon="lucide:arrow-up-right" data-width="14" data-height="14"></span>查看 / 补充知识</a></td>' +
          '</tr>';
        }
        return '<tr>' +
          '<td class="font-mono text-xs text-slate-500">' + Utils.escapeHtml(r.id) + '</td>' +
          '<td class="text-slate-800">' + Utils.escapeHtml(r.name) + '</td>' +
          '<td class="text-slate-500">' + Utils.escapeHtml(r.sub || '') + '</td>' +
          '<td class="tabular-nums font-medium ' + (uncovered ? 'text-slate-400' : 'text-slate-900') + '">' + r.count + ' 条</td>' +
          '<td>' + status + '</td>' +
          '<td class="text-right"><a class="btn-link inline-flex items-center gap-1" href="' + manageHref + '"><span class="iconify" data-icon="lucide:arrow-up-right" data-width="14" data-height="14"></span>查看 / 补充知识</a></td>' +
        '</tr>';
      }).join('');
    }

    document.getElementById('distTableCount').textContent = '共 ' + rows.length + ' 条记录';
  }

  // ====================== 整体渲染 ======================
  function renderAll() {
    // 每次渲染都重新读取存储，保证从其他页面改完知识后回到本页看到最新数量
    state.rows = buildRows();
    var rows = getVisibleRows();
    var cfg = DIMENSION_CONFIG[state.dimension];

    document.getElementById('distChartTitle').textContent = cfg.chartTitle;
    document.getElementById('distChartSub').textContent = state.onlyUncovered
      ? '仅展示知识数量为 0 的' + cfg.objectLabel + '，便于排查覆盖缺口。'
      : '数量为 0 的' + cfg.objectLabel + '同样展示，便于排查知识覆盖缺口。';
    document.getElementById('distTableTitle').textContent = cfg.tableTitle;

    // 汇总卡片始终基于全量对象统计，不受「仅看未覆盖」影响
    renderStats(state.rows);
    renderChart(rows);
    renderTable(rows);
  }

  function setDimension(dim) {
    if (state.dimension === dim) return;
    state.dimension = dim;
    document.getElementById('dimMerchantBtn').classList.toggle('dim-tab-active', dim === 'merchant');
    document.getElementById('dimIndustryBtn').classList.toggle('dim-tab-active', dim === 'industry');
    renderAll();
  }

  // ====================== 事件绑定 ======================
  function bindEvents() {
    document.getElementById('dimMerchantBtn').addEventListener('click', function () { setDimension('merchant'); });
    document.getElementById('dimIndustryBtn').addEventListener('click', function () { setDimension('industry'); });
    document.getElementById('onlyUncoveredBtn').addEventListener('click', function () {
      state.onlyUncovered = !state.onlyUncovered;
      this.classList.toggle('dim-tab-ghost-active', state.onlyUncovered);
      renderAll();
    });
  }

  // ====================== 初始化 ======================
  function init() {
    var dim = new URLSearchParams(global.location.search).get('dim');
    if (dim === 'industry') state.dimension = 'industry';
    document.getElementById('dimMerchantBtn').classList.toggle('dim-tab-active', state.dimension === 'merchant');
    document.getElementById('dimIndustryBtn').classList.toggle('dim-tab-active', state.dimension === 'industry');

    bindEvents();
    renderAll();

    // 从浏览器缓存（bfcache）返回本页时同样刷新为最新数量
    global.addEventListener('pageshow', function () { renderAll(); });
  }

  global.DistributionPage = { init: init, state: state };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
