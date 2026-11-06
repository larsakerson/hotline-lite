// NOTE: assignmentStatusCallback has to be public, for some reason!
exports.handler = async function (context, event, callback) {
  const { setLogLevel } = require(Runtime.getAssets()['/logging.js'].path);
  setLogLevel(context);

  console.debug("AssignmentStatusCallback " + event.taskSid); // NOTE: Lower case t! Manually added in the "call" instruction.
  const client = context.getTwilioClient();
  await client.taskrouter.v1
    .workspaces(context.WORKSPACE_SID)
    .tasks(event.taskSid)
    .update({ assignmentStatus: 'completed' })
    .catch(function () {
      console.debug("AssignmentStatusCallback Promise Rejected");
    });
  return callback(null, "OK");
};
