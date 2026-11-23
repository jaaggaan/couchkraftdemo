function fmt(n: number) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

export function DemoInvoice({ order, onClose }: { order: any; onClose?: () => void }) {
  const items = Array.isArray(order.items) ? order.items : []
  const contact = order.contact || {}
  const address = order.address || order.shippingAddress || {}

  return (
    <div
      className="demo-invoice"
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 28,
        maxWidth: 720,
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {onClose && (
        <button type="button" onClick={onClose} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontSize: 22 }} aria-label="Close">
          ×
        </button>
      )}
      <header style={{ borderBottom: '2px solid #835022', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Playfair Display', fontSize: 28, color: '#835022', fontWeight: 700 }}>COUCHKRAFT</div>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6b6b' }}>Demo tax invoice</div>
      </header>
      <p style={{ fontSize: 12, color: '#92400e', marginBottom: 16 }}>
        Demo document only — not a legal GST invoice. Production format will be confirmed later.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <strong>Bill to</strong>
          <div>{contact.name || address.name || 'Customer'}</div>
          <div>{contact.email || ''}</div>
          <div>{contact.phone || address.phone || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>
            <strong>Invoice #</strong> {order.number}
          </div>
          <div>
            <strong>Placed</strong>{' '}
            {new Date(order.createdAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          {order.trackingNumber ? (
            <div>
              <strong>Tracking</strong> {order.trackingNumber}
            </div>
          ) : null}
          <div>
            <strong>Payment</strong> {String(order.paymentStatus || 'pending').toUpperCase()}
          </div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e0d5', textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>
            <th style={{ padding: '8px 4px' }}>Item</th>
            <th style={{ padding: '8px 4px' }}>Qty</th>
            <th style={{ padding: '8px 4px' }}>Rate</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0eae1' }}>
              <td style={{ padding: '10px 4px' }}>{it.name || 'Piece'}</td>
              <td style={{ padding: '10px 4px' }}>{it.quantity}</td>
              <td style={{ padding: '10px 4px' }}>{fmt(Number(it.unitPrice) || 0)}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                {fmt((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginLeft: 'auto', width: 240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>Subtotal</span>
          <span>{fmt(order.subtotal || order.total)}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#15803d' }}>
            <span>Discount {order.coupon ? `(${order.coupon})` : ''}</span>
            <span>−{fmt(order.discount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '2px solid #835022', fontWeight: 700, fontSize: 15 }}>
          <span>Total</span>
          <span>{fmt(order.total)}</span>
        </div>
      </div>
      <p style={{ marginTop: 24, fontSize: 11, color: '#6b6b6b' }}>
        Ship to: {[address.line1, address.city, address.postalCode].filter(Boolean).join(', ') || 'As per order'}
      </p>
    </div>
  )
}