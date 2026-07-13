// ============================================================
// OPM v2 — Operations Personnel Monitor
// Google Apps Script Backend (Complete — with Dashboard support)
//
// SETUP:
// 1. Open script.google.com → paste this entire file
// 2. Run setup() once from the editor
// 3. Deploy → New Deployment → Web App (Execute as: Me, Anyone)
// 4. Copy deployment URL → Admin page
// ============================================================

var SHEET_PERSONNEL = 'Personnel';
var SHEET_MESSAGES   = 'Messages';
var SHEET_PENDING    = 'Pending';
var SHEET_SETTINGS   = 'Settings';
var SHEET_VIDEO      = 'VideoLog';

// ═══════════════ ENTRY POINTS ═══════════════
function doGet(e)  { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    var action, data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
      action = data.action;
    } else if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      data = e.parameter;
    } else {
      return json({ error: 'No action specified' });
    }

    var result;
    switch (action) {
      case 'getSettings':        result = getSettings();          break;
      case 'saveSettings':       result = saveSettings(data);     break;
      case 'getAll':             result = getAll();               break;
      case 'checkIn':            result = checkIn(data);          break;
      case 'updateLocation':     result = updateLocation(data);   break;
      case 'markAllOffline':     result = markAllOffline();       break;
      case 'markOneOffline':     result = markOneOffline(data);   break;
      case 'getMessages':        result = getMessages();          break;
      case 'sendMessage':        result = sendMessage(data);      break;
      case 'uploadPhoto':        result = uploadPhoto(data);      break;
      case 'requestApproval':    result = requestApproval(data);  break;
      case 'getPending':         result = getPending();           break;
      case 'checkApproval':      result = checkApproval(data);    break;
      case 'approveUser':        result = approveUser(data);      break;
      case 'rejectUser':         result = rejectUser(data);       break;
      case 'clearEventData':     result = clearEventData();       break;
      case 'getEventVersion':    result = getEventVersion();      break;
      case 'logVideoCall':       result = logVideoCall(data);     break;
      case 'getDashboardData':   result = getDashboardData(data); break;
      case 'getPhotoLog':        result = getPhotoLog(data);      break;
      case 'saveReportNotes':    result = saveReportNotes(data);  break;
      case 'getReportNotes':     result = getReportNotes(data);   break;
      default:                   result = { error: 'Unknown action: ' + action };
    }
    return json(result);
  } catch (err) {
    return json({ error: err.message || 'Server error' });
  }
}

// ═══════════════ HELPERS ═══════════════
function ensureSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) sheet.appendRow(headers);
  }
  return sheet;
}

function getAllRows(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function getRowByColumn(sheet, colIndex, value) {
  if (!sheet) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var col = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim().toUpperCase() === String(value).trim().toUpperCase()) return i + 2;
  }
  return -1;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function now()  { return Utilities.formatDate(new Date(), 'Asia/Manila', 'HH:mm:ss'); }
function nowFull() { return Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss'); }

// ═══════════════ SETTINGS ═══════════════
function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  var settings = {
    eventName:'',eventDate:'',commander:'PAGONG',unit:'',location:'',
    lat:'8.7891',lng:'117.8370',locInterval:'60',teams:[],
    adminPass:'PAGONG-ADMIN',commanderPw:'PAGONG'
  };
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && settings.hasOwnProperty(data[i][0])) settings[data[i][0]] = data[i][1];
    }
  }
  if (typeof settings.teams === 'string') {
    try { settings.teams = JSON.parse(settings.teams); } catch(e) { settings.teams = []; }
  }
  if (!Array.isArray(settings.teams) || settings.teams.length === 0) {
    settings.teams = [
      {name:'ADMINISTRATIVE UNIT',code:'ADMIN26',color:'#00e5ff'},
      {name:'OPERATIONS UNIT',code:'OPS26',color:'#00ff88'},
      {name:'UTILITY UNIT',code:'UTIL26',color:'#ff6b35'},
      {name:'SAFETY & SECURITY',code:'SEC26',color:'#ffd166'},
      {name:'TASK FORCE',code:'TF26',color:'#a29bfe'}
    ];
  }
  return {settings:settings};
}

