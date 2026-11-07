const {test}=require('node:test');
const assert=require('node:assert/strict');
const {approvedOrigin,revisionFromHealth}=require('../../scripts/launch/railway-ci-probe.cjs');
test('probe cannot be redirected to another target or send URL credentials',()=>{
 for(const value of ['http://glamit-web-production.up.railway.app','https://example.com','https://token@glamit-web-production.up.railway.app','https://glamit-web-production.up.railway.app/?key=secret'])assert.throws(()=>approvedOrigin(value));
 assert.equal(approvedOrigin('https://glamit-web-production.up.railway.app'),'https://glamit-web-production.up.railway.app');
});
test('unknown, HTML fallback, failed and conflicting deployment revisions remain unverified',()=>{
 const valid={http_status:200,content_type:'application/json',service:'web',commit:'a'.repeat(40)};
 assert.equal(revisionFromHealth([valid]),valid.commit);
 for(const rows of [[],[{...valid,http_status:503}],[{...valid,content_type:'text/html'}],[{...valid,commit:'unknown'}],[valid,{...valid,commit:'b'.repeat(40)}]])assert.equal(revisionFromHealth(rows),null);
});
