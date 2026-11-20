import React, { useState } from 'react';
import {
  Bell,
  ChefHat,
  Globe,
  LayoutDashboard,
  Moon,
  Package,
  ShoppingBag,
  Sun,
  Tag,
} from 'lucide-react';
import {
  COMMON_STRINGS,
  ORDER_STATUS_META,
  PALETTE,
  type SupportedLocale,
  type ThemeMode,
} from '@zestroute/shared';
import {
  BottomNav,
  BottomSheet,
  CategoryCard,
  ConfirmationDialog,
  DataTable,
  DatePicker,
  DiscountBadge,
  Dropdown,
  EmptyState,
  ErrorState,
  FoodCard,
  IconButton,
  ImageUploader,
  InputField,
  LoadingSkeleton,
  Modal,
  Pagination,
  PrimaryButton,
  ProductDetailCard,
  RestaurantCard,
  SearchBar,
  SecondaryButton,
  Sidebar,
  StatusBadge,
  Tabs,
  TopNav,
  useToast,
  type NavItem,
} from '../components/ui';

export const DesignSystemPreview: React.FC<{
  theme: ThemeMode;
  onToggleTheme: () => void;
  locale: SupportedLocale;
  onToggleLocale: () => void;
}> = ({ theme, onToggleTheme, locale, onToggleLocale }) => {
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [search, setSearch] = useState('');
  const [dropdownVal, setDropdownVal] = useState('all');
  const [dateVal, setDateVal] = useState('2026-11-18');
  const [activeTab, setActiveTab] = useState('tokens');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | undefined>(undefined);

  const strings = COMMON_STRINGS[locale];

  const navItems: NavItem[] = [
    { key: 'overview', label: locale === 'ur' ? 'جائزہ' : 'Design Tokens', icon: <LayoutDashboard size={18} /> },
    { key: 'orders', label: locale === 'ur' ? 'آرڈرز' : 'Orders', icon: <ShoppingBag size={18} />, badge: 4 },
    { key: 'menu', label: locale === 'ur' ? 'مینو' : 'Menu', icon: <ChefHat size={18} /> },
    { key: 'inventory', label: locale === 'ur' ? 'انوینٹری' : 'Inventory', icon: <Package size={18} /> },
    { key: 'promos', label: locale === 'ur' ? 'پروموشنز' : 'Promotions', icon: <Tag size={18} /> },
  ];

  const sampleSwatches = [
    { name: 'Primary Orange', hex: PALETTE.orange },
    { name: 'Deep Orange', hex: PALETTE.deepOrange },
    { name: 'Warm Yellow', hex: PALETTE.warmYellow },
    { name: 'Warm Cream', hex: PALETTE.warmCream },
    { name: 'Success', hex: PALETTE.success },
    { name: 'Warning', hex: PALETTE.warning },
    { name: 'Error', hex: PALETTE.error },
    { name: 'Info', hex: PALETTE.info },
  ];

  const sampleRows = [
    { id: 'ORD-1042', item: 'Zinger Crunch Burger (Large)', amount: 'Rs. 610', status: 'preparing' as const },
    { id: 'ORD-1041', item: 'Chicken Tikka Pizza (Medium)', amount: 'Rs. 1,450', status: 'on_the_way' as const },
    { id: 'ORD-1040', item: 'Beef Bihari Kabab Platter', amount: 'Rs. 1,180', status: 'delivered' as const },
  ];

  return (
    <div className="zr-shell">
      <Sidebar
        items={navItems}
        activeKey={activeNav}
        onSelect={setActiveNav}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="zr-main">
        <TopNav
          title={`${strings.brandName} — UI/UX Design System`}
          subtitle={strings.brandTagline}
          actions={
            <>
              <SecondaryButton
                onClick={onToggleLocale}
                leftIcon={<Globe size={16} />}
              >
                {locale === 'en' ? 'اردو (RTL)' : 'English (LTR)'}
              </SecondaryButton>
              <IconButton
                icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                label="Toggle theme"
                onClick={onToggleTheme}
              />
              <IconButton
                icon={<Bell size={18} />}
                label="Trigger sample toast"
                onClick={() => showToast('Design system toast notification working!', 'success')}
              />
            </>
          }
        />

        <main style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <Tabs
            items={[
              { key: 'tokens', label: 'Colors & Typography' },
              { key: 'inputs', label: 'Buttons & Inputs' },
              { key: 'cards', label: 'Food & Restaurant Cards', badgeCount: 4 },
              { key: 'states', label: 'Tables, Overlays & States' },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'tokens' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="zr-card" style={{ padding: 20 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 19 }}>Color Palette (Section 5.2)</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {sampleSwatches.map((s) => (
                    <div key={s.name} className="zr-card" style={{ padding: 10 }}>
                      <div style={{ height: 48, borderRadius: 8, backgroundColor: s.hex, border: '1px solid var(--zr-border)', marginBottom: 8 }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--zr-text-secondary)' }}>{s.hex}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="zr-card" style={{ padding: 20 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 19 }}>Semantic Order Status Badges</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(ORDER_STATUS_META).map(([key, meta]) => (
                    <StatusBadge
                      key={key}
                      label={locale === 'ur' ? meta.labelUr : meta.labelEn}
                      tone={meta.tone}
                    />
                  ))}
                  <DiscountBadge text="25% OFF" />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'inputs' && (
            <section className="zr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <PrimaryButton onClick={() => showToast('Primary action clicked', 'success')}>
                  Primary Button
                </PrimaryButton>
                <SecondaryButton onClick={() => showToast('Secondary action clicked', 'info')}>
                  Secondary Button
                </SecondaryButton>
                <PrimaryButton loading>Loading State</PrimaryButton>
                <PrimaryButton disabled>Disabled</PrimaryButton>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <SearchBar value={search} onChange={setSearch} placeholder={strings.searchPlaceholder} />
                <InputField label="Restaurant Name" placeholder="e.g., Spice Courtyard" helperText="Visible to customers" />
                <InputField label="Validation Error" placeholder="Invalid value" error="Minimum order must be Rs. 200 or more" />
                <Dropdown
                  label="Cuisine Filter"
                  value={dropdownVal}
                  onChange={setDropdownVal}
                  options={[
                    { label: 'All Cuisines', value: 'all' },
                    { label: 'Burgers & Fast Food', value: 'burgers' },
                    { label: 'Biryani & Desi', value: 'biryani' },
                  ]}
                />
                <DatePicker label="Report Date" value={dateVal} onChange={setDateVal} />
              </div>

              <ImageUploader
                label="Food Product Photo"
                previewUrl={previewImg}
                onFileSelected={(file) => setPreviewImg(URL.createObjectURL(file))}
              />
            </section>
          )}

          {activeTab === 'cards' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {['Burgers', 'Pizza', 'Biryani', 'BBQ', 'Desserts', 'Drinks'].map((cat, idx) => (
                  <CategoryCard
                    key={cat}
                    selected={idx === 0}
                    category={{ id: String(idx), name: cat }}
                  />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <RestaurantCard
                  restaurant={{
                    id: 'r1',
                    name: 'Sample Layout: Charcoal Grill',
                    cuisineLabel: 'BBQ • Biryani • Karahi',
                    rating: 4.8,
                    ratingCount: 320,
                    deliveryTimeLabel: '25-35 mins',
                    deliveryFeeMinor: 0,
                    minOrderMinor: 40000,
                    isOpen: true,
                    discountBadgeText: '20% OFF',
                  }}
                />
                <FoodCard
                  food={{
                    id: 'f1',
                    restaurantId: 'r1',
                    name: 'Signature Zinger Burger',
                    description: 'Crispy thigh fillet, cheddar cheese, chipotle mayo',
                    regularPriceMinor: 65000,
                    discountPriceMinor: 52000,
                    isAvailable: true,
                    discountBadgeText: '20% OFF',
                  }}
                  onAdd={() => showToast('Added to cart preview', 'success')}
                />
              </div>

              <ProductDetailCard
                food={{
                  id: 'f2',
                  restaurantId: 'r1',
                  restaurantName: 'Sample Layout: Charcoal Grill',
                  name: 'Double Smash Cheese Burger',
                  description: 'Two seared beef patties with caramelized onions and house sauce.',
                  regularPriceMinor: 78000,
                  isAvailable: true,
                }}
                ingredients={['Beef Patty', 'Cheddar', 'Brioche Bun', 'House Sauce']}
                onAddToCart={() => showToast('Product detail CTA clicked', 'success')}
              />
            </section>
          )}

          {activeTab === 'states' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <PrimaryButton onClick={() => setModalOpen(true)}>Open Modal</PrimaryButton>
                <SecondaryButton onClick={() => setConfirmOpen(true)}>Open Confirmation</SecondaryButton>
                <SecondaryButton onClick={() => setSheetOpen(true)}>Open Bottom Sheet</SecondaryButton>
              </div>

              <DataTable
                columns={[
                  { key: 'id', header: 'Order #', render: (r) => <strong>{r.id}</strong> },
                  { key: 'item', header: 'Item Summary', render: (r) => r.item },
                  { key: 'amount', header: 'Total', render: (r) => r.amount },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <StatusBadge
                        label={ORDER_STATUS_META[r.status].labelEn}
                        tone={ORDER_STATUS_META[r.status].tone}
                      />
                    ),
                  },
                ]}
                data={sampleRows}
                rowKey={(r) => r.id}
              />

              <Pagination page={page} totalPages={5} onPageChange={setPage} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div className="zr-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>Loading Skeleton</h3>
                  <LoadingSkeleton height={20} width="70%" />
                  <LoadingSkeleton height={14} width="95%" />
                  <LoadingSkeleton height={14} width="55%" />
                </div>
                <EmptyState
                  title={strings.noResults}
                  description="No orders match the selected filter yet."
                  actionLabel="Reset Filters"
                  onAction={() => showToast('Filters reset', 'info')}
                />
                <ErrorState
                  message="Unable to reach the server. Please check your connection."
                  onRetry={() => showToast('Retrying request...', 'info')}
                />
              </div>
            </section>
          )}
        </main>

        <BottomNav items={navItems} activeKey={activeNav} onSelect={setActiveNav} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Sample Modal Dialog">
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Consistent border radius, subtle shadow, and accessible close action.
        </p>
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        title="Replace Existing Cart?"
        message="Your cart contains items from another restaurant. Replace it with this restaurant's items?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          showToast('Confirmed action!', 'success');
        }}
      />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter Options">
        <p style={{ margin: 0, color: 'var(--zr-text-secondary)' }}>
          Responsive bottom sheet for filters, customizations, and quick actions.
        </p>
      </BottomSheet>
    </div>
  );
};
