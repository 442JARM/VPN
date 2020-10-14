const electron = require(`electron`),
  url = require(`url`),
  path = require(`path`),
  { app, BrowserWindow, Menu } = electron;

let mainWindow;

app.on(`ready`, () => {
  // create new window
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    }
  });

  // load HTML file into window
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `index.html`),
      protocol: `file:`,
      slashes: true,
    })
  );

  // quit app on close
  mainWindow.on(`closed`, () => {
    app.quit();
  });

  // build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // insert Menu
  Menu.setApplicationMenu(mainMenu);
});

const mainMenuTemplate = [
  {
    label: `File`,
    submenu: [
      {
        label: `Quit`,
        click() {
          app.quit();
        },
      },
    ],
  },
];

// if running on Mac OS, add empty object to menu
if (process.platform == `darwin`) {
  mainMenuTemplate.unshift({
    label: `JARM` // dummy label to prevent "invalid template" exception
  });
}

// add dev tools
if (process.env.NODE_ENV !== `production`) {
  mainMenuTemplate.push({
    label: `Dev Tools`,
    submenu: [
      {
        label: `Toggle dev tools`,
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}
