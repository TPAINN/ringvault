/* RingVault web app — extracted from app.html for strict CSP. */
'use strict';

/* ---------- lucide-style inline icons ---------- */
var ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  heartOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>'
};
function icon(name) { return ICONS[name] || ''; }
function setIcon(el, name) { if (el) el.innerHTML = icon(name); }


(function(){
  'use strict';
  var audio = document.getElementById('audio');
  var CATALOG = [], state = { cat:'ringtone', dur:0, sort:'short', q:'', tag:'' };
  var playingId = null;

  /* favorites (localStorage) */
  var FAV = new Set();
  try { FAV = new Set(JSON.parse(localStorage.getItem('rv_favs') || '[]')); } catch(e){}
  function saveFav(){ try { localStorage.setItem('rv_favs', JSON.stringify([...FAV])); } catch(e){} }
  function baseItems(){
    return state.cat==='fav'
      ? CATALOG.filter(function(s){ return FAV.has(s.id); })
      : CATALOG.filter(function(s){ return s.category===state.cat; });
  }

  /* ---------- load ---------- */
  function boot(data){
    CATALOG = (data||[]).filter(function(s){ return s && s.url && s.durationSec; });
    if(!CATALOG.length){ document.getElementById('status').textContent='Άδειο catalog. Τρέξε: node scripts/harvest-web.js'; return; }
    document.getElementById('status').style.display='none';
    buildTabs(); render();
  }
  function tryBoot(){
    if(window.RINGVAULT_CATALOG){ boot(window.RINGVAULT_CATALOG); return; }
    fetch('catalog.json').then(function(r){return r.json();}).then(boot).catch(function(){
      var s=document.getElementById('status');
      if(s){ s.style.display=''; s.innerHTML='Σφάλμα φόρτωσης. Ανανέωσε.'; }
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',tryBoot);
  } else { setTimeout(tryBoot, 0); }  /* deferred script: let the rest of this IIFE finish first */

  /* ---------- tabs ---------- */
  var LABELS = { ringtone:'Ringtones', notification:'Notifications', alarm:'Alarms', fav:'Αγαπημένα' };
  function buildTabs(){
    var counts = { ringtone:0, notification:0, alarm:0 };
    CATALOG.forEach(function(s){ if(counts[s.category]!=null) counts[s.category]++; });
    counts.fav = FAV.size;
    var el = document.getElementById('tabs'); el.innerHTML='';
    ['ringtone','notification','alarm','fav'].forEach(function(c){
      var b=document.createElement('button');
      b.className='tab'+(c===state.cat?' on':'');
      b.innerHTML=(c==='fav'?icon('heart')+' ':'')+LABELS[c]+' <small>('+counts[c]+')</small>';
      b.onclick=function(){ state.cat=c; state.tag=''; document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');}); b.classList.add('on'); buildTags(); render(); };
      el.appendChild(b);
    });
    buildTags();
  }

  /* ---------- tag chips (top tags in current category) ---------- */
  function buildTags(){
    var freq={};
    baseItems().forEach(function(s){
      (s.tags||[]).forEach(function(t){ if(t.length>1&&t.length<16) freq[t]=(freq[t]||0)+1; });
    });
    var top=Object.keys(freq).sort(function(a,b){return freq[b]-freq[a];}).slice(0,14);
    var bar=document.getElementById('tagbar'); bar.innerHTML='';
    if(!top.length) return;
    var all=document.createElement('span'); all.className='chip'+(state.tag===''?' on':''); all.textContent='# όλα';
    all.onclick=function(){ state.tag=''; buildTags(); render(); }; bar.appendChild(all);
    top.forEach(function(t){
      var c=document.createElement('span'); c.className='chip'+(state.tag===t?' on':''); c.textContent='#'+t;
      c.onclick=function(){ state.tag=(state.tag===t?'':t); buildTags(); render(); }; bar.appendChild(c);
    });
  }

  /* ---------- render list ---------- */
  function currentItems(){
    var items=baseItems();
    if(state.dur) items=items.filter(function(s){ return s.durationSec<=state.dur; });
    if(state.tag) items=items.filter(function(s){ return (s.tags||[]).indexOf(state.tag)>-1; });
    if(state.q){ var q=state.q.toLowerCase();
      items=items.filter(function(s){ return s.title.toLowerCase().indexOf(q)>-1 || (s.tags||[]).join(' ').indexOf(q)>-1; }); }
    if(state.sort==='short') items.sort(function(a,b){return a.durationSec-b.durationSec;});
    else if(state.sort==='new') items.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
    else if(state.sort==='popular') items.sort(function(a,b){return (b.popularity||0)-(a.popularity||0);});
    else if(state.sort==='random') items.sort(function(){return Math.random()-0.5;});
    return items;
  }

  function render(){
    var items=currentItems();
    document.getElementById('count').textContent=items.length+' ήχοι · '+LABELS[state.cat];
    var list=document.getElementById('list'); list.innerHTML='';
    if(!items.length){
      list.innerHTML = state.cat==='fav'
        ? '<div class="empty">Δεν έχεις αγαπημένα ακόμα.<br>Πάτα την καρδιά σε όποιον ήχο σ\' αρέσει.</div>'
        : '<div class="empty">Κανένας ήχος με αυτά τα φίλτρα.</div>';
      return;
    }
    var frag=document.createDocumentFragment();
    items.forEach(function(s){ frag.appendChild(card(s)); });
    list.appendChild(frag);
  }

  function card(s){
    var d=document.createElement('div'); d.className='scard'+(s.id===playingId?' playing':''); d.dataset.id=s.id;
    var tags=(s.tags||[]).slice(0,3).map(function(t){return '<span class="ttag">'+esc(t)+'</span>';}).join('');
    d.innerHTML=
      '<button class="play" aria-label="Play">'+(s.id===playingId?icon('pause'):icon('play'))+'</button>'+
      '<div class="sinfo"><div class="stitle">'+esc(s.title)+'</div>'+
      '<div class="ssub"><span class="dur">'+s.durationSec+'s</span>'+tags+
      (s.author?'<span>· '+esc(s.author)+'</span>':'')+
      '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></div>'+
      '<div class="prog"><i></i></div></div>'+
      '<button class="fav'+(FAV.has(s.id)?' on':'')+'" title="Αγαπημένο">'+(FAV.has(s.id)?icon('heart'):icon('heartOff'))+'</button>'+
      '<button class="dl" title="Κατέβασε">'+icon('download')+'</button>';
    d.querySelector('.play').onclick=function(){ toggle(s); };
    d.querySelector('.dl').onclick=function(e){ e.stopPropagation(); dl(s); };
    d.querySelector('.fav').onclick=function(e){ e.stopPropagation(); toggleFav(s, d); };
    return d;
  }

  /* ---------- playback (single instance) ---------- */
  function toggle(s){
    if(playingId===s.id){ audio.pause(); return; }
    playingId=s.id; audio.src=s.url; audio.play().catch(function(){});
    syncCards();
    showNP(s);
  }
  function syncCards(){
    document.querySelectorAll('.scard').forEach(function(c){
      var on=c.dataset.id===playingId;
      c.classList.toggle('playing',on);
      c.querySelector('.play').innerHTML=on?icon('pause'):icon('play');
      if(!on){ var bar=c.querySelector('.prog i'); if(bar) bar.style.width='0%'; }
    });
  }
  audio.addEventListener('timeupdate',function(){
    if(!audio.duration) return;
    var pct=(audio.currentTime/audio.duration*100).toFixed(1)+'%';
    var c=document.querySelector('.scard.playing .prog i'); if(c) c.style.width=pct;
  });
  audio.addEventListener('ended',function(){ playingId=null; syncCards(); hideNP(); });
  audio.addEventListener('pause',function(){ setIcon(document.getElementById('npPlay'),'play'); });
  audio.addEventListener('play',function(){ setIcon(document.getElementById('npPlay'),'pause'); });

  /* now playing bar */
  function showNP(s){
    document.getElementById('npTitle').textContent=s.title;
    document.getElementById('npSub').textContent=s.durationSec+'s · '+(s.license||'')+(s.author?' · '+s.author:'');
    document.getElementById('npbar').classList.add('show');
  }
  function hideNP(){ document.getElementById('npbar').classList.remove('show'); }
  document.getElementById('npPlay').onclick=function(){ if(audio.paused) audio.play(); else audio.pause(); };
  document.getElementById('npClose').onclick=function(){ audio.pause(); playingId=null; syncCards(); hideNP(); };

  var isAndroid=/android/i.test(navigator.userAgent);
  var toastT;
  function toast(msg,ms){
    var t=document.getElementById('toast'); t.innerHTML=msg; t.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('show'); }, ms||3500);
  }
  function dl(s){
    var a=document.createElement('a'); a.href=s.url; a.download=(s.title||'ringtone').replace(/[^\w\-]+/g,'_')+'.mp3';
    a.target='_blank'; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove();
    if(isAndroid) toast(icon('download')+' Κατέβηκε. Άνοιξε το αρχείο → <b>'+icon('dots')+'</b> → <b>Use as ringtone</b><br>(ή βάλ\' το στον φάκελο <b>Ringtones</b>)', 5000);
    else toast(icon('download')+' Κατέβηκε ο ήχος.');
  }

  function toggleFav(s, cardEl){
    if(FAV.has(s.id)) FAV.delete(s.id); else FAV.add(s.id);
    saveFav();
    // update the fav tab counter
    var favTab=document.querySelectorAll('.tab')[3];
    if(favTab) favTab.innerHTML=LABELS.fav+' <small>('+FAV.size+')</small>';
    if(state.cat==='fav'){ render(); return; }          // viewing favorites → drop removed one
    var btn=cardEl.querySelector('.fav');
    var on=FAV.has(s.id); btn.classList.toggle('on',on); btn.innerHTML=on?icon('heart'):icon('heartOff');
  }

  /* ---------- controls ---------- */
  document.querySelectorAll('[data-dur]').forEach(function(ch){
    ch.onclick=function(){ document.querySelectorAll('[data-dur]').forEach(function(x){x.classList.remove('on');});
      ch.classList.add('on'); state.dur=parseInt(ch.dataset.dur,10); render(); };
  });
  document.getElementById('sort').onchange=function(e){ state.sort=e.target.value; render(); };
  var st;
  document.getElementById('search').oninput=function(e){ clearTimeout(st); var v=e.target.value;
    st=setTimeout(function(){ state.q=v.trim(); render(); },180); };

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* static icons in the chrome */
(function(){ var d=document.getElementById('drop'); if(d) d.innerHTML=icon('music')+' '+d.innerHTML; })();
setIcon(document.getElementById('npPlay'),'play');
setIcon(document.getElementById('npClose'),'x');
setIcon(document.getElementById('openAI'),'sparkle');
setIcon(document.getElementById('openOwn'),'plus');
setIcon(document.getElementById('preview'),'play');
setIcon(document.getElementById('download'),'download');
setIcon(document.getElementById('aiGen'),'sparkle');
setIcon(document.getElementById('aiDl'),'download');
setIcon(document.getElementById('aiClose'),'x');
setIcon(document.getElementById('aiOut') && document.getElementById('aiOut').querySelector('button.mbtn-dl'),'download');

/* ================= MAKE YOUR OWN (trim local file -> WAV) ================= */
  var ac, decoded=null;
  var modal=document.getElementById('ownModal');
  document.getElementById('openOwn').onclick=function(){ modal.classList.add('show'); };
  document.getElementById('closeOwn').onclick=closeOwn;
  function closeOwn(){ modal.classList.remove('show'); if(previewSrc){try{previewSrc.stop();}catch(e){}} }
  modal.addEventListener('click',function(e){ if(e.target===modal) closeOwn(); });

  var drop=document.getElementById('drop'), fileInput=document.getElementById('file');
  drop.onclick=function(){ fileInput.click(); };
  drop.ondragover=function(e){ e.preventDefault(); drop.style.borderColor='var(--primary)'; };
  drop.ondragleave=function(){ drop.style.borderColor=''; };
  drop.ondrop=function(e){ e.preventDefault(); drop.style.borderColor=''; if(e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); };
  fileInput.onchange=function(e){ if(e.target.files[0]) loadFile(e.target.files[0]); };

  function loadFile(file){
    document.getElementById('fname').innerHTML=icon('clock')+' '+file.name;
    document.getElementById('trim').classList.add('show');
    var reader=new FileReader();
    reader.onload=function(ev){
      ac=ac||new (window.AudioContext||window.webkitAudioContext)();
      ac.decodeAudioData(ev.target.result.slice(0)).then(function(buf){
        decoded=buf;
        document.getElementById('fname').innerHTML=icon('check')+' '+file.name+' · '+buf.duration.toFixed(1)+'s';
        var startEl=document.getElementById('start');
        startEl.max=Math.max(0,buf.duration-1).toFixed(1);
        startEl.value=0;
        drawWave(buf); updateSel();
      }).catch(function(){ document.getElementById('fname').textContent=icon('alert')+' Δεν διαβάστηκε το αρχείο (δοκίμασε mp3/wav).'; });
    };
    reader.readAsArrayBuffer(file);
  }

  function drawWave(buf){
    var cv=document.getElementById('wave'); var c=cv.getContext('2d');
    var w=cv.width=cv.offsetWidth*2, h=cv.height=128;
    c.clearRect(0,0,w,h); c.fillStyle='#3a3a5e';
    var data=buf.getChannelData(0), step=Math.floor(data.length/w)||1;
    for(var x=0;x<w;x++){ var min=1,max=-1;
      for(var i=0;i<step;i++){ var v=data[x*step+i]||0; if(v<min)min=v; if(v>max)max=v; }
      c.fillRect(x,(1+min)*h/2,1,Math.max(1,(max-min)*h/2));
    }
  }

  var startR=document.getElementById('start'), lenR=document.getElementById('len');
  startR.oninput=updateSel; lenR.oninput=updateSel;
  function updateSel(){
    if(!decoded) return;
    var start=parseFloat(startR.value), len=Math.min(parseFloat(lenR.value), decoded.duration-start);
    if(len<0)len=0;
    document.getElementById('startLbl').textContent=start.toFixed(1)+'s';
    document.getElementById('lenLbl').textContent=Math.round(len)+'s';
    var sel=document.getElementById('sel');
    sel.style.left=(start/decoded.duration*100)+'%';
    sel.style.width=(len/decoded.duration*100)+'%';
  }

  var previewSrc=null;
  document.getElementById('preview').onclick=function(){
    if(!decoded) return;
    if(previewSrc){try{previewSrc.stop();}catch(e){}}
    var start=parseFloat(startR.value), len=Math.min(parseFloat(lenR.value), decoded.duration-start);
    previewSrc=ac.createBufferSource(); previewSrc.buffer=decoded; previewSrc.connect(ac.destination);
    previewSrc.start(0,start,len);
  };

  document.getElementById('download').onclick=function(){
    if(!decoded) return;
    var start=parseFloat(startR.value), len=Math.min(parseFloat(lenR.value), decoded.duration-start);
    var blob=sliceToWav(decoded,start,len);
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='my_ringtone_'+Math.round(len)+'s.wav'; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1000);
  };

  // slice AudioBuffer [start,start+len] -> 16-bit PCM WAV Blob
  function sliceToWav(buf,start,len){
    var sr=buf.sampleRate, ch=Math.min(buf.numberOfChannels,2);
    var s0=Math.floor(start*sr), s1=Math.min(buf.length, Math.floor((start+len)*sr));
    var frames=Math.max(0,s1-s0);
    var chans=[]; for(var c=0;c<ch;c++) chans.push(buf.getChannelData(c).subarray(s0,s1));
    var bytes=44+frames*ch*2, ab=new ArrayBuffer(bytes), dv=new DataView(ab), o=0;
    function str(s){ for(var i=0;i<s.length;i++) dv.setUint8(o++,s.charCodeAt(i)); }
    function u32(v){ dv.setUint32(o,v,true); o+=4; } function u16(v){ dv.setUint16(o,v,true); o+=2; }
    str('RIFF'); u32(36+frames*ch*2); str('WAVE'); str('fmt '); u32(16); u16(1); u16(ch);
    u32(sr); u32(sr*ch*2); u16(ch*2); u16(16); str('data'); u32(frames*ch*2);
    for(var f=0;f<frames;f++) for(var k=0;k<ch;k++){
      var v=Math.max(-1,Math.min(1,chans[k][f])); dv.setInt16(o,v<0?v*0x8000:v*0x7fff,true); o+=2;
    }
    return new Blob([ab],{type:'audio/wav'});
  }
})();


