import { PreferencesManager } from '/core/js/common/scripts/preferences.js';
import ThemeManager from '/core/js/common/scripts/ThemeManager.js';
import injectStylesheet from '/core/js/common/scripts/injectStylesheet.js';

let allFlows = [];
let categories = [];
let selectedCategories = new Set();
let hideDescriptions = false;
let hideTitles = false;
let favorites = new Set();
let favoritesFilterActive = false;
const FAVORITES_KEY = 'FlowFavorites';
const openInNewTab = false;
const priorityFlowIds = [
    'flupdate',
    'fltuts',
    'flbsdt2i',
    'flbsdi2i',
    'flbfxdt2i',
    'flbfxdi2i',
    'flbfxst2i',
]; 
const categoryKeywords = [
    'Base',
    'Stable Diffusion',
    'Flux',
    'Image to Image',
    'Image to Video',
    'Video',
    'Image',
    'Flux Dev',
    'Schnell',
    'GGUF',
    'Pulid',
    'CogVideoX',
];
const defaultPreferences = {
    selectedCategories: [],
    favoritesFilterActive: false,
    hideDescriptions: false,
    hideTitles: false,
    sortValue: 'nameAsc',
    selectedTheme: null // Will be set by ThemeManager
};
// injectStylesheet('/flow/css/main.css', 'main');
// injectStylesheet('/core/css/themes.css', 'themes-stylesheet');
const preferencesManager = new PreferencesManager(defaultPreferences);
// const themeManager = new ThemeManager(preferencesManager);
// themeManager.init();
// themeManager.addMenu();

function loadFavorites() {
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (storedFavorites) {
        try {
            const parsedFavorites = JSON.parse(storedFavorites);
            favorites = new Set(parsedFavorites);
        } catch (e) {
            console.error('Error parsing favorites from localStorage:', e);
            favorites = new Set();
        }
    }
}

function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

function isFavorited(flowId) {
    return favorites.has(flowId);
}

function toggleFavorite(flowId, button) {
    if (favorites.has(flowId)) {
        favorites.delete(flowId);
        button.classList.remove('favorited');
        button.innerHTML = '<i class="far fa-star"></i>';
    } else {
        favorites.add(flowId);
        button.classList.add('favorited');
        button.innerHTML = '<i class="fas fa-star"></i>';
    }
    saveFavorites();
    animateFlowReorder();
}

const createElement = (type, className, textContent = '') => {
    const element = document.createElement(type);
    element.className = className;
    element.textContent = textContent;
    return element;
};

function createFlowCard(flow) {
    const card = createElement('a', 'flow-card');
    card.href = `flow/${flow.url}`;
   
    if (openInNewTab) {
        card.target = "_blank";
        card.rel = "noopener noreferrer";
    }

    let thumbnailUrl = `flow/${flow.url}/media/thumbnail.jpg`;
    let defaultThumbnail = '../core/media/ui/flow_logo.png';

    const favoriteButton = document.createElement('button');
    favoriteButton.classList.add('favorite-button');
    favoriteButton.innerHTML = isFavorited(flow.id) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    if (isFavorited(flow.id)) {
        favoriteButton.classList.add('favorited');
    }

    favoriteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(flow.id, favoriteButton);
    });

    card.innerHTML = `
        <img src="${thumbnailUrl}" alt="${flow.name} Thumbnail" onerror="this.onerror=null; this.src='${defaultThumbnail}';">
        <div class="flow-card-content">
            <h3 class="flow-title">${flow.name}</h3>
            <p class="flow-description">${flow.description}</p>
        </div>
    `;

    card.appendChild(favoriteButton);

    // Attach a unique identifier to the card for animation purposes
    card.dataset.flowId = flow.id;

    return card;
}

function extractCategories(name) {
    const categories = new Set();
    const words = name.split(/[\s-]+/);
    
    for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j <= words.length; j++) {
            const phrase = words.slice(i, j).join(' ');
            if (categoryKeywords.includes(phrase)) {
                categories.add(phrase);
            }
        }
    }

    words.forEach(word => {
        if (categoryKeywords.includes(word)) {
            categories.add(word);
        }
    });

    if (categories.size === 0) {
        categories.add('Other');
    }

    return Array.from(categories);
}

