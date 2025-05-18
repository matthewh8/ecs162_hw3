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
    
    console.log(commentButton.dataset.articleId);
    commentButton.addEventListener('click', () => {
      document.getElementById('article-id').value = commentButton.dataset.articleId;
      loadComments(commentButton.dataset.articleId);
    });
    articleWrapper.appendChild(commentButton);
    columns[i%3].appendChild(articleWrapper); //append wrapper containing everything to parent element column
  }
}

const loginBtn = document.getElementById('login-button'); // COVERED
if(loginBtn){
  document.getElementById('login-button').addEventListener('click', () => {
    window.location.href = '/login';
  })
}

let currentArticleId = null;
document.addEventListener('DOMContentLoaded', function() { // COVERED
  document.addEventListener('click', async function(e){ 
    console.log(window.user_name);
    if(e.target.classList.contains('comment-button') && ['moderator', 'user', 'admin'].includes(window.user_name)){
      currentArticleId = e.target.dataset.articleId;
      document.getElementById('comments-sidebar').style.display = 'block';
      document.getElementById('sidebar-overlay').classList.add('active'); // Add overlay
      loadComments(currentArticleId);
    }
    else if(e.target.classList.contains('comment-button') && !['moderator', 'user', 'admin'].includes(window.user_name)){
      window.location.href = '/login';
    }
    if(e.target.id === 'close-sidebar'){
      document.getElementById('comments-sidebar').style.display = 'none';
      document.getElementById('sidebar-overlay').classList.remove('active'); // Remove overlay
    }
  });
});

// Update comment count after posting
export async function updateCommentCount(articleId) { 
    const commentButtons = document.querySelectorAll('.comment-button');
    for (const button of commentButtons) {
        if (button.dataset.articleId === articleId) {
            const commentCount = await getCommentCount(articleId);
            button.innerHTML = `Comment <span class="comment-count">${commentCount}</span>`;
            break;
        }
    }
}

// New comment form event listener
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('comment-form').addEventListener('submit', async function(e) { // NEED TEST FOR THIS
    console.log("Posting comment");
    e.preventDefault();
    
    const articleId = document.getElementById('article-id').value;
    const commentText = document.getElementById('comment-input').value;
    const username = "user"; 
    
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
    
    // Update comment count in the button
    await updateCommentCount(articleId);
  });
});

export async function loadComments(articleId) { // COVERED
  console.log("Loading comments for article:", articleId);
  try {
    let response = await fetch(`/get_comments/${encodeURIComponent(articleId)}`);
    let comments = await response.json();
    console.log("Fetched comments:", comments);

    if (!Array.isArray(comments)) {
      console.error("Unexpected comments format:", comments);
      comments = [];
    }
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

  return comments.map(comment => {
    // Check if comment is deleted
    const isDeleted = comment.isDeleted === true;
    
    // Only show buttons if comment is not deleted AND user has appropriate permissions
    const showReplyButton = !isDeleted && ['moderator', 'user', 'admin'].includes(window.user_name);
    const showDeleteButton = !isDeleted && window.user_name === 'moderator';
    
    return `<div class="comment">
      <div class="comment-header">
        <strong>${comment.username || 'Anonymous'}</strong> 
        <span class="timestamp">${new Date(comment.timestamp).toLocaleString()}</span>
      </div>
      <div class="comment-text ${isDeleted ? 'deleted-comment' : ''}">${comment.text}</div>
      ${showReplyButton ? `<button class="reply-btn" data-id="${comment._id}">Reply</button>` : ''}
      ${showDeleteButton ? `<button class="delete-btn" data-id="${comment._id}">Delete</button>` : ''}
    </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('reply-btn')) {
      // console.log(event.target.parentNode)
      const existingForm = document.querySelector('.reply-form');
      if (existingForm) existingForm.remove();
      const form = document.createElement('form');
      form.className = 'reply-form';
      form.innerHTML = `
        <textarea name="reply" required></textarea>
        <button type="submit">Post Reply</button>
      `;
      console.log(event.target.dataset.id); // event.target.dataset.id gets correct parent comment id
      form.dataset.parentId = event.target.dataset.id;

      event.target.parentNode.appendChild(form);
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', async function(event) {
    const articleId = document.getElementById('article-id').value;
    console.log(articleId);
    if (event.target.classList.contains('delete-btn')) {
      // console.log(event.target.parentNode)
      const commentId = event.target.dataset.id;
      const response = await fetch(`/delete_comment/${commentId}`, {method:'DELETE'});
      const result = await response.json();
      if (!result.success) {alert(result.message || 'Failed to delete comment.');} 
      loadComments(articleId);
      
      // Update comment count after deletion
      await updateCommentCount(articleId);
    }
  });
});

document.addEventListener('DOMContentLoaded', function() { // NEED TO COVER
  document.addEventListener('submit', async function(e) {
    if (e.target.classList.contains('reply-form')) {
      e.preventDefault();
      const replyText = e.target.querySelector('textarea').value;
      console.log(replyText);
      const parentId = e.target.dataset.parentId;
      console.log(parentId);
      const articleId = document.getElementById('article-id').value;
      console.log(articleId);
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
      
      // Update comment count after reply
      await updateCommentCount(articleId);
    }
  });
});

document.addEventListener('DOMContentLoaded', function() { // COVERED
  const accountButton = document.getElementById('account-button');
  const accountSidebar = document.getElementById('account-sidebar');
  const closeAccountSidebar = document.getElementById('close-account-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const logoutButtonSidebar = document.getElementById('logout-button-sidebar');

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
          // Close both sidebars when overlay is clicked
          accountSidebar.style.display = 'none';
          document.getElementById('comments-sidebar').style.display = 'none';
          sidebarOverlay.classList.remove('active');
      });
  }

  if (logoutButtonSidebar) { // COVERED
      logoutButtonSidebar.addEventListener('click', function() {
          window.location.href = '/logout';
      });
  }
});


// Keeping the original commented-out form event listener
// document.getElementById('comment-form').addEventListener('submit', async function(event) {
//   console.log("posting comment")
//   event.preventDefault();
//   const formData = new FormData(this);
//   const articleId = event.submitter.dataset.articleId;
//   const data = {
//     article_id: formData.get('article_id'), // from 
//     text: formData.get('text'),
//     username: formData.get('username'),
//   };
//   const response = await fetch('/post_comments', {
//     method: 'POST',
//     headers: {
//     'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(data)
//   });
//   const result = await response.json();
//   loadComments(formData.get('article_id'));
// });


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
    
};