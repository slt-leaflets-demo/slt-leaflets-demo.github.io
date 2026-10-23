/* Staff leaflet finder: filters, patient pack, QR codes, review dates and catalogue check.
   The pack lives only in this page's memory and is cleared when the page closes. */
(function () {
  'use strict';
  var SLT = window.SLT;
  var $ = SLT.$;
  var esc = SLT.esc;
  var data = null;
  var picked = [];          // leaflet IDs for the current patient, in the order chosen
  var lastTrigger = null;   // where focus goes back to when the QR dialog closes

  SLT.load().then(function (d) {
    data = d;
    SLT.applySite(d.site);
    if (d.site.editUrl) $('#edit-link').href = d.site.editUrl;
    warnings();
    buildFilters();
    render();
    renderTray();
    renderReview();
    $('#check-panel').addEventListener('toggle', function () { if ($('#check-panel').open) runChecks(); });
    $('#check-summary').textContent = 'Catalogue check (' + quickProblems().length + ' problems found without checking files)';
  }).catch(function (err) { SLT.fail($('#results'), err); });

  /* ---------- warnings ---------- */
  function warnings() {
    var out = '';
    var base = SLT.publicBase(data.site);
    var here = new URL(SLT.root, window.location.href).href;
    if (base !== here) {
      out += '<div class="panel panel--warning"><p style="margin:0"><strong>Check the web address.</strong> QR codes made on this page point to <strong>' +
        esc(base) + '</strong>, but you are viewing the site at <strong>' + esc(here) + '</strong>. ' +
        'That is expected when previewing. If the site has moved, update "Public web address" in Site settings.</p></div>';
    }
    $('#warnings').innerHTML = out;
  }

  /* ---------- filters ---------- */
  function uniq(list) {
    var seen = {};
    return list.filter(function (v) { if (!v || seen[v]) return false; seen[v] = true; return true; });
  }

  function fill(sel, allLabel, options) {
    $(sel).innerHTML = '<option value="">' + esc(allLabel) + '</option>' + options.map(function (o) {
      return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>';
    }).join('');
  }

  function buildFilters() {
    var tax = data.tax;
    var L = data.leaflets;
    fill('#f-topic', 'All topics', (tax.topics || []).map(function (t) { return { value: t.code, label: t.label }; }));
    fill('#f-audience', 'All audiences', uniq((tax.audiences || []).map(function (a) { return a.value; })
      .concat([].concat.apply([], L.map(function (l) { return l.audience; })))).map(asOpt));
    fill('#f-type', 'All types', uniq((tax.types || []).concat(L.map(function (l) { return l.type; }))).map(asOpt));
    fill('#f-format', 'All formats', uniq((tax.formats || []).concat(L.map(function (l) { return l.format; }))).map(asOpt));
    fill('#f-condition', 'All conditions', uniq((tax.conditions || [])
      .concat([].concat.apply([], L.map(function (l) { return l.conditions; })))).map(asOpt));
    ['#f-search', '#f-topic', '#f-audience', '#f-type', '#f-format', '#f-condition', '#f-withdrawn'].forEach(function (s) {
      $(s).addEventListener(s === '#f-search' ? 'input' : 'change', render);
    });
    $('#f-clear').addEventListener('click', function () {
      $('#filters').reset();
      $('#f-withdrawn').checked = false;
      render();
      $('#f-search').focus();
    });
    $('#results').addEventListener('change', function (e) {
      if (e.target.matches('input[data-id]')) toggle(e.target.getAttribute('data-id'), e.target.checked);
    });
    $('#results').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-qr]');
      if (btn) showQr([btn.getAttribute('data-qr')], btn);
    });
    $('#tray-list').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-remove]');
      if (btn) { toggle(btn.getAttribute('data-remove'), false); render(); $('#tray-heading').focus(); }
    });
    $('#show-pack').addEventListener('click', function (e) { showQr(picked.slice(), e.currentTarget); });
    $('#clear-pack').addEventListener('click', function () {
      picked = [];
      render();
      renderTray();
      $('#tray-status').textContent = 'Cleared. Ready for the next patient.';
      $('#f-search').focus();
    });
    $('#qr-close').addEventListener('click', closeQr);
    $('#qr-dialog').addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
    $('#qr-print').addEventListener('click', function () {
      document.body.classList.add('printing-slip');
      window.print();
    });
    window.addEventListener('afterprint', function () { document.body.classList.remove('printing-slip'); });
  }

  function asOpt(v) { return { value: v, label: v }; }

  function filtered() {
    var f = {
      q: $('#f-search').value, topic: $('#f-topic').value, audience: $('#f-audience').value,
      type: $('#f-type').value, format: $('#f-format').value, condition: $('#f-condition').value,
      withdrawn: $('#f-withdrawn').checked
    };
    var list = data.leaflets.filter(function (lf) {
      if (!f.withdrawn && !SLT.isActive(lf)) return false;
      if (f.topic && lf.topic !== f.topic) return false;
      if (f.audience && lf.audience.indexOf(f.audience) === -1) return false;
      if (f.type && lf.type !== f.type) return false;
      if (f.format && lf.format !== f.format) return false;
      if (f.condition && lf.conditions.indexOf(f.condition) === -1) return false;
      return true;
    });
    return SLT.search(list, f.q, data.tax);
  }

  /* ---------- results ---------- */
  function reviewTag(lf) {
    var s = SLT.reviewState(lf, data.site);
    if (s === 'overdue') return '<span class="tag tag--overdue">Review overdue (' + esc(SLT.niceDate(lf.review_date)) + ')</span>';
    if (s === 'due-soon') return '<span class="tag tag--due-soon">Review due ' + esc(SLT.niceDate(lf.review_date)) + '</span>';
    if (s === 'withdrawn') return '<span class="tag tag--withdrawn">Withdrawn</span>';
    if (s === 'missing') return '<span class="tag tag--overdue">No review date</span>';
    return '';
  }

  function render() {
    var list = filtered();
    $('#results-count').textContent = list.length + (list.length === 1 ? ' leaflet' : ' leaflets');
    if (!list.length) {
      $('#results').innerHTML = '<li>No leaflets match. Try fewer words or clear the filters.</li>';
      return;
    }
    $('#results').innerHTML = list.map(function (lf) {
      var on = picked.indexOf(lf.id) !== -1;
      var active = SLT.isActive(lf);
      var topic = SLT.topic(data.tax, lf.topic);
      var tags = '<span class="tag">' + esc(topic.label) + '</span><span class="tag">' + esc(lf.type || '') + '</span>' +
        (lf.format && lf.format !== 'Standard' ? '<span class="tag tag--format">' + esc(lf.format) + '</span>' : '') +
        lf.conditions.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + reviewTag(lf);
      return '<li class="staff-result' + (on ? ' is-picked' : '') + '">' +
        '<div class="pick">' + (active ? '<input type="checkbox" id="pick-' + esc(lf.id) + '" data-id="' + esc(lf.id) + '"' +
          (on ? ' checked' : '') + '>' : '') + '</div>' +
        '<div><h3>' + (active ? '<label for="pick-' + esc(lf.id) + '" style="font-weight:bold;margin:0;cursor:pointer">' +
          '<span class="visually-hidden">Add to patient pack: </span>' : '') +
          esc(lf.id) + ' &nbsp;' + esc(lf.title) + (active ? '</label>' : '') + '</h3>' +
        '<p class="meta">For: ' + esc(lf.audience.join(', ')) + '</p><p class="meta">' + tags + '</p></div>' +
        '<div class="actions">' +
        (active ? '<button type="button" class="button button--secondary button--small" data-qr="' + esc(lf.id) + '">QR code<span class="visually-hidden"> for ' + esc(lf.id) + '</span></button>' : '') +
        '<a class="button button--secondary button--small" href="' + esc(SLT.fileUrl(lf)) + '" target="_blank" rel="noopener">PDF<span class="visually-hidden"> of ' + esc(lf.id) + ' (opens in a new tab)</span></a>' +
        '<a class="button button--secondary button--small" href="' + esc(SLT.url(SLT.leafletPath(lf.id))) + '" target="_blank" rel="noopener">Patient page<span class="visually-hidden"> for ' + esc(lf.id) + ' (opens in a new tab)</span></a>' +
        '</div></li>';
    }).join('');
  }

  /* ---------- patient pack ---------- */
  function toggle(id, on) {
    var max = Number(data.site.maxPackSize || 10);
    var i = picked.indexOf(id);
    if (on && i === -1) {
      if (picked.length >= max) {
        $('#tray-status').textContent = 'A pack can hold up to ' + max + ' leaflets.';
        var box = document.getElementById('pick-' + id);
        if (box) box.checked = false;
        return;
      }
      picked.push(id);
    }
    if (!on && i !== -1) picked.splice(i, 1);
    var row = document.getElementById('pick-' + id);
    if (row) row.closest('li').classList.toggle('is-picked', on);
    $('#tray-status').textContent = '';
    renderTray();
  }

  function renderTray() {
    $('#tray-empty').hidden = picked.length > 0;
    $('#tray-list').innerHTML = picked.map(function (id) {
      var lf = data.byId[id];
      return '<li>' + esc(id) + ' ' + esc(lf ? lf.title : '') +
        ' <button type="button" class="linklike" data-remove="' + esc(id) + '">Remove<span class="visually-hidden"> ' + esc(id) + '</span></button></li>';
    }).join('');
    $('#show-pack').disabled = !picked.length;
    $('#clear-pack').disabled = !picked.length;
    $('#show-pack').textContent = picked.length > 1 ? 'Show one QR code for ' + picked.length + ' leaflets' : 'Show QR code';
  }

  /* ---------- QR dialog ---------- */
  function showQr(ids, trigger) {
    if (!ids.length) return;
    lastTrigger = trigger || null;
    var url = SLT.publicPackUrl(data.site, ids);
    $('#qr-title').textContent = ids.length === 1 ? 'Scan to open this leaflet' : 'Scan to open these ' + ids.length + ' leaflets';
    $('#qr-box').innerHTML = SLT.qrSvg(url, 'QR code for ' + ids.join(', '));
    $('#qr-list').innerHTML = ids.map(function (id) {
      var lf = data.byId[id];
      return '<li><strong>' + esc(id) + '</strong> ' + esc(lf ? lf.title : '') + '</li>';
    }).join('');
    $('#qr-host').textContent = SLT.displayHost(data.site);
    $('#qr-url').textContent = url;
    $('#qr-demo').hidden = !data.site.demo;
    var dlg = $('#qr-dialog');
    if (typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.setAttribute('open', '');
      dlg.scrollIntoView();
    }
    $('#qr-close').focus();
  }

  function closeQr() {
    var dlg = $('#qr-dialog');
    if (typeof dlg.close === 'function') dlg.close();
    else { dlg.removeAttribute('open'); if (lastTrigger) lastTrigger.focus(); }
  }

  /* ---------- review dates ---------- */
  function renderReview() {
    var flagged = data.leaflets.filter(function (lf) {
      var s = SLT.reviewState(lf, data.site);
      return s === 'overdue' || s === 'due-soon' || s === 'missing';
    }).sort(function (a, b) { return String(a.review_date).localeCompare(String(b.review_date)); });
    var overdue = flagged.filter(function (lf) { return SLT.reviewState(lf, data.site) !== 'due-soon'; }).length;
    var soon = flagged.length - overdue;
    $('#review-summary').textContent = 'Review dates: ' + overdue + ' overdue, ' + soon + ' due in the next ' +
      (data.site.dueSoonDays || 90) + ' days';
    if (!flagged.length) {
      $('#review-body').innerHTML = '<p>All leaflets are within their review date.</p>';
      return;
    }
    $('#review-body').innerHTML = '<table class="simple"><caption class="visually-hidden">Leaflets needing review</caption>' +
      '<thead><tr><th scope="col">Code</th><th scope="col">Title</th><th scope="col">Owner</th><th scope="col">Review date</th><th scope="col">Status</th></tr></thead><tbody>' +
      flagged.map(function (lf) {
        return '<tr><td>' + esc(lf.id) + '</td><td>' + esc(lf.title) + '</td><td>' + esc(lf.owner || 'Not set') + '</td><td>' +
          esc(lf.review_date ? SLT.niceDate(lf.review_date) : 'Not set') + '</td><td>' + reviewTag(lf) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- catalogue check ---------- */
  function quickProblems() {
    var p = [];
    var tax = data.tax;
    var topicCodes = (tax.topics || []).map(function (t) { return t.code; });
    var seen = {};
    data.leaflets.forEach(function (lf) {
      var label = lf.id || '(no code)';
      if (!/^[A-Z]{2}-\d{3}$/.test(lf.id)) p.push(label + ': the code is not in the form AB-123.');
      if (seen[lf.id]) p.push(label + ': this code is used by more than one leaflet.');
      seen[lf.id] = true;
      if (topicCodes.indexOf(lf.topic) === -1) p.push(label + ': unknown topic "' + lf.topic + '".');
      if (!lf.title) p.push(label + ': no title.');
      if (!lf.file) p.push(label + ': no PDF file chosen.');
      if (!lf.summary) p.push(label + ': no summary for the patient library.');
      if (!lf.audience.length) p.push(label + ': no audience chosen.');
      if (SLT.isActive(lf) && !/^\d{4}-\d{2}-\d{2}$/.test(String(lf.review_date || ''))) p.push(label + ': no review date.');
      lf.audience.forEach(function (a) {
        if ((tax.audiences || []).map(function (x) { return x.value; }).indexOf(a) === -1) p.push(label + ': audience "' + a + '" is not in the taxonomy.');
      });
      lf.conditions.forEach(function (c) {
        if ((tax.conditions || []).indexOf(c) === -1) p.push(label + ': condition "' + c + '" is not in the taxonomy.');
      });
    });
    return p;
  }

  function nextCodes() {
    var max = {};
    (data.tax.topics || []).forEach(function (t) { max[t.code] = 0; });
    data.leaflets.forEach(function (lf) {
      var m = /^([A-Z]{2})-(\d{3})$/.exec(lf.id);
      if (m) max[m[1]] = Math.max(max[m[1]] || 0, Number(m[2]));
    });
    return Object.keys(max).map(function (code) { return code + '-' + ('000' + (max[code] + 1)).slice(-3); });
  }

  var checking = false;
  function runChecks() {
    if (checking) return;
    checking = true;
    var body = $('#check-body');
    body.innerHTML = '<p>Checking every leaflet file&hellip;</p>';
    var problems = quickProblems();
    Promise.all(data.leaflets.filter(function (lf) { return lf.file; }).map(function (lf) {
      return fetch(SLT.fileUrl(lf), { method: 'HEAD', cache: 'no-cache' })
        .then(function (r) { return r.ok ? null : lf.id + ': the PDF file "' + lf.file + '" could not be found.'; })
        .catch(function () { return lf.id + ': could not check the PDF file (are you offline?).'; });
    })).then(function (fileProblems) {
      problems = problems.concat(fileProblems.filter(Boolean));
      var html = problems.length
        ? '<div class="panel panel--warning"><p><strong>' + problems.length + ' thing' + (problems.length === 1 ? '' : 's') +
          ' to look at:</strong></p><ul>' + problems.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'
        : '<div class="panel panel--success"><p style="margin:0"><strong>All ' + data.leaflets.length +
          ' leaflets checked.</strong> Every code is valid and unique, and every PDF file was found.</p></div>';
      html += '<p><strong>Next free code in each topic:</strong> ' + esc(nextCodes().join(', ')) + '</p>';
      body.innerHTML = html;
      $('#check-summary').textContent = 'Catalogue check: ' + (problems.length ? problems.length + ' to look at' : 'all clear');
      checking = false;
    });
  }
})();
