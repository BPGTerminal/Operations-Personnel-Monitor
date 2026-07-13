// ============================================================
// OPM — Operations Personnel Monitor
// Google Apps Script Backend (Complete)
// 
// INSTRUCTIONS:
// 1. Open script.google.com → New Project
// 2. Delete everything, paste this entire file
// 3. Click Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy the deployment URL → paste into OPM Admin page
// 5. The script auto-creates all required sheets on first run
// ============================================================

var SHEET_PERSONNEL = 'Personnel';
var SHEET_MESSAGES   = 'Messages';
var SHEET_PENDING    = 'Pending';
var SHEET_SETTINGS   = 'Settings';
var SHEET_VIDEO      = 'VideoLog';

// ════════════════════════════════════════════════════════════
// ENTRY POINTS
// ════════════════════════════════════════════════════════════

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

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
      case 'getSettings':      result = getSettings();      break;
      case 'saveSettings':     result = saveSettings(data); break;
      case 'getAll':           result = getAll();           break;
      case 'checkIn':          result = checkIn(data);      break;
      case 'updateLocation':   result = updateLocation(data); break;
      case 'markAllOffline':   result = markAllOffline();   break;
      case 'markOneOffline':   result = markOneOffline(data); break;
      case 'getMessages':      result = getMessages();      break;
      case 'sendMessage':      result = sendMessage(data);  break;
      case 'uploadPhoto':      result = uploadPhoto(data);  break;
      case 'requestApproval':  result = requestApproval(data); break;
      case 'getPending':       result = getPending();       break;
      case 'checkApproval':    result = checkApproval(data); break;
      case 'approveUser':      result = approveUser(data);  break;
      case 'rejectUser':       result = rejectUser(data);   break;
      case 'clearEventData':   result = clearEventData();   break;
      case 'getEventVersion':  result = getEventVersion();  break;
      case 'logVideoCall':     result = logVideoCall(data); break;
      default:                 result = { error: 'Unknown action: ' + action };
    }
    
    return json(result);
    
  } catch (err) {
    return json({ error: err.message || 'Server error' });
  }
}

// ════════════════════════════════════════════════════════════
// SHEET HELPERS
// ════════════════════════════════════════════════════════════

function ensureSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
    }
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
    if (String(col[i][0]).trim().toUpperCase() === String(value).trim().toUpperCase()) {
      return i + 2;
    }
  }
  return -1;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function now() {
  return Utilities.formatDate(new Date(), 'Asia/Manila', 'HH:mm:ss');
}

function nowFull() {
  return Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss');
}

// ════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════

function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  
  var settings = {
    eventName: '', eventDate: '', commander: 'PAGONG', unit: '',
    location: '', lat: '8.7891', lng: '117.8370', locInterval: '60',
    teams: [], adminPass: 'PAGONG-ADMIN', commanderPw: 'PAGONG'
  };
  
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      var key = data[i][0];
      var val = data[i][1];
      if (key && settings.hasOwnProperty(key)) {
        settings[key] = val;
      }
    }
  }
  
  if (typeof settings.teams === 'string') {
    try { settings.teams = JSON.parse(settings.teams); } catch (e) { settings.teams = []; }
  }
  
  if (!Array.isArray(settings.teams) || settings.teams.length === 0) {
    settings.teams = [
      { name: 'ALPHA TEAM',  code: 'ALPHA26',  color: '#00e5ff' },
      { name: 'BRAVO TEAM',  code: 'BRAVO26',  color: '#00ff88' },
      { name: 'CHARLIE TEAM', code: 'CHARLIE26', color: '#ff6b35' }
    ];
  }
  
  return { settings: settings };
}

function saveSettings(data) {
  var sheet = ensureSheet(SHEET_SETTINGS);
  
  var teams = data.teams;
  if (typeof teams !== 'string') teams = JSON.stringify(teams);
  
  sheet.clear();
  sheet.appendRow(['Key', 'Value']);
  var rows = [
    ['eventName',   data.eventName   || ''],
    ['eventDate',   data.eventDate   || ''],
    ['commander',   data.commander   || 'PAGONG'],
    ['unit',        data.unit        || ''],
    ['location',    data.location    || ''],
    ['lat',         data.lat         || '8.7891'],
    ['lng',         data.lng         || '117.8370'],
    ['locInterval', data.locInterval || '60'],
    ['teams',       teams],
    ['adminPass',   data.adminPass   || 'PAGONG-ADMIN'],
    ['commanderPw', data.commanderPw || 'PAGONG']
  ];
  rows.forEach(function(row) { sheet.appendRow(row); });
  
  return { status: 'saved', settings: data };
}

