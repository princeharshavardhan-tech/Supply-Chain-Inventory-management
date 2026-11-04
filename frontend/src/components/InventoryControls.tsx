'use client';

import { useState } from 'react';
import { Plus, Save, X } from 'lucide-react';

type ProductOption = { product_id: number; product_name: string; sku: string };
type WarehouseOption = { warehouse_id: number; warehouse_name: string };
type ExistingPair = { product_id: number; warehouse_id: number };
type InventoryForm = {
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: string;
  reserved_quantity: string;
  reorder_level: string;
  min_stock_level: string;
  max_stock_level: string;
  location_slot: string;
};
type InventoryCreateProps = { api: string; token: string; onChanged: () => void; onNotice: (message: string) => void };

const emptyForm: InventoryForm = {
  product_id: '', warehouse_id: '', quantity_on_hand: '0', reserved_quantity: '0',
  reorder_level: '0', min_stock_level: '0', max_stock_level: '0', location_slot: ''
};

export function InventoryCreateButton({ api, token, onChanged, onNotice }: InventoryCreateProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [existingPairs, setExistingPairs] = useState<ExistingPair[]>([]);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const availableProducts = products.filter(product => !form.warehouse_id || !existingPairs.some(pair => pair.product_id === product.product_id && pair.warehouse_id === Number(form.warehouse_id)));
  const availableWarehouses = warehouses.filter(warehouse => !form.product_id || !existingPairs.some(pair => pair.product_id === Number(form.product_id) && pair.warehouse_id === warehouse.warehouse_id));

  async function openForm() {
    setOpen(true);
    setLoading(true);
    try {
      const response = await fetch(`${api}/api/manage/inventory-lookups`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not load inventory options.');
      setProducts(result.products);
      setWarehouses(result.warehouses);
      setExistingPairs(result.existing);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not load inventory options.');
    } finally {
      setLoading(false);
    }
  }

  async function saveInventory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNotice('');
    try {
      const response = await fetch(`${api}/api/manage/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: Number(form.product_id),
          warehouse_id: Number(form.warehouse_id),
          quantity_on_hand: Number(form.quantity_on_hand),
          reserved_quantity: Number(form.reserved_quantity),
          reorder_level: Number(form.reorder_level),
          min_stock_level: Number(form.min_stock_level),
          max_stock_level: Number(form.max_stock_level),
          location_slot: form.location_slot
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not create inventory.');
      onNotice(`${result.message} Inventory #${result.inventory_id}.`);
      setOpen(false);
      setForm(emptyForm);
      onChanged();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'Could not create inventory.');
    }
  }

  if (!token) return null;

  return <>
    <button className="btn" onClick={openForm}><Plus size={14}/> Add inventory</button>
    {open && <div className="modalback"><form className="modal" onSubmit={saveInventory}>
      <div className="modalhead"><h2>Add inventory</h2><button type="button" className="iconbtn" onClick={() => setOpen(false)}><X size={18}/></button></div>
      {loading ? <p className="muted">Loading inventory options…</p> : <>
        <div className="formgrid">
          <label>Product<select required value={form.product_id} onChange={event => setForm(current => ({ ...current, product_id: event.target.value, warehouse_id: event.target.value && existingPairs.some(pair => pair.product_id === Number(event.target.value) && pair.warehouse_id === Number(current.warehouse_id)) ? '' : current.warehouse_id }))}><option value="">Select product</option>{availableProducts.map(product => <option key={product.product_id} value={product.product_id}>{product.product_name} · {product.sku}</option>)}</select></label>
          <label>Warehouse<select required value={form.warehouse_id} onChange={event => setForm(current => ({ ...current, warehouse_id: event.target.value, product_id: event.target.value && existingPairs.some(pair => pair.product_id === Number(current.product_id) && pair.warehouse_id === Number(event.target.value)) ? '' : current.product_id }))}><option value="">Select warehouse</option>{availableWarehouses.map(warehouse => <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>{warehouse.warehouse_name}</option>)}</select></label>
          <label>Quantity on hand<input type="number" min="0" step="1" required value={form.quantity_on_hand} onChange={event => setForm({ ...form, quantity_on_hand: event.target.value })}/></label>
          <label>Reserved quantity<input type="number" min="0" step="1" required value={form.reserved_quantity} onChange={event => setForm({ ...form, reserved_quantity: event.target.value })}/></label>
          <label>Reorder level<input type="number" min="0" step="1" required value={form.reorder_level} onChange={event => setForm({ ...form, reorder_level: event.target.value })}/></label>
          <label>Minimum stock<input type="number" min="0" step="1" required value={form.min_stock_level} onChange={event => setForm({ ...form, min_stock_level: event.target.value })}/></label>
          <label>Maximum stock<input type="number" min="0" step="1" required value={form.max_stock_level} onChange={event => setForm({ ...form, max_stock_level: event.target.value })}/></label>
          <label>Location slot<input value={form.location_slot} onChange={event => setForm({ ...form, location_slot: event.target.value })}/></label>
        </div>
        <div className="modalactions"><button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn"><Save size={14}/> Save inventory</button></div>
      </>}
    </form></div>}
  </>;
}
