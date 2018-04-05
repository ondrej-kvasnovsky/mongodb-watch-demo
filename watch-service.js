const fs = require('fs')

const MongoClient = require('mongodb').MongoClient;
const BSON = require('bson');
const url = 'mongodb://localhost:27017,127.0.0.1:27018/?replicaSet=rs0';
const dbName = 'test';

module.exports = class {
  async start() {
    const client = await MongoClient.connect(url)
    console.log("Connected!");
    try {
      const db = await client.db(dbName)
      const collection = await db.collection('items')

      // const items = await collection.find().toArray()
      // console.log(items)
      console.log(Object.getOwnPropertyNames(BSON.prototype))
      const recoverId = BSON.prototype.deserialize(fs.readFileSync('lastid.bin'))
      const changeStream = await collection.watch(
        [],
        {
          resumeAfter: recoverId
        }
      )
      let hasNext = await changeStream.hasNext()
      while (hasNext) {
        const next = await changeStream.next()
        let lastId = BSON.prototype.serialize(next._id);
        fs.writeFileSync('lastid.bin', lastId)
        console.log(lastId)
        console.log(next.fullDocument)
        hasNext = await changeStream.hasNext()
      }
      console.log('Closing connection...')
      await changeStream.close();
    } catch (e) {
      console.log(e)
    }
  }
}