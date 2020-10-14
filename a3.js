// imports
const ip = require(`ip`),
  net = require(`net`),
  { secretTo256 } = require(`./crypto`),
  {
    clientMenu,
    serverMenu,
    dataToBeSentInput,
    dataToBeSentButton,
    continueButton,
    clientConnectToServerButton,
    serverListenForRequestsButton,
    clientModeRadioButton,
    serverModeRadioButton,
    clientDisconnectButton,
    serverDisconnectButton,
    hostnameInput,
    clientsPortNumberInput,
    serversPortNumberInput,
    secretKeyInput
  } = require(`./HTMLElements`),
  { addSystemMessageWithSubject } = require(`./MessageDisplay`),
  { MessageQueue } = require(`./MessageQueue`),
  { SessionManager } = require(`./SessionManager`),
  { SecureClientSocket } = require(`./SecureClientSocket`),
  { SecureServerSocket } = require(`./SecureServerSocket`),
  { isValidPort } = require(`./Utilities`);

let isTcpEstablished = false;
let preventModeSwitch = false;

let server;
let isServerMode;
let sharedSecret;
const sessionManagers = [];

// default welcome messages
addSystemMessageWithSubject(`Welcome to JARM's VPN.`, `System`);
addSystemMessageWithSubject(`Configure the VPN and click the "Connect" or "Listen" button to continue.`, `System`);

/**
 * Displays and hides configuration menu depending on selected mode.
 */
const switchToMode = (mode) => {
  if (!isTcpEstablished && !preventModeSwitch) {
    if (mode === `client`) {
      clientMenu.classList.remove(`display_none`);
      serverMenu.classList.add(`display_none`);
      isServerMode = false;
    } else {
      clientMenu.classList.add(`display_none`);
      serverMenu.classList.remove(`display_none`);
      isServerMode = true;
    }
  }
};

/**
 * Displays and hides "Continue" button depending on selection
 */
const enableContinueButton = (enable) => {
  if (enable) {
    continueButton.classList.remove(`display_none`);
  } else {
    continueButton.classList.add(`display_none`);
  }
};

const disableDataToBeSent = (disable) => {
  dataToBeSentInput.disabled = disable;
  dataToBeSentButton.disabled = disable;
}

/**
 * Displays and hides UI elements depending on TCP connection state
 */
const syncUIToTCPState = () => {
  if (isTcpEstablished) {
    clientConnectToServerButton.disabled = true;
    serverListenForRequestsButton.disabled = true;
    clientModeRadioButton.disabled = true;
    serverModeRadioButton.disabled = true;
    clientDisconnectButton.classList.remove(`display_none`);
    serverDisconnectButton.classList.remove(`display_none`);
  } else {
    disableDataToBeSent(true);
    clientConnectToServerButton.disabled = false;
    serverListenForRequestsButton.disabled = false;
    clientModeRadioButton.disabled = false;
    serverModeRadioButton.disabled = false;
    clientDisconnectButton.classList.add(`display_none`);
    serverDisconnectButton.classList.add(`display_none`);
  }
};

/**
 * Request connection to designated server IP on designated TCP port #
 */
const connectToServer = () => {
  const addr = hostnameInput.value.trim();
  const port = clientsPortNumberInput.value.trim();
  sharedSecret = secretTo256(secretKeyInput.value.toString());
  if (!ip.isV4Format(addr) || !ip.isV6Format(addr) || !isValidPort(port)) {
    addSystemMessageWithSubject(`Please enter a valid address and port number.`, `Client`);
    return;
  }
  messageQueue = new MessageQueue();
  sessionManager = new SessionManager(new SecureClientSocket(addr, port));
  sessionManagers.push(sessionManager);

  preventModeSwitch = true;
  syncUIToTCPState();
  clientConnectToServerButton.innerText = `Trying to connect...`;
  clientConnectToServerButton.disabled = true;
};

/**
 * Listen for request on designated TCP port #
 */
const listenForRequests = () => {
  const port = serversPortNumberInput.value.trim();
  sharedSecret = secretTo256(secretKeyInput.value.toString());
  if (!isValidPort(port)) {
    addSystemMessageWithSubject(`Please enter a valid port number.`, `Server`);
    return;
  }
  addSystemMessageWithSubject(`Listening for requests at [${ip.address()}:${port}]`, `Server`);
  messageQueue = new MessageQueue();
  server = net.createServer((socket) => {
    addSystemMessageWithSubject(`TCP connection established with [${socket.remoteAddress}:${socket.remotePort}]`, `Server`);
    sessionManager = new SessionManager(new SecureServerSocket(socket));
    sessionManagers.push(sessionManager);
    addSystemMessageWithSubject(`Now serving ${sessionManagers.length} connection(s)`, `Server`);
  });
  
  server.listen(port, ip.address());
  
  // if port is already in use, terminate connection
  server.on(`error`, (error) => {
    if (error.code === 'EADDRINUSE') {
      addSystemMessageWithSubject(`Port ${port} is already in use.`, `Server`);
      terminateConnections();
    }
  });

  isTcpEstablished = true;
  syncUIToTCPState();
  serverListenForRequestsButton.innerText = `Listening for requests...`;
};

/**
 * Send message to the other communicating party
 */
const sendMessage = () => {
  // TODO: sanitize user input
  const message = dataToBeSentInput.value.trim();

  if (!isTcpEstablished) {
    addSystemMessageWithSubject(`Can't send message; establish a connection first.`, `System`);
    return;
  }
  if (!message || message === ``) {
    addSystemMessageWithSubject(`Cannot send empty string.`, `System`);
    return;
  }

  addSystemMessageWithSubject(`Plaintext to be sent: ${message}`, isServerMode ? `Server` : `Client`);
  sessionManagers.forEach((sessionManager) => sessionManager.write(message));

  dataToBeSentInput.value = ``;
};

/**
 * Execute next fn in queue.
 */
const handleContinueClick = () => {
  messageQueue.next();
};

/**
 * Terminate connection.
 */
const terminateConnections = () => {
  const sessionManagersCount = sessionManagers.length;
  sessionManagers.forEach((sessionManager) => sessionManager.destroySelf());
  sessionManagers.splice(0, sessionManagers.length); // remove all session managers
  messageQueue = null;
  disableDataToBeSent(true);
  continueButton.disabled = true;

  if (isServerMode) {
    server.close();
    addSystemMessageWithSubject(`Killed ${sessionManagersCount} connection(s) and closed server.`, `Server`);
    isTcpEstablished = false;
    server = null;
    syncUIToTCPState();
    serverListenForRequestsButton.innerText = `Listen for requests`;
  }

};

/**
 * Destroy and remove the session manager that contains the given socket
 */
const destroySessionManagerWithSocket = (socket) => {
  for (let i = 0; i < sessionManagers.length; ++i) {
    if (sessionManagers[i].hasSocket(socket)) {
      sessionManagers[i].destroySelf();
      sessionManagers.splice(i, 1); // remove one element at index i
      break;
    }
  }
};
