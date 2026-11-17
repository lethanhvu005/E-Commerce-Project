#!/usr/bin/env python3
"""Offline, no-network, read-only validation of this Agent Skill bundle.

Usage: python .agents/skills/web-release-quality/scripts/validate_skill.py .
"""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
base = root / '.agents' / 'skills' / 'web-release-quality'
files = {
    'SKILL.md': base / 'SKILL.md',
    'security-20.md': base / 'references' / 'security-20.md',
    'legal-privacy-20.md': base / 'references' / 'legal-privacy-20.md',
    'ui-ux-20.md': base / 'references' / 'ui-ux-20.md',
    'audit-report.md': base / 'templates' / 'audit-report.md',
    'github-issue.md': base / 'templates' / 'github-issue.md',
    'web-quality-always.md': root / '.agents' / 'rules' / 'web-quality-always.md',
}
errors = []
for key, path in files.items():
    if not path.is_file():
        errors.append(f'Missing: {path}')

if not errors:
    skill = files['SKILL.md'].read_text(encoding='utf-8')
    if not skill.startswith('---\n'):
        errors.append('SKILL.md must start with YAML frontmatter')
    if not re.search(r'(?m)^name:\s*web-release-quality\s*$', skill):
        errors.append('SKILL.md: expected name web-release-quality')
    if not re.search(r'(?m)^description:\s*', skill):
        errors.append('SKILL.md: missing description')
    rules = files['web-quality-always.md'].read_text(encoding='utf-8')
    if not rules.startswith('---\n') or not re.search(r'(?m)^trigger:\s*always_on\s*$', rules):
        errors.append('Rule must contain trigger: always_on in YAML frontmatter')
    for prefix, filename in (('S', 'security-20.md'), ('L', 'legal-privacy-20.md'), ('U', 'ui-ux-20.md')):
        content = files[filename].read_text(encoding='utf-8')
        found = re.findall(r'(?m)^###\s+(' + prefix + r'\d{2})\s+—', content)
        expected = [f'{prefix}{i:02d}' for i in range(1, 21)]
        if found != expected:
            errors.append(f'{filename}: expected exactly 20 ordered IDs, got {found}')
        else:
            print(f'[OK] {filename}: {len(found)} items')

if errors:
    for error in errors:
        print('[FAIL]', error, file=sys.stderr)
    sys.exit(1)
print('[OK] skill metadata, 60 IDs, references, templates and always-on rule valid')
