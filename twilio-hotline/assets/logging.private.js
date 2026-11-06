// This file defines private logging methods for the Twilio Hotline application.

function setLogLevel(context) {
  // If the DEBUG environment variable is not set or is set to 1, 
  // enable info and warning logs. Otherwise, disable them.
  if (context.DEBUG == null || !!Number(context.DEBUG)) {
    console.debug = console.log;
  } else {
    console.debug = () => {};
    console.warn = () => {};
  }
};

module.exports = { setLogLevel };
