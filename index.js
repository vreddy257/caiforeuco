require('dotenv').config(); 
const express = require('express');
const { DirectLine } = require('botframework-directlinejs');
const bodyParser = require('body-parser');
const WebSocket = require('ws'); // Import WebSocket explicitly

global.XMLHttpRequest = require('xhr2');
global.WebSocket = WebSocket; // Set the global WebSocket

const PORT = process.env.PORT || 3978;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const directLine = new DirectLine({
    secret: process.env.DIRECT_LINE_SECRET // Replace with your Direct Line secret
});

// API route to handle messages from Bot Framework Emulator
app.post('/api/messages', async (req, res) => {
    directLine
        .postActivity({
            from: { id: 'myUserId', name: 'myUserName' }, // Required (from.name is optional)
            type: 'message',
            text: req.body.text
        })
        .subscribe(
            id => {
                console.log('Posted activity, assigned ID ', id);
                res.status(200).send({ id });
            },
            error => {
                console.log('Error posting activity', error);
                res.status(500).send({ error: 'Failed to post message' });
            }
        );
});

// Listen to activities sent from the bot and forward to Emulator
directLine.activity$.subscribe(activity => {
    console.log('Received activity', activity);
    // Forward activity to the Bot Emulator
    // Example: Replace this with your logic to send the activity to the Emulator
    forwardToBotEmulator(activity);
});

// Function to forward activity to the Bot Emulator
function forwardToBotEmulator(activity) {
    // Here you need to implement the actual forwarding mechanism
    // Example using WebSocket or an API call to your Bot Emulator
    // This might be a WebSocket connection or a REST API call based on your Bot Emulator setup
    console.log('Forwarding activity to Bot Emulator', activity);
    // Example: 
    // YourEmulator.sendActivity(activity);
}

// Use RxJS operators to filter message activities
directLine.activity$
  .filter(activity => activity.type === 'message')
  .subscribe(message => console.log('Received message', message));

// Monitor connection status
directLine.connectionStatus$.subscribe(connectionStatus => {
    switch (connectionStatus) {
        case 'Uninitialized':
        case 'Connecting':
        case 'Online':
        case 'ExpiredToken':
        case 'FailedToConnect':
        case 'Ended':
            console.log(`Connection Status: ${connectionStatus}`);
            break;
    }
});

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
    console.log('Bot Framework Emulator: https://aka.ms/botframework-emulator');
});
