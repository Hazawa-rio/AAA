"""在所有 js / css / html 蓋上同一個版本號。

用法（在專案根目錄）：
    python tools/stamp_version.py

做的事：
- 每個 js 檔第一行登記「這個檔案的版本」到 RPG.files
- 每個 css 檔最後一行宣告自己的版本（CSS 變數）
- html 的 <meta name="build"> 和所有 js / css 引用的 ?v= 改成同一個版本號
網頁打開時會比對：只要有檔案不是這個版本（上傳時漏掉、瀏覽器快取到舊檔），
畫面最上方就會跳出紅色提示，列出是哪幾個檔案。
"""
import pathlib
import re
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
VER = time.strftime("%Y%m%d%H%M%S")

JS_MARK = re.compile(r"^/\* build \*/.*\n")
CSS_MARK = re.compile(r"\n/\* build \*/.*\n?$")


def stamp_js(p):
    rel = p.relative_to(ROOT).as_posix()
    s = JS_MARK.sub("", p.read_text(encoding="utf-8"))
    line = ('/* build */ (window.RPG = window.RPG || {}).files = Object.assign(window.RPG.files || {}, '
            f'{{ "{rel}": "{VER}" }});\n')
    p.write_text(line + s, encoding="utf-8")


def css_var(rel):
    return "--build-" + re.sub(r"[^a-z0-9]+", "-", rel.lower()).strip("-")


def stamp_css(p):
    rel = p.relative_to(ROOT).as_posix()
    s = CSS_MARK.sub("", p.read_text(encoding="utf-8")).rstrip("\n")
    p.write_text(s + f'\n/* build */ :root {{ {css_var(rel)}: "{VER}"; }}\n', encoding="utf-8")


def stamp_html(p):
    s = p.read_text(encoding="utf-8")
    s = re.sub(r'((?:src|href)="(?:js|css)/[^"?]+\.(?:js|css))(\?v=[^"]*)?"', rf'\1?v={VER}"', s)
    meta = f'<meta name="build" content="{VER}">'
    if '<meta name="build"' in s:
        s = re.sub(r'<meta name="build" content="[^"]*">', meta, s)
    else:
        s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + meta, 1)
    p.write_text(s, encoding="utf-8")


for f in ROOT.glob("js/**/*.js"):
    stamp_js(f)
for f in ROOT.glob("css/*.css"):
    stamp_css(f)
for f in ROOT.glob("*.html"):
    stamp_html(f)
print("build", VER)
