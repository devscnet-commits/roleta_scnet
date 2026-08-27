export default function QrTab({ campaign }) {
  const url = `${window.location.origin}/c/${campaign.slug}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;

  return (
    <div className="admin-card" style={{ textAlign: 'center', maxWidth: 360 }}>
      <h3>QR Code da campanha</h3>
      <p style={{ fontSize: 13, color: '#555' }}>Imprima este QR Code no material do estande. Ele leva direto ao formulário de participação.</p>
      <img src={qrImage} alt="QR code" style={{ width: 260, height: 260 }} />
      <p style={{ wordBreak: 'break-all', fontSize: 13 }}>{url}</p>
      <button className="btn secondary" onClick={() => navigator.clipboard.writeText(url)}>Copiar link</button>
    </div>
  );
}
