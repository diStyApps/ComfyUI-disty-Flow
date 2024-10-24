function injectStylesheet(href, id = null) {
    if (id && document.getElementById(id)) {
        console.warn(`Stylesheet with id "${id}" is already injected.`);
        return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;

    if (id) {
        link.id = id;
    }

    link.onload = function() {
        this.onload = null;
        this.rel = 'stylesheet';
        console.log(`Stylesheet "${href}" has been loaded and applied.`);
    };

    link.onerror = function() {
        console.error(`Failed to load stylesheet "${href}".`);
    };

    document.head.appendChild(link);
}

export default injectStylesheet;
