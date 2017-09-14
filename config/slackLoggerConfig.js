const SLACK_WEB_HOOK = process.env.SLACK_WEB_HOOK || 'none';
const SLACK_ERROR_CHANNEL = '#speech-errors';
const SLACK_INFO_CHANNEL = '#speech-logs';
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
