const mongoClient = require('mongodb').MongoClient
const crypto = require('crypto')
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'

var addMessage = (messageObject) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        const database = client.db(dataBase);
        var collection = database.collection('chats')
        collection.update(
            {_id:messageObject.chatId},
            {$push:
                {messages:messageObject}
            }
        )
    })
}

var getMessages = (chatId, callback) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        const database = client.db(dataBase);
        var collection = database.collection('chats')
        collection.findOne(({'_id':chatId}),(err,data)=>{
            return('all messages')
        })
    })
    callback(listOfChatObjects);
}
module.exports = {addMessage,getMessages};