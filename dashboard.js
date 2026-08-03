var _chart=null,_narOrig="";
var CO=["#00e5ff","#00ff88","#ff6b35","#ffd166","#a29bfe","#fd79a8","#55efc4"];

function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function fmtD(v){return String(v||"").replace("T"," ")}
function exL(b,l){if(!b)return"";var m=b.match(new RegExp(l+":\\s*(.+?)(?:\\n|$)","i"));return m?m[1].trim():""}
function pD(p){return p.photoDesc||p.description||exL(p.body,"Description")||"Photo report"}
function pW(p){return p.photoWhere||exL(p.body,"Where")||p.post||""}
function pY(p){return p.photoWhy||exL(p.body,"Why/Purpose")||exL(p.body,"Why")||""}
function pC(p){return p.captureTime||exL(p.body,"Captured")||p.time||""}

function G(){
  try {
    var r=localStorage.getItem("opm_config_v2")||localStorage.getItem("tms_config");
    var c=r?JSON.parse(r):{};
    // Also check OPM global
    if(!c.sheetUrl && typeof OPM !== "undefined" && OPM.getConfig){
      var oc = OPM.getConfig();
      if(oc && oc.sheetUrl) c.sheetUrl = oc.sheetUrl;
    }
    // Accept config as long as there's a sheetUrl
    if(c&&c.sheetUrl){
      if(!c.teams||!Array.isArray(c.teams))c.teams=[];
      return c;
    }
    return null;
  }catch(e){return null}
}

function PU(){var cfg=G()||{};var t=Array.isArray(cfg.teams)?cfg.teams:[];var s=document.getElementById("unit");if(!s)return;s.innerHTML='<option value="">ALL UNITS</option>';if(t.length>0){t.forEach(function(v){var o=document.createElement("option");o.value=v.name;o.textContent=v.name;s.appendChild(o)})}}

function T(){var d=new Date().toISOString().substring(0,10);document.getElementById("from").value=d;document.getElementById("to").value=d;R()}
function W(){var n=new Date(),day=n.getDay();var m=new Date(n);m.setDate(n.getDate()-(day===0?6:day-1));var s=new Date(m);s.setDate(m.getDate()+6);document.getElementById("from").value=m.toISOString().substring(0,10);document.getElementById("to").value=s.toISOString().substring(0,10);R()}

async function Q(){var url=OPM.SHEET_URL();if(!url){try{var r=localStorage.getItem("opm_config_v2")||localStorage.getItem("tms_config");var c=r?JSON.parse(r):{};url=c.sheetUrl||""}catch(e){}}if(!url)return null;var fr=document.getElementById("from").value,to=document.getElementById("to").value;try{var p=new URLSearchParams({action:"getDashboardData",t:Date.now()});if(fr)p.set("dateFrom",fr+" 00:00:00");if(to)p.set("dateTo",to+" 23:59:59");var r=await fetch(url+"?"+p,{cache:"no-store"});return await r.json()}catch(e){return null}}

async function R(){
  PU();var cfg=G();
  if(!cfg){document.getElementById("content").innerHTML='<div class="card"><div class="card-body empty">No backend configured. Open Admin page and save settings first.</div></div>';return}
  OPM.saveConfig(cfg);if(_chart){_chart.destroy();_chart=null}
  document.getElementById("content").innerHTML='<div class="card"><div class="card-body empty">Loading report...</div></div>';
  var data=await Q();
  var su=document.getElementById("unit").value||"ALL UNITS",df=document.getElementById("from").value||"beginning",dt=document.getElementById("to").value||"present";
  var c2=OPM.getConfig();
  document.getElementById("cover-title").textContent=(c2.eventName||"TERMINAL OPERATIONS AND MANAGEMENT REPORT");
  document.getElementById("cover-sub").textContent=(c2.location||"BROOKE'S POINT GRAND TERMINAL");
  if(!data||!data.summary||(data.summary.totalMessages===0&&data.summary.totalPersonnel===0)){
    document.getElementById("content").innerHTML='<div class="card"><div class="card-body empty">No data for '+esc(su)+' from '+esc(df)+' to '+esc(dt)+'<br><br><button class="btn btn-sm" onclick="T()">TODAY</button> <button class="btn btn-sm" onclick="R()">ALL TIME</button></div></div>';return
  }
  B(data,su,df,dt)
}

