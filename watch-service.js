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
      const pipeline = [
        {
          $match: {
            $or: [{ operationType: 'insert' }, { operationType: 'delete' }, { operationType: 'update' }]
          }
        }
      ]
      const options = {
        resumeAfter: recoverId
      }
      const changeStream = await collection.watch(pipeline, options)
      let hasNext = await changeStream.hasNext()
      while (hasNext) {
        const event = await changeStream.next()
        const lastId = BSON.prototype.serialize(event._id)
        fs.writeFileSync(lastIdFileName, lastId)
        console.log(event.ns)
        console.log(event.operationType)
        console.log(event.fullDocument)
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
