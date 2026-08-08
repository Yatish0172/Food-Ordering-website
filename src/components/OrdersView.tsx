import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { OrderRecord, ScreenType } from '../types';

export const OrdersView = ({ onNavigate }: { onNavigate: (screen: ScreenType) => void }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const result = await api.myOrders(); setOrders(result.orders); setSelected(current => result.orders.find(order => order.id === current?.id) || result.orders[0] || null); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load orders.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const timer=window.setInterval(load,15000); return ()=>window.clearInterval(timer); }, [load]);

  return (
    <main className="pt-28 pb-16 px-4 md:px-10 min-h-screen max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8"><div><p className="font-['Space_Mono'] text-xs text-[#00dbe9] tracking-[.2em]">CUSTOMER ACCOUNT</p><h1 className="font-['Bricolage_Grotesque'] text-4xl md:text-6xl font-extrabold text-[#ffb2ba]">My orders</h1></div><button onClick={()=>onNavigate('menu')} className="rounded-full bg-[#ffb2ba] text-[#670020] px-5 py-3 font-bold">ORDER AGAIN</button></div>
      {error && <div className="rounded-xl border border-[#ff562c]/50 bg-[#ff562c]/10 p-4 mb-5">{error}{/sign in/i.test(error)&&<button onClick={()=>onNavigate('login')} className="ml-3 underline">Sign in</button>}</div>}
      {loading ? <p className="text-center py-16 text-[#e7bcbf]">Loading your orders…</p> : orders.length===0 ? <section className="glass-panel rounded-3xl p-12 text-center"><span className="material-symbols-outlined text-6xl text-[#00dbe9]">receipt_long</span><h2 className="text-2xl font-bold mt-3">No orders yet</h2><button onClick={()=>onNavigate('menu')} className="mt-5 text-[#ffb2ba] underline">Explore the menu</button></section> :
      <div className="grid lg:grid-cols-[380px_1fr] gap-6"><section className="glass-panel border border-white/10 rounded-2xl overflow-hidden h-fit">{orders.map(order=><button key={order.id} onClick={()=>setSelected(order)} className={'w-full text-left p-5 border-b border-white/10 last:border-0 ' + (selected?.id===order.id?'bg-[#00dbe9]/10':'hover:bg-white/5')}><div className="flex justify-between gap-3"><strong>{order.orderNumber}</strong><strong className="text-[#00dbe9]">₹{order.total}</strong></div><small className="text-[#e7bcbf]">{new Date(order.createdAt).toLocaleString()}</small><span className="block mt-2 uppercase text-xs text-[#ffb2ba]">{order.status.replace('_',' ')} · {order.paymentMethod}</span></button>)}</section>
      <section className="glass-panel border border-white/10 rounded-2xl p-6">{selected&&<><div className="flex justify-between gap-4 mb-6"><div><small className="text-[#00dbe9]">ORDER DETAILS</small><h2 className="text-2xl font-bold">{selected.orderNumber}</h2></div><span className="uppercase text-[#ffb2ba] font-bold">{selected.status.replace('_',' ')}</span></div><div className="space-y-3">{selected.items.map((item,index)=><div key={index} className="flex justify-between border-b border-white/10 pb-3"><span>{item.quantity}× {item.name}{item.selectedOption&&<small className="block text-[#00dbe9]">{item.selectedOption}</small>}</span><strong>₹{item.lineTotal}</strong></div>)}</div><dl className="mt-6 space-y-2 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>₹{selected.subtotal}</dd></div><div className="flex justify-between"><dt>Delivery</dt><dd>₹{selected.deliveryFee}</dd></div><div className="flex justify-between"><dt>Packing</dt><dd>₹{selected.packingFee}</dd></div><div className="flex justify-between text-xl font-bold text-[#00dbe9] border-t border-white/10 pt-3"><dt>Total</dt><dd>₹{selected.total}</dd></div></dl></>}</section></div>}
    </main>
  );
};
