#!/usr/bin/env python3
"""Hangar da Turma pela Claudia (roda na VM do Hermes, ao lado de duvidas-hangar.py, cuja credencial reaproveita).

A Claudia age em nome do Juan: o que ela grava aparece no site como feito por "Juan".
Alcance definido nas regras do banco (firestore.rules): compras, anotações, gastos, materiais, membros e provas da turma,
e o diário de voo DO JUAN. O diário dos colegas continua fechado: nem o Juan vê.

  hangar.py status
  hangar.py compras listar [--todos] | por "Arroz" "Banana|6 un" "Sabão|1|casa" | comprei X... | desfazer X... | tirar X...
  hangar.py notas   listar [--todos] | por "texto" [--tipo fazer] [--quando "sábado"] | feito X... | desfazer X... | tirar X...
  hangar.py gastos  listar [--n 15] | saldo | lancar --desc D --valor 80,00 (--com "Juan,Meira" | --com todos | --so-meu)
                    [--pagou Juan] [--cat mercado] [--data AAAA-MM-DD] [--obs O] | editar X [...] | apagar X --confirmado
                    | paguei NOME | recebi NOME [--confirmado]
  hangar.py membros
  hangar.py materiais listar | por --titulo T --link https://... [--secao outros] | tirar X
  hangar.py provas
  hangar.py voos    listar [--n 10] | horas | lancar --data D --destino SISY (--inicio HH:MM --fim HH:MM | --diurno H:MM) [...]
                    | civ X lancado | apagar X --confirmado
  hangar.py dia     listar | marcar AAAA-MM-DD voou|chuva|vento|fds|outro [--outro texto]
  hangar.py goa     marcar AAAA-MM-DD
  hangar.py docs    listar | enviar ARQUIVO --voo X --tipo db|ficha

X é o código de 6 letras que aparece nas listas (ou parte do nome). Tudo o que é apagado fica guardado em
~/.hermes/duvidas-hangar/lixeira/ antes de sair do banco.
"""
import argparse, base64, datetime, decimal, importlib.util, json, mimetypes, os, random, re, string, sys, time, unicodedata
from pathlib import Path

_spec = importlib.util.spec_from_file_location("duvidas_hangar", Path(__file__).resolve().with_name("duvidas-hangar.py"))
dh = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dh)

JUAN_UID, EU = "KtVVvExuZLgxQOlpjwOAATudY6z1", "Juan"
LIXEIRA = dh.DIR / "lixeira"
CATS_COMPRA = {"mercado": "Mercado", "casa": "Casa e limpeza", "higiene": "Higiene", "roupa": "Roupa e frio", "curso": "Curso e voo", "outros": "Outros"}
TIPOS_NOTA = {"fazer": "Queremos fazer", "lugar": "Lugar para ir", "tarefa": "Tarefa para depois", "ideia": "Ideia", "outros": "Outros"}
CATS_GASTO = ["transporte", "carro", "passagem", "hospedagem", "alimentacao", "mercado", "hortifruti", "lazer", "casa", "curso", "material", "outros"]
SECOES = ["eacar", "essenciais", "sn", "esquilo", "outros"]
FUNCOES = {"instrucao": "Instrução (duplo comando)", "solo": "Solo", "pic": "Piloto em comando", "instrutor": "Instrutor"}
CIV = ["nao", "lancado", "conferido"]
EXERCICIOS = "Pré-voo|Partida e cheques|Táxi pairado|Pairado|Giro 360° no pairado|Deslocamento lateral e à ré|Decolagem normal|Tráfego padrão|Aproximação normal|Pouso|Decolagem de máxima performance|Aproximação íngreme|Pouso corrido|Autorrotação|Autorrotação pairada|Pane de governador|Área restrita|Pouso em rampa|Navegação|Voo noturno|Emergências simuladas".split("|")
PROVAS = ["reg", "tvh", "cth", "met", "nav", "r22", "man"]
MOTIVOS = ["chuva", "vento", "fds", "outro"]
PARTE, LIMITE = 700000, 8 * 1024 * 1024
BR = datetime.timezone(datetime.timedelta(hours=-3))
sair = dh.sair


