import { execSync, ExecSyncOptions } from 'child_process';
import {
    NotARepositoryError,
    GenericVCSError,
    VCSNotFoundError,
    VcsStatus,
    CommitParams,
    Reference,
    Vcs,
    VcsType,
    VcsCapabilities
} from './types.js';
import * as fs from 'fs';
import * as path from 'path';

// FossilVcs shells out to the `fossil` CLI (there is no Python/Node fossil
// binding equivalent to simple-git/isomorphic-git). Every command mapping
// below was hand-verified against a real fossil 2.23 install during the
// Scrummaster migration — fossil's CLI has several genuine surprises versus
// git (no `fossil technote` subcommand, `fossil patch` is an unrelated
// binary-patch format, `fossil changes` doesn't report untracked files,
// etc.) documented inline where they matter.
export class FossilVcs implements Vcs {
    private runCommand(command: string, options?: ExecSyncOptions): string {
        try {
            return (execSync(command, { stdio: 'pipe', encoding: 'utf-8', ...options }) as string).trim();
        } catch (error: any) {
            const stderr = error.stderr?.toString().toLowerCase() || '';

            if (error.code === 'ENOENT' || stderr.includes('command not found') || stderr.includes('enoent')) {
                throw new VCSNotFoundError('Fossil executable not found');
            }
            if (stderr.includes('not within an open check-out') || stderr.includes('is not a valid check-in')) {
                throw new NotARepositoryError('Not a Fossil checkout');
            }
            throw new GenericVCSError(error.message, command, error.status);
        }
    }

    private info(repoPath: string): Record<string, string> {
        let output: string;
        try {
            output = this.runCommand('fossil info', { cwd: repoPath });
        } catch {
            return {};
        }
        const info: Record<string, string> = {};
        for (const line of output.split('\n')) {
            const match = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
            if (match) info[match[1]] = match[2].trim();
        }
        return info;
    }

    private checkoutHash(repoPath: string): string {
        const info = this.info(repoPath);
        const checkout = info['checkout'];
        if (!checkout) throw new NotARepositoryError('Not within an open Fossil checkout');
        return checkout.split(/\s+/)[0];
    }

    is_repository(repoPath: string): VcsType | null {
        const info = this.info(repoPath);
        return info['checkout'] ? VcsType.Fossil : null;
    }

    init(repoPath: string): void {
        const repoFile = path.join(repoPath, `${path.basename(repoPath) || 'repo'}.fossil`);
        this.runCommand(`fossil init "${repoFile}"`, { cwd: repoPath });
        this.runCommand(`fossil open "${repoFile}"`, { cwd: repoPath });
    }

    get_root_path(repoPath: string): string {
        const info = this.info(repoPath);
        const root = info['local-root'];
        if (!root) throw new NotARepositoryError('Not within an open Fossil checkout');
        return root.replace(/\/$/, '');
    }

    get_capabilities(): VcsCapabilities {
        return {
            // `fossil add` stages a file for the *next* commit but there is no
            // separate index/staging snapshot distinct from the working tree
            // the way git's index is — closer to "no staging area" in spirit.
            has_staging_area: false,
            // Fossil deliberately discourages history rewriting; there is no
            // rebase/amend-equivalent porcelain command.
            supports_rewrite_history: false,
            distinguishes_change_id: false,
        };
    }

    get_status(repoPath: string): VcsStatus {
        const status: VcsStatus = { modified: [], untracked: [], added: [], deleted: [], conflicted: [], renamed: [], is_operation_in_progress: { type: 'none' } };
        const output = this.runCommand('fossil changes --differ', { cwd: repoPath });
        for (const line of output.split('\n')) {
            if (!line.trim()) continue;
            const renameMatch = line.match(/^(\S+)\s+(.+?)\s+->\s+(.+)$/);
            if (renameMatch) {
                status.renamed.push({ from: renameMatch[2].trim(), to: renameMatch[3].trim() });
                continue;
            }
            const match = line.match(/^(\S+)\s+(.+)$/);
            if (!match) continue;
            const [, kind, file] = match;
            switch (kind) {
                case 'EDITED':
                case 'UPDATED':
                    status.modified.push(file.trim());
                    break;
                case 'ADDED':
                    status.added.push(file.trim());
                    break;
                case 'DELETED':
                    status.deleted.push(file.trim());
                    break;
                // A plain (non-renamed) MISSING file is ambiguous in Fossil —
                // it covers both `rm`'d-but-not-`fossil rm`'d files and files
                // genuinely removed from disk. Treat it as deleted, matching
                // the practical effect of `fossil commit` on it.
                case 'MISSING':
                    status.deleted.push(file.trim());
                    break;
                case 'CONFLICT':
                    status.conflicted.push(file.trim());
                    break;
            }
        }

        const extras = this.runCommand('fossil extras', { cwd: repoPath });
        for (const line of extras.split('\n')) {
            if (line.trim()) status.untracked.push(line.trim());
        }

        return status;
    }

