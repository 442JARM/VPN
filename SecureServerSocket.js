// Imports
const { encryptObj, decryptObj, hashObjWithHmac } = require(`./crypto`),
  { addSystemMessageWithSubject, addDebugMessage } = require(`./MessageDisplay`);

/**
 * Secure Server Socket
 * @param {*} socket
 */
class SecureServerSocket {
  // Instance variable declarations
  socket;

  constructor(socket) {
    this.socket = socket;
    this.setSocketListeners();
  }

  setSocketListeners = () => {
    // Client ended the connection
    this.socket.on(`end`, () => {
      destroySessionManagerWithSocket(this.socket);
      addSystemMessageWithSubject(`A client ended their connection.`, `Server`);
      addSystemMessageWithSubject(`Now serving ${sessionManagers.length} connection(s)`, `Server`);
      if (sessionManagers.length === 0) {
        disableDataToBeSent(true);
      }
    });

    this.socket.on(`error`, (error) => {
      destroySessionManagerWithSocket(this.socket);
      addSystemMessageWithSubject(`Connection forced to close due to an error - ${sessionManagers.length} connection(s) remaining`, `Server`);
      if (sessionManagers.length === 0) {
        disableDataToBeSent(true);
      }
    });
  }

  /**
   * Secure handshake will occur here
   * @param {string} clientHelloString JSON object that has fields `cipherText` and `hmac`
   */
  shakeHand = (clientHelloString, setSessionKey) => {
    const clientHelloObject = JSON.parse(clientHelloString),
      aes = clientHelloObject.aes,
      hmac = clientHelloObject.hmac;
    addDebugMessage(`Handshake :: received client's hello packet: ${JSON.stringify(clientHelloObject, null, 2)}`);
    let sessionKey;
    let decrypted;

    /**
     * 1. Decrypt auth packet using shared secret.
     */
    const decryptClientHelloMsg = () => {
      try {
        decrypted = decryptObj(aes, sharedSecret)
        addDebugMessage(`Handshake :: decrypted client's hello packet: ${JSON.stringify(decrypted, null, 2)}`);
        return validateMsg;
      } catch (error) {
        addSystemMessageWithSubject(`Handshake :: unable to decrypt client's hello packet - check that your shared secrets are correct.`, `Server`);
        addSystemMessageWithSubject(`Handshake :: Terminating connection.`, `Server`);
        destroySessionManagerWithSocket(this.socket);
        addSystemMessageWithSubject(`Now serving ${sessionManagers.length} connection(s)`, `Server`);
        return; // if decryption fails, don't send next message
      }
    };

    /**
     * 2. Validate HMAC
     */
    const validateMsg = () => {
      if (hmac === hashObjWithHmac(decrypted, sharedSecret)) {
        addDebugMessage(`Handshake :: verified that received HMAC equals expected HMAC: ${hmac}`);
        return encryptServerHelloMsg;
      } else {
        addSystemMessageWithSubject(`Handshake :: received HMAC does not equal expected HMAC.`, `Server`);
        addSystemMessageWithSubject(`Handshake :: Terminating connection.`, `Server`);
        destroySessionManagerWithSocket(this.socket);
        addSystemMessageWithSubject(`Now serving ${sessionManagers.length} connection(s)`, `Server`);
        return; // if validation fails, don't send next message
      }
    };

    /**
     * 3. Create serverHello packet by encrypting timestamp + 1
     */
    const encryptServerHelloMsg = () => {
      let { timestamp } = decrypted;
      timestamp++;
      const serverHello = {
        aes: encryptObj({ timestamp }, sharedSecret),
        hmac: hashObjWithHmac({ timestamp }, sharedSecret)
      };
      addDebugMessage(`Handshake :: created server's hello packet: ${JSON.stringify(serverHello, null, 2)}`);
      return sendServerHelloMsg(JSON.stringify(serverHello));
    };

    /**
     * 4. Will send ServerHello of given {@param serverHello}
     * @param {string} serverHello 
     */
    const sendServerHelloMsg = (serverHello) => () => {
      this.socket.write(serverHello);
      setSessionKey(decrypted.sessionKey);
      addDebugMessage(`Handshake :: sent server's hello packet`);
      addSystemMessageWithSubject(`Handshake complete - this connection is now secure.`, `Server`);

      // Enable data to be sent after secure connection is established.
      disableDataToBeSent(false);
    };

    return decryptClientHelloMsg;
  };

}

module.exports = {
  SecureServerSocket
};