# ---------- banco ----------
def val(x):
    if x is None: return {"nullValue": None}
    if isinstance(x, bool): return {"booleanValue": x}
    if isinstance(x, int): return {"integerValue": str(x)}
    if isinstance(x, float): return {"doubleValue": x}
    if isinstance(x, datetime.datetime): return {"timestampValue": x.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")}
    if isinstance(x, (list, tuple)): return {"arrayValue": {"values": [val(i) for i in x]}}
    if isinstance(x, dict): return {"mapValue": {"fields": {k: val(v) for k, v in x.items()}}}
    return {"stringValue": str(x)}


def campos(d): return {"fields": {k: val(v) for k, v in d.items()}}
def _doc(d): return {**dh.de_doc(d), "_t": d.get("updateTime")}
def ler_doc(caminho): return _doc(dh.fs("/" + caminho))


def listar(col):
    out, tk = [], None
    while True:
        p = {"pageSize": 300}
        if tk: p["pageToken"] = tk
        r = dh.fs("/" + col, params=p)
        out += [_doc(d) for d in r.get("documents", [])]
        tk = r.get("nextPageToken")
        if not tk: return out


def criar(col, dados, id_=None):
    r = dh.fs("/" + col, campos(dados), "POST", {"documentId": id_} if id_ else None)
    return r["name"].rsplit("/", 1)[-1]


def mudar(caminho, novos, t=None):
    """Grava só os campos indicados. Com `t`, falha se o documento mudou depois de lido."""
    p = {"updateMask.fieldPaths": list(novos)}
    if t: p["currentDocument.updateTime"] = t
    else: p["currentDocument.exists"] = "true"
    dh.fs("/" + caminho, campos(novos), "PATCH", p)


def apagar(col, d):
    LIXEIRA.mkdir(parents=True, exist_ok=True)
    os.chmod(LIXEIRA, 0o700)
    f = LIXEIRA / f"{time.strftime('%Y%m%d-%H%M%S')}-{col.replace('/', '_')}-{d['id']}.json"
    f.write_text(json.dumps({k: v for k, v in d.items() if k != "_t"}, ensure_ascii=False, indent=1), encoding="utf-8")
    os.chmod(f, 0o600)
    dh.fs(f"/{col}/{d['id']}", metodo="DELETE")


# ---------- utilidades ----------
def norm(t): return "".join(c for c in unicodedata.normalize("NFD", str(t or "").lower()) if unicodedata.category(c) != "Mn").strip()
def limpa(t, n): return " ".join(str(t or "").split())[:n]
def cod(d): return d["id"].rsplit("-", 1)[-1][-6:] if "-" in d["id"] else d["id"][:6]
def hoje(mais=0): return (datetime.datetime.now(BR) + datetime.timedelta(days=mais)).strftime("%Y-%m-%d")
def dbr(iso): return "/".join(reversed(str(iso or "").split("-")))
def brl(c): return "R$ " + f"{(c or 0) / 100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
def hm(m): return f"{int(m or 0) // 60}:{int(m or 0) % 60:02d}"
def rand(n=6): return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


def achar(lista, termo, campo=None):
    t = str(termo).strip()
    r = [d for d in lista if d["id"] == t or d["id"].startswith(t) or d["id"].endswith(t)] if len(t) >= 4 else []
    if not r and campo:
        n = norm(t)
        r = [d for d in lista if norm(d.get(campo)) == n] or [d for d in lista if n and n in norm(d.get(campo))]
    if len(r) != 1:
        sair(f"“{t}”: {'não achei' if not r else 'serve para mais de um: ' + ', '.join(cod(d) for d in r[:6])}. Veja o código na lista.")
    return r[0]


def data_ok(s, ini, fim):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s or ""): sair("Data no formato AAAA-MM-DD.")
    try: datetime.date.fromisoformat(s)
    except ValueError: sair(f"Data inválida: {s}.")
    if not ini <= s <= fim: sair(f"Data fora do permitido ({dbr(ini)} a {dbr(fim)}): {dbr(s)}.")
    return s


def centavos(t):
    s = re.sub(r"[^\d,.]", "", str(t))
    if "," in s: s = s.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(\.\d{3})+", s): s = s.replace(".", "")
    try: v = int((decimal.Decimal(s) * 100).to_integral_value())
    except decimal.InvalidOperation: sair(f"Valor inválido: {t}. Use, por exemplo, 80,00.")
    if v <= 0 or v > 10000000: sair("Valor fora do permitido (até R$ 100.000,00). Confira a vírgula.")
    return v


def duracao(t):
    if t in (None, ""): return 0
    m = re.fullmatch(r"(\d{1,2}):([0-5]\d)", str(t).strip())
    if not m: sair(f"Tempo no formato H:MM: {t}.")
    return min(1440, int(m[1]) * 60 + int(m[2]))


def confirma(a, frase):
    if not getattr(a, "confirmado", False):
        print(frase + "\nNada foi gravado. Depois do ok do Juan, repita com --confirmado.")
        return False
    return True


