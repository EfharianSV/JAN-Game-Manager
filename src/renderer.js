// --- GLOBAL STATE ---
let currentCategory = 'All';
let selectedWishlistPath = null;
let isEditingCategory = false; // Flag to prevent double-opening
let currentSort = 'name'; // Default
let currentWishlistSort = 'name';

// --- DOM ELEMENTS ---
const gameListElement = document.getElementById('game-list');
const wishlistListElement = document.getElementById('wishlist-list');
const localFileLabel = document.getElementById('local-file-label');

// --- HELPER: REFRESH EVERYTHING ---
async function refreshLibrary() {
    // Don't refresh if we are in the middle of typing a category!
    if (isEditingCategory) return; 
    
    const data = await window.api.getGames();
    
    // 1. Update Categories
    renderCategories(data.categories || []);
    
    // 2. Update Installed Games
    renderGameList(data.installed);
    
    // 3. NEW: Update Wishlist (This was missing!)
    renderWishlist(data.wishlist);
}

// --- CORE FUNCTION: SHOW CATEGORY INPUT ---
function showCategoryInput() {
    if (isEditingCategory) return; // Block duplicates
    isEditingCategory = true;

    const container = document.getElementById('category-bar');
    const addBtn = document.querySelector('.cat-add-btn');
    
    if (!addBtn) return;

    // 1. Create Input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'category-input';
    input.placeholder = 'Name...';
    
    // 2. Hide Button, Insert Input
    addBtn.style.display = 'none';
    // Insert input right where the button is
    addBtn.parentNode.insertBefore(input, addBtn);

    // 3. Logic to Close/Save
    const closeInput = async (shouldSave) => {
        // Remove event listeners to prevent loops
        document.removeEventListener('click', outsideClickListener);
        
        if (shouldSave && input.value.trim()) {
            await window.api.addCategory(input.value.trim());
        }
        
        // Cleanup DOM
        input.remove();
        addBtn.style.display = 'flex'; // Show button again
        isEditingCategory = false;
        
        // Refresh to show changes
        refreshLibrary();
    };

    // 4. Handle Keys (Enter/Esc)
    input.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') closeInput(true); 
        if (e.key === 'Escape') closeInput(false); 
        e.stopPropagation(); // Keep typing inside the box
    });

    // 5. Handle Outside Clicks (The "Blur" replacement)
    // We wait 10ms to attach this so the initial click doesn't trigger it
    setTimeout(() => {
        document.addEventListener('click', outsideClickListener);
    }, 10);

    function outsideClickListener(e) {
        // If clicking inside the input, do nothing
        if (e.target === input) return;
        // If clicking anywhere else, save and close
        closeInput(true);
    }

    // 6. FORCE FOCUS (The Bug Fix)
    // We use requestAnimationFrame to wait for the browser to paint the new input
    requestAnimationFrame(() => {
        input.focus();
    });
}