function assignCategories(flows) {
    return flows.map(flow => {
        flow.categories = extractCategories(flow.name);
        return flow;
    });
}

function updateGlobalCategories(flows) {
    const categoriesSet = new Set();
    flows.forEach(flow => {
        flow.categories.forEach(category => categoriesSet.add(category));
    });
    
    categories = categoryKeywords.filter(keyword => categoriesSet.has(keyword));
    
    Array.from(categoriesSet).forEach(category => {
        if (!categories.includes(category)) {
            categories.push(category);
        }
    });
    
    return categories;
}

export async function loadFlows() {
    try {
        const response = await fetch('/api/apps');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allFlows = await response.json();
        allFlows = assignCategories(allFlows);
        categories = updateGlobalCategories(allFlows);
        updateFilterMenu();
        renderFlows(filterCurrentFlows());
    } catch (error) {
        console.error('Error fetching flows:', error);
    }
}

function createToggleButtons() {
    const controlsDiv = document.querySelector('.controls');
    const descToggle = createElement('button', 'toggle-button');
    descToggle.id = 'descToggle';
    descToggle.innerHTML = '<i class="fas fa-bug-slash"></i>';
    descToggle.title = 'Hide Descriptions';
    
    const titleToggle = createElement('button', 'toggle-button');
    titleToggle.id = 'titleToggle';
    titleToggle.innerHTML = '<i class="fas fa-ghost"></i>';
    titleToggle.title = 'Hide Titles';
    
    controlsDiv.appendChild(descToggle);
    controlsDiv.appendChild(titleToggle);
    
    const favoritesToggle = createElement('button', 'toggle-button');
    favoritesToggle.id = 'favoritesToggle';
    favoritesToggle.innerHTML = '<i class="fas fa-star"></i>';
    favoritesToggle.title = 'Show Favorites';
    
    controlsDiv.appendChild(favoritesToggle);
    
    descToggle.addEventListener('click', () => toggleDescriptions(descToggle));
    titleToggle.addEventListener('click', () => toggleTitles(titleToggle, descToggle));
    favoritesToggle.addEventListener('click', () => toggleFavoritesFilter(favoritesToggle));
    
    hideDescriptions = preferencesManager.get('hideDescriptions');
    hideTitles = preferencesManager.get('hideTitles');
    favoritesFilterActive = preferencesManager.get('favoritesFilterActive');
    descToggle.classList.toggle('active', hideDescriptions);
    descToggle.title = hideDescriptions ? 'Show Descriptions' : 'Hide Descriptions';
    titleToggle.classList.toggle('active', hideTitles);
    titleToggle.title = hideTitles ? 'Show Titles' : 'Hide Titles';
    favoritesToggle.classList.toggle('active', favoritesFilterActive);
    favoritesToggle.title = favoritesFilterActive ? 'Show All Flows' : 'Show Favorites';
}

function toggleFavoritesFilter(button) {
    favoritesFilterActive = !favoritesFilterActive;
    preferencesManager.set('favoritesFilterActive', favoritesFilterActive);
    button.classList.toggle('active', favoritesFilterActive);
    button.title = favoritesFilterActive ? 'Show All Flows' : 'Show Favorites';
    renderFlows(filterCurrentFlows());
}

function toggleDescriptions(button) {
    if (hideTitles) {
        return;
    }
    hideDescriptions = !hideDescriptions;
    preferencesManager.set('hideDescriptions', hideDescriptions);
    button.classList.toggle('active', hideDescriptions);
    button.title = hideDescriptions ? 'Show Descriptions' : 'Hide Descriptions';
    updateFlowCardVisibility();
}

function toggleTitles(button, descButton) {
    hideTitles = !hideTitles;
    preferencesManager.set('hideTitles', hideTitles);
    button.classList.toggle('active', hideTitles);
    button.title = hideTitles ? 'Show Titles' : 'Hide Titles';
    
    if (hideTitles) {
        hideDescriptions = true;
        preferencesManager.set('hideDescriptions', hideDescriptions);
        descButton.classList.add('active');
        descButton.title = 'Show Descriptions';
        descButton.disabled = true;
        descButton.style.cursor = 'not-allowed';
    } else {
        descButton.disabled = false;
        descButton.style.cursor = 'pointer';
        descButton.classList.toggle('active', hideDescriptions);
        descButton.title = hideDescriptions ? 'Show Descriptions' : 'Hide Descriptions';
    }
    
    updateFlowCardVisibility();
}

