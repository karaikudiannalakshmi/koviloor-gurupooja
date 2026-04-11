import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, writeBatch } from "firebase/firestore";

// ── Firebase ──────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDOCusASMq_ZUWwksdOGZT7WibyeMCJfKY",
  authDomain: "koviloor-payroll.firebaseapp.com",
  projectId: "koviloor-payroll",
  storageBucket: "koviloor-payroll.firebasestorage.app",
  messagingSenderId: "164444642831",
  appId: "1:164444642831:web:26bc4c11522f8af4144d7a"
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const COL = "gurpooja_saints";

// ── Constants ─────────────────────────────────────────────────────
const MUTT = "கோவிலூர் மடாலயம்";
const YEAR_LABEL = "பராபவ வருஷம் 2026-27";
const ALERT_DAYS = 20;
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || "Koviloor@07";

const TAMIL_MONTHS = ['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'];
const STARS = ['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const WEEKDAYS_TM = ['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'];

// ── Helpers ───────────────────────────────────────────────────────
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

// ── Letter format (matches printed template) ──────────────────────
const MONTH_STARTS = {
  'சித்திரை': new Date('2026-04-14'), 'வைகாசி': new Date('2026-05-15'),
  'ஆனி': new Date('2026-06-15'),     'ஆடி': new Date('2026-07-17'),
  'ஆவணி': new Date('2026-08-17'),   'புரட்டாசி': new Date('2026-09-17'),
  'ஐப்பசி': new Date('2026-10-17'), 'கார்த்திகை': new Date('2026-11-16'),
  'மார்கழி': new Date('2026-12-16'),'தை': new Date('2027-01-14'),
  'மாசி': new Date('2027-02-13'),    'பங்குனி': new Date('2027-03-15'),
};
const getTamilDate = (dateStr, month) => {
  const d = new Date(dateStr + 'T00:00:00');
  const s = MONTH_STARTS[month];
  if (!s) return '____';
  return (Math.round((d - s) / 86400000) + 1).toString();
};
const generateLetter = (s) => {
  const dt = s.date ? new Date(s.date + 'T00:00:00') : null;
  const weekday = dt ? WEEKDAYS_TM[dt.getDay()] : '______';
  const tamilDate = (s.date && s.tamilMonth) ? getTamilDate(s.date, s.tamilMonth) : '____';
  const yr2 = dt ? dt.getFullYear().toString().slice(-2) : '__';
  return `உ.\nசிவமயம்\n\nகோவிலூர் மடத்திலிருந்து எழுதிய திருமுகம்\n\nநிகழும் பராபவ ஆண்டு ${s.tamilMonth} மாதம் ${tamilDate} நாள் ( 20${yr2} )\n${weekday} வாரத்தில் ${s.star} நட்சத்திரத்தில்\nஸ்ரீல ஸ்ரீ ${s.name} அவர்களுக்கு\nகுருபூஜை நடைபெற இருப்பதால் தாங்கள் குடும்பத்துடன் வந்து தரிசித்துப்\nபேரானந்த பெருவாழ்வைப் பெற வேண்டியது.\n\nஸ்ரீ சற்குருநாதன் துணை`;
};

// ── Default saints data ───────────────────────────────────────────
const DEFAULT_SAINTS = [
  {id:'1', name:'திருநாவுக்கரசர்', tamilMonth:'சித்திரை', star:'சதயம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-04-14'},
  {id:'2', name:'கோபாலப்ப ஐயா', tamilMonth:'சித்திரை', star:'உத்திரட்டாதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-04-16'},
  {id:'3', name:'கோட்டையூர் அழகப்ப ஐயா', tamilMonth:'சித்திரை', star:'பரணி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-04-18'},
  {id:'4', name:'மகா வேங்கடாசலம் ஐயா', tamilMonth:'சித்திரை', star:'கார்த்திகை', isPublic:false, pax:75, contacts:[], notes:'⚠ kshaya – பஞ்சாங்கம் உறுதிப்படுத்தவும்', date:'2026-04-19'},
  {id:'5', name:'கொப்புடை அம்மன் தேர்', tamilMonth:'வைகாசி', star:'பூசம்', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-05-21'},
  {id:'6', name:'கோட்டையூர் ஸ்ரீ சொக்கப்ப ஐயா', tamilMonth:'வைகாசி', star:'உத்திரம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-05-25'},
  {id:'7', name:'கொத்தமங்கலம் ஸ்ரீ அருணாசல சுவாமிகள்', tamilMonth:'வைகாசி', star:'சுவாதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-05-28'},
  {id:'8', name:'ஸ்ரீமத் திருக்களர் ஆண்டவர்', tamilMonth:'வைகாசி', star:'விசாகம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-05-30'},
  {id:'9', name:'திருஞானசம்பந்தர்', tamilMonth:'வைகாசி', star:'மூலம்', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-06-02'},
  {id:'10', name:'அண்ணாமலை ஞான தேசிகர் (6வது)', tamilMonth:'வைகாசி', star:'திருவோணம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-06-05'},
  {id:'11', name:'ஸ்ரீமத் ராமநாத ஞான தேசிகர் (9வது)', tamilMonth:'ஆனி', star:'அனுஷம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-06-27'},
  {id:'12', name:'திருக்களர் கிருஷ்ணானந்த சுவாமிகள்', tamilMonth:'ஆனி', star:'அஸ்வினி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-07-09'},
  {id:'13', name:'சின்னத்துறவு சுவாமிகள்', tamilMonth:'ஆனி', star:'ரோகிணி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-07-11'},
  {id:'14', name:'ஸ்ரீமத் காசி விஸ்வநாத சுவாமிகள் (11வது)', tamilMonth:'ஆனி', star:'ரோகிணி', isPublic:false, pax:100, contacts:[], notes:'ரோகிணி 2 நாள் – பஞ்சாங்கம் பார்க்கவும்', date:'2026-07-11'},
  {id:'15', name:'மாணிக்கவாசகர்', tamilMonth:'ஆனி', star:'மகம்', isPublic:true, pax:1000, contacts:[], notes:'', date:'2026-06-19'},
  {id:'16', name:'அமர்நீதி நாயனார்', tamilMonth:'ஆனி', star:'பூரம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-06-20'},
  {id:'17', name:'ஸ்ரீமத் மகாதேவ ஞான தேசிகர் (7வது)', tamilMonth:'ஆனி', star:'ஹஸ்தம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-06-23'},
  {id:'18', name:'பள்ளத்தூர் பொரிச்சியப்ப ஐயா', tamilMonth:'ஆனி', star:'ஹஸ்தம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-06-23'},
  {id:'19', name:'சபாபதி சுவாமிகள்', tamilMonth:'ஆனி', star:'விசாகம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-06-26'},
  {id:'20', name:'பட்டினத்தார்', tamilMonth:'ஆடி', star:'உத்திராடம்', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-07-29'},
  {id:'21', name:'எறும்பூர் தத்துவராய சுவாமிகள்', tamilMonth:'ஆடி', star:'சதயம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-08-01'},
  {id:'22', name:'அரு.சா. நாராயண சுவாமி', tamilMonth:'ஆடி', star:'பூரட்டாதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-08-02'},
  {id:'23', name:'கழையார்கோவில் செல்லப்ப சுவாமி', tamilMonth:'ஆடி', star:'ரேவதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-08-04'},
  {id:'24', name:'ஆடி அம்மன் கோவில் திருவிழா', tamilMonth:'ஆடி', star:'அஸ்வினி', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-08-05'},
  {id:'25', name:'கொடியேற்றம்', tamilMonth:'ஆடி', star:'பரணி', isPublic:true, pax:300, contacts:[], notes:'', date:'2026-08-06'},
  {id:'26', name:'ஆதீனம் மண்டகப்படி', tamilMonth:'ஆடி', star:'கார்த்திகை', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-08-07'},
  {id:'27', name:'மூர்த்தி நாயனார்', tamilMonth:'ஆடி', star:'கார்த்திகை', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-08-07'},
  {id:'28', name:'ஸ்ரீமத் கருணாநிதி சுவாமிகள் (3வது)', tamilMonth:'ஆடி', star:'ரோகிணி', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-08-08'},
  {id:'29', name:'தேர்', tamilMonth:'ஆடி', star:'மகம்', isPublic:true, pax:1000, contacts:[], notes:'தேர் திருவிழா', date:'2026-07-17'},
  {id:'30', name:'நாமட்டம்பட்டி பழனியப்ப ஐயா', tamilMonth:'ஆடி', star:'மகம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-07-17'},
  {id:'31', name:'ஆடிப்பூரம்', tamilMonth:'ஆடி', star:'பூரம்', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-07-18'},
  {id:'32', name:'ஸ்ரீமத் துறவு ஆண்டவர் (2வது)', tamilMonth:'ஆடி', star:'பூரம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-07-18'},
  {id:'33', name:'திருக்கல்யாணம்', tamilMonth:'ஆடி', star:'உத்திரம்', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-07-19'},
  {id:'34', name:'தெப்பம்', tamilMonth:'ஆடி', star:'ஹஸ்தம்', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-07-20'},
  {id:'35', name:'முத்துப்பல்லக்கு', tamilMonth:'ஆடி', star:'சித்திரை', isPublic:true, pax:500, contacts:[], notes:'', date:'2026-07-21'},
  {id:'36', name:'சுந்தரமூர்த்தி நாயனார்', tamilMonth:'ஆடி', star:'சுவாதி', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-07-22'},
  {id:'37', name:'மதுரை குட்டை சுவாமிகள்', tamilMonth:'ஆவணி', star:'சதயம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-08-28'},
  {id:'38', name:'வேங்கடாசலம் ஐயா', tamilMonth:'ஆவணி', star:'அவிட்டம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-08-27'},
  {id:'39', name:'ஸ்ரீ ல ஸ்ரீ ராமநாத ஞான தேசிகர் (10வது)', tamilMonth:'புரட்டாசி', star:'சுவாதி', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-10-12'},
  {id:'40', name:'ஸ்ரீ ல ஸ்ரீ நாச்சியப்ப சுவாமிகள் (12வது)', tamilMonth:'புரட்டாசி', star:'மூலம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-09-19'},
  {id:'41', name:'கண்டனூர் சிதம்பர சுவாமிகள்', tamilMonth:'ஐப்பசி', star:'ரோகிணி', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-10-29'},
  {id:'42', name:'சின்ன அழகப்ப ஐயா', tamilMonth:'ஐப்பசி', star:'மிருகசீரிஷம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-10-29'},
  {id:'43', name:'கீழ்ப்பூங்குடி நாராயண சுவாமிகள்', tamilMonth:'ஐப்பசி', star:'மகம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-11-03'},
  {id:'44', name:'சிதம்பர பொன்னம்பல சுவாமிகள்', tamilMonth:'ஐப்பசி', star:'சித்திரை', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-11-07'},
  {id:'45', name:'சோர்ணாதபுரம் பழனியப்ப ஐயா', tamilMonth:'ஐப்பசி', star:'உத்திராடம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-10-19'},
  {id:'46', name:'இரவாரம் வள்ளியப்ப ஐயா', tamilMonth:'கார்த்திகை', star:'திருவாதிரை', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-11-27'},
  {id:'47', name:'காரைக்குடி திருநாவுக்கரசு சுவாமிகள்', tamilMonth:'கார்த்திகை', star:'திருவோணம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-11-16'},
  {id:'48', name:'ஸ்ரீமத் ராமசாமி ஞான தேசிகர் (4வது)', tamilMonth:'மார்கழி', star:'மகம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2026-12-28'},
  {id:'49', name:'இயற்கை நாயனார்', tamilMonth:'மார்கழி', star:'உத்திரம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2026-12-30'},
  {id:'50', name:'ஈசான்ய ஞான தேசிகர்', tamilMonth:'மார்கழி', star:'மிருகசீரிஷம்', isPublic:false, pax:75, contacts:[], notes:'⚠ kshaya – பஞ்சாங்கம் உறுதிப்படுத்தவும்', date:'2026-12-23'},
  {id:'51', name:'கழையார்கோவில் ஜமீன்தார்', tamilMonth:'மார்கழி', star:'மிருகசீரிஷம்', isPublic:false, pax:75, contacts:[], notes:'⚠ kshaya – பஞ்சாங்கம் உறுதிப்படுத்தவும்', date:'2026-12-23'},
  {id:'52', name:'மேலடகம் பழனியப்ப ஐயா', tamilMonth:'தை', star:'பூரம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-01-25'},
  {id:'53', name:'திருப்புவனம் ஸ்ரீ காசிகானந்த சுவாமிகள்', tamilMonth:'தை', star:'சுவாதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-01-29'},
  {id:'54', name:'ஸ்ரீ ல ஸ்ரீ மெய்யப்ப ஞான தேசிகர் (13வது)', tamilMonth:'தை', star:'விசாகம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2027-01-30'},
  {id:'55', name:'சாது பரமானந்த சுவாமிகள்', tamilMonth:'தை', star:'மூலம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-02-03'},
  {id:'56', name:'களிகம்ப நாயனார்', tamilMonth:'தை', star:'ரேவதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-01-15'},
  {id:'57', name:'சாது பட்டமங்கலம் கருப்பையாசாமிகள்', tamilMonth:'தை', star:'ரோகிணி', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-01-19'},
  {id:'58', name:'ஸ்ரீ சோர்ணம் சுவாமிகள்', tamilMonth:'தை', star:'திருவாதிரை', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-01-21'},
  {id:'59', name:'பள்ளத்தூர் முத்துவீரப்ப ஐயா', tamilMonth:'தை', star:'புனர்பூசம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-01-21'},
  {id:'60', name:'காரைக்குடி ஸ்ரீமத் சோமசுந்தர ஞான தேசிகர் (8வது)', tamilMonth:'மாசி', star:'சுவாதி', isPublic:false, pax:100, contacts:[], notes:'', date:'2027-02-25'},
  {id:'61', name:'நல்லூர் பழனிமுத்து ஐயா', tamilMonth:'மாசி', star:'பூராடம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-03-03'},
  {id:'62', name:'கொ. அழகாபுரி ஸ்ரீ ராமநாத சுவாமிகள்', tamilMonth:'மாசி', star:'மகம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-02-21'},
  {id:'63', name:'காரைக்கால் அம்மையார்', tamilMonth:'பங்குனி', star:'சுவாதி', isPublic:true, pax:500, contacts:[], notes:'', date:'2027-03-25'},
  {id:'64', name:'சண்முகநாதபுரம் முத்தையா சுவாமிகள்', tamilMonth:'பங்குனி', star:'திருவோணம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-04-02'},
  {id:'65', name:'சிவன் செயல் மடம்', tamilMonth:'பங்குனி', star:'உத்திரட்டாதி', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-04-06'},
  {id:'66', name:'காரைக்குடி அண்ணாமலை ஐயா', tamilMonth:'பங்குனி', star:'மிருகசீரிஷம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-03-15'},
  {id:'67', name:'ஸ்ரீமத் சிக்கல் ஆண்டவர்', tamilMonth:'பங்குனி', star:'மகம்', isPublic:false, pax:100, contacts:[], notes:'', date:'2027-03-20'},
  {id:'68', name:'கோவிலூர் ஸ்ரீ ல ஸ்ரீ முத்துராமலிங்க ஆண்டவர்', tamilMonth:'பங்குனி', star:'உத்திரம்', isPublic:true, pax:1000, contacts:[], notes:'வருடாந்திர மகா குருபூஜை', date:'2027-03-22'},
  {id:'69', name:'மானாமதுரை நாராயண சுவாமிகள்', tamilMonth:'பங்குனி', star:'ஹஸ்தம்', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-03-23'},
  {id:'70', name:'கோட்டையூர் அண்ணாமலை ஐயா', tamilMonth:'பங்குனி', star:'சித்திரை', isPublic:false, pax:75, contacts:[], notes:'', date:'2027-03-24'},
].map(s => ({...s, alertSent:false, calAdded:false}));

// ── Styles ────────────────────────────────────────────────────────
const lbl = { display:'block', fontSize:'.8rem', fontWeight:600, color:'#4b5563', marginBottom:'.25rem' };
const inp = { width:'100%', border:'1px solid #d1d5db', borderRadius:'.45rem', padding:'.45rem .7rem', fontSize:'.875rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
const smBtn = { border:'none', borderRadius:'.45rem', cursor:'pointer', fontWeight:500, fontSize:'.82rem', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'.25rem' };
const pill = (bg, c) => ({ ...smBtn, background:bg, color:c, padding:'.2rem .65rem', whiteSpace:'nowrap' });

// ── Login Screen ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const tryLogin = () => {
    if (pw === APP_PASSWORD) { onLogin(); }
    else { setErr(true); setPw(''); setTimeout(() => setErr(false), 2000); }
  };
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#92400e,#c05621,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:'1.25rem', padding:'2.5rem 2rem', width:'100%', maxWidth:380, boxShadow:'0 25px 50px rgba(0,0,0,.3)', textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>🙏</div>
        <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#92400e', marginBottom:'.25rem' }}>{MUTT}</div>
        <div style={{ fontSize:'.85rem', color:'#c05621', marginBottom:'2rem' }}>குருபூஜை மேலாண்மை · {YEAR_LABEL}</div>
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ ...lbl, textAlign:'left' }}>கடவுச்சொல்</label>
          <input
            type="password" value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryLogin()}
            placeholder="கடவுச்சொல் உள்ளிடவும்"
            style={{ ...inp, textAlign:'center', letterSpacing:'.15rem', border: err ? '1.5px solid #ef4444' : '1px solid #d1d5db' }}
            autoFocus
          />
          {err && <div style={{ color:'#ef4444', fontSize:'.8rem', marginTop:'.4rem' }}>தவறான கடவுச்சொல்</div>}
        </div>
        <button onClick={tryLogin} style={{ width:'100%', background:'linear-gradient(135deg,#c05621,#d97706)', color:'#fff', border:'none', borderRadius:'.6rem', padding:'.75rem', fontWeight:700, fontSize:'1rem', cursor:'pointer' }}>
          உள்நுழை
        </button>
        <div style={{ marginTop:'1.5rem', fontSize:'.75rem', color:'#9ca3af' }}>ஸ்ரீ சற்குருநாதன் துணை</div>
      </div>
    </div>
  );
}

// ── Saint Modal ───────────────────────────────────────────────────
function SaintModal({ saint, onSave, onClose }) {
  const blank = { name:'', tamilMonth:'சித்திரை', star:'மகம்', isPublic:false, pax:100, notes:'', date:'', contacts:[] };
  const [f, setF] = useState(saint ? { ...blank, ...saint } : blank);
  const [nc, setNc] = useState({ name:'', email:'', phone:'', address:'' });
  const [showCF, setShowCF] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const addC = () => {
    if (nc.name) { setF(p => ({ ...p, contacts:[...p.contacts,{...nc}] })); setNc({ name:'', email:'', phone:'', address:'' }); setShowCF(false); }
  };
  const updContact = (i, k, v) => setF(p => ({ ...p, contacts: p.contacts.map((c,ci) => ci===i ? {...c,[k]:v} : c) }));
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:'1rem', maxWidth:'520px', width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 25px 50px rgba(0,0,0,.25)' }}>
        <div style={{ background:'linear-gradient(135deg,#c05621,#d97706)', color:'#fff', padding:'1rem 1.5rem', borderRadius:'1rem 1rem 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700 }}>{saint ? 'குருபூஜை திருத்து' : 'புதிய குருபூஜை'}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'.9rem' }}>
          <div><label style={lbl}>குரு / நிகழ்வு பெயர் *</label>
            <input value={f.name} onChange={e => upd('name',e.target.value)} style={inp} placeholder="மகான் / நிகழ்வு பெயர்..." /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem' }}>
            <div><label style={lbl}>தமிழ் மாதம்</label>
              <select value={f.tamilMonth} onChange={e => upd('tamilMonth',e.target.value)} style={inp}>{TAMIL_MONTHS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label style={lbl}>நட்சத்திரம்</label>
              <select value={f.star} onChange={e => upd('star',e.target.value)} style={inp}>{STARS.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem' }}>
            <div><label style={lbl}>பராபவ தேதி</label>
              <input type="date" value={f.date} onChange={e => upd('date',e.target.value)} style={inp} min="2026-04-14" max="2027-04-13" /></div>
            <div><label style={lbl}>எதிர்பார்க்கப்படும் பேர்</label>
              <input type="number" value={f.pax} min="1" onChange={e => upd('pax',parseInt(e.target.value)||0)} style={inp} /></div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
            <input type="checkbox" checked={f.isPublic} onChange={e => upd('isPublic',e.target.checked)} style={{ width:16, height:16, accentColor:'#c05621' }} />
            <span style={{ fontSize:'.875rem', color:'#374151' }}>பொது நிகழ்ச்சி</span>
          </label>
          <div><label style={lbl}>குறிப்புகள்</label>
            <textarea value={f.notes} onChange={e => upd('notes',e.target.value)} style={{ ...inp, height:'60px', resize:'vertical' }} /></div>

          {/* Contacts */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.5rem' }}>
              <label style={lbl}>குடும்ப தொடர்பு ({f.contacts.length})</label>
              <button onClick={() => setShowCF(!showCF)} style={{ ...smBtn, background:'#fed7aa', color:'#c05621', padding:'.2rem .6rem' }}>+ சேர்</button>
            </div>
            {/* Add new contact form */}
            {showCF && (
              <div style={{ background:'#fff7ed', borderRadius:'.5rem', padding:'.75rem', marginBottom:'.5rem', display:'flex', flexDirection:'column', gap:'.4rem' }}>
                <div style={{ fontWeight:600, fontSize:'.8rem', color:'#c05621', marginBottom:'.2rem' }}>புதிய தொடர்பு</div>
                {[['name','பெயர் *'],['email','மின்னஞ்சல்'],['phone','தொலைபேசி'],['address','முகவரி']].map(([k,p]) => (
                  <input key={k} placeholder={p} value={nc[k]} onChange={e => setNc(c=>({...c,[k]:e.target.value}))} style={{ ...inp, fontSize:'.8rem', padding:'.35rem .6rem' }} />
                ))}
                <div style={{ display:'flex', gap:'.5rem' }}>
                  <button onClick={addC} style={{ flex:1, ...smBtn, background:'#c05621', color:'#fff', padding:'.45rem' }}>சேர்</button>
                  <button onClick={() => setShowCF(false)} style={{ flex:1, ...smBtn, background:'#e5e7eb', color:'#374151', padding:'.45rem' }}>ரத்து</button>
                </div>
              </div>
            )}
            {/* Edit existing contacts */}
            {f.contacts.map((c,i) => (
              <div key={i} style={{ background:'#f9fafb', borderRadius:'.5rem', padding:'.65rem .75rem', marginBottom:'.4rem', border:'1px solid #e5e7eb' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.4rem' }}>
                  <span style={{ fontWeight:600, fontSize:'.8rem', color:'#374151' }}>தொடர்பு {i+1}</span>
                  <button onClick={() => setF(p=>({...p,contacts:p.contacts.filter((_,ci)=>ci!==i)}))} style={{ ...smBtn, background:'#fee2e2', color:'#ef4444', padding:'.15rem .45rem', fontSize:'.75rem' }}>✕ நீக்கு</button>
                </div>
                {[['name','பெயர்'],['email','மின்னஞ்சல்'],['phone','தொலைபேசி'],['address','முகவரி']].map(([k,label]) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.25rem' }}>
                    <span style={{ width:72, color:'#9ca3af', fontSize:'.75rem', flexShrink:0 }}>{label}</span>
                    <input value={c[k]||''} onChange={e => updContact(i,k,e.target.value)}
                      style={{ flex:1, border:'1px solid #d1d5db', borderRadius:'.3rem', padding:'.25rem .45rem', fontSize:'.78rem', fontFamily:'inherit', outline:'none' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:'.75rem' }}>
            <button onClick={() => onSave(f)} style={{ flex:1, background:'#c05621', color:'#fff', border:'none', borderRadius:'.6rem', padding:'.7rem', fontWeight:700, cursor:'pointer', fontSize:'1rem' }}>
              💾 சேமி
            </button>
            <button onClick={onClose} style={{ flex:1, background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'.6rem', padding:'.7rem', cursor:'pointer' }}>ரத்து</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Letter Modal ──────────────────────────────────────────────────
function LetterModal({ saint, onClose }) {
  const txt = generateLetter(saint);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:'1rem', maxWidth:'500px', width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 25px 50px rgba(0,0,0,.25)' }}>
        <div style={{ background:'linear-gradient(135deg,#c05621,#d97706)', color:'#fff', padding:'1rem 1.5rem', borderRadius:'1rem 1rem 0 0', display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700 }}>திருமுகம் — {saint.name}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'1.25rem' }}>
          <pre style={{ whiteSpace:'pre-wrap', fontSize:'.9rem', color:'#1a1a2e', background:'#fffff8', borderRadius:'.5rem', padding:'1.25rem', lineHeight:2, border:'1px solid #e5e7eb', fontFamily:'inherit' }}>{txt}</pre>
          <div style={{ display:'flex', gap:'.75rem', marginTop:'1rem' }}>
            <button onClick={() => { navigator.clipboard?.writeText(txt); }} style={{ flex:1, ...smBtn, background:'#c05621', color:'#fff', padding:'.65rem', fontWeight:600 }}>📋 நகல் எடு</button>
            <button onClick={onClose} style={{ flex:1, ...smBtn, background:'#f3f4f6', color:'#374151', padding:'.65rem' }}>மூடு</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('gp_auth') === '1');
  const [tab, setTab] = useState('dashboard');
  const [saints, setSaints] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editSaint, setEditSaint] = useState(null);
  const [letterSaint, setLetterSaint] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [search, setSearch] = useState('');

  const handleLogin = () => { sessionStorage.setItem('gp_auth','1'); setLoggedIn(true); };
  if (!loggedIn) return <LoginScreen onLogin={handleLogin} />;

  const toast$ = (msg, type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  // Load from Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, COL));
        if (snap.empty) {
          // First time — seed with default data
          await seedFirestore();
          setSaints(DEFAULT_SAINTS);
        } else {
          const data = [];
          snap.forEach(d => data.push(d.data()));
          data.sort((a,b) => parseInt(a.id) - parseInt(b.id));
          setSaints(data);
        }
      } catch(e) {
        console.error('Load error:', e);
        setSaints(DEFAULT_SAINTS);
        toast$('Firebase load பிழை — offline mode', 'err');
      }
      setLoaded(true);
    })();
  }, []);

  const seedFirestore = async () => {
    const batch = writeBatch(db);
    DEFAULT_SAINTS.forEach(s => batch.set(doc(db, COL, s.id), s));
    await batch.commit();
  };

  // Save single saint to Firestore
  const saveSaint = async (saint) => {
    setSaving(true);
    try {
      await setDoc(doc(db, COL, saint.id), saint);
    } catch(e) {
      toast$('சேமிப்பு பிழை: ' + e.message, 'err');
    }
    setSaving(false);
  };

  const upd = async (id, ch) => {
    const updated = saints.map(s => s.id===id ? {...s,...ch} : s);
    setSaints(updated);
    const saint = updated.find(s => s.id===id);
    await saveSaint(saint);
  };

  const addS = async (data) => {
    const newId = (Math.max(...saints.map(s=>parseInt(s.id)||0)) + 1).toString();
    const saint = { ...data, id:newId, alertSent:false, calAdded:false };
    setSaints(p => [...p, saint]);
    await saveSaint(saint);
  };

  const delS = async (id) => {
    if (!window.confirm('இந்த குருபூஜையை நீக்கவா?')) return;
    setSaints(p => p.filter(s => s.id!==id));
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, COL, id));
    } catch(e) { toast$('நீக்கல் பிழை', 'err'); }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = saints.filter(s=>s.date).map(s=>({...s,dl:daysUntil(s.date)})).filter(s=>s.dl!==null&&s.dl>=0&&s.dl<=60).sort((a,b)=>a.dl-b.dl);
  const alertsDue = saints.filter(s=>s.date&&!s.alertSent&&alertDue(s.date)<=today);
  const filtered = saints.filter(s=>(!filterMonth||s.tamilMonth===filterMonth)&&(!search||s.name.includes(search)||s.star.includes(search)));
  const totalDated = saints.filter(s=>s.date).length;
  const TABS = [['dashboard','🏠 முகப்பு'],['schedule','📅 அட்டவணை'],['saints','👤 குரு பட்டியல்'],['kitchen','🍱 சமையலறை']];

  if (!loaded) return (
    <div style={{ minHeight:'100vh', background:'#fff7ed', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
      <div style={{ fontSize:'2rem' }}>🙏</div>
      <div style={{ color:'#c05621', fontWeight:600 }}>Firebase-இலிருந்து ஏற்றுகிறது...</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#fff7ed', fontFamily:"'Noto Sans Tamil',sans-serif" }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#92400e,#c05621,#d97706)', color:'#fff', padding:'.9rem 1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:'1.1rem', fontWeight:800 }}>🙏 குருபூஜை மேலாண்மை</div>
            <div style={{ fontSize:'.78rem', opacity:.85, marginTop:'.1rem' }}>{MUTT} · {YEAR_LABEL}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            {saving && <div style={{ fontSize:'.75rem', opacity:.8 }}>சேமிக்கிறது...</div>}
            <div style={{ textAlign:'right', fontSize:'.78rem', opacity:.85, lineHeight:1.6 }}>
              <div>{saints.length} குருபூஜைகள்</div>
              <div>{totalDated} தேதி நிர்ணயம்</div>
            </div>
            <button onClick={() => { sessionStorage.removeItem('gp_auth'); setLoggedIn(false); }}
              style={{ ...smBtn, background:'rgba(255,255,255,.2)', color:'#fff', padding:'.3rem .7rem', fontSize:'.75rem' }}>வெளியேறு</button>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {alertsDue.length>0 && (
        <div style={{ background:'#fef2f2', borderBottom:'1px solid #fca5a5', padding:'.5rem 1.25rem' }}>
          <div style={{ maxWidth:900, margin:'0 auto', color:'#b91c1c', fontSize:'.84rem', fontWeight:600 }}>
            ⚠️ {alertsDue.length} குருபூஜைக்கு இன்று அறிவிப்பு அனுப்ப வேண்டும்!
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={{ position:'fixed', top:'1rem', right:'1rem', zIndex:200, background:toast.type==='err'?'#dc2626':'#16a34a', color:'#fff', padding:'.7rem 1.1rem', borderRadius:'.6rem', boxShadow:'0 4px 12px rgba(0,0,0,.25)', fontSize:'.85rem', fontWeight:500 }}>{toast.msg}</div>}

      {/* Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #fed7aa', overflowX:'auto' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex' }}>
          {TABS.map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ padding:'.75rem 1.1rem', border:'none', borderBottom:tab===id?'2.5px solid #c05621':'2.5px solid transparent', background:'none', color:tab===id?'#c05621':'#6b7280', fontWeight:tab===id?700:400, cursor:'pointer', fontSize:'.84rem', whiteSpace:'nowrap', fontFamily:'inherit' }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'1.25rem' }}>

        {/* ── DASHBOARD ── */}
        {tab==='dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'.75rem' }}>
              {[['மொத்தம்',saints.length,'#c05621'],['தேதி நிர்ணயம்',totalDated,'#16a34a'],['நிலுவை',saints.length-totalDated,'#d97706'],['பொது',saints.filter(s=>s.isPublic).length,'#7c3aed']].map(([l,v,c])=>(
                <div key={l} style={{ background:'#fff', borderRadius:'.75rem', padding:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,.08)', border:'1px solid #fed7aa' }}>
                  <div style={{ fontSize:'1.6rem', fontWeight:800, color:c }}>{v}</div>
                  <div style={{ fontSize:'.75rem', color:'#6b7280', marginTop:'.2rem' }}>{l}</div>
                </div>
              ))}
            </div>
            {alertsDue.length>0 && (
              <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'.75rem', padding:'1rem' }}>
                <div style={{ fontWeight:700, color:'#b91c1c', marginBottom:'.6rem' }}>⚠️ இப்போது அறிவிப்பு அனுப்ப வேண்டியவை</div>
                {alertsDue.map(s => (
                  <div key={s.id} style={{ background:'#fff', borderRadius:'.5rem', padding:'.65rem .85rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.4rem' }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:'.75rem', color:'#6b7280' }}>{fmtDate(s.date)} · {s.tamilMonth} {s.star}</div>
                    </div>
                    <button onClick={()=>setLetterSaint(s)} style={pill('#dbeafe','#1d4ed8')}>📄 திருமுகம்</button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div style={{ fontWeight:700, color:'#374151', marginBottom:'.6rem' }}>🗓 அடுத்த 60 நாட்களில் ({upcoming.length})</div>
              {upcoming.length===0
                ? <div style={{ background:'#fff', borderRadius:'.75rem', padding:'2rem', textAlign:'center', color:'#9ca3af', border:'1px solid #fed7aa' }}>அடுத்த 60 நாட்களில் நிகழ்வுகள் இல்லை</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
                  {upcoming.map(s => {
                    const urgent=s.dl<=5, warn=s.dl<=20;
                    return (
                      <div key={s.id} style={{ background:urgent?'#fef2f2':warn?'#fefce8':'#fff', borderRadius:'.75rem', padding:'.75rem 1rem', display:'flex', alignItems:'center', gap:'.75rem', border:`1px solid ${urgent?'#fca5a5':warn?'#fde68a':'#fed7aa'}` }}>
                        <div style={{ minWidth:42, height:42, borderRadius:'50%', background:urgent?'#ef4444':warn?'#d97706':'#c05621', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.75rem', fontWeight:700 }}>{s.dl}d</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:'.875rem', display:'flex', gap:'.35rem', flexWrap:'wrap', alignItems:'center' }}>
                            {s.name} {s.isPublic&&<span style={pill('#ede9fe','#7c3aed')}>பொது</span>}
                          </div>
                          <div style={{ fontSize:'.75rem', color:'#6b7280' }}>{fmtDate(s.date)} · {s.tamilMonth} {s.star} · {s.pax} பேர்</div>
                        </div>
                        <button onClick={()=>setLetterSaint(s)} style={pill('#dbeafe','#1d4ed8')}>📄</button>
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab==='schedule' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:'1.05rem', color:'#374151' }}>{YEAR_LABEL} அட்டவணை</div>
              <div style={{ fontSize:'.8rem', color:'#6b7280' }}>{totalDated}/{saints.length}</div>
            </div>
            <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'.5rem', padding:'.65rem .9rem', fontSize:'.8rem', color:'#92400e' }}>
              💡 தேதி மாற்றினால் உடனே Firebase-ல் சேமிக்கப்படும்
            </div>
            <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap' }}>
              {['', ...TAMIL_MONTHS].map(m=>(
                <button key={m||'all'} onClick={()=>setFilterMonth(m)} style={{ ...pill(filterMonth===m?'#c05621':'#fff',filterMonth===m?'#fff':'#6b7280'), padding:'.25rem .65rem', border:filterMonth===m?'none':'1px solid #d1d5db' }}>{m||'அனைத்தும்'}</button>
              ))}
            </div>
            <div style={{ background:'#fff', borderRadius:'.75rem', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.82rem' }}>
                  <thead>
                    <tr style={{ background:'linear-gradient(135deg,#92400e,#c05621)', color:'#fff' }}>
                      {['#','குரு / நிகழ்வு','மாதம்','நட்சத்திரம்','தேதி 2026-27','பொது','பேர்','செயல்'].map(h=>(
                        <th key={h} style={{ padding:'.6rem .75rem', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s,i)=>(
                      <tr key={s.id} style={{ background:i%2===0?'#fff':'#fff7ed', borderBottom:'1px solid #fed7aa' }}>
                        <td style={{ padding:'.55rem .5rem', color:'#9ca3af', fontSize:'.75rem' }}>{s.id}</td>
                        <td style={{ padding:'.55rem .75rem' }}>
                          <div style={{ fontWeight:600 }}>{s.name}</div>
                          {s.notes&&<div style={{ fontSize:'.72rem', color:s.notes.includes('⚠')?'#d97706':'#9ca3af' }}>{s.notes}</div>}
                        </td>
                        <td style={{ padding:'.55rem .75rem', color:'#6b7280', whiteSpace:'nowrap' }}>{s.tamilMonth}</td>
                        <td style={{ padding:'.55rem .75rem', color:'#6b7280', whiteSpace:'nowrap' }}>{s.star}</td>
                        <td style={{ padding:'.55rem .75rem' }}>
                          <input type="date" value={s.date||''} min="2026-04-14" max="2027-04-13"
                            onChange={e => upd(s.id,{date:e.target.value})}
                            style={{ border:'1px solid #d97706', borderRadius:'.35rem', padding:'.3rem .45rem', fontSize:'.78rem', width:130 }} />
                        </td>
                        <td style={{ padding:'.55rem .75rem', textAlign:'center' }}>
                          <input type="checkbox" checked={s.isPublic} onChange={e=>upd(s.id,{isPublic:e.target.checked})} style={{ accentColor:'#c05621', width:15, height:15 }} />
                        </td>
                        <td style={{ padding:'.55rem .75rem' }}>
                          <input type="number" value={s.pax} min="1" onChange={e=>upd(s.id,{pax:parseInt(e.target.value)||s.pax})}
                            style={{ border:'1px solid #d1d5db', borderRadius:'.35rem', padding:'.3rem .4rem', width:65, fontSize:'.78rem' }} />
                        </td>
                        <td style={{ padding:'.55rem .5rem' }}>
                          <div style={{ display:'flex', gap:'.3rem' }}>
                            <button onClick={()=>setLetterSaint(s)} style={{ ...pill('#dbeafe','#1d4ed8'), fontSize:'.72rem', padding:'.2rem .45rem' }}>📄</button>
                            <button onClick={()=>{setEditSaint(s);setShowModal(true);}} style={{ ...pill('#f3f4f6','#374151'), fontSize:'.72rem', padding:'.2rem .45rem' }}>✏️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SAINTS DB ── */}
        {tab==='saints' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:'1.05rem', color:'#374151' }}>குரு பட்டியல் & குடும்ப தொடர்பு</div>
              <button onClick={()=>{setEditSaint(null);setShowModal(true);}} style={{ ...smBtn, background:'#c05621', color:'#fff', padding:'.45rem .9rem' }}>+ புதியது</button>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="பெயர் / நட்சத்திரம் தேடு..." style={{ ...inp, padding:'.55rem .85rem' }} />
            <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
              {filtered.map(s=>(
                <div key={s.id} style={{ background:'#fff', borderRadius:'.75rem', padding:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,.07)', border:'1px solid #fed7aa' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap', alignItems:'center', marginBottom:'.3rem' }}>
                        <span style={{ fontWeight:700, color:'#1f2937' }}>{s.name}</span>
                        {s.isPublic&&<span style={pill('#ede9fe','#7c3aed')}>பொது</span>}
                      </div>
                      <div style={{ fontSize:'.8rem', color:'#6b7280' }}>{s.tamilMonth} · {s.star} · {s.pax} பேர்</div>
                      {s.date&&<div style={{ fontSize:'.8rem', color:'#c05621', marginTop:'.2rem' }}>📅 {fmtDate(s.date)}</div>}
                      {s.contacts?.length>0 && (
                        <div style={{ marginTop:'.4rem' }}>
                          {s.contacts.map((c,i)=>(
                            <div key={i} style={{ fontSize:'.78rem', color:'#4b5563', marginBottom:'.15rem' }}>
                              👤 <b>{c.name}</b>{c.email&&<> · <a href={`mailto:${c.email}`} style={{ color:'#c05621' }}>{c.email}</a></>}{c.phone&&` · 📞 ${c.phone}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {s.notes&&<div style={{ fontSize:'.75rem', color:s.notes.includes('⚠')?'#d97706':'#9ca3af', marginTop:'.3rem' }}>{s.notes}</div>}
                    </div>
                    <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap', justifyContent:'flex-end' }}>
                      <button onClick={()=>{setEditSaint(s);setShowModal(true);}} style={pill('#dbeafe','#1d4ed8')}>✏️ திருத்து</button>
                      <button onClick={()=>setLetterSaint(s)} style={pill('#dcfce7','#16a34a')}>📄 திருமுகம்</button>
                      <button onClick={()=>delS(s.id)} style={pill('#fee2e2','#dc2626')}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── KITCHEN ── */}
        {tab==='kitchen' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div style={{ fontWeight:700, fontSize:'1.05rem', color:'#374151' }}>🍱 சமையலறை திட்டமிடல் — {YEAR_LABEL}</div>
            <div style={{ background:'#fff', borderRadius:'.75rem', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ background:'linear-gradient(135deg,#92400e,#c05621)', color:'#fff', padding:'.75rem 1rem', fontWeight:600 }}>அடுத்த 30 நாட்களில் சமையல் தேவை</div>
              {upcoming.filter(s=>s.dl<=30).length===0
                ? <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>அடுத்த 30 நாட்களில் நிகழ்வுகள் இல்லை</div>
                : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.83rem' }}>
                    <thead style={{ background:'#fff7ed' }}><tr>{['தேதி','குரு / நிகழ்வு','பொது','பேர்','குறிப்பு'].map(h=><th key={h} style={{ padding:'.55rem .75rem', textAlign:'left', fontWeight:600 }}>{h}</th>)}</tr></thead>
                    <tbody>{upcoming.filter(s=>s.dl<=30).map((s,i)=>(
                      <tr key={s.id} style={{ borderTop:'1px solid #fed7aa', background:i%2===0?'#fff':'#fff7ed' }}>
                        <td style={{ padding:'.6rem .75rem' }}><div style={{ color:'#c05621', fontWeight:600 }}>{fmtDate(s.date)}</div><div style={{ fontSize:'.72rem', color:'#9ca3af' }}>{s.dl} நாட்களில்</div></td>
                        <td style={{ padding:'.6rem .75rem', fontWeight:600 }}>{s.name}</td>
                        <td style={{ padding:'.6rem .75rem', textAlign:'center' }}>{s.isPublic?<span style={{ color:'#16a34a', fontWeight:700 }}>ஆம்</span>:'—'}</td>
                        <td style={{ padding:'.6rem .75rem', textAlign:'center' }}>
                          <input type="number" value={s.pax} min="1" onChange={e=>upd(s.id,{pax:parseInt(e.target.value)||s.pax})}
                            style={{ border:'1px solid #d97706', borderRadius:'.35rem', padding:'.3rem .5rem', width:70, textAlign:'center', fontWeight:700, color:'#c05621' }} />
                        </td>
                        <td style={{ padding:'.6rem .75rem' }}>
                          <input type="text" placeholder="குறிப்பு..." value={s.kitchenNotes||''} onChange={e=>upd(s.id,{kitchenNotes:e.target.value})}
                            style={{ ...inp, padding:'.3rem .55rem', fontSize:'.78rem' }} />
                        </td>
                      </tr>
                    ))}</tbody>
                    <tfoot style={{ background:'#fef3c7' }}><tr>
                      <td colSpan={3} style={{ padding:'.6rem .75rem', fontWeight:700, textAlign:'right' }}>மொத்தம்:</td>
                      <td style={{ padding:'.6rem .75rem', textAlign:'center', fontWeight:800, fontSize:'1.1rem', color:'#c05621' }}>{upcoming.filter(s=>s.dl<=30).reduce((sum,s)=>sum+(parseInt(s.pax)||0),0)}</td>
                      <td></td>
                    </tr></tfoot>
                  </table>
                </div>
              }
            </div>
            <div style={{ background:'#fff', borderRadius:'.75rem', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ background:'linear-gradient(135deg,#92400e,#c05621)', color:'#fff', padding:'.75rem 1rem', fontWeight:600 }}>மாத வாரியாக சுருக்கம்</div>
              <div style={{ padding:'1rem', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'.75rem' }}>
                {TAMIL_MONTHS.map(m=>{
                  const ms=saints.filter(s=>s.tamilMonth===m&&s.date);
                  if(!ms.length)return null;
                  return(<div key={m} style={{ background:'#fff7ed', borderRadius:'.6rem', padding:'.75rem', border:'1px solid #fed7aa' }}>
                    <div style={{ fontWeight:700, color:'#c05621' }}>{m}</div>
                    <div style={{ fontSize:'.75rem', color:'#6b7280' }}>{ms.length} நிகழ்வுகள்</div>
                    <div style={{ fontSize:'1.25rem', fontWeight:800, color:'#1f2937' }}>{ms.reduce((s,x)=>s+(parseInt(x.pax)||0),0)} பேர்</div>
                  </div>);
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal&&<SaintModal saint={editSaint} onClose={()=>{setShowModal(false);setEditSaint(null);}}
        onSave={async data=>{
          if(editSaint) await upd(editSaint.id,data);
          else await addS(data);
          setShowModal(false);setEditSaint(null);
          toast$('✓ Firebase-ல் சேமிக்கப்பட்டது');
        }} />}
      {letterSaint&&<LetterModal saint={letterSaint} onClose={()=>setLetterSaint(null)} />}
    </div>
  );
}
