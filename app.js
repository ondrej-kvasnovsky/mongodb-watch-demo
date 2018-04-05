const WatchService = require('./watch-service')
const watchService = new WatchService()
;(async () => {
  await watchService.start()
})().catch(err => {
  console.error(err)
})