    switch_reference({ path: repoPath, reference }: { path: string, reference: string }): void {
        this.runCommand(`fossil update ${reference}`, { cwd: repoPath });
    }

    create_commit({ path: repoPath, message, files }: CommitParams): { commit_id: string, change_id: string } {
        if (files && files.length > 0) {
            const escapedFiles = files.map(f => `"${f}"`).join(' ');
            this.runCommand(`fossil add ${escapedFiles}`, { cwd: repoPath });
        } else if (files === undefined) {
            this.runCommand('fossil add .', { cwd: repoPath });
        }

        const allowEmpty = files && files.length === 0 ? ' --allow-empty' : '';
        this.runCommand(`fossil commit${allowEmpty} -m "${message.replace(/"/g, '\\"')}" --no-warnings`, { cwd: repoPath });
        const commitId = this.checkoutHash(repoPath);
        return { commit_id: commitId, change_id: commitId };
    }

    is_binary(repoPath: string, filePath: string): boolean {
        // Fossil has no `git check-attr`-equivalent CLI query for a file's
        // binary flag; fall back to content sniffing, same as git.ts's
        // fallback path when gitattributes doesn't specify.
        const fullPath = path.join(repoPath, filePath);
        if (!fs.existsSync(fullPath)) return false;
        const stat = fs.statSync(fullPath);
        if (stat.size === 0) return false;
        const buffer = Buffer.alloc(8000);
        const fd = fs.openSync(fullPath, 'r');
        try {
            const bytesRead = fs.readSync(fd, buffer, 0, 8000, 0);
            return buffer.subarray(0, bytesRead).includes(0);
        } finally {
            fs.closeSync(fd);
        }
    }

    is_ignored(repoPath: string, filePath: string): boolean {
        const ignored = this.get_ignored_files(repoPath);
        return ignored.includes(filePath);
    }

    get_ignored_files(repoPath: string): string[] {
        // `fossil extras --ignore` lists extras that WOULD be ignored per the
        // repo's ignore-glob setting but aren't shown by plain `fossil
        // extras` (which already excludes them) — there's no single flag
        // that lists ignored files directly, so we diff the two views.
        try {
            const allExtras = this.runCommand('fossil extras --include-empty-dirs', { cwd: repoPath });
            const settings = this.runCommand('fossil settings ignore-glob', { cwd: repoPath }).trim();
            if (!settings) return [];
            // Best-effort: settings prints "ignore-glob   <value>"; the glob
            // list itself needs manual matching, which is out of scope for a
            // lightweight adapter. Report nothing rather than guess wrong.
            void allExtras;
            return [];
        } catch {
            return [];
        }
    }

    get_file_content(repoPath: string, revision: string, filePath: string): string {
        return this.runCommand(`fossil cat -r ${revision} "${filePath}"`, { cwd: repoPath });
    }

    get_diff(repoPath: string, revisionRange: string | undefined, filePath?: string): string | null {
        if (filePath && this.is_binary(repoPath, filePath)) return null;
        const file = filePath ? ` -- "${filePath}"` : '';
        try {
            if (revisionRange && revisionRange.includes('..')) {
                const [from, to] = revisionRange.split('..');
                return this.runCommand(`fossil diff --from ${from} --to ${to}${file}`, { cwd: repoPath });
            }
            if (revisionRange) {
                return this.runCommand(`fossil diff --from ${revisionRange} --to current${file}`, { cwd: repoPath });
            }
            return this.runCommand(`fossil diff${file}`, { cwd: repoPath });
        } catch {
            return null;
        }
    }

