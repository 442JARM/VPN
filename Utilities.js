// Imports
const { continueButton } = require(`./HTMLElements`);

/**
 * Check if continue button is visible.
 */
const isDebug = () =>
  !continueButton.classList.contains(`display_none`);

const isValidPort = (portString) => {
  const portNumber = parseInt(portString);
  return 0 <= portNumber && portNumber <= 65535;
};

module.exports = {
  isDebug,
  isValidPort
};
