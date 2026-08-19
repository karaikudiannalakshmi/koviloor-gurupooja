import { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import * as XLSX from "xlsx";
import { getFirestore, doc, setDoc, getDoc, getDocs, getDocsFromServer, deleteDoc, collection, writeBatch, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf4oElr0EPBYaDKF3b-6zmng_sUQGnlq0",
  authDomain: "koviloor-gurupooja.firebaseapp.com",
  projectId: "koviloor-gurupooja",
  storageBucket: "koviloor-gurupooja.firebasestorage.app",
  messagingSenderId: "34947744125",
  appId: "1:34947744125:web:9f49af02c63a86cb92cc14"
};
const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(fbApp);
const COL = "gurpooja_saints";

const MUTT = "கோவிலூர் மடாலயம்";
const YEAR_LABEL = "பராபவ வருஷம் 2026-27";
const ALERT_DAYS = 20;
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "Koviloor@07";

const TAMIL_MONTHS = ['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'];
const STARS = ['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const WEEKDAYS_TM = ['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'];

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getDate().toString().padStart(2,'0')}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getFullYear()} (${WEEKDAYS_TM[dt.getDay()]})`;
};
const daysUntil = (ds) => {
  if (!ds) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(ds+'T00:00:00') - today) / 86400000);
};
const alertDue = (ds) => {
  if (!ds) return null;
  const d = new Date(ds+'T00:00:00'); d.setDate(d.getDate()-ALERT_DAYS);
  return d.toISOString().split('T')[0];
};

const MONTH_STARTS = {
  'சித்திரை':new Date('2026-04-14'),'வைகாசி':new Date('2026-05-15'),
  'ஆனி':new Date('2026-06-15'),'ஆடி':new Date('2026-07-17'),
  'ஆவணி':new Date('2026-08-17'),'புரட்டாசி':new Date('2026-09-17'),
  'ஐப்பசி':new Date('2026-10-17'),'கார்த்திகை':new Date('2026-11-16'),
  'மார்கழி':new Date('2026-12-16'),'தை':new Date('2027-01-14'),
  'மாசி':new Date('2027-02-13'),'பங்குனி':new Date('2027-03-15'),
};
const getTamilDate = (dateStr, month) => {
  const d = new Date(dateStr+'T00:00:00');
  const s = MONTH_STARTS[month];
  return s ? (Math.round((d-s)/86400000)+1).toString() : '____';
};
const ENGLISH_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const generateLetter = (s) => {
  const dt = s.date ? new Date(s.date+'T00:00:00') : null;
  const weekday = dt ? WEEKDAYS_TM[dt.getDay()] : '______';
  const tamilDate = (s.date && s.tamilMonth) ? getTamilDate(s.date, s.tamilMonth) : '____';
  const engDate = dt ? `${dt.getDate()} ${ENGLISH_MONTHS[dt.getMonth()]} ${dt.getFullYear()}` : '';
  return `உ.\nசிவமயம்\nகோவிலூர் மடத்திலிருந்து எழுதிய திருமுகம்\nநிகழும் பராபவ ஆண்டு ${s.tamilMonth} மாதம் ${tamilDate}ம் நாள்\n( ${engDate} — ${weekday} )\n${s.star} நட்சத்திரத்தில்\nஸ்ரீல ஸ்ரீ ${s.name} அவர்களுக்கு\nகுருபூஜை நடைபெற இருப்பதால் தாங்கள் குடும்பத்துடன் வந்து தரிசித்துப்\nபேரானந்த பெருவாழ்வைப் பெற வேண்டியது.\n\nஸ்ரீ சற்குருநாதன் துணை`;
};

const ENGLISH_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const generateICS = (saints) => {
  const events = saints.filter(s => s.date && !s.isPublic);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Koviloor Madalayam//Guru Pooja 2026-27//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:கோவிலூர் குருபூஜை பராபவ 2026-27',
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];
  events.forEach(s => {
    const dt = new Date(s.date + 'T00:00:00');
    const next = new Date(dt); next.setDate(dt.getDate() + 1);
    const fmt = d => d.toISOString().replace(/-/g,'').split('T')[0];
    lines.push(
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:' + fmt(dt),
      'DTEND;VALUE=DATE:' + fmt(next),
      'SUMMARY:' + s.name + ' குருபூஜை',
      'DESCRIPTION:' + s.tamilMonth + ' மாதம் ' + s.star + ' நட்சத்திரம் | ' + s.pax + ' பேர் | பராபவ வருஷம்',
      'LOCATION:Koviloor Madalayam\, Sivaganga - 630108',
      'UID:gurpooja-' + s.id + '-parabava@koviloor',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

const downloadICS = (saints) => {
  const nonPublic = saints.filter(s => s.date && !s.isPublic);
  const ics = generateICS(saints);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'koviloor-gurpooja-2026-27.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert(nonPublic.length + ' events downloaded. Import in Google Calendar: Settings > Import & Export > Import');
};

const printSchedule = (saints) => {
  const sorted = [...saints].filter(s => s.date).sort((a, b) => a.date.localeCompare(b.date));
  const EM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const fmtD = (ds) => {
    const d = new Date(ds + 'T00:00:00');
    return d.getDate() + ' ' + EM[d.getMonth()] + ' ' + d.getFullYear() + ' (' + WD[d.getDay()] + ')';
  };
  const rows = sorted.map((s, i) => {
    const contacts = s.contacts ? s.contacts.length : 0;
    const pubBadge = s.isPublic ? ' [பொது]' : '';
    return [
      '<tr style="border-bottom:1px solid #e5e7eb;">',
      '<td style="padding:6px 8px;text-align:center;color:#9ca3af;font-size:12px;">' + (i + 1) + '</td>',
      '<td style="padding:6px 8px;white-space:nowrap;font-size:13px;">' + fmtD(s.date) + '</td>',
      '<td style="padding:6px 8px;font-size:12px;color:#6b7280;">' + s.tamilMonth + ' | ' + s.star + '</td>',
      '<td style="padding:6px 8px;font-weight:600;">' + s.name + pubBadge + '</td>',
      '<td style="padding:6px 8px;text-align:center;">' + s.pax + '</td>',
      '<td style="padding:6px 8px;text-align:center;color:' + (contacts > 0 ? '#16a34a' : '#dc2626') + ';">' + (contacts > 0 ? contacts + ' குடும்பம்' : '—') + '</td>',
      '</tr>'
    ].join('');
  }).join('');

  const css = [
    'body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }',
    'h1 { color: #92400e; margin-bottom: 4px; font-size: 18px; }',
    'h2 { color: #c05621; font-size: 13px; font-weight: normal; margin-bottom: 16px; }',
    'table { width: 100%; border-collapse: collapse; font-size: 13px; }',
    'th { background: #92400e; color: #fff; padding: 8px; text-align: left; }',
    'tr:nth-child(even) { background: #fff7ed; }',
    '.footer { margin-top: 16px; font-size: 11px; color: #9ca3af; }'
  ].join(' ');

  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>' + css + '</style></head><body>',
    '<h1>🙏 கோவிலூர் மடாலயம் — குருபூஜை அட்டவணை</h1>',
    '<h2>பராபவ வருஷம் 2026-27 | மொத்தம்: ' + sorted.length + ' குருபூஜைகள்</h2>',
    '<table><thead><tr>',
    '<th style="width:35px">#</th>',
    '<th>தேதி</th>',
    '<th>மாதம் | நட்சத்திரம்</th>',
    '<th>குரு / நிகழ்வு பெயர்</th>',
    '<th style="width:55px;text-align:center">பேர்</th>',
    '<th style="width:90px;text-align:center">அழைப்பு</th>',
    '</tr></thead><tbody>' + rows + '</tbody></table>',
    '<p class="footer">அச்சிடப்பட்டது: ' + new Date().toLocaleDateString('en-IN') + '</p>',
    '</body></html>'
  ].join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 600);
};

const exportToExcel = (saints) => {
  const sorted = [...saints].filter(s => s.date).sort((a, b) => a.date.localeCompare(b.date));
  const EM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Sheet 1: Full Schedule
  const scheduleData = sorted.map((s, i) => {
    const dt = new Date(s.date + 'T00:00:00');
    return {
      'வ.எண்': i + 1,
      'தேதி (Date)': s.date,
      'Day': WD[dt.getDay()],
      'English Date': dt.getDate() + ' ' + EM[dt.getMonth()] + ' ' + dt.getFullYear(),
      'Tamil Month': s.tamilMonth,
      'Nakshatra': s.star,
      'Guru / Event': s.name,
      'Expected Pax': s.pax,
      'Public': s.isPublic ? 'Yes' : 'No',
      'Contacts': s.contacts ? s.contacts.length : 0,
      'Notes': s.notes || ''
    };
  });

  // Sheet 2: Kitchen Planning — only events where invites are being sent (contacts > 0)
  const withInvites = sorted.filter(s => s.contacts && s.contacts.length > 0);
  const kitchenData = withInvites.map((s, i) => {
    const dt = new Date(s.date + 'T00:00:00');
    const contactNames = s.contacts.map(c => c.name).join(', ');
    return {
      'Date': s.date,
      'English Date': dt.getDate() + ' ' + EM[dt.getMonth()] + ' ' + dt.getFullYear(),
      'Day': WD[dt.getDay()],
      'Event Name': s.name + ' குருபூஜை',
      'Tamil Month': s.tamilMonth,
      'Nakshatra': s.star,
      'Pax': s.pax,
      'Meal Type': 'Lunch',
      'Invited Families': s.contacts.length,
      'Contact Names': contactNames,
      'Notes': s.notes || ''
    };
  });

  // Sheet 3: Month-wise summary
  const monthSummary = ['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி',
    'ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'].map(m => {
    const ms = sorted.filter(s => s.tamilMonth === m);
    return {
      'Tamil Month': m,
      'Events': ms.length,
      'Total Pax': ms.reduce((sum, s) => sum + (parseInt(s.pax) || 0), 0),
      'Public Events': ms.filter(s => s.isPublic).length,
      'Private Events': ms.filter(s => !s.isPublic).length
    };
  }).filter(r => r.Events > 0);

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(scheduleData);
  ws1['!cols'] = [
    {wch:6},{wch:12},{wch:12},{wch:20},{wch:14},{wch:16},{wch:40},{wch:10},{wch:8},{wch:10},{wch:30}
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'குருபூஜை அட்டவணை');

  const ws2 = XLSX.utils.json_to_sheet(kitchenData);
  ws2['!cols'] = [{wch:12},{wch:20},{wch:12},{wch:38},{wch:14},{wch:16},{wch:8},{wch:10},{wch:14},{wch:35},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Kitchen - With Invites (' + withInvites.length + ')');

  const ws3 = XLSX.utils.json_to_sheet(monthSummary);
  ws3['!cols'] = [{wch:14},{wch:8},{wch:12},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Month Summary');

  XLSX.writeFile(wb, 'Koviloor-GuruPooja-2026-27.xlsx');
};

const printLabels = (saints) => {
  // Only next 60 days, non-public, with contacts
  const today = new Date(); today.setHours(0,0,0,0);
  const in60 = new Date(today); in60.setDate(today.getDate() + 60);
  const labels = [];
  const sorted = [...saints]
    .filter(s => {
      if (!s.date || s.isPublic) return false;
      const d = new Date(s.date + 'T00:00:00');
      return d >= today && d <= in60;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const EM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  sorted.forEach(s => {
    if (!s.contacts || s.contacts.length === 0) return;
    s.contacts.forEach(c => {
      if (!c.name) return;
      const dt = new Date(s.date + 'T00:00:00');
      const dateStr = dt.getDate() + ' ' + EM[dt.getMonth()] + ' ' + dt.getFullYear();
      labels.push({
        toName: c.name,
        address: c.address || '',
        address2: c.address2 || '',
        phone: c.phone || '',
        guruName: s.name,
        date: dateStr,
        star: s.star,
        month: s.tamilMonth
      });
    });
  });

  if (labels.length === 0) {
    alert('அடுத்த 60 நாட்களில் தனிப்பட்ட (non-public) குருபூஜைகள் இல்லை, அல்லது முகவரி சேர்க்கப்படவில்லை.');
    return;
  }

  const labelHtml = labels.map((l, i) => {
    const addrLine = [l.address, l.address2].filter(Boolean).join(', ');
    return [
      '<div class="label">',
      '<div class="guru-ref">Re: ' + l.guruName + ' Guru Pooja — ' + l.date + '</div>',
      '<div class="to-line">To,</div>',
      '<div class="name">' + l.toName + '</div>',
      addrLine ? '<div class="addr">' + addrLine + '</div>' : '',
      '<div class="from-stamp">Koviloor Madalayam, Sivaganga - 630108</div>',
      '</div>'
    ].join('');
  }).join('');

  const css = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    'body { font-family: Arial, sans-serif; background: #fff; }',
    '.page { padding: 10mm; }',
    '.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }',
    '.label {',
    '  border: 1.5px solid #888;',
    '  border-radius: 4px;',
    '  padding: 10px 14px;',
    '  min-height: 65mm;',
    '  display: flex;',
    '  flex-direction: column;',
    '  justify-content: space-between;',
    '  page-break-inside: avoid;',
    '}',
    '.guru-ref { font-size: 10px; color: #888; border-bottom: 1px dotted #ccc; padding-bottom: 4px; margin-bottom: 8px; }',
    '.to-line { font-size: 13px; margin-bottom: 3px; }',
    '.name { font-size: 17px; font-weight: bold; margin-bottom: 6px; }',
    '.addr { font-size: 14px; line-height: 1.7; flex: 1; }',
    '.from-stamp { font-size: 11px; color: #555; border-top: 1px dotted #ccc; margin-top: 8px; padding-top: 4px; text-align: right; }',
    'h1 { font-size: 16px; margin-bottom: 8px; color: #92400e; }',
    'h2 { font-size: 12px; font-weight: normal; color: #666; margin-bottom: 6mm; }',
    '@media print {',
    '  .no-print { display: none; }',
    '  body { padding: 0; }',
    '  .page { padding: 8mm; }',
    '}'
  ].join(' ');

  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>' + css + '</style></head><body>',
    '<div class="page">',
    '<div class="no-print" style="margin-bottom:8px;display:flex;gap:8px;align-items:center;">',
    '<h1 style="margin:0;">🙏 Koviloor Madalayam — Address Labels (' + labels.length + ') — Next 60 Days</h1>',
    '<button onclick="window.print()" style="padding:6px 14px;background:#c05621;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">🖨 Print Labels</button>',
    '</div>',
    '<h2 class="no-print">பராபவ வருஷம் 2026-27 | ' + labels.length + ' labels | 3 per row</h2>',
    '<div class="grid">' + labelHtml + '</div>',
    '</div></body></html>'
  ].join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
};

const printAllLabels = (saints) => {
  // All non-public saints with contacts — full year
  const labels = [];
  const sorted = [...saints]
    .filter(s => s.date && !s.isPublic)
    .sort((a, b) => a.date.localeCompare(b.date));
  const EM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  sorted.forEach(s => {
    if (!s.contacts || s.contacts.length === 0) return;
    s.contacts.forEach(c => {
      if (!c.name) return;
      const dt = new Date(s.date + 'T00:00:00');
      const dateStr = dt.getDate() + ' ' + EM[dt.getMonth()] + ' ' + dt.getFullYear();
      labels.push({
        toName: c.name,
        address: c.address || '',
        address2: c.address2 || '',
        phone: c.phone || '',
        guruName: s.name,
        date: dateStr,
        star: s.star,
        month: s.tamilMonth
      });
    });
  });

  if (labels.length === 0) {
    alert('முகவரி உள்ள தொடர்புகள் இல்லை. குரு பட்டியலில் முகவரி சேர்க்கவும்.');
    return;
  }

  const labelHtml = labels.map((l, i) => {
    const addrLine = [l.address, l.address2].filter(Boolean).join(', ');
    return [
      '<div class="label">',
      '<div class="guru-ref">Re: ' + l.guruName + ' Guru Pooja — ' + l.date + '</div>',
      '<div class="to-line">To,</div>',
      '<div class="name">' + l.toName + '</div>',
      addrLine ? '<div class="addr">' + addrLine + '</div>' : '',
      '<div class="from-stamp">Koviloor Madalayam, Sivaganga - 630108</div>',
      '</div>'
    ].join('');
  }).join('');

  const css = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    'body { font-family: Arial, sans-serif; background: #fff; }',
    '.page { padding: 10mm; }',
    '.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }',
    '.label {',
    '  border: 1.5px solid #888;',
    '  border-radius: 4px;',
    '  padding: 10px 14px;',
    '  min-height: 65mm;',
    '  display: flex;',
    '  flex-direction: column;',
    '  justify-content: space-between;',
    '  page-break-inside: avoid;',
    '}',
    '.guru-ref { font-size: 10px; color: #888; border-bottom: 1px dotted #ccc; padding-bottom: 4px; margin-bottom: 8px; }',
    '.to-line { font-size: 13px; margin-bottom: 3px; }',
    '.name { font-size: 17px; font-weight: bold; margin-bottom: 6px; }',
    '.addr { font-size: 14px; line-height: 1.7; flex: 1; }',
    '.from-stamp { font-size: 11px; color: #555; border-top: 1px dotted #ccc; margin-top: 8px; padding-top: 4px; text-align: right; }',
    'h1 { font-size: 16px; margin-bottom: 8px; color: #92400e; }',
    'h2 { font-size: 12px; font-weight: normal; color: #666; margin-bottom: 6mm; }',
    '@media print {',
    '  .no-print { display: none; }',
    '  body { padding: 0; }',
    '  .page { padding: 8mm; }',
    '}'
  ].join(' ');

  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>' + css + '</style></head><body>',
    '<div class="page">',
    '<div class="no-print" style="margin-bottom:8px;display:flex;gap:8px;align-items:center;">',
    '<h1 style="margin:0;">🙏 Koviloor Madalayam — Address Labels (' + labels.length + ') — Full Year 2026-27</h1>',
    '<button onclick="window.print()" style="padding:6px 14px;background:#c05621;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">🖨 Print Labels</button>',
    '</div>',
    '<h2 class="no-print">பராபவ வருஷம் 2026-27 | ' + labels.length + ' labels | 3 per row</h2>',
    '<div class="grid">' + labelHtml + '</div>',
    '</div></body></html>'
  ].join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
};

const messageAll = (saints) => {
  // All non-public saints with contacts — full year
  const EM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const items = [];
  [...saints]
    .filter(s => s.date && !s.isPublic)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(s => {
      if (!s.contacts || s.contacts.length === 0) return;
      const dt = new Date(s.date + 'T00:00:00');
      const dateStr = dt.getDate() + ' ' + EM[dt.getMonth()] + ' ' + dt.getFullYear() + ' (' + WD[dt.getDay()] + ')';
      const letter = generateLetter(s);
      s.contacts.forEach(c => {
        if (!c.name) return;
        const phones = [c.phone, c.phone2, c.phone3, c.whatsapp].filter(Boolean);
        items.push({ c, s, dateStr, letter, phones });
      });
    });

  if (items.length === 0) {
    alert('தொடர்பு உள்ள குருபூஜைகள் இல்லை. முதலில் குரு பட்டியலில் குடும்ப தொடர்பு சேர்க்கவும்.');
    return;
  }

  const makeWALink = (phone, msg) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.length === 10 ? '91' + clean : clean;
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
  };

  const rows = items.map((item, i) => {
    const { c, s, dateStr, letter, phones } = item;
    const waLinks = phones.map(p =>
      '<a href="' + makeWALink(p, letter) + '" target="_blank" style="display:inline-block;background:#25D366;color:#fff;padding:5px 12px;border-radius:4px;text-decoration:none;font-size:12px;margin:2px;">📱 ' + p + '</a>'
    ).join(' ');
    const copyId = 'msg_' + i;
    return [
      '<div style="border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin-bottom:12px;background:#fff;">',
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">',
      '<div>',
      '<div style="font-weight:700;font-size:15px;">' + c.name + '</div>',
      '<div style="font-size:12px;color:#c05621;margin-top:2px;">📿 ' + s.name + ' — ' + dateStr + '</div>',
      c.address ? '<div style="font-size:12px;color:#6b7280;margin-top:2px;">📍 ' + c.address + '</div>' : '',
      '</div>',
      '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">',
      waLinks || '<span style="font-size:11px;color:#9ca3af;">தொலைபேசி இல்லை</span>',
      '<button onclick="navigator.clipboard.writeText(document.getElementById('' + copyId + '').value).then(()=>alert('Copied!'))" ',
      'style="margin-top:4px;padding:4px 10px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;font-size:11px;">📋 Copy Letter</button>',
      '</div>',
      '</div>',
      '<textarea id="' + copyId + '" style="width:100%;height:140px;font-size:12px;font-family:inherit;border:1px solid #e5e7eb;border-radius:4px;padding:8px;resize:vertical;background:#fffff8;">' + letter.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea>',
      '</div>'
    ].join('');
  }).join('');

  const css = [
    'body{font-family:Arial,sans-serif;background:#f9fafb;padding:16px;color:#1f2937;}',
    'h1{color:#92400e;font-size:17px;margin-bottom:4px;}',
    'h2{color:#666;font-size:12px;font-weight:normal;margin-bottom:16px;}',
    '.toolbar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}',
    '.btn{padding:7px 14px;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;}',
    '@media print{.no-print{display:none;}}'
  ].join('');

  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<style>' + css + '</style></head><body>',
    '<h1>🙏 Koviloor Madalayam — Message All Contacts</h1>',
    '<h2>பராபவ வருஷம் 2026-27 | முழு வருடம் | ' + items.length + ' தொடர்புகள்</h2>',
    '<div class="toolbar no-print">',
    '<span style="font-size:12px;color:#6b7280;align-self:center;">📱 WhatsApp link-ஐ click செய்தால் message அனுப்பலாம்</span>',
    '</div>',
    rows,
    '</body></html>'
  ].join('');

  const w = window.open('', '_blank', 'width=800,height=700');
  w.document.write(html);
  w.document.close();
};

const DEFAULT_SAINTS = [
  {id:'1',name:'திருநாவுக்கரசர்',tamilMonth:'சித்திரை',star:'சதயம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-04-14',alertSent:false,calAdded:false},
  {id:'2',name:'கோபாலப்ப ஐயா',tamilMonth:'சித்திரை',star:'உத்திரட்டாதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-04-16',alertSent:false,calAdded:false},
  {id:'3',name:'கோட்டையூர் அழகப்ப ஐயா',tamilMonth:'சித்திரை',star:'பரணி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-04-18',alertSent:false,calAdded:false},
  {id:'4',name:'மகா வேங்கடாசலம் ஐயா',tamilMonth:'சித்திரை',star:'கார்த்திகை',isPublic:false,pax:75,contacts:[],notes:'⚠ kshaya – பஞ்சாங்கம் உறுதிப்படுத்தவும்',date:'2026-04-19',alertSent:false,calAdded:false},
  {id:'5',name:'கொப்புடை அம்மன் தேர்',tamilMonth:'வைகாசி',star:'பூசம்',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-05-21',alertSent:false,calAdded:false},
  {id:'6',name:'கோட்டையூர் ஸ்ரீ சொக்கப்ப ஐயா',tamilMonth:'வைகாசி',star:'உத்திரம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-05-25',alertSent:false,calAdded:false},
  {id:'7',name:'கொத்தமங்கலம் ஸ்ரீ அருணாசல சுவாமிகள்',tamilMonth:'வைகாசி',star:'சுவாதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-05-28',alertSent:false,calAdded:false},
  {id:'8',name:'ஸ்ரீமத் திருக்களர் ஆண்டவர்',tamilMonth:'வைகாசி',star:'விசாகம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-05-30',alertSent:false,calAdded:false},
  {id:'9',name:'திருஞானசம்பந்தர்',tamilMonth:'வைகாசி',star:'மூலம்',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-06-02',alertSent:false,calAdded:false},
  {id:'10',name:'அண்ணாமலை ஞான தேசிகர் (6வது)',tamilMonth:'வைகாசி',star:'திருவோணம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-06-05',alertSent:false,calAdded:false},
  {id:'11',name:'ஸ்ரீமத் ராமநாத ஞான தேசிகர் (9வது)',tamilMonth:'ஆனி',star:'அனுஷம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-06-27',alertSent:false,calAdded:false},
  {id:'12',name:'திருக்களர் கிருஷ்ணானந்த சுவாமிகள்',tamilMonth:'ஆனி',star:'அஸ்வினி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-07-09',alertSent:false,calAdded:false},
  {id:'13',name:'சின்னத்துறவு சுவாமிகள்',tamilMonth:'ஆனி',star:'ரோகிணி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-07-11',alertSent:false,calAdded:false},
  {id:'14',name:'ஸ்ரீமத் காசி விஸ்வநாத சுவாமிகள் (11வது)',tamilMonth:'ஆனி',star:'ரோகிணி',isPublic:false,pax:100,contacts:[],notes:'ரோகிணி 2 நாள் – பஞ்சாங்கம் பார்க்கவும்',date:'2026-07-11',alertSent:false,calAdded:false},
  {id:'15',name:'மாணிக்கவாசகர்',tamilMonth:'ஆனி',star:'மகம்',isPublic:true,pax:1000,contacts:[],notes:'',date:'2026-06-19',alertSent:false,calAdded:false},
  {id:'16',name:'அமர்நீதி நாயனார்',tamilMonth:'ஆனி',star:'பூரம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-06-20',alertSent:false,calAdded:false},
  {id:'17',name:'ஸ்ரீமத் மகாதேவ ஞான தேசிகர் (7வது)',tamilMonth:'ஆனி',star:'ஹஸ்தம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-06-23',alertSent:false,calAdded:false},
  {id:'18',name:'பள்ளத்தூர் பொரிச்சியப்ப ஐயா',tamilMonth:'ஆனி',star:'ஹஸ்தம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-06-23',alertSent:false,calAdded:false},
  {id:'19',name:'சபாபதி சுவாமிகள்',tamilMonth:'ஆனி',star:'விசாகம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-06-26',alertSent:false,calAdded:false},
  {id:'20',name:'பட்டினத்தார்',tamilMonth:'ஆடி',star:'உத்திராடம்',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-07-29',alertSent:false,calAdded:false},
  {id:'21',name:'எறும்பூர் தத்துவராய சுவாமிகள்',tamilMonth:'ஆடி',star:'சதயம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-08-01',alertSent:false,calAdded:false},
  {id:'22',name:'அரு.சா. நாராயண சுவாமி',tamilMonth:'ஆடி',star:'பூரட்டாதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-08-02',alertSent:false,calAdded:false},
  {id:'23',name:'கழையார்கோவில் செல்லப்ப சுவாமி',tamilMonth:'ஆடி',star:'ரேவதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-08-04',alertSent:false,calAdded:false},
  {id:'24',name:'ஆடி அம்மன் கோவில் திருவிழா',tamilMonth:'ஆடி',star:'அஸ்வினி',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-08-05',alertSent:false,calAdded:false},
  {id:'25',name:'கொடியேற்றம்',tamilMonth:'ஆடி',star:'பரணி',isPublic:true,pax:300,contacts:[],notes:'',date:'2026-08-06',alertSent:false,calAdded:false},
  {id:'26',name:'ஆதீனம் மண்டகப்படி',tamilMonth:'ஆடி',star:'கார்த்திகை',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-08-07',alertSent:false,calAdded:false},
  {id:'27',name:'மூர்த்தி நாயனார்',tamilMonth:'ஆடி',star:'கார்த்திகை',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-08-07',alertSent:false,calAdded:false},
  {id:'28',name:'ஸ்ரீமத் கருணாநிதி சுவாமிகள் (3வது)',tamilMonth:'ஆடி',star:'ரோகிணி',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-08-08',alertSent:false,calAdded:false},
  {id:'29',name:'தேர்',tamilMonth:'ஆடி',star:'மகம்',isPublic:true,pax:1000,contacts:[],notes:'தேர் திருவிழா',date:'2026-07-17',alertSent:false,calAdded:false},
  {id:'30',name:'நாமட்டம்பட்டி பழனியப்ப ஐயா',tamilMonth:'ஆடி',star:'மகம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-07-17',alertSent:false,calAdded:false},
  {id:'31',name:'ஆடிப்பூரம்',tamilMonth:'ஆடி',star:'பூரம்',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-07-18',alertSent:false,calAdded:false},
  {id:'32',name:'ஸ்ரீமத் துறவு ஆண்டவர் (2வது)',tamilMonth:'ஆடி',star:'பூரம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-07-18',alertSent:false,calAdded:false},
  {id:'33',name:'திருக்கல்யாணம்',tamilMonth:'ஆடி',star:'உத்திரம்',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-07-19',alertSent:false,calAdded:false},
  {id:'34',name:'தெப்பம்',tamilMonth:'ஆடி',star:'ஹஸ்தம்',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-07-20',alertSent:false,calAdded:false},
  {id:'35',name:'முத்துப்பல்லக்கு',tamilMonth:'ஆடி',star:'சித்திரை',isPublic:true,pax:500,contacts:[],notes:'',date:'2026-07-21',alertSent:false,calAdded:false},
  {id:'36',name:'சுந்தரமூர்த்தி நாயனார்',tamilMonth:'ஆடி',star:'சுவாதி',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-07-22',alertSent:false,calAdded:false},
  {id:'37',name:'மதுரை குட்டை சுவாமிகள்',tamilMonth:'ஆவணி',star:'சதயம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-08-28',alertSent:false,calAdded:false},
  {id:'38',name:'வேங்கடாசலம் ஐயா',tamilMonth:'ஆவணி',star:'அவிட்டம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-08-27',alertSent:false,calAdded:false},
  {id:'39',name:'ஸ்ரீ ல ஸ்ரீ ராமநாத ஞான தேசிகர் (10வது)',tamilMonth:'புரட்டாசி',star:'சுவாதி',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-10-12',alertSent:false,calAdded:false},
  {id:'40',name:'ஸ்ரீ ல ஸ்ரீ நாச்சியப்ப சுவாமிகள் (12வது)',tamilMonth:'புரட்டாசி',star:'மூலம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-09-19',alertSent:false,calAdded:false},
  {id:'41',name:'கண்டனூர் சிதம்பர சுவாமிகள்',tamilMonth:'ஐப்பசி',star:'ரோகிணி',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-10-29',alertSent:false,calAdded:false},
  {id:'42',name:'சின்ன அழகப்ப ஐயா',tamilMonth:'ஐப்பசி',star:'மிருகசீரிஷம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-10-29',alertSent:false,calAdded:false},
  {id:'43',name:'கீழ்ப்பூங்குடி நாராயண சுவாமிகள்',tamilMonth:'ஐப்பசி',star:'மகம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-11-03',alertSent:false,calAdded:false},
  {id:'44',name:'சிதம்பர பொன்னம்பல சுவாமிகள்',tamilMonth:'ஐப்பசி',star:'சித்திரை',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-11-07',alertSent:false,calAdded:false},
  {id:'45',name:'சோர்ணாதபுரம் பழனியப்ப ஐயா',tamilMonth:'ஐப்பசி',star:'உத்திராடம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-10-19',alertSent:false,calAdded:false},
  {id:'46',name:'இரவாரம் வள்ளியப்ப ஐயா',tamilMonth:'கார்த்திகை',star:'திருவாதிரை',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-11-27',alertSent:false,calAdded:false},
  {id:'47',name:'காரைக்குடி திருநாவுக்கரசு சுவாமிகள்',tamilMonth:'கார்த்திகை',star:'திருவோணம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-11-16',alertSent:false,calAdded:false},
  {id:'48',name:'ஸ்ரீமத் ராமசாமி ஞான தேசிகர் (4வது)',tamilMonth:'மார்கழி',star:'மகம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2026-12-28',alertSent:false,calAdded:false},
  {id:'49',name:'இயற்கை நாயனார்',tamilMonth:'மார்கழி',star:'உத்திரம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2026-12-30',alertSent:false,calAdded:false},
  {id:'50',name:'ஈசான்ய ஞான தேசிகர்',tamilMonth:'மார்கழி',star:'மிருகசீரிஷம்',isPublic:false,pax:75,contacts:[],notes:'⚠ kshaya – பஞ்சாங்கம் உறுதிப்படுத்தவும்',date:'2026-12-23',alertSent:false,calAdded:false},
  {id:'51',name:'கழையார்கோவில் ஜமீன்தார்',tamilMonth:'மார்கழி',star:'மிருகசீரிஷம்',isPublic:false,pax:75,contacts:[],notes:'⚠ kshaya – பஞ்சாங்கம் உறுதிப்படுத்தவும்',date:'2026-12-23',alertSent:false,calAdded:false},
  {id:'52',name:'மேலடகம் பழனியப்ப ஐயா',tamilMonth:'தை',star:'பூரம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-01-25',alertSent:false,calAdded:false},
  {id:'53',name:'திருப்புவனம் ஸ்ரீ காசிகானந்த சுவாமிகள்',tamilMonth:'தை',star:'சுவாதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-01-29',alertSent:false,calAdded:false},
  {id:'54',name:'ஸ்ரீ ல ஸ்ரீ மெய்யப்ப ஞான தேசிகர் (13வது)',tamilMonth:'தை',star:'விசாகம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2027-01-30',alertSent:false,calAdded:false},
  {id:'55',name:'சாது பரமானந்த சுவாமிகள்',tamilMonth:'தை',star:'மூலம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-02-03',alertSent:false,calAdded:false},
  {id:'56',name:'களிகம்ப நாயனார்',tamilMonth:'தை',star:'ரேவதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-01-15',alertSent:false,calAdded:false},
  {id:'57',name:'சாது பட்டமங்கலம் கருப்பையாசாமிகள்',tamilMonth:'தை',star:'ரோகிணி',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-01-19',alertSent:false,calAdded:false},
  {id:'58',name:'ஸ்ரீ சோர்ணம் சுவாமிகள்',tamilMonth:'தை',star:'திருவாதிரை',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-01-21',alertSent:false,calAdded:false},
  {id:'59',name:'பள்ளத்தூர் முத்துவீரப்ப ஐயா',tamilMonth:'தை',star:'புனர்பூசம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-01-21',alertSent:false,calAdded:false},
  {id:'60',name:'காரைக்குடி ஸ்ரீமத் சோமசுந்தர ஞான தேசிகர் (8வது)',tamilMonth:'மாசி',star:'சுவாதி',isPublic:false,pax:100,contacts:[],notes:'',date:'2027-02-25',alertSent:false,calAdded:false},
  {id:'61',name:'நல்லூர் பழனிமுத்து ஐயா',tamilMonth:'மாசி',star:'பூராடம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-03-03',alertSent:false,calAdded:false},
  {id:'62',name:'கொ. அழகாபுரி ஸ்ரீ ராமநாத சுவாமிகள்',tamilMonth:'மாசி',star:'மகம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-02-21',alertSent:false,calAdded:false},
  {id:'63',name:'காரைக்கால் அம்மையார்',tamilMonth:'பங்குனி',star:'சுவாதி',isPublic:true,pax:500,contacts:[],notes:'',date:'2027-03-25',alertSent:false,calAdded:false},
  {id:'64',name:'சண்முகநாதபுரம் முத்தையா சுவாமிகள்',tamilMonth:'பங்குனி',star:'திருவோணம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-04-02',alertSent:false,calAdded:false},
  {id:'65',name:'சிவன் செயல் மடம்',tamilMonth:'பங்குனி',star:'உத்திரட்டாதி',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-04-06',alertSent:false,calAdded:false},
  {id:'66',name:'காரைக்குடி அண்ணாமலை ஐயா',tamilMonth:'பங்குனி',star:'மிருகசீரிஷம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-03-15',alertSent:false,calAdded:false},
  {id:'67',name:'ஸ்ரீமத் சிக்கல் ஆண்டவர்',tamilMonth:'பங்குனி',star:'மகம்',isPublic:false,pax:100,contacts:[],notes:'',date:'2027-03-20',alertSent:false,calAdded:false},
  {id:'68',name:'கோவிலூர் ஸ்ரீ ல ஸ்ரீ முத்துராமலிங்க ஆண்டவர்',tamilMonth:'பங்குனி',star:'உத்திரம்',isPublic:true,pax:1000,contacts:[],notes:'வருடாந்திர மகா குருபூஜை',date:'2027-03-22',alertSent:false,calAdded:false},
  {id:'69',name:'மானாமதுரை நாராயண சுவாமிகள்',tamilMonth:'பங்குனி',star:'ஹஸ்தம்',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-03-23',alertSent:false,calAdded:false},
  {id:'70',name:'கோட்டையூர் அண்ணாமலை ஐயா',tamilMonth:'பங்குனி',star:'சித்திரை',isPublic:false,pax:75,contacts:[],notes:'',date:'2027-03-24',alertSent:false,calAdded:false},
];

const lbl={display:'block',fontSize:'.8rem',fontWeight:600,color:'#4b5563',marginBottom:'.25rem'};
const inp={width:'100%',border:'1px solid #d1d5db',borderRadius:'.45rem',padding:'.45rem .7rem',fontSize:'.875rem',outline:'none',boxSizing:'border-box',fontFamily:'inherit'};
const smBtn={border:'none',borderRadius:'.45rem',cursor:'pointer',fontWeight:500,fontSize:'.82rem',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'.25rem'};
const pill=(bg,c)=>({...smBtn,background:bg,color:c,padding:'.2rem .65rem',whiteSpace:'nowrap'});

// ── Separate Login component (no hooks issue) ─────────────────────
function LoginScreen({onLogin}) {
  const [pw,setPw]=useState('');
  const [err,setErr]=useState(false);
  const try$=()=>{
    if(pw===APP_PASSWORD){onLogin();}
    else{setErr(true);setPw('');setTimeout(()=>setErr(false),2000);}
  };
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#92400e,#c05621,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#fff',borderRadius:'1.25rem',padding:'2.5rem 2rem',width:'100%',maxWidth:380,boxShadow:'0 25px 50px rgba(0,0,0,.3)',textAlign:'center'}}>
        <div style={{fontSize:'2.5rem',marginBottom:'.5rem'}}>🙏</div>
        <div style={{fontSize:'1.2rem',fontWeight:800,color:'#92400e',marginBottom:'.25rem'}}>{MUTT}</div>
        <div style={{fontSize:'.85rem',color:'#c05621',marginBottom:'2rem'}}>குருபூஜை மேலாண்மை · {YEAR_LABEL}</div>
        <label style={{...lbl,textAlign:'left'}}>கடவுச்சொல்</label>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&try$()}
          placeholder="கடவுச்சொல் உள்ளிடவும்" autoFocus
          style={{...inp,textAlign:'center',letterSpacing:'.15rem',marginBottom:'.5rem',border:err?'1.5px solid #ef4444':'1px solid #d1d5db'}}/>
        {err&&<div style={{color:'#ef4444',fontSize:'.8rem',marginBottom:'.5rem'}}>தவறான கடவுச்சொல்</div>}
        <button onClick={try$} style={{width:'100%',background:'linear-gradient(135deg,#c05621,#d97706)',color:'#fff',border:'none',borderRadius:'.6rem',padding:'.75rem',fontWeight:700,fontSize:'1rem',cursor:'pointer'}}>
          உள்நுழை
        </button>
        <div style={{marginTop:'1.5rem',fontSize:'.75rem',color:'#9ca3af'}}>ஸ்ரீ சற்குருநாதன் துணை</div>
      </div>
    </div>
  );
}

function SaintModal({saint,onSave,onClose}){
  const blank={name:'',tamilMonth:'சித்திரை',star:'மகம்',isPublic:false,pax:100,notes:'',date:'',contacts:[]};
  const [f,setF]=useState(saint?{...blank,...saint}:blank);
  const [nc,setNc]=useState({name:'',email:'',phone:'',phone2:'',phone3:'',whatsapp:'',address:'',address2:''});
  const [showCF,setShowCF]=useState(false);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const addC=()=>{
    if(!nc.name){alert('பெயர் கட்டாயம் தேவை');return;}
    setF(p=>({...p,contacts:[...p.contacts,{...nc}]}));
    setNc({name:'',email:'',phone:'',phone2:'',phone3:'',whatsapp:'',address:'',address2:''});
    setShowCF(false);
  };
  const updC=(i,k,v)=>setF(p=>({...p,contacts:p.contacts.map((c,ci)=>ci===i?{...c,[k]:v}:c)}));
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#fff',borderRadius:'1rem',maxWidth:'520px',width:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 50px rgba(0,0,0,.25)'}}>
        <div style={{background:'linear-gradient(135deg,#c05621,#d97706)',color:'#fff',padding:'1rem 1.5rem',borderRadius:'1rem 1rem 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontWeight:700}}>{saint?'குருபூஜை திருத்து':'புதிய குருபூஜை'}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#fff',fontSize:'1.2rem',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'1.25rem',display:'flex',flexDirection:'column',gap:'.9rem'}}>
          <div><label style={lbl}>குரு / நிகழ்வு பெயர் *</label>
            <input value={f.name} onChange={e=>upd('name',e.target.value)} style={inp} placeholder="மகான் / நிகழ்வு பெயர்..."/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem'}}>
            <div><label style={lbl}>தமிழ் மாதம்</label>
              <select value={f.tamilMonth} onChange={e=>upd('tamilMonth',e.target.value)} style={inp}>{TAMIL_MONTHS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label style={lbl}>நட்சத்திரம்</label>
              <select value={f.star} onChange={e=>upd('star',e.target.value)} style={inp}>{STARS.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem'}}>
            <div><label style={lbl}>பராபவ தேதி</label>
              <input type="date" value={f.date} onChange={e=>upd('date',e.target.value)} style={inp} min="2026-04-14" max="2027-04-13"/></div>
            <div><label style={lbl}>எதிர்பார்க்கப்படும் பேர்</label>
              <input type="number" value={f.pax} min="1" onChange={e=>upd('pax',parseInt(e.target.value)||0)} style={inp}/></div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:'.5rem',cursor:'pointer'}}>
            <input type="checkbox" checked={f.isPublic} onChange={e=>upd('isPublic',e.target.checked)} style={{width:16,height:16,accentColor:'#c05621'}}/>
            <span style={{fontSize:'.875rem',color:'#374151'}}>பொது நிகழ்ச்சி</span>
          </label>
          <div><label style={lbl}>குறிப்புகள்</label>
            <textarea value={f.notes} onChange={e=>upd('notes',e.target.value)} style={{...inp,height:'60px',resize:'vertical'}}/></div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}>
              <label style={lbl}>குடும்ப தொடர்பு ({f.contacts.length})</label>
              <button onClick={()=>setShowCF(!showCF)} style={{...smBtn,background:'#fed7aa',color:'#c05621',padding:'.2rem .6rem'}}>+ சேர்</button>
            </div>
            {showCF&&<div style={{background:'#fff7ed',borderRadius:'.5rem',padding:'.75rem',marginBottom:'.5rem',display:'flex',flexDirection:'column',gap:'.4rem'}}>
              <div style={{fontWeight:600,fontSize:'.8rem',color:'#c05621'}}>புதிய தொடர்பு</div>
              <input placeholder="பெயர் *" value={nc.name} onChange={e=>setNc(c=>({...c,name:e.target.value}))} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem'}}/>
              <input placeholder="மின்னஞ்சல்" value={nc.email} onChange={e=>setNc(c=>({...c,email:e.target.value}))} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem'}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.35rem'}}>
                <input placeholder="தொலைபேசி 1" value={nc.phone} onChange={e=>setNc(c=>({...c,phone:e.target.value}))} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem'}}/>
                <input placeholder="தொலைபேசி 2" value={nc.phone2||''} onChange={e=>setNc(c=>({...c,phone2:e.target.value}))} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem'}}/>
                <input placeholder="தொலைபேசி 3" value={nc.phone3||''} onChange={e=>setNc(c=>({...c,phone3:e.target.value}))} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem'}}/>
                <input placeholder="WhatsApp" value={nc.whatsapp||''} onChange={e=>setNc(c=>({...c,whatsapp:e.target.value}))} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem'}}/>
              </div>
              <textarea placeholder="முகவரி 1" value={nc.address} onChange={e=>setNc(c=>({...c,address:e.target.value}))} rows={2} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem',resize:'vertical'}}/>
              <textarea placeholder="முகவரி 2 (தேவைப்பட்டால்)" value={nc.address2||''} onChange={e=>setNc(c=>({...c,address2:e.target.value}))} rows={2} style={{...inp,fontSize:'.8rem',padding:'.35rem .6rem',resize:'vertical'}}/>
              <div style={{display:'flex',gap:'.5rem'}}>
                <button onClick={addC} style={{flex:1,...smBtn,background:'#c05621',color:'#fff',padding:'.45rem'}}>சேர்</button>
                <button onClick={()=>setShowCF(false)} style={{flex:1,...smBtn,background:'#e5e7eb',color:'#374151',padding:'.45rem'}}>ரத்து</button>
              </div>
            </div>}
            {f.contacts.map((c,i)=>(
              <div key={i} style={{background:'#f9fafb',borderRadius:'.5rem',padding:'.65rem .75rem',marginBottom:'.4rem',border:'1px solid #e5e7eb'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.4rem'}}>
                  <span style={{fontWeight:600,fontSize:'.8rem',color:'#374151'}}>தொடர்பு {i+1}</span>
                  <button onClick={()=>setF(p=>({...p,contacts:p.contacts.filter((_,ci)=>ci!==i)}))} style={{...smBtn,background:'#fee2e2',color:'#ef4444',padding:'.15rem .45rem',fontSize:'.75rem'}}>✕ நீக்கு</button>
                </div>
                {[['name','பெயர்'],['email','மின்னஞ்சல்']].map(([k,label])=>(
                  <div key={k} style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'.25rem'}}>
                    <span style={{width:75,color:'#9ca3af',fontSize:'.75rem',flexShrink:0}}>{label}</span>
                    <input value={c[k]||''} onChange={e=>updC(i,k,e.target.value)}
                      style={{flex:1,border:'1px solid #d1d5db',borderRadius:'.3rem',padding:'.25rem .45rem',fontSize:'.78rem',fontFamily:'inherit',outline:'none'}}/>
                  </div>
                ))}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.3rem',marginBottom:'.25rem'}}>
                  {[['phone','தொலை 1'],['phone2','தொலை 2'],['phone3','தொலை 3'],['whatsapp','WhatsApp']].map(([k,label])=>(
                    <div key={k} style={{display:'flex',flexDirection:'column',gap:'.15rem'}}>
                      <span style={{color:'#9ca3af',fontSize:'.7rem'}}>{label}</span>
                      <input value={c[k]||''} onChange={e=>updC(i,k,e.target.value)}
                        style={{border:'1px solid #d1d5db',borderRadius:'.3rem',padding:'.25rem .4rem',fontSize:'.78rem',fontFamily:'inherit',outline:'none',width:'100%'}}/>
                    </div>
                  ))}
                </div>
                {[['address','முகவரி 1'],['address2','முகவரி 2']].map(([k,label])=>(
                  <div key={k} style={{display:'flex',alignItems:'flex-start',gap:'.4rem',marginBottom:'.25rem'}}>
                    <span style={{width:75,color:'#9ca3af',fontSize:'.75rem',flexShrink:0,paddingTop:'.2rem'}}>{label}</span>
                    <textarea value={c[k]||''} onChange={e=>updC(i,k,e.target.value)} rows={2}
                      style={{flex:1,border:'1px solid #d1d5db',borderRadius:'.3rem',padding:'.25rem .45rem',fontSize:'.78rem',fontFamily:'inherit',outline:'none',resize:'vertical'}}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:'.5rem',padding:'.5rem .75rem',fontSize:'.78rem',color:'#92400e',marginTop:'-.4rem'}}>
            ⚠️ கீழே உள்ள <b>💾 சேமி</b> பொத்தானை அழுத்தினால் மட்டுமே Firebase-ல் சேமிக்கப்படும்
          </div>
          <div style={{display:'flex',gap:'.75rem'}}>
            <button onClick={()=>onSave(f)} style={{flex:1,background:'#c05621',color:'#fff',border:'none',borderRadius:'.6rem',padding:'.8rem',fontWeight:800,cursor:'pointer',fontSize:'1.1rem',boxShadow:'0 4px 12px rgba(192,86,33,.4)'}}>💾 Firebase-ல் சேமி</button>
            <button onClick={onClose} style={{flex:1,background:'#f3f4f6',color:'#374151',border:'none',borderRadius:'.6rem',padding:'.7rem',cursor:'pointer'}}>ரத்து</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LetterModal({saint,onClose}){
  const txt=generateLetter(saint);
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#fff',borderRadius:'1rem',maxWidth:'500px',width:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 50px rgba(0,0,0,.25)'}}>
        <div style={{background:'linear-gradient(135deg,#c05621,#d97706)',color:'#fff',padding:'1rem 1.5rem',borderRadius:'1rem 1rem 0 0',display:'flex',justifyContent:'space-between'}}>
          <span style={{fontWeight:700}}>திருமுகம் — {saint.name}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#fff',fontSize:'1.2rem',cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'1.25rem'}}>
          <pre style={{whiteSpace:'pre-wrap',fontSize:'.9rem',color:'#1a1a2e',background:'#fffff8',borderRadius:'.5rem',padding:'1.25rem',lineHeight:2,border:'1px solid #e5e7eb',fontFamily:'inherit'}}>{txt}</pre>
          <div style={{display:'flex',gap:'.75rem',marginTop:'1rem'}}>
            <button onClick={()=>{
            if(navigator.clipboard){
              navigator.clipboard.writeText(txt).then(()=>alert('✓ கடிதம் நகல் எடுக்கப்பட்டது! WhatsApp / Gmail-ல் ஒட்டவும்.')).catch(()=>{
                // fallback
                const ta=document.createElement('textarea');
                ta.value=txt; document.body.appendChild(ta);
                ta.select(); document.execCommand('copy');
                document.body.removeChild(ta);
                alert('✓ நகல் எடுக்கப்பட்டது!');
              });
            } else {
              const ta=document.createElement('textarea');
              ta.value=txt; document.body.appendChild(ta);
              ta.select(); document.execCommand('copy');
              document.body.removeChild(ta);
              alert('✓ நகல் எடுக்கப்பட்டது!');
            }
          }} style={{flex:1,...smBtn,background:'#c05621',color:'#fff',padding:'.65rem',fontWeight:600}}>📋 நகல் எடு</button>
            <button onClick={onClose} style={{flex:1,...smBtn,background:'#f3f4f6',color:'#374151',padding:'.65rem'}}>மூடு</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard (only rendered when logged in) ─────────────────
function Dashboard() {
  const [tab,setTab]=useState('dashboard');
  const [saints,setSaints]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [editSaint,setEditSaint]=useState(null);
  const [letterSaint,setLetterSaint]=useState(null);
  const [toast,setToast]=useState(null);
  const [filterMonth,setFilterMonth]=useState('');
  const [search,setSearch]=useState('');

  const toast$=(msg,type='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};

  useEffect(()=>{
    // First check if seeding is needed
    (async()=>{
      try{
        const snap=await getDocsFromServer(collection(db,COL));
        if(snap.empty){
          const batch=writeBatch(db);
          DEFAULT_SAINTS.forEach(s=>batch.set(doc(db,COL,s.id),s));
          await batch.commit();
          console.log('Seeded 70 saints to Firestore');
        }
      }catch(e){
        console.error('Seed error:',e);
      }
    })();

    // Real-time listener — auto-updates whenever Firestore changes
    const unsub = onSnapshot(collection(db,COL),
      (snap)=>{
        const data=[];
        snap.forEach(d=>data.push(d.data()));
        data.sort((a,b)=>parseInt(a.id)-parseInt(b.id));
        setSaints(data);
        setLoaded(true);
        console.log('Firestore sync: '+data.length+' saints loaded');
      },
      (e)=>{
        console.error('Firestore listen error:',e);
        toast$('Firebase பிழை: '+e.message,'err');
        setSaints(DEFAULT_SAINTS);
        setLoaded(true);
      }
    );
    return ()=>unsub(); // cleanup on unmount
  },[]);

  const saveSaint=async(saint)=>{
    setSaving(true);
    try{
      // Build clean object — strip undefined values
      const clean = {};
      Object.keys(saint).forEach(k=>{ if(saint[k]!==undefined) clean[k]=saint[k]; });
      // Save to Firestore
      await setDoc(doc(db,COL,String(saint.id)), clean);
      // Verify by reading back
      const verify = await getDoc(doc(db,COL,String(saint.id)));
      if(verify.exists()){
        const saved = verify.data();
        console.log('✓ Verified in Firestore:', saint.id, '| contacts:', saved.contacts?.length||0, '| name:', saved.name);
      } else {
        console.error('✗ Document not found after save!');
        toast$('சேமிப்பு சரிபார்ப்பு தோல்வி','err');
      }
    }
    catch(e){
      console.error('Firestore Save Error:', e.code, e.message);
      toast$('🔴 சேமிப்பு பிழை: '+(e.code||e.message),'err');
    }
    setSaving(false);
  };

  const upd=async(id,ch)=>{
    const updated=saints.map(s=>s.id===id?{...s,...ch}:s);
    setSaints(updated);
    await saveSaint(updated.find(s=>s.id===id));
  };

  const addS=async(data)=>{
    const newId=(Math.max(0,...saints.map(s=>parseInt(s.id)||0))+1).toString();
    const saint={...data,id:newId,alertSent:false,calAdded:false};
    setSaints(p=>[...p,saint]);
    await saveSaint(saint);
  };

  const delS=async(id)=>{
    if(!window.confirm('இந்த குருபூஜையை நீக்கவா?'))return;
    setSaints(p=>p.filter(s=>s.id!==id));
    try{await deleteDoc(doc(db,COL,id));}
    catch(e){toast$('நீக்கல் பிழை','err');}
  };

  const today=new Date().toISOString().split('T')[0];
  const upcoming=saints.filter(s=>s.date).map(s=>({...s,dl:daysUntil(s.date)})).filter(s=>s.dl!==null&&s.dl>=0&&s.dl<=60).sort((a,b)=>a.dl-b.dl);
  const past=saints.filter(s=>s.date).map(s=>({...s,dl:daysUntil(s.date)})).filter(s=>s.dl!==null&&s.dl<0).sort((a,b)=>b.dl-a.dl).slice(0,5);
  const alertsDue=saints.filter(s=>s.date&&!s.alertSent&&alertDue(s.date)<=today&&daysUntil(s.date)>=0);
  const filtered=saints
    .filter(s=>(!filterMonth||s.tamilMonth===filterMonth)&&(!search||s.name.includes(search)||s.star.includes(search)))
    .sort((a,b)=>{
      if(!a.date && !b.date) return parseInt(a.id)-parseInt(b.id);
      if(!a.date) return 1;
      if(!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  const totalDated=saints.filter(s=>s.date).length;
  const TABS=[['dashboard','🏠 முகப்பு'],['schedule','📅 அட்டவணை'],['saints','👤 குரு பட்டியல்'],['kitchen','🍱 சமையலறை']];

  if(!loaded)return(
    <div style={{minHeight:'100vh',background:'#fff7ed',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <div style={{fontSize:'2rem'}}>🙏</div>
      <div style={{color:'#c05621',fontWeight:600}}>Firebase-இலிருந்து ஏற்றுகிறது...</div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:'#fff7ed',fontFamily:"'Noto Sans Tamil',sans-serif"}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#92400e,#c05621,#d97706)',color:'#fff',padding:'.9rem 1.25rem',boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'1.1rem',fontWeight:800}}>🙏 குருபூஜை மேலாண்மை</div>
            <div style={{fontSize:'.78rem',opacity:.85,marginTop:'.1rem'}}>{MUTT} · {YEAR_LABEL}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            {saving&&<div style={{fontSize:'.75rem',opacity:.8,background:'rgba(255,255,255,.2)',padding:'.2rem .5rem',borderRadius:'.3rem'}}>சேமிக்கிறது...</div>}
            <div style={{textAlign:'right',fontSize:'.78rem',opacity:.85,lineHeight:1.6}}>
              <div>{saints.length} குருபூஜைகள்</div>
              <div>{totalDated} தேதி நிர்ணயம்</div>
            </div>
          </div>
        </div>
      </div>

      {alertsDue.length>0&&<div style={{background:'#fef2f2',borderBottom:'1px solid #fca5a5',padding:'.5rem 1.25rem'}}>
        <div style={{maxWidth:900,margin:'0 auto',color:'#b91c1c',fontSize:'.84rem',fontWeight:600}}>⚠️ {alertsDue.length} குருபூஜைக்கு இன்று அறிவிப்பு அனுப்ப வேண்டும்!</div>
      </div>}

      {toast&&<div style={{position:'fixed',top:'1rem',right:'1rem',zIndex:200,background:toast.type==='err'?'#dc2626':'#16a34a',color:'#fff',padding:'.7rem 1.1rem',borderRadius:'.6rem',boxShadow:'0 4px 12px rgba(0,0,0,.25)',fontSize:'.85rem',fontWeight:500}}>{toast.msg}</div>}

      <div style={{background:'#fff',borderBottom:'1px solid #fed7aa',overflowX:'auto'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex'}}>
          {TABS.map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:'.75rem 1.1rem',border:'none',borderBottom:tab===id?'2.5px solid #c05621':'2.5px solid transparent',background:'none',color:tab===id?'#c05621':'#6b7280',fontWeight:tab===id?700:400,cursor:'pointer',fontSize:'.84rem',whiteSpace:'nowrap',fontFamily:'inherit'}}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'1.25rem'}}>

        {tab==='dashboard'&&<div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'.75rem'}}>
            {[['மொத்தம்',saints.length,'#c05621'],['தேதி நிர்ணயம்',totalDated,'#16a34a'],['நிலுவை',saints.length-totalDated,'#d97706'],['பொது',saints.filter(s=>s.isPublic).length,'#7c3aed']].map(([l,v,c])=>(
              <div key={l} style={{background:'#fff',borderRadius:'.75rem',padding:'1rem',boxShadow:'0 1px 4px rgba(0,0,0,.08)',border:'1px solid #fed7aa'}}>
                <div style={{fontSize:'1.6rem',fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:'.75rem',color:'#6b7280',marginTop:'.2rem'}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',border:'1px solid #bfdbfe',borderRadius:'.75rem',padding:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
            <div>
              <div style={{fontWeight:700,color:'#1d4ed8',fontSize:'.9rem'}}>📅 Google Calendar இறக்குமதி</div>
              <div style={{fontSize:'.75rem',color:'#6b7280',marginTop:'.15rem'}}>{saints.filter(s=>s.date&&!s.isPublic).length} தனிப்பட்ட குருபூஜைகள் — ICS கோப்பு பதிவிறக்கு</div>
            </div>
            <div style={{display:'flex',gap:'.5rem'}}>
              <button onClick={()=>downloadICS(saints)} style={{...smBtn,background:'#1a73e8',color:'#fff',padding:'.55rem .9rem',fontWeight:700,borderRadius:'.5rem',fontSize:'.82rem',whiteSpace:'nowrap'}}>⬇️ .ics Calendar</button>
              <button onClick={()=>exportToExcel(saints)} style={{...smBtn,background:'#16a34a',color:'#fff',padding:'.55rem .9rem',fontWeight:700,borderRadius:'.5rem',fontSize:'.82rem',whiteSpace:'nowrap'}}>📊 Excel</button>
              <button onClick={()=>printLabels(saints)} style={{...smBtn,background:'#7c3aed',color:'#fff',padding:'.55rem .9rem',fontWeight:700,borderRadius:'.5rem',fontSize:'.82rem',whiteSpace:'nowrap'}}>🏷️ 60d Labels</button>
              <button onClick={()=>printAllLabels(saints)} style={{...smBtn,background:'#5b21b6',color:'#fff',padding:'.55rem .9rem',fontWeight:700,borderRadius:'.5rem',fontSize:'.82rem',whiteSpace:'nowrap'}}>🏷️ All Labels</button>
              <button onClick={()=>messageAll(saints)} style={{...smBtn,background:'#25D366',color:'#fff',padding:'.55rem .9rem',fontWeight:700,borderRadius:'.5rem',fontSize:'.82rem',whiteSpace:'nowrap'}}>📱 Message All</button>
            </div>
          </div>
          {alertsDue.length>0&&<div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:'.75rem',padding:'1rem'}}>
            <div style={{fontWeight:700,color:'#b91c1c',marginBottom:'.6rem'}}>⚠️ இப்போது அறிவிப்பு அனுப்ப வேண்டியவை</div>
            {alertsDue.map(s=>(
              <div key={s.id} style={{background:'#fff',borderRadius:'.5rem',padding:'.65rem .85rem',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.4rem'}}>
                <div><div style={{fontWeight:600}}>{s.name}</div>
                  <div style={{fontSize:'.75rem',color:'#6b7280'}}>{fmtDate(s.date)} · {s.tamilMonth} {s.star}</div></div>
                <button onClick={()=>setLetterSaint(s)} style={pill('#dbeafe','#1d4ed8')}>📄 திருமுகம்</button>
              </div>
            ))}
          </div>}
          <div>
            <div style={{fontWeight:700,color:'#374151',marginBottom:'.6rem'}}>🗓 அடுத்த 60 நாட்களில் ({upcoming.length})</div>
            {upcoming.length===0
              ?<div style={{background:'#fff',borderRadius:'.75rem',padding:'2rem',textAlign:'center',color:'#9ca3af',border:'1px solid #fed7aa'}}>அடுத்த 60 நாட்களில் நிகழ்வுகள் இல்லை</div>
              :<div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
                {upcoming.map(s=>{
                  const urgent=s.dl<=5,warn=s.dl<=20;
                  return<div key={s.id} style={{background:urgent?'#fef2f2':warn?'#fefce8':'#fff',borderRadius:'.75rem',padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem',border:`1px solid ${urgent?'#fca5a5':warn?'#fde68a':'#fed7aa'}`}}>
                    <div style={{minWidth:42,height:42,borderRadius:'50%',background:urgent?'#ef4444':warn?'#d97706':'#c05621',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.75rem',fontWeight:700}}>{s.dl}d</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:'.875rem',display:'flex',gap:'.35rem',flexWrap:'wrap',alignItems:'center'}}>
                        {s.name}{s.isPublic&&<span style={pill('#ede9fe','#7c3aed')}>பொது</span>}
                      </div>
                      <div style={{fontSize:'.75rem',color:'#6b7280'}}>{fmtDate(s.date)} · {s.tamilMonth} {s.star} · {s.pax} பேர்</div>
                    </div>
                    <button onClick={()=>setLetterSaint(s)} style={pill('#dbeafe','#1d4ed8')}>📄</button>
                  </div>;
                })}
              </div>
            }
          </div>
          {/* Recently completed */}
          {past.length>0&&<div>
            <div style={{fontWeight:700,color:'#9ca3af',marginBottom:'.6rem',fontSize:'.9rem'}}>✅ கடந்த குருபூஜைகள் (சமீபத்திய {past.length})</div>
            <div style={{display:'flex',flexDirection:'column',gap:'.4rem'}}>
              {past.map(s=>(
                <div key={s.id} style={{background:'#f9fafb',borderRadius:'.65rem',padding:'.65rem 1rem',display:'flex',alignItems:'center',gap:'.75rem',border:'1px solid #e5e7eb',opacity:.7}}>
                  <div style={{minWidth:42,height:42,borderRadius:'50%',background:'#9ca3af',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.75rem',fontWeight:700}}>{Math.abs(s.dl)}d</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:'.875rem',color:'#6b7280'}}>{s.name}</div>
                    <div style={{fontSize:'.75rem',color:'#9ca3af'}}>{fmtDate(s.date)} · {s.tamilMonth} {s.star}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>}
        </div>}

        {tab==='schedule'&&<div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:700,fontSize:'1.05rem',color:'#374151'}}>{YEAR_LABEL} அட்டவணை</div>
            <div style={{display:'flex',gap:'.5rem',alignItems:'center'}}>
              <span style={{fontSize:'.8rem',color:'#6b7280'}}>{totalDated}/{saints.length}</span>
              <button onClick={()=>downloadICS(saints)} style={{...smBtn,background:'#1a73e8',color:'#fff',padding:'.35rem .75rem',fontWeight:600,fontSize:'.78rem'}}>⬇️ Calendar</button>
              <button onClick={()=>printSchedule(saints)} style={{...smBtn,background:'#c05621',color:'#fff',padding:'.35rem .75rem',fontWeight:600,fontSize:'.78rem'}}>🖨️ அட்டவணை அச்சு</button>
              <button onClick={()=>exportToExcel(saints)} style={{...smBtn,background:'#16a34a',color:'#fff',padding:'.35rem .75rem',fontWeight:600,fontSize:'.78rem'}}>📊 Excel Export</button>
              <button onClick={()=>printLabels(saints)} style={{...smBtn,background:'#7c3aed',color:'#fff',padding:'.35rem .75rem',fontWeight:600,fontSize:'.78rem'}}>🏷️ 60 நாள் Labels</button>
              <button onClick={()=>printAllLabels(saints)} style={{...smBtn,background:'#5b21b6',color:'#fff',padding:'.35rem .75rem',fontWeight:600,fontSize:'.78rem'}}>🏷️ All Labels</button>
              <button onClick={()=>messageAll(saints)} style={{...smBtn,background:'#25D366',color:'#fff',padding:'.35rem .75rem',fontWeight:600,fontSize:'.78rem'}}>📱 Message All</button>
            </div>
          </div>
          <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:'.5rem',padding:'.65rem .9rem',fontSize:'.8rem',color:'#92400e'}}>
            💡 தேதி மாற்றினால் உடனே Firebase-ல் சேமிக்கப்படும்
          </div>
          <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap'}}>
            {['',...TAMIL_MONTHS].map(m=>(
              <button key={m||'all'} onClick={()=>setFilterMonth(m)} style={{...pill(filterMonth===m?'#c05621':'#fff',filterMonth===m?'#fff':'#6b7280'),padding:'.25rem .65rem',border:filterMonth===m?'none':'1px solid #d1d5db'}}>{m||'அனைத்தும்'}</button>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:'.75rem',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.82rem'}}>
                <thead><tr style={{background:'linear-gradient(135deg,#92400e,#c05621)',color:'#fff'}}>
                  {['#','குரு / நிகழ்வு','மாதம்','நட்சத்திரம்','தேதி','பொது','பேர்','செயல்'].map(h=>(
                    <th key={h} style={{padding:'.6rem .75rem',textAlign:'left',fontWeight:600,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{filtered.map((s,i)=>(
                  <tr key={s.id} style={{background:i%2===0?'#fff':'#fff7ed',borderBottom:'1px solid #fed7aa'}}>
                    <td style={{padding:'.55rem .5rem',color:'#9ca3af',fontSize:'.75rem'}}>{s.id}</td>
                    <td style={{padding:'.55rem .75rem'}}>
                      <div style={{fontWeight:600}}>{s.name}</div>
                      {s.notes&&<div style={{fontSize:'.72rem',color:s.notes.includes('⚠')?'#d97706':'#9ca3af'}}>{s.notes}</div>}
                    </td>
                    <td style={{padding:'.55rem .75rem',color:'#6b7280',whiteSpace:'nowrap'}}>{s.tamilMonth}</td>
                    <td style={{padding:'.55rem .75rem',color:'#6b7280',whiteSpace:'nowrap'}}>{s.star}</td>
                    <td style={{padding:'.55rem .75rem'}}>
                      <input type="date" value={s.date||''} min="2026-04-14" max="2027-04-13"
                        onChange={e=>upd(s.id,{date:e.target.value})}
                        style={{border:'1px solid #d97706',borderRadius:'.35rem',padding:'.3rem .45rem',fontSize:'.78rem',width:130}}/>
                    </td>
                    <td style={{padding:'.55rem .75rem',textAlign:'center'}}>
                      <input type="checkbox" checked={s.isPublic} onChange={e=>upd(s.id,{isPublic:e.target.checked})} style={{accentColor:'#c05621',width:15,height:15}}/>
                    </td>
                    <td style={{padding:'.55rem .75rem'}}>
                      <input type="number" value={s.pax} min="1" onChange={e=>upd(s.id,{pax:parseInt(e.target.value)||s.pax})}
                        style={{border:'1px solid #d1d5db',borderRadius:'.35rem',padding:'.3rem .4rem',width:65,fontSize:'.78rem'}}/>
                    </td>
                    <td style={{padding:'.55rem .5rem'}}>
                      <div style={{display:'flex',gap:'.3rem'}}>
                        <button onClick={()=>setLetterSaint(s)} style={{...pill('#dbeafe','#1d4ed8'),fontSize:'.72rem',padding:'.2rem .45rem'}}>📄</button>
                        <button onClick={()=>{setEditSaint(s);setShowModal(true);}} style={{...pill('#f3f4f6','#374151'),fontSize:'.72rem',padding:'.2rem .45rem'}}>✏️</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>}

        {tab==='saints'&&<div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:700,fontSize:'1.05rem',color:'#374151'}}>குரு பட்டியல் & குடும்ப தொடர்பு</div>
            <button onClick={()=>{setEditSaint(null);setShowModal(true);}} style={{...smBtn,background:'#c05621',color:'#fff',padding:'.45rem .9rem'}}>+ புதியது</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="பெயர் / நட்சத்திரம் தேடு..." style={{...inp,padding:'.55rem .85rem'}}/>
          <div style={{display:'flex',flexDirection:'column',gap:'.6rem'}}>
            {filtered.map(s=>(
              <div key={s.id} style={{background:'#fff',borderRadius:'.75rem',padding:'1rem',boxShadow:'0 1px 4px rgba(0,0,0,.07)',border:'1px solid #fed7aa'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap',alignItems:'center',marginBottom:'.3rem'}}>
                      <span style={{fontWeight:700,color:'#1f2937'}}>{s.name}</span>
                      {s.isPublic&&<span style={pill('#ede9fe','#7c3aed')}>பொது</span>}
                    </div>
                    <div style={{fontSize:'.8rem',color:'#6b7280'}}>{s.tamilMonth} · {s.star} · {s.pax} பேர்</div>
                    {s.date&&<div style={{fontSize:'.8rem',color:'#c05621',marginTop:'.2rem'}}>📅 {fmtDate(s.date)}</div>}
                    {s.contacts?.length>0&&<div style={{marginTop:'.4rem'}}>
                      {s.contacts.map((c,i)=>(
                        <div key={i} style={{fontSize:'.78rem',color:'#4b5563',marginBottom:'.15rem'}}>
                          👤 <b>{c.name}</b>
                          {c.email&&<div style={{fontSize:'.72rem'}}>✉ <a href={`mailto:${c.email}`} style={{color:'#c05621'}}>{c.email}</a></div>}
                          {(c.phone||c.phone2||c.phone3)&&<div style={{fontSize:'.72rem'}}>📞 {[c.phone,c.phone2,c.phone3].filter(Boolean).join(' / ')}{c.whatsapp&&` · WA: ${c.whatsapp}`}</div>}
                          {c.address&&<div style={{fontSize:'.72rem',color:'#6b7280'}}>🏠 {c.address}</div>}
                          {c.address2&&<div style={{fontSize:'.72rem',color:'#6b7280'}}>🏠 {c.address2}</div>}
                        </div>
                      ))}
                    </div>}
                    {s.notes&&<div style={{fontSize:'.75rem',color:s.notes.includes('⚠')?'#d97706':'#9ca3af',marginTop:'.3rem'}}>{s.notes}</div>}
                  </div>
                  <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap',justifyContent:'flex-end'}}>
                    <button onClick={()=>{setEditSaint(s);setShowModal(true);}} style={pill('#dbeafe','#1d4ed8')}>✏️ திருத்து</button>
                    <button onClick={()=>setLetterSaint(s)} style={pill('#dcfce7','#16a34a')}>📄 திருமுகம்</button>
                    <button onClick={()=>delS(s.id)} style={pill('#fee2e2','#dc2626')}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {tab==='kitchen'&&<div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div style={{fontWeight:700,fontSize:'1.05rem',color:'#374151'}}>🍱 சமையலறை திட்டமிடல் — {YEAR_LABEL}</div>
          <div style={{background:'#fff',borderRadius:'.75rem',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <div style={{background:'linear-gradient(135deg,#92400e,#c05621)',color:'#fff',padding:'.75rem 1rem',fontWeight:600}}>அடுத்த 30 நாட்களில் சமையல் தேவை</div>
            {upcoming.filter(s=>s.dl<=30).length===0
              ?<div style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>அடுத்த 30 நாட்களில் நிகழ்வுகள் இல்லை</div>
              :<div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.83rem'}}>
                  <thead style={{background:'#fff7ed'}}><tr>{['தேதி','குரு / நிகழ்வு','பொது','பேர்','குறிப்பு'].map(h=><th key={h} style={{padding:'.55rem .75rem',textAlign:'left',fontWeight:600}}>{h}</th>)}</tr></thead>
                  <tbody>{upcoming.filter(s=>s.dl<=30).map((s,i)=>(
                    <tr key={s.id} style={{borderTop:'1px solid #fed7aa',background:i%2===0?'#fff':'#fff7ed'}}>
                      <td style={{padding:'.6rem .75rem'}}><div style={{color:'#c05621',fontWeight:600}}>{fmtDate(s.date)}</div><div style={{fontSize:'.72rem',color:'#9ca3af'}}>{s.dl} நாட்களில்</div></td>
                      <td style={{padding:'.6rem .75rem',fontWeight:600}}>{s.name}</td>
                      <td style={{padding:'.6rem .75rem',textAlign:'center'}}>{s.isPublic?<span style={{color:'#16a34a',fontWeight:700}}>ஆம்</span>:'—'}</td>
                      <td style={{padding:'.6rem .75rem',textAlign:'center'}}>
                        <input type="number" value={s.pax} min="1" onChange={e=>upd(s.id,{pax:parseInt(e.target.value)||s.pax})}
                          style={{border:'1px solid #d97706',borderRadius:'.35rem',padding:'.3rem .5rem',width:70,textAlign:'center',fontWeight:700,color:'#c05621'}}/>
                      </td>
                      <td style={{padding:'.6rem .75rem'}}>
                        <input type="text" placeholder="குறிப்பு..." value={s.kitchenNotes||''} onChange={e=>upd(s.id,{kitchenNotes:e.target.value})}
                          style={{...inp,padding:'.3rem .55rem',fontSize:'.78rem'}}/>
                      </td>
                    </tr>
                  ))}</tbody>
                  <tfoot style={{background:'#fef3c7'}}><tr>
                    <td colSpan={3} style={{padding:'.6rem .75rem',fontWeight:700,textAlign:'right'}}>மொத்தம்:</td>
                    <td style={{padding:'.6rem .75rem',textAlign:'center',fontWeight:800,fontSize:'1.1rem',color:'#c05621'}}>{upcoming.filter(s=>s.dl<=30).reduce((sum,s)=>sum+(parseInt(s.pax)||0),0)}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
            }
          </div>
          <div style={{background:'#fff',borderRadius:'.75rem',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <div style={{background:'linear-gradient(135deg,#92400e,#c05621)',color:'#fff',padding:'.75rem 1rem',fontWeight:600}}>மாத வாரியாக சுருக்கம்</div>
            <div style={{padding:'1rem',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'.75rem'}}>
              {TAMIL_MONTHS.map(m=>{const ms=saints.filter(s=>s.tamilMonth===m&&s.date);if(!ms.length)return null;
                return<div key={m} style={{background:'#fff7ed',borderRadius:'.6rem',padding:'.75rem',border:'1px solid #fed7aa'}}>
                  <div style={{fontWeight:700,color:'#c05621'}}>{m}</div>
                  <div style={{fontSize:'.75rem',color:'#6b7280'}}>{ms.length} நிகழ்வுகள்</div>
                  <div style={{fontSize:'1.25rem',fontWeight:800,color:'#1f2937'}}>{ms.reduce((s,x)=>s+(parseInt(x.pax)||0),0)} பேர்</div>
                </div>;
              })}
            </div>
          </div>
        </div>}
      </div>

      {showModal&&<SaintModal saint={editSaint} onClose={()=>{setShowModal(false);setEditSaint(null);}}
        onSave={async data=>{
          if(editSaint) await upd(editSaint.id,data);
          else await addS(data);
          setShowModal(false); setEditSaint(null);
          const cCount = data.contacts?.length || 0;
          toast$('✓ சேமிக்கப்பட்டது' + (cCount > 0 ? ` · ${cCount} தொடர்பு` : ''));
          toast$('✓ Firebase-ல் சேமிக்கப்பட்டது' + (cCount > 0 ? ` (${cCount} தொடர்பு)` : ''));
        }}/>}
      {letterSaint&&<LetterModal saint={letterSaint} onClose={()=>setLetterSaint(null)}/>}
    </div>
  );
}

// ── Root: handles login gate cleanly (no hooks-in-conditional issue)
export default function App() {
  const [loggedIn, setLoggedIn] = useState(()=>sessionStorage.getItem('gp_auth')==='1');
  const login = () => { sessionStorage.setItem('gp_auth','1'); setLoggedIn(true); };
  return loggedIn ? <Dashboard /> : <LoginScreen onLogin={login} />;
}