    get_binary_diff_info(repoPath: string, filePath: string, revisionRange?: string): { is_binary: boolean, old_size: number, new_size: number } | null {
        if (!this.is_binary(repoPath, filePath)) return null;

        let oldRev = 'current';
        let newRev: string | null = null;
        if (revisionRange) {
            if (revisionRange.includes('..')) {
                [oldRev, newRev] = revisionRange.split('..');
            } else {
                oldRev = revisionRange;
            }
        }

        try {
            const oldContent = this.runCommand(`fossil cat -r ${oldRev} "${filePath}"`, { cwd: repoPath, encoding: 'buffer' } as any) as unknown as Buffer;
            let newSize: number;
            if (newRev) {
                const newContent = this.runCommand(`fossil cat -r ${newRev} "${filePath}"`, { cwd: repoPath, encoding: 'buffer' } as any) as unknown as Buffer;
                newSize = Buffer.byteLength(newContent);
            } else {
                newSize = fs.statSync(path.join(repoPath, filePath)).size;
            }
            return { is_binary: true, old_size: Buffer.byteLength(oldContent), new_size: newSize };
        } catch {
            return null;
        }
    }

    get_changed_files(repoPath: string, revisionRange: string): string[] {
        let output: string;
        if (revisionRange.includes('..')) {
            const [from, to] = revisionRange.split('..');
            output = this.runCommand(`fossil diff --from ${from} --to ${to} --brief`, { cwd: repoPath });
        } else {
            output = this.runCommand(`fossil diff --from ${revisionRange} --to current --brief`, { cwd: repoPath });
        }
        return output.split('\n').map(l => l.trim()).filter(Boolean);
    }

    get_log(repoPath: string, limit: number, revisionRange?: string, filePath?: string): { commit_id: string, message: string, date: string, author: string }[] {
        const file = filePath ? ` -p "${filePath}"` : '';
        // Fossil's timeline has no A..B range syntax like `git log A..B`; the
        // closest is `timeline before B` (ancestors of B) or, for a genuine
        // two-sided range, `timeline after A` filtered by `before B`. We
        // approximate with `before <end-of-range>` since that's the common
        // case (limiting how far back the log goes).
        const endRev = revisionRange?.includes('..') ? revisionRange.split('..')[1] : revisionRange;
        const when = endRev ? ` before ${endRev}` : '';
        // `fossil timeline -F` does NOT interpret a `%x00`-style escape the
        // way git's --pretty=format does (verified — it prints the literal
        // text "%x00"). Embed a real control character (\x01) in the format
        // string itself instead, and split on that same byte.
        const delim = '\x01';
        const output = this.runCommand(
            `fossil timeline${when} -n ${limit} -F "%H${delim}%c${delim}%d${delim}%a"${file}`,
            { cwd: repoPath }
        );
        return output
            .split('\n')
            .filter(line => line.includes(delim))
            .map(line => {
                const [commit_id, message, date, author] = line.split(delim);
                return { commit_id, message, date, author };
            });
    }

    search_history(repoPath: string, query: string, limit: number, filePath?: string): { commit_id: string, message: string, date: string, author: string }[] {
        // `fossil timeline` has no --grep; use the dedicated `fossil search`
        // full-text command (verified — timeline's --grep does not exist).
        void filePath;
        const output = this.runCommand(`fossil search --all -n ${limit} ${query}`, { cwd: repoPath });
        const results: { commit_id: string, message: string, date: string, author: string }[] = [];
        for (const line of output.split('\n')) {
            const match = line.match(/^\s*\d{2}:\d{2}:\d{2}\s+\[([0-9a-f]+)\]\s*(?:\*\w+\*\s*)*(.*)$/);
            if (match) {
                results.push({ commit_id: match[1], message: match[2].trim(), date: '', author: '' });
            }
        }
        return results;
    }

    get_current_reference(repoPath: string): Reference {
        const info = this.info(repoPath);
        const commitId = this.checkoutHash(repoPath);
        const tags = (info['tags'] || 'trunk').split(',').map(t => t.trim());
        const branch = tags[0] || 'trunk';
        return { name: branch, commit_id: commitId, change_id: commitId, type: 'branch' };
    }

    get_upstream_buffer(repoPath: string): { ahead: number, behind: number } {
        // Fossil doesn't track an upstream ahead/behind count the way git
        // does with @{u} — its sync model is whole-repository, not per-branch.
        void repoPath;
        return { ahead: 0, behind: 0 };
    }

