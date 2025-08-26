document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const booksContainer = document.getElementById('booksContainer');
    const paginationContainer = document.getElementById('pagination');
    const bookForm = document.getElementById('bookForm');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loadBooksBtn = document.getElementById('loadBooksBtn');
    const aiPromptInput = document.getElementById('aiPrompt');
    const generateBtn = document.getElementById('generateBtn');
    const notificationModal = document.getElementById('notificationModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalContent = notificationModal.querySelector('.modal-content');
    const closeButton = notificationModal.querySelector('.close-button');
    const authModal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const authCloseBtn = document.querySelector('.auth-close');

    const API_URL = 'http://localhost:3000/api';
    let currentPage = 1;

    // --- Modal & Notification Logic ---
    const showNotification = (message, isError = false) => {
        const existingActions = modalContent.querySelector('.modal-actions');
        if (existingActions) existingActions.remove();
        modalMessage.textContent = message;
        modalContent.className = `modal-content ${isError ? 'error' : 'success'}`;
        notificationModal.style.display = 'block';
    };

    const showConfirmation = (message, onConfirm) => {
        showNotification(message, true);
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        actions.innerHTML = `<button class="modal-btn confirm">Yes, Delete</button><button class="modal-btn cancel">Cancel</button>`;
        modalContent.appendChild(actions);

        actions.querySelector('.confirm').onclick = () => {
            onConfirm();
            hideNotification();
        };
        actions.querySelector('.cancel').onclick = hideNotification;
    };

    const hideNotification = () => notificationModal.style.display = 'none';
    closeButton.addEventListener('click', hideNotification);
    window.addEventListener('click', e => e.target === notificationModal && hideNotification());

    // --- API Helper ---
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'An API error occurred.');
        return data;
    };

    // --- Auth State & Logic ---
    const updateAuthState = () => {
        const token = localStorage.getItem('token');
        const isLoggedIn = !!token;
        // loginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
        // logoutBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
        loadAndRenderBooks(); // Re-render books to show/hide admin controls
    };

    const handleAuth = async (endpoint, username, password) => {
        try {
            const data = await fetchWithAuth(`${API_URL}/auth/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            localStorage.setItem('token', data.token);
            showNotification(`Successfully ${endpoint === 'login' ? 'logged in' : 'registered'}!`);
            authModal.style.display = 'none';
            updateAuthState();
        } catch (error) {
            showNotification(error.message, true);
        }
    };

    // --- Book Rendering ---
    const renderBook = (book, isLoggedIn) => {
        const adminControls = isLoggedIn ? `
            <div class="admin-controls">
                <div class="copy-control">
                    <label>Available Copies:</label>
                    <div class="copy-actions">
                        <button class="copy-btn decrement" aria-label="Decrease copies">-</button>
                        <span class="copy-count">${book.availableCopies} / ${book.totalCopies}</span>
                        <button class="copy-btn increment" aria-label="Increase copies">+</button>
                    </div>
                </div>
                <div class="ebook-control">
                    <label>E-Book:</label>
                    <button class="ebook-toggle ${book.hasEbook ? 'active' : ''}">${book.hasEbook ? 'Available' : 'N/A'}</button>
                </div>
            </div>
            <button class="make-unavailable-btn ${book.availableCopies > 0 ? '' : 'disabled'}" ${book.availableCopies === 0 ? 'disabled' : ''}>Make All Unavailable</button>
            <button class="delete-btn"><i class="fas fa-trash-alt"></i> Delete Book</button>
        ` : '';

        return `
            <div class="book-card" data-book-id="${book._id}">
                <div class="book-content">
                    <h4>${book.title}</h4>
                    <p><strong>Author:</strong> ${book.author}</p>
                    <p><strong>Publisher:</strong> ${book.publisher || 'N/A'}</p>
                    <p><strong>ISBN:</strong> ${book.isbn || 'N/A'}</p>
                    ${adminControls}
                </div>
            </div>
        `;
    };

    const loadAndRenderBooks = async (page = currentPage, searchTerm = searchInput.value.trim()) => {
        const isLoggedIn = !!localStorage.getItem('token');
        showLoader(booksContainer);
        try {
            const url = new URL(`${API_URL}/books`);
            url.searchParams.append('page', page);
            url.searchParams.append('limit', 6);
            // *** THE FIX IS HERE ***
            // Only add the search parameter if the searchTerm is not an empty string.
            if (searchTerm) {
                url.searchParams.append('search', searchTerm);
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Could not fetch books.');
            const { success, books, totalPages } = await res.json();
            
            if (success) {
                booksContainer.innerHTML = books.length ? books.map(book => renderBook(book, isLoggedIn)).join('') : '<p>No books found.</p>';
                renderPagination(totalPages, page);
                currentPage = page;
            }
        } catch (error) {
            showNotification(error.message, true);
            booksContainer.innerHTML = '<p>Error loading books.</p>';
        }
    };

    // --- Event Delegation for Book Actions ---
    booksContainer.addEventListener('click', async e => {
        const card = e.target.closest('.book-card');
        if (!card) return;
        const id = card.dataset.bookId;
        let action;

        if (e.target.matches('.increment')) action = 'increment';
        if (e.target.matches('.decrement')) action = 'decrement';
        if (e.target.matches('.make-unavailable-btn')) action = 'setZero';
        
        if (action) {
            try {
                await fetchWithAuth(`${API_URL}/books/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ action }) });
                loadAndRenderBooks();
            } catch (error) { showNotification(error.message, true); }
        }

        if (e.target.matches('.ebook-toggle')) {
            try {
                await fetchWithAuth(`${API_URL}/books/${id}/ebook`, { method: 'PATCH' });
                loadAndRenderBooks();
            } catch (error) { showNotification(error.message, true); }
        }

        if (e.target.closest('.delete-btn')) {
            showConfirmation('Are you sure you want to delete this book?', async () => {
                try {
                    await fetchWithAuth(`${API_URL}/books/${id}`, { method: 'DELETE' });
                    showNotification('Book deleted successfully!');
                    loadAndRenderBooks();
                } catch (error) {
                    showNotification(error.message, true);
                }
            });
        }
    });

    // --- Other Event Listeners ---
    const showLoader = container => container.innerHTML = '<div class="loader"></div>';

    const renderPagination = (totalPages, page) => {
        let html = '';
        if (page > 1) html += `<button data-page="${page - 1}">&laquo; Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        if (page < totalPages) html += `<button data-page="${page + 1}">Next &raquo;</button>`;
        paginationContainer.innerHTML = html;
    };
    
    paginationContainer.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            loadAndRenderBooks(parseInt(e.target.dataset.page));
        }
    });

    bookForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(bookForm);
        const bookData = Object.fromEntries(formData.entries());
        bookData.tags = bookData.tags.split(',').map(t => t.trim()).filter(Boolean);
        ['publishedYear', 'pages', 'totalCopies', 'availableCopies'].forEach(f => bookData[f] = parseInt(bookData[f]));
        bookData.rating = parseFloat(bookData.rating);

        try {
            const result = await fetchWithAuth(`${API_URL}/books`, { method: 'POST', body: JSON.stringify(bookData) });
            showNotification(result.message || 'Book added!', !result.success);
            if (result.success) {
                bookForm.reset();
                loadAndRenderBooks(1);
            }
        } catch(error) {
            showNotification(error.message, true);
        }
    });

    generateBtn.addEventListener('click', async () => {
        const prompt = aiPromptInput.value.trim();
        if (!prompt) return showNotification('Please enter a prompt.', true);
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        try {
            const result = await fetchWithAuth(`${API_URL}/ai/generate-book`, { method: 'POST', body: JSON.stringify({ userPrompt: prompt }) });
            Object.keys(result.data).forEach(key => {
                const el = document.getElementById(key);
                if (el) el.value = Array.isArray(result.data[key]) ? result.data[key].join(', ') : result.data[key];
            });
            showNotification('Form populated by AI!');
        } catch (error) {
            showNotification(error.message, true);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate with AI';
        }
    });
    
    // loginBtn.addEventListener('click', () => { authModal.style.display = 'block'; });
    // logoutBtn.addEventListener('click', () => {
    //     localStorage.removeItem('token');
    //     showNotification('You have been logged out.');
    //     updateAuthState();
    // });
    // authCloseBtn.addEventListener('click', () => { authModal.style.display = 'none'; });
    // showRegister.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    // showLogin.addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });
    // loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleAuth('login', document.getElementById('loginUsername').value, document.getElementById('loginPassword').value); });
    // registerForm.addEventListener('submit', (e) => { e.preventDefault(); handleAuth('register', document.getElementById('registerUsername').value, document.getElementById('registerPassword').value); });

    searchBtn.addEventListener('click', () => loadAndRenderBooks(1));
    loadBooksBtn.addEventListener('click', () => {
        searchInput.value = '';
        loadAndRenderBooks(1);
    });
    searchInput.addEventListener('keypress', e => e.key === 'Enter' && loadAndRenderBooks(1));

    // --- Initial Load ---
    updateAuthState();
});
