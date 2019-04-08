const mongoClient = require('mongodb').MongoClient
const crypto = require('crypto')
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'
 
// Models, and inserts a new chat into the database
var createChat = (users) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // access the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var chatsCollection = database.collection('chats')
        var chatId = crypto.randomBytes(10).toString('hex');
        // create a model for the chat, this will allow easy, predictable database entries
        var chatModel = {'_id':chatId,messages : [],users : users}
        chatsCollection.insertOne(chatModel)
    })
}

var getChatUsers = (chatid, callback)=>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // access the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var userCollection = database.collection('chats')
        // create a model for the chat, this will allow easy, predictable database entries
        userCollection.findOne(({"_id":chatid}),(err,data)=>{
            callback(data.users);
        })
    })
}

var getChatIDs = (username,callback) => {
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // access the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var userCollection = database.collection('users')
        // create a model for the chat, this will allow easy, predictable database entries
        userCollection.findOne(({"username":username}),(err,data)=>{    
            callback(data.chatids);
        })
    })
}
module.exports = {createChat,getChatIDs,getChatUsers};   