function B(data,su,df,dt){
  var s=data.summary,ud=Array.isArray(data.unitData)?data.unitData:[],photos=data.photos||[],all=data.allMessages||[],pt=data.personnelByTeam||{};
  if(su!=="ALL UNITS"){
    ud=ud.filter(function(u){return u.team&&u.team.toUpperCase()===su.toUpperCase()});
    photos=photos.filter(function(p){return p.team&&p.team.toUpperCase()===su.toUpperCase()});
    all=all.filter(function(m){return m.team&&m.team.toUpperCase()===su.toUpperCase()});
    var fp={};if(pt[su])fp[su]=pt[su];pt=fp
  }
  var tm=ud.reduce(function(a,u){return a+(u.messages||0)},0),tt=ud.reduce(function(a,u){return a+(u.tasks||0)},0),ti=ud.reduce(function(a,u){return a+(u.incidents||0)},0),tp=ud.reduce(function(a,u){return a+(u.photos||0)},0);
  var un=ud.map(function(u){return u.team}),ut=ud.map(function(u){return u.tasks||0}),up=ud.map(function(u){return u.photos||0});
  var pers=(su!=="ALL UNITS"?(pt[su]||0):s.totalPersonnel),actv=(su!=="ALL UNITS"?(pt[su]||0):s.onlineNow);
  var h="";
  h+=C("EXECUTIVE SUMMARY","",S(tm,tt,tp,ti,pers,actv));
  if(un.length>0){h+=C("UNIT PERFORMANCE","PERIOD: "+esc(df)+" "+esc(dt),UT(ud,un))}
  if(photos.length>0){h+=PG(photos,un)}
  var insp=all.filter(function(m){return m.type==="inspection"});
  if(insp.length>0){h+=IR(insp,df)}
  var nar="PERIOD: "+df+" to "+dt+" | UNIT: "+su+"\n\nDuring this period, "+tm+" communications were recorded. "+tt+" tasks accomplished, "+tp+" photo reports submitted, and "+ti+" incidents logged.\n\n";if(photos.length>0){nar+="FIELD PHOTO SUMMARY:\n";var pu={};photos.forEach(function(p){var u=p.team||"UNASSIGNED";if(!pu[u])pu[u]=[];pu[u].push(p)});Object.keys(pu).sort().forEach(function(u){nar+=u+": "+pu[u].length+" photo(s)\n";pu[u].forEach(function(p){nar+="  - "+pD(p)+(pW(p)?" at "+pW(p):"")+" ("+p.sender+")\n"})});nar+="\n"}nar+="Generated by OPM on "+OPM.formatDateTime()+".";
  h+=C("NARRATIVE","EDITABLE",'<textarea class="narrative-box" id="nar-text">'+esc(nar)+'</textarea><div class="flex gap-sm" style="margin-top:10px"><button class="btn btn-success btn-sm" onclick="SN()">SAVE</button><button class="btn btn-sm" onclick="RN()">RESET</button><span id="nar-ok" style="display:none;font-family:var(--font-mono);font-size:10px;color:var(--success)">SAVED</span></div>');
  if(all.length>0){h+=CL(all)}
  document.getElementById("content").innerHTML=h;
  var nt=document.getElementById("nar-text");if(nt){_narOrig=nt.value;var key="nar_"+su.replace(/[^a-z0-9]/gi,"_")+"_"+(df||"any")+"_"+(dt||"any");var c3=OPM.getConfig();if(c3&&c3[key])nt.value=c3[key]}
}

function C(hdr,sub,body){return'<div class="card"><div class="card-hdr">'+hdr+" "+sub+'</div><div class="card-body">'+body+'</div></div>'}
function S(m,tt,tp,ti,p,a){return'<div class="stats"><div><div class="n">'+m+'</div><div class="l">Messages</div></div><div><div class="n" style="color:var(--success)">'+tt+'</div><div class="l">Tasks</div></div><div><div class="n">'+tp+'</div><div class="l">Photos</div></div><div><div class="n" style="color:var(--warning)">'+ti+'</div><div class="l">Incidents</div></div><div><div class="n">'+p+'</div><div class="l">Personnel</div></div><div><div class="n" style="color:var(--success)">'+a+'</div><div class="l">Online</div></div></div>'}

