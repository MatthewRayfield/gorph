const version = '1.2';
const toolbarElement = document.getElementById('toolbar');
const backButton = document.getElementById('back');
const addressBar = document.getElementById('address-bar');
const goButton = document.getElementById('go');
const homeButton = document.getElementById('home');
const bookmarksButton = document.getElementById('bookmarks');
const contentElement = document.getElementById('content');
const bookmarksMenu = document.getElementById('bookmarks-menu');
const bookmarksList = document.getElementById('bookmarks-list');
const addBookmarkButton = document.getElementById('add-bookmark');
const closeButton = document.getElementById('close');
const minButton = document.getElementById('min');
const maxButton = document.getElementById('max');
const historyButton = document.getElementById('history');
const historyMenu = document.getElementById('history-menu');
const historyList = document.getElementById('history-list');
const icons = {
    'i': ' ',
    '0': '📄',
    '1': '📁',
    '3': ' ',
    'I': '🏙️',
    'g': '🌆',
    ':': '🌃',
    '9': '📗',
    '5': '📕',
    '6': '📘',
    '4': '📙',
    '7': '🔎',
    'h': '🌎',
};
let backHistory = [];
let loading = false;
let searchButton;
let currentUrl;
const defaultBookmarks = ['sdf.org', 'gopher.floodgap.com', 'quux.org', 'zaibatsu.circumlunar.space'];

function extend(target, source, deep) {
    var key;

    for (key in source) {
        if (deep && typeof source[key] == 'object' && typeof target[key] == 'object') {
            extend(target[key], source[key], deep);
        }
        else {
            target[key] = source[key];
        }
    }

    return target;
}

function createElement(tagName, properties, children) {
    var element = document.createElement(tagName),
        key;

    extend(element, properties, true);

    if (children) {
        children.forEach(function (child) {
            element.appendChild(child);
        });
    }

    return element;
}

function setTitle() {
    document.title = (currentUrl ? currentUrl + ' ' : '') + '( gorph v' + version + ' )';
}

function getHistory() {
    let history;
    try {history = JSON.parse(localStorage.getItem('history'));}
    catch (e) {}

    if (!history) {
        history = [];
    }

    return history;
}

async function addHistory(url) {
    if (typeof url != 'string') {
        url = addressBar.value;
    }

    let history = getHistory();

    const d = new Date();
    history.push({
        url,
        time: Date.now()
    });
    localStorage.setItem('history', JSON.stringify(history));
}