def em_massa(a, n):
    if n > 5 and not a.confirmado:
        sair(f"São {n} itens. Diga ao Juan quantos são e, com o ok dele, repita com --confirmado.")


# ---------- compras e notas ----------
def cmd_compras(a):
    l = listar("compras")
    if a.acao == "listar":
        ver = [x for x in l if a.todos or not x.get("feito")]
        if not ver: return print("Lista de compras vazia.")
        for c, nome in CATS_COMPRA.items():
            g = [x for x in ver if x.get("cat", "outros") == c]
            if g:
                print(nome + ":")
                for x in g: print(f"  [{cod(x)}] {'✓ ' if x.get('feito') else ''}{x.get('item')}{' (' + x['qtd'] + ')' if x.get('qtd') else ''} · pôs {x.get('nome', '?')}")
    elif a.acao == "por":
        abertos = {norm(x.get("item")) for x in l if not x.get("feito")}
        for bruto in a.itens:
            p = [limpa(s, 80) for s in bruto.split("|")]
            item, qtd, cat = p[0], (p[1] if len(p) > 1 else "")[:30], (p[2] if len(p) > 2 else a.cat)
            if len(item) < 2: print(f"Pulei “{bruto}”: nome curto demais."); continue
            if cat not in CATS_COMPRA: sair(f"Categoria inválida: {cat}. Use: {', '.join(CATS_COMPRA)}.")
            if norm(item) in abertos: print(f"Já estava na lista: {item}"); continue
            criar("compras", {"item": item, "qtd": qtd, "cat": cat, "feito": False, "nome": EU, "autor": JUAN_UID, "em": dh.agora()})
            abertos.add(norm(item)); print(f"Posto: {item}{' (' + qtd + ')' if qtd else ''} · {CATS_COMPRA[cat]}")
    elif a.acao in ("comprei", "desfazer"):
        feito = a.acao == "comprei"
        for t in a.itens:
            x = achar(l, t, "item")
            mudar(f"compras/{x['id']}", {"feito": feito, "feitoPor": EU if feito else "", "feitoEm": dh.agora()})
            print(("Comprado: " if feito else "Voltou para a lista: ") + x.get("item", ""))
    else:
        em_massa(a, len(a.itens))
        for t in a.itens:
            x = achar(l, t, "item"); apagar("compras", x); print("Tirado da lista: " + x.get("item", ""))


def cmd_notas(a):
    l = listar("anotacoes")
    if a.acao == "listar":
        ver = [x for x in l if a.todos or not x.get("feito")]
        if not ver: return print("Sem anotações.")
        for c, nome in TIPOS_NOTA.items():
            g = [x for x in ver if x.get("tipo", "outros") == c]
            if g:
                print(nome + ":")
                for x in g: print(f"  [{cod(x)}] {'✓ ' if x.get('feito') else ''}{x.get('texto')}{' · ' + x['quando'] if x.get('quando') else ''} · {x.get('nome', '?')}")
    elif a.acao == "por":
        texto = limpa(" ".join(a.itens), 300)
        if len(texto) < 2: sair("Faltou o texto da anotação.")
        if a.tipo not in TIPOS_NOTA: sair(f"Tipo inválido. Use: {', '.join(TIPOS_NOTA)}.")
        criar("anotacoes", {"texto": texto, "tipo": a.tipo, "quando": limpa(a.quando, 40), "feito": False, "nome": EU, "autor": JUAN_UID, "em": dh.agora()})
        print(f"Anotado ({TIPOS_NOTA[a.tipo]}): {texto}")
    elif a.acao in ("feito", "desfazer"):
        feito = a.acao == "feito"
        for t in a.itens:
            x = achar(l, t, "texto")
            mudar(f"anotacoes/{x['id']}", {"feito": feito, "feitoPor": EU if feito else "", "feitoEm": dh.agora()})
            print(("Feito: " if feito else "Reaberto: ") + x.get("texto", ""))
    else:
        em_massa(a, len(a.itens))
        for t in a.itens:
            x = achar(l, t, "texto"); apagar("anotacoes", x); print("Apagada: " + x.get("texto", ""))


# ---------- gastos (mesmas contas de src/gastos/contas.js e acerto.js) ----------
def partes(g):
    ps, v = g.get("participantes") or [], g.get("valor") or 0
    n = len(ps); base = v // n if n else 0; sobra = v - base * n if n else 0
    pg, q = g.get("pagoPor") or "", g.get("quitados") or []
    return [{"nome": p, "valor": base + (1 if i < sobra else 0), "pagador": bool(pg) and p == pg, "quitado": not pg or p == pg or p in q} for i, p in enumerate(ps)]


