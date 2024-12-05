const path = require('path');
const dotenv = require('dotenv');
const restify = require('restify');
const { startConversation, sendMessageToPVA, pollBotResponse, conversationId, conversationStarted } = require('./bot');  // Correct import

dotenv.config({ path: path.join(__dirname, '.env') });

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

const { CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration } = require('botbuilder');

// Set up credentials
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: "fcbdde13-5607-44da-9073-e53f1422e6a4",
    MicrosoftAppPassword: "JKS8Q~miQzHVIOGHfofv9MZNBUpiuM1WPT7vWcjf",
    MicrosoftAppType: "SingleTenant",
    MicrosoftAppTenantId: "418b0a35-b696-41f8-a2bd-fa0029eb2113"
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
        // Start a conversation only if the message is from the Bot Framework Emulator
        if (context.activity.channelId === 'emulator') {
            // Start conversation if it's not already started
            if (!conversationStarted) {
                console.log('Starting new conversation...');
                await startConversation();  // Start conversation and set conversationId
            }


            // Send the user's message to Power Virtual Agents
            await sendMessageToPVA(userMessage);

            // Poll for the bot's response
            const botReply = await pollBotResponse();

            // Send the bot's response back to the user
            await context.sendActivity(botReply);
        } else {
            await context.sendActivity('Messages are only processed from the Bot Framework Emulator.');
        }
    } catch (error) {
        console.error('Error in bot communication:', error);
        await context.sendActivity('Sorry, there was an issue communicating with the bot.');
    }
};

// Bot class to handle messages
class MyBot {
    async onMessage(context) {
        await handleUserMessage(context);
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
