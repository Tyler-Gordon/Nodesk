const mongoClient = require('mongodb').MongoClient,
const crypto = require('crypto')
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'

var registerUser = async(username, email, password) =>{
    encryptedPassword = crypto.createHmac('sha256',password).update('password').digest('hex');

    var userinfo = {username:username,email:email,password:encryptedPassword}
    
    mongoClient.connect(dataBaseURL, (err,client) => {
        console.log('DB CONNECTED')
        const database = client.db(dataBase);
        database.collection('users').insert(userinfo);
        client.close();
    })
}
module.exports = {registerUser};