def acertos(lista):
    deve = {}
    for g in lista:
        if not g.get("pagoPor"): continue
        for p in partes(g):
            if not p["pagador"] and not p["quitado"]:
                k = (p["nome"], g["pagoPor"]); deve[k] = deve.get(k, 0) + p["valor"]
    out, visto = [], set()
    for a, b in deve:
        par = tuple(sorted((a, b)))
        if par in visto: continue
        visto.add(par)
        liq = deve.get((a, b), 0) - deve.get((b, a), 0)
        if liq: out.append((a, b, liq) if liq > 0 else (b, a, -liq))
    return sorted(out, key=lambda x: -x[2])


def devendo(g, nome): return nome in (g.get("participantes") or []) and nome not in (g.get("quitados") or [])
def para_avisar(l, de, para): return [g for g in l if g.get("pagoPor") == para and devendo(g, de)]


def para_quitar(l, x, y):
    r = []
    for g in l:
        dv = x if g.get("pagoPor") == y else y if g.get("pagoPor") == x else None
        if dv and devendo(g, dv): r.append((g, dv))
    return r


def pessoas():
    m = ler_doc(f"gastosMembros/{JUAN_UID}")
    return ler_doc(f"gastosConvites/{m['codigo']}").get("pessoas") or []


def nome_de(t, ps):
    n = norm(t)
    r = [p for p in ps if norm(p) == n] or [p for p in ps if norm(p).startswith(n)] or [p for p in ps if n in norm(p)]
    if len(r) != 1: sair(f"Não sei quem é “{t}”. Na turma: {', '.join(ps)}.")
    return r[0]


def linha_gasto(g):
    ps = partes(g)
    pend = [p["nome"] for p in ps if not p["quitado"]]
    return (f"[{cod(g)}] {dbr(g.get('data'))} · {g.get('descricao')} · {brl(g.get('valor'))} · {g.get('categoria')} · "
            f"{'pagou ' + g['pagoPor'] if g.get('pagoPor') else 'cada um o seu'} · entre {', '.join(g.get('participantes') or [])}"
            + (f" · {brl(ps[0]['valor'])} cada" if len(ps) > 1 else "") + (f" · falta: {', '.join(pend)}" if pend else ""))


def quem_divide(a, ps):
    if a.so_meu: return [EU], EU
    pg = None
    if a.pagou: pg = "" if norm(a.pagou) in ("cada", "cada um", "ninguem") else nome_de(a.pagou, ps)
    if a.com is None: return None, pg
    com = list(ps) if norm(a.com) in ("todos", "turma", "todo mundo") else list(dict.fromkeys(nome_de(x, ps) for x in re.split(r"[,;]| e ", a.com) if x.strip()))
    return com, pg


