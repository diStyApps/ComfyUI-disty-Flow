// interactiveUI.js
const toggleLeftBtn = document.getElementById('toggle-left');
const leftCol = document.getElementById('left-col');
const toggleRightBtn = document.getElementById('toggle-right');
const rightCol = document.getElementById('right-col');
const controlsDiv = document.getElementById('quick-controls');
const sideWorkflowControls = document.getElementById('side-workflow-controls');

const classesToMoveLeft = ['seeder-container', 'stepper-container'];

const idsToMoveRight = ['history'];

const leftElementPlaceholders = new Map();
const rightElementPlaceholders = new Map();

let moveElementsOnMinimize = true;
let moveHistoryOnMinimize = true;


function getElementsToMoveByClass(container, classesToMove) {
    const selectors = classesToMove.map(className => `.${className}`).join(',');
    return container.querySelectorAll(selectors);
}


function getElementsToMoveById(container, idsToMove) {
    return idsToMove.map(id => container.querySelector(`#${id}`)).filter(el => el !== null);
}

function moveLeftElementsToControls() {
    const elementsLeft = getElementsToMoveByClass(sideWorkflowControls, classesToMoveLeft);
    elementsLeft.forEach(element => {
        if (element.id && !leftElementPlaceholders.has(element.id)) {
            const placeholder = document.createElement('div');
            placeholder.className = 'element-placeholder';
            placeholder.dataset.elementId = element.id;

            sideWorkflowControls.replaceChild(placeholder, element);

            leftElementPlaceholders.set(element.id, { placeholder, parent: sideWorkflowControls });

            controlsDiv.appendChild(element);
            console.log(`Moved "${element.id}" to #controls.`);
            // updateElementsWithIcons("controls", iconList, true, "add");
        }
    });
}

function moveLeftElementsBack() {
    leftElementPlaceholders.forEach(({ placeholder, parent }, elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            parent.replaceChild(element, placeholder);
            console.log(`Moved "${elementId}" back to its original parent.`);
            // updateElementsWithIcons("side-workflow-controls", iconList, true, "add");
        } else {
            console.warn(`Element with ID "${elementId}" not found.`);
        }
    });

    leftElementPlaceholders.clear();
}

function moveRightElementsToControls() {

    console.log("rightCol", rightCol); //Need to fix
    // const elementsRight = getElementsToMoveById(rightCol, idsToMoveRight);
    // elementsRight.forEach(element => {
    //     if (element.id && !rightElementPlaceholders.has(element.id)) {
    //         // Create a placeholder
    //         const placeholder = document.createElement('div');
    //         placeholder.className = 'element-placeholder';
    //         placeholder.dataset.elementId = element.id;

    //         // Replace the element with the placeholder
    //         rightCol.replaceChild(placeholder, element);

    //         // Store the placeholder and parent in the map
    //         rightElementPlaceholders.set(element.id, { placeholder, parent: rightCol });

    //         // Append the element to controlsDiv
    //         controlsDiv.appendChild(element);
    //         console.log(`Moved "${element.id}" to #controls.`);
    //     }
    // });
}

function moveRightElementsBack() {
    rightElementPlaceholders.forEach(({ placeholder, parent }, elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            parent.replaceChild(element, placeholder);
            console.log(`Moved "${elementId}" back to its original parent.`);
        } else {
            console.warn(`Element with ID "${elementId}" not found.`);
        }
    });

    rightElementPlaceholders.clear();
}

function handleLeftColumnToggle() {
    leftCol.classList.toggle('minimized');
    toggleLeftBtn.classList.toggle('active');

    const isMinimized = leftCol.classList.contains('minimized');

    if (isMinimized) {
        if (moveElementsOnMinimize) {
            moveLeftElementsToControls();
        }
    } else {
        if (moveElementsOnMinimize) {
            moveLeftElementsBack();
        }
    }
}

