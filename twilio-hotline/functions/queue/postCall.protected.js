exports.handler = async function (context, event, callback) {
  //console.log("POSTCALL " + event.taskSid + " " + event.language + " " + event.callerFrom);
  const { sayAttrs, sayLangMap, loadMessages } = require(Runtime.getAssets()['/language.js'].path);
  const messages = loadMessages([event.language])[event.language].operator;
  const twiml = new Twilio.twiml.VoiceResponse();
  if (!event.Digits) {
    const client = context.getTwilioClient();
    try {
      const reservation = await client.taskrouter.v1
          .workspaces(context.WORKSPACE_SID)
          .tasks(event.taskSid)
          .reservations(event.reservationSid)
          .fetch();
      console.log("postCall reservationStatus " + reservation.reservationStatus);
        ['canceled', 'rescinded'].includes(reservation.reservationStatus) && !['completed', 'accepted'].includes(reservation.reservationStatus)
          ? twiml.say(sayAttrs(event.language), messages.precall.reservationStatus[reservation.reservationStatus])
          : twiml.say(sayAttrs(event.language), messages.precall.reservationStatus.default)
    } catch (err) {
      console.error("postCall reservation fetch failed: " + err.message);
    }
    const gather = twiml.gather({ numDigits: 1 });
    sayLangMap(
      gather,
      event.language,
      messages.postcall.options,
      event.callerFrom
    );
  } else if (event.Digits == 1) {
    // Repeat the caller's number
    sayLangMap(
      twiml,
      event.language,
      messages.postcall.callerNumber,
      event.callerFrom
    );
    twiml.redirect('');  // Redirects to the current URL
  } else if (event.Digits == 2) {
    // Add to blocklist
    const client = context.getTwilioClient();
    const env = client.serverless.v1.services(context.SERVICE_SID)
      .environments(context.ENVIRONMENT_SID);
    const existing = (await env.variables.list()).find(v => v.key == "BLOCKLIST");
    // Treat unset/empty/'null' as an empty list, then append the caller. Create
    // the variable if it doesn't exist yet (it isn't pre-provisioned by setup).
    const current = (!context.BLOCKLIST || context.BLOCKLIST == "null") ? "" : context.BLOCKLIST;
    const blockList = current ? current + "," + event.callerFrom : event.callerFrom;
    if (existing) await env.variables(existing.sid).update({ value: blockList });
    else await env.variables.create({ key: "BLOCKLIST", value: blockList });
    sayLangMap(
      twiml,
      event.language,
      messages.postcall.blocking,
      event.callerFrom
    );
  } else if (event.Digits == 3) {
    // Call the number back
    sayLangMap(
      twiml,
      event.language,
      messages.postcall.callingBack,
      event.callerFrom
    );
    twiml.dial(event.callerFrom);
  }
  return callback(null, twiml);
};