function saveSettings(data) {
  var sheet = ensureSheet(SHEET_SETTINGS);
  var teams = data.teams;
  if (typeof teams !== 'string') teams = JSON.stringify(teams);
  sheet.clear();
  sheet.appendRow(['Key','Value']);
  [
    ['eventName',data.eventName||''],['eventDate',data.eventDate||''],['commander',data.commander||'PAGONG'],
    ['unit',data.unit||''],['location',data.location||''],['lat',data.lat||'8.7891'],['lng',data.lng||'117.8370'],
    ['locInterval',data.locInterval||'60'],['teams',teams],['adminPass',data.adminPass||'PAGONG-ADMIN'],
    ['commanderPw',data.commanderPw||'PAGONG']
  ].forEach(function(r){sheet.appendRow(r);});
  return {status:'saved',settings:data};
}

// ═══════════════ PERSONNEL ═══════════════
function checkIn(data) {
  var sheet = ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  var devId = data.deviceId || data.id || '';
  var existingRow = getRowByColumn(sheet, 9, devId);
  var row = [data.deviceId||data.id||'',data.name||'',data.team||'',data.post||'',data.lat||'',data.lng||'','TRUE',now(),data.deviceId||data.id||''];
  if (existingRow > 0) { for (var c=1;c<=row.length;c++) sheet.getRange(existingRow,c).setValue(row[c-1]); }
  else { sheet.appendRow(row); }
  return {status:'ok'};
}

function updateLocation(data) {
  var sheet = ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  var devId = data.deviceId||'';
  var existingRow = getRowByColumn(sheet,9,devId);
  if (existingRow>0) {
    if (data.lat && String(data.lat)!=='' && String(data.lat)!=='0') {
      sheet.getRange(existingRow,5).setValue(data.lat||''); sheet.getRange(existingRow,6).setValue(data.lng||'');
    }
    sheet.getRange(existingRow,7).setValue('TRUE'); sheet.getRange(existingRow,8).setValue(now());
    return {status:'updated'};
  }
  sheet.appendRow([devId,data.name||'Unknown','','',data.lat||'',data.lng||'','TRUE',now(),devId]);
  return {status:'created'};
}

function getAll() {
  var pSheet = ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  var mSheet = ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']);
  var rawP = getAllRows(pSheet), rawM = getAllRows(mSheet);
  return {
    personnel: rawP.map(function(r){return{id:String(r[0]||''),name:String(r[1]||''),team:String(r[2]||''),post:String(r[3]||''),lat:String(r[4]||''),lng:String(r[5]||''),online:String(r[6]||'').toUpperCase()==='TRUE',lastSeen:String(r[7]||''),deviceId:String(r[8]||'')};}),
    messages: rawM.map(function(r){return{time:String(r[0]||''),sender:String(r[1]||''),team:String(r[2]||''),post:String(r[3]||''),body:String(r[4]||''),type:String(r[5]||'chat'),photoUrl:String(r[6]||''),photoLat:String(r[7]||''),photoLng:String(r[8]||''),target:String(r[9]||'ALL')};})
  };
}

function markAllOffline() {
  var sheet = ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  var lastRow = sheet.getLastRow(); if (lastRow<=1) return {status:'ok',count:0};
  for (var r=2;r<=lastRow;r++) sheet.getRange(r,7).setValue('FALSE');
  return {status:'ok',count:lastRow-1};
}

function markOneOffline(data) {
  var sheet = ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  var row = getRowByColumn(sheet,9,data.deviceId||'');
  if (row>0) sheet.getRange(row,7).setValue('FALSE');
  return {status:'ok'};
}

