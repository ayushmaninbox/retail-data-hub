import os

base = r'c:\Users\Ayushman\Downloads\retail-data-hub\dashboard\src\app'
replacements = [
    ('text-white', 'text-slate-800'),
    ('border-white/10', 'border-black/[0.06]'),
    ('border-white/[0.06]', 'border-black/[0.06]'),
    ('border-white/[0.08]', 'border-black/[0.06]'),
    ('border-white/[0.04]', 'border-black/[0.04]'),
    ('hover:bg-white/[0.04]', 'hover:bg-black/[0.03]'),
    ('hover:bg-white/[0.06]', 'hover:bg-black/[0.03]'),
    ('bg-white/[0.04]', 'bg-black/[0.03]'),
    ('bg-white/[0.06]', 'bg-black/[0.04]'),
    ('bg-white/[0.02]', 'bg-black/[0.02]'),
    ('text-slate-300', 'text-slate-600'),
    ('rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'),
    ('rgba(255,255,255,0.06)', 'rgba(0,0,0,0.05)'),
    ('rgba(255,255,255,0.08)', 'rgba(0,0,0,0.06)'),
    ('rgba(255,255,255,0.1)', 'rgba(0,0,0,0.08)'),
    ('rgba(255,255,255,0.02)', 'rgba(0,0,0,0.02)'),
    ('rgba(255,255,255,0.04)', 'rgba(0,0,0,0.03)'),
    ('rgba(15,15,35,0.95)', 'rgba(255,255,255,0.97)'),
    ('rgba(10,10,25,0.85)', 'rgba(255,255,255,0.9)'),
    ("color: '#fff'", "color: '#1e293b'"),
    ('color: "#fff"', 'color: "#1e293b"'),
    ('hover:text-white', 'hover:text-slate-800'),
]

skip_dirs = ['sales']

for root, dirs, files in os.walk(base):
    for f in files:
        if f == 'page.tsx':
            rel = os.path.relpath(root, base)
            if rel in skip_dirs or rel == '.':
                continue
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            for old, new in replacements:
                content = content.replace(old, new)
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(content)
            print(f'Updated: {rel}/{f}')
print('Done!')
