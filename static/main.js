// Keep the original commented-out sections
export function getFormattedDate() {
  const today = new Date();
  
  const options = { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return today.toLocaleDateString('en-US', options);
}

export async function fetchApiKey(){ // utilizes Flask backend to fetch api key from .env file
    try{
    // still needs to be converted to json even though it was transferred initially as json
    const response = await fetch('/api/key'); 
    const data = await response.json();
    return data.apiKey;
    } catch {

    }
}
let page = 0;

export async function fetchArticles(){ // queries NYT API for 6 articles, then calls display function
  const apiKey = await fetchApiKey();
  const query = 'sacramento'; // we chose just sacramento because davis didn't have anything
  let articles = [];
  
  while(articles.length < 6){
      const url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${query}&page=${page}&api-key=${apiKey}`;
      console.log(url);
      const response = await fetch(url);
      const data = await response.json();
      const returned = data.response.docs;
      
      for(const doc of returned){
          const keywords = doc.keywords;
          for(const keyword of keywords){
              if(keyword.name.includes('Location') && (keyword.value.includes('Sacramento') || (keyword.value.includes('Davis')))){
                  articles.push(doc);
                  break;
              }
          }
      }
      page++;
  }
  
  //saves articles to article db
  try {
      const saveResponse = await fetch('/save_articles', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ articles: articles.slice(0, 6) })
      });
      const saveResult = await saveResponse.json();
      console.log(`Saved ${saveResult.saved_count} new articles to database`);
  } catch (error) {
      console.error('Error saving articles:', error);
  }
  
  displayArticles(articles.slice(0, 6));
  return articles.slice(0, 6);
}

// Get comment count for an article
export async function getCommentCount(articleId) {
    try {
        const response = await fetch(`/get_comments/${encodeURIComponent(articleId)}`);
        const comments = await response.json();
        return Array.isArray(comments) ? comments.length : 0;
    } catch (error) {
        console.error('Error getting comment count:', error);
        return 0;
    }
}

export async function displayArticles(articles){ // displays articles by putting them into html
  const leftColumn = document.querySelector('.left-column');
  const mainColumn = document.querySelector('.main-column');
  const rightColumn = document.querySelector('.right-column');
  const columns = [leftColumn, mainColumn, rightColumn];
  
  for(let i = 0; i < 6; i++){
    let article = articles[i];
    let articleWrapper = document.createElement('article'); //create article element wrapping headline/abstract
    let headline = document.createElement('h2');
    headline.textContent = article.headline.main;
    articleWrapper.appendChild(headline);
    let abstract = document.createElement('p');
    abstract.textContent = article.abstract;
    articleWrapper.appendChild(abstract);
    let img = document.createElement('img');
    img.src = article.multimedia.default.url;
    img.classList.add('article-img');
    articleWrapper.appendChild(img);
    
    let commentButton = document.createElement('button');
    commentButton.classList.add('comment-button');
    commentButton.dataset.articleId = article._id;
    
    // displaying comment count on button
    const commentCount = await getCommentCount(article._id);
    commentButton.innerHTML = `<span class="comment-count">${commentCount}</span>`;
    
    articleWrapper.appendChild(commentButton);
    columns[i%3].appendChild(articleWrapper); //append wrapper containing everything to parent element column
  }
}

// Update comment count after posting
export async function updateCommentCount(articleId) { 
    const commentButtons = document.querySelectorAll('.comment-button');
    for (const button of commentButtons) {
        if (button.dataset.articleId === articleId) {
            const commentCount = await getCommentCount(articleId);
            button.innerHTML = `<span class="comment-count">${commentCount}</span>`;
            break;
        }
    }
}

export async function loadComments(articleId) {
  console.log("Loading comments for article:", articleId);
  try {
    let response = await fetch(`/get_comments/${encodeURIComponent(articleId)}`);
    let comments = await response.json();
    
    if (!Array.isArray(comments)) {
      console.error("Unexpected comments format:", comments);
      comments = [];
    }
    
    const commentHeader = document.querySelector('.comments-header h3');
    commentHeader.textContent = `Comments ${comments.length}`;
    
    document.getElementById('comments-list').innerHTML = renderComments(comments);
  } catch (error) {
    console.error("Error loading comments:", error);
    document.getElementById('comments-list').innerHTML = "<p>Error loading comments</p>";
  }
}

export function renderComments(comments) {
  console.log("Rendering comments");
  if (!comments || comments.length === 0) {
    return "<p>No comments yet. Be the first to comment!</p>";
  }

  // Organize comments into parent and child relationships
  const commentMap = new Map();
  const parentComments = [];
  
  // First pass: create map of all comments by ID
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment._id, comment);
  });
  
  // Second pass: organize into parent-child structure
  comments.forEach(comment => {
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      // This is a reply, add it to parent's replies
      const parent = commentMap.get(comment.parent_id);
      parent.replies.push(comment);
    } else {
      // This is a top-level comment
      parentComments.push(comment);
    }
  });

  // Recursive function to render a comment and its replies
  function renderComment(comment, depth = 0) {
    const isDeleted = comment.isDeleted === true;
    const showReplyButton = !isDeleted && ['moderator', 'user', 'admin'].includes(window.user_name);
    const showDeleteButton = !isDeleted && window.user_name === 'moderator';
    
    // Add indentation for nested replies
    const indentClass = depth > 0 ? 'nested-comment' : '';
    const indentStyle = depth > 0 ? `style="margin-left: ${Math.min(depth * 20, 60)}px; border-left: 2px solid #e0e0e0; padding-left: 15px;"` : '';
    
    let commentHtml = `
      <div class="comment ${indentClass}" ${indentStyle}>
        <div class="comment-header">
          <strong>${comment.username || 'Anonymous'}</strong> 
          <span class="timestamp">${new Date(comment.timestamp).toLocaleString()}</span>
        </div>
        <div class="comment-text ${isDeleted ? 'deleted-comment' : ''}">${comment.text}</div>
        ${showReplyButton ? `<button class="reply-btn" data-id="${comment._id}">Reply</button>` : ''}
        ${showDeleteButton ? `<button class="delete-btn" data-id="${comment._id}">Delete</button>` : ''}
      </div>`;
    
    // Render replies recursively
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach(reply => {
        commentHtml += renderComment(reply, depth + 1);
      });
    }
    
    return commentHtml;
  }

  // Render all top-level comments and their nested replies
  return parentComments.map(comment => renderComment(comment)).join('');
}

// Global state to track current article and prevent duplicate event listeners
let currentArticleId = null;
let eventListenersInitialized = false;

// Initialize all event listeners once when DOM is ready
function initializeEventListeners() {
  if (eventListenersInitialized) return;
  eventListenersInitialized = true;

  // Handle all clicks through a single delegated event listener
  document.addEventListener('click', async function(e) {
    // Comment button clicks
    const commentButton = e.target.closest('.comment-button');
    if (commentButton) {
      if (['moderator', 'user', 'admin'].includes(window.user_name)) {
        console.log(window.user_name);
        currentArticleId = commentButton.dataset.articleId;
        document.getElementById('comments-sidebar').style.display = 'block';
        document.getElementById('sidebar-overlay').classList.add('active');
        document.getElementById('article-id').value = currentArticleId;
        loadComments(currentArticleId);
      } else {
        window.location.href = '/login';
      }
      return;
    }

    // Close sidebar buttons
    if (e.target.id === 'close-sidebar') {
      document.getElementById('comments-sidebar').style.display = 'none';
      document.getElementById('sidebar-overlay').classList.remove('active');
      return;
    }

    if (e.target.id === 'close-account-sidebar') {
      document.getElementById('account-sidebar').style.display = 'none';
      document.getElementById('sidebar-overlay').classList.remove('active');
      return;
    }

    // Account button click
    if (e.target.id === 'account-button') {
      document.getElementById('account-sidebar').style.display = 'block';
      document.getElementById('sidebar-overlay').classList.add('active');
      return;
    }

    // Sidebar overlay click (close both sidebars)
    if (e.target.id === 'sidebar-overlay') {
      document.getElementById('account-sidebar').style.display = 'none';
      document.getElementById('comments-sidebar').style.display = 'none';
      document.getElementById('sidebar-overlay').classList.remove('active');
      return;
    }

    // Reply button clicks
    if (e.target.classList.contains('reply-btn')) {
      const existingForm = document.querySelector('.reply-form');
      if (existingForm) existingForm.remove();
      
      const form = document.createElement('form');
      form.className = 'reply-form';
      form.innerHTML = `
        <textarea name="reply" required></textarea>
        <button type="submit">Post Reply</button>
      `;
      form.dataset.parentId = e.target.dataset.id;
      e.target.parentNode.appendChild(form);
      return;
    }

    // Delete button clicks
    if (e.target.classList.contains('delete-btn')) {
      const commentId = e.target.dataset.id;
      const response = await fetch(`/delete_comment/${commentId}`, {method:'DELETE'});
      const result = await response.json();
      if (!result.success) {
        alert(result.message || 'Failed to delete comment.');
      } 
      const articleId = document.getElementById('article-id').value;
      loadComments(articleId);
      await updateCommentCount(articleId);
      return;
    }

    // Login/logout button clicks
    if (e.target.id === 'login-button') {
      window.location.href = '/login';
      return;
    }

    if (e.target.id === 'logout-button' || e.target.id === 'logout-button-sidebar') {
      window.location.href = '/logout';
      return;
    }
  });

  // Handle form submissions through a single delegated event listener
  document.addEventListener('submit', async function(e) {
    // Main comment form submission
    if (e.target.id === 'comment-form') {
      console.log("Posting comment");
      e.preventDefault();
      
      const articleId = document.getElementById('article-id').value;
      const commentText = document.getElementById('comment-input').value;
      const username = window.user_name; 
      
      const data = {
        article_id: articleId,
        text: commentText,
        username: username,
        parent_id: null
      };
      
      console.log("Submitting comment data:", data);

      const response = await fetch('/post_comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      document.getElementById('comment-input').value = ''; // Clear input field
      loadComments(articleId);
      await updateCommentCount(articleId);
      return;
    }

    // Reply form submission
    if (e.target.classList.contains('reply-form')) {
      e.preventDefault();
      
      const replyText = e.target.querySelector('textarea').value;
      const parentId = e.target.dataset.parentId;
      const articleId = document.getElementById('article-id').value;
      const username = "user";

      const data = {
        article_id: articleId,
        text: replyText,
        username: username,
        parent_id: parentId
      };

      const response = await fetch('/post_comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      loadComments(articleId);
      await updateCommentCount(articleId);
      return;
    }
  });
}

const isJest = typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined; // checks if ran by jest or in app

//COMMENT THIS OUT WHEN WORKING ON COMMENTS
// enables endless scrolling 
// if (!isJest){
//   let loading = false;

//   const observer = new IntersectionObserver(async (entries) => { // checks intersection of scroll sentinel to determine when to load new pages
//     if (loading || !entries[0].isIntersecting) return;
//     loading = true;
//     const newArticles = await fetchArticles();
//     if (newArticles.length > 0) {
//       displayArticles(newArticles);
//     } else {
//       observer.disconnect();
//     }
//     loading = false;
//   }, { threshold: 1.0 });

//   observer.observe(document.querySelector('.scroll-sentinel'));
// }

// let comments = [];
// let commentsList = document.getElementById('comments-list')
// let commentForm = document.getElementById('comment-form')
// let commentInput = document.getElementById('comment-input');

window.onload = function() { // on window load, fetch the first batch of articles if not in test mode
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
      currentDateElement.textContent = getFormattedDate();
    }
    if (!isJest) {
      fetchArticles();
    }
    
    // Initialize event listeners once
    initializeEventListeners();
};