const fs = require('fs');
const net = require('net');
const { app, BrowserWindow, ipcMain, shell, globalShortcut } = require('electron');
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

    const windows = BrowserWindow.getAllWindows().reverse();
    let latestWindow;
    windows.forEach(window => {
        if (window.isVisible) {
            latestWindow = window;
        }
    });

    if (latestWindow) {
        const position = latestWindow.getPosition();
        options.x = position[0] + 20;
        options.y = position[1] + 20;
    }

    const mainWindow = new BrowserWindow(options);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    windows.push(mainWindow);
};

app.on('ready', () => {
    createWindow();

    globalShortcut.register('CommandOrControl+N', () => {
        createWindow();
    });
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

        if (!file) {
            socket.setTimeout(10000);
            socket.setEncoding('utf8');

            selector = selector || '';
            socket.on('connect', () => {
                socket.write(selector+'\r\n');
            });

            let body = '';
            socket.on('data', data => {
                body += data;
            });

            socket.on('close', () => {
                accept(body);
            });

            socket.on('timeout', () => {
                socket.end();
                reject('timeout');
            }); 

            socket.on('error', error => {
                console.log(error);
                reject(error);
            });
        }
        else {
            console.log(file);

            selector = selector || '';
            socket.on('connect', () => {
                socket.write(selector+'\r\n');
            });

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
                fs.writeFileSync(file, fileBuffer);
                shell.openPath(file);
            });
        }
    });
}

ipcMain.handle('get', async (event, selector, domain, port, file) => {
    return get(selector, domain, port, file);
});
