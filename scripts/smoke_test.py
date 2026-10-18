"""Exercise authenticated PostgreSQL state using two dedicated Firebase test users."""
import json
import os
import urllib.request
import urllib.error

base = os.environ.get('SYSTEMVERSE_API', 'http://localhost:8080/api')
token = os.environ['SYSTEMVERSE_TEST_TOKEN']
other_token = os.environ['SYSTEMVERSE_OTHER_TEST_TOKEN']

def request(path, method='GET', body=None, bearer=token):
    headers = {'Content-Type': 'application/json'}
    if bearer:
        headers['Authorization'] = 'Bearer ' + bearer
    req = urllib.request.Request(base + path, method=method, headers=headers,
        data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.load(response)

assert request('/health', bearer=None)['status'] == 'ok'
assert len(request('/catalog', bearer=None)['lessons']) == 12
for bearer in [None, 'invalid']:
    try:
        request('/state', bearer=bearer)
        raise AssertionError('Unauthenticated state request accepted')
    except urllib.error.HTTPError as error:
        assert error.code == 401
other_before = request('/state', bearer=other_token)
state = {'completed': True, 'bookmarked': True, 'notes': 'Tradeoffs matter', 'code': 'public class Main {}'}
request('/state/practice-1', 'PUT', state)
rows = {row['id']: row for row in request('/state')}
assert rows['practice-1']['code'] == state['code']
state['completed'] = False
state['notes'] = 'Updated design'
request('/state/practice-1', 'PUT', state)
rows = {row['id']: row for row in request('/state')}
assert rows['practice-1']['notes'] == 'Updated design' and rows['practice-1']['completed'] is False
assert request('/state', bearer=other_token) == other_before
try:
    request('/state/unknown', 'PUT', state)
    raise AssertionError('Unknown item was accepted')
except urllib.error.HTTPError as error:
    assert error.code == 404
print('PASS: public catalog/health, authentication, insert, update, account isolation, validation')
