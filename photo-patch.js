// OPM Photo Report Flow — intercepts photo flow to show description form
(function(){
  'use strict';
  
  var pfData = null;

  function init(){
    if(!document.getElementById('photo-source-sheet')){
      setTimeout(init, 300); return;
    }

    // Create description form modal
    var modal = document.createElement('div');
    modal.id = 'pf-report-form';
    modal.className = 'inspect-modal';
    modal.style.display = 'none';
    modal.onclick = function(e){ if(e.target===modal) pfClose(); };
    modal.innerHTML =
      '<div class="inspect-card" style="max-height:94vh;">'+
      '<div class="inspect-hdr"><span>DESCRIBE PHOTO REPORT</span><span style="cursor:pointer;color:var(--text-dim);font-size:20px;" id="pf-close-x">✕</span></div>'+
      '<div class="inspect-body">'+
      '<img id="pf-preview-img" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color);" alt="">'+
      '<div class="field-group"><label class="field-label">Description / Accomplishment *</label><textarea class="inspect-textarea" id="pf-desc" placeholder="What task or accomplishment does this photo show?" style="min-height:72px;"></textarea></div>'+
      '<div class="field-group"><label class="field-label">Time Captured</label><input class="input" type="datetime-local" id="pf-time" style="font-size:var(--font-sm);color:var(--text-primary);"></div>'+
      '<div class="field-group"><label class="field-label">Where / Location</label><input class="input" type="text" id="pf-where" placeholder="Where was this photo taken?"></div>'+
      '<div class="field-group"><label class="field-label">Purpose</label>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">'+
      '<label style="display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text-secondary);cursor:pointer;"><input type="radio" name="pf-purpose" value="Reporting" checked> Reporting</label>'+
      '<label style="display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text-secondary);cursor:pointer;"><input type="radio" name="pf-purpose" value="Recording"> Recording</label>'+
      '<label style="display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text-secondary);cursor:pointer;"><input type="radio" name="pf-purpose" value="Inspection"> Inspection</label>'+
      '</div><input class="input" type="text" id="pf-notes" placeholder="Additional notes (optional)..." style="margin-top:6px;font-size:var(--font-sm);color:var(--text-primary);">'+
      '</div>'+
      '<div style="display:flex;gap:8px;">'+
      '<button class="btn btn-primary flex-1" id="pf-send-btn">SEND REPORT</button>'+
      '<button class="btn btn-sm" id="pf-cancel-btn">CANCEL</button>'+
      '</div></div></div>';
    document.body.appendChild(modal);
    document.getElementById('pf-close-x').onclick = pfClose;
    document.getElementById('pf-cancel-btn').onclick = pfClose;
    document.getElementById('pf-send-btn').onclick = pfSend;

    // Intercept source sheet buttons
    var src = document.getElementById('photo-source-sheet');
    if(!src) return;
    var cam = src.querySelector('.btn-primary');
    var gal = src.querySelector('.btn-success');
    if(cam) cam.onclick = function(){ src.style.display='none'; pfOpen('camera'); };
    if(gal) gal.onclick = function(){ src.style.display='none'; pfOpen('gallery'); };
    console.log('[PhotoFlow] Patched');
  }

  function pfOpen(mode){
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    if(mode==='camera') inp.capture = 'environment';
    inp.onchange = function(e){
      var f = e.target.files[0];
      if(f) pfFileSelected(f);
      e.target.remove();
    };
    inp.click();
  }

  function pfFileSelected(file){
    var reader = new FileReader();
    reader.onload = function(ev){
      var img = new Image();
      img.onload = function(){
        var c = document.createElement('canvas'), M = 800, s = Math.min(M/img.width,M/img.height,1);
        c.width = img.width*s; c.height = img.height*s;
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        pfData = c.toDataURL('image/jpeg',0.65);
        document.getElementById('pf-preview-img').src = pfData;
        document.getElementById('pf-time').value = pfNow(new Date(file.lastModified||Date.now()));
        document.getElementById('pf-where').value = (window.me||{}).post||'';
        document.getElementById('pf-desc').value = '';
        document.getElementById('pf-notes').value = '';
        var r = document.querySelector('input[name="pf-purpose"][value="Reporting"]');
        if(r) r.checked = true;
        document.getElementById('pf-report-form').style.display = 'flex';
        document.getElementById('pf-send-btn').textContent = 'SEND REPORT';
        document.getElementById('pf-send-btn').disabled = false;
        document.getElementById('pf-desc').focus();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function pfNow(d){
    var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
  }

  function pfClose(){
    document.getElementById('pf-report-form').style.display = 'none';
    pfData = null;
  }

  async function pfSend(){
    if(!pfData){ OPM.toast('No photo','warning'); return }
    var m = window.me; if(!m){ OPM.toast('Not logged in','warning'); return }
    var desc = document.getElementById('pf-desc').value.trim();
    if(!desc){ OPM.toast('Describe this photo','warning'); document.getElementById('pf-desc').focus(); return }
    var cap = document.getElementById('pf-time').value;
    var where = document.getElementById('pf-where').value.trim();
    var purp = document.querySelector('input[name="pf-purpose"]:checked');
    var pv = purp ? purp.value : 'Reporting';
    var notes = document.getElementById('pf-notes').value.trim();
    var why = pv + (notes ? ': '+notes : '');

    var btn = document.getElementById('pf-send-btn');
    btn.textContent = 'SENDING...'; btn.disabled = true;

    var body = 'Description: '+desc+'\n';
    if(cap) body += 'Captured: '+cap+'\n';
    if(where) body += 'Where: '+where+'\n';
    if(why) body += 'Why/Purpose: '+why+'\n';
    var cl = window.curLat||'', cg = window.curLng||'';
    if(cl&&cg) body += 'GPS: '+Number(cl).toFixed(6)+', '+Number(cg).toFixed(6)+'\n';

    try {
      var url = OPM.SHEET_URL();
      var ur = await fetch(url, { method:'POST', body:JSON.stringify({ action:'uploadPhoto', sender:m.name, photoData:pfData }) });
      var ud = await ur.json();
      if(ud.status==='error'){ OPM.toast('Upload failed','error'); pfClose(); return }
      if(!ud.photoUrl){ OPM.toast('No URL','warning'); pfClose(); return }
      await fetch(url, { method:'POST', body:JSON.stringify({
        action:'sendMessage', sender:m.name, team:m.team, post:m.post, body:body, type:'photo',
        photoUrl:ud.photoUrl, photoLat:cl, photoLng:cg,
        photoDesc:desc, captureTime:cap, photoWhere:where, photoWhy:why, target:'ALL'
      })});
      pfClose();
      if(typeof fetchMsgs === 'function') fetchMsgs();
      OPM.toast('Photo sent','success');
    } catch(err){ OPM.toast('Upload failed','error'); pfClose(); }
  }

  window.pfClose = pfClose;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