function handleRightColumnToggle() {
    rightCol.classList.toggle('minimized');
    toggleRightBtn.classList.toggle('active');

    const isMinimized = rightCol.classList.contains('minimized');

    if (isMinimized) {
        if (moveHistoryOnMinimize) {
            moveRightElementsToControls();
        }
    } else {
        if (moveHistoryOnMinimize) {
            moveRightElementsBack();
        }
    }
}

export function initialize(
    moveElementsOnMinimizeParam = true,
    minimizeOnStart = false,
    rememberStateOnLoad = false,
    moveHistoryOnMinimizeParam = true
) {
    moveElementsOnMinimize = moveElementsOnMinimizeParam;
    moveHistoryOnMinimize = moveHistoryOnMinimizeParam;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('minimized')) {
        minimizeOnStart = urlParams.get('minimized') === 'true';
    }

    let isLeftMinimized = minimizeOnStart;
    let isRightMinimized = minimizeOnStart;

    if (rememberStateOnLoad) {
        const savedLeftState = localStorage.getItem('leftColMinimized');
        if (savedLeftState !== null) {
            isLeftMinimized = savedLeftState === 'true';
        }
        const savedRightState = localStorage.getItem('rightColMinimized');
        if (savedRightState !== null) {
            isRightMinimized = savedRightState === 'true';
        }
    }

    if (isLeftMinimized) {
        leftCol.classList.add('minimized');
        toggleLeftBtn.classList.add('active');
        if (moveElementsOnMinimize) {
            moveLeftElementsToControls();
        }
    }

    if (isRightMinimized) {
        rightCol.classList.add('minimized');
        toggleRightBtn.classList.add('active');
        if (moveHistoryOnMinimize) {
            moveRightElementsToControls();
        }
    }

    toggleLeftBtn.addEventListener('click', () => {
        handleLeftColumnToggle();

        if (rememberStateOnLoad) {
            const isMinimizedNow = leftCol.classList.contains('minimized');
            localStorage.setItem('leftColMinimized', isMinimizedNow);
        }
    });

    toggleRightBtn.addEventListener('click', () => {
        handleRightColumnToggle();

        if (rememberStateOnLoad) {
            const isMinimizedNow = rightCol.classList.contains('minimized');
            localStorage.setItem('rightColMinimized', isMinimizedNow);
        }
    });

    const mediaQuery = window.matchMedia('(max-width: 576px)');
    function handleMediaQueryChange(e) {
        if (e.matches) {

            if (!leftCol.classList.contains('minimized')) {
                leftCol.classList.add('minimized');
                toggleLeftBtn.classList.add('active');
                if (moveElementsOnMinimize) {
                    moveLeftElementsToControls();
                }
            }

            console.log("rightCol", rightCol);
            console.log("rightCol.classList.contains('minimized')", rightCol.classList.contains('minimized'));
            console.log("moveHistoryOnMinimize", moveHistoryOnMinimize);


            if (!rightCol.classList.contains('minimized')) {
                rightCol.classList.add('minimized');
                toggleRightBtn.classList.add('active');
                if (moveHistoryOnMinimize) {
                    moveRightElementsToControls();
                }
            }
        } else {

            if (leftCol.classList.contains('minimized') && !isLeftMinimized) {
                leftCol.classList.remove('minimized');
                toggleLeftBtn.classList.remove('active');
                if (moveElementsOnMinimize) {
                    moveLeftElementsBack();
                }
            }

            if (rightCol.classList.contains('minimized') && !isRightMinimized) {
                rightCol.classList.remove('minimized');
                toggleRightBtn.classList.remove('active');
                if (moveHistoryOnMinimize) {
                    moveRightElementsBack();
                }
            }
        }
    }

    handleMediaQueryChange(mediaQuery);

    mediaQuery.addEventListener('change', handleMediaQueryChange);
}

initialize(false, false, false, false);