function UT(ud,un){var h='<table><tr><th></th><th>UNIT</th><th class="num">PHOTOS</th><th class="num">TASKS</th><th class="num">INC</th><th class="num">COMMS</th></tr>';ud.forEach(function(u,i){h+='<tr><td><span class="dot" style="background:'+CO[i%7]+'"></span></td><td><strong>'+esc(u.team)+'</strong></td><td class="num">'+(u.photos||0)+'</td><td class="num" style="color:var(--success)">'+(u.tasks||0)+'</td><td class="num" style="color:'+((u.incidents||0)>0?"var(--warning)":"var(--text-dim)")+'">'+(u.incidents||0)+'</td><td class="num">'+(u.messages||0)+'</td></tr>'});h+='</table><div style="margin-top:14px;height:200px"><canvas id="chart"></canvas></div>';return h}

function PG(photos,un){var h='<div class="card"><div class="card-hdr">PHOTO REPORTS ('+photos.length+')</div><div class="card-body"><div class="photo-grid">';photos.slice(0,60).forEach(function(p,i){var m=(p.url||"").match(/[?&]id=([a-zA-Z0-9_-]+)/),e=m?"https://lh3.googleusercontent.com/d/"+m[1]:p.url,uc=CO[un.indexOf(p.team)%7]||"var(--accent)",desc=pD(p),where=pW(p),why=pY(p),cap=pC(p);h+='<div class="photo-card"><div class="photo-side" onclick="window.open(\''+esc(p.url)+'\')"><img src="'+esc(e)+'" loading="lazy"><span class="pb" style="background:'+uc+'">'+esc(p.team||"")+'</span><span class="pn">#'+(i+1)+'</span></div><div class="info-side"><div class="fn">'+esc(desc)+'</div><div class="fr">';if(where)h+='<span class="fk">Location</span><span class="fv">'+esc(where)+'</span>';if(cap)h+='<span class="fk">Captured</span><span class="fv">'+esc(fmtD(cap))+'</span>';h+='<span class="fk">Unit</span><span class="fv" style="color:'+uc+';font-weight:600">'+esc(p.team||"")+'</span><span class="fk">By</span><span class="fv">'+esc(p.sender||"")+'</span></div>';if(why)h+='<div class="fp">"'+esc(why)+'"</div>';h+='</div></div>'});if(photos.length>60)h+='<div style="text-align:center;padding:14px;color:var(--text-dim);font-family:var(--font-mono);font-size:10px">Showing 60 of '+photos.length+' photo reports</div>';h+='</div></div></div>';return h}

