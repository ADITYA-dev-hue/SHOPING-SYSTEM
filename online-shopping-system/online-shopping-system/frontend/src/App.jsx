import { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, LogOut, Package, LayoutDashboard, Plus, Minus, Trash2, Menu, X, ShoppingCart } from 'lucide-react';
import { api, getToken, money } from './api';

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/auth/me').then(d => setUser(d.user)).catch(() => localStorage.removeItem('shop_token')).finally(() => setLoading(false));
  }, []);
  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('shop_token', d.token); setUser(d.user);
  };
  const register = async (name, email, password) => {
    const d = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    localStorage.setItem('shop_token', d.token); setUser(d.user);
  };
  const logout = () => { localStorage.removeItem('shop_token'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
function Header() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false);
  return <header className="header"><div className="nav wrap">
    <Link className="brand" to="/"><span className="brand-icon"><ShoppingBag size={21}/></span>ShopEase</Link>
    <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
    <nav className={open ? 'nav-links open' : 'nav-links'}>
      <NavLink to="/" onClick={() => setOpen(false)}>Shop</NavLink>
      {user && <NavLink to="/cart" onClick={() => setOpen(false)}><ShoppingCart size={16}/> Cart</NavLink>}
      {user && <NavLink to="/orders" onClick={() => setOpen(false)}><Package size={16}/> My Orders</NavLink>}
      {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)}><LayoutDashboard size={16}/> Admin</NavLink>}
      {user ? <button className="nav-auth" onClick={logout}><LogOut size={16}/> Logout</button> : <><NavLink to="/login">Login</NavLink><Link className="btn btn-small" to="/register">Sign up</Link></>}
    </nav>
  </div></header>;
}
function Layout({ children }) { return <><Header/>{children}<footer><div className="wrap footer-inner"><strong>ShopEase</strong><span>Simple shopping. Thoughtful choices.</span><span>© {new Date().getFullYear()} ShopEase</span></div></footer></>; }
function Notice({ message, error }) { return message ? <div className={error ? 'notice error' : 'notice'}>{message}</div> : null; }
function ProductCard({ product, onAdd }) {
  return <article className="product-card">
    <Link to={`/product/${product.id}`} className="product-image"><img src={product.image_url || 'https://placehold.co/600x450?text=Product'} alt={product.name} onError={e => { e.currentTarget.src='https://placehold.co/600x450?text=Product'; }}/><span>{product.category || 'General'}</span></Link>
    <div className="product-info"><Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link><p>{product.description}</p><div className="product-bottom"><strong>{money(product.price)}</strong><button className="icon-btn add-btn" onClick={() => onAdd(product)} disabled={product.stock < 1} aria-label="Add to cart"><Plus size={18}/></button></div><small>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</small></div>
  </article>;
}
function Home() {
  const [products, setProducts] = useState([]), [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(''), [category, setCategory] = useState(''), [sort, setSort] = useState('newest');
  const [notice, setNotice] = useState(''); const { user } = useAuth();
  const load = () => api(`/products?search=${encodeURIComponent(search)}&category=${category}&sort=${sort}`).then(d => setProducts(d.products)).catch(e => setNotice(e.message));
  useEffect(() => { api('/products/categories').then(d => setCategories(d.categories)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [search, category, sort]);
  const add = async p => {
    if (!user) return setNotice('Please log in to add items to your cart.');
    try { await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: p.id }) }); setNotice(`${p.name} added to your cart.`); }
    catch (e) { setNotice(e.message); }
  };
  return <main><section className="hero"><div className="wrap hero-content"><div className="eyebrow">THE EVERYDAY MARKETPLACE</div><h1>Find your next<br/><em>favourite thing.</em></h1><p>Good products, clear prices, and a smoother way to shop — all in one place.</p><a href="#catalogue" className="btn">Explore products <span>↗</span></a><div className="hero-note"><span className="dot"/> Curated picks for everyday living</div></div><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/></section>
    <section className="wrap catalogue" id="catalogue"><div className="section-heading"><div><div className="eyebrow">OUR COLLECTION</div><h2>Shop the catalogue</h2></div><span className="muted">{products.length} products</span></div>
      <div className="filters"><label className="search-box"><Search size={18}/><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}/></label><select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name">Name</option></select></div>
      <Notice message={notice}/><div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p} onAdd={add}/>)}</div>{!products.length && <div className="empty"><ShoppingBag size={34}/><h3>No products found</h3><p>Try changing your search or category filter.</p></div>}
    </section></main>;
}
function AuthPage({ mode }) {
  const { login, register, user } = useAuth(); const nav = useNavigate();
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (user) nav(user.role === 'admin' ? '/admin' : '/'); }, [user]);
  const submit = async e => { e.preventDefault(); setError(''); setBusy(true); try { mode === 'login' ? await login(email, password) : await register(name, email, password); nav('/'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <main className="auth-wrap"><form className="auth-card" onSubmit={submit}><div className="brand auth-brand"><span className="brand-icon"><ShoppingBag size={21}/></span>ShopEase</div><div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE COMMUNITY'}</div><h1>{mode === 'login' ? 'Sign in to shop.' : 'Create your account.'}</h1><p className="muted">{mode === 'login' ? 'Your next great find is just around the corner.' : 'A few details and you are ready to explore.'}</p><Notice message={error} error/>{mode === 'register' && <label>Full name<input required minLength="2" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength="8" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="btn full" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button><p className="auth-switch">{mode === 'login' ? "New to ShopEase? " : 'Already have an account? '}<Link to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p></form></main>;
}
function ProductDetail() {
  const { id } = useParams(); const [p, setP] = useState(null), [message, setMessage] = useState(''); const { user } = useAuth();
  useEffect(() => { api('/products').then(d => setP(d.products.find(x => String(x.id) === id))).catch(e => setMessage(e.message)); }, [id]);
  const add = async () => { if (!user) return setMessage('Please log in to add items to your cart.'); try { await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: p.id }) }); setMessage('Added to cart.'); } catch(e) { setMessage(e.message); } };
  if (!p) return <main className="wrap page"><Notice message={message}/><p>Loading product...</p></main>;
  return <main className="wrap page"><Link to="/" className="back-link">← Back to shop</Link><div className="detail"><img src={p.image_url} alt={p.name}/><div><div className="eyebrow">{p.category}</div><h1>{p.name}</h1><p className="detail-description">{p.description}</p><h2>{money(p.price)}</h2><p className="muted">{p.stock} available</p><button className="btn" onClick={add} disabled={!p.stock}>Add to cart</button><Notice message={message}/></div></div></main>;
}
function Cart() {
  const [items, setItems] = useState([]), [message, setMessage] = useState(''); const nav = useNavigate();
  const load = () => api('/cart').then(d => setItems(d.items)).catch(e => setMessage(e.message));
  useEffect(() => { load(); }, []);
  const update = async (id, quantity) => { try { await api(`/cart/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }); load(); } catch(e) { setMessage(e.message); } };
  const remove = async id => { await api(`/cart/${id}`, { method: 'DELETE' }); load(); };
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  return <main className="wrap page"><div className="eyebrow">YOUR SELECTION</div><h1>Shopping cart</h1><Notice message={message}/>{!items.length ? <div className="empty"><ShoppingCart size={36}/><h3>Your cart is waiting</h3><p>Explore the catalogue and add something you like.</p><Link className="btn" to="/">Start shopping</Link></div> : <div className="cart-layout"><div className="cart-list">{items.map(i => <div className="cart-row" key={i.product_id}><img src={i.image_url} alt={i.name}/><div className="cart-item-info"><h3>{i.name}</h3><strong>{money(i.price)}</strong><div className="quantity"><button onClick={() => update(i.product_id, i.quantity - 1)} disabled={i.quantity <= 1}><Minus size={14}/></button><span>{i.quantity}</span><button onClick={() => update(i.product_id, i.quantity + 1)}><Plus size={14}/></button><button className="remove" onClick={() => remove(i.product_id)}><Trash2 size={15}/> Remove</button></div></div><b>{money(Number(i.price) * i.quantity)}</b></div>)}</div><aside className="summary"><h3>Order summary</h3><div><span>Subtotal</span><b>{money(total)}</b></div><div><span>Delivery</span><b>Free</b></div><hr/><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><button className="btn full" onClick={() => nav('/checkout')}>Proceed to checkout</button><p className="muted tiny">Taxes, if applicable, are included in the displayed price.</p></aside></div>}</main>;
}
function Checkout() {
  const [address, setAddress] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false); const nav = useNavigate();
  const place = async e => { e.preventDefault(); setBusy(true); try { const d = await api('/orders', { method: 'POST', body: JSON.stringify({ shipping_address: address }) }); nav('/orders', { state: { success: `Order #${d.order_id} placed successfully.` } }); } catch(e) { setMessage(e.message); } finally { setBusy(false); } };
  return <main className="wrap page narrow"><div className="eyebrow">ALMOST THERE</div><h1>Checkout</h1><form className="panel form" onSubmit={place}><label>Shipping address<textarea required minLength="8" rows="4" value={address} onChange={e => setAddress(e.target.value)} placeholder="House number, street, city, state, PIN code"/></label><div className="payment-note"><strong>Payment method</strong><span>Cash on Delivery</span><small>Demo checkout — no online payment is processed.</small></div><Notice message={message} error/><button className="btn full" disabled={busy}>{busy ? 'Placing order...' : 'Place order'}</button></form></main>;
}
function Orders() {
  const [orders, setOrders] = useState([]), [error, setError] = useState(''); const location = useLocation();
  useEffect(() => { api('/orders/my').then(d => setOrders(d.orders)).catch(e => setError(e.message)); }, []);
  return <main className="wrap page"><div className="eyebrow">YOUR PURCHASES</div><h1>Order history</h1><Notice message={location.state?.success}/><Notice message={error} error/>{!orders.length ? <div className="empty"><Package size={36}/><h3>No orders yet</h3><p>Your placed orders will appear here.</p><Link to="/" className="btn">Explore products</Link></div> : <div className="orders">{orders.map(o => <article className="order-card" key={o.id}><div className="order-head"><div><small>ORDER #{o.id}</small><h3>{new Date(o.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</h3></div><span className={`status ${o.status.toLowerCase()}`}>{o.status}</span></div>{o.items?.map((i, n) => <div className="order-line" key={n}><span>{i.product_name} × {i.quantity}</span><b>{money(i.unit_price * i.quantity)}</b></div>)}<div className="order-total"><span>Total · {o.payment_method}</span><strong>{money(o.total_amount)}</strong></div><p className="muted tiny">Deliver to: {o.shipping_address}</p></article>)}</div>}</main>;
}
function Admin() {
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name:'', description:'', price:'', stock:'', image_url:'', category_id:'' });
  const [editing, setEditing] = useState(null), [message, setMessage] = useState(''); const [tab, setTab] = useState('products');
  const load = () => { api('/products/admin/all').then(d => setProducts(d.products)).catch(e => setMessage(e.message)); api('/orders/admin/all').then(d => setOrders(d.orders)).catch(e => setMessage(e.message)); api('/products/categories').then(d => setCategories(d.categories)); };
  useEffect(() => { load(); }, []);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const save = async e => { e.preventDefault(); try { await api(editing ? `/products/${editing}` : '/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) }); setMessage(editing ? 'Product updated.' : 'Product added.'); setForm({ name:'', description:'', price:'', stock:'', image_url:'', category_id:'' }); setEditing(null); load(); } catch(e) { setMessage(e.message); } };
  const edit = p => { setEditing(p.id); setForm({ name:p.name, description:p.description || '', price:p.price, stock:p.stock, image_url:p.image_url || '', category_id:p.category_id || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async id => { if (!confirm('Remove this product from the catalogue?')) return; try { await api(`/products/${id}`, { method:'DELETE' }); load(); } catch(e) { setMessage(e.message); } };
  const status = async (id, value) => { try { await api(`/orders/admin/${id}/status`, { method:'PATCH', body:JSON.stringify({ status:value }) }); load(); } catch(e) { setMessage(e.message); } };
  return <main className="wrap page"><div className="eyebrow">STORE MANAGEMENT</div><h1>Admin dashboard</h1><Notice message={message}/><div className="tabs"><button className={tab==='products'?'active':''} onClick={() => setTab('products')}>Products ({products.length})</button><button className={tab==='orders'?'active':''} onClick={() => setTab('orders')}>Orders ({orders.length})</button></div>
    {tab === 'products' ? <div className="admin-grid"><form className="panel form" onSubmit={save}><h3>{editing ? 'Edit product' : 'Add a product'}</h3><label>Product name<input name="name" required value={form.name} onChange={change}/></label><label>Description<textarea name="description" rows="3" value={form.description} onChange={change}/></label><div className="two-fields"><label>Price (₹)<input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={change}/></label><label>Stock<input name="stock" type="number" min="0" required value={form.stock} onChange={change}/></label></div><label>Image URL<input name="image_url" type="url" value={form.image_url} onChange={change} placeholder="https://..."/></label><label>Category<select name="category_id" value={form.category_id} onChange={change}><option value="">Uncategorised</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="btn full">{editing ? 'Save changes' : 'Add product'}</button>{editing && <button type="button" className="btn btn-light full" onClick={() => { setEditing(null); setForm({ name:'', description:'', price:'', stock:'', image_url:'', category_id:'' }); }}>Cancel edit</button>}</form><div className="admin-products">{products.map(p => <div className="admin-product" key={p.id}><img src={p.image_url || 'https://placehold.co/100'} alt=""/><div><b>{p.name}</b><small>{money(p.price)} · Stock {p.stock}</small></div><button className="text-btn" onClick={() => edit(p)}>Edit</button><button className="text-btn danger-text" onClick={() => remove(p.id)}>Remove</button></div>)}</div></div> : <div className="orders">{orders.map(o => <article className="order-card" key={o.id}><div className="order-head"><div><small>ORDER #{o.id} · {o.customer_name} ({o.customer_email})</small><h3>{money(o.total_amount)}</h3></div><select value={o.status} onChange={e => status(o.id, e.target.value)}>{['Placed','Processing','Shipped','Delivered','Cancelled'].map(s => <option key={s}>{s}</option>)}</select></div><p className="muted tiny">{o.shipping_address}</p></article>)}</div>}
  </main>;
}
function Protected({ children, admin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="wrap page">Loading...</main>;
  if (!user) return <Navigate to="/login" replace/>;
  if (admin && user.role !== 'admin') return <main className="wrap page"><h2>Access denied</h2><p>Administrator access is required.</p></main>;
  return children;
}
import { useParams, useLocation, Navigate } from 'react-router-dom';
function App() {
  return <AuthProvider><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="/product/:id" element={<ProductDetail/>}/><Route path="/cart" element={<Protected><Cart/></Protected>}/><Route path="/checkout" element={<Protected><Checkout/></Protected>}/><Route path="/orders" element={<Protected><Orders/></Protected>}/><Route path="/admin" element={<Protected admin><Admin/></Protected>}/><Route path="*" element={<main className="wrap page"><h1>Page not found</h1><Link to="/">Return to shop</Link></main>}/></Routes></Layout></AuthProvider>;
}
export default App;
