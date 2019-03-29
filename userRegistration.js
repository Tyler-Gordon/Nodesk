const mongoClient = require('mongodb').MongoClient
const crypto = require('crypto')
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'

var registerUser = (username, email, password) =>{
    encryptedPassword = crypto.createHmac('sha256', password).update('password').digest('hex');

    var userinfo = {
        username : username, 
        email    : email, 
        password : encryptedPassword
    }

    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        const database = client.db(dataBase);
        var collection = database.collection('users')
        collection.find({ username:username, email:email }).toArray((err, docs)=>{
            if(docs.length === 0){
                collection.insertOne(userinfo);
                console.log('USER PUBLISHED')
                client.close();
                return 301
            }
            else{ 
                console.log('USER EXISTS')
                client.close();
                return 400
            }
        })
    })
}
module.exports = {registerUser};