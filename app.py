from flask import Flask, redirect, url_for, session, jsonify, request, send_from_directory, render_template
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime  # Fixed import for datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)

client = MongoClient("mongodb://root:rootpassword@mongo:27017/mydatabase?authSource=admin")
db = client.mydatabase
comments = db.comments

try:
    result = comments.insert_one({"test": "data"})
    print("hello")
    print("Insert result:", result.inserted_id)
except Exception as e:
    print("Insert failed:", e)

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
    # user = session.get('user')
    return render_template('index.html')


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


@app.route("/post_comments", methods=['POST'])
def post_comment():
    data = request.json
    print("Received comment data:", data)
    
    # In a real app, you'd get user info from the session
    # For demo purposes, use the username from the request or a default
    username = data.get('username', 'anonymous')
    
    comment = {
        "article_id": data['article_id'],
        "text": data['text'],
        "username": username,
        "timestamp": datetime.utcnow()
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
            comment["_id"] = str(comment["_id"])  # Convert ObjectId to string
            
            # Handle datetime serialization
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
        result = comments.delete_one({'_id': ObjectId(comment_id)})
        if result.deleted_count > 0:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "message": "Comment not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)