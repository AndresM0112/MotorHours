function cleanText(texto, formato = "original") {
    if (typeof texto !== "string") return texto;
    let textoLimpio = texto.trim().replace(/\s+/g, " ");
    if (formato === "mayus") textoLimpio = textoLimpio.toUpperCase();
    if (formato === "minus") textoLimpio = textoLimpio.toLowerCase();
    return textoLimpio;
}
