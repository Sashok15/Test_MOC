const { sendPersistentMenu, handlePostback, sendTextMessage, processMessage } = require('../helpers/processMessage');

module.exports = (req, res) => {
    if (req.body.object === 'page') {
        req.body.entry.forEach(entry => {
            entry.messaging.forEach(event => {
                if (event.message && event.message.text) {
                    sendPersistentMenu(event);
                }
                if (event.postback) {
                    let text = JSON.stringify(event.postback);
                    handlePostback(event);
                }
            });
        });
        res.status(200).end();
    }
};



