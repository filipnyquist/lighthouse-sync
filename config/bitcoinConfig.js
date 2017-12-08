module.exports={
  host: 'localhost',
  port: 9245,
  user: process.env.LBRYCRD_USERNAME || 'lbry',
  pass: process.env.LBRYCRD_PASSWORD || 'lbry',
  timeout: 30000
}