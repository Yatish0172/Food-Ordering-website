import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { api, serializeCart } from '../api';
import { menuItemUnitPrice } from '../pricing';
import type { StoreStatus } from '../storeHours';
import { CartItem, OrderRecord, ScreenType, User } from '../types';

interface Props {
  cartItems: CartItem[];
  subtotal: number;
  currentUser: User | null;
  storeStatus: StoreStatus | null;
  onPlaceOrder: (order: OrderRecord) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const CheckoutView = ({ cartItems, subtotal, currentUser, storeStatus, onPlaceOrder, onNavigate }: Props) => {
  const [form, setForm] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    streetAddress: currentUser?.streetAddress || '',
    aptSuite: currentUser?.aptSuite || '',
    zipCode: currentUser?.zipCode || '',
    instructions: '',
  });
  const [isDelivery, setIsDelivery] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const payableTotal = subtotal;
  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(current => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!cartItems.length) return setError('Your cart is empty. Add at least one menu item.');
    if (!storeStatus?.open) return setError(storeStatus ? `The kitchen is closed. ${storeStatus.nextChange}.` : 'Could not verify kitchen hours. Please wait a moment and try again.');
    setSubmitting(true);
    setError('');
    try {
      const freshStatus = await api.storeStatus();
      if (!freshStatus.store.open) throw new Error(`The kitchen is closed. ${freshStatus.store.nextChange}.`);
      const result = await api.createOrder({
        customer: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
        },
        fulfilment: isDelivery
          ? {
              type: 'delivery',
              streetAddress: form.streetAddress,
              aptSuite: form.aptSuite,
              zipCode: form.zipCode,
              instructions: form.instructions,
            }
          : { type: 'pickup', instructions: form.instructions },
        paymentMethod: 'cod',
        items: serializeCart(cartItems),
      });
      onPlaceOrder(result.order);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not place your order.');
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-[#0c1322] border border-white/15 rounded-xl px-4 py-3 text-[#dce2f8] focus:outline-none focus:border-[#00dbe9] font-['Hanken_Grotesk']";
  const field = (id: string, label: string, input: ReactNode) => (
    <div>
      <label htmlFor={id} className="block text-xs font-['Space_Mono'] text-[#e7bcbf] mb-2">{label}</label>
      {input}
    </div>
  );

  return (
    <div className="pt-28 pb-16 px-4 md:px-10 max-w-7xl mx-auto">
      <button type="button" onClick={() => onNavigate('menu')} className="text-[#00dbe9] font-['Space_Mono'] text-xs font-bold mb-6 hover:text-[#ffb2ba]">← BACK TO MENU</button>
      <div className="grid lg:grid-cols-[1fr_420px] gap-8">
        <form onSubmit={submit} className="space-y-7">
          <div>
            <p className="font-['Space_Mono'] text-[#00dbe9] text-xs tracking-[.25em] mb-2">SECURE COD CHECKOUT</p>
            <h1 className="font-['Bricolage_Grotesque'] text-4xl md:text-6xl font-extrabold text-[#ffb2ba]">Finish your order</h1>
          </div>
          <div role="status" className={`rounded-2xl border p-4 ${storeStatus?.open ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' : 'border-[#ff562c]/60 bg-[#ff562c]/10 text-[#ffdad2]'}`}>
            <strong className="block">{storeStatus?.open ? 'Kitchen is open — orders are being accepted' : storeStatus ? 'Kitchen is currently closed' : 'Checking kitchen hours…'}</strong>
            <small>{storeStatus?.nextChange || 'Order submission will unlock after hours are verified.'}</small>
          </div>

          <section className="glass-panel rounded-2xl border border-white/10 p-6" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="font-['Bricolage_Grotesque'] text-2xl font-bold mb-5">Contact details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {field('first-name', 'First name', <input id="first-name" required maxLength={60} autoComplete="given-name" className={inputClass} value={form.firstName} onChange={update('firstName')} />)}
              {field('last-name', 'Last name', <input id="last-name" required maxLength={60} autoComplete="family-name" className={inputClass} value={form.lastName} onChange={update('lastName')} />)}
              {field('email', 'Email address', <input id="email" required maxLength={120} type="email" autoComplete="email" className={inputClass} value={form.email} onChange={update('email')} />)}
              {field('phone', 'Phone number', <input id="phone" required type="tel" autoComplete="tel" inputMode="tel" pattern="[+0-9 -]{10,16}" className={inputClass} value={form.phone} onChange={update('phone')} />)}
            </div>
          </section>

          <section className="glass-panel rounded-2xl border border-white/10 p-6" aria-labelledby="fulfilment-heading">
            <h2 id="fulfilment-heading" className="font-['Bricolage_Grotesque'] text-2xl font-bold mb-5">Fulfilment</h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {([true, false] as const).map(value => (
                <button key={String(value)} type="button" aria-pressed={isDelivery === value} onClick={() => setIsDelivery(value)}
                  className={'rounded-xl border px-4 py-4 font-[Space_Mono] text-sm font-bold ' + (isDelivery === value ? 'bg-[#00dbe9] text-[#002022] border-[#00dbe9]' : 'border-white/15 text-[#dce2f8]')}>
                  {value ? 'DELIVERY' : 'KITCHEN PICKUP'}
                </button>
              ))}
            </div>
            {isDelivery && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  {field('street-address', 'Street address', <input id="street-address" required maxLength={180} className={inputClass} autoComplete="street-address" value={form.streetAddress} onChange={update('streetAddress')} />)}
                </div>
                {field('landmark', 'Apartment or landmark (optional)', <input id="landmark" maxLength={100} className={inputClass} value={form.aptSuite} onChange={update('aptSuite')} />)}
                {field('postal-code', '6-digit delivery PIN code (no area restriction)', <input id="postal-code" required className={inputClass} inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" value={form.zipCode} onChange={update('zipCode')} />)}
              </div>
            )}
            <div className="mt-4">
              <label htmlFor="instructions" className="block text-xs font-['Space_Mono'] text-[#e7bcbf] mb-2">Cooking or delivery instructions (optional)</label>
              <textarea id="instructions" maxLength={500} className={inputClass + ' resize-none'} rows={3} value={form.instructions} onChange={update('instructions')} />
            </div>
          </section>

          <section className="glass-panel rounded-2xl border border-white/10 p-6" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="font-['Bricolage_Grotesque'] text-2xl font-bold mb-5">Payment</h2>
            <div className="rounded-xl border border-[#ffb2ba] bg-[#ffb2ba]/10 p-4">
              <span className="material-symbols-outlined text-[#ffb2ba]" aria-hidden="true">payments</span>
              <strong className="block mt-2">Cash on Delivery</strong>
              <small className="text-[#e7bcbf]">Pay when your order arrives or when you collect it</small>
            </div>
          </section>

          {error && <div role="alert" className="rounded-xl border border-[#ff562c] bg-[#ff562c]/10 p-4 text-[#ffdad2]">{error}</div>}
          <button type="submit" disabled={submitting || !cartItems.length || !storeStatus?.open} className="w-full bg-[#ffb2ba] disabled:opacity-50 text-[#670020] font-['Space_Mono'] font-bold py-4 rounded-full neo-brutal-shadow">
            {submitting ? 'PLACING ORDER…' : 'PLACE COD ORDER · ₹' + payableTotal}
          </button>
        </form>

        <aside className="glass-panel rounded-2xl border border-white/10 p-6 h-fit lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="font-['Bricolage_Grotesque'] text-2xl font-bold mb-4">Your setlist</h2>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {cartItems.map(item => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <div><strong>{item.quantity}× {item.menuItem.name}</strong>{item.selectedOption && <small className="block text-[#00dbe9]">{item.selectedOption}</small>}</div>
                <span className="text-[#ffb2ba] font-bold">₹{menuItemUnitPrice(item.menuItem, item.selectedOption) * item.quantity}</span>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 font-['Space_Mono'] text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>₹{subtotal}</dd></div>
            <div className="flex justify-between text-xl font-bold text-[#00dbe9] pt-3 border-t border-white/10"><dt>Total</dt><dd>₹{payableTotal}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
};