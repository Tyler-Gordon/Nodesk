const mongoClient = require('mongodb').MongoClient
const crypto = require('crypto')
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'
 
// Models, and inserts a new chat into the database
var createChat = (users,callback) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // access the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var chatsCollection = database.collection('chats')
        var chatId = crypto.randomBytes(10).toString('hex');
        // create a model for the chat, this will allow easy, predictable database entries
        var chatModel = {'_id':chatId,messages : [],users : users}

        dbUsernames = userCollection.distinct('username')
        users.forEach(user => {
            if(!dbUsernames.includes(user)){

                var e = Error(`User ${user} does not exist`)
                e.name = 'UserError'
                throw e
            }
        });
        chatsCollection.insertOne(chatModel)
        callback()
    })
}

var getChatUsers = (chatid, callback)=>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // access the database
        const database = client.db(dataBase);
        // get the 'chats' table
        var chatCollection = database.collection('chats')
        // create a model for the chat, this will allow easy, predictable database entries
        chatCollection.findOne(({"_id":chatid}),(err,data)=>{
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

const getChats = (username, cb) => {
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        // Local variables
        var data = [];
        var chatIds;
        const database = client.db(dataBase);
        
        // Loading the collections
        var chatCollection = database.collection('chats')
        var userCollection = database.collection('users')

        // Grabbing all the chats the user is a part of
        userCollection.findOne(({ "username" : username}), (err, user)=>{    
            chatIds = user.chatids;

            for (let i = 0; i < chatIds.length; i++) {
                chatCollection.findOne(({"_id":chatIds[i]}), (err, chat)=>{
                    data.push({ chatId : chatIds[i], users : chat.users});
                    console.log(data);

                    if (i === chatIds.length - 1) {
                        // Required to wait for the odd async stuff
                        cb(data);
                    }
                });
            }

        });
    });
}

module.exports = {createChat,getChatIDs,getChatUsers, getChats};   