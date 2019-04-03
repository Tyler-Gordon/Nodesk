const mongoClient = require('mongodb').MongoClient
const dataBase = 'learning-node';
var dataBaseURL = 'mongodb://tyler:node2520@ds125073.mlab.com:25073/learning-node'

var authenticateUser = (email,hashPassword,callback) =>{
    mongoClient.connect(dataBaseURL, { useNewUrlParser:true }, (err, client) => {
        const database = client.db(dataBase);
        var collection = database.collection('users')
        collection.findOne({email:email,password:hashPassword},(err,data)=>{
            let user = data ? data.username : false
            callback(user)
        })
    })
}
module.exports = {
    authenticateUser
};