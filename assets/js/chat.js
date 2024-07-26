/**
 * The default settings for the Twitch embed script.
 * 
 * @type {Object}
 */
let settings = {
    twitch: {
        channel: 'vedal987',        // The channel chat to embed
        broadcast: false,           // Whether to broadcast twitch messages over websocket
        limit: 100                 // The maximum number of messages to show in chat
    }
};

let setupContainer = document.getElementById('setup');

/**
 * The chat container
 */
let chatContainer = document.getElementById('chat');

/**
 * The TMI client
 */
let client;

/**
 * The websocket connection
 */
let socket;

function onFormSubmit(event) {

    // Prevent the form from submitting
    event.preventDefault();

    // Get the form data
    const data = new FormData(event.target);

    // Get the channel and broadcast settings
    const channel = data.get('channel');
    const broadcast = data.get('broadcast') === 'on';

    // Remove .hidden class from chat
    chatContainer.classList.remove('hidden');

    // Hide the setup container
    setupContainer.classList.add('hidden');

    // Start the chat
    start(channel, broadcast);
}

/**
 * This starts the Twitch embed script.
 * 
 * @param {string} channel   The channel to embed
 * @param {boolean} broadcast Whether to broadcast twitch messages over websocket
 */
function start(channel, broadcast) {

    // Custom settings
    settings.twitch.channel = channel;
    settings.twitch.broadcast = broadcast;

    // Initialzie the TMI client
    initTMIClient();

    // Initialize the websocket connection
    initWebSocket();

}

/**
 * Initialize the websocket connection
 * with Smash Soda.
 */
function initWebSocket() {

    socket = new WebSocket("ws://localhost:9002");
    socket.onmessage = function (event) {
        var data = JSON.parse(event.data);
        handleSodaEvent(data.event, data.data);
    };

}

/**
 * Initialize the TMI client
 */
function initTMIClient() {
    // Load the TMI client
    client = new tmi.client({
        options: {
            debug: true,
            skipUpdatingEmotesets: true
        },
        connection: {
            reconnect: true
        },
        channels: [`#${settings.twitch.channel}`]
    });

    // Connect the client
    client.connect();

    // Events
    client.addListener("message", handleTwitchMessage);
}

/**
 * Handle a message from the websocket
 * 
 * @param {string} event The event type
 * @param {Object} data  The data
 */
function handleSodaEvent(event, data) {
    
    // If event is a chat message
    if (event != 'chat:message') return;

    addMessage('soda-arcade.com', {
        'username': data.user.name,
        'color': 'inherit'
    }, data.message, 'parsec');

}

/**
 * Handle a message from the Twitch chat
 * 
 * @param {string} channel The channel the message was sent to
 * @param {string} user    The user who sent the message
 * @param {string} message The message
 * @param {boolean} self   Whether the message was sent by the bot
 */
function handleTwitchMessage(channel, user, message, self) {

    // If the message was sent by the bot, ignore it
    if (self) return;

    // Remove first character from channel
    channel = channel.substring(1);

    // Add the message to the chat
    addMessage(`twitch.tv/${channel}`, user, message); 

    // Broadcast the message over the websocket (if open)
    if (settings.twitch.broadcast && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            event: 'chat:external',
            data: {
                user: user,
                message: message
            }
        }));
    }

}

/**
 * Add a message to the chat
 * 
 * @param {string} source  The source of the message
 * @param {string} user    The user who sent the message
 * @param {string} message The message
 * @param {string} source  The source of the message
 */
function addMessage(channel, user, message, source='twitch') {

    let name = user.username,
        messageContainer = document.createElement('div'),
        messageChannel = document.createElement('span'),
        messageUser = document.createElement('span'),
        messageBody = document.createElement('span');

    // Get the user's color
    let color = user.color || 'inherit';

    // Set the class names
    messageContainer.className = 'message-container';
    messageChannel.className = `message-channel ${source}`;
    messageUser.className = 'message-user';
    messageBody.className = 'message-body';

    // Set the text content
    messageUser.style.color = color;
    messageChannel.innerHTML = `[${channel}]`;
    messageUser.innerHTML = removeUnsafeHTML(user['display-name'] || name);

    const body = formatEmotes(message, user.emotes);
    messageBody.innerHTML = removeUnsafeHTML(body);

    // Append elements to chat container
    messageContainer.appendChild(messageUser);
    messageContainer.appendChild(messageChannel);
    messageContainer.appendChild(messageBody);

    chatContainer.appendChild(messageContainer);

    // Smooth scroll to the bottom
    setTimeout(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);

    // Remove old messages
    if (chatContainer.children.length > settings.twitch.limit) {
        chatContainer.removeChild(chatContainer.children[0]);
    }

}

/* --------------------------------- 
HELPER FUNCTIONS
--------------------------------- */

/**
 * Get the value of a URL parameter
 * 
 * @param {string} name     The name of the URL parameter 
 * @returns                The value of the URL parameter
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Format emotes in a message
 * 
 * @param {string} text   The message text
 * @param {Object} emotes The emotes object
 */
function formatEmotes(text, emotes) {
    let splitText = text.split('');
    for (let i in emotes) {
        let e = emotes[i];
        for (let j in e) {
            let mote = e[j];
            if (typeof mote === 'string') {
                mote = mote.split('-');
                mote = [parseInt(mote[0]), parseInt(mote[1])];
                let length = mote[1] - mote[0],
                    empty = Array.apply(null, new Array(length + 1)).map(function () {
                        return ''
                    });
                splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
                splitText.splice(mote[0], 1, '<img class="emoticon" src="https://static-cdn.jtvnw.net/emoticons/v2/' + i + '/default/dark/1.0">');
            }
        }
    }
    return htmlEntities(splitText).join('');
}

/**
 * Handle html entities in a string
 * 
 * @param {string} html The string to handle
 */
function htmlEntities(html) {
    function it() {
        return html.map(function (n, i, arr) {
            if (n.length === 1) {
                return n.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
                    return '&#' + i.charCodeAt(0) + ';';
                });
            }
            return n;
        });
    }

    let isArray = Array.isArray(html);
    if (!isArray) {
        html = html.split('');
    }
    html = it(html);
    if (!isArray) html = html.join('');
    return html;
}

/**
 * Remove unsafe HTML from a string
 * 
 * @param {string} str The string to sanitize
 */
function removeUnsafeHTML(str) {
    // Remove <script> tags
    str = str.replace(/<script.*?>.*?<\/script>/gi, '');
    // Remove <style> tags
    str = str.replace(/<style.*?>.*?<\/style>/gi, '');

    return str;
}