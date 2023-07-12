const fs = require('fs');
const net = require('net');
const {app, BrowserWindow, ipcMain, Menu, MenuItem, shell} = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    const options = {
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    };

    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        const position = focusedWindow.getPosition();
        options.x = position[0] + 20;
        options.y = position[1] + 20;
    }

    const mainWindow = new BrowserWindow(options);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type == 'keyDown') {
            switch (input.key) {
                case 'ArrowDown':
                case 'ArrowUp':
                    event.preventDefault();
                    mainWindow.webContents.send('keydown', input.key);
                    break;
                case 'Backspace':
                    mainWindow.webContents.executeJavaScript('document.activeElement.tagName').then(tag => {
                        if (tag != 'INPUT') {
                            event.preventDefault();
                            mainWindow.webContents.send('keydown', input.key);
                        }
                    });
                    break;
            }
        }
    });
};

app.on('ready', () => {
    createWindow();

    const menu = new Menu();
    menu.append(new MenuItem({
        submenu: [
            {
                label: "About Application",
                selector: "orderFrontStandardAboutPanel:"
            },
            {type: "separator"},
            {
                label: 'New window',
                accelerator: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N',
                click: () => {
                    createWindow();
                }
            },
            {
                label: 'Close window',
                accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Ctrl+W',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.close();
                }
            },
            {
                label: 'Focus address bar',
                accelerator: process.platform === 'darwin' ? 'Cmd+L' : 'Ctrl+L',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.send('address-bar');
                }
            },
            {
                label: 'Increase font size',
                accelerator: process.platform === 'darwin' ? 'Cmd+=' : 'Ctrl+=',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.send('font', '+');
                }
            },
            {
                label: 'Decrease font size',
                accelerator: process.platform === 'darwin' ? 'Cmd+-' : 'Ctrl+-',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.send('font', '-');
                }
            },
            {
                label: 'Default font size',
                accelerator: process.platform === 'darwin' ? 'Cmd+0' : 'Ctrl+0',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.send('font', '0');
                }
            },
            {
                label: 'Refresh',
                accelerator: process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.loadFile(path.join(__dirname, 'index.html'));
                }
            },
            {
                label: 'Home',
                accelerator: process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.send('home');
                }
            },
            {
                label: 'Bookmarks',
                accelerator: process.platform === 'darwin' ? 'Cmd+B' : 'Ctrl+B',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.send('bookmarks');
                }
            },
            {
                label: 'Toggle devtools',
                accelerator: process.platform === 'darwin' ? 'Cmd+D' : 'Ctrl+D',
                click: () => {
                    const focusedWindow = BrowserWindow.getFocusedWindow();
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
                }
            },
            {type: "separator"},
            {
                label: 'Quit',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
                    app.quit();
                }
            },
        ]
    }));
    menu.append(new MenuItem({
        label: "Edit",
        submenu: [
            {label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"},
            {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
            {type: "separator"},
            {label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:"},
            {label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"},
            {label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"},
            {label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
        ]
    }));
    Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

function get(selector, domain, port, file) {
    return new Promise((accept, reject) => {
        const socket = net.createConnection({
            host: domain,
            port: port
        });

        socket.setTimeout(10000);
        selector = selector || '';

        socket.on('connect', () => {
            socket.write(selector+'\r\n');
        });

        socket.on('timeout', () => {
            socket.end();
            reject('timeout');
        });

        socket.on('error', error => {
            console.log(error);
            reject(error);
        });

        if (!file) {
            socket.setEncoding('utf8');

            let body = '';
            socket.on('data', data => {
                body += data;
            });

            socket.on('close', () => {
                accept(body);
            });
        }
        else {
            let fileBuffer;
            socket.on('data', data => {
                if (!fileBuffer) {
                    fileBuffer = data;
                }
                else {
                    fileBuffer = Buffer.concat([fileBuffer, data]);
                }
            });

            socket.on('close', () => {
                accept(fileBuffer);
            });
        }
    });
}

ipcMain.handle('get', async (event, selector, domain, port, file) => {
    return get(selector, domain, port, file);
});

ipcMain.handle('open', async (event, url) => {
    return shell.openExternal(url);
});
