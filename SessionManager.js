// Imports
const { addSystemMessageWithSubject, addDataMessage, addDebugMessage } = require(`./MessageDisplay`),
    { encryptString, decryptString, hashStringWithHmac } = require(`./crypto`);

/**
 * SessionManager
 * Used by both server and client socket
 * 
 * 1. Handles received message.
 * 2. Sends out encrypted message.
 * 
 * @param {socket, shakeHand } 
 */
class SessionManager {
    // instance variable declarations
    socket;
    shakeHand;
    sessionKey;

    constructor({ socket, shakeHand }) {
        this.socket = socket;
        this.shakeHand = shakeHand;

        // Set up socket on data handler. this handler is only used by the server.
        this.socket.on(`data`, data => {
            messageQueue.push(this.handleData(data));
            addDebugMessage(`New messages available - click "Continue" to step through them.`);
        });
    }

    setSessionKey = (key) => {
        this.sessionKey = key;
    }

    /**
     * Encrypt and Sends message
     * @param {string} data
     */
    write = (data) => {
        if (!this.sessionKey) {
            return addSystemMessageWithSubject(`SessionKey not established.`, `SessionManager`);
        }

        // 1. Encrypt
        const aes = encryptString(data, this.sessionKey);
        const hmac = hashStringWithHmac(data, this.sessionKey)

        // 2.Send
        this.socket.write(JSON.stringify({ aes, hmac }));
        addSystemMessageWithSubject(`Ciphertext sent: ${aes}`, isServerMode ? `Server` : `Client`);
    };

    /**
     * Handles received data
     * @param {*} data 
     */
    handleData = (data) => () => {
        data = data.toString();

        // case A: If session Key exists, try decrypt data using session key.
        if (this.sessionKey) { return this.decryptCipherText(data); }
        // case B: Otherwise expect any data coming in before sessionKey is set is authPacket
        else { return this.shakeHand(data, this.setSessionKey); }
    };

    /**
     * Will decrypt given {@param cipherText}.
     * @param {*} cipherText from client
     */
    decryptCipherText = (data) => {
        const { aes, hmac } = JSON.parse(data);
        let plainText;
        addSystemMessageWithSubject(`Ciphertext received from [${this.socket.remoteAddress}:${this.socket.remotePort}]: ${aes}`, isServerMode ? `Server` : `Client`);

        try {
            // 1. decrypt
            plainText = decryptString(aes, this.sessionKey);

            if (hmac !== hashStringWithHmac(plainText, this.sessionKey)) {
                throw new Error("Data tampered")
            }

            addSystemMessageWithSubject(`Decrypted plaintext: ${plainText}`, isServerMode ? `Server` : `Client`);
            addDataMessage(plainText);
        } catch (e) {
            // TODO: discuss what to do if decrypt fail.
            // invalidate session key?
            this.sessionKey = null;
            addSystemMessageWithSubject(`Received Error decrypting. Invalidated sessionKey.: ${e.message}`, isServerMode ? `Server` : `Client`);
            // Terminate connection
            terminateConnections();
        }
    };

    destroySelf = () => {
        this.socket.destroy();
    };

    hasSocket = (socket) => {
        return this.socket === socket;
    }
}

module.exports = {
    SessionManager,
};