// --- 1. RENDER CATEGORIES (Top Bar) ---
function renderCategories(categories = []) {
    const container = document.getElementById('category-bar');
    
    // If we are editing, don't redraw the bar, or we lose the input!
    if (isEditingCategory) return;

    container.innerHTML = '';

    // "All Games" Pill
    const allBtn = document.createElement('div');
    allBtn.className = `cat-pill ${currentCategory === 'All' ? 'active' : ''}`;
    allBtn.innerText = 'All Games';
    allBtn.onclick = () => { currentCategory = 'All'; refreshLibrary(); };
    container.appendChild(allBtn);

    // User Category Pills
    categories.forEach(cat => {
        const btn = document.createElement('div');
        btn.className = `cat-pill ${currentCategory === cat ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => { currentCategory = cat; refreshLibrary(); };
        
        btn.oncontextmenu = async (e) => {
            e.preventDefault();
            if(confirm(`Delete category "${cat}"?`)) {
                const data = await window.api.deleteCategory(cat);
                currentCategory = 'All';
                renderCategories(data.categories);
                renderGameList(data.installed);
            }
        };
        container.appendChild(btn);
    });

    // (+) Button
    const addBtn = document.createElement('button');
    addBtn.className = 'cat-add-btn';
    addBtn.innerText = '+';
    addBtn.onclick = (e) => {
        e.stopPropagation(); // Stop bubbling
        showCategoryInput();
    };
    container.appendChild(addBtn);
}

// --- 2. RENDER GAME LIBRARY ---
function renderGameList(allGames) {
    gameListElement.innerHTML = '';

    // 1. FILTER
    let gamesToShow = allGames.filter(game => {
        if (currentCategory === 'All') return true;
        return game.category === currentCategory;
    });

    // 2. SORT (Favorites First + Selected Sort)
    gamesToShow.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        if (currentSort === 'name') {
            return a.name.localeCompare(b.name);
        } else if (currentSort === 'dateAdded') {
            return new Date(b.added) - new Date(a.added);
        } else if (currentSort === 'lastPlayed') {
            const timeA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
            const timeB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
            return timeB - timeA;
        }
    });

    if (gamesToShow.length === 0) {
        gameListElement.innerHTML = `<p style="color:#666; width:100%; padding:20px;">No games found in "${currentCategory}"</p>`;
        return;
    }

    gamesToShow.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        if (game.isFavorite) card.classList.add('is-favorite');
        
        // Background
        if (game.image) {
            const imageUrl = game.image.startsWith('data:') ? game.image : game.image.replace(/\\/g, '/');
            card.style.backgroundImage = `url('${imageUrl}')`;
            card.style.backgroundSize = '100px'; 
            card.style.backgroundRepeat = 'no-repeat';
            card.style.backgroundPosition = 'center 35%'; 
            card.style.backgroundColor = '#000'; 
        }

        // Fav Marker
        if (game.isFavorite) {
            const star = document.createElement('div');
            star.className = 'fav-marker';
            star.innerHTML = '★';
            card.appendChild(star);
        }

        // --- TOOLS ---
        const toolsContainer = document.createElement('div');
        toolsContainer.className = 'card-tools';
        // Minor visual tweak: reduce gap slightly to fit 5 buttons comfortably
        toolsContainer.style.gap = '3px'; 

        // 1. FAVORITE
        const favBtn = document.createElement('button');
        favBtn.className = game.isFavorite ? 'tool-btn favorite' : 'tool-btn';
        favBtn.innerHTML = '★'; 
        favBtn.title = "Favorite";
        favBtn.onclick = async (e) => {
            e.stopPropagation();
            game.isFavorite = !game.isFavorite; 
            await window.api.updateGame(game);
            refreshLibrary(); 
        };
        toolsContainer.appendChild(favBtn);

        // 2. CATEGORY (New Icon: Tag)
        const catBtn = document.createElement('button');
        catBtn.className = 'tool-btn';
        catBtn.innerHTML = '🏷️'; // Changed from Folder to Tag
        catBtn.title = "Set Category";
        catBtn.onclick = async (e) => {
            e.stopPropagation();
            const existing = document.querySelector('.context-menu');
            if(existing) existing.remove();

            const menu = document.createElement('div');
            menu.className = 'context-menu';
            
            const data = await window.api.getGames();
            const cats = data.categories || [];

            cats.forEach(cat => {
                const item = document.createElement('button');
                item.className = 'context-item';
                item.innerText = cat;
                if (game.category === cat) item.style.color = '#4CAF50';
                item.onclick = async () => {
                    game.category = cat;
                    await window.api.updateGame(game);
                    refreshLibrary();
                    menu.remove();
                };
                menu.appendChild(item);
            });

            const createItem = document.createElement('button');
            createItem.className = 'context-item';
            createItem.innerText = "➕ Create New...";
            createItem.style.borderTop = "1px solid #333";
            createItem.onclick = (e) => {
                e.stopPropagation();
                menu.remove();
                showCategoryInput();
            };
            menu.appendChild(createItem);

            if (game.category) {
                const clearItem = document.createElement('button');
                clearItem.className = 'context-item';
                clearItem.innerText = "Remove Category";
                clearItem.style.color = "#f44336";
                clearItem.onclick = async () => {
                    game.category = null;
                    await window.api.updateGame(game);
                    refreshLibrary();
                    menu.remove();
                };
                menu.appendChild(clearItem);
            }

            document.body.appendChild(menu);
            const rect = catBtn.getBoundingClientRect();
            menu.style.left = `${rect.left}px`;
            menu.style.top = `${rect.bottom + 5}px`;

            setTimeout(() => {
                document.addEventListener('click', function closeMenu() {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }, { once: true });
            }, 10);
        };
        toolsContainer.appendChild(catBtn);

        // 3. RENAME
        const renameBtn = document.createElement('button');
        renameBtn.className = 'tool-btn';
        renameBtn.innerHTML = 'Aa';
        renameBtn.title = "Rename";
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            title.style.display = 'none';
            const input = document.createElement('input');
            input.value = game.name;
            input.style.cssText = "width:100%; background:#1a1a1a; color:white; border:1px solid #4CAF50;";
            
            const saveName = async () => {
                if(input.value.trim()){ 
                    game.name = input.value.trim(); 
                    await window.api.updateGame(game);
                    refreshLibrary();
                } else {
                    title.style.display = 'block'; input.remove();
                }
            };
            input.addEventListener('keydown', e => { if(e.key==='Enter') saveName() });
            input.addEventListener('blur', saveName);
            title.parentNode.insertBefore(input, title);
            input.focus();
        };
        toolsContainer.appendChild(renameBtn);

        // 4. IMAGE
        const imgBtn = document.createElement('button');
        imgBtn.className = 'tool-btn';
        imgBtn.innerHTML = '🖼️';
        imgBtn.title = "Change Icon";
        imgBtn.onclick = async (e) => {
            e.stopPropagation();
            const path = await window.api.selectImage();
            if(path) { game.image = path; await window.api.updateGame(game); refreshLibrary(); }
        };
        toolsContainer.appendChild(imgBtn);

        // 5. OPEN LOCATION (NEW BUTTON!)
        const locBtn = document.createElement('button');
        locBtn.className = 'tool-btn';
        locBtn.innerHTML = '📂'; // Folder Icon
        locBtn.title = "Open File Location";
        locBtn.onclick = (e) => {
            e.stopPropagation();
            window.api.showInFolder(game.path);
        };
        toolsContainer.appendChild(locBtn);

        // 6. DELETE
        const delBtn = document.createElement('button');
        delBtn.className = 'tool-btn delete';
        delBtn.innerHTML = '🗑️';
        delBtn.title = "Remove";
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if(confirm("Delete game?")) { await window.api.deleteGame(game.id); refreshLibrary(); }
        };
        toolsContainer.appendChild(delBtn);

        const bottomContainer = document.createElement('div');
        bottomContainer.className = 'card-bottom';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.innerText = game.name;

        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn-main';
        playBtn.innerText = 'PLAY';
        playBtn.onclick = () => window.api.launchGame(game.path);

        bottomContainer.appendChild(title);
        bottomContainer.appendChild(playBtn);

        card.appendChild(toolsContainer);
        card.appendChild(bottomContainer);
        gameListElement.appendChild(card);
    });
}

// --- 3. RENDER WISHLIST ---
// --- 3. RENDER WISHLIST ---
function renderWishlist(items) {
    wishlistListElement.innerHTML = '';

    // --- SORT LOGIC ---
    items.sort((a, b) => {
        // PRIORITY: Favorites First
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        // SECONDARY: Normal Sort
        if (currentWishlistSort === 'name') {
            return a.name.localeCompare(b.name);
        } else if (currentWishlistSort === 'dateAdded') {
            const dateA = a.added ? new Date(a.added).getTime() : 0;
            const dateB = b.added ? new Date(b.added).getTime() : 0;
            return dateB - dateA;
        }
    });

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'wishlist-card';
        if (item.isFavorite) card.classList.add('is-favorite');

        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.style.gap = '15px';

        // VISUAL MARKER
        const favMarker = document.createElement('span');
        favMarker.innerText = item.isFavorite ? '★ ' : '';
        favMarker.style.color = '#ffd700';

        const icon = document.createElement('span');
        icon.style.fontSize = '20px';
        if (item.localPath) icon.innerText = '📂';
        else if (item.url) icon.innerText = '🌐';
        else icon.innerText = '📝';

        const title = document.createElement('h3');
        title.className = 'wishlist-title';
        title.innerText = item.name;

        leftSide.appendChild(favMarker); // Add star before icon
        leftSide.appendChild(icon);
        leftSide.appendChild(title);

        const rightSide = document.createElement('div');
        rightSide.style.display = 'flex';
        rightSide.style.gap = '10px';

        // FAVORITE BUTTON
        const favBtn = document.createElement('button');
        favBtn.className = item.isFavorite ? 'tool-btn favorite' : 'tool-btn';
        favBtn.innerHTML = '★';
        favBtn.onclick = async () => {
            item.isFavorite = !item.isFavorite;
            await window.api.updateWishlist(item);
            refreshLibrary();
        };
        rightSide.appendChild(favBtn);

       // LINK BUTTON
        if (item.localPath || item.url) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'tool-btn';
            
            // UI FIX: Fixed width ensures the buttons align perfectly in a column
            actionBtn.style.width = '80px'; 
            actionBtn.style.padding = '0';      // Remove side padding since we have fixed width
            actionBtn.style.textAlign = 'center'; // Keep text centered
            actionBtn.style.justifyContent = 'center';
            
            if (item.localPath) {
                actionBtn.innerText = 'OPEN';
                actionBtn.style.borderColor = '#FF9800';
                actionBtn.onclick = () => window.api.showInFolder(item.localPath);
            } else {
                actionBtn.innerText = 'VISIT';
                actionBtn.style.borderColor = '#2196F3';
                actionBtn.onclick = () => window.api.openLink(item.url);
            }
            rightSide.appendChild(actionBtn);
        }

        // DELETE BUTTON
        const delBtn = document.createElement('button');
        delBtn.className = 'tool-btn delete';
        delBtn.innerHTML = '🗑️';
        delBtn.onclick = async () => {
            if(confirm(`Remove ${item.name}?`)) {
                const updatedLib = await window.api.deleteGame(item.id);
                refreshLibrary();
            }
        };
        rightSide.appendChild(delBtn);

        card.appendChild(leftSide);
        card.appendChild(rightSide);
        wishlistListElement.appendChild(card);
    });
}

// --- 4. NAVIGATION LOGIC ---
const navInstalled = document.getElementById('nav-installed');
const navWishlist = document.getElementById('nav-wishlist');
const viewInstalled = document.getElementById('view-installed');
const viewWishlist = document.getElementById('view-wishlist');
const categoryBar = document.getElementById('category-bar'); // <--- 1. Get the Bar

function switchTab(tabName) {
    // Reset Everything
    navInstalled.classList.remove('active');
    navWishlist.classList.remove('active');
    viewInstalled.style.display = 'none';
    viewWishlist.style.display = 'none';

    if (tabName === 'installed') {
        navInstalled.classList.add('active');
        viewInstalled.style.display = 'block';
        
        // SHOW CATEGORIES IN LIBRARY
        if (categoryBar) categoryBar.style.display = 'flex'; 
        
    } else if (tabName === 'wishlist') {
        navWishlist.classList.add('active');
        viewWishlist.style.display = 'block';
        
        // HIDE CATEGORIES IN WISHLIST
        if (categoryBar) categoryBar.style.display = 'none'; 
    }
}

navInstalled.addEventListener('click', () => switchTab('installed'));
navWishlist.addEventListener('click', () => switchTab('wishlist'));

// --- 5. BUTTON LISTENERS ---
const addBtn = document.getElementById('add-game-btn');
if (addBtn) {
    addBtn.addEventListener('click', async () => {
        const updatedLibrary = await window.api.addGame();
        if (updatedLibrary) refreshLibrary();
    });
}

// Sort Dropdown Listener
const sortSelect = document.getElementById('sort-select');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        refreshLibrary();
    });
}

const localFileBtn = document.getElementById('wishlist-local-btn');
if (localFileBtn) {
    localFileBtn.addEventListener('click', async () => {
        const path = await window.api.selectFile();
        if (path) {
            selectedWishlistPath = path;
            localFileLabel.innerText = path;
            localFileLabel.style.color = '#4CAF50';
        }
    });
}

const addWishBtn = document.getElementById('add-wishlist-btn');
if (addWishBtn) {
    addWishBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('wishlist-name');
        const urlInput = document.getElementById('wishlist-url');
        const name = nameInput.value;
        const url = urlInput.value;

        if (!name) return alert("Please enter a name!");

        const updatedLibrary = await window.api.addWishlist({ name, url, localPath: selectedWishlistPath });
        renderWishlist(updatedLibrary.wishlist);
        
        nameInput.value = '';
        urlInput.value = '';
        selectedWishlistPath = null;
        localFileLabel.innerText = 'No local file linked...';
        localFileLabel.style.color = '#888';
    });
}

// Wishlist Sort Listener
const wishlistSortSelect = document.getElementById('wishlist-sort-select');
if (wishlistSortSelect) {
    wishlistSortSelect.addEventListener('change', (e) => {
        currentWishlistSort = e.target.value;
        refreshLibrary(); // Re-fetches data and re-renders everything
    });
}

// --- 6. INITIALIZATION ---
async function init() {
    await refreshLibrary(); 
    const data = await window.api.getGames();
    renderWishlist(data.wishlist);
}

init();