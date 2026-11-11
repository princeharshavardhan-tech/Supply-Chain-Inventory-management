'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  LayoutDashboard,
  Boxes,
  Warehouse,
  Truck,
  Users,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Network,
  LogIn,
  TrendingUp,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Link2,
  Package,
  ShoppingBag,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { OrderManagement } from '../components/OrderControls';
import { InventoryCreateButton } from '../components/InventoryControls';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

type Row = Record<string, any>;
type Dashboard = { stats: Record<string, number>; orders: Row[]; stock: Row[] };
type User = { id: number; username: string; role: 'admin' | 'staff' };
type GraphInfo = {
  success?: boolean;
  connected?: boolean;
  message?: string;
  counts?: { suppliers?: number; products?: number; warehouses?: number; relationships?: number; supplierRelationships?: number; stockRelationships?: number };
  demandSummary?: Row[];
  forecasts?: Row[];
};

const nav = [
  ['Overview', LayoutDashboard],
  ['Products', Boxes],
  ['Inventory', ClipboardList],
  ['Warehouses', Warehouse],
  ['Suppliers', Truck],
  ['Supplier Products', Link2],
  ['Purchase Orders', ShoppingBag],
  ['Customers', Users],
  ['Orders', ClipboardList],
  ['Risk analysis', AlertTriangle],
  ['Demand analysis', TrendingUp],
  ['Graph database', Network]
] as const;

const emptyProduct = {
  category_id: '',
  uom_id: '',
  product_name: '',
  sku: '',
  brand: '',
  barcode: '',
  unit_price: '0',
  reorder_level: '0',
  discontinued_flag: false,
  supplier_id: '',
  supplier_unit_cost: '0',
  supplier_lead_time_days: '7',
  supplier_product_code: ''
};
const emptyCustomer = { customer_name: '', email: '', phone_number: '', customer_type: 'Retail', address: '' };
const emptySupplier = { supplier_name: '', contact_person: '', email: '', phone_number: '', address: '', rating: '4.0' };
const emptySupplierProduct = { supplier_id: '', product_id: '', supplier_product_code: '', unit_cost: '0', lead_time_days: '7', is_preferred: false };

