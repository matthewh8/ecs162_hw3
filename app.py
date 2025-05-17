from flask import Flask, redirect, url_for, session, jsonify, request
from authlib.integrations.flask_client import OAuth
from authlib.common.security import generate_token
from pymongo import MongoClient
from bson import ObjectId
import os
import datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)


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

@app.route('/')
def home():
    user = session.get('user')
    if user:
        return f"<h2>Logged in as {user['email']}</h2><a href='/logout'>Logout</a>"
    return '<a href="/login">Login with Dex</a>'

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

client = MongoClient("mongodb://localhost:27017")
db = client.flask_db
commentsdb = db['comments']

@app.route("/post_comments", methods = ['POST'])
def post_comment():
    data = request.json
    if 'user_id' in session:
        comment = {
            "article_id": data['article_id'],
            "text": data['text'],
            "username": data['username'],
            "timestamp": datetime.utcnow(),
        }
        db.comments.insert_one(comment)
    return jsonify({"status":"success"})

@app.route("/get_comments/<article_id>", methods = ['GET'])
def get_comments(article_id):
    comments = list(commentsdb.find({"article_id": article_id}))
    return jsonify(comments)

@app.route("/delete_comment/<comment_id>", methods=['DELETE'])
def delete_comment(comment_id):
    db.comments.delete_one({'_id': ObjectId(comment_id)})
    return jsonify(success=True)

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