def cmd_gastos(a):
    l = listar("gastos")
    if a.acao == "listar":
        for g in sorted(l, key=lambda x: (x.get("data") or "", x.get("criadoMs") or 0), reverse=True)[:a.n]: print(linha_gasto(g))
        print(f"\n{len(l)} gastos no total, {brl(sum(g.get('valor') or 0 for g in l))}.")
    elif a.acao == "saldo":
        ac = acertos(l)
        if not ac: return print("Ninguém deve nada a ninguém.")
        meus = [x for x in ac if EU in x[:2]]
        print("Do Juan:" if meus else "O Juan está em dia.")
        for de, para, v in meus: print(f"  {'Você deve a ' + para if de == EU else de + ' deve a você'}: {brl(v)}")
        outros = [x for x in ac if EU not in x[:2]]
        if outros: print("Entre os outros:")
        for de, para, v in outros: print(f"  {de} deve a {para}: {brl(v)}")
    elif a.acao == "lancar":
        ps = pessoas(); com, pg = quem_divide(a, ps)
        if com is None: sair("Diga com quem dividiu (--com \"Juan,Meira\" ou --com todos) ou use --so-meu. Se o Juan não disse, pergunte.")
        desc = limpa(a.desc, 80)
        if not desc: sair("Faltou dizer com o que foi o gasto (--desc).")
        if not a.valor: sair("Faltou o valor (--valor 80,00).")
        cat = a.cat or "outros"
        if cat not in CATS_GASTO: sair(f"Categoria inválida. Use: {', '.join(CATS_GASTO)}.")
        d = limpa(a.data, 10) or hoje()
        data_ok(d, "2020-01-01", hoje(365))
        g = {"descricao": desc, "data": d, "valor": centavos(a.valor), "categoria": cat, "pagoPor": EU if pg is None else pg, "participantes": com, "quitados": [],
             "obs": limpa(a.obs, 120), "atualizadoPor": EU, "atualizadoEm": dh.agora(), "criadoPor": EU, "criadoMs": int(time.time() * 1000), "criadoEm": dh.agora()}
        g["id"] = criar("gastos", g, f"{d}-{rand()}")
        print("Lançado: " + linha_gasto(g))
    elif a.acao == "editar":
        g = achar(l, a.alvo, "descricao"); ps = pessoas(); com, pg = quem_divide(a, ps); n = {}
        if a.desc: n["descricao"] = limpa(a.desc, 80)
        if a.valor: n["valor"] = centavos(a.valor)
        if a.cat:
            if a.cat not in CATS_GASTO: sair(f"Categoria inválida. Use: {', '.join(CATS_GASTO)}.")
            n["categoria"] = a.cat
        if a.data: n["data"] = data_ok(a.data, "2020-01-01", hoje(365))
        if a.obs is not None: n["obs"] = limpa(a.obs, 120)
        if pg is not None: n["pagoPor"] = pg
        if com is not None: n["participantes"] = com
        if not n: sair("Diga o que mudar.")
        fica, paga = n.get("participantes", g.get("participantes") or []), n.get("pagoPor", g.get("pagoPor"))
        n["quitados"] = [p for p in (g.get("quitados") or []) if p in fica and p != paga]
        n.update({"atualizadoPor": EU, "atualizadoEm": dh.agora()})
        mudar(f"gastos/{g['id']}", n, g["_t"])
        print("Corrigido: " + linha_gasto({**g, **n}))
    elif a.acao == "apagar":
        g = achar(l, a.alvo, "descricao")
        if confirma(a, "Vai apagar para a turma toda: " + linha_gasto(g)):
            apagar("gastos", g); print("Apagado: " + g.get("descricao", ""))
    elif a.acao == "paguei":
        para = nome_de(a.alvo, pessoas())
        if not any(x[0] == EU and x[1] == para for x in acertos(l)): sair(f"Pelas contas, você não deve nada a {para}.")
        n = 0
        for g in para_avisar(l, EU, para):
            if EU not in (g.get("informados") or []):
                mudar(f"gastos/{g['id']}", {"informados": (g.get("informados") or []) + [EU], "atualizadoPor": EU, "atualizadoEm": dh.agora()}, g["_t"]); n += 1
        print(f"Avisado: {para} vê que você pagou ({n} gasto(s)). Quem confirma o recebimento é {para}.")
    else:  # recebi
        de = nome_de(a.alvo, pessoas())
        ac = [x for x in acertos(l) if x[0] == de and x[1] == EU]
        if not ac: sair(f"Pelas contas, {de} não deve nada a você.")
        lista = para_quitar(l, EU, de)
        if confirma(a, f"Vai confirmar que você recebeu {brl(ac[0][2])} de {de} e quitar {len(lista)} parte(s) entre vocês dois."):
            for g, dv in lista:
                mudar(f"gastos/{g['id']}", {"quitados": (g.get("quitados") or []) + [dv], "quitadosEm": {**(g.get("quitadosEm") or {}), dv: hoje()}, "atualizadoPor": EU, "atualizadoEm": dh.agora()}, g["_t"])
            print(f"Quitado: {brl(ac[0][2])} de {de}.")


# ---------- turma ----------
def cmd_membros(_):
    for m in sorted(listar("gastosMembros"), key=lambda x: x.get("nome", "")):
        print(f"{m.get('nome')}: {sum(1 for v in (m.get('estudo') or {}).values() if v)} itens de estudo feitos")


def cmd_materiais(a):
    l = listar("materiais")
    if a.acao == "listar":
        print("\n".join(f"[{cod(x)}] {x.get('titulo')} ({x.get('secao')}) · {x.get('nome', '?')} · {x.get('link')}" for x in l) or "Ninguém acrescentou material pelo site.")
    elif a.acao == "por":
        t, u = limpa(a.titulo, 120), (a.link or "").strip()
        if len(t) < 2 or not u.startswith("https://") or len(u) > 1000: sair("Precisa de --titulo e de --link começando com https://.")
        if a.secao not in SECOES: sair(f"Seção inválida. Use: {', '.join(SECOES)}.")
        criar("materiais", {"titulo": t, "link": u, "secao": a.secao, "autor": JUAN_UID, "nome": EU, "em": dh.agora()})
        print("Material acrescentado: " + t)
    else:
        x = achar(l, a.alvo, "titulo"); apagar("materiais", x); print("Tirado: " + x.get("titulo", ""))