export default function Home() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [section, setSection] = useState('Overview');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [login, setLogin] = useState({ username: '', password: '' });
  const [loginMessage, setLoginMessage] = useState('');

  const [lookups, setLookups] = useState<{ categories: Row[]; uoms: Row[]; suppliers?: Row[] }>({ categories: [], uoms: [], suppliers: [] });
  const [productForm, setProductForm] = useState<typeof emptyProduct>(emptyProduct);
  const [editing, setEditing] = useState<number | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [viewingProductSuppliers, setViewingProductSuppliers] = useState<{ product_id: number; product_name: string; sku: string } | null>(null);
  const [productSuppliersList, setProductSuppliersList] = useState<Row[]>([]);
  const [loadingProductSuppliers, setLoadingProductSuppliers] = useState(false);

  const [customerForm, setCustomerForm] = useState<typeof emptyCustomer>(emptyCustomer);
  const [customerEditing, setCustomerEditing] = useState<number | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const [supplierForm, setSupplierForm] = useState<typeof emptySupplier>(emptySupplier);
  const [supplierEditing, setSupplierEditing] = useState<number | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  const [supplierProductForm, setSupplierProductForm] = useState<typeof emptySupplierProduct>(emptySupplierProduct);
  const [supplierProductEditing, setSupplierProductEditing] = useState<number | null>(null);
  const [showSupplierProductForm, setShowSupplierProductForm] = useState(false);
  const [supplierProductLookups, setSupplierProductLookups] = useState<{ suppliers: Row[]; products: Row[]; existing: Row[] }>({
    suppliers: [],
    products: [],
    existing: []
  });

  const [viewingSupplier, setViewingSupplier] = useState<{ supplier_id: number; supplier_name: string } | null>(null);
  const [supplierProductsList, setSupplierProductsList] = useState<Row[]>([]);
  const [loadingSupplierProducts, setLoadingSupplierProducts] = useState(false);

  const [viewingPOItems, setViewingPOItems] = useState<{ po_id: number; supplier_name: string; total_amount: number } | null>(null);
  const [poItemsList, setPOItemsList] = useState<Row[]>([]);
  const [loadingPOItems, setLoadingPOItems] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPOForm] = useState({
    supplier_id: '',
    expected_date: '',
    items: [{ product_id: '', quantity: '50', unit_cost: '0' }]
  });
  const [poLookups, setPOLookups] = useState<{ suppliers: Row[]; supplierProducts: Row[]; allProducts: Row[] }>({
    suppliers: [],
    supplierProducts: [],
    allProducts: []
  });

  const [inventoryEdit, setInventoryEdit] = useState<Row | null>(null);
  const [notice, setNotice] = useState('');
  const [graphInfo, setGraphInfo] = useState<GraphInfo | null>(null);
  const [graphBusy, setGraphBusy] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem('sc_token');
      const u = localStorage.getItem('sc_user');
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch {
      localStorage.removeItem('sc_user');
      localStorage.removeItem('sc_token');
    }
    setMounted(true);
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API}/api/dashboard/stats`);
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not load dashboard');
      setData(j);
    } catch (e: any) {
      setError(e.message + ' — check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  const loadRows = useCallback(async (sectionName = section) => {
    const map: Record<string, string> = {
      'Products': 'products',
      'Inventory': 'inventory',
      'Warehouses': 'warehouses',
      'Suppliers': 'suppliers',
      'Supplier Products': 'supplier-products',
      'Purchase Orders': 'purchase-orders',
      'Customers': 'customers',
      'Orders': 'orders',
      'Risk analysis': 'risks',
      'Demand analysis': 'demand'
    };
    const key = map[sectionName];
    if (!key) {
      setRows([]);
      return;
    }
    try {
      const endpoint = (key === 'products' || key === 'inventory' || key === 'customers' || key === 'suppliers' || key === 'supplier-products' || key === 'purchase-orders')
        ? `/api/manage/${key}`
        : key === 'orders'
          ? '/api/manage/orders'
          : key === 'demand'
            ? '/api/analytics/demand'
            : key === 'risks'
              ? '/api/analytics/risk-summary'
              : `/api/data/${key}`;
      const r = await fetch(`${API}${endpoint}`);
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not load records');
      setRows(key === 'demand' ? (j.history || []) : key === 'risks' ? (j.items || []) : (j.data || []));
      if (key === 'demand') {
        setGraphInfo((old: any) => ({ ...old, demandSummary: j.summary, forecasts: j.forecasts }));
      }
    } catch (e: any) {
      setError(e.message);
      setRows([]);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadRows(section);
    if (section === 'Graph database') loadGraphSummary();
  }, [section, loadRows]);

  async function loadLookups() {
    try {
      const r = await fetch(`${API}/api/manage/lookups`);
      const j = await r.json();
      if (j.success) setLookups({ categories: j.categories, uoms: j.uoms, suppliers: j.suppliers || [] });
    } catch {
      setError('Could not load product categories and units.');
    }
  }

  async function loadSupplierProductLookups() {
    try {
      const r = await fetch(`${API}/api/manage/supplier-product-lookups`);
      const j = await r.json();
      if (j.success) {
        setSupplierProductLookups({ suppliers: j.suppliers, products: j.products, existing: j.existing });
      }
    } catch {
      setError('Could not load suppliers and products for linking.');
    }
  }

  async function loadPOLookups() {
    try {
      const r = await fetch(`${API}/api/manage/purchase-order-lookups`);
      const j = await r.json();
      if (j.success) {
        setPOLookups({
          suppliers: j.suppliers || [],
          supplierProducts: j.supplierProducts || [],
          allProducts: j.allProducts || []
        });
      }
    } catch {
      setError('Could not load purchase order form options.');
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginMessage('');
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Login failed');
      localStorage.setItem('sc_token', j.token);
      localStorage.setItem('sc_user', JSON.stringify(j.user));
      setToken(j.token);
      setUser(j.user);
      setLoginOpen(false);
      setLogin({ username: '', password: '' });
    } catch (e: any) {
      setLoginMessage(e.message);
    }
  }

  function logout() {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    setToken('');
    setUser(null);
  }

  // --- Product actions ---
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    try {
      const url = editing ? `${API}/api/manage/products/${editing}` : `${API}/api/manage/products`;
      const r = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(productForm)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not save product');
      setNotice(j.message);
      setShowProductForm(false);
      setEditing(null);
      setProductForm(emptyProduct);
      await loadRows('Products');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  function startEditProduct(row: Row) {
    setProductForm({
      category_id: String(row.category_id ?? ''),
      uom_id: String(row.uom_id ?? ''),
      product_name: String(row.product_name ?? ''),
      sku: String(row.sku ?? ''),
      brand: String(row.brand ?? ''),
      barcode: String(row.barcode ?? ''),
      unit_price: String(row.unit_price ?? 0),
      reorder_level: String(row.reorder_level ?? 0),
      discontinued_flag: Boolean(row.discontinued_flag),
      supplier_id: '',
      supplier_unit_cost: '0',
      supplier_lead_time_days: '7',
      supplier_product_code: ''
    });
    setEditing(Number(row.product_id));
    setShowProductForm(true);
    loadLookups();
  }

  async function openProductSuppliersModal(product: Row) {
    setViewingProductSuppliers({
      product_id: Number(product.product_id),
      product_name: String(product.product_name),
      sku: String(product.sku)
    });
    setLoadingProductSuppliers(true);
    try {
      const r = await fetch(`${API}/api/manage/products/${product.product_id}/suppliers`);
      const j = await r.json();
      setProductSuppliersList(j.success ? (j.data || []) : []);
    } catch {
      setProductSuppliersList([]);
    } finally {
      setLoadingProductSuppliers(false);
    }
  }

  function openAddSupplierProductForProduct(productId: number) {
    setSupplierProductForm({
      ...emptySupplierProduct,
      product_id: String(productId)
    });
    setSupplierProductEditing(null);
    setShowSupplierProductForm(true);
    loadSupplierProductLookups();
  }

  async function deleteProduct(id: number) {
    if (!confirm('Delete this product? Products referenced by inventory, orders, or suppliers cannot be deleted.')) return;
    try {
      const r = await fetch(`${API}/api/manage/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows('Products');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  // --- Customer actions ---
  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    try {
      const url = customerEditing ? `${API}/api/manage/customers/${customerEditing}` : `${API}/api/manage/customers`;
      const r = await fetch(url, {
        method: customerEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(customerForm)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not save customer');
      setNotice(j.message);
      setShowCustomerForm(false);
      setCustomerEditing(null);
      setCustomerForm(emptyCustomer);
      await loadRows('Customers');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  function startEditCustomer(row: Row) {
    setCustomerForm({
      customer_name: String(row.customer_name ?? ''),
      email: String(row.email ?? ''),
      phone_number: String(row.phone_number ?? ''),
      customer_type: String(row.customer_type ?? 'Retail'),
      address: String(row.address ?? '')
    });
    setCustomerEditing(Number(row.customer_id));
    setShowCustomerForm(true);
  }

  async function deleteCustomer(id: number) {
    if (!confirm('Delete this customer? Customers with existing orders cannot be deleted.')) return;
    try {
      const r = await fetch(`${API}/api/manage/customers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows('Customers');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  // --- Supplier actions ---
  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    try {
      const url = supplierEditing ? `${API}/api/manage/suppliers/${supplierEditing}` : `${API}/api/manage/suppliers`;
      const r = await fetch(url, {
        method: supplierEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(supplierForm)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not save supplier');
      setNotice(j.message);
      setShowSupplierForm(false);
      setSupplierEditing(null);
      setSupplierForm(emptySupplier);
      await loadRows('Suppliers');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  function startEditSupplier(row: Row) {
    setSupplierForm({
      supplier_name: String(row.supplier_name ?? ''),
      contact_person: String(row.contact_person ?? ''),
      email: String(row.email ?? ''),
      phone_number: String(row.phone_number ?? ''),
      address: String(row.address ?? ''),
      rating: String(row.rating ?? '4.0')
    });
    setSupplierEditing(Number(row.supplier_id));
    setShowSupplierForm(true);
  }

  async function deleteSupplier(id: number) {
    if (!confirm('Delete this supplier? Suppliers that supply products or have purchase orders cannot be deleted.')) return;
    try {
      const r = await fetch(`${API}/api/manage/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows('Suppliers');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  // --- Supplier-Product Link actions ---
  function openAddSupplierProduct(prefillSupplierId?: number) {
    setSupplierProductForm({
      ...emptySupplierProduct,
      supplier_id: prefillSupplierId ? String(prefillSupplierId) : ''
    });
    setSupplierProductEditing(null);
    setShowSupplierProductForm(true);
    loadSupplierProductLookups();
  }

  function startEditSupplierProduct(row: Row) {
    setSupplierProductForm({
      supplier_id: String(row.supplier_id ?? ''),
      product_id: String(row.product_id ?? ''),
      supplier_product_code: String(row.supplier_product_code ?? ''),
      unit_cost: String(row.unit_cost ?? 0),
      lead_time_days: String(row.lead_time_days ?? 7),
      is_preferred: Boolean(row.is_preferred)
    });
    setSupplierProductEditing(Number(row.supplier_product_id));
    setShowSupplierProductForm(true);
    loadSupplierProductLookups();
  }

  async function saveSupplierProduct(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    try {
      const url = supplierProductEditing
        ? `${API}/api/manage/supplier-products/${supplierProductEditing}`
        : `${API}/api/manage/supplier-products`;
      const r = await fetch(url, {
        method: supplierProductEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(supplierProductForm)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not save supplier product link');
      setNotice(j.message);
      setShowSupplierProductForm(false);
      setSupplierProductEditing(null);
      setSupplierProductForm(emptySupplierProduct);
      await loadRows(section);
      if (viewingSupplier) {
        await openSupplierProductsModal(viewingSupplier);
      }
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  async function deleteSupplierProduct(id: number) {
    if (!confirm('Unlink this product from the supplier?')) return;
    try {
      const r = await fetch(`${API}/api/manage/supplier-products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows(section);
      if (viewingSupplier) {
        await openSupplierProductsModal(viewingSupplier);
      }
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  async function openSupplierProductsModal(supplier: Row) {
    setViewingSupplier({ supplier_id: Number(supplier.supplier_id), supplier_name: String(supplier.supplier_name) });
    setLoadingSupplierProducts(true);
    try {
      const r = await fetch(`${API}/api/manage/suppliers/${supplier.supplier_id}/products`);
      const j = await r.json();
      if (j.success) {
        setSupplierProductsList(j.data || []);
      } else {
        setSupplierProductsList([]);
      }
    } catch {
      setSupplierProductsList([]);
    } finally {
      setLoadingSupplierProducts(false);
    }
  }

  // --- Purchase Order actions ---
  async function openPOItemsModal(po: Row) {
    setViewingPOItems({
      po_id: Number(po.po_id),
      supplier_name: String(po.supplier_name),
      total_amount: Number(po.total_amount || 0)
    });
    setLoadingPOItems(true);
    try {
      const r = await fetch(`${API}/api/manage/purchase-orders/${po.po_id}/items`);
      const j = await r.json();
      setPOItemsList(j.success ? (j.data || []) : []);
    } catch {
      setPOItemsList([]);
    } finally {
      setLoadingPOItems(false);
    }
  }

  function openNewPO(prefillSupplierId?: number, prefillProductId?: number) {
    setPOForm({
      supplier_id: prefillSupplierId ? String(prefillSupplierId) : '',
      expected_date: '',
      items: [{
        product_id: prefillProductId ? String(prefillProductId) : '',
        quantity: '50',
        unit_cost: '0'
      }]
    });
    setShowPOForm(true);
    loadPOLookups();
  }

  async function savePurchaseOrder(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    try {
      const r = await fetch(`${API}/api/manage/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(poForm)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Could not save purchase order');
      setNotice(j.message);
      setShowPOForm(false);
      await loadRows('Purchase Orders');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  async function cancelPurchaseOrder(id: number) {
    if (!confirm(`Cancel Purchase Order #${id}?`)) return;
    try {
      const r = await fetch(`${API}/api/manage/purchase-orders/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows('Purchase Orders');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  async function receivePurchaseOrder(id: number) {
    if (!confirm(`Mark Purchase Order #${id} as Received? This acknowledges goods arrival from the supplier.`)) return;
    try {
      const r = await fetch(`${API}/api/manage/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows('Purchase Orders');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  async function deletePurchaseOrder(id: number) {
    if (!confirm(`Delete Purchase Order #${id}? Only Draft or Cancelled purchase orders can be deleted.`)) return;
    try {
      const r = await fetch(`${API}/api/manage/purchase-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      await loadRows('Purchase Orders');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  // --- Inventory actions ---
  async function saveInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!inventoryEdit) return;
    try {
      const r = await fetch(`${API}/api/manage/inventory/${inventoryEdit.inventory_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(inventoryEdit)
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message);
      setNotice(j.message);
      setInventoryEdit(null);
      await loadRows('Inventory');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  // --- Graph database actions ---
  async function loadGraphSummary() {
    try {
      const r = await fetch(`${API}/api/neo4j/summary`);
      const j = await r.json();
      setGraphInfo(j);
    } catch (e: any) {
      setGraphInfo({ success: false, message: e.message });
    }
  }

  async function syncGraph() {
    if (!token) {
      setNotice('Sign in as admin to synchronize Neo4j.');
      return;
    }
    setGraphBusy(true);
    setNotice('');
    try {
      const r = await fetch(`${API}/api/neo4j/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Neo4j sync failed');
      setNotice(`${j.message} Suppliers: ${j.counts.suppliers}, products: ${j.counts.products}, relationships: ${j.counts.supplierRelationships + j.counts.stockRelationships}.`);
      await loadGraphSummary();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setGraphBusy(false);
    }
  }

  // Value-based search filtering (checks only cell values, ignoring JSON keys)
  const filtered = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    const terms = query.split(/\s+/).filter(Boolean);

    return list.filter((row) => {
      if (!row || typeof row !== 'object') return false;
      return terms.every((term) =>
        Object.entries(row).some(([key, val]) => {
          if (val === null || val === undefined) return false;
          if (term.startsWith('#') && (key.endsWith('_id') || key === 'so_id')) {
            return `#${val}`.toLowerCase().includes(term);
          }
          if (typeof val === 'boolean') {
            const repr = val ? 'yes active true preferred' : 'no inactive false standard discontinued';
            return repr.includes(term);
          }
          if (typeof val === 'number') {
            return String(val).toLowerCase().includes(term);
          }
          return String(val).toLowerCase().includes(term);
        })
      );
    });
  }, [rows, search]);

  const stats = data?.stats;
  const cards = [
    ['Products', stats?.totalProducts],
    ['Warehouses', stats?.totalWarehouses],
    ['Suppliers', stats?.totalSuppliers],
    ['Customers', stats?.totalCustomers],
    ['Inventory records', stats?.inventoryRecords],
    ['Sales orders', stats?.salesOrders],
    ['Purchase orders', stats?.purchaseOrders],
    ['Supplier products', stats?.supplierProducts],
    ['Low / critical stock', stats?.lowStock],
    ['Open inventory risks', stats?.openRisks]
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">SUPPLYCHAIN<br /><span>INSIGHT</span></div>
        <div className="navlabel">Workspace</div>
        {nav.map(([name, Icon]) => (
          <button
            key={name}
            onClick={() => {
              setSection(name);
              setSearch('');
              setNotice('');
            }}
            className={`navlink ${section === name ? 'active' : ''}`}
            style={{ width: '100%', border: 0, textAlign: 'left', background: section === name ? undefined : 'transparent', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'center' }}
          >
            <Icon size={17} />{name}
          </button>
        ))}
        <div className="navlabel">Database · MySQL + Neo4j</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="pageTitle">{section}</h1>
            <div className="muted" style={{ fontSize: 13 }}>Supply Chain Inventory Risk &amp; Demand Analysis</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user ? (
              <>
                <span className="muted">{user.username} · {user.role}</span>
                <button className="btn secondary" onClick={logout}><LogOut size={14} /> Logout</button>
              </>
            ) : (
              <button className="btn secondary" onClick={() => setLoginOpen(true)}><LogIn size={14} /> Login</button>
            )}
            <button className="btn" onClick={() => { load(); loadRows(); }}>
              <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} />Refresh
            </button>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        {loading && <p className="muted">Loading database information…</p>}

        {/* OVERVIEW SECTION */}
        {section === 'Overview' && (
          <>
            <div className="gridstats">
              {cards.map(([label, value]) => (
                <div className="stat" key={label as string}>
                  <div className="label">{label}</div>
                  <div className="value">{value ?? '—'}</div>
                  <div className="hint">Live data from MySQL</div>
                </div>
              ))}
            </div>
            <div className="contentgrid">
              <section className="panel">
                <h2>Inventory attention required</h2>
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Warehouse</th><th>Available</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {(data?.stock || []).map((r, i) => (
                        <tr key={i}>
                          <td>{r.product_name}</td>
                          <td>{r.warehouse_name}</td>
                          <td>{r.available_quantity}</td>
                          <td><span className={`pill ${r.stock_status}`}>{r.stock_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <h2>Recent sales orders</h2>
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr><th>Order</th><th>Customer</th><th>Status</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                      {(data?.orders || []).map((r, i) => (
                        <tr key={i}>
                          <td>#{r.so_id}</td>
                          <td>{r.customer_name}</td>
                          <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                          <td>₹{Number(r.total_amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <section className="panel" style={{ marginTop: 16 }}>
              <h2>Inventory health snapshot</h2>
              <div className="chartbox">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data?.stock || []).slice(0, 7)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="product_name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="available_quantity" fill="#238b7d" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </>
        )}

        {/* ORDERS SECTION */}
        {section === 'Orders' && (
          <OrderManagement
            api={API}
            token={token}
            role={user?.role}
            orders={rows}
            onChanged={() => { loadRows('Orders'); load(); }}
            onNotice={setNotice}
          />
        )}

        {/* DEMAND ANALYSIS SECTION (Analytical View - search not required) */}
        {section === 'Demand analysis' && (
          <section className="panel">
            <h2>Demand analysis</h2>
            {graphInfo?.demandSummary && (
              <div className="tablewrap" style={{ marginBottom: 16 }}>
                <h3>Demand summary by product</h3>
                <table>
                  <thead>
                    <tr><th>Product</th><th>Historical demand</th><th>Forecast demand</th></tr>
                  </thead>
                  <tbody>
                    {graphInfo.demandSummary.map((x: Row) => (
                      <tr key={x.product_id}>
                        <td>{x.product_name}</td>
                        <td>{x.historical_demand}</td>
                        <td>{x.forecast_demand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h3>Recent demand history</h3>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    {rows[0] ? Object.keys(rows[0]).map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>) : <th>Records</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {Object.entries(r).map(([k, v]) => (
                        <td key={k}>{v === null ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <p className="muted">No demand history records found.</p>}
            </div>
          </section>
        )}

        {/* GRAPH DATABASE SECTION (System/Admin View - search not required) */}
        {section === 'Graph database' && (
          <section className="panel">
            <h2>Graph database (Neo4j)</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <span className={`pill ${graphInfo?.connected ? 'Healthy' : 'Critical'}`}>
                {graphInfo?.connected ? 'Connected' : 'Not connected'}
              </span>
              <button className="btn secondary" onClick={loadGraphSummary}>Check connection</button>
              <button className="btn" onClick={syncGraph} disabled={graphBusy || user?.role !== 'admin'}>
                {graphBusy ? 'Synchronizing…' : 'Sync MySQL → Neo4j'}
              </button>
            </div>
            {graphInfo?.counts ? (
              <div className="gridstats">
                {Object.entries(graphInfo.counts).map(([k, v]) => (
                  <div className="stat" key={k}>
                    <div className="label">{k}</div>
                    <div className="value">{String(v)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">{graphInfo?.message || 'Configure and start Neo4j, then check the connection.'}</p>
            )}
            <p className="muted" style={{ marginTop: 12 }}>
              Neo4j stores supplier–product and product–warehouse relationships as a graph. Synchronization requires an administrator account.
            </p>
          </section>
        )}

        {/* RECORD MANAGEMENT SECTIONS (Products, Inventory, Warehouses, Suppliers, Supplier Products, Customers, Risk analysis) */}
        {section !== 'Overview' && section !== 'Orders' && section !== 'Demand analysis' && section !== 'Graph database' && (
          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <h2>{section} records</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="search"
                  placeholder={`Search ${section.toLowerCase()}…`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {section === 'Products' && (
                  <button className="btn" onClick={() => { setProductForm(emptyProduct); setEditing(null); setShowProductForm(true); loadLookups(); }}>
                    <Plus size={14} /> Add product
                  </button>
                )}
                {section === 'Inventory' && (
                  <InventoryCreateButton api={API} token={token} onChanged={() => { loadRows('Inventory'); load(); }} onNotice={setNotice} />
                )}
                {section === 'Customers' && (
                  <button className="btn" onClick={() => { setCustomerForm(emptyCustomer); setCustomerEditing(null); setShowCustomerForm(true); }}>
                    <Plus size={14} /> Add customer
                  </button>
                )}
                {section === 'Suppliers' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" onClick={() => { setSupplierForm(emptySupplier); setSupplierEditing(null); setShowSupplierForm(true); }}>
                      <Plus size={14} /> Add supplier
                    </button>
                    <button className="btn secondary" onClick={() => openAddSupplierProduct()}>
                      <Link2 size={14} /> Link product
                    </button>
                  </div>
                )}
                {section === 'Supplier Products' && (
                  <button className="btn" onClick={() => openAddSupplierProduct()}>
                    <Plus size={14} /> Link product to supplier
                  </button>
                )}
                {section === 'Purchase Orders' && (
                  <button className="btn" onClick={() => openNewPO()}>
                    <Plus size={14} /> New purchase order
                  </button>
                )}
              </div>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    {rows[0] ? Object.keys(rows[0]).map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>) : <th>Records</th>}
                    {(section === 'Products' || section === 'Inventory' || section === 'Customers' || section === 'Suppliers' || section === 'Supplier Products' || section === 'Purchase Orders' || section === 'Risk analysis') && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i}>
                      {Object.entries(r).map(([k, v]) => (
                        <td key={k}>
                          {v === null
                            ? '—'
                            : typeof v === 'boolean'
                              ? (v ? 'Yes' : 'No')
                              : (k === 'unit_cost' || k === 'supplier_unit_cost' || k === 'total_amount' || k === 'unit_price')
                                ? `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : k === 'status'
                                  ? <span className={`pill ${v}`}>{String(v)}</span>
                                  : String(v)}
                        </td>
                      ))}
                      {section === 'Products' && (
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="iconbtn" title="View suppliers of this product" onClick={() => openProductSuppliersModal(r)}><Truck size={15} /></button>
                          <button className="iconbtn" title="Edit" onClick={() => startEditProduct(r)}><Edit size={15} /></button>
                          {user?.role === 'admin' && (
                            <button className="iconbtn danger" title="Delete" onClick={() => deleteProduct(r.product_id)}><Trash2 size={15} /></button>
                          )}
                        </td>
                      )}
                      {section === 'Inventory' && (
                        <td>
                          <button className="iconbtn" title="Update stock" onClick={() => setInventoryEdit({ ...r })}><Edit size={15} /></button>
                        </td>
                      )}
                      {section === 'Customers' && (
                        <td>
                          <button className="iconbtn" title="Edit customer" onClick={() => startEditCustomer(r)}><Edit size={15} /></button>
                          {user?.role === 'admin' && (
                            <button className="iconbtn danger" title="Delete customer" onClick={() => deleteCustomer(r.customer_id)}><Trash2 size={15} /></button>
                          )}
                        </td>
                      )}
                      {section === 'Suppliers' && (
                        <td>
                          <button className="iconbtn" title="View supplied products" onClick={() => openSupplierProductsModal(r)}><Package size={15} /></button>
                          <button className="iconbtn" title="Edit supplier" onClick={() => startEditSupplier(r)}><Edit size={15} /></button>
                          {user?.role === 'admin' && (
                            <button className="iconbtn danger" title="Delete supplier" onClick={() => deleteSupplier(r.supplier_id)}><Trash2 size={15} /></button>
                          )}
                        </td>
                      )}
                      {section === 'Supplier Products' && (
                        <td>
                          <button className="iconbtn" title="Edit relationship" onClick={() => startEditSupplierProduct(r)}><Edit size={15} /></button>
                          {user?.role === 'admin' && (
                            <button className="iconbtn danger" title="Unlink product" onClick={() => deleteSupplierProduct(r.supplier_product_id)}><Trash2 size={15} /></button>
                          )}
                        </td>
                      )}
                      {section === 'Purchase Orders' && (
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="iconbtn" title="View line items" onClick={() => openPOItemsModal(r)}><Package size={15} /></button>
                          {r.status === 'Ordered' && user && (
                            <button className="iconbtn" style={{ color: '#16a34a' }} title="Mark as received" onClick={() => receivePurchaseOrder(r.po_id)}><CheckCircle2 size={15} /></button>
                          )}
                          {(r.status === 'Ordered' || r.status === 'Draft') && user && (
                            <button className="iconbtn" style={{ color: '#dc2626' }} title="Cancel purchase order" onClick={() => cancelPurchaseOrder(r.po_id)}><XCircle size={15} /></button>
                          )}
                          {(r.status === 'Cancelled' || r.status === 'Draft') && user?.role === 'admin' && (
                            <button className="iconbtn danger" title="Delete purchase order" onClick={() => deletePurchaseOrder(r.po_id)}><Trash2 size={15} /></button>
                          )}
                        </td>
                      )}
                      {section === 'Risk analysis' && (
                        <td>
                          {r.risk_type === 'Stockout' && (
                            <button
                              className="btn secondary"
                              style={{ fontSize: 11, padding: '3px 8px', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                setSection('Purchase Orders');
                                openNewPO(undefined, r.product_id);
                              }}
                              title="Create purchase order to replenish stock"
                            >
                              <ShoppingBag size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                              Raise PO
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="muted" style={{ padding: '12px 16px' }}>
                  {search ? `No records matching "${search}".` : 'No records found.'}
                </p>
              )}
            </div>

            {section === 'Products' && !token && (
              <p className="muted" style={{ marginTop: 12 }}>You can view products and their connected suppliers without signing in. Log in as admin or staff to add or edit. Only admins can delete.</p>
            )}
            {section === 'Inventory' && !token && (
              <p className="muted" style={{ marginTop: 12 }}>You can view inventory without signing in. Log in as admin or staff to adjust stock.</p>
            )}
            {section === 'Customers' && !token && (
              <p className="muted" style={{ marginTop: 12 }}>You can view customers without signing in. Log in as admin or staff to add or edit. Only admins can delete.</p>
            )}
            {section === 'Suppliers' && !token && (
              <p className="muted" style={{ marginTop: 12 }}>You can view suppliers without signing in. Click the box icon to see products provided by that vendor. Log in as admin or staff to add, edit, or link products.</p>
            )}
            {section === 'Supplier Products' && !token && (
              <p className="muted" style={{ marginTop: 12 }}>You can view supplier-product links without signing in. Log in as admin or staff to link or edit. Only admins can unlink.</p>
            )}
            {section === 'Purchase Orders' && !token && (
              <p className="muted" style={{ marginTop: 12 }}>You can view purchase orders placed with suppliers without signing in. Log in as admin or staff to create, receive, or cancel purchase orders.</p>
            )}
          </section>
        )}

        {/* MODALS */}

        {/* Product Modal */}
        {showProductForm && (
          <div className="modalback">
            <form className="modal" onSubmit={saveProduct}>
              <div className="modalhead">
                <h2>{editing ? 'Edit product' : 'Add product'}</h2>
                <button type="button" className="iconbtn" onClick={() => setShowProductForm(false)}><X size={18} /></button>
              </div>
              {!token && <p className="error">Please log in before saving product details.</p>}
              <div className="formgrid">
                <label>Product name<input required value={productForm.product_name} onChange={e => setProductForm({ ...productForm, product_name: e.target.value })} /></label>
                <label>SKU<input required value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} /></label>
                <label>Category
                  <select required value={productForm.category_id} onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}>
                    <option value="">Select category</option>
                    {lookups.categories.map(x => <option key={x.category_id} value={x.category_id}>{x.category_name}</option>)}
                  </select>
                </label>
                <label>Unit of measure
                  <select required value={productForm.uom_id} onChange={e => setProductForm({ ...productForm, uom_id: e.target.value })}>
                    <option value="">Select unit</option>
                    {lookups.uoms.map(x => <option key={x.uom_id} value={x.uom_id}>{x.uom_name}</option>)}
                  </select>
                </label>
                <label>Brand<input value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} /></label>
                <label>Barcode<input value={productForm.barcode} onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} /></label>
                <label>Unit price (₹)<input type="number" min="0" step="0.01" required value={productForm.unit_price} onChange={e => setProductForm({ ...productForm, unit_price: e.target.value })} /></label>
                <label>Reorder level<input type="number" min="0" step="1" required value={productForm.reorder_level} onChange={e => setProductForm({ ...productForm, reorder_level: e.target.value })} /></label>
                {!editing && (
                  <>
                    <div style={{ gridColumn: 'span 2', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <strong>Supplier Connection (Optional)</strong>
                      <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>Link an initial preferred vendor directly to this product.</p>
                    </div>
                    <label>Preferred supplier
                      <select value={productForm.supplier_id} onChange={e => setProductForm({ ...productForm, supplier_id: e.target.value })}>
                        <option value="">None (Link later)</option>
                        {(lookups.suppliers || []).map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                      </select>
                    </label>
                    <label>Supplier product code (SKU)<input placeholder="e.g. SP-01-099" value={productForm.supplier_product_code} onChange={e => setProductForm({ ...productForm, supplier_product_code: e.target.value })} /></label>
                    <label>Supplier unit cost (₹)<input type="number" min="0" step="0.01" value={productForm.supplier_unit_cost} onChange={e => setProductForm({ ...productForm, supplier_unit_cost: e.target.value })} /></label>
                    <label>Lead time (days)<input type="number" min="0" step="1" value={productForm.supplier_lead_time_days} onChange={e => setProductForm({ ...productForm, supplier_lead_time_days: e.target.value })} /></label>
                  </>
                )}
              </div>
              <div className="modalactions">
                <button type="button" className="btn secondary" onClick={() => setShowProductForm(false)}>Cancel</button>
                <button className="btn" disabled={!token}><Save size={14} /> Save product</button>
              </div>
            </form>
          </div>
        )}

        {/* Customer Modal */}
        {showCustomerForm && (
          <div className="modalback">
            <form className="modal" onSubmit={saveCustomer}>
              <div className="modalhead">
                <h2>{customerEditing ? 'Edit customer' : 'Add customer'}</h2>
                <button type="button" className="iconbtn" onClick={() => setShowCustomerForm(false)}><X size={18} /></button>
              </div>
              {!token && <p className="error">Please log in before saving customer details.</p>}
              <div className="formgrid">
                <label>Customer name<input required placeholder="Company or person name" value={customerForm.customer_name} onChange={e => setCustomerForm({ ...customerForm, customer_name: e.target.value })} /></label>
                <label>Email<input type="email" required placeholder="contact@example.com" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} /></label>
                <label>Phone number<input type="tel" placeholder="e.g. 9845012345" value={customerForm.phone_number} onChange={e => setCustomerForm({ ...customerForm, phone_number: e.target.value })} /></label>
                <label>Customer type
                  <select value={customerForm.customer_type} onChange={e => setCustomerForm({ ...customerForm, customer_type: e.target.value })}>
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </label>
                <label style={{ gridColumn: 'span 2' }}>Address<input placeholder="Street, area, city" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} /></label>
              </div>
              <div className="modalactions">
                <button type="button" className="btn secondary" onClick={() => setShowCustomerForm(false)}>Cancel</button>
                <button className="btn" disabled={!token}><Save size={14} /> Save customer</button>
              </div>
            </form>
          </div>
        )}

        {/* Supplier Modal */}
        {showSupplierForm && (
          <div className="modalback">
            <form className="modal" onSubmit={saveSupplier}>
              <div className="modalhead">
                <h2>{supplierEditing ? 'Edit supplier' : 'Add supplier'}</h2>
                <button type="button" className="iconbtn" onClick={() => setShowSupplierForm(false)}><X size={18} /></button>
              </div>
              {!token && <p className="error">Please log in before saving supplier details.</p>}
              <div className="formgrid">
                <label>Supplier name<input required placeholder="Supplier or vendor name" value={supplierForm.supplier_name} onChange={e => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })} /></label>
                <label>Contact person<input placeholder="Contact name" value={supplierForm.contact_person} onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} /></label>
                <label>Email<input type="email" placeholder="sales@supplier.com" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} /></label>
                <label>Phone number<input type="tel" placeholder="e.g. 9900112233" value={supplierForm.phone_number} onChange={e => setSupplierForm({ ...supplierForm, phone_number: e.target.value })} /></label>
                <label>Rating (0 to 5)<input type="number" min="0" max="5" step="0.1" value={supplierForm.rating} onChange={e => setSupplierForm({ ...supplierForm, rating: e.target.value })} /></label>
                <label>Address<input placeholder="Factory/office address" value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} /></label>
              </div>
              <div className="modalactions">
                <button type="button" className="btn secondary" onClick={() => setShowSupplierForm(false)}>Cancel</button>
                <button className="btn" disabled={!token}><Save size={14} /> Save supplier</button>
              </div>
            </form>
          </div>
        )}

        {/* Link Product to Supplier Modal */}
        {showSupplierProductForm && (
          <div className="modalback">
            <form className="modal" onSubmit={saveSupplierProduct}>
              <div className="modalhead">
                <h2>{supplierProductEditing ? 'Edit supplier product' : 'Link product to supplier'}</h2>
                <button type="button" className="iconbtn" onClick={() => setShowSupplierProductForm(false)}><X size={18} /></button>
              </div>
              {!token && <p className="error">Please log in before saving supplier product links.</p>}
              <div className="formgrid">
                <label>Supplier
                  <select
                    required
                    disabled={Boolean(supplierProductEditing)}
                    value={supplierProductForm.supplier_id}
                    onChange={e => setSupplierProductForm({ ...supplierProductForm, supplier_id: e.target.value })}
                  >
                    <option value="">Select supplier</option>
                    {supplierProductLookups.suppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </label>
                <label>Product
                  <select
                    required
                    disabled={Boolean(supplierProductEditing)}
                    value={supplierProductForm.product_id}
                    onChange={e => setSupplierProductForm({ ...supplierProductForm, product_id: e.target.value })}
                  >
                    <option value="">Select product</option>
                    {supplierProductLookups.products.map(p => (
                      <option key={p.product_id} value={p.product_id}>{p.product_name} · {p.sku}</option>
                    ))}
                  </select>
                </label>
                <label>Unit cost (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={supplierProductForm.unit_cost}
                    onChange={e => setSupplierProductForm({ ...supplierProductForm, unit_cost: e.target.value })}
                  />
                </label>
                <label>Lead time (days)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={supplierProductForm.lead_time_days}
                    onChange={e => setSupplierProductForm({ ...supplierProductForm, lead_time_days: e.target.value })}
                  />
                </label>
                <label>Supplier product code (optional)
                  <input
                    placeholder="e.g. SP-01-001"
                    value={supplierProductForm.supplier_product_code}
                    onChange={e => setSupplierProductForm({ ...supplierProductForm, supplier_product_code: e.target.value })}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26 }}>
                  <input
                    type="checkbox"
                    checked={supplierProductForm.is_preferred}
                    onChange={e => setSupplierProductForm({ ...supplierProductForm, is_preferred: e.target.checked })}
                  />
                  Preferred supplier for this product
                </label>
              </div>
              <div className="modalactions">
                <button type="button" className="btn secondary" onClick={() => setShowSupplierProductForm(false)}>Cancel</button>
                <button className="btn" disabled={!token}><Save size={14} /> Save relationship</button>
              </div>
            </form>
          </div>
        )}

        {/* View Supplier's Products Modal (using GetSupplierProducts stored procedure) */}
        {viewingSupplier && (
          <div className="modalback">
            <div className="modal" style={{ maxWidth: 800 }}>
              <div className="modalhead">
                <h2>Products supplied by {viewingSupplier.supplier_name}</h2>
                <button type="button" className="iconbtn" onClick={() => setViewingSupplier(null)}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p className="muted" style={{ margin: 0 }}>
                  Fetched via stored procedure <code>CALL GetSupplierProducts({viewingSupplier.supplier_id})</code> from MySQL.
                </p>
                <button className="btn" onClick={() => openAddSupplierProduct(viewingSupplier.supplier_id)}>
                  <Plus size={14} /> Link product
                </button>
              </div>
              {loadingSupplierProducts ? (
                <p className="muted">Loading supplied products…</p>
              ) : supplierProductsList.length > 0 ? (
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product name</th>
                        <th>Unit cost</th>
                        <th>Lead time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierProductsList.map((sp, idx) => (
                        <tr key={idx}>
                          <td><strong>{sp.product_name}</strong></td>
                          <td>₹{Number(sp.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>{sp.lead_time_days} days</td>
                          <td>
                            <span className={`pill ${sp.is_preferred ? 'Healthy' : 'secondary'}`}>
                              {sp.is_preferred ? 'Preferred' : 'Standard'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted" style={{ padding: '20px 0' }}>No products are currently linked to this supplier. Click &quot;Link product&quot; to add one.</p>
              )}
              <div className="modalactions" style={{ marginTop: 18 }}>
                <button type="button" className="btn secondary" onClick={() => setViewingSupplier(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Viewing Product Suppliers Modal */}
        {viewingProductSuppliers && (
          <div className="modalback">
            <div className="modal" style={{ maxWidth: 750 }}>
              <div className="modalhead">
                <div>
                  <h2>Suppliers for {viewingProductSuppliers.product_name}</h2>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>SKU: {viewingProductSuppliers.sku} · Vendors supplying this item</p>
                </div>
                <button type="button" className="iconbtn" onClick={() => setViewingProductSuppliers(null)}><X size={18} /></button>
              </div>

              {loadingProductSuppliers ? (
                <p className="muted" style={{ padding: '20px 0' }}>Loading suppliers from database…</p>
              ) : productSuppliersList.length > 0 ? (
                <div className="tablewrap" style={{ marginTop: 14 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Contact</th>
                        <th>Phone</th>
                        <th>Unit cost</th>
                        <th>Lead time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSuppliersList.map((ps, idx) => (
                        <tr key={idx}>
                          <td><strong>{ps.supplier_name}</strong></td>
                          <td>{ps.contact_person || '—'}</td>
                          <td>{ps.phone_number || '—'}</td>
                          <td>₹{Number(ps.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>{ps.lead_time_days} days</td>
                          <td>
                            <span className={`pill ${ps.is_preferred ? 'Healthy' : 'secondary'}`}>
                              {ps.is_preferred ? 'Preferred' : 'Standard'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted" style={{ padding: '20px 0' }}>No suppliers are currently linked to this product in the supplier_product catalog.</p>
              )}

              <div className="modalactions" style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const pid = viewingProductSuppliers.product_id;
                    setViewingProductSuppliers(null);
                    openAddSupplierProductForProduct(pid);
                  }}
                >
                  <Plus size={14} /> Link new supplier
                </button>
                <button type="button" className="btn secondary" onClick={() => setViewingProductSuppliers(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Viewing PO Items Modal */}
        {viewingPOItems && (
          <div className="modalback">
            <div className="modal" style={{ maxWidth: 750 }}>
              <div className="modalhead">
                <div>
                  <h2>Purchase Order #{viewingPOItems.po_id} Items</h2>
                  <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Supplier: {viewingPOItems.supplier_name}</p>
                </div>
                <button type="button" className="iconbtn" onClick={() => setViewingPOItems(null)}><X size={18} /></button>
              </div>

              {loadingPOItems ? (
                <p className="muted" style={{ padding: '20px 0' }}>Loading items from database…</p>
              ) : poItemsList.length > 0 ? (
                <div className="tablewrap" style={{ marginTop: 14 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Unit cost</th>
                        <th>Tax (5%)</th>
                        <th>Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItemsList.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.product_name}</strong></td>
                          <td>{it.sku}</td>
                          <td>{it.quantity}</td>
                          <td>₹{Number(it.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>₹{Number(it.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td><strong>₹{Number(it.line_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', marginTop: 12, fontSize: 15 }}>
                    <strong>Total Amount: ₹{Number(viewingPOItems.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ padding: '20px 0' }}>No line items found for this purchase order.</p>
              )}

              <div className="modalactions" style={{ marginTop: 18 }}>
                <button type="button" className="btn secondary" onClick={() => setViewingPOItems(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Purchase Order Modal */}
        {showPOForm && (
          <div className="modalback">
            <form className="modal" style={{ maxWidth: 750 }} onSubmit={savePurchaseOrder}>
              <div className="modalhead">
                <h2>New Purchase Order</h2>
                <button type="button" className="iconbtn" onClick={() => setShowPOForm(false)}><X size={18} /></button>
              </div>
              {!token && <p className="error">Please log in as admin or staff to create purchase orders.</p>}
              <div className="formgrid">
                <label>Supplier
                  <select
                    required
                    value={poForm.supplier_id}
                    onChange={e => {
                      const sid = e.target.value;
                      const supProds = poLookups.supplierProducts.filter(sp => String(sp.supplier_id) === sid);
                      const firstProd = supProds[0] || poLookups.allProducts[0];
                      setPOForm({
                        ...poForm,
                        supplier_id: sid,
                        items: [{
                          product_id: firstProd ? String(firstProd.product_id) : '',
                          quantity: '50',
                          unit_cost: firstProd ? String(firstProd.unit_cost || 0) : '0'
                        }]
                      });
                    }}
                  >
                    <option value="">Select supplier vendor</option>
                    {poLookups.suppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name} {s.rating ? `(Rating: ${s.rating}★)` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Expected Delivery Date
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={poForm.expected_date}
                    onChange={e => setPOForm({ ...poForm, expected_date: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Order Line Items</strong>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                    onClick={() => {
                      const sid = poForm.supplier_id;
                      const supProds = poLookups.supplierProducts.filter(sp => String(sp.supplier_id) === sid);
                      const fallback = supProds[0] || poLookups.allProducts[0];
                      setPOForm({
                        ...poForm,
                        items: [
                          ...poForm.items,
                          {
                            product_id: fallback ? String(fallback.product_id) : '',
                            quantity: '50',
                            unit_cost: fallback ? String(fallback.unit_cost || 0) : '0'
                          }
                        ]
                      });
                    }}
                  >
                    <Plus size={12} /> Add item
                  </button>
                </div>

                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 110 }}>Quantity</th>
                        <th style={{ width: 120 }}>Unit cost (₹)</th>
                        <th style={{ width: 110 }}>Total (₹)</th>
                        <th style={{ width: 45 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.map((item, idx) => {
                        const sid = poForm.supplier_id;
                        const supProds = poLookups.supplierProducts.filter(sp => String(sp.supplier_id) === sid);
                        const productOptions = supProds.length ? supProds : poLookups.allProducts;
                        const qty = Number(item.quantity || 0);
                        const cost = Number(item.unit_cost || 0);
                        const lineSubtotal = qty * cost;
                        const tax = lineSubtotal * 0.05;
                        const lineTotal = lineSubtotal + tax;

                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                required
                                value={item.product_id}
                                onChange={e => {
                                  const pid = e.target.value;
                                  const match = poLookups.supplierProducts.find(
                                    sp => String(sp.supplier_id) === String(poForm.supplier_id) && String(sp.product_id) === pid
                                  );
                                  const newItems = [...poForm.items];
                                  newItems[idx] = {
                                    ...newItems[idx],
                                    product_id: pid,
                                    unit_cost: match ? String(match.unit_cost) : (newItems[idx].unit_cost || '0')
                                  };
                                  setPOForm({ ...poForm, items: newItems });
                                }}
                              >
                                <option value="">Select product</option>
                                {productOptions.map(p => (
                                  <option key={p.product_id} value={p.product_id}>
                                    {p.product_name} ({p.sku}) {p.unit_cost !== undefined ? `[₹${p.unit_cost}]` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...poForm.items];
                                  newItems[idx] = { ...newItems[idx], quantity: e.target.value };
                                  setPOForm({ ...poForm, items: newItems });
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={item.unit_cost}
                                onChange={e => {
                                  const newItems = [...poForm.items];
                                  newItems[idx] = { ...newItems[idx], unit_cost: e.target.value };
                                  setPOForm({ ...poForm, items: newItems });
                                }}
                              />
                            </td>
                            <td>₹{lineTotal.toFixed(2)}</td>
                            <td>
                              {poForm.items.length > 1 && (
                                <button
                                  type="button"
                                  className="iconbtn danger"
                                  onClick={() => {
                                    const newItems = poForm.items.filter((_, i) => i !== idx);
                                    setPOForm({ ...poForm, items: newItems });
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  const subtotal = poForm.items.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unit_cost || 0)), 0);
                  const gst = subtotal * 0.05;
                  const grand = subtotal + gst;
                  return (
                    <div style={{ textAlign: 'right', marginTop: 12, fontSize: 14 }}>
                      <div>Subtotal: ₹{subtotal.toFixed(2)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>Estimated GST (5%): ₹{gst.toFixed(2)}</div>
                      <div style={{ fontSize: 16, marginTop: 4 }}><strong>Grand Total: ₹{grand.toFixed(2)}</strong></div>
                    </div>
                  );
                })()}
              </div>

              <div className="modalactions" style={{ marginTop: 20 }}>
                <button type="button" className="btn secondary" onClick={() => setShowPOForm(false)}>Cancel</button>
                <button className="btn" disabled={!token}><Save size={14} /> Submit purchase order</button>
              </div>
            </form>
          </div>
        )}

        {/* Inventory Edit Modal */}
        {inventoryEdit && (
          <div className="modalback">
            <form className="modal" onSubmit={saveInventory}>
              <div className="modalhead">
                <h2>Update inventory</h2>
                <button type="button" className="iconbtn" onClick={() => setInventoryEdit(null)}><X size={18} /></button>
              </div>
              <p className="muted">{inventoryEdit.product_name} · {inventoryEdit.warehouse_name}</p>
              <div className="formgrid">
                {[
                  ['quantity_on_hand', 'Quantity on hand'],
                  ['reserved_quantity', 'Reserved quantity'],
                  ['reorder_level', 'Reorder level'],
                  ['min_stock_level', 'Minimum stock'],
                  ['max_stock_level', 'Maximum stock']
                ].map(([key, label]) => (
                  <label key={key}>{label}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={inventoryEdit[key]}
                      onChange={e => setInventoryEdit({ ...inventoryEdit, [key]: Number(e.target.value) })}
                    />
                  </label>
                ))}
                <label>Location slot
                  <input value={inventoryEdit.location_slot || ''} onChange={e => setInventoryEdit({ ...inventoryEdit, location_slot: e.target.value })} />
                </label>
              </div>
              {!token && <p className="error">Please log in before updating inventory.</p>}
              <div className="modalactions">
                <button type="button" className="btn secondary" onClick={() => setInventoryEdit(null)}>Cancel</button>
                <button className="btn" disabled={!token}><Save size={14} /> Save stock</button>
              </div>
            </form>
          </div>
        )}

        {/* Sign In Modal */}
        {loginOpen && (
          <div className="modalback">
            <form className="modal loginmodal" onSubmit={submitLogin}>
              <div className="modalhead">
                <h2>Sign in</h2>
                <button type="button" className="iconbtn" onClick={() => setLoginOpen(false)}><X size={18} /></button>
              </div>
              <label>Username
                <input required value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} />
              </label>
              <label>Password
                <input type="password" required value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} />
              </label>
              {loginMessage && <p className="error">{loginMessage}</p>}
              <div className="modalactions">
                <button className="btn">Login</button>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>Create the first admin from the backend terminal using the README instructions.</p>
            </form>
          </div>
        )}

        <p className="muted" style={{ fontSize: 12, marginTop: 22 }}>Supply Chain Inventory Risk &amp; Demand Analysis · MySQL database</p>
      </main>
    </div>
  );
}
