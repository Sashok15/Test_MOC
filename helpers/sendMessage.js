module.exports =  sendTextMessage  => {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": text,
                "buttons": [
                    {
                        "type": "postback",
                        "title": "Create reminder",
                        "payload": "create"
                    },
                    {
                        "type": "postback",
                        "title": "Show all reminders",
                        "payload": "show"
                    }
                ]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: process.env.ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: senderId },
            message: messageData,
        }
    });

};