import { app } from "../../scripts/app.js";
const extension = {
    name: "flow.widget",
};

app.registerExtension(extension);
const config = {
    newTab: true,
};

const createWidget = ({ className, text, tooltip, includeIcon, svgMarkup }) => {
    const button = document.createElement('button');
    button.className = className;
    button.setAttribute('aria-label', tooltip);
    button.title = tooltip;

    if (includeIcon && svgMarkup) {
        const iconContainer = document.createElement('span');
        iconContainer.innerHTML = svgMarkup;
        iconContainer.style.display = 'flex';
        iconContainer.style.alignItems = 'center';
        iconContainer.style.justifyContent = 'center';
        iconContainer.style.width = '40px';
        iconContainer.style.height = '16px';
        button.appendChild(iconContainer);
    }

    const textNode = document.createTextNode(text);
    button.appendChild(textNode);

    button.addEventListener('click', onClick);
    return button;
};

const onClick = () => {
    const flowUrl = `${window.location.origin}/flow`;
    if (config.newTab) {
        window.open(flowUrl, '_blank');
    } else {
        window.location.href = flowUrl;
    }
};

const addWidgetMenuRight = (menuRight) => {
    let buttonGroup = menuRight.querySelector('.comfyui-button-group');

    if (!buttonGroup) {
        buttonGroup = document.createElement('div');
        buttonGroup.className = 'comfyui-button-group';
        menuRight.appendChild(buttonGroup);
    }

    const flowButton = createWidget({
        className: 'comfyui-button comfyui-menu-mobile-collapse primary',
        text: '',
        tooltip: 'Launch Flow',
        includeIcon: true,
        svgMarkup: getFlowIcon(), 
    });

    buttonGroup.appendChild(flowButton);
};

const addWidgetMenu = (menu) => {
    const resetViewButton = menu.querySelector('#comfy-reset-view-button');
    if (!resetViewButton) {
        return;
    }

    const flowButton = createWidget({
        className: 'comfy-flow-button',
        text: 'Flow',
        tooltip: 'Launch Flow',
        includeIcon: false,
    });

    resetViewButton.insertAdjacentElement('afterend', flowButton);
};

const addWidget = (selector, callback) => {
    const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
            obs.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};

const initializeWidgets = () => {
    addWidget('.comfyui-menu-right', addWidgetMenuRight);
    addWidget('.comfy-menu', addWidgetMenu);
};

const getFlowIcon = () => {
    return `
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
            width="1248.000000pt" height="609.000000pt" viewBox="0 0 1248.000000 609.000000"
            preserveAspectRatio="xMidYMid meet">
            <g transform="translate(0.000000,609.000000) scale(0.100000,-0.100000)"
            fill="currentColor" stroke="none">
            <path d="M11062 6068 c-27 -27 -14 -64 38 -107 156 -132 347 -434 444 -704
            104 -289 140 -499 140 -832 0 -269 -9 -359 -59 -585 -74 -333 -210 -663 -387
            -943 -96 -152 -279 -389 -291 -377 -9 8 -77 237 -103 345 -105 429 -204 1113
            -245 1693 -7 94 -16 177 -20 183 -4 8 -56 7 -180 -1 -162 -11 -496 -8 -576 6
            -38 7 -34 18 -68 -186 -115 -670 -340 -1679 -479 -2140 -61 -205 -71 -233 -82
            -237 -20 -7 -122 283 -183 517 -60 232 -128 595 -161 855 -46 369 -54 472 -70
            845 -6 146 -13 301 -16 346 l-6 81 -113 7 c-191 11 -404 40 -609 81 -70 15
            -131 24 -134 21 -3 -4 0 -153 7 -334 29 -777 99 -1354 226 -1887 125 -519 325
            -958 543 -1187 20 -21 32 -41 28 -45 -15 -16 -575 -8 -741 10 -333 36 -715
            113 -1053 213 -182 54 -493 161 -572 198 l-55 26 106 0 c344 0 690 144 947
            394 217 210 379 513 441 824 90 450 4 878 -243 1209 -187 251 -445 412 -788
            495 -82 20 -119 23 -318 22 -247 0 -309 -9 -496 -74 -426 -149 -767 -522 -910
            -995 -56 -184 -68 -275 -68 -495 1 -182 4 -219 27 -328 49 -225 130 -418 236
            -561 23 -30 39 -56 37 -58 -2 -2 -59 18 -127 45 -68 27 -161 64 -206 82 -46
            18 -83 34 -83 36 0 2 16 65 36 140 19 75 34 137 32 139 -3 3 -239 28 -523 55
            -49 5 -135 14 -190 20 -55 6 -145 15 -200 21 -55 5 -140 14 -190 18 -49 5
            -191 19 -315 32 -124 12 -229 25 -233 29 -9 8 66 198 170 430 126 283 348 703
            513 975 145 238 398 608 546 799 30 38 54 72 54 75 0 4 -50 33 -111 66 -181
            97 -362 222 -526 364 -45 39 -85 71 -90 71 -21 0 -503 -786 -693 -1130 -269
            -487 -580 -1156 -744 -1600 l-17 -46 -137 -22 c-806 -130 -1483 -546 -1881
            -1157 -321 -493 -418 -1090 -250 -1552 28 -79 87 -192 114 -219 30 -30 77 -32
            105 -4 18 18 19 29 13 189 -9 242 19 417 100 626 258 672 894 1117 1782 1247
            119 17 594 17 735 -1 528 -65 1022 -232 1730 -586 232 -115 283 -142 580 -305
            534 -293 796 -430 1065 -557 619 -291 1130 -451 1679 -524 196 -26 619 -36
            841 -20 648 46 1283 234 1828 540 316 177 560 362 817 620 449 451 737 955
            890 1554 78 310 106 554 97 862 -22 745 -313 1466 -797 1978 -120 126 -251
            236 -411 342 -128 85 -170 100 -197 73z m-4520 -1839 c118 -25 218 -97 292
            -208 57 -85 91 -174 118 -306 18 -87 20 -122 15 -265 -7 -181 -21 -267 -68
            -410 -109 -337 -335 -523 -614 -507 -109 6 -181 31 -264 92 -161 119 -245 340
            -245 645 0 420 174 789 432 919 95 48 224 63 334 40z m3588 -849 c50 -417 126
            -878 204 -1244 24 -112 25 -120 8 -132 -81 -61 -691 -340 -706 -323 -2 2 16
            74 40 159 63 221 187 704 234 915 98 432 113 499 146 655 18 90 34 167 34 169
            0 3 4 1 9 -4 4 -6 18 -93 31 -195z m1840 -898 c0 -18 -129 -331 -168 -409
            -176 -349 -445 -687 -737 -926 -443 -364 -1017 -583 -1639 -628 -295 -22 -685
            12 -996 86 -134 32 -162 44 -158 64 4 19 -12 18 238 7 433 -19 943 57 1383
            205 825 279 1496 785 1951 1472 60 90 97 137 108 137 10 0 18 -4 18 -8z"/>
            <path d="M240 3743 l0 -1726 32 44 c201 281 519 564 815 725 l73 39 0 302 0
            303 577 2 577 3 66 160 c37 88 101 234 144 325 43 91 80 173 83 182 5 17 -36
            18 -718 20 l-724 3 0 295 0 295 863 3 862 2 0 375 0 375 -1325 0 -1325 0 0
            -1727z"/>
            </g>
        </svg>
    `;
};

initializeWidgets();
