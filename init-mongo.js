db = db.getSiblingDB('mydatabase');  // Switch to the 'mydatabase' database

// Check if the users collection exists, and if not, insert the static user
db.createCollection('users');
db.users.find().count() === 0 && db.users.insertOne({
    email: 'alice@example.com',
    hash: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8DPLKXt1FYlwYpQW2G3cAwjKoh2WZK',  // hashed password
    username: 'alice',
    userID: '123'
});

db.createCollection('comments');
db.comments.find().count() === 0 && db.comments.insertOne({
    comment_id: '1',
    article_id: 'fd651085-1294-5a5c-81d3-a2dd66f6fafe',  //via NYT API
    text: 'sample comment 1',
    timestap: '2025-05-17T18:55:17.157+00:00'
});