def cmd_provas(_):
    r = []
    for p in listar("provas"):
        notas = p.get("notas") or {}
        r.append((sum((notas.get(i) or {}).get("melhor") or 0 for i in PROVAS) / len(PROVAS), p.get("nome", "?"), notas))
    if not r: return print("Ninguém fez prova ainda.")
    for i, (m, nome, notas) in enumerate(sorted(r, key=lambda x: -x[0]), 1):
        print(f"{i}º {nome}: média {m:.0f}" + (" · " + ", ".join(f"{k} {(notas.get(k) or {}).get('melhor', 0)}" for k in PROVAS if k in notas) if nome == EU else ""))


# ---------- diário de voo do Juan ----------
BASE = f"diario/{JUAN_UID}"


def linha_voo(v):
    return (f"[{cod(v)}] {dbr(v.get('data'))} {v.get('inicio') or ''}{'-' + v['fim'] if v.get('fim') else ''} · {v.get('modelo', '')} {v.get('matricula', '')} · "
            f"{v.get('origem', '')}→{v.get('destino', '')} · diurno {hm(v.get('diurno'))}, noturno {hm(v.get('noturno'))} · {FUNCOES.get(v.get('funcao'), v.get('funcao'))} · "
            f"{v.get('pousosD') or 0}+{v.get('pousosN') or 0} pousos · instrutor {v.get('instrutor') or '-'} · CIV {v.get('civ', 'nao')}")


def cmd_voos(a):
    l = sorted(listar(BASE + "/voos"), key=lambda v: (v.get("data") or "", v.get("inicio") or ""), reverse=True)
    if a.acao == "listar":
        print("\n".join(linha_voo(v) for v in l[:a.n]) or "Nenhum voo lançado.")
    elif a.acao == "horas":
        tot = {}
        for v in l:
            t = tot.setdefault(v.get("funcao", "instrucao"), [0, 0]); t[0] += v.get("diurno") or 0; t[1] += v.get("noturno") or 0
        for f, (d, n) in tot.items(): print(f"{FUNCOES.get(f, f)}: {hm(d + n)} (diurno {hm(d)}, noturno {hm(n)})")
        print(f"Total: {hm(sum(d + n for d, n in tot.values()))} em {len(l)} voos, {len({v.get('data') for v in l})} dias. Pendentes na CIV: {sum(1 for v in l if v.get('civ', 'nao') == 'nao')}.")
    elif a.acao == "lancar":
        ult = l[0] if l else {}
        data = data_ok(a.data or hoje(), "2000-01-01", hoje(1))
        ini, fim = a.inicio or "", a.fim or ""
        for h in (ini, fim):
            if h and not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", h): sair(f"Horário no formato HH:MM: {h}.")
        di, no = duracao(a.diurno), duracao(a.noturno)
        if not di and not no and ini and fim:
            mi, mf = duracao(ini), duracao(fim)
            if mf <= mi: sair("O fim do voo precisa ser depois do início.")
            if mi < 6 * 60 + 30 or mf > 17 * 60 + 30: sair("Perto do escuro: informe --diurno e --noturno, para não errar a hora noturna.")
            di = mf - mi
        if di + no <= 0: sair("Faltou o tempo de voo (início e fim, ou --diurno/--noturno).")
        mat = (a.matricula or ult.get("matricula") or "").upper()
        org, dst = (a.origem or ult.get("origem") or "").upper(), (a.destino or a.origem or ult.get("destino") or "").upper()
        if mat and not re.fullmatch(r"[A-Z0-9]{2}-[A-Z0-9]{1,5}", mat): sair("Matrícula no formato PR-ABC.")
        if not re.fullmatch(r"[A-Z0-9]{4}", org) or not re.fullmatch(r"[A-Z0-9]{4}", dst): sair("Origem e destino têm 4 letras (ex.: SISY).")
        if a.funcao not in FUNCOES: sair(f"Função inválida. Use: {', '.join(FUNCOES)}.")
        if a.canac and not re.fullmatch(r"\d{6}", a.canac): sair("O CANAC do instrutor tem 6 dígitos.")
        ex = [x.strip() for x in re.split(r"[,;]", a.exercicios or "") if x.strip()]
        ruins = [x for x in ex if x not in EXERCICIOS]
        if ruins: sair(f"Exercício fora da lista do Diário: {', '.join(ruins)}. Opções: {', '.join(EXERCICIOS)}.")
        v = {"data": data, "modelo": limpa(a.modelo or ult.get("modelo") or "R22", 20), "matricula": mat, "origem": org, "destino": dst, "inicio": ini, "fim": fim,
             "diurno": di, "noturno": no, "funcao": a.funcao, "pousosD": max(0, min(99, a.pousos_d)), "pousosN": max(0, min(99, a.pousos_n)),
             "navegacao": duracao(a.nav), "capota": duracao(a.capota), "instrutor": limpa(a.instrutor, 80), "canacInstrutor": a.canac or "",
             "exercicios": ex, "obs": str(a.obs or "")[:2000], "civ": "nao", "atualizadoEm": dh.agora(), "criadoEm": dh.agora()}
        v["id"] = criar(BASE + "/voos", v, f"{data}-{ini.replace(':', '')}-{rand(4)}")
        print("Voo lançado: " + linha_voo(v))
    elif a.acao == "civ":
        if a.valor not in CIV: sair(f"Situação inválida. Use: {', '.join(CIV)}.")
        v = achar(l, a.alvo); mudar(f"{BASE}/voos/{v['id']}", {"civ": a.valor, "atualizadoEm": dh.agora()}); print(f"CIV de {dbr(v.get('data'))}: {a.valor}")
    else:
        v = achar(l, a.alvo)
        if confirma(a, "Vai apagar do seu diário de voo: " + linha_voo(v)):
            apagar(BASE + "/voos", v); print("Voo apagado (cópia guardada na lixeira da Claudia).")


