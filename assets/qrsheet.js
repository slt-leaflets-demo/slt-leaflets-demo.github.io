/* Printable QR sheet (all leaflets, grouped by topic) and a home page poster (?poster=home). */
(function () {
  'use strict';
  var SLT = window.SLT;
  var $ = SLT.$;
  var esc = SLT.esc;
  var data = null;
  var posterMode = SLT.param('poster') === 'home';

  SLT.load().then(function (d) {
    data = d;
    SLT.applySite(d.site);
    var base = SLT.publicBase(d.site);
    var here = new URL(SLT.root, window.location.href).href;
    if (base !== here) {
      $('#warnings').innerHTML = '<div class="panel panel--warning"><p style="margin:0">These QR codes point to <strong>' +
        esc(base) + '</strong>. You are viewing the site at <strong>' + esc(here) +
        '</strong>, which is expected when previewing. Check the address before printing for real use.</p></div>';
    }
    if (posterMode) {
      $('#controls').innerHTML = '<h1 class="h3">Home page poster</h1><p class="small">An A4 poster for the clinic room door or wall.</p>' +
        '<button type="button" class="button" id="s-print">Print poster</button> <a href="./">Back to the QR sheet</a>';
      $('#s-print').addEventListener('click', function () { window.print(); });
      renderPoster();
      return;
    }
    $('#s-topic').innerHTML = '<option value="">All topics</option>' + (d.tax.topics || []).map(function (t) {
      return '<option value="' + esc(t.code) + '">' + esc(t.label) + '</option>';
    }).join('');
    $('#s-topic').addEventListener('change', renderSheet);
    $('#s-home').addEventListener('change', renderSheet);
    $('#s-print').addEventListener('click', function () { window.print(); });
    renderSheet();
  }).catch(function (err) { SLT.fail($('#sheet'), err); });

  function header(title) {
    var site = data.site;
    return '<div class="sheet-header"><h2 style="margin-top:0">' + esc(title) + '</h2>' +
      '<p class="small" style="margin-bottom:4px">' + esc(site.organisation || '') + '</p>' +
      '<p class="small">Scan a code with your phone camera to open the leaflet. Or go to <strong>' +
      esc(SLT.displayHost(site)) + '</strong> and type the leaflet code.</p>' +
      (site.demo ? '<p class="sheet-demo">DEMONSTRATION ONLY: dummy leaflets, not clinical advice. Do not give to patients.</p>' : '') +
      '</div>';
  }

  function renderSheet() {
    var site = data.site;
    var topicFilter = $('#s-topic').value;
    var leaflets = data.leaflets.filter(SLT.isActive);
    var html = header(site.siteName || 'Leaflets');

    if ($('#s-home').checked) {
      html += '<div class="qr-grid" style="margin-bottom:12px"><div class="qr-card qr-card--home">' +
        SLT.qrSvg(SLT.publicBase(site), 'QR code for the leaflet library') +
        '<div><span class="qr-id">All our leaflets</span><span class="qr-title">Scan to browse every leaflet and save the library to your phone.</span></div></div></div>';
    }

    (data.tax.topics || []).forEach(function (t) {
      if (topicFilter && t.code !== topicFilter) return;
      var inTopic = leaflets.filter(function (lf) { return lf.topic === t.code; });
      if (!inTopic.length) return;
      html += '<section><h3 class="sheet-topic">' + esc(t.label) + '</h3><div class="qr-grid">' +
        inTopic.map(function (lf) {
          return '<div class="qr-card">' + SLT.qrSvg(SLT.publicLeafletUrl(site, lf.id), 'QR code for ' + lf.id) +
            '<span class="qr-id">' + esc(lf.id) + '</span><span class="qr-title">' + esc(lf.title) + '</span></div>';
        }).join('') + '</div></section>';
    });
    html += '<p class="small muted" style="margin-top:16px">Printed ' + esc(SLT.niceDate(SLT.todayIso())) + '.</p>';
    $('#sheet').innerHTML = html;
  }

  function renderPoster() {
    var site = data.site;
    $('#sheet').innerHTML = '<div class="poster">' +
      (site.demo ? '<p class="sheet-demo">DEMONSTRATION ONLY: dummy leaflets</p>' : '') +
      '<h2 style="font-size:2.4rem;margin-top:0">Our leaflets, on your phone</h2>' +
      '<p class="lede" style="color:var(--text)">' + esc(site.organisation || '') + '</p>' +
      SLT.qrSvg(SLT.publicBase(site), 'QR code for the leaflet library') +
      '<ol class="poster-steps" style="text-align:left;display:inline-block">' +
      '<li>Open your phone camera.</li><li>Point it at the square code.</li><li>Tap the link that appears.</li></ol>' +
      '<p style="font-size:1.5rem">Or go to <strong>' + esc(SLT.displayHost(site)) + '</strong></p>' +
      '<p class="small muted">No log-in. No app to install.</p></div>';
  }
})();