// ════════════════════════════════════════════════════════════
// PERSONNEL
// ════════════════════════════════════════════════════════════

function checkIn(data) {
  var sheet = ensureSheet(SHEET_PERSONNEL, [
    'ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId'
  ]);
  
  var devId = data.deviceId || data.id || '';
  var existingRow = getRowByColumn(sheet, 9, devId);
  
  var row = [
    data.deviceId || data.id || '',
    data.name     || '',
    data.team     || '',
    data.post     || '',
    data.lat      || '',
    data.lng      || '',
    'TRUE',
    now(),
    data.deviceId || data.id || ''
  ];
  
  if (existingRow > 0) {
    for (var c = 1; c <= row.length; c++) {
      sheet.getRange(existingRow, c).setValue(row[c - 1]);
    }
  } else {
    sheet.appendRow(row);
  }
  
  return { status: 'ok' };
}

function updateLocation(data) {
  var sheet = ensureSheet(SHEET_PERSONNEL, [
    'ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId'
  ]);
  
  var devId = data.deviceId || '';
  var existingRow = getRowByColumn(sheet, 9, devId);
  
  if (existingRow > 0) {
    // Only update lat/lng if we actually got coordinates
    if (data.lat && String(data.lat) !== '' && String(data.lat) !== '0') {
      sheet.getRange(existingRow, 5).setValue(data.lat || '');
      sheet.getRange(existingRow, 6).setValue(data.lng || '');
    }
    sheet.getRange(existingRow, 7).setValue('TRUE');
    sheet.getRange(existingRow, 8).setValue(now());
    return { status: 'updated' };
  }
  
  sheet.appendRow([devId, data.name || 'Unknown', '', '', data.lat || '', data.lng || '', 'TRUE', now(), devId]);
  return { status: 'created' };
}

function getAll() {
  var pSheet = ensureSheet(SHEET_PERSONNEL, [
    'ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId'
  ]);
  var mSheet = ensureSheet(SHEET_MESSAGES, [
    'Time', 'Sender', 'Team', 'Post', 'Body', 'Type', 'PhotoUrl', 'PhotoLat', 'PhotoLng', 'Target'
  ]);
  
  var rawPersonnel = getAllRows(pSheet);
  var rawMessages = getAllRows(mSheet);
  
  var personnel = rawPersonnel.map(function(r) {
    return {
      id:       String(r[0] || ''),
      name:     String(r[1] || ''),
      team:     String(r[2] || ''),
      post:     String(r[3] || ''),
      lat:      String(r[4] || ''),
      lng:      String(r[5] || ''),
      online:   String(r[6] || '').toUpperCase() === 'TRUE',
      lastSeen: String(r[7] || ''),
      deviceId: String(r[8] || '')
    };
  });
  
  var messages = rawMessages.map(function(r) {
    return {
      time:     String(r[0] || ''),
      sender:   String(r[1] || ''),
      team:     String(r[2] || ''),
      post:     String(r[3] || ''),
      body:     String(r[4] || ''),
      type:     String(r[5] || 'chat'),
      photoUrl: String(r[6] || ''),
      photoLat: String(r[7] || ''),
      photoLng: String(r[8] || ''),
      target:   String(r[9] || 'ALL')
    };
  });
  
  return { personnel: personnel, messages: messages };
}

function markAllOffline() {
  var sheet = ensureSheet(SHEET_PERSONNEL, [
    'ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId'
  ]);
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'ok', count: 0 };
  
  var count = lastRow - 1;
  for (var r = 2; r <= lastRow; r++) {
    sheet.getRange(r, 7).setValue('FALSE');
  }
  
  return { status: 'ok', count: count };
}

function markOneOffline(data) {
  var sheet = ensureSheet(SHEET_PERSONNEL, [
    'ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId'
  ]);
  
  var devId = data.deviceId || '';
  var row = getRowByColumn(sheet, 9, devId);
  
  if (row > 0) sheet.getRange(row, 7).setValue('FALSE');
  
  return { status: 'ok' };
}

// ════════════════════════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════════════════════════

