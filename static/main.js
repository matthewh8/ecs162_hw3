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
      displayArticles(articles.slice(0, 6));
      return articles.slice(0, 6);
  }
  
  export function displayArticles(articles){ // displays articles by putting them into html
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
      commentButton.textContent = 'Comment';
      commentButton.classList.add('comment-button');
      commentButton.dataset.articleId = article._id;
      console.log(commentButton.dataset.articleId);
      commentButton.addEventListener('click', () => {
        document.getElementById('article-id').value = commentButton.dataset.articleId;
        loadComments(commentButton.dataset.articleId);
      });
      articleWrapper.appendChild(commentButton);
      columns[i%3].appendChild(articleWrapper); //append wrapper containing everything to parent element column
    }
  }
  
  document.getElementById('login-button').addEventListener('click', () => {
    window.location.href = '/login';
  })
  
  let currentArticleId = null;
  
  document.addEventListener('click', function(e){ // waits for click on the button:
    if(e.target.classList.contains('comment-button')){
      currentArticleId = e.target.dataset.articleId;
      document.getElementById('comments-sidebar').style.display = 'block';
      loadComments(currentArticleId);
    }
    if(e.target.id === 'close-sidebar'){
      document.getElementById('comments-sidebar').style.display = 'none';
    }
    if(e.target.id === ""){
  
    }
  });
  
  async function loadComments(articleId){
    let response = await fetch(`/get_comments/${articleId}`)
    console.log(articleId)
    const text = await response.text();
    console.log(text);
    let comments = await response.json();
    document.getElementById('comments-list').innerHTML = renderComments(comments);
  }
  
  function renderComments(comments, parentId = null){ // having null parentId = top level
    return comments.filter(c => c.parent_id === parentId).map(comment => 
      `<div class="comments-list"><strong>${comment.user}</strong> at ${comment.timestamp}: ${comment.text}${renderComments(comments, comment._id)}</div>`).join('');
  }
  
  document.getElementById('comment-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    const articleId = event.submitter.dataset.articleId;
    const data = {
      article_id: formData.get('article_id'), // from 
      text: formData.get('text'),
      username: formData.get('username'),
    };
    const response = await fetch('/post_comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    loadComments(formData.get('article_id'));
  });
  
  
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