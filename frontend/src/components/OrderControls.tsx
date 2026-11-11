'use client';

import { useState, useMemo } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';

type Customer = { customer_id: number; customer_name: string };
type Warehouse = { warehouse_id: number; warehouse_name: string };
type Product = { product_id: number; product_name: string; sku: string; unit_price: number };
type StockOption = { product_id: number; warehouse_id: number; available_quantity: number };
type ItemForm = { product_id: string; quantity: string };
type OrderForm = { customer_id: string; warehouse_id: string; required_date: string; items: ItemForm[] };
type OrderControlProps = { api: string; token: string; onChanged: () => void; onNotice: (message: string) => void };
type OrderRowProps = OrderControlProps & { role?: string; orderId: number; status: string; managed: boolean };
type OrderRecord = Record<string, any>;
type OrderManagementProps = OrderControlProps & { role?: string; orders: OrderRecord[] };

const emptyForm: OrderForm = { customer_id: '', warehouse_id: '', required_date: '', items: [{ product_id: '', quantity: '1' }] };

export function OrderCreateButton({ api, token, onChanged, onNotice }: OrderControlProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<{ customers: Customer[]; warehouses: Warehouse[]; products: Product[]; stock: StockOption[] }>({ customers: [], warehouses: [], products: [], stock: [] });
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const minimumRequiredDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function getAvailableQuantity(productId: string, warehouseId: string) {
    return lookups.stock.find(stock => stock.product_id === Number(productId) && stock.warehouse_id === Number(warehouseId))?.available_quantity || 0;
  }

  async function openForm() {
    setOpen(true);
    setLoading(true);
    try {
      const response = await fetch(`${api}/api/manage/order-lookups`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not load order options.');
      setLookups({ customers: result.customers, warehouses: result.warehouses, products: result.products, stock: result.stock });
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not load order options.');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    setForm(current => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field === 'product_id') {
          const available = getAvailableQuantity(value, current.warehouse_id);
          const quantity = value && available > 0 ? Math.min(Math.max(1, Number(item.quantity) || 1), available) : 1;
          return { ...item, product_id: value, quantity: String(quantity) };
        }
        return { ...item, [field]: value };
      })
    }));
  }

  function updateWarehouse(warehouseId: string) {
    setForm(current => ({
      ...current,
      warehouse_id: warehouseId,
      items: current.items.map(item => {
        if (!item.product_id || !warehouseId) return item;
        const available = getAvailableQuantity(item.product_id, warehouseId);
        if (available < 1) return { ...item, product_id: '', quantity: '1' };
        return { ...item, quantity: String(Math.min(Number(item.quantity) || 1, available)) };
      })
    }));
  }

  async function saveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNotice('');
    try {
      const response = await fetch(`${api}/api/manage/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: Number(form.customer_id),
          warehouse_id: Number(form.warehouse_id),
          required_date: form.required_date || null,
          items: form.items.map(item => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) }))
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not create order.');
      onNotice(`${result.message} Order #${result.order_id}.`);
      setOpen(false);
      setForm(emptyForm);
      onChanged();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not create order.');
    }
  }

  if (!token) return null;

  return <>
    <button className="btn" onClick={openForm}><Plus size={14}/> New order</button>
    {open && <div className="modalback"><form className="modal" onSubmit={saveOrder}>
      <div className="modalhead"><h2>New pending order</h2><button type="button" className="iconbtn" onClick={() => setOpen(false)}><X size={18}/></button></div>
      {loading ? <p className="muted">Loading order options…</p> : <>
        <div className="formgrid">
          <div><label htmlFor="order-customer">Customer</label><select id="order-customer" required value={form.customer_id} onChange={event => setForm({ ...form, customer_id: event.target.value })}><option value="">Select customer</option>{lookups.customers.map(option => <option key={String(option.customer_id)} value={option.customer_id}>{option.customer_name}</option>)}</select></div>
          <div><label htmlFor="order-warehouse">Warehouse</label><select id="order-warehouse" required value={form.warehouse_id} onChange={event => updateWarehouse(event.target.value)}><option value="">Select warehouse</option>{lookups.warehouses.map(option => <option key={String(option.warehouse_id)} value={option.warehouse_id}>{option.warehouse_name}</option>)}</select></div>
          <div><label htmlFor="order-required-date">Required date</label><input id="order-required-date" type="date" min={minimumRequiredDate} value={form.required_date} onChange={event => setForm({ ...form, required_date: event.target.value })}/></div>
        </div>
        <h3>Items</h3>
        {form.items.map((item, index) => {
          const availableQuantity = getAvailableQuantity(item.product_id, form.warehouse_id);
          const productOptions = lookups.products.filter(product => {
            const alreadySelected = form.items.some((other, otherIndex) => otherIndex !== index && other.product_id === String(product.product_id));
            const hasStock = getAvailableQuantity(String(product.product_id), form.warehouse_id) > 0;
            return !alreadySelected && (hasStock || item.product_id === String(product.product_id));
          });
          return <div className="formgrid" key={index}>
            <div><label htmlFor={`order-product-${index}`}>Product</label><select id={`order-product-${index}`} required disabled={!form.warehouse_id} value={item.product_id} onChange={event => updateItem(index, 'product_id', event.target.value)}><option value="">{form.warehouse_id ? 'Select in-stock product' : 'Select warehouse first'}</option>{productOptions.map(option => <option key={String(option.product_id)} value={option.product_id}>{option.product_name} · {option.sku}</option>)}</select><span className="muted">{item.product_id && form.warehouse_id ? `Available at selected warehouse: ${availableQuantity}` : 'Stock is shown after choosing a warehouse and product.'}</span></div>
            <div><label htmlFor={`order-quantity-${index}`}>Quantity</label><input id={`order-quantity-${index}`} type="number" min="1" max={availableQuantity || undefined} step="1" required disabled={!item.product_id || availableQuantity < 1} value={item.quantity} onChange={event => updateItem(index, 'quantity', event.target.value)}/><span className="muted">Maximum: {availableQuantity}</span></div>
            {form.items.length > 1 && <button type="button" className="iconbtn danger" title="Remove item" onClick={() => setForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15}/></button>}
          </div>;
        })}
        <button type="button" className="btn secondary" onClick={() => setForm(current => ({ ...current, items: [...current.items, { product_id: '', quantity: '1' }] }))}><Plus size={14}/> Add item</button>
        <div className="modalactions"><button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn"><Save size={14}/> Create order</button></div>
      </>}
    </form></div>}
  </>;
}