function sendMessage(data) {
  var sheet = ensureSheet(SHEET_MESSAGES, [
    'Time', 'Sender', 'Team', 'Post', 'Body', 'Type', 'PhotoUrl', 'PhotoLat', 'PhotoLng', 'Target'
  ]);
  
  sheet.appendRow([
    nowFull(),
    data.sender || data.name || '',
    data.team  || '',
    data.post  || '',
    data.body  || '',
    data.type  || 'chat',
    data.photoUrl || '',
    data.photoLat || '',
    data.photoLng || '',
    data.target  || 'ALL'
  ]);
  
  return { status: 'sent' };
}

function getMessages() {
  var sheet = ensureSheet(SHEET_MESSAGES, [
    'Time', 'Sender', 'Team', 'Post', 'Body', 'Type', 'PhotoUrl', 'PhotoLat', 'PhotoLng', 'Target'
  ]);
  
  var raw = getAllRows(sheet);
  return {
    messages: raw.map(function(r) {
      return {
        time:     String(r[0] || ''),
        sender:   String(r[1] || ''),
        team:     String(r[2] || ''),
        post:     String(r[3] || ''),
        body:     String(r[4] || ''),
        type:     String(r[5] || 'chat'),
        photoUrl: String(r[6] || ''),
        photoLat: String(r[7] || ''),
        photoLng: String(r[8] || ''),
        target:   String(r[9] || 'ALL')
      };
    })
  };
}

function uploadPhoto(data) {
  try {
    var folderName = 'OPM_Photos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var base64 = (data.photoData || '').replace(/^data:image\/\w+;base64,/, '');
    
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      'image/jpeg',
      'OPM_' + new Date().getTime() + '.jpg'
    );
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { status: 'ok', photoUrl: file.getUrl(), photoId: file.getId() };
  } catch (e) {
    return { status: 'ok', photoUrl: data.photoData || '', note: 'Drive upload failed: ' + e.message };
  }
}

// ════════════════════════════════════════════════════════════
// APPROVALS
// ════════════════════════════════════════════════════════════

function requestApproval(data) {
  var sheet = ensureSheet(SHEET_PENDING, [
    'DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status'
  ]);
  
  var devId = data.deviceId || '';
  var existingRow = getRowByColumn(sheet, 1, devId);
  
  // Check if already approved in Personnel
  var pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PERSONNEL);
  if (pSheet) {
    var pRow = getRowByColumn(pSheet, 9, devId);
    if (pRow > 0 && String(pSheet.getRange(pRow, 7).getValue() || '').toUpperCase() === 'TRUE') {
      return { status: 'APPROVED', deviceId: devId };
    }
  }
  
  var row = [devId, data.name || '', data.team || '', data.post || '', nowFull(), 'PENDING'];
  
  if (existingRow > 0) {
    for (var c = 1; c <= row.length; c++) {
      sheet.getRange(existingRow, c).setValue(row[c - 1]);
    }
  } else {
    sheet.appendRow(row);
  }
  
  return { status: 'PENDING', deviceId: devId };
}

function getPending() {
  var sheet = ensureSheet(SHEET_PENDING, [
    'DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status'
  ]);
  
  var raw = getAllRows(sheet);
  
  return {
    pending: raw
      .filter(function(r) { return String(r[5] || '').toUpperCase() === 'PENDING'; })
      .map(function(r) {
        return {
          deviceId: String(r[0] || ''),
          name:     String(r[1] || ''),
          team:     String(r[2] || ''),
          post:     String(r[3] || ''),
          time:     String(r[4] || ''),
          status:   String(r[5] || '')
        };
      })
  };
}

function checkApproval(data) {
  var devId = data.deviceId || '';
  
  // Check Pending sheet
  var pendingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PENDING);
  if (pendingSheet) {
    var pendingRow = getRowByColumn(pendingSheet, 1, devId);
    if (pendingRow > 0) {
      var status = String(pendingSheet.getRange(pendingRow, 6).getValue() || '').toUpperCase();
      if (status === 'APPROVED' || status === 'REJECTED') {
        return { status: status, deviceId: devId };
      }
    }
  }
  
  // Check Personnel sheet
  var pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PERSONNEL);
  if (pSheet) {
    var pRow = getRowByColumn(pSheet, 9, devId);
    if (pRow > 0) return { status: 'APPROVED', deviceId: devId };
  }
  
  return { status: 'PENDING', deviceId: devId };
}

function approveUser(data) {
  var sheet = ensureSheet(SHEET_PENDING, [
    'DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status'
  ]);
  
  var devId = data.deviceId || '';
  var row = getRowByColumn(sheet, 1, devId);
  
  if (row > 0) sheet.getRange(row, 6).setValue('APPROVED');
  
  return { status: 'approved' };
}

