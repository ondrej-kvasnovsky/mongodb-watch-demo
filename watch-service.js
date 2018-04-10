const fs = require('fs')
const Rx = require('rxjs/Rx')

const MongoClient = require('mongodb').MongoClient
const BSON = require('bson')
// const url = 'mongodb://localhost:27017,127.0.0.1:27018/?replicaSet=rs0'
const url = 'mongodb://10.99.129.132:27017/?replicaSet=rs0'
const dbName = 'test'
const lastIdFileName = 'restore_object.bson'

module.exports = class {
  async start() {
    const client = await MongoClient.connect(url)
    console.log('Connected!')
    try {
      const db = await client.db(dbName)
      const collection = await db.collection('items')

      this.readExisting(collection)
      this.startChangeStream(collection)
    } catch (e) {
      console.log(e)
    }
  }

  async readExisting(collection) {
    // const lastItem = await collection
    //   .find()
    //   .sort({ $natural: 1 })
    //   .limit(1)
    //   .next()
    // console.log('last item')
    // console.log(lastItem)
    // {_id: {$gt: lastItem._id}}
    const cursor = await collection.find().batchSize(10)
    console.log('Reading existing items...')
    const observable = Rx.Observable.create(async observer => {
      while (await cursor.hasNext()) {
        observer.next(await cursor.next())
      }
      cursor.close()
      observer.complete()
    }).bufferCount(10)
    const subscription = observable.subscribe(
      value => {
        console.log('Push existing items to Firehose', value)
      },
      err => {
        console.log(err)
      },
      async () => {
        console.log('this is the end')
        subscription.unsubscribe()
      }
    )
    setTimeout(() => {
      console.log('Timed out, unsubscribe!')
      subscription.unsubscribe()
    }, 24 * 60 * 60 * 1000)
  }

  async startChangeStream(collection) {
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

    const observable = Rx.Observable.create(async observer => {
      let hasNext = await changeStream.hasNext()
      while (hasNext) {
        const event = await changeStream.next()
        observer.next(event)
        hasNext = await changeStream.hasNext()
      }
      console.log('Closing connection...')
      await changeStream.close()
      observer.complete()
    }).bufferCount(10)
    const subscription = observable.subscribe(
      value => {
        const lastId = BSON.prototype.serialize(value[value.length - 1]._id)
        fs.writeFileSync(lastIdFileName, lastId)
        console.log('Stream to Firehose', value.length)
      },
      err => {
        console.log(err)
      },
      async () => {
        console.log('End?')
      }
    )
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
