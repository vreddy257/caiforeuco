require('dotenv').config(); // Load environment variables from .env
const { DirectLine } = require('botframework-directlinejs');
const { Observable } = require('rxjs');

// Initialize DirectLine with the secret from the .env file
const directLine = new DirectLine({
    secret: process.env.DIRECT_LINE_SECRET // Use the secret from .env
});

// Function to send a message to the bot
function sendMessageToBot(message) {
    directLine.postActivity({
        from: { id: 'myUserId', name: 'myUserName' },
        type: 'message',
        text: message
    })
    .subscribe(
        id => console.log('Posted activity, assigned ID ', id),
        error => console.error('Error posting activity', error)
    );
}

// Listen to activities sent from the bot
directLine.activity$.subscribe(activity => console.log('Received activity ', activity));

// Use RxJS operators to filter message activities
directLine.activity$
  .filter(activity => activity.type === 'message')
  .subscribe(message => console.log('Received message ', message));

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

// Example usage: Send a test message to the bot
sendMessageToBot('Hello, this is a test message!');
