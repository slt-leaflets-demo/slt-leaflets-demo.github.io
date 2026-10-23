/* Leaflet page: the address every leaflet QR code points to (l/?id=SW-001).
   Looks the ID up in the catalogue and offers the current PDF. */
(function () {
  'use strict';
  var SLT = window.SLT;
  var esc = SLT.esc;
  var box = SLT.$('#leaflet');

  // Accept ?id=SW-001 and also a bare ?SW-001 or ?sw001
  var raw = SLT.param('id') || window.location.search.replace(/^\?/, '').split('&')[0];
  var id = SLT.normaliseId(raw);

  SLT.load().then(function (d) {
    SLT.applySite(d.site);
    var lf = id ? d.byId[id] : null;
    if (!lf) return notFound(d, raw);
    if (!SLT.isActive(lf)) return withdrawn(d, lf);
    show(d, lf);
  }).catch(function (err) { SLT.fail(box, err); });

  function show(d, lf) {
    var topic = SLT.topic(d.tax, lf.topic);
    var file = SLT.fileUrl(lf);
    document.title = lf.title + ' - ' + (d.site.siteName || 'Leaflets');
    box.innerHTML =
      '<h1>' + esc(lf.title) + '</h1>' +
      (lf.summary ? '<p class="lede">' + esc(lf.summary) + '</p>' : '') +
      '<div class="leaflet-actions button-row">' +
      '<a class="button" id="open-pdf" href="' + esc(file) + '">Open the leaflet</a>' +
      '<a class="button button--secondary" id="save-pdf" href="' + esc(file) + '" download="' +
      esc(SLT.downloadName(lf)) + '">Save to this phone</a>' +
      '</div>' +
      '<p class="muted small">The leaflet is a PDF document. ' +
      (SLT.offlineSupported() ? 'Once you have opened it, you can usually read it again on this phone without signal.' : '') +
      '</p>' +
      '<div class="card">' +
      '<p><strong>Leaflet code:</strong> <span class="code-badge">' + esc(lf.id) + '</span></p>' +
      '<p><strong>For:</strong> ' + esc(lf.audience.join(', ')) + '</p>' +
      (lf.format && lf.format !== 'Standard' ? '<p><strong>Format:</strong> ' + esc(lf.format) + '</p>' : '') +
      '<p style="margin:0"><strong>Topic:</strong> <a href="' + esc(SLT.url('?topic=' + lf.topic)) + '">' +
      esc(topic.patient_label) + '</a></p>' +
      '</div>' +
      '<p><a href="' + esc(SLT.url('')) + '">See all our leaflets</a></p>';

    SLT.recent.add([lf.id]);
    // Keep a copy for offline reading as soon as they choose to open or save it
    var keep = function () { SLT.keepOffline([file]); };
    SLT.$('#open-pdf').addEventListener('click', keep);
    SLT.$('#save-pdf').addEventListener('click', keep);
  }

  function withdrawn(d, lf) {
    var topic = SLT.topic(d.tax, lf.topic);
    document.title = 'Leaflet no longer available - ' + (d.site.siteName || 'Leaflets');
    box.innerHTML =
      '<h1>This leaflet is no longer available</h1>' +
      '<div class="panel panel--warning"><p>The leaflet <strong>' + esc(lf.title) + '</strong> (' + esc(lf.id) +
      ') has been withdrawn.</p><p style="margin:0">Please ask your speech and language therapist for up-to-date information.</p></div>' +
      '<p><a href="' + esc(SLT.url('?topic=' + lf.topic)) + '">See other leaflets about ' + esc(topic.patient_label.toLowerCase()) + '</a></p>' +
      '<p><a href="' + esc(SLT.url('')) + '">See all our leaflets</a></p>';
  }

  function notFound(d, rawCode) {
    document.title = 'Leaflet not found - ' + (d.site.siteName || 'Leaflets');
    box.innerHTML =
      '<h1>We could not find that leaflet</h1>' +
      (rawCode ? '<p>There is no leaflet with the code <strong>' + esc(rawCode) + '</strong>.</p>' : '') +
      '<p>Check the code and try again. Codes are 2 letters and 3 numbers, for example SW-001.</p>' +
      '<form id="code-form" class="inline-form" novalidate>' +
      '<label for="code-input" class="visually-hidden">Leaflet code</label>' +
      '<input type="text" id="code-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="For example SW-001">' +
      '<button type="submit" class="button">Open leaflet</button></form>' +
      '<p style="margin-top:24px"><a href="' + esc(SLT.url('')) + '">See all our leaflets</a></p>';
    SLT.$('#code-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var next = SLT.normaliseId(SLT.$('#code-input').value);
      if (next) window.location.href = SLT.url(SLT.leafletPath(next));
      else SLT.$('#code-input').focus();
    });
  }
})();
