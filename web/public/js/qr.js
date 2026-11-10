/** Davet QR kodunu tarayıcıda üretir (token üçüncü taraf bir QR servisine gönderilmez). */
window.ODropQR = function (text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(6, 2);
};
