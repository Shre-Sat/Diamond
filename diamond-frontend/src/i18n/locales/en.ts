const en = {
  'nav.overview': 'DIAMOND overview', 'nav.sessions': 'Sessions', 'nav.timeline': 'Timeline', 'nav.tree': 'Process tree', 'nav.logs': 'Logs', 'nav.metrics': 'Metrics', 'nav.poa': 'Proof-of-Agent',
  'conn.title': 'Connect to a DIAMOND daemon', 'conn.local': 'Local daemon', 'conn.cloud': 'Cloud controller', 'conn.demo': 'Offline demo (simulated)', 'conn.connect': 'Connect',
  'status.live': 'Live', 'status.connecting': 'Connecting', 'status.offline': 'Offline', 'status.idle': 'Not connected',
  'sim.badge': 'Simulated', 'empty.events': 'No events yet.', 'fleet.title': 'Machines', 'fleet.capacity': 'Capacity',
  'session.conversation': 'Conversation', 'session.tree': 'Tree', 'session.analysis': 'Analysis', 'filter.search': 'Search events',
} as const;
export default en;
export type Key = keyof typeof en;
