// Imports
const { isDebug } = require(`./Utilities`);

/**
 * Queue of data received
 */
class MessageQueue {
  messageQueue;

  constructor() {
    this.messageQueue = [];
  }

  /**
   * When there's new {@param data} to be step through,
   * Add to queue && enable continue button
   * @param {*} data 
   */
  push = (data) => {
    if (!data) { return; }
    this.messageQueue.push(data);
    if (isDebug()) { continueButton.disabled = false; }
    else { this.runAllNext(); }
  }

  /**
   *  Runs next msg processing fn.
   */
  next = () => {
    // 1. Play first msg in queue
    if (this.messageQueue.length) { this.messageQueue[0] = this.messageQueue[0](); }

    // 2. If linkedList steps of msg process is completed, remove msg from queue. 
    if (!this.messageQueue[0]) { this.messageQueue.shift(); }

    // 3. If no more msg in Queue, disable continue button.
    if (this.messageQueue.length === 0) { continueButton.disabled = true; }
  };

  /**
   * Run processing fn for a single msg.
   * NOTE: Should only be called when not in debug mode.
   */
  runAllNext = () => {
    while (this.messageQueue[0]) {
      this.messageQueue[0] = this.messageQueue[0]();
    }
    if (!this.messageQueue[0]) { this.messageQueue.shift(); }
  }

}

module.exports = {
  MessageQueue
};
