from flask import Flask, redirect, url_for, session, jsonify, request, send_from_directory, render_template
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = os.urandom(24)

client = MongoClient("mongodb://root:rootpassword@mongo:27017/mydatabase?authSource=admin")
db = client.mydatabase
comments = db.comments

# try:
#     result = comments.insert_one({"test": "data"})
#     print("hello")
#     print("Insert result:", result.inserted_id)
# except Exception as e:
#     print("Insert failed:", e)

oauth = OAuth(app)

nonce = generate_token()

oauth.register(
    name=os.getenv('OIDC_CLIENT_NAME'),
    client_id=os.getenv('OIDC_CLIENT_ID'),
    client_secret=os.getenv('OIDC_CLIENT_SECRET'),
    #server_metadata_url='http://dex:5556/.well-known/openid-configuration',
    authorization_endpoint="http://localhost:5556/auth",
    token_endpoint="http://dex:5556/token",
    jwks_uri="http://dex:5556/keys",
    userinfo_endpoint="http://dex:5556/userinfo",
    device_authorization_endpoint="http://dex:5556/device/code",
    client_kwargs={'scope': 'openid email profile'}
)

@app.route("/api/key")
def get_key():
    return jsonify({"apiKey": os.getenv("NYT_API_KEY")})

@app.route('/')
def home():
    user = session.get('user')
    # print(user, flush=True)
    # print("hi", flush=True)
    if user: 
        user_name = user.get('name') 
    else: user_name = None
    return render_template('index.html', user_name = user_name)


@app.route('/login')
def login():
    session['nonce'] = nonce
    redirect_uri = 'http://localhost:8000/authorize'
    return oauth.flask_app.authorize_redirect(redirect_uri, nonce=nonce)

@app.route('/authorize')
def authorize():
    token = oauth.flask_app.authorize_access_token()
    nonce = session.get('nonce')

    user_info = oauth.flask_app.parse_id_token(token, nonce=nonce)  # or use .get('userinfo').json()
    session['user'] = user_info
    return redirect('/')

@app.route("/save_articles", methods=['POST'])
def save_articles():
    data = request.json
    articles_data = data.get('articles', [])
    
    saved_articles = []
    for article_data in articles_data:
        article = {
            "article_id": article_data.get('_id'), 
            "title": article_data.get('headline', {}).get('main', ''),
            "content": article_data.get('abstract', ''),
            "image_url": article_data.get('multimedia', {}).get('default', {}).get('url', '') if article_data.get('multimedia') else '',
            "created_at": datetime.utcnow()
        }
        
        try:
            # Check if article already exists
            existing = db.articles.find_one({"article_id": article["article_id"]})
            if not existing:
                result = db.articles.insert_one(article)
                article["_id"] = str(result.inserted_id)
                saved_articles.append(article)
                print(f"Saved article: {article['title']}")
            else:
                print(f"Article already exists: {article['title']}")
        except Exception as e:
            print(f"Error saving article: {e}")
    
    return jsonify({"status": "success", "saved_count": len(saved_articles)})


@app.route("/post_comments", methods=['POST'])
def post_comment():
    data = request.json
    print("Received comment data:", data)
    
    username = data.get('username', 'anonymous')
    
    comment = {
        "article_id": data['article_id'],
        "text": data['text'],
        "username": username,
        "parent_id": data['parent_id'],
        "timestamp": (datetime.utcnow() - timedelta(hours=7))
    }

    try:
        result = comments.insert_one(comment)
        print(f"Comment inserted with ID: {result.inserted_id}")
        return jsonify({"status": "success", "comment_id": str(result.inserted_id)})
    except Exception as e:
        print(f"Error inserting comment: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/get_comments/<path:article_id>", methods=['GET'])
def get_comments(article_id):
    print(f"Getting comments for article: {article_id}")
    comments_list = []
    try:
        for comment in comments.find({"article_id": article_id}):
            comment["_id"] = str(comment["_id"]) 
            if isinstance(comment.get("timestamp"), datetime):
                comment["timestamp"] = comment["timestamp"].isoformat()
            comments_list.append(comment)
        print(f"Found {len(comments_list)} comments")
        return jsonify(comments_list)
    except Exception as e:
        print(f"Error fetching comments: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/delete_comment/<comment_id>", methods=['DELETE'])
def delete_comment(comment_id):
    try:
        result = comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': {
                'text': 'COMMENT DELETED BY MODERATOR',
                'isDeleted': True
            }}
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/redact_comment/<comment_id>", methods=['PATCH'])
def redact_comment(comment_id):
    try:
        data = request.json
        redacted_text = data.get('redacted_text')
        
        if not redacted_text:
            return jsonify({"success": False, "message": "No redacted text provided"}), 400
        
        result = comments.update_one(
            {'_id': ObjectId(comment_id)},
            {'$set': {
                'text': redacted_text,
                'isRedacted': True,
                'redacted_at': datetime.utcnow(),
                'redacted_by': 'moderator' 
            }}
        )
        
        if result.modified_count > 0:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "message": "Comment not found"}), 404
            
    except Exception as e:
        print(f"Error redacting comment: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
        
@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)