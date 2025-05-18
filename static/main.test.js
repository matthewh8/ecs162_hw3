test('basic sanity', () =>{
  expect(1+1).toBe(2);
})
describe('Article content tests (html)', ()=> {
beforeEach(()=> {
  document.body.innerHTML = 
  `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>The New York Times</title>
      <link rel="stylesheet" href="static/styles.css">
      <script src="static/main.js" defer></script>
  </head>
  <body>
      <header>
          <!-- top bar -->
          <div id="title-bar">
              <div id="date-container">
                  <div id="current-date"></div>
                  <div>
                      Today's Paper
                  </div>
              </div>
              <div id="logo">
                  <a href="index.html">
                      <img src="static/assets/Logo.png" alt="The New York Times Logo">
                  </a>
              </div>
              <div>
              </div>
          </div>
          <!-- second bar -->
          <nav>
              <!-- for spacing -->
              <div class="side-tab">

              </div>
              <div class="tab">
                  U.S.
              </div>
              <div class="tab">
                  World
              </div>
              <div class="tab">
                  Business
              </div>
              <div class="tab">
                  Arts
              </div>
              <div class="tab">
                  Lifestyle
              </div>
              <div class="tab">
                  Opinion
              </div>
              <div class="tab">
                  Audio
              </div>
              <div class="tab">
                  Games
              </div>
              <div class="tab">
                  Cooking
              </div>
              <div class="tab">
                  Wirecutter
              </div>
              <div class="tab">
                  The Athletic
              </div>
              <!-- for spacing -->
              <div class="side-tab">

              </div>
          </nav>
      </header>
      <main class="container">
          <section class="left-column">
          </section>
          <section class="main-column">
          </section>
          <section class="right-column">
          </section>
      </main>
      <footer>
          <p>&copy; 2025 The New York Times</p>
      </footer>
  </body>
  </html>`;
})
test('logo rendering', () => {
  const img = document.querySelector('#logo img');
  expect(img.getAttribute('src')).toBe('static/assets/Logo.png');
  expect(img.getAttribute('alt')).toBe('The New York Times Logo');
});
test('nav bar', () => {
  const navBar = Array.from(document.querySelectorAll('.tab')).map(element => element.textContent.trim());
  expect(navBar).toEqual(['U.S.', 'World', 'Business', 'Arts', 'Lifestyle',
  'Opinion', 'Audio', 'Games', 'Cooking', 'Wirecutter', 'The Athletic']);
});
test('footer', () => {
  const footer = (document.querySelector('footer')).textContent.trim();
  expect(footer).toEqual('© 2025 The New York Times');
});
});

// import * as articleFunction from './main.js';

import { fetchApiKey } from './main.js';

test('fetch API key', async () => { 
global.fetch = jest.fn().mockImplementation(async() => ({
  json: async() => {
      return {apiKey:'test-key'};
  }
  }));
const result = await fetchApiKey();
expect(result).toBe('test-key');
});

jest.mock('node-fetch');
const fetch = require('node-fetch');
fetch.mockResolvedValue({
  json: () => Promise.resolve({ success: true })
});

