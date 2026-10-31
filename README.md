# Diamond

**A sealed room for AI coding agents, with a window so you can watch.**

Diamond runs an AI agent (Claude Code, Gemini CLI, Codex) inside a Linux sandbox, controls everything that leaves the machine, and shows you what the agent did in a live dashboard. Nothing it writes reaches your project until you approve it.

You open the app, pick an agent, type a task, and drop in the files it may use. That's it.

## Why

Agents run shell commands, write scripts and open network connections on your machine. Given a vague goal, they take the shortest path, which can mean uploading your private photo to a public host to get a link. Prompts and guardrails can't stop a subprocess. The kernel can.

## How it works

1. **Contain.** The agent starts with a deny-by-default Landlock sandbox. It can only touch the project folder, the files you attached, and the runtimes it needs. Your home folder, SSH keys and Windows drive return "Permission denied".
2. **Copy-on-write.** The project is mounted through OverlayFS in an unprivileged user namespace. Everything the agent writes lands in a separate layer. You review the changes and click **Keep** or **Discard**.
3. **Broker.** The agent's only network route is a local proxy. Model APIs, package registries and font/CDN hosts pass silently. When private files are attached, uploads to other hosts are blocked, and the agent receives a plain-language reason it can adapt to. Otherwise you get an Allow/Deny prompt.
4. **Watch.** Every connection and file change appears on a live timeline. If [AgentSight](https://github.com/eunomia-bpf/agentsight) is installed, its kernel-level (eBPF) events are mirrored in too.

## Quick start (Windows + WSL2)

1. Install WSL2 with Ubuntu, and install an agent inside it (for example Claude Code or Gemini CLI).
2. Download the release zip and run `Diamond-Setup.bat` once.
3. Run `Diamond.bat`. The dashboard opens at `http://localhost:8787`.

Requires a Linux kernel with Landlock and OverlayFS (WSL2 6.x works). Setup installs AgentSight and grants Diamond passwordless sudo for that one recorder command.

## Status

Early prototype. The sandbox, overlay review, network broker and dashboard work end to end with Gemini CLI. Claude Code and Codex support is untested. Expect rough edges.

**Not built yet:** eBPF taint tracking, intent-to-policy compiler, process graph, autonomy levels, swarm and covert-channel detection, per-host trust memory.

**Known limits:** the proxy sees destination hosts but not encrypted contents; one session at a time; deleted folders aren't applied from the overlay; Linux only (macOS unsupported).

## Credits

Built on Linux Landlock and OverlayFS, with optional observability from [eunomia-bpf/agentsight](https://github.com/eunomia-bpf/agentsight) (MIT).

## License

MIT (add a `LICENSE` file).