const iconList = {
    "CFG": `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
            width="32px" height="32px" viewBox="0 0 512.000000 512.000000"
                preserveAspectRatio="xMidYMid meet">

                <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
                fill="currentColor"  stroke="none">
                <path d="M2487 4790 c-92 -24 -179 -97 -219 -185 -31 -70 -31 -180 0 -250 30
                -65 102 -138 164 -165 l48 -21 0 -212 0 -212 -422 -78 c-233 -43 -702 -130
                -1043 -193 -341 -63 -632 -120 -647 -125 -36 -15 -54 -60 -38 -98 23 -57 37
                -57 364 4 164 31 300 55 301 53 2 -2 -136 -251 -306 -553 -411 -729 -373 -652
                -359 -722 22 -105 69 -177 165 -250 76 -58 134 -87 247 -124 249 -81 574 -73
                816 21 101 39 219 116 267 174 51 62 87 149 88 210 1 49 -11 72 -346 665 -191
                338 -345 617 -342 620 4 3 250 51 548 106 l542 101 3 -1138 2 -1138 240 0 240
                0 0 1183 0 1182 552 102 c304 56 554 101 556 99 2 -2 -151 -277 -339 -612
                -188 -334 -348 -623 -355 -641 -28 -65 19 -193 100 -276 269 -277 922 -316
                1281 -75 122 81 198 197 198 302 0 49 -17 81 -361 690 -199 352 -359 642 -357
                644 3 3 156 33 340 68 185 34 343 68 352 75 25 22 35 60 23 90 -26 61 22 67
                -1093 -140 -563 -105 -1031 -191 -1040 -191 -15 0 -17 20 -17 195 l0 194 48
                21 c62 28 136 101 163 164 32 71 32 181 0 252 -27 63 -101 136 -163 164 -54
                24 -148 33 -201 20z m1806 -1630 c158 -280 287 -512 287 -515 0 -3 -261 -5
                -580 -5 -319 0 -580 2 -580 5 0 10 574 1025 580 1025 3 0 135 -229 293 -510z
                m-2880 -480 c158 -280 287 -512 287 -515 0 -3 -261 -5 -580 -5 -319 0 -580 2
                -580 5 0 10 574 1025 580 1025 3 0 135 -229 293 -510z"/>
                <path d="M1940 1111 c-110 -34 -170 -114 -178 -237 l-4 -72 -72 -4 c-79 -5
                -135 -29 -177 -75 -52 -55 -63 -90 -67 -211 -5 -125 5 -163 44 -181 35 -16
                2113 -16 2148 0 39 18 49 56 44 181 -4 121 -15 156 -67 211 -42 46 -98 70
                -177 75 l-72 4 -4 72 c-7 105 -49 174 -133 219 -40 22 -46 22 -650 24 -335 1
                -621 -2 -635 -6z"/>
                </g>
            </svg>
    `,
    "Steps": `
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
            width="32px" height="32px" viewBox="0 0 512.000000 512.000000"
            preserveAspectRatio="xMidYMid meet">
            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
            fill="currentColor" stroke="none">
            <path d="M1267 4970 c-136 -35 -269 -111 -358 -207 -61 -65 -98 -121 -151
            -228 -106 -211 -147 -378 -155 -625 -9 -279 28 -449 159 -736 102 -223 288
            -537 349 -589 63 -52 62 -52 521 56 231 54 435 107 452 117 62 36 69 62 72
            286 3 232 25 402 80 626 77 313 52 591 -78 857 -107 221 -251 350 -469 424
            -82 28 -110 32 -219 35 -100 3 -141 0 -203 -16z"/>
            <path d="M3391 3720 c-40 -11 -106 -35 -146 -55 -302 -145 -461 -436 -458
            -840 1 -218 29 -323 159 -597 99 -207 172 -418 211 -608 24 -120 31 -139 61
            -172 20 -23 49 -42 71 -47 20 -5 226 -11 458 -14 418 -5 423 -5 465 16 35 18
            49 34 75 87 73 147 171 485 214 737 18 110 20 152 16 303 -8 233 -43 388 -137
            587 -81 173 -239 383 -354 469 -78 60 -201 117 -293 138 -98 22 -249 20 -342
            -4z"/>
            <path d="M1735 2509 c-203 -55 -386 -108 -405 -117 -19 -9 -45 -33 -58 -52
            -22 -32 -24 -42 -18 -115 3 -44 15 -114 26 -155 48 -168 175 -379 292 -485 90
            -81 262 -145 391 -145 73 0 219 29 276 56 159 72 251 224 251 414 0 143 -66
            366 -163 554 -62 118 -95 146 -172 145 -30 0 -198 -41 -420 -100z"/>
            <path d="M3215 1241 c-41 -17 -72 -61 -94 -133 -55 -188 -79 -389 -62 -531 25
            -213 103 -337 259 -410 59 -28 79 -32 174 -35 134 -5 228 14 341 70 124 63
            199 142 270 288 99 203 133 404 101 607 -6 38 -45 88 -84 108 -21 11 -120 18
            -391 30 -403 17 -485 18 -514 6z"/>
            </g>
        </svg>
    `,
    "Seed": `
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
            width="32px" height="32px" viewBox="0 0 512.000000 512.000000"
            preserveAspectRatio="xMidYMid meet">
            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
            fill="currentColor" stroke="none">
            <path d="M2513 5032 c-160 -298 -265 -733 -252 -1041 2 -44 2 -81 0 -81 -2 0
            -30 25 -63 55 -112 104 -325 233 -528 321 -104 44 -296 114 -315 114 -27 0
            107 -344 202 -519 62 -114 171 -274 233 -344 29 -32 51 -59 49 -61 -2 -1 -33
            -11 -69 -20 -100 -27 -279 -101 -445 -183 -82 -41 -153 -78 -158 -82 -4 -4 41
            -35 101 -69 249 -142 463 -216 654 -229 l88 -6 -32 -36 c-17 -20 -51 -77 -75
            -129 -46 -95 -116 -292 -108 -300 6 -6 122 23 235 59 111 37 258 106 326 154
            l49 35 3 -275 2 -275 150 0 150 0 0 275 c0 151 3 275 6 275 3 0 23 -14 44 -30
            63 -50 206 -118 335 -159 130 -42 224 -66 230 -59 8 8 -63 206 -108 300 -24
            52 -58 110 -76 131 l-33 37 55 0 c83 0 212 26 328 65 108 37 324 140 418 198
            l53 34 -84 45 c-168 91 -428 200 -543 229 -27 6 -52 13 -54 15 -1 1 25 35 59
            75 155 180 294 437 403 747 28 78 33 102 22 102 -19 0 -211 -70 -315 -114
            -203 -88 -417 -218 -531 -323 -31 -29 -58 -53 -61 -53 -2 0 -2 34 0 75 13 249
            -59 612 -174 883 -46 108 -115 242 -124 242 -3 0 -24 -35 -47 -78z"/>
            <path d="M945 2560 c-148 -24 -315 -98 -455 -204 -113 -84 -294 -273 -403
            -419 l-89 -117 47 -65 c232 -326 484 -544 732 -634 275 -101 571 -49 851 148
            138 98 340 308 466 484 l48 67 -88 117 c-155 207 -365 401 -540 500 -186 105
            -394 150 -569 123z"/>
            <path d="M3945 2560 c-303 -47 -610 -265 -882 -628 l-85 -112 48 -67 c181
            -253 414 -470 620 -575 339 -173 648 -142 986 102 162 116 501 508 477 552 -5
            10 -44 64 -87 121 -99 132 -284 322 -392 403 -105 79 -259 157 -364 184 -93
            24 -238 32 -321 20z"/>
            <path d="M2470 1500 c-109 -13 -190 -38 -305 -95 -205 -101 -415 -286 -593
            -523 l-93 -124 17 -26 c42 -65 180 -234 256 -313 489 -505 994 -544 1495 -116
            44 37 111 102 150 145 72 80 215 259 233 292 23 44 -284 398 -460 532 -231
            175 -475 255 -700 228z"/>
            </g>
        </svg>
    `,
    "Batch Size": `
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
        width="32px" height="32px" viewBox="0 0 512.000000 512.000000"
        preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
        fill="currentColor" stroke="none">
        <path d="M2520 4813 c-33 -6 -2374 -1050 -2422 -1079 -20 -13 -50 -45 -65 -71
        -53 -90 -30 -216 50 -277 29 -22 2332 -1254 2400 -1284 36 -15 118 -15 154 0
        69 30 2372 1262 2402 1285 50 38 85 122 78 185 -8 64 -48 132 -95 162 -71 44
        -2397 1074 -2437 1079 -22 2 -51 3 -65 0z"/>
        <path d="M118 2820 c-77 -41 -127 -138 -114 -221 9 -57 40 -114 78 -142 18
        -13 568 -309 1221 -657 1326 -707 1241 -667 1349 -618 96 45 2352 1250 2386
        1275 91 68 105 216 30 307 -44 53 -95 76 -170 76 l-63 0 -1134 -605 c-624
        -333 -1138 -605 -1142 -605 -4 0 -517 272 -1140 605 l-1134 605 -65 0 c-44 -1
        -77 -7 -102 -20z"/>
        <path d="M145 1976 c-22 -9 -59 -35 -82 -59 -84 -89 -84 -207 0 -293 34 -34
        258 -157 1177 -647 624 -332 1164 -619 1200 -637 89 -45 151 -45 240 0 36 18
        576 305 1200 637 919 490 1143 613 1177 647 86 89 84 208 -6 297 -53 54 -111
        74 -180 65 -32 -4 -351 -170 -1177 -611 l-1134 -604 -1135 605 c-1237 660
        -1184 635 -1280 600z"/>
        </g>
    </svg>
    `,
    "Denoise": `
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
        width="32px" height="32px" viewBox="0 0 1589.000000 1335.000000"
        preserveAspectRatio="xMidYMid meet">
        <g transform="translate(0.000000,1335.000000) scale(0.100000,-0.100000)"
        fill="currentColor" stroke="none">
        <path d="M2382 13329 c-471 -61 -896 -415 -1038 -864 -63 -199 -58 15 -61
        -2522 l-3 -2313 315 0 315 0 3 2273 c2 2154 4 2275 21 2331 68 226 233 389
        457 453 62 17 274 18 5554 18 5215 0 5493 -1 5554 -18 226 -62 388 -221 459
        -447 15 -51 17 -225 19 -2332 l3 -2278 315 0 315 0 0 2279 c0 2002 -2 2289
        -15 2367 -44 254 -159 484 -334 667 -175 183 -386 303 -651 370 l-85 22 -5540
        1 c-3047 1 -5568 -2 -5603 -7z"/>
        <path d="M5090 11755 l0 -315 315 0 315 0 0 315 0 315 -315 0 -315 0 0 -315z"/>
        <path d="M9537 11433 c-4 -3 -7 -147 -7 -320 l0 -313 320 0 320 0 -2 318 -3
        317 -311 3 c-171 1 -313 -1 -317 -5z"/>
        <path d="M2550 10485 l0 -315 315 0 315 0 0 315 0 315 -315 0 -315 0 0 -315z"/>
        <path d="M6360 10485 l0 -315 315 0 315 0 0 315 0 315 -315 0 -315 0 0 -315z"/>
        <path d="M12070 10485 l0 -315 320 0 320 0 0 315 0 315 -320 0 -320 0 0 -315z"/>
        <path d="M4450 9215 l0 -315 320 0 320 0 0 315 0 315 -320 0 -320 0 0 -315z"/>
        <path d="M8260 9215 l0 -315 320 0 320 0 0 315 0 315 -320 0 -320 0 0 -315z"/>
        <path d="M10170 8580 l0 -320 315 0 315 0 0 320 0 320 -315 0 -315 0 0 -320z"/>
        <path d="M10 6675 l0 -315 635 0 635 0 3 -2632 3 -2633 21 -85 c132 -526 521
        -896 1037 -985 79 -13 694 -15 5600 -15 6017 0 5586 -4 5778 56 375 117 700
        433 822 802 66 196 60 -53 66 2852 l5 2635 633 3 632 2 0 315 0 315 -7935 0
        -7935 0 0 -315z m2540 -635 l0 -320 315 0 315 0 2 318 3 317 632 3 633 2 2
        -317 3 -318 318 -3 317 -2 0 320 0 320 635 0 635 0 0 -635 0 -635 315 0 315 0
        2 633 3 632 318 3 317 2 0 -320 0 -320 315 0 315 0 2 318 3 317 318 3 317 2 0
        -320 0 -320 315 0 315 0 2 318 3 317 633 3 632 2 0 -320 0 -320 320 0 320 0 0
        320 0 320 633 -2 632 -3 3 -317 2 -318 315 0 315 0 2 318 3 317 315 0 315 0 3
        -632 2 -633 -317 -2 -318 -3 -3 -317 -2 -318 320 0 320 0 0 -635 0 -635 -320
        0 -320 0 0 -315 0 -315 320 0 320 0 0 -659 c0 -747 -1 -758 -71 -901 -58 -117
        -162 -221 -279 -279 -131 -64 -186 -71 -581 -71 l-339 0 0 320 0 320 -320 0
        -320 0 0 -320 0 -320 -315 0 -315 0 0 320 0 320 315 0 315 0 0 315 0 315 -635
        0 -635 0 0 -635 0 -635 -315 0 -315 0 0 320 0 320 -320 0 -320 0 0 -320 0
        -320 -632 2 -633 3 0 315 0 315 633 3 632 2 0 635 0 635 -315 0 -315 0 0 -320
        0 -320 -320 0 -320 0 0 320 0 320 -315 0 -315 0 0 -635 0 -635 -320 0 -320 0
        0 -320 0 -320 -632 2 -633 3 -3 317 -2 318 -315 0 -315 0 0 -320 0 -320 -635
        0 -635 0 0 320 0 320 315 0 315 0 0 635 0 635 -315 0 -315 0 0 -320 0 -320
        -320 0 -320 0 0 -636 0 -636 -372 5 c-406 4 -421 6 -543 66 -191 96 -329 293
        -343 493 l-5 78 317 0 316 0 0 315 0 315 -317 2 -318 3 -3 633 -2 632 320 0
        320 0 0 320 0 320 -320 0 -320 0 2 633 3 632 318 3 317 2 0 315 0 315 -317 2
        -318 3 -3 305 c-1 168 0 310 3 317 3 10 75 13 320 13 l315 0 0 -320z"/>
        <path d="M3180 5405 l0 -315 -315 0 -315 0 0 -635 0 -635 315 0 315 0 0 -320
        0 -320 -315 0 -315 0 0 -635 0 -635 315 0 315 0 2 318 3 317 318 3 317 2 0
        635 0 635 -320 0 -320 0 0 315 0 315 635 0 635 0 0 -315 0 -315 320 0 320 0 0
        -320 0 -320 -320 0 -320 0 0 -315 0 -315 320 0 320 0 0 -320 0 -320 315 0 315
        0 0 -315 0 -315 635 0 635 0 0 635 0 635 -315 0 -315 0 0 315 0 315 -320 0
        -320 0 0 635 0 635 -635 0 -635 0 0 320 0 320 -315 0 -315 0 0 315 0 315 -320
        0 -320 0 0 -315z m2540 -2540 l0 -315 320 0 320 0 0 -320 0 -320 -320 0 -320
        0 0 320 0 320 -315 0 -315 0 0 315 0 315 315 0 315 0 0 -315z"/>
        <path d="M5090 5405 l0 -315 315 0 315 0 0 315 0 315 -315 0 -315 0 0 -315z"/>
        <path d="M9530 5405 l0 -315 -1270 0 -1270 0 0 -320 0 -320 -315 0 -315 0 0
        -315 0 -315 315 0 315 0 0 -320 0 -320 635 0 635 0 0 -315 0 -315 320 0 320 0
        0 315 0 315 -320 0 -320 0 0 320 0 320 320 0 320 0 0 315 0 315 315 0 315 0 0
        320 0 320 635 0 635 0 0 -635 0 -635 -632 -2 -633 -3 -3 -632 -2 -633 320 0
        320 0 0 -320 0 -320 315 0 315 0 0 320 0 320 635 0 635 0 0 -320 0 -320 320 0
        320 0 0 -315 0 -315 315 0 315 0 0 635 0 635 -635 0 -635 0 0 635 0 635 320 0
        320 0 0 -320 0 -320 315 0 315 0 0 320 0 320 -315 0 -315 0 0 315 0 315 -320
        0 -320 0 0 320 0 320 320 0 320 0 0 315 0 315 -320 0 -320 0 0 -315 0 -315
        -635 0 -635 0 0 315 0 315 -635 0 -635 0 0 -315z m-1270 -1270 l0 -315 -635 0
        -635 0 0 315 0 315 635 0 635 0 0 -315z m3810 0 l0 -315 -315 0 -315 0 0 -320
        0 -320 -320 0 -320 0 0 -315 0 -315 -315 0 -315 0 0 315 0 315 315 0 315 0 0
        320 0 320 320 0 320 0 0 315 0 315 315 0 315 0 0 -315z"/>
        </g>
        </svg>

    `,    
};

