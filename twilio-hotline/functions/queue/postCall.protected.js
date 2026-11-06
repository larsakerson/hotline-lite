exports.handler = async function (context, event, callback) {
  !context.DEBUG || context.DEBUG == '0' ? console.log = console.warn = () => {} : '';
  
  const { sayAttrs, sayLangMap, loadMessages } = require(Runtime.getAssets()['/language.js'].path);
  const messages = loadMessages([event.language])[event.language];
  const twiml = new Twilio.twiml.VoiceResponse();
  if (!event.Digits) {
    const client = context.getTwilioClient();
    const reservation = await client.taskrouter.v1
        .workspaces(context.WORKSPACE_SID)
        .tasks(event.taskSid)
        .reservations(event.reservationSid)
        .fetch()
        .catch(err => console.error("postCall reservation fetch failed: " + err.message));

    if (!['completed', 'accepted'].includes(reservation.reservationStatus)) {
      // If someone else answered the call or the caller hung up, let the operator know what happened
      // Then end the call
      ['canceled', 'rescinded'].includes(reservation.reservationStatus)
        ? twiml.say(
          sayAttrs(event.language), 
          messages.operator.precall.reservationStatus[reservation.reservationStatus]
        )
        : twiml.say(
          sayAttrs(event.language), 
          messages.operator.precall.reservationStatus.default
        )
      sayLangMap(twiml, event.language, messages.operator.postcall.callerNumber, event.callerFrom)
      twiml.say(sayAttrs(event.language), messages.caller.main.goodbye)
    } else {
      // Otherwise, give the operator the standard post-call menu
      const gather = twiml.gather({ numDigits: 1 });
      sayLangMap(gather, event.language, messages.operator.postcall.options, event.callerFrom);
    }
  // If digits are included in the request parameters, 
  // the operator is requesting an action on the caller's number
  // We perform that action below
  } else if (event.Digits == 1) {
    // Repeat the caller's number
    sayLangMap(
      twiml,
      event.language,
      messages.operator.postcall.callerNumber,
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
      messages.operator.postcall.blocking,
      event.callerFrom
    );
  } else if (event.Digits == 3) {
    // Call the number back
    sayLangMap(
      twiml,
      event.language,
      messages.operator.postcall.callingBack,
      event.callerFrom
    );
    twiml.dial(event.callerFrom);
  }
  return callback(null, twiml);
};
