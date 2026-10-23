/* Patient pack: one QR code for several leaflets (p/?ids=SW-001.VO-002).
   The address holds leaflet codes only. Nothing about the patient is in it or stored anywhere. */
(function () {
  'use strict';
  var SLT = window.SLT;
  var esc = SLT.esc;
  var box = SLT.$('#pack');

  SLT.load().then(function (d) {
    SLT.applySite(d.site);
    var max = Number(d.site.maxPackSize || 10);
    var ids = [];
    String(SLT.param('ids') || '').split(/[.,\s]+/).forEach(function (part) {
      var id = SLT.normaliseId(part);
      if (id && ids.indexOf(id) === -1 && ids.length < max) ids.push(id);
    });
    var found = ids.map(function (id) { return d.byId[id]; }).filter(Boolean);
    var available = found.filter(SLT.isActive);
    var gone = found.filter(function (lf) { return !SLT.isActive(lf); });
    var unknown = ids.filter(function (id) { return !d.byId[id]; });

    if (!available.length) {
      box.innerHTML = '<h1>We could not find these leaflets</h1>' +
        '<p>Please ask your speech and language therapist, or look through all our leaflets.</p>' +
        '<p><a class="button" href="' + esc(SLT.url('')) + '">See all our leaflets</a></p>';
      return;
    }

    var html = '<h1>Your leaflets</h1>' +
      '<p class="lede">Your therapist chose ' + (available.length === 1 ? 'this leaflet' : 'these ' + available.length + ' leaflets') +
      ' for you. Open them to read now, or save them to your phone.</p>' +
      '<ul class="leaflet-list">';
    available.forEach(function (lf, i) {
      var file = SLT.fileUrl(lf);
      html += '<li><h2 class="h3">' + esc(lf.title) + '</h2>' +
        (lf.summary ? '<p>' + esc(lf.summary) + '</p>' : '') +
        '<div class="button-row" style="margin-top:12px">' +
        '<a class="button button--small keep" href="' + esc(file) + '" aria-label="Open: ' + esc(lf.title) + '">Open</a>' +
        '<a class="button button--secondary button--small keep" href="' + esc(file) + '" download="' +
        esc(SLT.downloadName(lf)) + '" aria-label="Save to phone: ' + esc(lf.title) + '">Save to phone</a>' +
        '</div><p class="meta">Leaflet code ' + esc(lf.id) + '</p></li>';
    });
    html += '</ul>';

    if (gone.length || unknown.length) {
      var n = gone.length + unknown.length;
      html += '<div class="panel panel--warning"><p style="margin:0">' +
        (n === 1 ? 'One leaflet is' : n + ' leaflets are') +
        ' no longer available (' + esc(gone.map(function (l) { return l.id; }).concat(unknown).join(', ')) + '). ' +
        'Please ask your therapist for up-to-date information.</p></div>';
    }

    if (SLT.offlineSupported()) {
      html += '<div class="card"><h2 class="h3">Read them without signal</h2>' +
        '<p>Save a copy of all these leaflets in this phone\'s browser so you can read them later, even with no internet.</p>' +
        '<button type="button" class="button button--secondary" id="keep-all">Keep these leaflets on this phone</button>' +
        '<p id="keep-status" class="small" aria-live="polite"></p></div>';
    }

    html += '<p>To come back to these leaflets, bookmark this page or <a href="' + esc(SLT.url('')) +
      '">add our leaflet library to your home screen</a>.</p>';
    box.innerHTML = html;

    SLT.recent.add(available.map(function (lf) { return lf.id; }));

    var links = box.querySelectorAll('a.keep');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) { SLT.keepOffline([e.currentTarget.getAttribute('href')]); });
    }
    var keepAll = SLT.$('#keep-all');
    if (keepAll) {
      keepAll.addEventListener('click', function () {
        var status = SLT.$('#keep-status');
        keepAll.disabled = true;
        status.textContent = 'Saving...';
        SLT.keepOffline(available.map(SLT.fileUrl)).then(function (count) {
          status.textContent = count === available.length
            ? 'Done. These leaflets are saved on this phone.'
            : 'Saved ' + count + ' of ' + available.length + '. Check your connection and try again.';
          keepAll.disabled = false;
        });
      });
    }
  }).catch(function (err) { SLT.fail(box, err); });
})();
