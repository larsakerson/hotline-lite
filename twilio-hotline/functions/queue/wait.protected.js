exports.handler = function (context, event, callback) {
  const { sayLangMap, loadMessages } = require(Runtime.getAssets()['/language.js'].path);
  const callerLanguage = event.language || context.LANGUAGES.split(',')[0] || 'en';
  const messages = loadMessages([callerLanguage])[callerLanguage];
  const waitMessages = messages.caller.wait;
  // Voice memos are delivered over Signal; without an active group (GROUP_KEY)
  // a recording would go nowhere, so don't offer to take one.
  const signalConfigured = !!context.GROUP_KEY;
  const customWaitMessages = context.WAIT_MESSAGES ? JSON.parse(context.WAIT_MESSAGES) : {};
  const localizedWaitMessage = customWaitMessages[callerLanguage] || false;
  // Twilio will loop this call while the user is waiting.
  const twiml = new Twilio.twiml.VoiceResponse();
  if (!event.Digits) {
    const gather = twiml.gather({ numDigits: 1 })
    sayLangMap(gather, callerLanguage, waitMessages.connecting);
    if (signalConfigured) {
      gather.pause({ length: 2 });
      sayLangMap(gather, callerLanguage, waitMessages.leaveAMessage);
    }
    if (localizedWaitMessage) {
      gather.pause({ length: 2 });
      if (/^https.*(?:wav|mp3)$/i.test(localizedWaitMessage)) {
        gather.play(localizedWaitMessage);
        gather.pause({ length: 2 });
      } else {
        sayLangMap(gather, callerLanguage, localizedWaitMessage);
        gather.pause({ length: 2 });
      }
    }
  } else if (signalConfigured) {
    // NOTE: record() isn't supported in waitUrl documents, so we
    // leave() the queue from here to come back to the enqueue verb.
    twiml.leave();
  }
  return callback(null, twiml);
};
