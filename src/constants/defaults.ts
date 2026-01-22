export const TAX_RATE = 0;
  export const sanitizeUserText = (text: string): string => {
    try {
      let s = text ?? "";
      // Remove content within (), {}, []
      s = s.replace(/\(.*?\)/g, "");
      s = s.replace(/\{.*?\}/g, "");
      s = s.replace(/\[.*?\]/g, "");
      // Remove content within single and double quotes
      s = s.replace(/"[^"]*"/g, "");
      s = s.replace(/'[^']*'/g, "");
      // Remove markdown italic/bold segments
      s = s.replace(/\*\*.*?\*\*/g, "");
      s = s.replace(/\*.*?\*/g, "");
      // Collapse extra whitespace
      s = s.replace(/\s{2,}/g, " ").trim();
      return s;
    } catch {
      return "";
    }
  };