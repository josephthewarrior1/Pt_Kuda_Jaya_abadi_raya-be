const nodemailer = require('nodemailer');

// ─── Lazy Transporter ─────────────────────────────────────────────────────────
const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    }
  });
};

// ─── Helper: hitung hari tersisa ─────────────────────────────────────────────
const getDaysLeft = (dueDateStr) => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

// ─── Template HTML Email ─────────────────────────────────────────────────────
const buildEmailHTML = ({ agentName, expiringSoon, expiredItems, type = 'vehicle' }) => {
  const isVehicle = type === 'vehicle';
  const accentColor = isVehicle ? '#4F6EF7' : '#7c3aed';
  const typeLabel = isVehicle ? 'Kendaraan' : 'Properti';

  const renderSoonRow = (item) => {
    const daysLeft = isVehicle
      ? getDaysLeft(item.carData?.dueDate)
      : getDaysLeft(item.insuranceData?.endDate);

    const title = isVehicle
      ? `${item.name} — ${item.carData?.carBrand || ''} ${item.carData?.carModel || ''}`
      : `${item.ownerName} — ${item.propertyData?.propertyType || ''} ${item.propertyData?.city ? '· ' + item.propertyData.city : ''}`;

    const detail = isVehicle
      ? `Plat: ${item.carData?.plateNumber || '—'}`
      : `Alamat: ${item.propertyData?.address || '—'}`;

    const dueStr = isVehicle
      ? new Date(item.carData?.dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date(item.insuranceData?.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    return `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9;">
          <strong style="color:#0f172a;font-size:14px;">${title}</strong><br>
          <span style="color:#64748b;font-size:12px;">${detail}</span>
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; text-align:center;">
          <span style="background:#fef3c7;color:#d97706;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">
            ${daysLeft === 0 ? 'Hari Ini!' : daysLeft + ' hari lagi'}
          </span>
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; color:#64748b; font-size:13px;">${dueStr}</td>
      </tr>
    `;
  };

  const renderExpiredRow = (item) => {
    const title = isVehicle
      ? `${item.name} — ${item.carData?.carBrand || ''} ${item.carData?.carModel || ''}`
      : `${item.ownerName} — ${item.propertyData?.propertyType || ''}`;

    const detail = isVehicle
      ? `Plat: ${item.carData?.plateNumber || '—'}`
      : `${item.propertyData?.city || '—'}`;

    return `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9;">
          <strong style="color:#0f172a;font-size:14px;">${title}</strong><br>
          <span style="color:#64748b;font-size:12px;">${detail}</span>
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; text-align:center;">
          <span style="background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">
            Expired
          </span>
        </td>
      </tr>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:${accentColor};border-radius:16px 16px 0 0;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
        🔔 Reminder Polis ${typeLabel}
      </h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">
        Laporan harian otomatis — ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
      </p>
    </div>

    <!-- Body -->
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 32px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

      <p style="color:#334155;font-size:15px;margin:0 0 24px;">
        Halo <strong>${agentName}</strong>, berikut ringkasan status polis ${typeLabel.toLowerCase()} nasabah Anda hari ini:
      </p>

      ${expiringSoon.length > 0 ? `
      <!-- Segera Jatuh Tempo -->
      <div style="margin-bottom:28px;">
        <h2 style="font-size:16px;color:#d97706;margin:0 0 12px;">
          ⚠️ Segera Jatuh Tempo (${expiringSoon.length})
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#fffbeb;">
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Nasabah</th>
              <th style="padding:10px 16px;text-align:center;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Sisa</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Tanggal Habis</th>
            </tr>
          </thead>
          <tbody>
            ${expiringSoon.map(renderSoonRow).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${expiredItems.length > 0 ? `
      <!-- Sudah Expired -->
      <div style="margin-bottom:28px;">
        <h2 style="font-size:16px;color:#dc2626;margin:0 0 12px;">
          ❌ Sudah Expired (${expiredItems.length})
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #f1f5f9;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#fef2f2;">
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:0.05em;">Nasabah</th>
              <th style="padding:10px 16px;text-align:center;font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${expiredItems.map(renderExpiredRow).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${expiringSoon.length === 0 && expiredItems.length === 0 ? `
      <div style="text-align:center;padding:32px;background:#f0fdf4;border-radius:12px;">
        <p style="font-size:32px;margin:0 0 8px;">🎉</p>
        <p style="color:#16a34a;font-weight:700;font-size:16px;margin:0;">Semua polis ${typeLabel.toLowerCase()} aktif!</p>
        <p style="color:#64748b;font-size:13px;margin:6px 0 0;">Tidak ada polis yang expired atau akan segera habis.</p>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="border-top:1px solid #f1f5f9;margin-top:24px;padding-top:20px;">
        <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
          Email ini dikirim otomatis oleh sistem manajemen asuransi Anda.<br>
          Masuk ke dashboard untuk melihat detail dan mengambil tindakan.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// ─── Send reminder email ──────────────────────────────────────────────────────
const sendReminderEmail = async ({ to, agentName, expiringSoon, expiredItems, type }) => {
  const transporter = getTransporter(); // ← lazy, dibuat tiap kali kirim

  const typeLabel = type === 'vehicle' ? 'Kendaraan' : 'Properti';
  const totalIssues = expiringSoon.length + expiredItems.length;

  const subject = totalIssues > 0
    ? `⚠️ [Reminder] ${totalIssues} Polis ${typeLabel} Perlu Perhatian — ${new Date().toLocaleDateString('id-ID')}`
    : `✅ Semua Polis ${typeLabel} Aman — ${new Date().toLocaleDateString('id-ID')}`;

  const html = buildEmailHTML({ agentName, expiringSoon, expiredItems, type });

  await transporter.sendMail({
    from: `"Sistem Asuransi" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`✅ Reminder email (${type}) sent to: ${to}`);
};

module.exports = { sendReminderEmail, getDaysLeft };