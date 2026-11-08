/** Mock-mode controls for designing in a desktop browser (open with ?mock). */
export function DevBar({ connected, onConnected }: { connected: boolean; onConnected: (c: boolean) => void }) {
  return (
    <div className="devbar">
      <span>mock daemon</span>
      <button onClick={() => onConnected(!connected)}>
        {connected ? "Unplug phone" : "Plug in phone"}
      </button>
    </div>
  );
}
