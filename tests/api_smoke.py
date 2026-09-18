"""Integration checks against a RUNNING API and an expendable local/test database.
Creates uniquely named users and projects; does not touch existing projects.
Run: python tests/api_smoke.py [http://localhost:5000/api]
"""
import json, sys, uuid, urllib.request, urllib.error
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:5000/api'
checks=0

def call(method,path,data=None,token=None,status=200):
 global checks
 payload=json.dumps(data).encode() if data is not None else None
 headers={'Content-Type':'application/json'}
 if token: headers['Authorization']='Bearer '+token
 req=urllib.request.Request(BASE+path,data=payload,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=20) as res:code=res.status;body=res.read()
 except urllib.error.HTTPError as err:code=err.code;body=err.read()
 assert code==status,f'{method} {path}: expected {status}, got {code}: {body.decode()}'
 checks+=1
 return json.loads(body) if body else None

def register(name):
 return call('POST','/auth/register',{'displayName':name,'email':f'{name}-{uuid.uuid4().hex}@example.test','password':'TestPass123!'})

a=register('owner');b=register('member'); outsider=register('outsider')
at=a['token'];bt=b['token'];ot=outsider['token']
login=call('POST','/auth/login',{'email':a['user']['email'],'password':'TestPass123!'})
assert login['user']['id']==a['user']['id'] and login['token']
call('POST','/auth/login',{'email':a['user']['email'],'password':'WrongPass123!'},status=400)
call('POST','/auth/register',{'displayName':'Duplicate','email':a['user']['email'],'password':'TestPass123!'},status=400)
call('GET','/projects',status=401)
call('GET','/projects',token='invalid-token',status=401)
p=call('POST','/projects',{'name':'Smoke test '+uuid.uuid4().hex[:8]},at,status=201)
p2=call('POST','/projects',{'name':'Second test project'},at,status=201)
base='/projects/'+p['id']; other='/projects/'+p2['id']
try:
 # Full task CRUD and project isolation, independently of sprint planning.
 basic={'title':'CRUD task','description':'Original','priority':1,'issueType':0}
 call('POST',base+'/tasks',{**basic,'title':'   '},at,status=400)
 crud=call('POST',base+'/tasks',basic,at,status=201)
 task_path=base+'/tasks/'+crud['id']
 assert call('GET',task_path,token=at)['title']==basic['title']
 changed=call('PUT',task_path,{**basic,'title':'Updated task','description':'Updated','priority':2},at)
 assert changed['title']=='Updated task' and changed['priority']==2
 call('PUT',task_path,{**basic,'assigneeId':outsider['user']['id']},at,status=400)
 call('GET',other+'/tasks/'+crud['id'],token=at,status=404)
 call('DELETE',task_path,token=ot,status=403)
 call('DELETE',task_path,token=at,status=204)
 call('GET',task_path,token=at,status=404)
 call('POST',base+'/members',{'email':b['user']['email'],'role':0},at,status=200)
 call('GET',base+'/tasks',token=ot,status=403)
 call('GET',base+'/sprints',token=ot,status=403)
 sprint={'name':'Sprint 1','goal':'Validate planning','startDate':'2026-09-01','endDate':'2026-09-15'}
 call('POST',base+'/sprints',sprint,bt,status=403)
 call('POST',base+'/sprints',{**sprint,'endDate':'2026-08-30'},at,status=400)
 s=call('POST',base+'/sprints',sprint,at)
 s2=call('POST',base+'/sprints',{**sprint,'name':'Sprint 2'},at)
 foreign=call('POST',other+'/sprints',sprint,at)
 task={'title':'Issue A','priority':1,'issueType':1,'storyPoints':5,'dueDate':'2026-09-20','assigneeId':b['user']['id'],'sprintId':s['id']}
 call('POST',base+'/tasks',{**task,'assigneeId':outsider['user']['id']},at,status=400)
 call('POST',base+'/tasks',{**task,'sprintId':foreign['id']},at,status=400)
 call('POST',base+'/tasks',{**task,'storyPoints':-1},at,status=400)
 t=call('POST',base+'/tasks',task,bt,status=201)
 t2=call('POST',base+'/tasks',{**task,'title':'Issue B'},bt,status=201)
 assert t['assigneeId']==b['user']['id'] and t['storyPoints']==5
 call('POST',base+'/sprints/'+s['id']+'/complete',{},at,status=400)
 call('POST',base+'/sprints/'+s['id']+'/start',{},at,status=204)
 call('POST',base+'/sprints/'+s2['id']+'/start',{},at,status=400)
 call('PATCH',base+'/tasks/'+t['id']+'/move',{'status':77,'order':0},bt,status=400)
 call('PATCH',base+'/tasks/'+t['id']+'/move',{'status':2,'order':0},bt)
 call('POST',base+'/sprints/'+s['id']+'/complete',{},at,status=204)
 completed=call('GET',base+'/tasks/'+t['id'],token=bt)
 unfinished=call('GET',base+'/tasks/'+t2['id'],token=bt)
 assert completed['sprintId']==s['id'] and unfinished['sprintId'] is None
 call('PATCH',base+'/tasks/'+t['id']+'/move',{'status':0,'order':0},bt,status=400)
 call('POST',base+'/tasks',task,bt,status=400)
 foreign_label=call('POST',other+'/labels',{'name':'Other project','colorHex':'#6655d9'},at,status=200)
 call('PUT',base+'/tasks/'+t2['id']+'/labels',[foreign_label['id']],at,status=400)
 # User is a member of both projects, but task belongs to only one.
 call('GET',other+'/tasks/'+t2['id']+'/attachments',token=at,status=404)
 # Reordering persists unique contiguous order inside one status/sprint bucket.
 t3=call('POST',base+'/tasks',{**task,'title':'Issue C','sprintId':None},at,status=201)
 call('PATCH',base+'/tasks/'+t3['id']+'/move',{'status':0,'order':0},at)
 tasks=call('GET',base+'/tasks',token=at)
 bucket=sorted([x for x in tasks if x['sprintId'] is None and x['status']==0],key=lambda x:x['order'])
 assert bucket[0]['id']==t3['id'] and [x['order'] for x in bucket]==list(range(len(bucket)))
 print(f'PASS: {checks} HTTP assertions plus assignment, sprint rollover and ordering checks.')
finally:
 call('DELETE',base,token=at,status=204)
 call('DELETE',other,token=at,status=204)
 # Test accounts remain; use a disposable database when running repeatedly.