// -- INSPECTION REPORTS (simplified, no Chart dependency in rendering) --
function IR(insp,df){
  var uiM={},CK="\u2713";
  insp.forEach(function(ins){
    var team=ins.team||"UNASSIGNED";if(!uiM[team])uiM[team]={inspector:ins.sender||"",time:ins.time||"",sections:{},remarks:[]};
    var pm={};
    try{var pd=JSON.parse(ins.photo||"[]");if(Array.isArray(pd))pd.forEach(function(p){pm[p.label]=(p.urls||[]).map(function(u){var m2=(u||"").match(/[?&]id=([a-zA-Z0-9_-]+)/);return{embed:m2?"https://lh3.googleusercontent.com/d/"+m2[1]:u,raw:u}})})}catch(e){}
    var ls=(ins.body||"").split("\n");
    ls.forEach(function(l){
      if(l.indexOf(CK+" ")!==-1){var cl=l.replace(CK+" ","").trim(),lb=cl.replace(/ \(.*\)$/,""),se="";var m3=cl.match(/\((.+)\)$/);if(m3)se=m3[1];if(!se)se="General";if(!uiM[team].sections[se])uiM[team].sections[se]=[];uiM[team].sections[se].push({label:lb,photos:pm[lb]||[]})}
      if(l.indexOf("Remarks: ")!==-1)uiM[team].remarks.push(l.substring(9).trim())
    })
  });

  var un2=Object.keys(uiM).sort();
  var hasAdmin=!!uiM["ADMINISTRATIVE UNIT"];

  var h='<div class="card"><div class="card-hdr">DAILY INSPECTION REPORT'+(un2.length>1?"S":"")+' ('+insp.length+' Inspector'+(insp.length>1?"s":"")+')</div><div class="card-body">';

  // Render per-unit inspection cards
  un2.forEach(function(u){
    var ui=uiM[u],sk=Object.keys(ui.sections).sort(),tui=0;sk.forEach(function(k){tui+=ui.sections[k].length});var uColor=CO[un2.indexOf(u)%7];
    h+='<div class="inspect-block" style="border-color:'+uColor+'"><div class="inspect-hdr"><div><span style="font-size:15px;font-weight:700;color:#fff">'+esc(u)+'</span><span style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-left:10px">Inspected by: '+esc(ui.inspector)+'</span></div><span style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">'+esc((ui.time||"").substring(0,19))+'</span></div><div class="inspect-body">';
    sk.forEach(function(sec){h+='<div class="inspect-sec"><div class="inspect-sec-title">'+esc(sec)+'</div>';ui.sections[sec].forEach(function(item){h+='<div class="inspect-item"><span><span style="color:var(--success);font-weight:700">'+CK+'</span> '+esc(item.label)+'</span>';if(item.photos.length>0){h+='<div class="inspect-photos">';item.photos.forEach(function(ph){h+='<img src="'+esc(ph.embed)+'" onclick="window.open(\''+esc(ph.raw)+'\')" loading="lazy">'});h+='</div>'}h+='</div>'});h+='</div>'});
    if(ui.remarks.length>0){h+='<div class="inspect-remarks"><div>REMARKS</div>';ui.remarks.forEach(function(r){h+='<div style="font-size:12px;color:var(--text-secondary);font-style:italic">'+esc(r)+'</div>'});h+='</div>'}
    h+='<div style="margin-top:10px;font-size:12px;color:var(--text-dim)">'+esc(u)+' conducted inspection of '+tui+' items across '+sk.length+' categor'+(sk.length>1?"ies":"y")+'. All items satisfactory.'+(ui.remarks.length>0?" "+ui.remarks.length+" observation(s) noted.":"")+'</div></div></div>'
  });

  // Consolidated summary at the bottom
  var gT=0,tR=0,aC=[];un2.forEach(function(u){var ui2=uiM[u];Object.keys(ui2.sections).forEach(function(k){gT+=ui2.sections[k].length;if(aC.indexOf(k)<0)aC.push(k)});tR+=ui2.remarks.length});
  h+='<div style="margin-top:14px;padding:16px 18px;background:var(--accent-dim);border-radius:6px;border:1px solid var(--border-color)"><h3>CONSOLIDATED INSPECTION FINDINGS</h3><p>On '+(df||"this date")+', <strong>'+insp.length+' inspection'+(insp.length>1?"s":"")+'</strong> '+(insp.length>1?"were":"was")+' conducted across '+un2.length+' unit(s): '+un2.map(function(u){return uiM[u].inspector+" ("+u+")"}).join(", ")+'. Collectively <strong>'+gT+' checklist items</strong> inspected across '+aC.length+' categories. ';
  if(tR>0)h+='<strong>'+tR+' observation(s)</strong> were recorded. ';
  h+='No critical deficiencies identified. All units compliant with terminal policies and standards.</p></div>';

  h+='</div></div>';
  return h
}

function CL(all){var h='<div class="card"><div class="card-hdr">COMMUNICATIONS LOG ('+all.length+')</div><div class="card-body"><div class="msg-log">';all.slice().reverse().slice(0,80).forEach(function(m){h+='<div class="mr"><span class="mt">'+esc((m.time||"").substring(0,19))+'</span><span class="ms">'+esc(m.sender||"")+(m.team?" ["+esc(m.team)+"]":"")+'</span><span class="mb">'+esc((m.body||"").substring(0,130))+(m.photo?" [photo]":"")+'</span></div>'});h+='</div></div></div>';return h}

function SN(){var nt=document.getElementById("nar-text");if(!nt)return;var su2=document.getElementById("unit").value||"ALL UNITS",df2=document.getElementById("from").value||"any",dt2=document.getElementById("to").value||"any";var c4=OPM.getConfig();if(!c4)c4={};c4["nar_"+su2.replace(/[^a-z0-9]/gi,"_")+"_"+df2+"_"+dt2]=nt.value.trim();OPM.saveConfig(c4);var ok=document.getElementById("nar-ok");if(ok){ok.style.display="inline";setTimeout(function(){ok.style.display="none"},2000)}}
function RN(){if(_narOrig)document.getElementById("nar-text").value=_narOrig}

document.addEventListener("DOMContentLoaded",function(){PU();var cfg=G();if(!cfg||!cfg.sheetUrl){document.getElementById("content").innerHTML='<div class="card"><div class="card-body empty">No backend configured. Open <a href="admin.html" style="color:var(--accent)">Admin page</a> and save settings first.<br><br><small>If settings are already saved, try clicking REFRESH.</small></div></div>';return}setTimeout(function(){T()},300)});