function updateFlowCardVisibility() {
    const flowCards = document.querySelectorAll('.flow-card');
    flowCards.forEach(card => {
        const title = card.querySelector('.flow-title');
        const description = card.querySelector('.flow-description');
        
        if (title) title.style.display = hideTitles ? 'none' : 'block';
        if (description) description.style.display = (hideTitles || hideDescriptions) ? 'none' : 'block';
    });
}

function filterCurrentFlows() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const sortValue = preferencesManager.get('sortValue') || 'nameAsc';
    let filteredFlows = filterFlows(allFlows, searchTerm, selectedCategories);
    
    if (favoritesFilterActive) {
        filteredFlows = filteredFlows.filter(flow => isFavorited(flow.id));
    }
    
    filteredFlows = sortFlows(filteredFlows, sortValue);
    return filteredFlows;
}

function renderFlows(flows) {
    const flowGrid = document.getElementById('flowGrid');
    flowGrid.innerHTML = '';
    flows.forEach(flow => {
        if (flow.id !== 'menu') {
            const flowCard = createFlowCard(flow);
            flowGrid.appendChild(flowCard);
        }
    });
    updateFlowCardVisibility();
}

function animateFlowReorder() {
    const flowGrid = document.getElementById('flowGrid');
    const oldPositions = new Map();
    Array.from(flowGrid.children).forEach(card => {
        const rect = card.getBoundingClientRect();
        oldPositions.set(card.dataset.flowId, rect);
    });

    renderFlows(filterCurrentFlows());

    Array.from(flowGrid.children).forEach(card => {
        const oldRect = oldPositions.get(card.dataset.flowId);
        const newRect = card.getBoundingClientRect();

        const deltaX = oldRect.left - newRect.left;
        const deltaY = oldRect.top - newRect.top;
        card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        card.offsetHeight;
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = '';
    });

    setTimeout(() => {
        Array.from(flowGrid.children).forEach(card => {
            card.style.transition = '';
            card.style.transform = '';
        });
    }, 500);
}

export async function showVersion() {
    try {
        const response = await fetch('/api/flow-version');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const versionData = await response.json();
        document.getElementById('copyright').innerText = versionData.version;
    } catch (error) {
        console.error('Error fetching version:', error);
        document.getElementById('copyright').innerText = 'Error fetching version';
    }
}

export function initializeMenu() {
    const categoryElements = document.querySelectorAll('.menu-category > span');
    categoryElements.forEach(category => {
        category.addEventListener('click', () => {
            const submenu = category.nextElementSibling;
            submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
        });
    });
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(() => {
        const filteredFlows = filterCurrentFlows();
        renderFlows(filteredFlows);
    }, 300));
    
    const initialSearchTerm = searchInput.value.toLowerCase();
    if (initialSearchTerm) {
        renderFlows(filterCurrentFlows());
    }
}

function initializeSorting() {
    const sortSelect = document.getElementById('sortSelect');
    const savedSortValue = preferencesManager.get('sortValue') || 'nameAsc';
    sortSelect.value = savedSortValue;
    
    sortSelect.addEventListener('change', () => {
        const newSortValue = sortSelect.value;
        preferencesManager.set('sortValue', newSortValue);
        const filteredFlows = filterCurrentFlows();
        renderFlows(filteredFlows);
    });
}

