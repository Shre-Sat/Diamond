/** Fallback cascade for opening a node: Local Direct -> Account Direct -> Relay. Each probe resolves to a boolean. */
/** @param {{local:()=>Promise<boolean>, account:()=>Promise<boolean>, relay:()=>Promise<boolean>}} p */
export async function openNode(p) {
  for (const [route, probe] of [['local', p.local], ['account', p.account], ['relay', p.relay]]) {
    try { if (await probe()) return route; } catch { /* try next route */ }
  }
  return null;
}
