/** DIAMOND data contracts. One flat event stream; everything else is derived from it. */
export type Cat = 'proc' | 'file' | 'net' | 'policy';
export type Status = 'observed' | 'flagged' | 'pending' | 'denied_sim' | 'denied_supervisor' | 'denied_kernel';
export type Severity = 'info' | 'warn' | 'critical';
export type Verdict = 'authorized' | 'flagged' | 'unexpected' | 'denied';

export interface DiamondEvent {
  id: number; t: number; cat: Cat; op: string; pid: number; ppid?: number;
  name?: string; cmd?: string; res?: string; dest?: string | null;
  status: Status; sim?: boolean; evidence?: string; note?: string;
}
export interface Intent { task: string; workspace: string; allowFiles: string[]; allowNet: string[]; restricted: string[] }
export interface DiamondSnapshot { session: string; agent: string; intent: Intent; events: DiamondEvent[] }
export interface ProcessInfo {
  pid: number; ppid: number; name: string; cmd: string; alive: boolean; status: Status;
  children: ProcessInfo[]; events: DiamondEvent[];
}
export interface ToolCall { id: string; name: string; input: unknown; output?: unknown; t: number }
export interface CodingPlanStep { title: string; state: 'done' | 'active' | 'todo' }
export interface FleetNodeSample { id: string; name: string; mode: 'local' | 'cloud' | 'demo'; online: boolean; cpu: number; memMb: number; agents: number; sessions: number }
export interface LiveOverview { nodes: FleetNodeSample[]; capacity: { used: number; total: number } }
export interface TimelineItem { id: number; track: string; t0: number; t1: number; label: string; verdict: Verdict }