// ═══════════════ MESSAGES ═══════════════
function sendMessage(data) {
  var sheet = ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']);
  sheet.appendRow([nowFull(),data.sender||data.name||'',data.team||'',data.post||'',data.body||'',data.type||'chat',data.photoUrl||'',data.photoLat||'',data.photoLng||'',data.target||'ALL']);
  return {status:'sent'};
}

function getMessages() {
  var sheet = ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']);
  return {messages: getAllRows(sheet).map(function(r){return{time:String(r[0]||''),sender:String(r[1]||''),team:String(r[2]||''),post:String(r[3]||''),body:String(r[4]||''),type:String(r[5]||'chat'),photoUrl:String(r[6]||''),photoLat:String(r[7]||''),photoLng:String(r[8]||''),target:String(r[9]||'ALL')};})};
}

function uploadPhoto(data) {
  try {
    var folders = DriveApp.getFoldersByName('OPM_Photos');
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('OPM_Photos');
    var blob = Utilities.newBlob(Utilities.base64Decode((data.photoData||'').replace(/^data:image\/\ w+;base64,/, '')),'image/jpeg','OPM_'+new Date().getTime()+'.jpg');
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {status:'ok',photoUrl:file.getUrl(),photoId:file.getId()};
  } catch(e) { return {status:'ok',photoUrl:data.photoData||'',note:'Drive failed: '+e.message}; }
}

// ═══════════════ APPROVALS ═══════════════
function requestApproval(data) {
  var sheet = ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']);
  var devId = data.deviceId||'';
  var pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PERSONNEL);
  if (pSheet) { var pr = getRowByColumn(pSheet,9,devId); if (pr>0 && String(pSheet.getRange(pr,7).getValue()||'').toUpperCase()==='TRUE') return {status:'APPROVED',deviceId:devId}; }
  var existingRow = getRowByColumn(sheet,1,devId);
  var row = [devId,data.name||'',data.team||'',data.post||'',nowFull(),'PENDING'];
  if (existingRow>0) { for (var c=1;c<=row.length;c++) sheet.getRange(existingRow,c).setValue(row[c-1]); }
  else { sheet.appendRow(row); }
  return {status:'PENDING',deviceId:devId};
}

function getPending() {
  var sheet = ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']);
  return {pending: getAllRows(sheet).filter(function(r){return String(r[5]||'').toUpperCase()==='PENDING';}).map(function(r){return{deviceId:String(r[0]||''),name:String(r[1]||''),team:String(r[2]||''),post:String(r[3]||''),time:String(r[4]||''),status:String(r[5]||'')};})};
}

function checkApproval(data) {
  var devId = data.deviceId||'';
  var pendingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PENDING);
  if (pendingSheet) { var pr = getRowByColumn(pendingSheet,1,devId); if (pr>0){var st=String(pendingSheet.getRange(pr,6).getValue()||'').toUpperCase();if(st==='APPROVED'||st==='REJECTED')return{status:st,deviceId:devId};}}
  var pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PERSONNEL);
  if (pSheet) { var ppr = getRowByColumn(pSheet,9,devId); if (ppr>0) return {status:'APPROVED',deviceId:devId}; }
  return {status:'PENDING',deviceId:devId};
}

function approveUser(data) {
  var sheet = ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']);
  var row = getRowByColumn(sheet,1,data.deviceId||'');
  if (row>0) sheet.getRange(row,6).setValue('APPROVED');
  return {status:'approved'};
}

function rejectUser(data) {
  var sheet = ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']);
  var row = getRowByColumn(sheet,1,data.deviceId||'');
  if (row>0) sheet.getRange(row,6).setValue('REJECTED');
  return {status:'rejected'};
}

// ═══════════════ MANAGEMENT ═══════════════
function clearEventData() {
  var pSheet = ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  pSheet.clear(); pSheet.appendRow(['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  var mSheet = ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']);
  mSheet.clear(); mSheet.appendRow(['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']);
  var aSheet = ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']);
  aSheet.clear(); aSheet.appendRow(['DeviceId','Name','Team','Post','Time','Status']);
  ensureSheet(SHEET_SETTINGS).getRange('B2').setValue(nowFull());
  return {status:'cleared',version:nowFull()};
}

