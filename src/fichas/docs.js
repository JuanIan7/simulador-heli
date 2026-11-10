// Documentos de cada voo (foto ou PDF do Diário de Bordo e da Ficha de Avaliação), guardados no Firestore do próprio piloto.
// O Storage do Firebase exige plano pago; aqui o arquivo vira texto (base64) e é dividido em partes de até 700 mil caracteres:
//   diario/{uid}/docs/{id}            = { voo, data, tipo, nome, mime, tamanho, partes, em }  (voo = id do registro em voos/ ou 'AAAA-MM-DD-vN')
//   diario/{uid}/docs/{id}/partes/{n} = { b64 }
// Fotos são reduzidas (lado maior 1800 px, JPEG) antes de enviar: ficam legíveis e leves. Só o dono lê e grava (firestore.rules).
import { doc, getDoc, writeBatch, collection, getDocs, serverTimestamp } from 'firebase/firestore';

export const TIPOS_DOC = { db: 'Diário de Bordo (DB)', ficha: 'Ficha de Avaliação de Voo' };
const PARTE = 700000;
export const LIMITE = 8 * 1024 * 1024; // 8 MB por arquivo original

const lerBase64 = (blob) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => erro(r.error); r.readAsDataURL(blob); });

// Reduz a foto: lado maior 1800 px, JPEG 0,82. Se o navegador não conseguir abrir a imagem (ex.: HEIC antigo), envia o original.
async function reduzirFoto(arquivo) {
  try {
    const bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const esc = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    return blob && blob.size < arquivo.size ? { blob, mime: 'image/jpeg', nome: arquivo.name.replace(/\.[^.]+$/, '') + '.jpg' } : { blob: arquivo, mime: arquivo.type, nome: arquivo.name };
  } catch { return { blob: arquivo, mime: arquivo.type || 'image/jpeg', nome: arquivo.name }; }
}

// Envia (ou troca) o documento de um tipo para um voo. Apaga a versão anterior do mesmo tipo.
export async function enviarDoc(db, uid, vooId, tipo, arquivo, existentes = [], data = '') {
  const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name);
  if (!ehPdf && !/^image\//.test(arquivo.type)) throw new Error('Envie uma foto ou um PDF.');
  if (arquivo.size > LIMITE) throw new Error('Arquivo maior que 8 MB. Tire a foto de novo ou reduza o PDF.');
  const f = ehPdf ? { blob: arquivo, mime: 'application/pdf', nome: arquivo.name } : await reduzirFoto(arquivo);
  const b64 = await lerBase64(f.blob), n = Math.max(1, Math.ceil(b64.length / PARTE));
  const id = `${vooId}-${tipo}-${Date.now().toString(36)}`;
  // as partes primeiro (cada lote no máximo ~1 MB); os metadados por último: o documento só aparece completo
  for (let i = 0; i < n; i++) {
    const lote = writeBatch(db);
    lote.set(doc(db, 'diario', uid, 'docs', id, 'partes', String(i)), { b64: b64.slice(i * PARTE, (i + 1) * PARTE) });
    await lote.commit();
  }
  const lote = writeBatch(db);
  lote.set(doc(db, 'diario', uid, 'docs', id), { voo: vooId, data: /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : vooId.slice(0, 10), tipo, nome: String(f.nome || tipo).slice(0, 120), mime: f.mime, tamanho: f.blob.size, partes: n, em: serverTimestamp() });
  await lote.commit();
  for (const d of existentes.filter((x) => x.voo === vooId && x.tipo === tipo)) await apagarDoc(db, uid, d);
  return id;
}

export async function apagarDoc(db, uid, d) {
  const lote = writeBatch(db);
  for (let i = 0; i < (d.partes || 1); i++) lote.delete(doc(db, 'diario', uid, 'docs', d.id, 'partes', String(i)));
  lote.delete(doc(db, 'diario', uid, 'docs', d.id));
  await lote.commit();
}

// Junta as partes e devolve um link local (blob:) para abrir ou baixar
const cacheUrl = {};
export async function urlDoc(db, uid, d) {
  if (cacheUrl[d.id]) return cacheUrl[d.id];
  let partes = [];
  try { const s = await getDocs(collection(db, 'diario', uid, 'docs', d.id, 'partes')); partes = s.docs.map((x) => [+x.id, x.data().b64]); }
  catch { for (let i = 0; i < (d.partes || 1); i++) { const x = await getDoc(doc(db, 'diario', uid, 'docs', d.id, 'partes', String(i))); partes.push([i, x.data()?.b64 || '']); } }
  const b64 = partes.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (cacheUrl[d.id] = URL.createObjectURL(new Blob([bytes], { type: d.mime || 'application/octet-stream' })));
}

export const tamanhoBR = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