function sortFlows(flows, sortValue) {
    let sortedFlows = [...flows];
    
    switch(sortValue) {
        case 'nameAsc':
            sortedFlows.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'nameDesc':
            sortedFlows.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'categoryAsc':
            sortedFlows.sort((a, b) => {
                const catA = a.categories[0];
                const catB = b.categories[0];
                const indexA = categories.indexOf(catA);
                const indexB = categories.indexOf(catB);
                return indexA - indexB || a.name.localeCompare(b.name);
            });
            break;
        case 'categoryDesc':
            sortedFlows.sort((a, b) => {
                const catA = a.categories[0];
                const catB = b.categories[0];
                const indexA = categories.indexOf(catA);
                const indexB = categories.indexOf(catB);
                return indexB - indexA || a.name.localeCompare(b.name);
            });
            break;
    }

    const topPriorityIds = ['flupdate', 'fltuts'];
    const topPriorityFlows = [];
    const remainingFlows = [];

    sortedFlows.forEach(flow => {
        if (topPriorityIds.includes(flow.id)) {
            topPriorityFlows.push(flow);
        } else {
            remainingFlows.push(flow);
        }
    });

    const favoriteFlows = [];
    const nonFavoriteFlows = [];

    remainingFlows.forEach(flow => {
        if (isFavorited(flow.id)) {
            favoriteFlows.push(flow);
        } else {
            nonFavoriteFlows.push(flow);
        }
    });

    const otherPriorityIds = priorityFlowIds.filter(id => !topPriorityIds.includes(id));
    const otherPriorityFlows = [];
    const restFlows = [];

    nonFavoriteFlows.forEach(flow => {
        if (otherPriorityIds.includes(flow.id)) {
            otherPriorityFlows.push(flow);
        } else {
            restFlows.push(flow);
        }
    });

    otherPriorityFlows.sort((a, b) => {
        return otherPriorityIds.indexOf(a.id) - otherPriorityIds.indexOf(b.id);
    });

    sortedFlows = [...topPriorityFlows, ...favoriteFlows, ...otherPriorityFlows, ...restFlows];

    return sortedFlows;
}

function updateFilterMenu() {
    const filterContent = document.getElementById('filterContent');
    filterContent.innerHTML = '';
    categories.forEach(category => {
        const tag = createElement('div', 'category-tag', category);
        if (preferencesManager.get('selectedCategories').includes(category)) {
            selectedCategories.add(category);
            tag.classList.add('selected');
        }
        tag.addEventListener('click', () => toggleCategory(category, tag));
        filterContent.appendChild(tag);
    });
}

function toggleCategory(category, tag) {
    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
        tag.classList.remove('selected');
    } else {
        selectedCategories.add(category);
        tag.classList.add('selected');
    }
    preferencesManager.set('selectedCategories', Array.from(selectedCategories));
    const filteredFlows = filterCurrentFlows();
    renderFlows(filteredFlows);
}

function filterFlows(flows, searchTerm, selectedCategories) {
    return flows.filter(flow => 
        (flow.name.toLowerCase().includes(searchTerm) || 
         flow.description.toLowerCase().includes(searchTerm) ||
         flow.categories.some(category => category.toLowerCase().includes(searchTerm))) &&
        (selectedCategories.size === 0 || flow.categories.some(category => selectedCategories.has(category)))
    );
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initializeFilterMenu() {
    const filterButton = document.getElementById('filterButton');
    const filterContent = document.getElementById('filterContent');

    filterButton.addEventListener('click', () => {
        filterContent.classList.toggle('show');
        filterButton.classList.toggle('active');
    });

    window.addEventListener('click', (event) => {
        if (!event.target.matches('.filter-button') && !event.target.closest('.filter-content')) {
            filterContent.classList.remove('show');
            filterButton.classList.remove('active');
        }
    });

    const initialSelectedCategories = preferencesManager.get('selectedCategories');
    if (Array.isArray(initialSelectedCategories)) {
        initialSelectedCategories.forEach(category => {
            selectedCategories.add(category);
            const tag = Array.from(document.querySelectorAll('.category-tag')).find(tag => tag.textContent === category);
            if (tag) tag.classList.add('selected');
        });
    }
}

export function initializeUI() {
    loadFavorites();
    initializeMenu();
    initializeSearch();
    initializeSorting();
    initializeFilterMenu();
    createToggleButtons();
    loadFlows();
    showVersion();
}

const styleElement = document.createElement('style');
styleElement.textContent = `
.flow-card {
    transition: transform 0.5s ease;
}
`;
document.head.appendChild(styleElement);