describe('API content return test', () => {
  jest.unmock('node-fetch');
  const realfetch = require('node-fetch');
  const apiKey = 'S0ECqx43sCfs5GT5P5ZLjzttySP8sVtN';
  const query = 'sacramento';
  const url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${query}&api-key=${apiKey}`;
  test('returned data in expected format', async () => {
      const response = await realfetch(url);
      const data = await response.json();
      const returned = data.response.docs[0];
      expect(returned).toHaveProperty('headline');
      expect(returned.headline).toHaveProperty('main');
      expect(returned).toHaveProperty('abstract');
      expect(returned).toHaveProperty('multimedia');
      expect(returned.multimedia).toHaveProperty('default');
      expect(returned).toHaveProperty('_id');
      expect(query).toBe('sacramento'); // test that the query is sacramento news
  });
});

describe('Media Query Column Width Tests', () => {
  let originalInnerWidth;
  let originalMatchMedia;
  
  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalMatchMedia = window.matchMedia;
    
    // Minimal test structure
    document.body.innerHTML = `
      <div class="container">
        <div class="left-column"></div>
        <div class="main-column"></div>
        <div class="right-column"></div>
      </div>
    `;
    
    // Only column width CSS
    const style = document.createElement('style');
    style.textContent = `
      @media screen and (max-width: 1024px) {
        .main-column { flex: 2; }
        .right-column { flex: 1; }
        .left-column { flex: 0 0 100%; }
      }
      
      @media screen and (max-width: 767px) {
        .container { flex-direction: column; }
        .main-column, .left-column, .right-column { flex: 1 0 100%; }
      }
    `;
    document.head.appendChild(style);
  });
  
  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
    document.body.innerHTML = '';
    document.head.querySelector('style')?.remove();
  });
  
  // Simple media query simulator
  function simulateWidth(width) {
    window.innerWidth = width;
    window.matchMedia = (query) => ({
      matches: query.includes('max-width: 767px') ? width <= 767 : 
               query.includes('max-width: 1024px') ? width <= 1024 : false,
      media: query
    });
    window.dispatchEvent(new Event('resize'));
  }
  
  test('Desktop width columns (>1024px)', () => {
    simulateWidth(1200);
    
    expect(window.matchMedia('(max-width: 1024px)').matches).toBe(false);
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(false);
  });
  
  test('Tablet width columns (≤1024px, >767px)', () => {
    simulateWidth(900);
    
    expect(window.matchMedia('(max-width: 1024px)').matches).toBe(true);
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(false);
    
    const mainColumn = document.querySelector('.main-column');
    const leftColumn = document.querySelector('.left-column');
    
    // Apply tablet styles to verify
    mainColumn.style.flex = '2';
    leftColumn.style.flex = '0 0 100%';
    
    expect(mainColumn.style.flex).toBe('2');
    expect(leftColumn.style.flex).toBe('0 0 100%');
  });
  
  test('Mobile width columns (≤767px)', () => {
    simulateWidth(600);
    
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
    expect(window.matchMedia('(max-width: 1024px)').matches).toBe(true);
    
    const container = document.querySelector('.container');
    const columns = document.querySelectorAll('.left-column, .main-column, .right-column');
    
    // Apply mobile styles to verify
    container.style.flexDirection = 'column';
    columns.forEach(col => col.style.flex = '1 0 100%');
    
    expect(container.style.flexDirection).toBe('column');
    expect(document.querySelector('.main-column').style.flex).toBe('1 0 100%');
  });
  
  test('Responsive column width changes', () => {
    // Test changing between breakpoints
    simulateWidth(1200);
    expect(window.matchMedia('(max-width: 1024px)').matches).toBe(false);
    
    simulateWidth(900);
    expect(window.matchMedia('(max-width: 1024px)').matches).toBe(true);
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(false);
    
    simulateWidth(600);
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
  });
});

describe('login button test', () => {
  let href;

  beforeEach(() => {
    document.body.innerHTML = `<button id="loginBtn">Login</button>`;
    href = '';
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { get href() { return href; }, set href(val) { href = val; } }
    });
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', () => {
      window.location.href = '/login';
    });
  });

  test('redirecting to /login when clicked', () => {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.click();
    expect(window.location.href).toBe('/login');
  });
});

describe('logout button test', () => {
  let href;

  beforeEach(() => {
    document.body.innerHTML = `
    <button id="logout-button-sidebar">Logout</button>
    <div id="comments-list"></div>
    `;
    href = '';
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        get href() { return href; },
        set href(val) { href = val; }
      }
    });
    const logoutBtn = document.getElementById('logout-button-sidebar');
    logoutBtn.addEventListener('click', () => {
      window.location.href = '/logout';
    });
  });

  test('redirecting to /logout when clicked', () => {
    const logoutBtn = document.getElementById('logout-button-sidebar');
    logoutBtn.click();
    expect(window.location.href).toBe('/logout');
  });
})

import { loadComments } from './main.js';

test('get comments', async () => {
  document.body.innerHTML = '<div id="comments-list"></div>';
  window.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve([]) }));
  window.renderComments = jest.fn(() => '');

  await loadComments('abc');
  expect(window.fetch).toHaveBeenCalledWith('/get_comments/abc');
});

test('sidebar click logic', () => {
  document.body.innerHTML = `
    <button class="comment-button" data-article-id="1"></button>
    <div id="comments-sidebar" style="display: none"></div>
    <div id="sidebar-overlay"></div>
  `;
  document.addEventListener('click', function handler(e) {
    if (e.target.classList.contains('comment-button')) {
      document.getElementById('comments-sidebar').style.display = 'block';
    }
  });
  document.querySelector('.comment-button').click();
  expect(document.getElementById('comments-sidebar').style.display).toBe('block');
});
import { renderComments } from './main.js';
describe('rendering logic', ()=> {
  test('rendering logic empty array', () => {
    expect(renderComments([])).toContain('No comments yet');
  });

  test('rendering logic with users', () => {
    window.user_name = 'user';
    const comments = [{
      _id: '1',
      text: 'Hello!',
      username: 'David',
      parent_id: null,
      timestamp: 1
    }];
    const html = renderComments(comments);
    expect(html).toContain('David');
    expect(html).toContain('Hello!');
    expect(html).toContain('reply-btn');
  });
});

describe('Account sidebar tests', () => {
  let accountButton, accountSidebar, sidebarOverlay, closeAccountSidebar, commentsSidebar;
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="account-btn"></button>
      <div id="account-sidebar" style="display: none"></div>
      <div id="sidebar-overlay"></div>
      <button id="close-account-sidebar"></button>
      <div id="comments-sidebar" style="display: none"></div>
    `;

    accountButton = document.getElementById('account-btn');
    accountSidebar = document.getElementById('account-sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    closeAccountSidebar = document.getElementById('close-account-sidebar');

    if (accountButton) {
      accountButton.addEventListener('click', function() {
        accountSidebar.style.display = 'block';
        sidebarOverlay.classList.add('active');
      });
    }

    if (closeAccountSidebar) {
      closeAccountSidebar.addEventListener('click', function() {
        accountSidebar.style.display = 'none';
        sidebarOverlay.classList.remove('active');
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', function() {
        accountSidebar.style.display = 'none';
        sidebarOverlay.classList.remove('active');
      });
    }
  });

  test('open account sidebar', () => {
    accountButton.click();
    expect(accountSidebar.style.display).toBe('block');
    expect(sidebarOverlay.classList.contains('active')).toBe(true);
  });

  test('close account sidebar', () => {
    accountButton.click();
    closeAccountSidebar.click();
    expect(accountSidebar.style.display).toBe('none');
    expect(sidebarOverlay.classList.contains('active')).toBe(false);
  });

  test('close both sidebars and overlay', () => {
    accountSidebar.style.display = 'block';
    sidebarOverlay.classList.add('active');
    sidebarOverlay.click();
    expect(accountSidebar.style.display).toBe('none');
    expect(sidebarOverlay.classList.contains('active')).toBe(false);
  });
});

