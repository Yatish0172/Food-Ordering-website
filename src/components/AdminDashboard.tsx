import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { StoreStatus } from '../storeHours';
import { OrderRecord, OrderStatus } from '../types';

const statusOptions: OrderStatus[] = ['received', 'confirmed', 'cooking', 'ready', 'completed', 'cancelled'];
const badge: Record<string, string> = {
  pending_payment: 'bg-amber-400/15 text-amber-300', received: 'bg-cyan-400/15 text-cyan-300',
  confirmed: 'bg-blue-400/15 text-blue-300', cooking: 'bg-pink-400/15 text-pink-300',
  ready: 'bg-emerald-400/15 text-emerald-300', completed: 'bg-white/10 text-white/70',
  cancelled: 'bg-red-400/15 text-red-300',
};


function playOrderTone() {
  const browserWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7);
  gain.connect(context.destination);
  [0, 0.2].forEach((delay, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = index === 0 ? 880 : 1174;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + 0.28);
  });
  window.setTimeout(() => context.close(), 1000);
}
export const AdminDashboard = ({ token, onLogout, onBack }: { token: string; onLogout: () => void; onBack: () => void }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [summary, setSummary] = useState({ count: 0, revenue: 0 });
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [byStatus, setByStatus] = useState<Array<{ status: string; count: number }>>([]);
  const [section, setSection] = useState<'active' | 'history'>('active');
  const [filter, setFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('tkk-order-sound') === 'on');
  const [newOrderAlert, setNewOrderAlert] = useState('');
  const knownReceivedIds = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [orderData, summaryData, receivedData, storeData] = await Promise.all([
        api.adminOrders(token, filter, page),
        api.adminSummary(token),
        api.adminOrders(token, 'received'),
        api.storeStatus(),
      ]);
      if (knownReceivedIds.current) {
        const newOrders = receivedData.orders.filter(order => !knownReceivedIds.current!.has(order.id));
        if (newOrders.length > 0) {
          if (soundEnabled) playOrderTone();
          setNewOrderAlert(newOrders.length === 1 ? 'New order: ' + newOrders[0].orderNumber : newOrders.length + ' new orders received');
        }
      }
      knownReceivedIds.current = new Set(receivedData.orders.map(order => order.id));
      if (orderData.pagination.page > orderData.pagination.pages) { setPage(orderData.pagination.pages); return; }
      setOrders(orderData.orders); setPagination(orderData.pagination); setSummary(summaryData.today); setByStatus(summaryData.byStatus); setStoreStatus(storeData.store); setError('');
      if (selected) setSelected(orderData.orders.find(order => order.id === selected.id) || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load orders.';
      setError(message);
      if (/session|auth/i.test(message)) onLogout();
    } finally { setLoading(false); }
  }, [token, filter, page, onLogout, selected?.id, soundEnabled]);

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 15000); return () => clearInterval(timer); }, [refresh]);

  const active = useMemo(() => byStatus.filter(entry => !['completed', 'cancelled'].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.count), 0), [byStatus]);
  const filterOptions = section === 'active' ? ['active', 'received', 'confirmed', 'cooking', 'ready'] : ['history', 'completed', 'cancelled'];
  const openSection = (next: 'active' | 'history') => {
    setSection(next); setFilter(next); setPage(1); setSelected(null); setLoading(true);
  };
  const chooseFilter = (status: string) => { setFilter(status); setPage(1); setSelected(null); setLoading(true); };
  const updateStatus = async (order: OrderRecord, status: OrderStatus) => {
    try { await api.updateOrderStatus(token, order.id, status); setSelected(null); setLoading(true); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update order.'); }
  };

  return (
    <main className="min-h-screen bg-[#0c1322]">
      <header className="sticky top-0 z-30 bg-[#070e1d]/95 backdrop-blur border-b border-white/10 px-5 md:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-['Space_Mono'] text-[10px] tracking-[.25em] text-[#00dbe9]">THE KARAOKE KITCHEN</p><h1 className="font-['Bricolage_Grotesque'] text-2xl font-bold">Order Operations</h1></div>
        <div className="flex flex-wrap gap-3"><button onClick={() => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem('tkk-order-sound', next ? 'on' : 'off'); if (next) playOrderTone(); }} className="border border-[#00dbe9]/50 text-[#00dbe9] rounded-full px-4 py-2 text-xs font-bold"><span className="material-symbols-outlined text-sm align-middle mr-1">{soundEnabled ? 'volume_up' : 'volume_off'}</span>{soundEnabled ? 'SOUND ON' : 'ENABLE SOUND'}</button><button onClick={onBack} className="border border-white/15 rounded-full px-4 py-2 text-xs font-bold">CUSTOMER SITE</button><button onClick={onLogout} className="bg-[#ffb2ba] text-[#670020] rounded-full px-4 py-2 text-xs font-bold">SIGN OUT</button></div>
      </header>

      <div className="p-5 md:p-10 max-w-[1500px] mx-auto">
        {newOrderAlert && <div role="status" className="mb-5 rounded-2xl border border-[#00dbe9] bg-[#00dbe9]/10 p-4 flex items-center justify-between gap-3"><strong className="text-[#00dbe9]">{newOrderAlert}</strong><button onClick={() => setNewOrderAlert('')} className="text-sm">DISMISS</button></div>}
        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <Metric label="KITCHEN" value={storeStatus ? (storeStatus.open ? 'OPEN' : 'CLOSED') : 'CHECKING'} icon={storeStatus?.open ? 'restaurant' : 'schedule'} />
          <Metric label="TODAY'S ORDERS" value={summary.count} icon="receipt_long" />
          <Metric label="TODAY'S VALUE" value={`₹${summary.revenue}`} icon="payments" />
          <Metric label="ACTIVE QUEUE" value={active} icon="skillet" />
        </section>
        <div className="grid sm:grid-cols-2 gap-3 mb-5" role="tablist" aria-label="Admin order sections">
          <button type="button" role="tab" aria-selected={section === 'active'} onClick={() => openSection('active')} className={`rounded-2xl border p-4 text-left ${section === 'active' ? 'border-[#00dbe9] bg-[#00dbe9]/10 text-[#00dbe9]' : 'border-white/10 bg-[#191f2f]'}`}><span className="material-symbols-outlined align-middle mr-2">skillet</span><strong>ACTIVE ORDERS</strong><small className="block mt-1 text-current/70">Live kitchen queue</small></button>
          <button type="button" role="tab" aria-selected={section === 'history'} onClick={() => openSection('history')} className={`rounded-2xl border p-4 text-left ${section === 'history' ? 'border-[#ffb2ba] bg-[#ffb2ba]/10 text-[#ffb2ba]' : 'border-white/10 bg-[#191f2f]'}`}><span className="material-symbols-outlined align-middle mr-2">history</span><strong>ORDER HISTORY</strong><small className="block mt-1 text-current/70">All completed and cancelled orders</small></button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
          {filterOptions.map(status => <button key={status} onClick={() => chooseFilter(status)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-['Space_Mono'] font-bold uppercase ${filter === status ? 'bg-[#00dbe9] text-[#002022]' : 'bg-[#191f2f] border border-white/10'}`}>{status === 'active' ? 'all active' : status === 'history' ? 'all history' : status.replace('_', ' ')}</button>)}
        </div>
        {error && <div className="border border-red-400/40 bg-red-400/10 text-red-200 rounded-xl p-4 mb-5">{error}</div>}
        <div className="grid xl:grid-cols-[1fr_430px] gap-6">
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between gap-4"><div><h2 className="font-bold text-xl">{section === 'history' ? 'Order history' : 'Active orders'}</h2><small className="text-[#e7bcbf]">{pagination.total} order{pagination.total === 1 ? '' : 's'}</small></div><button onClick={refresh} className="text-[#00dbe9] text-xs">REFRESH</button></div>
            {loading ? <p className="p-8 text-center text-[#e7bcbf]">Loading orders…</p> : orders.length === 0 ? <p className="p-8 text-center text-[#e7bcbf]">No orders in this section yet.</p> : (
              <div className="divide-y divide-white/10">
                {orders.map(order => (
                  <button key={order.id} onClick={()=>setSelected(order)} className="w-full p-5 text-left hover:bg-white/5 grid md:grid-cols-[1.2fr_.8fr_.6fr] gap-3 items-center">
                    <div><strong className="text-[#dce2f8]">{order.orderNumber}</strong><small className="block text-[#e7bcbf]">{order.customer?.firstName} {order.customer?.lastName} · {new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
                    <div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${badge[order.status] || badge.completed}`}>{order.status.replace('_',' ')}</span><small className="block mt-2 text-[#e7bcbf] uppercase">{order.paymentMethod} · {order.paymentStatus}</small></div>
                    <strong className="md:text-right text-[#00dbe9] text-xl">₹{order.total}</strong>
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-white/10 p-4 flex items-center justify-between gap-4">
              <button type="button" disabled={pagination.page <= 1} onClick={() => { setPage(current => Math.max(1, current - 1)); setSelected(null); setLoading(true); }} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold disabled:opacity-40">PREVIOUS</button>
              <span className="text-xs text-[#e7bcbf]">Page {pagination.page} of {pagination.pages}</span>
              <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => { setPage(current => Math.min(pagination.pages, current + 1)); setSelected(null); setLoading(true); }} className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold disabled:opacity-40">NEXT</button>
            </div>
          </section>
          <aside className="glass-panel rounded-2xl border border-white/10 p-6 h-fit xl:sticky xl:top-28">
            {!selected ? <div className="py-16 text-center text-[#e7bcbf]"><span className="material-symbols-outlined text-5xl opacity-40">touch_app</span><p>Select an order to see full details.</p></div> : (
              <div>
                <div className="flex justify-between gap-4 mb-5"><div><small className="text-[#00dbe9]">ORDER</small><h2 className="text-2xl font-bold">{selected.orderNumber}</h2></div><strong className="text-2xl text-[#ffb2ba]">₹{selected.total}</strong></div>
                <div className="bg-[#0c1322] rounded-xl p-4 mb-5 text-sm space-y-1"><strong>{selected.customer?.firstName} {selected.customer?.lastName}</strong><p>{selected.customer?.phone}</p><p>{selected.customer?.email}</p><p className="pt-2 text-[#e7bcbf]">{selected.fulfilment?.type === 'delivery' ? `${selected.fulfilment.streetAddress}, ${selected.fulfilment.aptSuite || ''} · ${selected.fulfilment.zipCode}` : 'Kitchen pickup'}</p>{selected.fulfilment?.instructions && <p className="pt-2 text-[#ffb2ba]">Note: {selected.fulfilment.instructions}</p>}</div>
                <div className="space-y-3 mb-6">{selected.items.map((item,index)=><div key={index} className="flex justify-between gap-3 border-b border-white/10 pb-2"><span>{item.quantity}× {item.name}<small className="block text-[#00dbe9]">{item.selectedOption}</small></span><strong>₹{item.lineTotal}</strong></div>)}</div>
                <label className="text-xs text-[#e7bcbf] block mb-2">UPDATE KITCHEN STATUS</label>
                <select value={selected.status} onChange={e=>updateStatus(selected,e.target.value as OrderStatus)} className="w-full bg-[#0c1322] border border-[#00dbe9] rounded-xl p-3 font-bold uppercase">{statusOptions.map(status=><option key={status}>{status}</option>)}</select>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};

const Metric = ({label,value,icon}:{label:string;value:string|number;icon:string}) => <div className="glass-panel border border-white/10 rounded-2xl p-5 flex items-center gap-4"><span className="material-symbols-outlined text-3xl text-[#00dbe9]">{icon}</span><div><small className="font-['Space_Mono'] text-[#e7bcbf]">{label}</small><p className="text-3xl font-bold">{value}</p></div></div>;



