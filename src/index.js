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
};
let backHistory = [];
let loading = false;
let searchButton;
let currentUrl;
const defaultBookmarks = ['gopher.floodgap.com', 'quux.org', 'zaibatsu.circumlunar.space'];

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
        const span = createElement('span', {}, [link]);
        if (i == 0) {
            span.innerHTML += '&nbsp;🏠';
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
        element.addEventListener('click', () => {go(url);});
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

    if (type == '7') {
        if (selector.indexOf('\t') == -1) {
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
    let clean = raw.replace(/</g, '&lt;');
    clean = clean.replace(/>/g, '&gt;');
    clean = clean.replace(/gopher:\/\/[^ \n$]+/g, "<a href=\"javascript:go('$&')\">$&</a>");

    if (backHistory.length >= 1) {
        backHistory[backHistory.length-1].scroll = contentElement.scrollTop;
    }
    backHistory.push({selector, host, port, type});
    if (backHistory.length >= 2) {
        backButton.disabled = false;
    }
    else {
        backButton.disabled = true;
    }


    currentUrl = host;
    if (port != 70) {
        currentUrl += ':'+port;
    }
    if (type != undefined) {
        currentUrl += '/'+type;
    }
    currentUrl += selector || '';
    addressBar.value = currentUrl;

    if (type == '0') {
        contentElement.innerHTML = '<pre>'+clean;
    }
    else {
        const lines = raw.split('\n');

        contentElement.innerHTML = '';

        const parsed = lines.map(line => {return line.split('\t')});

        parsed.forEach(split => {
            if (split.length < 4) {
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
    url = url || addressBar.value;
    const match = (/(gopher:\/\/)?([^:\/]+):?([0-9]+)?(\/(.)(\/?.+))?/).exec(url);

    const host = match[2];
    const port = parseInt(match[3]) || 70;
    const type = match[5];
    let selector = match[6];
    if (selector && selector[0] != '/') {
        selector = '/'+selector;
    }

    await get(selector, host, port, type);
    window.scrollTo(0, 0);
}

window.addEventListener('keypress', e => {
    if (e.which == 13) {
        if (document.activeElement == addressBar) {
            addressBar.blur();
            go();
        }
        else if (searchButton) {
            searchButton.click();
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
        bookmarksMenu.style.display = 'block';
    }
});
addBookmarkButton.addEventListener('click', () => {
    let bookmarks;
    try {bookmarks = JSON.parse(localStorage.getItem('bookmarks'));}
    catch (e) {}
    if (!bookmarks) {
        bookmarks = defaultBookmarks;
    }
    bookmarks.push(currentUrl);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    renderBookmarks();
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

window.addEventListener('load', async () => {
    homeButton.click();
});
