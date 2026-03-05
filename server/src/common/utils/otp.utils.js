export const generarCodigoOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
};
