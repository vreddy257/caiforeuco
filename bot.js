const axios = require('axios');
require('dotenv').config();

const DIRECT_LINE_SECRET = process.env.DIRECT_LINE_SECRET;
let conversationId = null;
let token = null;
let conversationStarted = false;

// Function to start a conversation with Power Virtual Agents
async function startConversation() {
    const conversationEndpoint = 'https://directline.botframework.com/v3/directline/conversations';

    try {
        const response = await axios.post(conversationEndpoint, {}, {
            headers: {
                'Authorization': `Bearer ${DIRECT_LINE_SECRET}`,
                'Content-Type': 'application/json',
            },
        });

        const { conversationId: newConversationId, token: newToken } = response.data;
        console.log('Conversation started!');
        console.log(`Conversation ID: ${newConversationId}`);
        console.log(`Token: ${newToken}`);
        
        conversationId = newConversationId;  // Set the conversationId globally
        token = newToken;  // Store the token globally
        conversationStarted = true;  // Mark the conversation as started
        
        return { conversationId, token };  // Return conversation details
    } catch (error) {
        console.error('Error starting conversation with PVA:', error.response ? error.response.data : error.message);
        throw new Error('Failed to start conversation');
    }
}

// Function to send a message to Power Virtual Agents
async function sendMessageToPVA(message) {
    if (!conversationId) {
        throw new Error('Conversation ID is not available');
    }

    const activity = {
        type: 'message',
        from: { id: 'user' },
        text: message,
    };

    const directLineEndpoint = `https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`;

    try {
        await axios.post(directLineEndpoint, activity, {
            headers: {
                'Authorization': `Bearer ${DIRECT_LINE_SECRET}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('Message sent to PVA:', message);
    } catch (error) {
        console.error('Error sending message to PVA:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send message');
    }
}

// Function to poll for the bot's response from PVA
async function pollBotResponse() {
    if (!conversationId) {
        throw new Error('Conversation ID is not available for polling');
    }

    const checkInterval = 1000;
    let retryCount = 0;
    const maxRetries = 10;

    while (retryCount < maxRetries) {
        try {
            const response = await axios.get(
                `https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`,
                {
                    headers: {
                        'Authorization': `Bearer ${DIRECT_LINE_SECRET}`,
                    },
                }
            );

            const activities = response.data.activities;
            const botActivity = activities.find(activity => activity.from.id !== 'user');
            
            if (botActivity) {
                console.log('Bot reply received:', botActivity.text);
                return botActivity.text;
            }
        } catch (error) {
            console.error('Error fetching bot reply:', error.response ? error.response.data : error.message);
        }

        retryCount++;
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Bot did not reply in time');
}

module.exports = {
    startConversation,
    sendMessageToPVA,
    pollBotResponse,
    conversationId,
    conversationStarted
};
