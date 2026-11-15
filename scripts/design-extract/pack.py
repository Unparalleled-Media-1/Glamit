import json,gzip,os,sys
SP='/tmp/claude-0/-home-claude-glamit/94723915-bf6d-50b2-9779-6f01bf7499aa/scratchpad'
for v in sys.argv[1:]:
    src=f'{SP}/x_{v}.json'
    if not os.path.exists(src): print('missing',v);continue
    d=json.load(open(src))
    open(f'assets/screens/{v}.json.gz','wb').write(gzip.compress(json.dumps(d,separators=(',',':')).encode(),9))
    print(v,len(d),os.path.getsize(f'assets/screens/{v}.json.gz'))
