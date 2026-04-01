import os
import re

frontend_dir = r"d:\Agent_VS\frontend\src"

replacements = [
    (r"rgba\(255,\s*255,\s*255,\s*0\.05\)", "var(--input-bg)"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.1\)", "var(--border-color)"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.02\)", "var(--border-color)"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.6\)", "var(--text-muted)"),
    (r"rgba\(255,255,255,0\.05\)", "var(--input-bg)"),
    (r"rgba\(255,255,255,0\.1\)", "var(--border-color)"),
    (r"rgba\(255,255,255,0\.02\)", "var(--border-color)"),
    (r"rgba\(255,255,255,0\.6\)", "var(--text-muted)"),
    (r"color:\s*['\"]white['\"]", "color: 'var(--text-primary)'"),
    (r"color:\s*['\"]#fff['\"]", "color: 'var(--text-primary)'"),
    (r"color:\s*['\"]#ffffff['\"]", "color: 'var(--text-primary)'")
]

for root, _, files in os.walk(frontend_dir):
    for filename in files:
        if filename.endswith(".jsx"):
            filepath = os.path.join(root, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content
            for pattern, repl in replacements:
                new_content = re.sub(pattern, repl, new_content)
                
            if new_content != content:
                print(f"Updated {filename}")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

print("Done.")
