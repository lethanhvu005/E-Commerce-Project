"""Kiểm tra tĩnh các liên kết local và JavaScript; không thay thế E2E/browser tests."""
from pathlib import Path
from html.parser import HTMLParser
from xml.etree import ElementTree
from subprocess import run,DEVNULL
ROOT=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
    def __init__(self):super().__init__();self.refs=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        v=attrs.get('src') or (attrs.get('href') if tag=='link' else None)
        if v and not v.startswith(('http://','https://','data:','#','//')):self.refs.append(v)
errors=[]
for directory in (ROOT,ROOT/'dist'):
    pages=list(directory.glob('*.html'))
    for page in pages:
        p=Links();p.feed(page.read_text(encoding='utf-8'))
        for ref in p.refs:
            if not (directory/ref.split('?')[0]).is_file():errors.append(f'{page.name}: asset missing: {ref}')
    print(directory.name,':',len(pages),'HTML pages')
for svg in (ROOT/'assets/images').rglob('*.svg'):
    try:ElementTree.parse(svg)
    except Exception as e:errors.append(f'{svg.name}: invalid SVG: {e}')
for js in (ROOT/'assets/js').rglob('*.js'):
    check=run(['node','--check',str(js)],stdout=DEVNULL,stderr=DEVNULL)
    if check.returncode:errors.append(f'{js.name}: JavaScript syntax error')
print('Errors:',len(errors))
for e in errors[:30]:print(e)
if errors:raise SystemExit(1)
