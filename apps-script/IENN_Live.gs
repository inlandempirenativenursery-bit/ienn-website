/** IENN live check (invoice v4 project). Run iennLiveCheck once after iennSetup; read View > Logs. Changes nothing. */
function iennLiveCheck() {
  var inv = SpreadsheetApp.openById(IENN_INVENTORY_SPREADSHEET_ID), invs = iennInvoicesSheet_();
  Logger.log('Inventory: ' + inv.getName() + ' tabs=' + inv.getSheets().map(function (s) { return s.getName(); }).join(','));
  Logger.log('Invoices: ' + invs.getParent().getName() + ' / ' + invs.getName() + ' rows=' + invs.getLastRow());
  Logger.log('getAvailableStock plants: ' + Object.keys(getAvailableStock()).length + '; baseline: ' + iennBaselineDate_());
  var team = getSettings().teamEmails || {}, filled = Object.keys(team).filter(function (k) { return team[k]; });
  Logger.log(filled.length ? 'WARNING: Invoices Settings teamEmails is filled (' + filled.join(',') + ') so submitInvoice ALSO emails the team: duplicate alerts. Blank that cell to {} to keep only the To Andrew / CC Eric+Keith alert.'
                           : 'OK: teamEmails empty, only the IENN alert (To Andrew, CC Eric + Keith) is sent.');
  Logger.log('Script time zone: ' + Session.getScriptTimeZone() + ' (should be America/Los_Angeles)');
}
