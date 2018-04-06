# MongoDB Watch (Change Stream) Demo

Connects to MongoDB collection and creates [change stream](https://docs.mongodb.com/manual/changeStreams/). 
Is able to resume using last change stream ID object.  

## Requirements

* nodejs
* npm
* mongodb 3.6 and higher

## MongoDB ReplicaSet

MongoDB needs to be started in replica set. 
Use `mongo-replicaset/setup.sh` to create mongodb using replica set.

After you ran `sh setup.sh`, you need to run: 
```
rs.initiate({_id:"rs0", members: [{_id:0, host:"127.0.0.1:27017", priority:100}, {_id:1, host:"127.0.0.1:27018", priority:50}, {_id:2, host:"127.0.0.1:27019", arbiterOnly:true}]})
```

Connect to database and create `test` database and `items` collection in it.

## How to run the demo

Start the app.js using npm script. 
Then insert some items into `test.items` collection.

```
$ npm install
$ npm start
```
