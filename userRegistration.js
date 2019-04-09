const mongoClient = require('mongodb').MongoClient
const crypto = require('crypto')
const hashPassword = require('./hashString').createHash;
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'

var registerUser = (username, email, password) =>{
    let encryptedPassword = hashPassword(password)

    var userinfo = {
        username : username, 
        email    : email, 
        password : encryptedPassword,
        chatids : []
    }

    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        const database = client.db(dataBase);
        var collection = database.collection('users')
        collection.find({ username:username, email:email }).toArray((err, docs)=>{
            if(docs.length === 0){
                collection.insertOne(userinfo);
                client.close();
                return;
            }
            else{ 
                client.close();
                throw new Error('User exists');
            }
        })
    })
}
module.exports = {
    registerUser
};