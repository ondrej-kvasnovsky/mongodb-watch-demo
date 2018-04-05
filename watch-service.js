const fs = require('fs')

const MongoClient = require('mongodb').MongoClient
const BSON = require('bson')
const url = 'mongodb://localhost:27017,127.0.0.1:27018/?replicaSet=rs0'
const dbName = 'test'
const lastIdFileName = 'restore_object.bson'

module.exports = class {
  async start() {
    const client = await MongoClient.connect(url)
    console.log('Connected!')
    try {
      const db = await client.db(dbName)
      const collection = await db.collection('items')

      const recoverId = this.getRecoveryObject()
      const pipeline = [] // filter: insert & update
      const changeStream = await collection.watch(pipeline, {
        resumeAfter: recoverId
      })
      let hasNext = await changeStream.hasNext()
      //
      while (hasNext) {
        const message = await changeStream.next()
        const lastId = BSON.prototype.serialize(message._id)
        fs.writeFileSync(lastIdFileName, lastId)
        console.log(message.fullDocument)
        hasNext = await changeStream.hasNext()
      }
      console.log('Closing connection...')
      await changeStream.close()
    } catch (e) {
      console.log(e)
    }
  }

  getRecoveryObject() {
    let recoverId = null
    if (fs.existsSync(lastIdFileName)) {
      const lastIdFile = fs.readFileSync(lastIdFileName)
      recoverId = BSON.prototype.deserialize(lastIdFile)
    }
    return recoverId
  }
}
