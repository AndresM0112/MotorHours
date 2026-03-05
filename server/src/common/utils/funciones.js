import bcrypt from "bcrypt";

export const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        reject(err);
      }

      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err);
        }

        resolve(hash);
      });
    });
  });
};

export const comparePassword = (password, hash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, isMatch) => {
      if (err) {
        reject(err);
      }
      resolve(isMatch);
    });
  });
};

export const removeAccents = (chain) => {
  const acentos = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    Á: "A",
    É: "E",
    Í: "I",
    Ó: "O",
    Ú: "U",
    "&": "Y",
    ñ: "n",
    Ñ: "N",
  };
  return chain
    ? chain
        .split("")
        .map((letter) => acentos[letter] || letter)
        .join("")
        .toString()
        .replace(/[$.]/g, "")
        .trim()
    : "";
};

export const convertTextUppercase = (text) => {
  return text.toUpperCase();
};

export const convertTextLowercase = (text) => {
  return text.toLowerCase();
};

export const esNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor);
