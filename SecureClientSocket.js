// Imports
const { addSystemMessageWithSubject, addDebugMessage } = require(`./MessageDisplay`),
  { clientConnectToServerButton } = require(`./HTMLElements`),
  { getRandomBytes, encryptObj, decryptObj, hashObjWithHmac } = require(`./crypto`),
  { isDebug } = require("./Utilities");

/**
 * Secure Client Socket
 * @param {*} socket
 */
class SecureClientSocket {
  // Instance variable declarations
  addr;
  port;
  socket;
  myTimestamp;
  sessionKey;

  constructor(addr, port) {
    this.addr = addr;
    this.port = port;
    this.socket = new net.Socket();
    this.createSocketConnection();
    this.setSocketListeners();
  }

  createSocketConnection = () => {
    this.socket.connect(this.port, this.addr, () => {
      addSystemMessageWithSubject(`TCP connection established with [${this.addr}:${this.port}]`, `Client`);
      isTcpEstablished = true;
      preventModeSwitch = false;
      syncUIToTCPState();
      clientConnectToServerButton.innerText = `TCP connection established`;
      messageQueue.push(this.initHandShake());
      if (isDebug()) {
        addDebugMessage(`New messages available - click "Continue" to step through them.`);
      }
    });
  }

  setSocketListeners = () => {
    this.socket.on(`error`, error => {
      addSystemMessageWithSubject(`Error: ${error.message}`, `Client`);
      this.teardown();
    });

    this.socket.on(`close`, () => {
      addSystemMessageWithSubject(`Connection with [${this.addr}:${this.port}] terminated.`, `Client`);
      this.teardown();
    });
  }

  /**
   * Initiate handshake
   */
  initHandShake = () => {
    /**
     * 1. Generate sessionKey
     */
    const generateSessionKey = () => {
      this.sessionKey = getRandomBytes(32).toString();
      // TODO: should we log session key?
      addDebugMessage(`Handshake :: generated random session key: ${this.sessionKey}`);
      return encryptClientHelloMsg(this.sessionKey);
    }

    /**
     * 2. Generate clientHello packet by encrypting sessionKey along with timestamp
     * @param {*} sessionKey 
     */
    const encryptClientHelloMsg = (sessionKey) => () => {
      this.myTimestamp = Date.now();
      const obj = {
        timestamp: this.myTimestamp,
        sessionKey
      },
        clientHello = {
          aes: encryptObj(obj, sharedSecret),
          hmac: hashObjWithHmac(obj, sharedSecret)
        };
      addDebugMessage(`Handshake :: created client's hello packet: ${JSON.stringify(clientHello, null, 2)}`);
      return sendClientHelloMsg(JSON.stringify(clientHello));
    }

    /**
     * 3. Send ClientHello message
     * @param {} clientHello 
     */
    const sendClientHelloMsg = (encryptedString) => () => {
      this.socket.write(encryptedString);
      addDebugMessage(`Handshake :: sent client's hello packet`);
    }

    return generateSessionKey;
  }

  /**
   * Shake hand when server responds
   * @param {string} serverHelloString
   */
  shakeHand = (serverHelloString, setSessionKey) => {
    const serverHelloObject = JSON.parse(serverHelloString),
      aes = serverHelloObject.aes,
      hmac = serverHelloObject.hmac;
    addDebugMessage(`Handshake :: received server's hello packet: ${JSON.stringify(serverHelloObject, null, 2)}`);

    /**
     * 1. Decrypt auth packet using shared secret.
     */
    const decryptServerHelloMsg = () => {
      const decrypted = decryptObj(aes, sharedSecret);
      addDebugMessage(`Handshake :: decrypted server's hello packet: ${JSON.stringify(decrypted, null, 2)}`);
      return validateDecryptedMsg(decrypted);
    };

    /**
     * 2. Validate decrypted data and Set sessionKey
     */
    const validateDecryptedMsg = ({ timestamp }) => () => {
      if ((timestamp - this.myTimestamp) !== 1) {
        addDebugMessage(`Handshake :: received invalid timestamp - terminating connection.`);
        terminateConnections();
        return;
      }
      addDebugMessage(`Handshake :: verified that received timestamp has been incremented by one: ${timestamp}`);

      if (hmac !== hashObjWithHmac({ timestamp }, sharedSecret)) {
        addDebugMessage(`Handshake :: received HMAC does not equal expected HMAC - terminating connection`);
        terminateConnections();
        return;
      }
      addDebugMessage(`Handshake :: verified that received HMAC equals expected HMAC: ${hmac}`);

      setSessionKey(this.sessionKey);
      addSystemMessageWithSubject(`Handshake complete - this connection is now secure.`, `Client`);

      // Enable data to be sent after secure connection is established.
      disableDataToBeSent(false);
      sharedSecret = null;
    }

    return decryptServerHelloMsg;
  };

  teardown = () => {
    isTcpEstablished = false;
    preventModeSwitch = false;
    syncUIToTCPState();
    clientConnectToServerButton.innerText = `Connect to server`;
    addSystemMessageWithSubject(`The socket is now closed.`, `Client`);
  }

}

module.exports = {
  SecureClientSocket
};
