import pytest
from app import app
from unittest.mock import patch

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_home(client):
    resp = client.get('/')
    assert resp.status_code == 200

def test_api_key(client):
    resp = client.get('/api/key')
    assert resp.status_code == 200
    assert 'apiKey' in resp.get_json()

def test_logout(client):
    resp = client.get('/logout')
    assert resp.status_code == 302


@patch('app.comments.insert_one')
def test_post_comment(mock_db_call, client):
    mock_db_call.return_value.inserted_id = 'fake_id'

    data = {
        "article_id": "a",
        "text": "test comment",
        "username": "user",
        "parent_id": None
    }
    response = client.post('/post_comments', json=data)
    assert response.status_code == 200
    assert response.get_json()['status'] == 'success'

@patch('app.comments.find')
def test_get_comments(mock_find, client):
    mock_find.return_value = []

    response = client.get('/get_comments/id')
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)

@patch('app.comments.update_one')
def test_delete_comment(mock_delete, client):
    mock_delete.return_value = None

    response = client.delete('/delete_comment/000000000000000000000000')
    assert response.status_code == 200
    assert response.get_json()['success'] is True



