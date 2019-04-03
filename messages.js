const mongoClient = require('mongodb').MongoClient
const crypto = require('crypto')
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'

// Adds a message to the chat, given the chatid passed through messageObject
var addMessage = (messageObject) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // get the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var collection = database.collection('chats')
        // push the new message into the chat based on its id
        collection.update({_id:messageObject.chatId},{$push:{messages:messageObject}}
        )
    })
}

// Grabs all messages from the given chatid
var getMessages = (chatId, callback) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // get the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var collection = database.collection('chats')
        // find the messages based on the chat id
        collection.findOne(({'_id':chatId}),(err,data)=>{
            callback(data);
        })
    })
}
module.exports = {addMessage,getMessages};