def cmd_dia(a):
    if a.acao == "listar":
        for d in sorted(listar(BASE + "/dias"), key=lambda x: x["id"], reverse=True)[:15]:
            print(f"{dbr(d['id'])}: {'voou' if d.get('voou') else 'não voou, ' + str(d.get('outro') or d.get('motivo'))}")
        return
    d = data_ok(a.data, "2026-11-01", hoje(1))
    if a.estado != "voou" and a.estado not in MOTIVOS: sair(f"Use voou ou um motivo: {', '.join(MOTIVOS)}.")
    voou = a.estado == "voou"
    dh.fs(f"/{BASE}/dias/{d}", campos({"voou": voou, "motivo": "" if voou else a.estado, "outro": limpa(a.outro, 60) if a.estado == "outro" else "", "em": dh.agora()}), "PATCH")
    print(f"{dbr(d)}: {'voou' if voou else 'não voou (' + a.estado + ')'}.")


def cmd_goa(a):
    d = data_ok(a.data, "2026-11-01", hoje(1))
    dh.fs(f"/{BASE}/goa/{d}", campos({"enviado": True, "em": dh.agora()}), "PATCH")
    print(f"Marcado: formulário do GOA preenchido em {dbr(d)}. (Isto só marca no Hangar; o formulário em si continua sendo no Google Forms.)")


