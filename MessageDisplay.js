// Imports
const { systemMessageList, dataMessageList } = require(`./HTMLElements`),
    { isDebug } = require(`./Utilities`);

/**
 * Add new system message
 */
const addSystemMessageWithSubject = (message, subject) => {
    const newLIElement =
        createNewLIElement(`${new Date().toString().substring(0, 24)} -  [${subject}] ${message}`);
    systemMessageList.insertBefore(newLIElement, systemMessageList.firstChild);
}

/**
 * Add new data message received from the other communicating party
 */
const addDataMessage = (message) => {
    // TODO: sanitize message
    const newLIElement = createNewLIElement(message);
    dataMessageList.insertBefore(newLIElement, dataMessageList.firstChild);
};


/**
 * Debug Msg
 */
const addDebugMessage = (message) => {
    isDebug() && addSystemMessageWithSubject(message, `Debug`)
}

/**
 * Create new `li` element from given text node data
 */
const createNewLIElement = (textNodeData) => {
    const newLIElement = document.createElement(`li`);
    const newTextNode = document.createTextNode(textNodeData);
    newLIElement.appendChild(newTextNode);
    return newLIElement;
}

module.exports = {
    addSystemMessageWithSubject,
    addDataMessage,
    addDebugMessage,
}