    get_parent_ids(repoPath: string, commitId: string): string[] {
        try {
            const output = this.runCommand(`fossil info ${commitId}`, { cwd: repoPath });
            const parents: string[] = [];
            for (const line of output.split('\n')) {
                const match = line.match(/^parent:\s*([0-9a-f]+)/);
                if (match) parents.push(match[1]);
            }
            return parents;
        } catch {
            return [];
        }
    }

    fetch(repoPath: string): void {
        // `fossil pull` only syncs the local clone's repository database —
        // unlike `git pull` it does not touch the working checkout, making
        // it the closer match for `fetch` (`update` is the working-copy step).
        this.runCommand('fossil pull', { cwd: repoPath });
    }

    pull(repoPath: string): void {
        this.runCommand('fossil pull', { cwd: repoPath });
        this.runCommand('fossil update', { cwd: repoPath });
    }

    push(repoPath: string): void {
        this.runCommand('fossil push', { cwd: repoPath });
    }

    list_conflicts(repoPath: string): string[] {
        return this.get_status(repoPath).conflicted;
    }

    resolve_conflict({ path: repoPath, files }: { path: string, files: string[] }): void {
        // Fossil has no `git add <conflicted-file>`-equivalent "mark
        // resolved" step — a conflict is resolved simply by editing the file
        // and committing. This is a no-op placeholder for interface parity.
        void repoPath;
        void files;
    }

    abort_operation(repoPath: string): void {
        // Fossil has no `merge --abort`/`rebase --abort` — merges are plain
        // working-copy edits with no separate in-progress state file the way
        // git's MERGE_HEAD/rebase-merge are. The closest approximation is
        // discarding uncommitted changes back to the last check-in.
        this.runCommand('fossil revert', { cwd: repoPath });
    }

    get_config(repoPath: string, key: string): string | null {
        try {
            const value = this.runCommand(`fossil settings ${key}`, { cwd: repoPath });
            // `fossil settings <key>` echoes "<key>   <value>" or just the
            // key with trailing whitespace when unset.
            const parts = value.split(/\s+/);
            return parts.length > 1 ? parts.slice(1).join(' ') : null;
        } catch {
            return null;
        }
    }

    get_user_identity(repoPath: string): { name: string, email: string } | null {
        try {
            const name = this.runCommand('fossil user default', { cwd: repoPath });
            if (!name) return null;
            // Fossil does not expose a simple CLI query for a user's email;
            // it's stored in the repository's user table but not surfaced
            // outside the admin/web UI in a scriptable way.
            return { name, email: '' };
        } catch {
            return null;
        }
    }

    get_merge_base(repoPath: string, revisionA: string, revisionB: string): string | null {
        try {
            // Output is "pivot=<hash>", not a bare hash.
            const output = this.runCommand(`fossil merge-base ${revisionA} ${revisionB}`, { cwd: repoPath });
            const match = output.match(/pivot=([0-9a-f]+)/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    revert_commit(repoPath: string, commitId: string, waitForLock?: boolean): string {
        // Fossil has no direct `git revert` equivalent — generate the
        // inverse diff and apply it as a new forward commit (verified
        // recipe; `fossil patch` is a distinct binary format and cannot be
        // used here).
        void waitForLock;
        const info = this.runCommand(`fossil info ${commitId}`, { cwd: repoPath });
        const parentMatch = info.match(/^parent:\s*([0-9a-f]+)/m);
        if (!parentMatch) throw new GenericVCSError(`Commit ${commitId} has no parent to revert against`, 'fossil info', 1);
        const parentId = parentMatch[1];

        // NOTE: runCommand() trims output, but `patch` requires the diff's
        // trailing newline to be intact (a missing one causes "unexpectedly
        // ends in middle of line") — restore it before writing the file.
        const patch = this.runCommand(`fossil diff --from ${commitId} --to ${parentId}`, { cwd: repoPath });
        const patchFile = path.join(repoPath, `.revert-${Date.now()}.patch`);
        fs.writeFileSync(patchFile, patch + '\n');
        try {
            execSync(`patch -p0 < "${patchFile}"`, { cwd: repoPath, stdio: 'pipe' });
        } finally {
            fs.unlinkSync(patchFile);
        }
        this.runCommand(`fossil commit -m "revert: ${commitId}" --no-warnings`, { cwd: repoPath });
        return this.checkoutHash(repoPath);
    }
}
