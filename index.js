const path = require('path');
const dotenv = require('dotenv');
const restify = require('restify');
const { startConversation, sendMessageToPVA, pollBotResponse, handleCardSubmission, conversationId, conversationStarted } = require('./bot');  // Correct import

dotenv.config({ path: path.join(__dirname, '.env') });

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

const { CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration } = require('botbuilder');

// Set up credentials
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.MicrosoftAppId || "",
    MicrosoftAppPassword: process.env.MicrosoftAppPassword || "",
    MicrosoftAppType: process.env.MicrosoftAppType || "",
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId || ""
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handler
const onTurnErrorHandler = async (context, error) => {
    console.error(`\n [onTurnError] unhandled error: ${error}`);
    await context.sendActivity('The bot encountered an error or bug.');
};

adapter.onTurnError = onTurnErrorHandler;

// Handle User Message and start conversation only once
const handleUserMessage = async (context) => {
    const userMessage = context.activity.text;
    console.log('Bot received the message, waiting for response...');

    try {
        if (context.activity.channelId === 'emulator') {
            if (!conversationStarted) {
                console.log('Starting new conversation...');
                await startConversation();  // Start conversation and set conversationId
            }

            if (!userMessage || userMessage.trim() === '') {
                await context.sendActivity('Please provide a valid message.');
                return;
            }

            const messageSentToPVA = await sendMessageToPVA(userMessage);
            console.log(`Message sent to PVA: ${messageSentToPVA}`);

            const botReply = await pollBotResponse();
            console.log('Bot reply received:', botReply);

            if (botReply && botReply.attachments && botReply.attachments.length > 0) {
                console.log('Sending Adaptive Card to user...');
                await context.sendActivity({
                    type: 'message',
                    attachments: botReply.attachments
                });
            } else {
                await context.sendActivity(botReply || 'Sorry, I could not understand your request.');
            }
        } else {
            await context.sendActivity('Messages are only processed from the Bot Framework Emulator.');
        }
    } catch (error) {
        console.error('Error in bot communication:', error);
        await context.sendActivity('Sorry, there was an issue communicating with the bot.');
    }
};


// Handle submission of card information (e.g., from Adaptive Cards)
const handleCardSubmissionMessage = async (context) => {
    const userMessage = context.activity.value;
    console.log('Card submission received:', userMessage);

    try {
        if (userMessage) {
            // Process the submitted data (e.g., UserVal, PassVal, etc.)
            console.log('Processing dynamic card submission:', userMessage);

            // Send the submitted data to PVA
            const messageSentToPVA = await sendMessageToPVA(userMessage);
            console.log(`Message sent to PVA: ${messageSentToPVA}`);

            // Wait for the bot's response after sending the card data to PVA
            const botReply = await pollBotResponse();  // Poll for the response from PVA
            console.log('Bot reply received:', botReply);

            if (botReply && botReply.attachments && botReply.attachments.length > 0) {
                // If the bot response contains an attachment (Adaptive Card), send it back to the user
                console.log('Sending Adaptive Card to user...');
                await context.sendActivity({
                    type: 'message',
                    attachments: botReply.attachments
                });
            } else {
                // Otherwise, send the text response back to the user
                await context.sendActivity(botReply || 'Sorry, I could not understand your request.');
            }
        } else {
            await context.sendActivity('Invalid data received from the card submission.');
        }
    } catch (error) {
        console.error('Error handling card submission:', error);
        await context.sendActivity('There was an error processing your submission.');
    }
};



// Bot class to handle messages
class MyBot {
    async onMessage(context) {
        if (context.activity.value) {
            // Handle card submission (if any)
            await handleCardSubmissionMessage(context);
        } else {
            // Handle regular user message
            await handleUserMessage(context);
        }
    }
}

const myBot = new MyBot();

// API route to handle messages from Bot Framework Emulator
server.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, (context) => myBot.onMessage(context));
});

// Start the server
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`Server listening at ${server.url}`);
    console.log('Bot Framework Emulator: https://aka.ms/botframework-emulator');
});
