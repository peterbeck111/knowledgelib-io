#!/usr/bin/env python3
"""
Input:  path to a Git repository directory (default: current directory)
Output: dict with HEAD state, branch info, detached commits, and recovery commands
"""
import subprocess
import sys
from pathlib import Path

def run_git(args: list[str], cwd: str = '.') -> tuple[str, int]:
    """Run a git command and return (stdout, returncode)."""
    result = subprocess.run(
        ['git'] + args,
        capture_output=True, text=True, cwd=cwd
    )
    return result.stdout.strip(), result.returncode

def analyze_head_state(repo_path: str = '.') -> dict:
    """Analyze the HEAD state of a git repository."""
    # Check if it's a git repo
    _, rc = run_git(['rev-parse', '--git-dir'], repo_path)
    if rc != 0:
        return {'error': f'{repo_path} is not a Git repository'}

    # Check HEAD
    head_ref_path = Path(repo_path) / '.git' / 'HEAD'
    head_content = head_ref_path.read_text().strip()

    result = {'repo': repo_path, 'head_content': head_content}

    if head_content.startswith('ref: refs/heads/'):
        branch = head_content.replace('ref: refs/heads/', '')
        sha, _ = run_git(['rev-parse', '--short', 'HEAD'], repo_path)
        result.update({
            'state': 'normal',
            'branch': branch,
            'sha': sha,
            'message': f'✅ On branch: {branch} ({sha})',
            'recovery_needed': False,
        })
    else:
        # Detached HEAD
        sha, _ = run_git(['rev-parse', '--short', 'HEAD'], repo_path)

        # Find last branch from reflog
        reflog, _ = run_git(['reflog', '--pretty=%gs'], repo_path)
        last_branch = None
        for entry in reflog.splitlines():
            if 'checkout: moving from' in entry:
                parts = entry.split('moving from ')
                if len(parts) > 1:
                    last_branch = parts[1].split(' to ')[0]
                    break

        # Count detached commits
        detached_commits = []
        if last_branch:
            commits_out, _ = run_git(
                ['log', '--oneline', f'{last_branch}..HEAD'], repo_path
            )
            detached_commits = [c for c in commits_out.splitlines() if c]

        result.update({
            'state': 'detached',
            'sha': sha,
            'last_branch': last_branch,
            'detached_commit_count': len(detached_commits),
            'detached_commits': detached_commits,
            'message': f'⚠️ DETACHED HEAD at {sha}',
            'recovery_needed': True,
            'recovery_commands': {
                'save_to_new_branch': f'git switch -c <branch-name>',
                'discard_and_return': f'git switch {last_branch or "main"}',
                'cherry_pick': f'git switch <target> && git cherry-pick {sha}',
            }
        })

    return result

def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else '.'
    info = analyze_head_state(repo)

    if 'error' in info:
        print(f"Error: {info['error']}")
        sys.exit(1)

    print(f"Repository: {info['repo']}")
    print(f"Status: {info['message']}")

    if info['state'] == 'detached':
        print(f"Last branch: {info.get('last_branch', 'unknown')}")
        print(f"Commits made while detached: {info['detached_commit_count']}")

        if info['detached_commits']:
            print("Detached commits:")
            for c in info['detached_commits']:
                print(f"  {c}")

        print("\nRecovery commands:")
        for action, cmd in info['recovery_commands'].items():
            print(f"  {action}: {cmd}")

if __name__ == '__main__':
    main()
