import { useEffect, useState } from 'react';
import { api } from '../api';
import { OrderRecord, ScreenType } from '../types';

const steps = ['received', 'confirmed', 'cooking', 'ready', 'completed'];

export const OrderConfirmationView = ({ orderDetails, onNavigate }: { orderDetails: OrderRecord | null; onNavigate: (screen: ScreenType) => void }) => {
  const [order, setOrder] = useState(orderDetails);
  useEffect(() => {
    if (!orderDetails?.trackingToken) return;
    const refresh = () => api.getOrder(orderDetails.id, orderDetails.trackingToken!)
      .then(result => setOrder({ ...result.order, trackingToken: orderDetails.trackingToken }))
      .catch(() => undefined);
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [orderDetails?.id, orderDetails?.trackingToken]);

  if (!order) return <div className="min-h-screen pt-32 text-center"><h1 className="text-3xl font-bold">No active order</h1><button onClick={()=>onNavigate('menu')} className="mt-5 text-[#00dbe9]">Browse menu</button></div>;

  const activeIndex = Math.max(0, steps.indexOf(order.status));
  const paymentMessage = '₹' + order.total + ' due on ' + (order.fulfilment?.type === 'pickup' ? 'pickup' : 'delivery');

  return (
    <main className="pt-28 pb-16 px-4 min-h-screen">
      <div className="max-w-3xl mx-auto glass-panel rounded-3xl border border-white/10 p-6 md:p-10">
        <header className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#00dbe9]/15 text-[#00dbe9] mx-auto grid place-items-center mb-4"><span className="material-symbols-outlined text-4xl">check_circle</span></div>
          <p className="font-['Space_Mono'] text-xs text-[#00dbe9] tracking-[.25em]">ORDER {order.orderNumber}</p>
          <h1 className="font-['Bricolage_Grotesque'] text-4xl md:text-6xl font-extrabold text-[#ffb2ba] mt-3">Your order is live.</h1>
          <p className="text-[#e7bcbf] mt-3">{paymentMessage}</p>
        </header>

        <section className="my-9 bg-[#0c1322] rounded-2xl p-5 md:p-7 border border-white/10">
          <div className="flex justify-between gap-2 relative">
            <div className="absolute top-5 left-[8%] right-[8%] h-0.5 bg-white/10" />
            {steps.slice(0,4).map((step,index) => (
              <div key={step} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                <div className={'w-10 h-10 rounded-full grid place-items-center border-2 ' + (index <= activeIndex ? 'bg-[#00dbe9] text-[#002022] border-[#00dbe9] shadow-[0_0_15px_rgba(0,219,233,.5)]' : 'bg-[#0c1322] text-white/30 border-white/15')}><span className="material-symbols-outlined text-lg">{index <= activeIndex ? 'check' : ['receipt_long','verified','skillet','takeout_dining'][index]}</span></div>
                <small className="uppercase font-['Space_Mono'] text-[9px] md:text-xs text-center">{step}</small>
              </div>
            ))}
          </div>
          <p className="text-center text-[#e7bcbf] mt-7">This page refreshes automatically when the kitchen updates your order.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Your setlist</h2>
          <div className="border border-white/10 rounded-2xl overflow-hidden">
            {order.items.map((item,index) => <div key={index} className="flex justify-between gap-4 p-4 border-b border-white/10 last:border-0"><span><strong>{item.quantity}× {item.name}</strong>{item.selectedOption && <small className="block text-[#00dbe9]">{item.selectedOption}</small>}</span><strong className="text-[#ffb2ba]">₹{item.lineTotal}</strong></div>)}
            <div className="flex justify-between p-5 bg-[#191f2f] text-xl"><strong>Total</strong><strong className="text-[#00dbe9]">₹{order.total}</strong></div>
          </div>
        </section>
        <button onClick={()=>onNavigate('home')} className="w-full mt-8 rounded-full bg-[#ffb2ba] text-[#670020] py-4 font-['Space_Mono'] font-bold">BACK TO STAGE</button>
      </div>
    </main>
  );
};

