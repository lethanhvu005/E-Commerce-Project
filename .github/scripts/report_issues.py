#!/usr/bin/env python3
"""Create GitHub issues from findings.json with deduplication against existing open & closed issues (#28)."""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

MAX_ISSUES_PER_RUN = 5
FP_REGEX = re.compile(r"<!--\s*audit-fingerprint:\s*([a-f0-9]{16})\s*-->")


def github_api_request(method: str, url: str, token: str, data: dict = None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "NEXA-CI-Audit-Bot",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_existing_fingerprints(repo: str, token: str) -> set:
    existing = set()
    for state in ("open", "closed"):
        page = 1
        while page <= 10:  # Safety limit up to 1000 issues
            url = f"https://api.github.com/repos/{repo}/issues?state={state}&labels=audit&per_page=100&page={page}"
            try:
                issues = github_api_request("GET", url, token)
            except urllib.error.HTTPError as e:
                print(f"Warning: Failed to fetch {state} issues (HTTP {e.code})", file=sys.stderr)
                break
            if not issues:
                break
            for issue in issues:
                body = issue.get("body") or ""
                match = FP_REGEX.search(body)
                if match:
                    existing.add(match.group(1))
            if len(issues) < 100:
                break
            page += 1
    return existing


def main():
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY")
    dry_run = os.getenv("DRY_RUN", "false").lower() in ("true", "1", "yes")

    findings_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("findings.json")
    if not findings_file.exists():
        print(f"Findings file {findings_file} not found; skipping issue reporting.")
        return

    with open(findings_file, encoding="utf-8") as f:
        findings = json.load(f)

    if not findings:
        print("No audit findings to report. Clean scan!")
        return

    if not token or not repo:
        print("GITHUB_TOKEN or GITHUB_REPOSITORY not set. Running in local dry-run mode.")
        print(f"Total findings found: {len(findings)}")
        for f in findings[:5]:
            print(f" - [{f['tool']}] {f['title']} (FP: {f['fingerprint']})")
        return

    existing_fps = get_existing_fingerprints(repo, token)
    print(f"Loaded {len(existing_fps)} existing audit fingerprints from repository issues.")

    new_findings = [f for f in findings if f["fingerprint"] not in existing_fps]
    print(f"Identified {len(new_findings)} new findings not yet tracked in GitHub Issues.")

    if dry_run:
        print("DRY_RUN is enabled. No issues will be created in this run.")
        for f in new_findings[:MAX_ISSUES_PER_RUN]:
            print(f" [DRY-RUN] Would create issue: {f['title']} (FP: {f['fingerprint']})")
        return

    created_count = 0
    for finding in new_findings:
        if created_count >= MAX_ISSUES_PER_RUN:
            print(f"Reached batch limit of {MAX_ISSUES_PER_RUN} issues per run. Stopping.")
            break

        fp = finding["fingerprint"]
        tool = finding["tool"]
        sev = finding["severity"].lower()
        title = f"[Audit][{tool.upper()}] {finding['title']}"
        body = f"""### 🛡️ Phát Hiện Bảo Mật & Kiểm Toán Tự Động (CI Audit)

- **Công cụ:** `{tool}`
- **Quy tắc:** `{finding.get('rule_id', 'N/A')}`
- **Mức độ:** `{finding.get('severity', 'MEDIUM')}`
- **Tập tin:** `{finding.get('file', 'N/A')}:{finding.get('line', 1)}`

#### Mô tả chi tiết:
{finding.get('description', '')}

---
<!-- audit-fingerprint: {fp} -->
*Thông báo được tạo tự động bởi GitHub Actions CI Audit Pipeline. Fingerprint trên được dùng để chống tạo trùng lặp.*
"""
        labels = ["audit", "security", f"severity:{sev}"]
        payload = {
            "title": title[:250],
            "body": body,
            "labels": labels,
        }

        try:
            url = f"https://api.github.com/repos/{repo}/issues"
            res = github_api_request("POST", url, token, payload)
            print(f"Created issue #{res.get('number')}: {title} (FP: {fp})")
            created_count += 1
        except urllib.error.HTTPError as e:
            print(f"Failed to create issue for {fp}: HTTP {e.code} - {e.read().decode('utf-8', errors='ignore')}", file=sys.stderr)

    print(f"Successfully created {created_count} new audit issues.")


if __name__ == "__main__":
    main()