function renderHistory() {
    let history = getHistory();

    historyList.innerHTML = '';
    history.reverse().forEach(record => {
        const d = new Date(record.time);
        const timestamp = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${('0'+d.getMinutes()).slice(-2)}:${('0'+d.getSeconds()).slice(-2)}`
        const span = createElement('span', {innerHTML: timestamp +'<br />'});
        const link = createElement('a', {innerHTML: record.url, href: 'javascript:void(0)'});
        span.appendChild(link);
        link.addEventListener('click', () => {
            historyButton.click();
            go(record.url);
        });
        const element = createElement('div', {className: 'record'}, [span]);
        historyList.appendChild(element);
    });
}

function renderBookmarks() {
    let bookmarks;
    try {bookmarks = JSON.parse(localStorage.getItem('bookmarks'));}
    catch (e) {}

    if (!bookmarks) {
        bookmarks = defaultBookmarks;
    }

    bookmarksList.innerHTML = '';
    bookmarks.forEach((url, i) => {
        const link = createElement('a', {innerHTML: url, href: 'javascript:void(0)'});
        link.addEventListener('click', () => {
            bookmarksButton.click();
            go(url);
        });
        const span = createElement('span', {}, [link]);
        if (i == 0) {
            const homeIcon = createElement('span', {className: 'home-icon', innerHTML: '🏠'});
            span.appendChild(homeIcon);
        }
        const element = createElement('div', {className: 'bookmark'}, [span]);
        const upButton = createElement('button', {innerHTML: '⬆️'});
        upButton.addEventListener('click', e => {
            e.stopPropagation();
            if (i == 0) {return;}
            bookmarks.splice(i-1, 2, url, bookmarks[i-1]);
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            renderBookmarks();
        });
        const downButton = createElement('button', {innerHTML: '⬇️'});
        downButton.addEventListener('click', e => {
            e.stopPropagation();
            if (i == bookmarks.length - 1) {return;}
            bookmarks.splice(i, 2, bookmarks[i+1], url);
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            renderBookmarks();
        });
        const deleteButton = createElement('button', {innerHTML: '✖️'});
        deleteButton.addEventListener('click', e => {
            e.stopPropagation();
            bookmarks.splice(i, 1);
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            renderBookmarks();
        });
        const buttonBox = createElement('div', {className: 'button-box'}, [upButton, downButton, deleteButton]);
        element.appendChild(buttonBox);
        bookmarksList.appendChild(element);
    });
}

function animateLoading() {
    const i = Math.floor(Date.now()/100);

    goButton.innerHTML = [
        '🕛',
        '🕐',
        '🕑',
        '🕒',
        '🕓',
        '🕔',
        '🕕',
        '🕖',
        '🕗',
        '🕘',
        '🕙',
        '🕚'
    ][i % 12];

    if (loading) {
        setTimeout(animateLoading, 1000/60);
    }
    else {
        goButton.innerHTML = '▶️';
    }
}

async function get(selector, host, port, type) {
    if (loading) {
        return;
    }

    currentUrl = host;
    if (port != 70) {
        currentUrl += ':'+port;
    }
    if (type && selector) {
        currentUrl += '/' + type;
    }
    currentUrl += selector || '';

    if (type == '7') {
        addressBar.value = currentUrl;
        addHistory();
        setTitle();

        if (selector.indexOf('\t') == -1) {
            backHistory.push({selector, host, port, type});
            const searchInput = createElement('input');
            const searchLabel = createElement('label', {innerHTML: 'enter request query:'});
            searchButton = createElement('button', {innerHTML: 'search'});
            searchButton.addEventListener('click', () => {
                get(selector +'\t'+ searchInput.value, host, port, type);
            });
            const searchBox = createElement('div', {className: 'search'}, [searchLabel, searchInput, searchButton]);
            contentElement.innerHTML = '';
            contentElement.appendChild(searchBox);
            searchInput.focus();
            return;
        }
    }
    else if (type == 'h' && selector.indexOf('URL:') == 0) {
        selector = selector.replace(/^URL:/, '');
        open(selector);
        return;
    }
    else {
        searchButton = undefined;

        if (type && type != '0' && type != '1') {
            let buffer;

            try {
                buffer = await window.electronAPI.get(selector, host, port, true);
            }
            catch (e) {
                alert(e);
            }

            const blob = new Blob([buffer], {type: "octet/stream"});
            const url = window.URL.createObjectURL(blob);

            if ('Ig:'.indexOf(type) > -1) {
                addressBar.value = currentUrl;
                addHistory();
                setTitle();

                backHistory.push({selector, host, port, type});
                const image = createElement('img', {src: url});
                contentElement.innerHTML = '';
                contentElement.appendChild(image);
            }
            else {
                const filename = selector.split('/').pop();
                const a = createElement('a', {style: 'display: none', href: url, download: filename});
                contentElement.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }

            return;
        }
    }

    loading = true;
    animateLoading();

    addressBar.value = currentUrl;
    addHistory();
    setTitle();

    let raw;
    try {
        raw = await window.electronAPI.get(selector, host, port);
        loading = false;
    }
    catch (e) {
        alert(e);
        loading = false;
        return;
    }

    backHistory.push({selector, host, port, type});
    if (backHistory.length >= 2) {
        backHistory[backHistory.length-2].scroll = contentElement.scrollTop;
        backButton.disabled = false;
    }
    else {
        backButton.disabled = true;
    }

    if (type == '0') {
        let clean = raw.replace(/</g, '&lt;');
        clean = clean.replace(/>/g, '&gt;');
        clean = clean.replace(/gopher:\/\/[^ \n$]+/g, "<a href=\"javascript:go('$&')\">$&</a>");
        clean = clean.replace(/https?:\/\/[^ \n$]+/g, "<a href=\"javascript:open('$&')\">$&</a>");
        clean = clean.replace(/^\.$/m, '');

        contentElement.innerHTML = '<pre>'+clean;
    }
    else {
        const lines = raw.split('\n');

        contentElement.innerHTML = '';

        const parsed = lines.map(line => {return line.split('\t')});

        parsed.forEach(split => {
            if (split.length < 4 || split[0] == '.') {
                return;
            }

            const type = split[0].substring(0, 1);
            split[0] = split[0].substring(1);
            const label = split[0];
            const selector = split[1];
            const host = split[2];
            const port = split[3];
            const formatted = label.replace(/ /g, '&nbsp;');

            const icon = createElement('div', {className: 'icon', innerHTML: icons[type] || type});
            const div = createElement('div', {className: 'item'}, [icon]);

            if (type == 'i' || type == '3') {
                const span = createElement('span', {innerHTML: formatted});
                div.appendChild(span);
            }
            else {
                const a = createElement('a', {innerHTML: formatted, href: "javascript:void(0)"});
                a.addEventListener('click', async () => {
                    await get(selector, host, parseInt(port), type);
                });
                div.appendChild(a);
            }

            contentElement.appendChild(div);
        });
    }

    contentElement.scrollTop = 0;
}

async function back() {
    backHistory.pop();
    const dat = backHistory.pop();

    if (!dat) return;

    await get(dat.selector, dat.host, dat.port, dat.type);

    contentElement.scrollTop = dat.scroll || 0;
}

async function go(url) {
    if (typeof url == 'string') {
        url = url;
    }
    else {
        url = addressBar.value;
    }

    const match = (/(gopher:\/\/)?([^:\/]+):?([0-9]+)?\/?([^\/])?(.+)?/).exec(url);

    const protocol = match[1];
    const host = match[2];
    const port = parseInt(match[3]) || 70;
    const type = match[4];
    let selector = match[5] || '';
    if (selector && selector[0] != '/') {
        selector = '/'+selector;
    }

    await get(selector, host, port, type);
}

function open(url) {
    window.electronAPI.open(url);
}

function addBookmark() {
    let bookmarks;
    try {bookmarks = JSON.parse(localStorage.getItem('bookmarks'));}
    catch (e) {}
    if (!bookmarks) {
        bookmarks = defaultBookmarks;
    }
    bookmarks.push(currentUrl);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();

    bookmarksMenu.scrollTop = bookmarksMenu.scrollHeight;
}

window.addEventListener('keypress', e => {
    console.log(e);

    if (e.which == 13) {
        if (document.activeElement == addressBar) {
            addressBar.blur();
            go();
        }
        else if (searchButton) {
            searchButton.click();
        }
    }
    else if (e.which == 98 && !e.metaKey && !e.ctrlKey) {
        if (bookmarksMenu.style.display == 'block') {
            addBookmark();
        }
    }
});

backButton.addEventListener('click', back);
addressBar.addEventListener('focus', () => {
    addressBar.select();
});
goButton.addEventListener('click', go);
homeButton.addEventListener('click', () => {
    let bookmarks;
    try {bookmarks = JSON.parse(localStorage.getItem('bookmarks'));}
    catch (e) {}
    if (!bookmarks) {
        bookmarks = defaultBookmarks;
    }
    go(bookmarks[0]);
});
bookmarksButton.addEventListener('click', () => {
    if (bookmarksMenu.style.display == 'block') {
        bookmarksMenu.style.display = 'none';
    }
    else {
        renderBookmarks();
        historyMenu.style.display = 'none';
        bookmarksMenu.style.display = 'block';
    }
});
addBookmarkButton.addEventListener('click', addBookmark);
closeButton.addEventListener('click', () => {
    window.electronAPI.close();
});
historyButton.addEventListener('click', () => {
    if (historyMenu.style.display == 'block') {
        historyMenu.style.display = 'none';
    }
    else {
        renderHistory();
        bookmarksMenu.style.display = 'none';
        historyMenu.style.display = 'block';
    }
});
minButton.addEventListener('click', () => {
    window.electronAPI.min();
});
maxButton.addEventListener('click', () => {
    window.electronAPI.max();
});
window.electronAPI.on('address-bar', () => {addressBar.focus();});
window.electronAPI.on('font', (event, change) => {
    let fontSize = parseInt(document.body.style.fontSize) || 15;

    if (change == '+') fontSize += 2;
    else if (change == '-') fontSize -= 2;
    else if (change == '0') fontSize = 15;

    document.body.style.fontSize = fontSize + 'px';
});
window.electronAPI.on('home', () => {homeButton.click();});
window.electronAPI.on('bookmarks', () => {bookmarksButton.click();});
window.electronAPI.on('history', () => {historyButton.click();});
window.electronAPI.on('keydown', (event, key) => {
    if (key == 'ArrowUp') {
        contentElement.scrollTop -= 20;
    }
    else if (key == 'ArrowDown') {
        contentElement.scrollTop += 20;
    }
    else if (key == 'Backspace') {
        if (document.activeElement.tagName != 'INPUT') {
            back();
        }
    }
});

window.addEventListener('load', async () => {
    homeButton.click();
});
