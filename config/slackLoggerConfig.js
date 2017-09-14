const SLACK_WEB_HOOK = process.env.SLACK_WEB_HOOK || 'none';
let SLACK_ERROR_CHANNEL;
let SLACK_INFO_CHANNEL;
if (process.env.NODE_ENV === 'production') {
    SLACK_ERROR_CHANNEL = '#speech-errors';
    SLACK_INFO_CHANNEL = '#speech-logs';
} else {
    SLACK_ERROR_CHANNEL = '#staging_speech-errors';
    SLACK_INFO_CHANNEL = '#staging_speech-logs';
}

const winstonSlackWebHook = require('winston-slack-webhook').SlackWebHook;

module.exports = (winston) => {
  // add a transport for errors
  winston.add(winstonSlackWebHook, {
    name      : 'slack-errors-transport',
    level     : 'error',
    webhookUrl: SLACK_WEB_HOOK,
    channel   : SLACK_ERROR_CHANNEL,
    username  : 'speech_sync',
    iconEmoji : ':face_with_head_bandage:',
  });
  winston.add(winstonSlackWebHook, {
    name      : 'slack-info-transport',
    level     : 'info',
    webhookUrl: SLACK_WEB_HOOK,
    channel   : SLACK_INFO_CHANNEL,
    username  : 'speech_sync',
    iconEmoji : ':nerd_face:',
  });
  // send test message
  winston.error('Testing slack logging... slack logging is online.');
};
