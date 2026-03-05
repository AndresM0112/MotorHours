const transforms = {
  toLower: (v) => (typeof v === "string" ? v.toLowerCase() : v),
  onlyDigits: (v) => (typeof v === "string" ? v.replace(/\D+/g, "") : v),
  trim: (v) => (typeof v === "string" ? v.trim() : v),
  dateFromExcel: (v) => {
    if (v instanceof Date) return v;
    if (typeof v === "number") {
      const base = new Date(Date.UTC(1899, 11, 30));
      return new Date(base.getTime() + v * 86400000);
    }
    return v ? new Date(v) : null;
  },
};

export default transforms;