def cmd_docs(a):
    l = listar(BASE + "/docs")
    if a.acao == "listar":
        print("\n".join(f"[{cod(d)}] {dbr(d.get('data'))} · {d.get('tipo')} · {d.get('nome')}" for d in sorted(l, key=lambda x: x.get("data") or "", reverse=True)) or "Nenhum documento de voo.")
        return
    voo = achar(listar(BASE + "/voos"), a.voo)
    if a.tipo not in ("db", "ficha"): sair("Tipo: db ou ficha.")
    f = Path(a.arquivo)
    if not f.is_file(): sair(f"Arquivo não encontrado: {f}")
    if f.stat().st_size > LIMITE: sair("Arquivo maior que 8 MB. Reduza a foto ou o PDF.")
    mime = mimetypes.guess_type(f.name)[0] or ""
    if mime != "application/pdf" and not mime.startswith("image/"): sair("Envie uma foto ou um PDF.")
    b64 = base64.b64encode(f.read_bytes()).decode()
    n = max(1, -(-len(b64) // PARTE))
    id_ = f"{voo['id']}-{a.tipo}-{int(time.time() * 1000):x}"
    for i in range(n):
        dh.fs(f"/{BASE}/docs/{id_}/partes/{i}", campos({"b64": b64[i * PARTE:(i + 1) * PARTE]}), "PATCH")
    criar(BASE + "/docs", {"voo": voo["id"], "data": voo.get("data"), "tipo": a.tipo, "nome": f.name[:120], "mime": mime, "tamanho": f.stat().st_size, "partes": n, "em": dh.agora()}, id_)
    for d in [x for x in l if x.get("voo") == voo["id"] and x.get("tipo") == a.tipo]:
        for i in range(d.get("partes") or 1):
            dh.fs(f"/{BASE}/docs/{d['id']}/partes/{i}", metodo="DELETE")
        apagar(BASE + "/docs", d)
    print(f"Documento ({a.tipo}) guardado no voo de {dbr(voo.get('data'))}: {f.name}")


def cmd_status(_):
    if not dh.ler(dh.CRED): sair("A Claudia ainda não entrou no banco: o Juan precisa rodar duvidas-hangar.py login.")
    for nome, col in [("Compras", "compras"), ("Anotações", "anotacoes"), ("Gastos", "gastos"), ("Membros", "gastosMembros"), ("Materiais", "materiais"), ("Provas", "provas"),
                      ("Meu diário de voo", BASE + "/voos"), ("Dias", BASE + "/dias"), ("Documentos do voo", BASE + "/docs")]:
        try: dh.fs("/" + col, params={"pageSize": 1}); print(f"ok      {nome}")
        except RuntimeError as e: print(f"negado  {nome} ({str(e)[:40]})")


def main():
    p = argparse.ArgumentParser(description="Hangar da Turma pela Claudia")
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("status").set_defaults(f=cmd_status)
    s.add_parser("membros").set_defaults(f=cmd_membros)
    s.add_parser("provas").set_defaults(f=cmd_provas)
    x = s.add_parser("compras"); x.add_argument("acao", choices=["listar", "por", "comprei", "desfazer", "tirar"]); x.add_argument("itens", nargs="*")
    x.add_argument("--todos", action="store_true"); x.add_argument("--cat", default="mercado"); x.add_argument("--confirmado", action="store_true"); x.set_defaults(f=cmd_compras)
    x = s.add_parser("notas"); x.add_argument("acao", choices=["listar", "por", "feito", "desfazer", "tirar"]); x.add_argument("itens", nargs="*")
    x.add_argument("--todos", action="store_true"); x.add_argument("--tipo", default="tarefa"); x.add_argument("--quando", default=""); x.add_argument("--confirmado", action="store_true"); x.set_defaults(f=cmd_notas)
    x = s.add_parser("gastos"); x.add_argument("acao", choices=["listar", "saldo", "lancar", "editar", "apagar", "paguei", "recebi"]); x.add_argument("alvo", nargs="?")
    for o in ("--desc", "--valor", "--com", "--pagou", "--cat", "--data", "--obs"): x.add_argument(o)
    x.add_argument("--so-meu", action="store_true"); x.add_argument("--n", type=int, default=15); x.add_argument("--confirmado", action="store_true"); x.set_defaults(f=cmd_gastos)
    x = s.add_parser("materiais"); x.add_argument("acao", choices=["listar", "por", "tirar"]); x.add_argument("alvo", nargs="?")
    x.add_argument("--titulo"); x.add_argument("--link"); x.add_argument("--secao", default="outros"); x.set_defaults(f=cmd_materiais)
    x = s.add_parser("voos"); x.add_argument("acao", choices=["listar", "horas", "lancar", "civ", "apagar"]); x.add_argument("alvo", nargs="?"); x.add_argument("valor", nargs="?")
    for o in ("--data", "--inicio", "--fim", "--diurno", "--noturno", "--modelo", "--matricula", "--origem", "--destino", "--nav", "--capota", "--instrutor", "--canac", "--exercicios", "--obs"): x.add_argument(o)
    x.add_argument("--funcao", default="instrucao"); x.add_argument("--pousos-d", type=int, default=0); x.add_argument("--pousos-n", type=int, default=0)
    x.add_argument("--n", type=int, default=10); x.add_argument("--confirmado", action="store_true"); x.set_defaults(f=cmd_voos)
    x = s.add_parser("dia"); x.add_argument("acao", choices=["listar", "marcar"]); x.add_argument("data", nargs="?"); x.add_argument("estado", nargs="?"); x.add_argument("--outro", default=""); x.set_defaults(f=cmd_dia)
    x = s.add_parser("goa"); x.add_argument("acao", choices=["marcar"]); x.add_argument("data"); x.set_defaults(f=cmd_goa)
    x = s.add_parser("docs"); x.add_argument("acao", choices=["listar", "enviar"]); x.add_argument("arquivo", nargs="?"); x.add_argument("--voo"); x.add_argument("--tipo"); x.set_defaults(f=cmd_docs)
    a = p.parse_args()
    try:
        a.f(a)
    except RuntimeError as e:
        if str(e).startswith("403"):
            sair("O banco recusou (sem permissão). Se o Juan ainda não publicou as regras novas do Hangar, é isso que falta.")
        sair(f"O banco recusou ou falhou: {e}")


if __name__ == "__main__":
    main()