function getEventVersion() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  return {version: sheet ? String(sheet.getRange('B2').getValue()||'') : ''};
}

function logVideoCall(data) {
  var sheet = ensureSheet(SHEET_VIDEO,['Room','StartedBy','TimeStart','TimeEnd','Participants','Notes']);
  sheet.appendRow([data.room||'',data.startedBy||'',data.timeStart||'',data.timeEnd||'',(data.participants||[]).join(', '),data.notes||'']);
  return {status:'logged'};
}

// ═══════════════ DASHBOARD DATA ═══════════════

function getDashboardData(data) {
  var dateFrom = data.dateFrom || '';
  var dateTo   = data.dateTo   || '';

  var messages = getAllRows(ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']));
  var personnel = getAllRows(ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']));
  var pending = getAllRows(ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']));

  // Filter by date
  var filtered = messages;
  if (dateFrom) {
    filtered = filtered.filter(function(r){ var t=String(r[0]||''); return t>=dateFrom && (dateTo?t<=dateTo:true); });
  }

  // Per-unit breakdown
  var unitData = {};
  var categories = {};
  filtered.forEach(function(r){
    var team = String(r[2]||'UNASSIGNED');
    var body = String(r[4]||'').toLowerCase();
    var type = String(r[5]||'chat');
    if (!unitData[team]) unitData[team] = {team:team,messages:0,photos:0,tasks:0,incidents:0};
    unitData[team].messages++;
    if (String(r[6]||'')) unitData[team].photos++;

    var cat = catMsg(body,type);
    if (!categories[cat]) categories[cat]=0;
    categories[cat]++;

    if (isTask(body)) unitData[team].tasks++;
    if (isIncident(body)) unitData[team].incidents++;
  });

  // Daily breakdown
  var dailyActivity = {};
  filtered.forEach(function(r){
    var ds = String(r[0]||'').substring(0,10);
    if (!dailyActivity[ds]) dailyActivity[ds]={date:ds,messages:0,photos:0};
    dailyActivity[ds].messages++;
    if (String(r[6]||'')) dailyActivity[ds].photos++;
  });

  // Personnel by team
  var personnelByTeam = {};
  personnel.forEach(function(r){
    var t = String(r[2]||'UNASSIGNED');
    if (!personnelByTeam[t]) personnelByTeam[t]=0;
    personnelByTeam[t]++;
  });

  var onlineCount = personnel.filter(function(r){return String(r[6]||'').toUpperCase()==='TRUE';}).length;
  var approved = pending.filter(function(r){return String(r[5]||'').toUpperCase()==='APPROVED';}).length;
  var rejected = pending.filter(function(r){return String(r[5]||'').toUpperCase()==='REJECTED';}).length;

  // Photos
  var photos = filtered.filter(function(r){return String(r[6]||'');}).map(function(r){return{url:String(r[6]||''),sender:String(r[1]||''),team:String(r[2]||''),time:String(r[0]||''),body:String(r[4]||''),lat:String(r[7]||''),lng:String(r[8]||'')};}).reverse().slice(0,50);

  return {
    summary:{totalMessages:filtered.length,totalPhotos:photos.length,totalPersonnel:personnel.length,onlineNow:onlineCount,approvalsApproved:approved,approvalsRejected:rejected},
    unitData:Object.values(unitData),categories:categories,
    dailyActivity:Object.values(dailyActivity).sort(function(a,b){return a.date.localeCompare(b.date);}),
    personnelByTeam:personnelByTeam,photos:photos,
    allMessages:filtered.map(function(r){return{time:String(r[0]||''),sender:String(r[1]||''),team:String(r[2]||''),post:String(r[3]||''),body:String(r[4]||''),type:String(r[5]||'chat'),photo:String(r[6]||'')};})
  };
}

function getPhotoLog(data) {
  var msgs = getAllRows(ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']));
  return {photos:msgs.filter(function(r){return String(r[6]||'');}).map(function(r){return{url:String(r[6]||''),sender:String(r[1]||''),team:String(r[2]||''),time:String(r[0]||''),body:String(r[4]||''),lat:String(r[7]||''),lng:String(r[8]||'')};}).reverse()};
}

function saveReportNotes(data) {
  var sheet = ensureSheet('ReportNotes',['Date','Unit','Notes','Author']);
  sheet.appendRow([data.date||nowFull(),data.unit||'',data.notes||'',data.author||'']);
  return {status:'saved'};
}

function getReportNotes(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ReportNotes');
  if (!sheet) return {notes:[]};
  var raw = getAllRows(sheet);
  var df = data.dateFrom||'';
  return {notes:raw.filter(function(r){return df?String(r[0]||'').substring(0,10)>=df:true;}).map(function(r){return{date:String(r[0]||''),unit:String(r[1]||''),notes:String(r[2]||''),author:String(r[3]||'')};})};
}

// ═══════════════ HELPERS ═══════════════
function catMsg(body,type) {
  var b = (body||'').toLowerCase();
  if (type==='photo') return 'Photo Reports';
  if (type==='broadcast') return 'Broadcasts';
  if (type==='system') return 'System';
  if (b.includes('apprehend')||b.includes('violation')||b.includes('citation')) return 'Apprehensions';
  if (b.includes('clear')||b.includes('safe')||b.includes('secure')) return 'Status Reports';
  if (b.includes('clean')||b.includes('utility')||b.includes('sweep')) return 'Utility Tasks';
  if (b.includes('document')||b.includes('admin')||b.includes('permit')) return 'Admin Tasks';
  if (b.includes('traffic')||b.includes('vehicle')||b.includes('parking')) return 'Traffic';
  if (b.includes('incident')||b.includes('alert')||b.includes('emergency')) return 'Incidents';
  return 'General Comms';
}

function isTask(body) {
  return /(done|complete|accomplished|cleared|secured|finished|resolved|handled|processed|checked|inspected)/i.test(body||'');
}

function isIncident(body) {
  return /(apprehend|violation|incident|report|issue|alert|emergency|accident|breach|unauthorized)/i.test(body||'');
}

// ═══════════════ FIRST-RUN SETUP ═══════════════
function setup() {
  ensureSheet(SHEET_PERSONNEL,['ID','Name','Team','Post','Lat','Lng','Online','LastSeen','DeviceId']);
  ensureSheet(SHEET_MESSAGES,['Time','Sender','Team','Post','Body','Type','PhotoUrl','PhotoLat','PhotoLng','Target']);
  ensureSheet(SHEET_PENDING,['DeviceId','Name','Team','Post','Time','Status']);
  ensureSheet(SHEET_VIDEO,['Room','StartedBy','TimeStart','TimeEnd','Participants','Notes']);
  ensureSheet('ReportNotes',['Date','Unit','Notes','Author']);

  var s = ensureSheet(SHEET_SETTINGS);
  s.clear(); s.appendRow(['Key','Value']);
  [['eventName',''],['eventDate',''],['commander','PAGONG'],['unit',''],['location',''],['lat','8.7891'],['lng','117.8370'],['locInterval','60'],['teams',JSON.stringify([{name:'ADMINISTRATIVE UNIT',code:'ADMIN26',color:'#00e5ff'},{name:'OPERATIONS UNIT',code:'OPS26',color:'#00ff88'},{name:'UTILITY UNIT',code:'UTIL26',color:'#ff6b35'},{name:'SAFETY & SECURITY',code:'SEC26',color:'#ffd166'},{name:'TASK FORCE',code:'TF26',color:'#a29bfe'}])],['adminPass','PAGONG-ADMIN'],['commanderPw','PAGONG']].forEach(function(r){s.appendRow(r);});
  Logger.log('✅ OPM setup complete — all 6 sheets ready');
}
