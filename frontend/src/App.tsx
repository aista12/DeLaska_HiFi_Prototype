import { useEffect, useRef, useState } from 'react';

interface Button { label: string; action: string; }
interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  text: string;
  buttons?: Button[][];
  link?: { label: string; url: string };
  time: string;
}
interface PosOrder {
  posOrderId: string; orderNumber: string; source: string; type: string;
  branch: string; items: string; total: number; payment: string; receivedAt: string;
}
interface State { customer: ChatMessage[]; operators: ChatMessage[]; couriers: ChatMessage[]; iikoOrders: PosOrder[]; }

const empty: State = { customer: [], operators: [], couriers: [], iikoOrders: [] };
const money = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} UZS`;

async function api(path: string, body?: unknown): Promise<State> {
  const res = await fetch(`/api/${path}`, {
    method: body === undefined && path === 'state' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

function useAutoScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [dep]);
  return ref;
}

export default function App() {
  const [state, setState] = useState<State>(empty);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const load = () => api('state').then((s) => { setState(s); setOnline(true); }).catch(() => setOnline(false));
    load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, []);

  const send = (path: string, body?: unknown) => api(path, body ?? {}).then(setState);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <strong>De'laska</strong> Telegram ordering bot <span className="tag">high-fidelity prototype</span>
        </div>
        <div className="topbar-right">
          {!online && <span className="offline">Backend offline. Start it with npm start</span>}
          <button className="reset" onClick={() => send('reset')}>↺ Reset demo</button>
        </div>
      </header>

      <main className="grid">
        <section className="col">
          <h2 className="col-title">Customer · Telegram</h2>
          <Phone messages={state.customer} send={send} />
        </section>

        <section className="col">
          <h2 className="col-title">Staff · private Telegram groups</h2>
          <Group title="De'laska Operators" subtitle="private group · 4 members" icon="🧑‍🍳" messages={state.operators} />
          <Group title="De'laska Couriers" subtitle="private group · 6 members" icon="🛵" messages={state.couriers} />
        </section>

        <section className="col">
          <h2 className="col-title">iiko POS · orders received automatically</h2>
          <IikoPanel orders={state.iikoOrders} />
        </section>
      </main>
    </div>
  );
}

function Phone({ messages, send }: { messages: ChatMessage[]; send: (p: string, b?: unknown) => void }) {
  const [text, setText] = useState('');
  const ref = useAutoScroll(messages.length);
  const last = messages[messages.length - 1];

  const submit = () => {
    if (!text.trim()) return;
    send('text', { text });
    setText('');
  };

  return (
    <div className="phone">
      <div className="tg-header">
        <div className="avatar">D</div>
        <div>
          <div className="tg-name">De'laska Bot</div>
          <div className="tg-sub">bot</div>
        </div>
      </div>
      <div className="tg-body" ref={ref}>
        {messages.length === 0 && (
          <div className="start-card">
            <div className="avatar big">D</div>
            <p><b>De'laska Bot</b><br />Order croissants and desserts from De'laska bakeries in Tashkent.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`row ${m.from}`}>
            <div className={`bubble ${m.from}`}>
              <div className="text">{m.text}</div>
              <span className="time">{m.time}{m.from === 'user' ? ' ✓✓' : ''}</span>
            </div>
            {m.buttons && (
              <div className={`keyboard ${m.id === last?.id ? '' : 'old'}`}>
                {m.buttons.map((row, i) => (
                  <div className="kb-row" key={i}>
                    {row.map((b) => (
                      <button key={b.action + b.label} className="kb-btn" onClick={() => send('button', b)}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="tg-input">
        {messages.length === 0 ? (
          <button className="start-btn" onClick={() => send('start')}>START</button>
        ) : (
          <>
            <input
              value={text}
              placeholder="Message"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button className="send" onClick={submit} aria-label="Send">➤</button>
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, subtitle, icon, messages }: { title: string; subtitle: string; icon: string; messages: ChatMessage[] }) {
  const ref = useAutoScroll(messages.length);
  return (
    <div className="group">
      <div className="group-header">
        <div className="avatar group-avatar">{icon}</div>
        <div>
          <div className="tg-name">🔒 {title}</div>
          <div className="tg-sub">{subtitle}</div>
        </div>
      </div>
      <div className="group-body" ref={ref}>
        {messages.length === 0 && <div className="placeholder">No messages yet</div>}
        {messages.map((m) => (
          <div key={m.id} className="g-msg fresh">
            <div className="g-from">De'laska Bot <span className="time">{m.time}</span></div>
            <div className="text">{m.text}</div>
            {m.link && <a className="map-link" href={m.link.url} target="_blank" rel="noreferrer">{m.link.label}</a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function IikoPanel({ orders }: { orders: PosOrder[] }) {
  return (
    <div className="iiko">
      <div className="iiko-header">
        <span className="iiko-logo">iiko</span> Front · Delivery & integrations
      </div>
      <div className="iiko-body">
        {orders.length === 0 && <div className="placeholder dark">Waiting for orders from the Telegram bot…</div>}
        {orders.map((o) => (
          <div className="iiko-card fresh" key={o.posOrderId}>
            <div className="iiko-row">
              <b>{o.posOrderId}</b>
              <span className="badge">NEW</span>
            </div>
            <div className="iiko-meta">Bot order #{o.orderNumber} · source: {o.source} · {o.receivedAt}</div>
            <div className="iiko-meta">{o.type} · {o.branch}</div>
            <div className="iiko-items">{o.items}</div>
            <div className="iiko-row">
              <span>{o.payment}</span>
              <b>{money(o.total)}</b>
            </div>
          </div>
        ))}
      </div>
      <div className="iiko-foot">No manual entry by operators: orders arrive through the PosSystem interface.</div>
    </div>
  );
}