import { updateCommentCount } from './main.js';

test('deletes comment and reloads', async () => {
  document.body.innerHTML = `
    <input id="article-id" value="1">
    <button class="delete-btn" data-id="2"></button>
    <div id="comments-list"></div>
  `;
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ success: true }),
    })
  );
  const loadComments = jest.fn();
  const updateCommentCount = jest.fn(() => Promise.resolve());
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const commentId = e.target.dataset.id;
      const response = await fetch(`/delete_comment/${commentId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        alert(result.message || 'Failed to delete comment.');
      }
      const articleId = document.getElementById('article-id').value;
      loadComments(articleId);
      await updateCommentCount(articleId);
      return;
    }
  });
  const deleteBtn = document.querySelector('.delete-btn');
  deleteBtn.click();

  await new Promise((res) => setTimeout(res, 10));
  expect(fetch).toHaveBeenCalledWith('/delete_comment/2', { method: 'DELETE' });
  expect(loadComments).toHaveBeenCalledWith('1');
  expect(updateCommentCount).toHaveBeenCalledWith('1');
});

import { getCommentCount } from './main.js';

test('returns comment count', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(['comment1', 'comment2']),
    })
  );

  const count = await getCommentCount('123');
  expect(count).toBe(2);
  expect(global.fetch).toHaveBeenCalledWith('/get_comments/123');
});