function rejectUser(data) {
  var sheet = ensureSheet(SHEET_PENDING, [
    'DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status'
  ]);
  
  var devId = data.deviceId || '';
  var row = getRowByColumn(sheet, 1, devId);
  
  if (row > 0) sheet.getRange(row, 6).setValue('REJECTED');
  
  return { status: 'rejected' };
}

// ════════════════════════════════════════════════════════════
// MANAGEMENT
// ════════════════════════════════════════════════════════════

function clearEventData() {
  // Personnel
  var pSheet = ensureSheet(SHEET_PERSONNEL, [
    'ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId'
  ]);
  pSheet.clear();
  pSheet.appendRow(['ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId']);
  
  // Messages
  var mSheet = ensureSheet(SHEET_MESSAGES, [
    'Time', 'Sender', 'Team', 'Post', 'Body', 'Type', 'PhotoUrl', 'PhotoLat', 'PhotoLng', 'Target'
  ]);
  mSheet.clear();
  mSheet.appendRow(['Time', 'Sender', 'Team', 'Post', 'Body', 'Type', 'PhotoUrl', 'PhotoLat', 'PhotoLng', 'Target']);
  
  // Pending
  var aSheet = ensureSheet(SHEET_PENDING, [
    'DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status'
  ]);
  aSheet.clear();
  aSheet.appendRow(['DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status']);
  
  // Bump event version so Commander knows to wipe local cache
  var settingsSheet = ensureSheet(SHEET_SETTINGS);
  var versionStr = nowFull();
  settingsSheet.getRange('B2').setValue(versionStr);
  
  return { status: 'cleared', version: versionStr };
}

function getEventVersion() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  if (!sheet) return { version: '' };
  var data = sheet.getRange('B2').getValue();
  return { version: data ? String(data) : '' };
}

function logVideoCall(data) {
  var sheet = ensureSheet(SHEET_VIDEO, [
    'Room', 'StartedBy', 'TimeStart', 'TimeEnd', 'Participants', 'Notes'
  ]);
  
  sheet.appendRow([
    data.room         || '',
    data.startedBy    || '',
    data.timeStart    || '',
    data.timeEnd      || '',
    (data.participants || []).join(', '),
    data.notes        || ''
  ]);
  
  return { status: 'logged' };
}

// ════════════════════════════════════════════════════════════
// ONE-TIME SETUP — Run this manually from the editor
// ════════════════════════════════════════════════════════════

function setup() {
  ensureSheet(SHEET_PERSONNEL, ['ID', 'Name', 'Team', 'Post', 'Lat', 'Lng', 'Online', 'LastSeen', 'DeviceId']);
  ensureSheet(SHEET_MESSAGES,   ['Time', 'Sender', 'Team', 'Post', 'Body', 'Type', 'PhotoUrl', 'PhotoLat', 'PhotoLng', 'Target']);
  ensureSheet(SHEET_PENDING,    ['DeviceId', 'Name', 'Team', 'Post', 'Time', 'Status']);
  ensureSheet(SHEET_VIDEO,      ['Room', 'StartedBy', 'TimeStart', 'TimeEnd', 'Participants', 'Notes']);
  
  var settingsSheet = ensureSheet(SHEET_SETTINGS);
  settingsSheet.clear();
  settingsSheet.appendRow(['Key', 'Value']);
  settingsSheet.appendRow(['eventName', '']);
  settingsSheet.appendRow(['eventDate', '']);
  settingsSheet.appendRow(['commander', 'PAGONG']);
  settingsSheet.appendRow(['unit', '']);
  settingsSheet.appendRow(['location', '']);
  settingsSheet.appendRow(['lat', '8.7891']);
  settingsSheet.appendRow(['lng', '117.8370']);
  settingsSheet.appendRow(['locInterval', '60']);
  settingsSheet.appendRow(['teams', JSON.stringify([
    { name: 'ALPHA TEAM',  code: 'ALPHA26',  color: '#00e5ff' },
    { name: 'BRAVO TEAM',  code: 'BRAVO26',  color: '#00ff88' },
    { name: 'CHARLIE TEAM', code: 'CHARLIE26', color: '#ff6b35' }
  ])]);
  settingsSheet.appendRow(['adminPass', 'PAGONG-ADMIN']);
  settingsSheet.appendRow(['commanderPw', 'PAGONG']);
  
  Logger.log('✅ OPM setup complete — all 5 sheets created');
}