/* ================= next module ================= */


/* PWA: service worker + install prompt (works only over https/localhost, not file://) */
(function(){
  if('serviceWorker' in navigator && location.protocol!=='file:'){
    window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }
  var deferred=null, btn=document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault(); deferred=e; if(btn) btn.style.display='inline-block';
  });
  if(btn) btn.onclick=function(){
    if(!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(function(){ deferred=null; btn.style.display='none'; });
  };
  window.addEventListener('appinstalled',function(){ if(btn) btn.style.display='none'; });
})();


/* ================= next module ================= */


/* AI sound generator — ElevenLabs sound-generation, bring-your-own-key (CORS allowed) */
(function(){
  var modal=document.getElementById('aiModal');
  var keyEl=document.getElementById('aiKey'), promptEl=document.getElementById('aiPrompt');
  var durEl=document.getElementById('aiDur'), durLbl=document.getElementById('aiDurLbl');
  var statusEl=document.getElementById('aiStatus'), out=document.getElementById('aiOut');
  var audio=document.getElementById('aiAudio'), dlBtn=document.getElementById('aiDl'), genBtn=document.getElementById('aiGen');
  var lastUrl=null;

  try{ var k=localStorage.getItem('rv_eleven_key'); if(k) keyEl.value=k; }catch(e){}
  durEl.oninput=function(){ durLbl.textContent=durEl.value+'s'; };

  document.getElementById('openAI').onclick=function(){ modal.classList.add('show'); };
  document.getElementById('aiClose').onclick=close;
  modal.addEventListener('click',function(e){ if(e.target===modal) close(); });
  function close(){ modal.classList.remove('show'); audio.pause(); }
  function st(m,e){ statusEl.textContent=m; statusEl.className='ai-status'+(e?' err':''); }

  genBtn.onclick=function(){
    var key=keyEl.value.trim(), prompt=promptEl.value.trim();
    if(!key){ st('Βάλε ElevenLabs API key.',true); return; }
    if(!prompt){ st('Γράψε περιγραφή ήχου.',true); return; }
    try{ localStorage.setItem('rv_eleven_key',key); }catch(e){}
    genBtn.disabled=true; out.classList.remove('show'); st(icon('clock')+' Δημιουργία... (~10-20s)');
    fetch('https://api.elevenlabs.io/v1/sound-generation',{
      method:'POST',
      headers:{ 'xi-api-key':key, 'Content-Type':'application/json' },
      body:JSON.stringify({ text:prompt, duration_seconds:parseFloat(durEl.value), prompt_influence:0.4 })
    }).then(function(res){
      if(!res.ok) return res.text().then(function(t){
        var msg=t; try{ msg=JSON.parse(t).detail.message||t; }catch(e){}
        throw new Error('('+res.status+') '+String(msg).slice(0,160));
      });
      return res.blob();
    }).then(function(blob){
      if(lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl=URL.createObjectURL(blob);
      audio.src=lastUrl; out.classList.add('show'); st(icon('check')+' Έτοιμο!'); genBtn.disabled=false;
      audio.play().catch(function(){});
    }).catch(function(err){
      genBtn.disabled=false;
      st(icon('alert')+' '+err.message,true);
    });
  };
  dlBtn.onclick=function(){
    if(!lastUrl) return;
    var a=document.createElement('a'); a.href=lastUrl;
    a.download='rv_original_'+Date.now()+'.mp3'; document.body.appendChild(a); a.click(); a.remove();
  };
})();
