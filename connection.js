// var stuff = {
//     chatId : chatId,
//     users : [
//          {
//          user : username,
//          socket : socket
//          },
//     ]
// }

exports.addOpenChatUsers = function(openChats, chatId, username) {
    openChats.forEach(chat => {
        if (chat.chatId === chatId) {
            chat.users.push({
                user : username,
                socket : null
            });
        }
    });
}

exports.addOpenChats = function(openChats, chatId) {
    if (openChats.length === 0){
        openChats.push({
            chatId : chatId,
            users : []
        });
    } else {
        openChats.forEach(chat => {
            if (!(chat.chatId === chatId)){
                openChats.push({
                    chatId : chatId,
                    users : []
                });
            }
        });
    }
}

exports.getConnectedUsers = function(openChats, chatId, callback) {
    openChats.filter(chat => chat.chatId === chatId).users
    .map(user => {
        callback(user);
    });
}
