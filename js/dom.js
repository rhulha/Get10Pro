export const $ = (id) => document.getElementById(id);
export const ga = (el, n, cb) => $(el).addEventListener(n, cb);
