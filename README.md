# Speech and language therapy leaflet library (proof of concept)

A small, plain website that lets patients open and save SLT leaflets by scanning a QR code, and lets therapists find leaflets and make one QR code for several leaflets. It has no server, no database, no log-ins and collects no personal information.

**First time?** Follow [SETUP.md](SETUP.md).

## Day-to-day changes

Use the editor at app.pagescms.org (sign in with GitHub). Open **Leaflets** to add, replace or withdraw a leaflet, or **Site settings** for names, contact details and the public web address. Changes go live in about a minute.

## Pages

| Address | What it is |
|---|---|
| `/` | Patient library: search, topics, "Have a leaflet code?" box |
| `/l/?id=SW-001` | One leaflet. Every leaflet QR code points here |
| `/p/?ids=SW-001.VO-002` | Patient pack: several leaflets from one QR code |
| `/staff/` | Leaflet finder for staff, pack builder, review dates, catalogue check |
| `/staff/qr-sheet/` | Printable QR sheet. Add `?poster=home` for an A4 poster |
| `/about/` | Privacy and accessibility |

## Folders

| Folder or file | Contents |
|---|---|
| `data/catalogue.json` | Every leaflet's details (edited through Pages CMS) |
| `data/site.json` | Site settings, including the public web address used in QR codes |
| `data/taxonomy.json` | Topic names and other tag lists |
| `files/` | The PDF leaflets |
| `assets/` | Styles, scripts, icons and the QR code generator |
| `.pages.yml` | Pages CMS editor settings |
| `sw.js` | Keeps opened leaflets available offline |

## Moving to the trust's own web address

Copy all files to the new host, point the new address at it, then change **Public web address** in Site settings. Every QR code is made from that one setting.

## Credits

QR codes are drawn in the browser by qrcode-generator by Kazuhiko Arase (MIT licence, see the header of `assets/qrcode.js`). "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
