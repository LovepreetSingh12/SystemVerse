"""Exercise PostgreSQL-backed state with an isolated anonymous workspace."""
import json
import os
import urllib.request
import urllib.error
import uuid

base = os.environ.get('SYSTEMVERSE_API', 'http://localhost:8080/api')
learner = str(uuid.uuid4())

def request(path, method='GET', body=None, workspace=learner):
    req = urllib.request.Request(base + path, method=method,
        headers={'Content-Type': 'application/json', 'X-Learner-Id': workspace},
        data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.load(response)

assert request('/health')['status'] == 'ok'
assert len(request('/catalog')['lessons']) == 12
assert request('/state') == []
state = {'completed': True, 'bookmarked': True, 'notes': 'Tradeoffs matter', 'code': 'public class Main {}'}
request('/state/practice-1', 'PUT', state)
assert request('/state')[0]['code'] == state['code']
state['completed'] = False
state['notes'] = 'Updated design'
request('/state/practice-1', 'PUT', state)
rows = request('/state')
assert len(rows) == 1 and rows[0]['notes'] == 'Updated design' and rows[0]['completed'] is False
assert request('/state', workspace=str(uuid.uuid4())) == []
try:
    request('/state/unknown', 'PUT', state)
    raise AssertionError('Unknown item was accepted')
except urllib.error.HTTPError as error:
    assert error.code == 404
print('PASS: catalog, database health, insert, update, workspace isolation, and validation')
