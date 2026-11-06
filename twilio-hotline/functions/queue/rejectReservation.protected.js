exports.handler = async function(context, event, callback) {
  const { setLogLevel } = require(Runtime.getAssets()['/logging.js'].path);
  setLogLevel(context);

  console.debug("RejectReservation " + event.taskSid + " " + event.reservationSid);
  const twiml = new Twilio.twiml.VoiceResponse();
  const client = context.getTwilioClient();
  await client.taskrouter.v1.workspaces(context.WORKSPACE_SID)
                            .tasks(event.taskSid)
                            .reservations(event.reservationSid)
                            .update({ reservationStatus: 'rejected' })
                            .catch(function () {
    console.debug("RejectReservation Promise Rejected");
  });
  return callback(null, twiml);
};
