// Run against a disposable database and a running API after `npm ci` in frontend.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const signalR = require('../frontend/node_modules/@microsoft/signalr');
const origin = process.argv[2] || 'http://localhost:5000';
const connections = [];
const projects = [];
let owner;

async function api(method, path, token, body) {
  const response = await fetch(`${origin}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${await (!response.ok ? response.text() : Promise.resolve(''))}`);
  return response.status === 204 ? null : response.json();
}

function connection(projectId, token) {
  const hub = new signalR.HubConnectionBuilder()
    .withUrl(`${origin}/hubs/board?projectId=${projectId}`, { accessTokenFactory: () => token })
    .configureLogging(signalR.LogLevel.None).build();
  connections.push(hub);
  return hub;
}

function nextEvent(hub, name) {
  return new Promise((resolve, reject) => {
    const handler = (payload) => { clearTimeout(timer); hub.off(name, handler); resolve(payload); };
    const timer = setTimeout(() => { hub.off(name, handler); reject(new Error(`Missing ${name} event`)); }, 5000);
    hub.on(name, handler);
  });
}

async function main() {
  const register = (name) => api('POST', '/auth/register', null, {
    displayName: name, email: `${name}-${randomUUID()}@example.test`, password: 'TestPass123!'
  });
  owner = await register('hub-owner');
  const member = await register('hub-member');
  for (const name of ['Hub test', 'Private project']) {
    projects.push(await api('POST', '/projects', owner.token, { name }));
  }
  const projectId = projects[0].id;
  const base = `/projects/${projectId}`;
  const membership = await api('POST', `${base}/members`, owner.token, { email: member.user.email, role: 0 });
  const unauthorized = await fetch(`${origin}/hubs/board/negotiate?negotiateVersion=1&projectId=${projectId}`, { method: 'POST' });
  assert.equal(unauthorized.status, 401, 'Anonymous hub negotiation must be rejected');

  const ownerHub = connection(projectId, owner.token);
  const memberHub = connection(projectId, member.token);
  await ownerHub.start();
  await memberHub.start();
  // Also exercises membership validation on the public method, not only connection setup.
  await assert.rejects(memberHub.invoke('JoinProject', projects[1].id));

  const deniedHub = connection(projects[1].id, member.token);
  let closed;
  const disconnected = new Promise((resolve) => { closed = resolve; });
  deniedHub.onclose(() => closed(true));
  try { await deniedHub.start(); } catch { closed(true); }
  assert.equal(await Promise.race([disconnected, new Promise((resolve) => setTimeout(() => resolve(false), 5000))]), true,
    'A non-member must not remain connected to a private project');

  const ownerEvent = nextEvent(ownerHub, 'taskCreated');
  const memberEvent = nextEvent(memberHub, 'taskCreated');
  const task = await api('POST', `${base}/tasks`, owner.token, { title: 'Shared task', priority: 1, issueType: 0 });
  const received = await Promise.all([ownerEvent, memberEvent]);
  received.forEach((event) => assert.equal(event.id, task.id));

  const movedEvent = nextEvent(memberHub, 'boardChanged');
  await api('PATCH', `${base}/tasks/${task.id}/move`, owner.token, { status: 1, order: 0 });
  assert.equal(await movedEvent, projectId);

  await api('DELETE', `${base}/members/${membership.id}`, owner.token);
  let leaked = false;
  memberHub.on('taskCreated', () => { leaked = true; });
  const nextOwnerEvent = nextEvent(ownerHub, 'taskCreated');
  await api('POST', `${base}/tasks`, owner.token, { title: 'After removal', priority: 1, issueType: 0 });
  await nextOwnerEvent;
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.equal(leaked, false, 'Removed members must not receive new task events');
  await assert.rejects(memberHub.invoke('JoinProject', projectId));
  console.log('PASS: hub authentication, membership, task events, movement and member removal');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.allSettled(connections.map((hub) => hub.stop()));
  for (const project of projects) {
    try { await api('DELETE', `/projects/${project.id}`, owner.token); }
    catch (error) { console.error('Test project cleanup failed:', error.message); process.exitCode = 1; }
  }
  // Identity accounts remain: always use a disposable test database.
});
