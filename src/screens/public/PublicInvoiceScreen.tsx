import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Calendar, User, Printer, Share2, ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Bill, Shop } from '../../types/models';
import { billingService } from '../../services/billingService';
import { webWhatsappService } from '../../services/webWhatsappService';

export const PublicInvoiceScreen: React.FC = () => {
  const { billId } = useParams<{ billId: string }>();
  const [searchParams] = useSearchParams();
  const shouldAutoPrint = searchParams.get('print') === 'true';

  const [bill, setBill] = useState<Bill | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBill = async () => {
      if (!billId) {
        setError('No invoice identifier provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await billingService.getPublicBill(billId);
        if (!isMounted) return;

        if (result && result.bill) {
          setBill(result.bill);
          if (result.shop) {
            setShop(result.shop);
          }
        } else {
          setError('Receipt not found. It may have been archived or removed.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Unable to load invoice details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBill();

    return () => {
      isMounted = false;
    };
  }, [billId]);

  useEffect(() => {
    if (!loading && bill && shouldAutoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, bill, shouldAutoPrint]);

  const formatCurrency = (amt: number = 0) =>
    `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const isFullyPending =
    bill?.paymentMode === 'Pending' ||
    ((bill?.paidAmount === 0 || bill?.paidAmount === undefined) &&
      (bill?.pendingAmount || 0) > 0 &&
      (bill?.totalAmount || 0) > 0);

  const isPartiallyPaid =
    !isFullyPending &&
    (bill?.paymentMode === 'Partial Pay' ||
      ((bill?.paidAmount || 0) > 0 && (bill?.pendingAmount || 0) > 0));

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#FF5F00',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }}>Loading Official Receipt...</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Connecting to Counter365 Cloud</div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            Receipt Unavailable
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
            {error || 'The requested receipt could not be loaded.'}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#111827',
              color: '#FFFFFF',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  const shopName = shop?.name || 'Counter 365 Store';
  const shopPhone = shop?.phone || '+91 98765 43210';
  const shopAddress = [shop?.address, shop?.city, shop?.state, shop?.pincode].filter(Boolean).join(', ') || 'Kalugumalai, Tamil Nadu';
  const displayBillNumber = bill.billNumber ? bill.billNumber.replace(/^#/, '') : '0001';
  const customerName = bill.customerName && bill.customerName.trim() !== 'Not tracked' ? bill.customerName : 'Valued Customer';
  const customerPhone = bill.customerPhone || '+91 98765 43210';

  return (
    <div className="public-invoice-page" style={{
      minHeight: '100vh',
      background: '#F4F5F7',
      padding: '24px 16px 48px',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#111827',
    }}>
      {/* Print CSS Styles */}
      <style>{`
        @media print {
          body {
            background: #FFFFFF !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .public-invoice-page {
            background: #FFFFFF !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt-paper-card {
            box-shadow: none !important;
            border: none !important;
            padding: 12mm 16mm !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Top Floating Action Bar (Hidden in Print) */}
      <div className="no-print" style={{
        maxWidth: '580px',
        margin: '0 auto 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <a
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#4B5563',
            textDecoration: 'none',
            background: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}
        >
          <ArrowLeft size={15} /> Dashboard
        </a>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: '#FF5F00',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(255, 95, 0, 0.25)',
            }}
          >
            <Printer size={15} /> Print / Save PDF
          </button>

          <button
            type="button"
            onClick={() => {
              webWhatsappService.shareCustomerBill(
                bill,
                shopName,
                shop?.upiId,
                shop?.phone,
                bill.customerPhone || undefined
              );
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              background: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
            }}
          >
            <Share2 size={15} /> WhatsApp
          </button>
        </div>
      </div>

      {/* Main Receipt Container (Matches Exact Design Template) */}
      <div className="receipt-paper-card" style={{
        maxWidth: '580px',
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '36px 36px 40px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        border: '1px solid #E5E7EB',
      }}>
        {/* 1. Header Bar: Merchant Logo (Left) vs RECEIPT (Right) */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Merchant Logo Box */}
          <div style={{
            background: '#EDF1F5',
            borderRadius: '8px',
            padding: '10px 22px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '130px',
          }}>
            {shop?.logoUrl ? (
              <img
                src={shop.logoUrl}
                alt={shopName}
                style={{
                  maxHeight: '38px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                color: '#4B5565',
                textAlign: 'center',
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}>
                MERCHANT<br />LOGO
              </span>
            )}
          </div>

          {/* Receipt Label with Orange Underline */}
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#111827',
              textTransform: 'uppercase',
            }}>
              RECEIPT
            </span>
            <div style={{
              width: '42px',
              height: '3.5px',
              background: '#FF5F00',
              borderRadius: '2px',
              marginTop: '4px',
              marginLeft: 'auto',
            }} />
          </div>
        </div>

        {/* 2. Shop Details */}
        <div style={{ marginTop: '24px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 8px',
            letterSpacing: '-0.3px',
          }}>
            {shopName}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#4B5563',
            fontSize: '13.5px',
            marginBottom: '4px',
          }}>
            <MapPin size={16} style={{ color: '#4B5563', flexShrink: 0 }} />
            <span>{shopAddress}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#4B5563',
            fontSize: '13.5px',
          }}>
            <Phone size={16} style={{ color: '#4B5563', flexShrink: 0 }} />
            <span>{shopPhone}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#E5E7EB', margin: '22px 0' }} />

        {/* 3. Metadata Bar (2 Columns: Bill Number vs Date & Time) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1px 1.2fr',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Bill Number */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '3px',
            }}>
              BILL NUMBER
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.2px',
            }}>
              Bill #{displayBillNumber}
            </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ height: '36px', background: '#E5E7EB' }} />

          {/* Date & Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={22} style={{ color: '#111827', flexShrink: 0 }} />
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '3px',
              }}>
                DATE & TIME
              </div>
              <div style={{
                fontSize: '14.5px',
                fontWeight: 700,
                color: '#111827',
              }}>
                {formatDate(bill.completedAt || bill.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#E5E7EB', margin: '22px 0' }} />

        {/* 4. Billed To Section */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '24px' }}>
          <User size={24} style={{ color: '#111827', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '3px',
            }}>
              BILLED TO
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#111827',
            }}>
              {customerName}
            </div>
            <div style={{
              fontSize: '13.5px',
              color: '#6B7280',
              marginTop: '1px',
            }}>
              {customerPhone}
            </div>
            {bill.tableNumber && (
              <span style={{
                display: 'inline-block',
                marginTop: '6px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#F3F4F6',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#374151',
              }}>
                Table #{bill.tableNumber} · Dine-in
              </span>
            )}
          </div>
        </div>

        {/* 5. Items Table */}
        <div style={{ marginBottom: '16px' }}>
          {/* Header Row */}
          <div style={{
            display: 'flex',
            background: '#F8F9FA',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#4B5563',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            <div style={{ flex: 1 }}>ITEM</div>
            <div style={{ width: '48px', textAlign: 'center' }}>QTY</div>
            <div style={{ width: '80px', textAlign: 'right' }}>PRICE</div>
            <div style={{ width: '85px', textAlign: 'right' }}>TOTAL</div>
          </div>

          {/* Item Rows */}
          {bill.items && bill.items.length > 0 ? (
            bill.items.map((it, idx) => {
              const baseName = (it.itemName || 'Item').replace(/\s*\((?:half|full)\)/gi, '').trim();
              const isHalf = (it as any).isHalf;
              return (
                <div
                  key={it.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '13px 14px',
                    borderBottom: '1px solid #F3F4F6',
                    fontSize: '14px',
                  }}
                >
                  <div style={{ flex: 1, fontWeight: 700, color: '#111827' }}>
                    {baseName}
                    {isHalf && (
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280', marginLeft: '4px' }}>
                        (Half)
                      </span>
                    )}
                  </div>
                  <div style={{ width: '48px', textAlign: 'center', color: '#111827', fontWeight: 500 }}>
                    {it.quantity}
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', color: '#111827', fontWeight: 500 }}>
                    {formatCurrency(it.unitPrice)}
                  </div>
                  <div style={{ width: '85px', textAlign: 'right', color: '#111827', fontWeight: 700 }}>
                    {formatCurrency(it.lineTotal)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '13px 14px',
              borderBottom: '1px solid #F3F4F6',
              fontSize: '14px',
            }}>
              <div style={{ flex: 1, fontWeight: 700, color: '#111827' }}>Invoice Charges</div>
              <div style={{ width: '48px', textAlign: 'center' }}>1</div>
              <div style={{ width: '80px', textAlign: 'right' }}>{formatCurrency(bill.totalAmount)}</div>
              <div style={{ width: '85px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(bill.totalAmount)}</div>
            </div>
          )}
        </div>

        {/* 6. Subtotal Breakdown */}
        <div style={{ padding: '0 14px', marginBottom: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0',
            fontSize: '14px',
          }}>
            <span style={{ color: '#111827', fontWeight: 600 }}>Subtotal</span>
            <span style={{ color: '#111827', fontWeight: 700 }}>{formatCurrency(bill.subtotal || bill.totalAmount)}</span>
          </div>

          {/* Discount if present */}
          {bill.discountAmount && bill.discountAmount > 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              fontSize: '13.5px',
              color: '#16A34A',
            }}>
              <span>Discount ({bill.discountType === 'percentage' ? `${bill.discountValue}%` : 'Flat'})</span>
              <span style={{ fontWeight: 600 }}>-{formatCurrency(bill.discountAmount)}</span>
            </div>
          ) : null}

          {/* GST Tax if present */}
          {bill.gstAmount && bill.gstAmount > 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              fontSize: '13.5px',
              color: '#4B5563',
            }}>
              <span>GST ({bill.gstRate || 5}%)</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>+{formatCurrency(bill.gstAmount)}</span>
            </div>
          ) : null}
        </div>

        {/* 7. GRAND TOTAL Bar (Bold Orange Accent Line) */}
        <div style={{
          borderTop: '3.5px solid #FF5F00',
          padding: '16px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '17px',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            GRAND TOTAL
          </span>
          <span style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.4px',
          }}>
            {formatCurrency(bill.totalAmount)}
          </span>
        </div>

        {/* 8. Payment Status Card (PAID / PARTIALLY PAID / PENDING) */}
        {isFullyPending ? (
          <div style={{
            marginTop: '16px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#EF4444',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}>
                <Clock size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#DC2626',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  marginBottom: '1px',
                }}>
                  PENDING / CREDIT
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Balance Due: {formatCurrency(bill.pendingAmount || bill.totalAmount)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>
              {formatCurrency(bill.pendingAmount || bill.totalAmount)}
            </div>
          </div>
        ) : isPartiallyPaid ? (
          <div style={{
            marginTop: '16px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#F59E0B',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#D97706',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  marginBottom: '1px',
                }}>
                  PARTIALLY PAID
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Paid: {formatCurrency(bill.paidAmount)} · Due: {formatCurrency(bill.pendingAmount)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>
              {formatCurrency(bill.paidAmount)}
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: '16px',
            background: '#FFF6F0',
            border: '1px solid #FFE7D6',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#FF5F00',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#FF5F00',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  marginBottom: '1px',
                }}>
                  PAID
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#111827' }}>
                  Paid via {bill.paymentMode || 'Cash'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#111827' }}>
              {formatCurrency(bill.totalAmount)}
            </div>
          </div>
        )}

        {/* 9. Dynamic Edit Audit Notice (If bill was edited) */}
        {bill.isEdited && (
          <div style={{
            marginTop: '14px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#FFFBEB',
            border: '1px solid #FEF08A',
            fontSize: '12px',
            color: '#B45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}>
            <span>✏️</span>
            <span>
              Invoice updated on {formatDate(bill.editedAt)}
              {bill.editedByName ? ` by ${bill.editedByName}` : ''}
            </span>
          </div>
        )}

        {/* 10. Footer Section */}
        <div style={{ marginTop: '36px', textAlign: 'center' }}>
          {/* Centered Thank You with Dividers */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
            <span style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.1px',
            }}>
              Thank you for your business!
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          </div>

          {/* Official Counter365 Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}>
            <img
              src="/favicon.png"
              alt="Counter365"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.4px', color: '#111827' }}>
              Counter<span style={{ color: '#FF5F00' }}>365</span>
            </span>
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: '11px',
            color: '#9CA3AF',
            letterSpacing: '0.2px',
          }}>
            Generated via Counter365 Point of Sale · Official Receipt Copy
          </div>
        </div>
      </div>
    </div>
  );
};
