/**
 * 商家知识页面 - 模块化控制器
 * @module MerchantPage
 */
(function (global) {
  'use strict';

  var Utils = App.Utils;
  var Table = App.Table;
  var Modal = App.Modal;
  var Select = App.Select;

  // ====================== 页面状态 ======================
  var state = {
    merchants: [],
    currentMerchantId: '',
    editingMerchantId: null,
    editingKnowledgeId: null,
    importTab: 'file',
    importParsedItems: [],
    importFileContent: null,
    importFileName: ''
  };

  // ====================== DOM 元素缓存 ======================
  var elements = {};

  function cacheElements() {
    elements = {
      // 商家相关
      btnAddMerchant: document.getElementById('btnAddMerchant'),
      merchantTableBody: document.getElementById('merchantTableBody'),
      merchantModal: document.getElementById('merchantModal'),
      merchantModalTitle: document.getElementById('merchantModalTitle'),
      merchantFormIdWrap: document.getElementById('merchantFormIdWrap'),
      merchantFormId: document.getElementById('merchantFormId'),
      merchantFormName: document.getElementById('merchantFormName'),
      merchantModalCancel: document.getElementById('merchantModalCancel'),
      merchantModalSubmit: document.getElementById('merchantModalSubmit'),
      // 知识相关
      merchantSelect: document.getElementById('merchantSelect'),
      btnAddKnowledge: document.getElementById('btnAddKnowledge'),
      knowledgeEmpty: document.getElementById('knowledgeEmpty'),
      knowledgeBlock: document.getElementById('knowledgeBlock'),
      knowledgeTableBody: document.getElementById('knowledgeTableBody'),
      knowledgeModal: document.getElementById('knowledgeModal'),
      knowledgeModalTitle: document.getElementById('knowledgeModalTitle'),
      knowledgeFormMerchantWrap: document.getElementById('knowledgeFormMerchantWrap'),
      knowledgeFormMerchant: document.getElementById('knowledgeFormMerchant'),
      formStandardQ: document.getElementById('formStandardQ'),
      formSimilarQ: document.getElementById('formSimilarQ'),
      formAnswer: document.getElementById('formAnswer'),
      knowledgeModalCancel: document.getElementById('knowledgeModalCancel'),
      knowledgeModalSubmit: document.getElementById('knowledgeModalSubmit'),
      // 批量导入相关
      btnBatchImport: document.getElementById('btnBatchImport'),
      batchImportModal: document.getElementById('batchImportModal'),
      importMerchantSelect: document.getElementById('importMerchantSelect'),
      importTabFile: document.getElementById('importTabFile'),
      importTabText: document.getElementById('importTabText'),
      importFilePanel: document.getElementById('importFilePanel'),
      importTextPanel: document.getElementById('importTextPanel'),
      importFileZone: document.getElementById('importFileZone'),
      importFileInput: document.getElementById('importFileInput'),
      importFileNameEl: document.getElementById('importFileName'),
      importTextArea: document.getElementById('importTextArea'),
      btnParseImport: document.getElementById('btnParseImport'),
      importPreviewSection: document.getElementById('importPreviewSection'),
      importStats: document.getElementById('importStats'),
      importPreviewBody: document.getElementById('importPreviewBody'),
      importSelectAll: document.getElementById('importSelectAll'),
      importSelectedCount: document.getElementById('importSelectedCount'),
      importModalCancel: document.getElementById('importModalCancel'),
      importModalCancelNoPreview: document.getElementById('importModalCancelNoPreview'),
      importModalSubmit: document.getElementById('importModalSubmit'),
      importNoPreview: document.getElementById('importNoPreview')
    };
  }

  // ====================== 商家管理 ======================
  var MerchantManager = {
    render: function () {
      state.merchants = MockStore.getMerchants();
      var tbody = elements.merchantTableBody;
      
      Table.render(tbody, state.merchants, function (m) {
        return '<td class="font-mono text-sm text-slate-700">' + Utils.escapeHtml(m.id) + '</td>' +
          '<td class="text-slate-800">' + Utils.escapeHtml(m.name) + '</td>' +
          '<td class="text-right">' +
            '<button type="button" class="btn-link m-edit mr-2" data-id="' + m.id + '">编辑</button>' +
            '<button type="button" class="btn-link btn-link-danger m-delete" data-id="' + m.id + '">删除</button>' +
          '</td>';
      }, this.bindTableEvents.bind(this));
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.m-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.m-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          Confirm.show('确定删除该商家？其下知识将一并清除。', function () {
            MockStore.deleteMerchant(btn.dataset.id);
            if (state.currentMerchantId === btn.dataset.id) {
              state.currentMerchantId = '';
            }
            self.render();
            self.fillSelect();
            KnowledgeManager.fillFormSelect();
            KnowledgeManager.render();
            Toast.show('商家删除成功', 'success');
          });
        });
      });
    },

    fillSelect: function () {
      state.merchants = MockStore.getMerchants();
      var options = state.merchants.map(function (m) {
        return { value: m.id, label: m.name + '（' + m.id + '）' };
      });
      Select.fill(elements.merchantSelect, options, '全部商家', state.currentMerchantId);
    },

    openModal: function (id) {
      state.editingMerchantId = id || null;
      elements.merchantModalTitle.textContent = id ? '编辑商家' : '新增商家';
      
      if (id) {
        elements.merchantFormIdWrap.style.display = 'block';
        elements.merchantFormId.disabled = true;
        var m = state.merchants.find(function (x) { return x.id === id; });
        if (m) {
          elements.merchantFormId.value = m.id;
          elements.merchantFormName.value = m.name;
        }
      } else {
        elements.merchantFormIdWrap.style.display = 'block';
        elements.merchantFormId.disabled = false;
        elements.merchantFormId.value = '';
        elements.merchantFormName.value = '';
      }
      elements.merchantModal.style.display = 'flex';
    },

    closeModal: function () {
      elements.merchantModal.style.display = 'none';
      state.editingMerchantId = null;
    },

    save: function () {
      var name = elements.merchantFormName.value.trim();
      if (!name) {
        Toast.show('请填写商家名称', 'error');
        return;
      }
      
      if (state.editingMerchantId) {
        MockStore.updateMerchant(state.editingMerchantId, name);
        Toast.show('商家信息更新成功', 'success');
      } else {
        var id = elements.merchantFormId.value.trim();
        MockStore.createMerchant(name, id || undefined);
        Toast.show('商家创建成功', 'success');
      }
      
      this.closeModal();
      this.render();
      this.fillSelect();
      KnowledgeManager.fillFormSelect();
      KnowledgeManager.render();
    }
  };

  // ====================== 知识管理 ======================
  var KnowledgeManager = {
    render: function () {
      var list = [];
      var merchantLabel = {};
      
      MockStore.getMerchants().forEach(function (m) {
        merchantLabel[m.id] = m.name + '（' + m.id + '）';
      });
      
      if (state.currentMerchantId) {
        list = MockStore.getMerchantKnowledge(state.currentMerchantId).map(function (k) {
          return {
            merchantId: state.currentMerchantId,
            merchantName: merchantLabel[state.currentMerchantId] || state.currentMerchantId,
            data: k
          };
        });
      } else {
        MockStore.getMerchants().forEach(function (m) {
          MockStore.getMerchantKnowledge(m.id).forEach(function (k) {
            list.push({
              merchantId: m.id,
              merchantName: merchantLabel[m.id] || m.id,
              data: k
            });
          });
        });
      }

      Table.toggleEmpty(elements.knowledgeEmpty, elements.knowledgeBlock, list.length === 0);
      
      if (list.length === 0) {
        elements.knowledgeTableBody.innerHTML = '';
        return;
      }

      Table.render(elements.knowledgeTableBody, list, function (row) {
        var k = row.data;
        return '<td class="text-subtle text-sm">' + Utils.escapeHtml(row.merchantName) + '</td>' +
          '<td class="text-obsidian">' + Utils.escapeHtml(k.standardQ || '') + '</td>' +
          '<td class="text-subtle">' + Utils.escapeHtml((k.similarQs || []).join('；')) + '</td>' +
          '<td class="text-charcoal max-w-xs truncate">' + Utils.escapeHtml(k.answer || '') + '</td>' +
          '<td class="text-right">' +
            '<button type="button" class="btn-link edit-btn mr-2" data-id="' + k.id + '" data-mid="' + row.merchantId + '">编辑</button>' +
            '<button type="button" class="btn-link btn-link-danger delete-btn" data-id="' + k.id + '" data-mid="' + row.merchantId + '">删除</button>' +
          '</td>';
      }, this.bindTableEvents.bind(this));
    },

    bindTableEvents: function (tbody) {
      var self = this;
      tbody.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mid = btn.dataset.mid || state.currentMerchantId;
          if (mid) {
            state.currentMerchantId = mid;
            elements.merchantSelect.value = mid;
          }
          self.openModal(btn.dataset.id);
        });
      });
      tbody.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mid = btn.dataset.mid || state.currentMerchantId;
          Confirm.show('确定删除这条知识？', function () {
            MockStore.deleteMerchantKnowledge(mid, btn.dataset.id);
            self.render();
            Toast.show('知识删除成功', 'success');
          });
        });
      });
    },

    fillFormSelect: function () {
      var merchants = MockStore.getMerchants();
      var options = merchants.map(function (m) {
        return { value: m.id, label: m.name + '（' + m.id + '）' };
      });
      Select.fill(elements.knowledgeFormMerchant, options, '请选择要添加知识的商家');
    },

    openModal: function (id) {
      state.editingKnowledgeId = id || null;
      elements.knowledgeModalTitle.textContent = id ? '编辑知识' : '新增知识';
      
      if (id) {
        elements.knowledgeFormMerchantWrap.style.display = 'none';
        var list = MockStore.getMerchantKnowledge(state.currentMerchantId);
        var k = list.find(function (x) { return x.id === id; });
        if (k) {
          elements.formStandardQ.value = k.standardQ || '';
          elements.formSimilarQ.value = (k.similarQs || []).join('\n');
          elements.formAnswer.value = k.answer || '';
        }
      } else {
        elements.knowledgeFormMerchantWrap.style.display = 'block';
        this.fillFormSelect();
        elements.knowledgeFormMerchant.value = '';
        elements.formStandardQ.value = '';
        elements.formSimilarQ.value = '';
        elements.formAnswer.value = '';
      }
      elements.knowledgeModal.style.display = 'flex';
    },

    closeModal: function () {
      elements.knowledgeModal.style.display = 'none';
      state.editingKnowledgeId = null;
    },

    save: function () {
      var standardQ = elements.formStandardQ.value.trim();
      var similarQs = elements.formSimilarQ.value.trim().split(/\n/).map(function (s) {
        return s.trim();
      }).filter(Boolean);
      var answer = elements.formAnswer.value.trim();
      
      if (!standardQ) {
        Toast.show('请填写标准问', 'error');
        return;
      }
      
      var merchantId = state.editingKnowledgeId
        ? state.currentMerchantId
        : (elements.knowledgeFormMerchant.value || '').trim();
      
      if (!merchantId) {
        Toast.show('请选择要添加知识的商家', 'error');
        return;
      }
      
      if (state.editingKnowledgeId) {
        MockStore.updateMerchantKnowledge(merchantId, state.editingKnowledgeId, {
          standardQ: standardQ,
          similarQs: similarQs,
          answer: answer
        });
        Toast.show('知识更新成功', 'success');
      } else {
        MockStore.addMerchantKnowledge(merchantId, {
          standardQ: standardQ,
          similarQs: similarQs,
          answer: answer
        });
        Toast.show('知识创建成功', 'success');
      }
      
      this.closeModal();
      this.render();
    }
  };

  // ====================== 批量导入管理 ======================
  var BatchImportManager = {
    openModal: function () {
      state.importParsedItems = [];
      state.importFileContent = null;
      state.importFileName = '';
      state.importTab = 'file';

      this.fillMerchantSelect();
      elements.importMerchantSelect.value = state.currentMerchantId || '';
      elements.importTextArea.value = '';
      elements.importFileNameEl.classList.add('hidden');
      elements.importFileNameEl.textContent = '';
      elements.importFileInput.value = '';
      elements.importPreviewSection.style.display = 'none';
      elements.importNoPreview.style.display = 'block';
      this.switchTab('file');
      elements.batchImportModal.style.display = 'flex';
    },

    closeModal: function () {
      elements.batchImportModal.style.display = 'none';
      state.importParsedItems = [];
      state.importFileContent = null;
    },

    fillMerchantSelect: function () {
      var merchants = MockStore.getMerchants();
      var options = merchants.map(function (m) {
        return { value: m.id, label: m.name + '（' + m.id + '）' };
      });
      Select.fill(elements.importMerchantSelect, options, '请选择要导入知识的商家');
    },

    switchTab: function (tab) {
      state.importTab = tab;
      if (tab === 'file') {
        elements.importTabFile.classList.add('import-tab-active');
        elements.importTabText.classList.remove('import-tab-active');
        elements.importFilePanel.style.display = 'block';
        elements.importTextPanel.style.display = 'none';
      } else {
        elements.importTabText.classList.add('import-tab-active');
        elements.importTabFile.classList.remove('import-tab-active');
        elements.importFilePanel.style.display = 'none';
        elements.importTextPanel.style.display = 'block';
      }
    },

    parseCSV: function (text) {
      var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
      if (lines.length < 2) return [];
      var results = [];
      for (var i = 1; i < lines.length; i++) {
        var cols = lines[i].split(',');
        if (cols.length < 3) continue;
        var standardQ = cols[0].trim().replace(/^"|"$/g, '');
        var similarQsRaw = cols[1].trim().replace(/^"|"$/g, '');
        var answer = cols.slice(2).join(',').trim().replace(/^"|"$/g, '');
        if (!standardQ || !answer) continue;
        var similarQs = similarQsRaw ? similarQsRaw.split(/[;；]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
        results.push({ standardQ: standardQ, similarQs: similarQs, answer: answer });
      }
      return results;
    },

    parseJSON: function (text) {
      try {
        var data = JSON.parse(text);
        if (!Array.isArray(data)) return [];
        return data.map(function (item) {
          return {
            standardQ: (item.standardQ || item['标准问'] || '').trim(),
            similarQs: Array.isArray(item.similarQs || item['相似问'])
              ? (item.similarQs || item['相似问']).map(function (s) { return String(s).trim(); }).filter(Boolean)
              : (typeof (item.similarQs || item['相似问']) === 'string'
                ? (item.similarQs || item['相似问']).split(/[;；]/).map(function (s) { return s.trim(); }).filter(Boolean)
                : []),
            answer: (item.answer || item['答案'] || '').trim()
          };
        }).filter(function (item) { return item.standardQ && item.answer; });
      } catch (e) {
        return [];
      }
    },

    parseText: function (text) {
      var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
      var results = [];
      lines.forEach(function (line) {
        var parts = line.split('|');
        if (parts.length < 3) {
          if (parts.length === 2) {
            results.push({ standardQ: parts[0].trim(), similarQs: [], answer: parts[1].trim() });
          }
          return;
        }
        var standardQ = parts[0].trim();
        var similarQsRaw = parts[1].trim();
        var answer = parts.slice(2).join('|').trim();
        var similarQs = similarQsRaw ? similarQsRaw.split(/[;；]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
        if (standardQ && answer) {
          results.push({ standardQ: standardQ, similarQs: similarQs, answer: answer });
        }
      });
      return results;
    },

    handleFileSelect: function (file) {
      if (!file) return;
      state.importFileName = file.name;
      elements.importFileNameEl.textContent = '已选择：' + file.name;
      elements.importFileNameEl.classList.remove('hidden');
      var reader = new FileReader();
      reader.onload = function (e) {
        state.importFileContent = e.target.result;
      };
      reader.readAsText(file);
    },

    parseContent: function () {
      var merchantId = elements.importMerchantSelect.value;
      if (!merchantId) {
        Toast.show('请先选择要导入的商家', 'error');
        return;
      }

      var items = [];
      if (state.importTab === 'file') {
        if (!state.importFileContent) {
          Toast.show('请先选择文件', 'error');
          return;
        }
        var name = (state.importFileName || '').toLowerCase();
        if (name.endsWith('.json')) {
          items = this.parseJSON(state.importFileContent);
        } else {
          items = this.parseCSV(state.importFileContent);
        }
      } else {
        var text = elements.importTextArea.value.trim();
        if (!text) {
          Toast.show('请粘贴问答内容', 'error');
          return;
        }
        try {
          items = this.parseJSON(text);
          if (items.length === 0) items = this.parseText(text);
        } catch (_) {
          items = this.parseText(text);
        }
      }

      if (items.length === 0) {
        Toast.show('未能解析到有效的问答内容，请检查格式', 'error');
        return;
      }

      var checkResults = MockStore.checkMerchantKnowledgeDuplicates(merchantId, items);

      var seenQ = {};
      var dupInfoMap = {};
      var firstOccurrenceIndices = {};
      items.forEach(function (it, idx) {
        var q = it.standardQ;
        if (seenQ[q] !== undefined) {
          var firstIdx = seenQ[q];
          dupInfoMap[idx] = { firstIndex: firstIdx };
          if (!firstOccurrenceIndices[firstIdx]) firstOccurrenceIndices[firstIdx] = [];
          firstOccurrenceIndices[firstIdx].push(idx);
        } else {
          seenQ[q] = idx;
        }
      });

      state.importParsedItems = checkResults.map(function (r, idx) {
        var isInternalDup = dupInfoMap[idx] !== undefined;
        var isExistingDup = r.isDuplicate;
        var isDup = isExistingDup || isInternalDup;
        var dupType = isExistingDup ? 'existing' : (isInternalDup ? 'internal' : null);
        var firstIndex = isInternalDup ? dupInfoMap[idx].firstIndex : null;
        return {
          index: idx,
          item: r.item,
          isDuplicate: isDup,
          dupType: dupType,
          existingItem: r.existingItem,
          firstIndex: firstIndex,
          internalDupIndices: firstOccurrenceIndices[idx] || [],
          checked: !isDup
        };
      });

      this.renderPreview();
    },

    renderPreview: function () {
      elements.importPreviewSection.style.display = 'block';
      elements.importNoPreview.style.display = 'none';

      var total = state.importParsedItems.length;
      var existingDupCount = state.importParsedItems.filter(function (r) { return r.dupType === 'existing'; }).length;
      var internalDupCount = state.importParsedItems.filter(function (r) { return r.dupType === 'internal'; }).length;
      var dupCount = existingDupCount + internalDupCount;
      var newCount = total - dupCount;

      var statsHtml =
        '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">新增 ' + newCount + ' 条</span>';
      if (existingDupCount > 0) {
        statsHtml += '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">已有重复 ' + existingDupCount + ' 条</span>';
      }
      if (internalDupCount > 0) {
        statsHtml += '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium">同批重复 ' + internalDupCount + ' 条</span>';
      }
      statsHtml += '<span class="text-slate-500">共 ' + total + ' 条</span>';

      elements.importStats.innerHTML = statsHtml;

      var tbody = elements.importPreviewBody;
      tbody.innerHTML = '';

      state.importParsedItems.forEach(function (row) {
        var tr = document.createElement('tr');
        if (row.isDuplicate) tr.className = 'import-dup-row';

        var k = row.item;
        tr.innerHTML =
          '<td class="text-center"><input type="checkbox" class="import-item-check" data-idx="' + row.index + '"' + (row.checked ? ' checked' : '') + (row.isDuplicate ? ' disabled' : '') + '/></td>' +
          '<td class="text-slate-800">' + Utils.escapeHtml(k.standardQ) + '</td>' +
          '<td class="text-subtle text-sm">' + Utils.escapeHtml((k.similarQs || []).join('；')) + '</td>' +
          '<td class="text-charcoal max-w-xs truncate" title="' + Utils.escapeHtml(k.answer) + '">' + Utils.escapeHtml(k.answer) + '</td>' +
          '<td>' + (row.isDuplicate
            ? (row.dupType === 'internal'
              ? '<span class="import-badge-intdup" title="与第 ' + (row.firstIndex + 1) + ' 条标准问相同，同批重复">同批重复</span>'
              : '<span class="import-badge-dup" title="已有相同标准问：' + Utils.escapeHtml((row.existingItem || {}).standardQ || '') + '">已有重复</span>')
            : '<span class="import-badge-new">新增</span>') + '</td>';

        tbody.appendChild(tr);
      });

      var nonDupItems = state.importParsedItems.filter(function (r) { return !r.isDuplicate; });
      elements.importSelectAll.checked = nonDupItems.length > 0 && nonDupItems.every(function (r) { return r.checked; });
      this.updateSelectedCount();
      this.bindPreviewEvents();
    },

    bindPreviewEvents: function () {
      var self = this;
      elements.importPreviewBody.querySelectorAll('.import-item-check').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var idx = parseInt(cb.dataset.idx, 10);
          state.importParsedItems[idx].checked = cb.checked;
          self.updateSelectedCount();
          var nonDupItems = state.importParsedItems.filter(function (r) { return !r.isDuplicate; });
          elements.importSelectAll.checked = nonDupItems.length > 0 && nonDupItems.every(function (r) { return r.checked; });
        });
      });

      elements.importSelectAll.onchange = function () {
        var checked = elements.importSelectAll.checked;
        state.importParsedItems.forEach(function (r) {
          if (!r.isDuplicate) r.checked = checked;
        });
        elements.importPreviewBody.querySelectorAll('.import-item-check').forEach(function (cb) {
          var idx = parseInt(cb.dataset.idx, 10);
          if (!state.importParsedItems[idx].isDuplicate) {
            cb.checked = checked;
          }
        });
        self.updateSelectedCount();
      };
    },

    updateSelectedCount: function () {
      var selected = state.importParsedItems.filter(function (r) { return r.checked; }).length;
      var newSelected = state.importParsedItems.filter(function (r) { return r.checked && !r.isDuplicate; }).length;
      var parts = ['已选 ' + selected + ' 条'];
      if (newSelected > 0) parts.push('新增 ' + newSelected);
      elements.importSelectedCount.textContent = parts.join('，');
    },

    doImport: function () {
      var merchantId = elements.importMerchantSelect.value;
      if (!merchantId) {
        Toast.show('请选择商家', 'error');
        return;
      }

      var items = state.importParsedItems
        .filter(function (r) { return r.checked && !r.isDuplicate; })
        .map(function (r) { return r.item; });

      if (items.length === 0) {
        Toast.show('没有可导入的新知识（重复内容已被自动跳过）', 'error');
        return;
      }

      MockStore.batchAddMerchantKnowledge(merchantId, items);
      this.closeModal();
      state.currentMerchantId = merchantId;
      elements.merchantSelect.value = merchantId;
      MerchantManager.fillSelect();
      KnowledgeManager.fillFormSelect();
      KnowledgeManager.render();
      Toast.show('成功导入 ' + items.length + ' 条知识', 'success');
    }
  };

  // ====================== 事件绑定 ======================
  function bindEvents() {
    // 商家相关
    elements.btnAddMerchant.addEventListener('click', function () {
      MerchantManager.openModal();
    });
    elements.merchantModalCancel.addEventListener('click', function () {
      MerchantManager.closeModal();
    });
    elements.merchantModalSubmit.addEventListener('click', function () {
      MerchantManager.save();
    });
    Modal.bindOverlayClose(elements.merchantModal, function () {
      MerchantManager.closeModal();
    });

    // 知识相关
    elements.merchantSelect.addEventListener('change', function () {
      state.currentMerchantId = elements.merchantSelect.value || '';
      KnowledgeManager.render();
    });
    elements.btnAddKnowledge.addEventListener('click', function () {
      KnowledgeManager.openModal();
    });
    elements.knowledgeModalCancel.addEventListener('click', function () {
      KnowledgeManager.closeModal();
    });
    elements.knowledgeModalSubmit.addEventListener('click', function () {
      KnowledgeManager.save();
    });
    Modal.bindOverlayClose(elements.knowledgeModal, function () {
      KnowledgeManager.closeModal();
    });

    // 批量导入相关
    elements.btnAddKnowledge.parentElement.querySelector('#btnBatchImport').addEventListener('click', function () {
      BatchImportManager.openModal();
    });
    elements.importTabFile.addEventListener('click', function () {
      BatchImportManager.switchTab('file');
    });
    elements.importTabText.addEventListener('click', function () {
      BatchImportManager.switchTab('text');
    });
    elements.importFileZone.addEventListener('click', function () {
      elements.importFileInput.click();
    });
    elements.importFileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        BatchImportManager.handleFileSelect(this.files[0]);
      }
    });
    elements.importFileZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.add('import-file-zone-active');
    });
    elements.importFileZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('import-file-zone-active');
    });
    elements.importFileZone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('import-file-zone-active');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        BatchImportManager.handleFileSelect(e.dataTransfer.files[0]);
      }
    });
    elements.btnParseImport.addEventListener('click', function () {
      BatchImportManager.parseContent();
    });
    elements.importModalCancel.addEventListener('click', function () {
      BatchImportManager.closeModal();
    });
    elements.importModalCancelNoPreview.addEventListener('click', function () {
      BatchImportManager.closeModal();
    });
    elements.importModalSubmit.addEventListener('click', function () {
      BatchImportManager.doImport();
    });
    Modal.bindOverlayClose(elements.batchImportModal, function () {
      BatchImportManager.closeModal();
    });
  }

  // ====================== 初始化 ======================
  function init() {
    cacheElements();
    bindEvents();
    MerchantManager.render();
    // 支持从知识分布分析页带 merchantId 跳转后预选商家
    var presetMerchantId = new URLSearchParams(global.location.search).get('merchantId');
    if (presetMerchantId && state.merchants.some(function (m) { return m.id === presetMerchantId; })) {
      state.currentMerchantId = presetMerchantId;
    }
    MerchantManager.fillSelect();
    KnowledgeManager.render();
  }

  // ====================== 导出模块 ======================
  global.MerchantPage = {
    init: init,
    state: state,
    MerchantManager: MerchantManager,
    KnowledgeManager: KnowledgeManager,
    BatchImportManager: BatchImportManager
  };

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
