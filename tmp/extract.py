import re,sys
data=open(sys.argv[1],'rb').read()
texts=re.findall(rb'\((?:[^()\\]|\\.)*\)', data)
out=[]
for t in texts:
    s=t[1:-1]
    s=s.replace(b'\\n',b'\n').replace(b'\\r',b'\r').replace(b'\\t',b'\t')
    s=re.sub(rb'\\(.)', rb'\1', s)
    try:
        out.append(s.decode('latin-1'))
    except:
        pass
print('\n'.join(out))
PY