const toolbarElement = document.getElementById('toolbar');
const backButton = document.getElementById('back');
const addressBar = document.getElementById('address-bar');
const goButton = document.getElementById('go');
const contentElement = document.getElementById('content');
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
};
let backHistory = [];
let loading = false;

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

    if (type && type != '0' && type != '1') {
        try {
            await window.electronAPI.get(selector, host, port, selector.split('/').pop());
        }
        catch (e) {
            alert(e);
        }

        return;
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

    if (backHistory.length >= 1) {
        backHistory[backHistory.length-1].scroll = window.scrollY;
    }
    backHistory.push({selector, host, port, type});
    if (backHistory.length >= 2) {
        backButton.disabled = false;
    }
    else {
        backButton.disabled = true;
    }


    addressBar.value = host;
    if (port != 70) {
        addressBar.value += ':'+port;
    }
    if (type != undefined) {
        addressBar.value += '/'+type;
    }
    addressBar.value += selector || '';

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
                    window.scrollTo(0, 0);
                });
                div.appendChild(a);
            }

            contentElement.appendChild(div);
        });
    }
}

async function back() {
    backHistory.pop();
    const dat = backHistory.pop();

    if (!dat) return;

    await get(dat.selector, dat.host, dat.port, dat.type);

    window.scroll(0, dat.scroll || 0);
}

async function go() {
    const url = addressBar.value;
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
    if (document.activeElement == addressBar && e.which == 13) {
        addressBar.blur();
        go();
    }
});

backButton.addEventListener('click', back);
addressBar.addEventListener('click', () => {addressBar.select();});
goButton.addEventListener('click', go);

window.addEventListener('load', async () => {
    get('', 'gopher.floodgap.com', 70);
});
