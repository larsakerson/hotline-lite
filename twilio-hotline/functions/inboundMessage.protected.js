exports.handler = async function (context, event, callback) {
  // Has the Signal integration been configured? If not, we stop right here.
  // The presence of a group key is a proxy for a functional Signal dropbox.
  const signalConfigured = !!context.GROUP_KEY;
  if (!signalConfigured) return callback(null, '');

  // We want to ignore messages from numbers that are on our blocklist,
  // or if the system is in allowlist-only mode and the number isn't on the allowlist.
  const sender = event.From.replace('whatsapp:', '');
  let connectionSequences = [];
  try { connectionSequences = JSON.parse(context.CONNECTION_SEQUENCES || '[]'); }
  catch (e) { connectionSequences = []; }
  if (!Array.isArray(connectionSequences)) connectionSequences = [];
  const allowlistOnly = context.ALLOWLIST_ONLY === 'true';
  const callerSequence = connectionSequences.find(s => s && s.number === sender);

  // BLOCKLIST may be unset (it isn't pre-provisioned), empty, or the 'null'
  // sentinel admin writes for an empty list — guard the split so a missing var
  // can't crash every call.
  const blocklist = (!context.BLOCKLIST || context.BLOCKLIST === 'null')
    ? [] : context.BLOCKLIST.split(',').filter(Boolean);

  // If the sender is on the blocklist, or if we're in allowlist-only mode
  // and the sender isn't on the allowlist, we ignore the message.
  if (blocklist.includes(sender) || (allowlistOnly && !callerSequence)) {
    console.log('Ignoring message from blocked or unallowed number:', sender);
    return callback(null, '');
  }

  // If the message is a 2FA code, we don't want to forward it to the group chat. 
  // Instead, we just log it and return a success response.
  const pattern = /code[^0-9]{0,40}((\d{3})[-\s]?(\d{3})|(\d{4}))/i;
  if (pattern.test(event.Body)) {
    console.log('Ignoring confirmation code message from:', event.From);
    return callback(null, '');
  }

  // Check for media attachments. If there are any, we want to send them to the group chat as well.
  let mediaUrls = [];
  if (event.NumMedia && parseInt(event.NumMedia) > 0) {
    const crypto = require('crypto');
    const extName = require('ext-name');
    for (let i = 0; i < parseInt(event.NumMedia); i++) {
      let contentType = event[`MediaContentType${i}`];
      // ext-name returns nothing for a type it doesn't know, and it won't match
      // a type that carries parameters (`audio/ogg; codecs=opus`, which is what
      // some WhatsApp voice notes arrive as). Strip the parameters and fall back,
      // so one unusual attachment can't take down the whole message.
      let match = extName.mime(contentType.split(';')[0].trim())[0];
      let extension = match ? match.ext : 'bin';
      let filename = `${crypto.randomUUID()}_attachment_${i + 1}.${extension}`;
      mediaUrls.push({ url: event[`MediaUrl${i}`], contentType: contentType, filename: filename });
    }
    console.log('Found', mediaUrls.length, 'media attachment(s) in message from', sender, 'with content types:', mediaUrls.map(m => m.contentType).join(', '));
  }

  const { notify, prepareAttachment } = require(Runtime.getAssets()['/notify.js'].path);
  const { formatE164 } = require(Runtime.getAssets()['/language.js'].path);

  // Prepare the message to send to the group chat, including any media attachments.
  const messageType = event.To.includes('whatsapp') ? 'WhatsApp' : 'SMS';
  let senderId = formatE164(sender);
  senderId += event.From.includes('whatsapp') && event.ProfileName ? ' (~' + event.ProfileName + ')' : '';
  const attachmentText = mediaUrls.length > 0 ? ` with ${mediaUrls.length} attachment(s)` : '';
  let attachment_path = mediaUrls.length > 0 ? await prepareAttachment(context, mediaUrls[0].url, mediaUrls[0].filename) : null;
  let messageBody = event.Body + "\n\n---\n" + messageType + " from " + senderId + attachmentText;
  await notify(context, messageBody, attachment_path);

  // If there are multiple media attachments (like several photos),
  // we want to forward them all to the group chat, but only the first one was included in the main message.
  // So we send the rest of the attachments in separate messages.
  if (mediaUrls.length > 1) {
    for (let media of mediaUrls.slice(1)) {
      attachment_path = await prepareAttachment(context, media.url, media.filename);
      messageBody = "Attachment " + (mediaUrls.indexOf(media) + 1) + " of " + mediaUrls.length + " from " + senderId;
      await notify(context, messageBody, attachment_path);
    }
  }

  // Wait a moment to ensure the message is sent before returning.
  // This is a workaround for Twilio runtime errors that can occur 
  // if the function returns too quickly.
  await new Promise(resolve => setTimeout(resolve, 2000));

  const autoresponderMessage = context.AUTORESPONDER_MESSAGE.trim() || false;
  // If an autoresponder message isn't configured, we don't want to send anything to the sender. 
  // If it is configured, we want to send that message to the sender, but only
  // if they haven't received a message from the hotline in the last 7 days.
  if (autoresponderMessage) {
    const recentOutboundMessages = await twilioClient.messages.list({ 
      from: event.To, 
      dateSentAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) });
    recentRecipients = [...new Set(recentOutboundMessages.map(m => m.to))];
    console.log('Recent recipients of messages from', event.To, 'in the last 7 days:', recentRecipients);
    if (!recentRecipients.includes(event.From)) {
      await twilioClient.messages.create({
        from: event.To,
        to: event.From,
        body: autoresponderMessage
      });
      console.log('Sent autoresponder message from', event.To, 'to', event.From, 'with body:', autoresponderMessage);
    }
  }

  return callback(null, '');

}