function updateElementsWithIcons(containerId, iconList, addIcon = true, mode = "replace") {
    const validModes = ["add", "replace"];
    if (!validModes.includes(mode)) {
      console.error(`Invalid mode "${mode}". Expected "add" or "replace".`);
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container with id "${containerId}" not found.`);
      return;
    }

    const childDivs = container.querySelectorAll("div");
    const idSet = new Set();
    childDivs.forEach(div => {
      if (div.id) {
        if (idSet.has(div.id)) {
          console.warn(`Duplicate ID "${div.id}" found within the container. IDs should be unique.`);
        } else {
          idSet.add(div.id);
        }
      }
    });

    childDivs.forEach(function(div) {
      const labelOrSpan = div.querySelector("label, span");
      if (labelOrSpan) {
        const text = labelOrSpan.textContent.trim();

        if (iconList[text]) {
          if (addIcon) {
            if (mode.toLowerCase() === "add") {
              const iconTextContainer = document.createElement("span");
              iconTextContainer.classList.add("icon-text");

              const iconSpan = document.createElement("span");
              iconSpan.innerHTML = iconList[text];
              iconSpan.classList.add("icon");
              iconSpan.setAttribute('aria-hidden', 'true');

              const textSpan = document.createElement("span");
              textSpan.textContent = text;

              iconTextContainer.appendChild(iconSpan);
              iconTextContainer.appendChild(textSpan);

              labelOrSpan.innerHTML = '';
              labelOrSpan.appendChild(iconTextContainer);

              labelOrSpan.setAttribute('aria-label', text);
            } else if (mode.toLowerCase() === "replace") {
              labelOrSpan.innerHTML = iconList[text];
              labelOrSpan.setAttribute('aria-label', text);
            }
          } else {
          }
        }
      }
    });
}
