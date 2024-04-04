import { app, BrowserWindow, Menu } from 'electron';

function createWindow() {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = "true"
    // Menu.setApplicationMenu(Menu.buildFromTemplate([])) // 清空菜单栏，win/mac/linux通用
    const win = new BrowserWindow({
        width: 800,
        height: 650,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    })
    // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
    if (process.env.VITE_DEV_SERVER_URL) {
        console.log('vite dev server url:', process.env.VITE_DEV_SERVER_URL)

        const dev_url = new URL(process.env.VITE_DEV_SERVER_URL)
        dev_url.pathname = 'developer'
        console.debug('dev_url:', dev_url.toString())

        win.loadURL(dev_url.toString()).then(() => {
            console.debug('loadURL success')
        })
        win.webContents.openDevTools({mode:'right'})
    } else {
        // Load your file
        Menu.setApplicationMenu(null)
        win.loadFile('dist/index.html').then(() => {
            console.debug('loadFile success')
        });
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    });
});