import sys,os,glob,json
from PIL import Image
d=sys.argv[1];rows=[]
for f in sorted(glob.glob(d+'/design_*.png')):
    id=os.path.basename(f)[7:-4];g=d+'/flutter_'+id+'.png'
    if not os.path.exists(g): continue
    a=Image.open(f).convert('RGB');b=Image.open(g).convert('RGB').resize(a.size)
    sa=a.resize((97,211));sb=b.resize((97,211))
    pa=list(sa.getdata());pb=list(sb.getdata())
    diff=sum(abs(x-y) for p,q in zip(pa,pb) for x,y in zip(p,q))/(len(pa)*3)
    rows.append((diff,id))
rows.sort(reverse=True)
json.dump(rows,open(d+'/scores.json','w'))
print(len(rows),'screens; mean',round(sum(r[0] for r in rows)/len(rows),2),'median',round(rows[len(rows)//2][0],2))
print('worst:',[(round(x,1),i) for x,i in rows[:25]])
