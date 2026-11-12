"""Build HTML tĩnh từ nguồn nhiều CSS/JS sang một CSS + một JS cho demo.
Không phải pipeline production đã tối ưu đầy đủ; chưa minify, hash, CSP, SRI.
"""
from pathlib import Path
from html.parser import HTMLParser
import re,shutil
ROOT=Path(__file__).resolve().parent.parent
DIST=ROOT/'dist'
if DIST.resolve().parent != ROOT.resolve() or DIST.is_symlink():
 raise RuntimeError('Unexpected build output directory')
if DIST.exists(): shutil.rmtree(DIST)
(DIST/'assets/css').mkdir(parents=True)
(DIST/'assets/js').mkdir(parents=True)
shutil.copytree(ROOT/'assets/images', DIST/'assets/images')
shutil.copytree(ROOT/'assets/fonts', DIST/'assets/fonts')
page=(ROOT/'home.html').read_text(encoding='utf-8')
class AssetParser(HTMLParser):
 def __init__(self):
  super().__init__(); self.css=[]; self.js=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=='link' and attrs.get('rel')=='stylesheet' and attrs.get('href','').startswith('assets/css/'):
   self.css.append(attrs['href'])
  if tag=='script' and attrs.get('src','').startswith('assets/js/'):
   self.js.append(attrs['src'])
parser=AssetParser(); parser.feed(page)
csspaths,jspaths=parser.css,parser.js
if len(csspaths)!=16 or len(jspaths)!=24: raise RuntimeError('Đường dẫn assets không đúng cấu trúc V3')
css='\n'.join('/* FILE: '+name+' */\n'+(ROOT/name).read_text(encoding='utf-8') for name in csspaths)
css=css.replace("url('../../fonts/", "url('../fonts/")
css=css.replace("url('../../images/", "url('../images/")
# Keep theme init (small) in the <head> to avoid theme flash; all other JS joined as one classic script.
theme=jspaths.pop(0)
js='\n'.join('/* FILE: '+name+' */\n'+(ROOT/name).read_text(encoding='utf-8') for name in jspaths)
(DIST/'assets/css/app.css').write_text(css,encoding='utf-8')
(DIST/'assets/js/app.js').write_text(js,encoding='utf-8')
(DIST/'assets/js/theme.js').write_text((ROOT/theme).read_text(encoding='utf-8'),encoding='utf-8')
for p in ROOT.glob('*.html'):
 text=p.read_text(encoding='utf-8')
 text=re.sub(r'<link\s+rel="stylesheet"\s+href="assets/css/[^" ]+"\s*/?>','',text)
 text=re.sub(r'<script\s+src="assets/js/[^" ]+"(?:\s+defer)?\s*>\s*</script>','',text)
 text=text.replace('</head>','<script src="assets/js/theme.js"></script>\n<link rel="stylesheet" href="assets/css/app.css">\n</head>')
 text=text.replace('</body>','<script src="assets/js/app.js" defer></script>\n</body>')
 (DIST/p.name).write_text(text,encoding='utf-8')
print('Built:',len(list(DIST.glob('*.html'))),'HTML, 1 CSS bundle, 1 app JS bundle, theme helper; output',DIST)
