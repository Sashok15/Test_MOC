require('dotenv').config()
const apiAiClient = require('apiai')(process.env.API_AI_TOKEN);
const chrono = require('chrono-node')
const schedule = require('node-schedule')
const eventEmitter = require('events').EventEmitter
const request = require('request')
const MongoClient = require('mongodb').MongoClient;

const db = require('../helpers/db')
const url = "mongodb://localhost:27017/mydb";
var dbo

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    dbo = db.db("mydb");
});

const sendTextMessage = (senderId, text) => {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: process.env.ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: senderId },
            message: { text },
        }
    });

};

const handlePostback = (event) => {
    let payload = event.postback.payload;
    console.log(payload)
    let response;
    if (payload === 'create') {
        // console.log(event.messaging.message.text)
        response = "What would you like your reminder to be? etc 'I have an appointment today from 4 to 8 AM' the information will be added automatically"
        datetime = chrono.parseDate(response)
        console.log(datetime)
        // var myobj = { senderId: event.sender.id, datetime };
        // dbo.collection("users").insertOne(myobj, function (err, res) {
        // if (err) throw err;
        // console.log("1 document inserted");
        // });
        sendTextMessage(event.sender.id, 'reminder success write')
        dbo.collection("users").find({}, {senderId: event.sender.id}).toArray(function (error, result) {
            if (error) throw error;
            console.log(result);
        });
        let promise = new Promise(function (resolve, reject) {
            resolve(sendPersistentMenu(event), (eventEmitter) => {
                if (!error) {
                    eventEmitter.emit('new', response.object.slug, datetime)
                    sendTextMessage("reminder added correctly :)")
                } else {
                    sendTextMessage(event.sender.id, "Added not ad")
                }
            });
            reject(Error, 'error in my function promise')

        })
        promise.then(() => {
            eventEmitter.on('new', function (itemSlug, time) {
                schedule.scheduleJob(time, function () {
                    // instead Cosmic get data from db and make schedule work
                    Cosmic.getObject(config, { slug: itemSlug }, function (error, response) {
                        if (response.object.metadata.date == new Date(time).toISOString()) {
                            sendAcceptSnoozebuttons(event)
                            console.log('firing reminder')
                        } else {
                            eventEmitter.emit('new', response.object.slug, response.object.metafield.date.value)
                            console.log('times do not match checking again at ' + response.object.metadata.date)
                        }
                    })
                })
            })
        }, (error) => {
            console.log("Rejected: " + error); // error - аргумент reject
        }
        );

    } else if (payload === 'show') {
        response = "show all reminders"
        sendTextMessage(event.sender.id, 'show all reminders')
    }
};

const sendPersistentMenu = (event) => {
    const senderId = event.sender.id;
    // const text = event.message.text;
    let persistentMenu = {
        "persistent_menu": [
            {
                "locale": "default",
                "composer_input_disabled": true,
                "call_to_actions": [
                    {
                        "title": "My Account",
                        "type": "nested",
                        "call_to_actions": [
                            {
                                "title": "Pay Bill",
                                "type": "postback",
                                "payload": "PAYBILL_PAYLOAD"
                            },
                            {
                                "title": "History",
                                "type": "postback",
                                "payload": "HISTORY_PAYLOAD"
                            },
                            {
                                "title": "Contact Info",
                                "type": "postback",
                                "payload": "CONTACT_INFO_PAYLOAD"
                            }
                        ]
                    },
                    {
                        "type": "web_url",
                        "title": "Latest News",
                        "url": "http://www.messenger.com/",
                        "webview_height_ratio": "full"
                    }
                ]
            },
            {
                "locale": "zh_CN",
                "composer_input_disabled": false,
                "call_to_actions": [
                    {
                        "title": "Pay Bill",
                        "type": "postback",
                        "payload": "PAYBILL_PAYLOAD"
                    }
                ]
            }
        ]
    }

    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "Persistance Menu ",
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
            persistent_menu: persistentMenu
        }
    });
}

const processAiMessage = (event) => {
    const senderId = event.sender.id;
    const message = event.message.text;
    const apiaiSession = apiAiClient.textRequest(message, { sessionId: 'i_want_to_work_in_MOC' }); // uuid
    //my shit form apiai github
    /* let request = apiAiClient.getContextsRequest('crowbotics_bot')
    request.on(
        'response', function (response) {
            console.log('getContext', response)
        });

    let requestSingle = app.getContextsRequest('crowbotics_bot', 'contextName');

    requestSingle.on('response', function (response) {
        console.log(response);
    });

    requestSingle.on('error', function (error) {
        console.log(error);
    }); */


    //
    apiaiSession.on('response', (response) => {
        const result = response.result.fulfillment.speech;
        sendTextMessage(senderId, result);
    });
    apiaiSession.on('error', error => console.log(error));
    apiaiSession.end();
};

const sendAcceptSnoozebuttons = (event) => {
    const senderId = event.sender.id;
    // const text = event.message.text;
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "You can select the action for your reminder:",
                "buttons": [
                    {
                        "type": "postback",
                        "title": "Accept",
                        "payload": "accept",
                        "type": "postback",
                        "title": "Snooze",
                        "payload": "snooze"
                    },
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
}

module.exports.sendPersistentMenu = sendPersistentMenu;
module.exports.sendTextMessage = sendTextMessage;
module.exports.processMessage = processAiMessage;
module.exports.sendAcceptSnoozebuttons = sendAcceptSnoozebuttons;
module.exports.handlePostback = handlePostback;


