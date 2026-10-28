/** Run in your own Google Apps Script project. See docs/GMAIL_SETUP.md. */
function syncCreditCardEmails() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try {
    const p=PropertiesService.getScriptProperties();
    const base=p.getProperty('APP_URL');
    const secret=p.getProperty('EMAIL_WEBHOOK_SECRET');
    const query=p.getProperty('GMAIL_QUERY');
    if(!base || !/^https:\/\//.test(base) || !secret || !query)throw new Error('Set APP_URL, EMAIL_WEBHOOK_SECRET and GMAIL_QUERY in Script Properties.');
    // Restrict the query to your bank's exact sender and purchase notification subject.
    // A seven-day overlap is intentional; the server deduplicates Gmail message IDs.
    const threads=GmailApp.search('newer_than:7d ('+query+')',0,100);
    for(const thread of threads){
      for(const message of thread.getMessages()){
        if(Date.now()-message.getDate().getTime()>7*86400000)continue;
        const result=UrlFetchApp.fetch(base.replace(/\/$/,'')+'/api/email/parse',{
          method:'post',contentType:'application/json',
          headers:{Authorization:'Bearer '+secret},
          payload:JSON.stringify({messageId:message.getId(),subject:message.getSubject(),text:message.getPlainBody()}),
          muteHttpExceptions:true,followRedirects:false
        });
        if(result.getResponseCode()!==200)throw new Error('Transaction delivery failed: HTTP '+result.getResponseCode());
      }
    }
  } finally {lock.releaseLock()}
}
