import { useState } from 'react';

export default function QrTab({ campaign }) {
  const [downloading, setDownloading] = useState(false);
  const url = `${window.location.origin}/c/${campaign.slug}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
  const qrImagePrint = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=20&data=${encodeURIComponent(url)}`;

  async function downloadQr() {
    setDownloading(true);
    try {
      const res = await fetch(qrImagePrint);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `qrcode-${campaign.slug}.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(qrImagePrint, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="admin-card" style={{ textAlign: 'center', maxWidth: 360 }}>
      <h3>QR Code da campanha</h3>
      <p style={{ fontSize: 13, color: '#555' }}>Imprima este QR Code no material do estande. Ele leva direto ao formulário de participação.</p>
      <img src={qrImage} alt="QR code" style={{ width: 260, height: 260 }} />
      <p style={{ wordBreak: 'break-all', fontSize: 13 }}>{url}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={downloadQr} disabled={downloading}>
          {downloading ? 'Baixando...' : 'Baixar QR Code (alta resolução)'}
        </button>
        <button className="btn secondary" onClick={() => navigator.clipboard.writeText(url)}>Copiar link</button>
      </div>
    </div>
  );
}
