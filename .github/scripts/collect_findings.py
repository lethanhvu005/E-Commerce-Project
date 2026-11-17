#!/usr/bin/env python3
"""Collect, normalize and deduplicate audit findings from ruff, bandit, pip-audit, and npm audit (#28)."""
import hashlib
import json
import os
import sys
from pathlib import Path


def generate_fingerprint(tool: str, rule_id: str, file_path: str, context: str = "") -> str:
    """Generate SHA-and-line-independent stable fingerprint for issue deduplication."""
    norm_tool = (tool or "").strip().lower()
    norm_rule = (rule_id or "").strip().lower()
    norm_file = (file_path or "").replace("\\", "/").strip().lower()
    norm_ctx = (context or "").strip().lower()
    raw = f"{norm_tool}::{norm_rule}::{norm_file}::{norm_ctx}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def parse_ruff(data) -> list:
    findings = []
    if not isinstance(data, list):
        return findings
    for item in data:
        code = item.get("code", "RUFF")
        filename = item.get("filename", "")
        norm_filename = filename.replace("\\", "/")
        if "/migrations/" in norm_filename or code in {"I001", "RUF012", "E501"}:
            continue
        message = item.get("message", "")
        line = item.get("location", {}).get("row", 1)
        fp = generate_fingerprint("ruff", code, filename, message[:40])
        findings.append({
            "fingerprint": fp,
            "tool": "ruff",
            "rule_id": code,
            "severity": "LOW" if code.startswith("I") or code.startswith("E") else "MEDIUM",
            "title": f"[ruff][{code}] {message} ({Path(filename).name})",
            "description": f"**File:** `{filename}:{line}`\n**Message:** {message}",
            "file": filename,
            "line": line,
        })
    return findings


def parse_bandit(data) -> list:
    findings = []
    results = data.get("results", []) if isinstance(data, dict) else []
    for item in results:
        test_id = item.get("test_id", "BANDIT")
        issue_text = item.get("issue_text", "")
        filename = item.get("filename", "")
        severity = item.get("issue_severity", "MEDIUM").upper()
        confidence = item.get("issue_confidence", "MEDIUM")
        line = item.get("line_number", 1)
        fp = generate_fingerprint("bandit", test_id, filename, issue_text[:40])
        findings.append({
            "fingerprint": fp,
            "tool": "bandit",
            "rule_id": test_id,
            "severity": severity,
            "title": f"[bandit][{test_id}] {issue_text} ({Path(filename).name})",
            "description": f"**File:** `{filename}:{line}`\n**Severity:** {severity} (Confidence: {confidence})\n**Issue:** {issue_text}",
            "file": filename,
            "line": line,
        })
    return findings


def parse_pip_audit(data) -> list:
    findings = []
    deps = data.get("dependencies", []) if isinstance(data, dict) else []
    for dep in deps:
        name = dep.get("name", "")
        version = dep.get("version", "")
        vulns = dep.get("vulns", [])
        for v in vulns:
            v_id = v.get("id", "VULN")
            desc = v.get("description", "")
            fix_versions = v.get("fix_versions", [])
            fp = generate_fingerprint("pip-audit", v_id, name)
            findings.append({
                "fingerprint": fp,
                "tool": "pip-audit",
                "rule_id": v_id,
                "severity": "HIGH",
                "title": f"[pip-audit][{name}] {v_id} (found {version})",
                "description": f"**Package:** `{name}=={version}`\n**Vulnerability:** {v_id}\n**Fixed in:** {', '.join(fix_versions) or 'N/A'}\n\n{desc[:300]}",
                "file": "requirements.txt",
                "line": 1,
            })
    return findings


def parse_npm_audit(data) -> list:
    findings = []
    vulnerabilities = data.get("vulnerabilities", {}) if isinstance(data, dict) else {}
    for pkg_name, details in vulnerabilities.items():
        severity = details.get("severity", "moderate").upper()
        if severity not in {"HIGH", "CRITICAL"}:
            continue
        via_list = details.get("via", [])
        for via in via_list:
            if isinstance(via, dict):
                rule_id = via.get("source", via.get("name", "NPM"))
                title = via.get("title", "")
                url = via.get("url", "")
                fp = generate_fingerprint("npm-audit", str(rule_id), pkg_name)
                findings.append({
                    "fingerprint": fp,
                    "tool": "npm-audit",
                    "rule_id": str(rule_id),
                    "severity": severity,
                    "title": f"[npm-audit][{pkg_name}] {title or rule_id}",
                    "description": f"**Package:** `{pkg_name}`\n**Severity:** {severity}\n**Advisory:** {url}\n\n{title}",
                    "file": "frontend/package.json",
                    "line": 1,
                })
    return findings


def main():
    base_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    all_findings = []
    seen_fps = set()

    # Load tool json reports if they exist
    ruff_file = base_dir / "ruff-report.json"
    if ruff_file.exists():
        try:
            with open(ruff_file, encoding="utf-8") as f:
                for item in parse_ruff(json.load(f)):
                    if item["fingerprint"] not in seen_fps:
                        seen_fps.add(item["fingerprint"])
                        all_findings.append(item)
        except Exception as e:
            print(f"Warning: failed to parse ruff report: {e}", file=sys.stderr)

    bandit_file = base_dir / "bandit-report.json"
    if bandit_file.exists():
        try:
            with open(bandit_file, encoding="utf-8") as f:
                for item in parse_bandit(json.load(f)):
                    if item["fingerprint"] not in seen_fps:
                        seen_fps.add(item["fingerprint"])
                        all_findings.append(item)
        except Exception as e:
            print(f"Warning: failed to parse bandit report: {e}", file=sys.stderr)

    pip_file = base_dir / "pip-audit-report.json"
    if pip_file.exists():
        try:
            with open(pip_file, encoding="utf-8") as f:
                for item in parse_pip_audit(json.load(f)):
                    if item["fingerprint"] not in seen_fps:
                        seen_fps.add(item["fingerprint"])
                        all_findings.append(item)
        except Exception as e:
            print(f"Warning: failed to parse pip-audit report: {e}", file=sys.stderr)

    npm_file = base_dir / "npm-audit-report.json"
    if npm_file.exists():
        try:
            with open(npm_file, encoding="utf-8") as f:
                for item in parse_npm_audit(json.load(f)):
                    if item["fingerprint"] not in seen_fps:
                        seen_fps.add(item["fingerprint"])
                        all_findings.append(item)
        except Exception as e:
            print(f"Warning: failed to parse npm-audit report: {e}", file=sys.stderr)

    output_file = base_dir / "findings.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_findings, f, indent=2, ensure_ascii=False)

    print(f"Collected {len(all_findings)} deduplicated audit findings into {output_file}")


if __name__ == "__main__":
    main()
