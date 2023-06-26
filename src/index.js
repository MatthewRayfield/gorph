const fs = require('fs');
const net = require('net');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

app.on('ready', createWindow);

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

        socket.setTimeout(1000);

        if (!file) {
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