export function OrderRowActions({ api, token, role, orderId, status, managed, onChanged, onNotice }: OrderRowProps) {
  async function runAction(action: 'cancel' | 'delete') {
    const confirmed = confirm(action === 'cancel' ? 'Cancel this pending order and release its reserved stock?' : 'Permanently delete this cancelled order?');
    if (!confirmed) return;
    try {
      const response = await fetch(`${api}/api/manage/orders/${orderId}${action === 'cancel' ? '/cancel' : ''}`, {
        method: action === 'cancel' ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Order action failed.');
      onNotice(result.message);
      onChanged();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Order action failed.');
    }
  }

  if (!token) return <span className="muted" title="Sign in to manage app-created orders">Sign in</span>;
  if (!managed) return <span className="muted" title="Imported project orders are view-only">Historical</span>;
  if (status === 'Cancelled' && role !== 'admin') return <span className="muted" title="Only admins can delete cancelled orders">Admin only</span>;
  if (status !== 'Pending' && status !== 'Cancelled') return <span className="muted">View only</span>;

  return <>
    {status === 'Pending' && <button key="cancel" className="iconbtn" title="Cancel pending order" onClick={() => runAction('cancel')}><X size={15}/></button>}
    {status === 'Cancelled' && <button key="delete" className="iconbtn danger" title="Delete cancelled order" onClick={() => runAction('delete')}><Trash2 size={15}/></button>}
  </>;
}

export function OrderManagement({ api, token, role, orders, onChanged, onNotice }: OrderManagementProps) {
  const [search, setSearch] = useState('');
  const filteredOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    const terms = query.split(/\s+/).filter(Boolean);
    return list.filter(order => {
      if (!order || typeof order !== 'object') return false;
      return terms.every(term => {
        if (term.startsWith('#') && `#${order.so_id}`.toLowerCase().includes(term)) return true;
        return Object.values(order).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(term);
        });
      });
    });
  }, [orders, search]);

  return <section className="panel">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
      <h2>Sales orders</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="search"
          placeholder="Search orders by customer, status, ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <OrderCreateButton api={api} token={token} onChanged={onChanged} onNotice={onNotice}/>
      </div>
    </div>
    <div className="tablewrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Warehouse</th><th>Date</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
      <tbody>{filteredOrders.map((order, index) => <tr key={order.so_id ?? `order-${index}`}>
        <td>#{order.so_id}</td><td>{order.customer_name}</td><td>{order.warehouse_name}</td><td>{order.order_date}</td>
        <td><span className={`pill ${order.status}`}>{order.status}</span></td><td>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</td>
        <td><OrderRowActions api={api} token={token} role={role} orderId={Number(order.so_id)} status={order.status} managed={Boolean(order.managed)} onChanged={onChanged} onNotice={onNotice}/></td>
      </tr>)}</tbody>
    </table>
    {!filteredOrders.length && <p className="muted" style={{ padding: '12px 16px' }}>{search ? `No orders matching "${search}".` : 'No orders found.'}</p>}
    </div>
    {!token && <p className="muted">Log in as staff or admin to create and cancel pending orders.</p>}
    <p className="muted">Historical orders are view-only. Deleting is optional; only admins can delete cancelled orders created in this app.</p>
  </section>;
}
