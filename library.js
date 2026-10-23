/* Patient library: search, browse by topic, filter by audience, code entry, recently opened. */
(function () {
  'use strict';
  var SLT = window.SLT;
  var $ = SLT.$;
  var esc = SLT.esc;
  var state = { query: '', audience: 'all', topic: '' };
  var data = null;

  /* Code entry works even before the catalogue has loaded */
  $('#code-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#code-input');
    var id = SLT.normaliseId(input.value);
    var err = $('#code-error');
    if (!id) {
      err.textContent = 'Codes are 2 letters and 3 numbers, for example SW-001.';
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    err.hidden = true;
    input.removeAttribute('aria-invalid');
    window.location.href = SLT.url(SLT.leafletPath(id));
  });

  SLT.load().then(function (d) {
    data = d;
    SLT.applySite(d.site);
    var topicParam = (SLT.param('topic') || '').toUpperCase();
    var known = (d.tax.topics || []).some(function (t) { return t.code === topicParam; });
    state.topic = known ? topicParam : '';
    buildAudience();
    $('#search').addEventListener('input', function (e) { state.query = e.target.value; render(); });
    $('#recent-clear').addEventListener('click', function () {
      SLT.recent.clear();
      renderRecent();
      $('#status').textContent = 'List cleared.';
    });
    render();
    renderRecent();
  }).catch(function (err) { SLT.fail($('#browse'), err); });

  function active() {
    return data.leaflets.filter(function (lf) {
      if (!SLT.isActive(lf)) return false;
      if (state.audience === 'all') return true;
      return lf.audience.indexOf(state.audience) !== -1 || lf.audience.indexOf('Everyone') !== -1;
    });
  }

  function buildAudience() {
    var opts = [{ value: 'all', label: 'Everyone' }].concat(
      (data.tax.audiences || []).filter(function (a) { return a.value !== 'Everyone'; })
        .map(function (a) { return { value: a.value, label: shortAudience(a.value) }; }));
    $('#audience-group').innerHTML = opts.map(function (o, i) {
      return '<label class="choice"><input type="radio" name="audience" value="' + esc(o.value) + '"' +
        (i === 0 ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>';
    }).join('');
    $('#audience-group').addEventListener('change', function (e) {
      state.audience = e.target.value;
      render();
    });
  }

  function shortAudience(value) {
    if (value === 'Children') return 'Children (for parents and carers)';
    return value;
  }

  function leafletItem(lf, level) {
    var h = 'h' + (level || 4);
    var badges = lf.format && lf.format !== 'Standard' ? ' <span class="tag tag--format">' + esc(lf.format) + '</span>' : '';
    return '<li><' + h + '><a href="' + esc(SLT.url(SLT.leafletPath(lf.id))) + '">' + esc(lf.title) + '</a></' + h + '>' +
      (lf.summary ? '<p>' + esc(lf.summary) + '</p>' : '') +
      '<p class="meta">For: ' + esc(lf.audience.join(', ')) + badges + '</p></li>';
  }

  function render() {
    var list = active();
    var out = '';
    var q = state.query.trim();

    if (q) {
      var found = SLT.search(list, q, data.tax);
      out += '<h3>' + found.length + (found.length === 1 ? ' leaflet' : ' leaflets') + ' found</h3>';
      out += found.length ? '<ul class="leaflet-list">' + found.map(function (lf) { return leafletItem(lf, 4); }).join('') + '</ul>'
        : '<p>No leaflets match your search. Try a different word, or browse by topic below.</p>';
      $('#status').textContent = found.length + ' leaflets found';
      if (!found.length) out += topicGrid(list);
    } else if (state.topic) {
      var t = SLT.topic(data.tax, state.topic);
      var inTopic = list.filter(function (lf) { return lf.topic === state.topic; });
      out += '<p><a href="./">&larr; All topics</a></p>';
      out += '<h3>' + esc(t.patient_label) + '</h3>';
      out += inTopic.length ? '<ul class="leaflet-list">' + inTopic.map(function (lf) { return leafletItem(lf, 4); }).join('') + '</ul>'
        : '<p>There are no leaflets on this topic for the group you chose. Try choosing "Everyone".</p>';
      $('#status').textContent = inTopic.length + ' leaflets about ' + t.patient_label;
    } else {
      out += topicGrid(list);
      $('#status').textContent = '';
    }
    $('#browse').innerHTML = out;
  }

  function topicGrid(list) {
    var html = '<h3>Browse by topic</h3><ul class="topic-grid">';
    (data.tax.topics || []).forEach(function (t) {
      var n = list.filter(function (lf) { return lf.topic === t.code; }).length;
      if (!n) return;
      html += '<li><a class="topic-card" href="?topic=' + esc(t.code) + '"><strong>' + esc(t.patient_label) +
        '</strong><span>' + n + (n === 1 ? ' leaflet' : ' leaflets') + '</span></a></li>';
    });
    return html + '</ul>';
  }

  function renderRecent() {
    var ids = SLT.recent.get();
    var items = ids.map(function (id) { return data.byId[id]; }).filter(Boolean);
    var section = $('#recent-section');
    if (!items.length) { section.hidden = true; return; }
    section.hidden = false;
    $('#recent-list').innerHTML = items.map(function (lf) {
      if (!SLT.isActive(lf)) {
        return '<li><h3>' + esc(lf.title) + '</h3><p class="meta"><span class="tag tag--withdrawn">No longer available</span> ' +
          'Ask your therapist for up-to-date information.</p></li>';
      }
      return leafletItem(lf, 3);
    }).join('');
  }
})();
