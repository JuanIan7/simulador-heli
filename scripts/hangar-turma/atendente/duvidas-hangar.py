#!/usr/bin/env python3
"""Dúvidas do Hangar da Turma, do lado da Claudia (roda na VM do Hermes).

A aba Dúvidas do Hangar tem um atendente (IA) que responde com os manuais da turma. O que ele não sabe
fica "aguardando": este comando lista essas dúvidas, grava a resposta do Juan no site (só quem perguntou vê)
e, se for o caso, publica nas Perguntas frequentes (sem o nome de quem perguntou).

Entra no banco como a conta "atendente" (e-mail e senha criados pelo Juan no Firebase). As regras do banco
só deixam essa conta mexer nas dúvidas e nas perguntas frequentes: ela não alcança diário, gastos nem nada mais.
A senha não fica guardada: o `login` troca a senha por uma credencial renovável, gravada com permissão 600.

  duvidas-hangar.py login                       (o Juan roda uma vez, no Terminal dele)
  duvidas-hangar.py status
  duvidas-hangar.py pendentes
  duvidas-hangar.py ver CODIGO
  duvidas-hangar.py responder CODIGO --texto "resposta" [--pergunta-faq "pergunta genérica"] [--sem-faq]
  duvidas-hangar.py faq listar | adicionar --pergunta "..." --resposta "..." | remover CODIGO
  duvidas-hangar.py novas        (rotina: imprime só as dúvidas ainda não avisadas; sem novidade, silêncio)
  duvidas-hangar.py lembrete     (rotina das 10h: lista as que esperam há mais de 20 h)
"""
import argparse, datetime, getpass, json, os, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

DIR = Path.home() / ".hermes/duvidas-hangar"
CONFIG, CRED, ESTADO = DIR / "config.json", DIR / "credencial.json", DIR / "avisadas.json"
BR = datetime.timezone(datetime.timedelta(hours=-3))
SITE = "https://juanian7.github.io/simulador-heli/hangar.html#duvidas"


def sair(msg, cod=1):
    print(msg, file=sys.stderr)
    sys.exit(cod)


def ler(p, padrao=None):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return padrao


def gravar(p, dados):
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(p)


def config():
    c = ler(CONFIG)
    if not c or not c.get("apiKey") or not c.get("projectId"):
        sair(f"Falta o arquivo {CONFIG} com apiKey e projectId (configuração pública do site).")
    return c


def http(url, corpo=None, metodo=None, cab=None, form=False):
    dados = None
    cab = dict(cab or {})
    if corpo is not None:
        dados = urllib.parse.urlencode(corpo).encode() if form else json.dumps(corpo).encode()
        cab["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
    req = urllib.request.Request(url, data=dados, method=metodo or ("POST" if dados else "GET"), headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            t = r.read().decode()
            return json.loads(t) if t.strip() else {}
    except urllib.error.HTTPError as e:
        try:
            det = json.loads(e.read().decode())
            det = det[0] if isinstance(det, list) else det
            msg = det.get("error", {}).get("message", "") or str(det)
        except Exception:
            msg = ""
        raise RuntimeError(f"{e.code} {msg}".strip())


_token = None


def token():
    """Token de acesso de 1 hora, renovado pela credencial guardada."""
    global _token
    if _token:
        return _token
    cred = ler(CRED)
    if not cred or not cred.get("refreshToken"):
        sair("O atendente ainda não entrou no banco. O Juan precisa rodar uma vez: duvidas-hangar.py login")
    try:
        r = http(f"https://securetoken.googleapis.com/v1/token?key={config()['apiKey']}",
                 {"grant_type": "refresh_token", "refresh_token": cred["refreshToken"]}, form=True)
    except RuntimeError as e:
        sair(f"A credencial do atendente não foi aceita ({e}). O Juan precisa rodar de novo: duvidas-hangar.py login")
    if r.get("refresh_token") and r["refresh_token"] != cred["refreshToken"]:
        cred["refreshToken"] = r["refresh_token"]
        gravar(CRED, cred)
    _token = r["id_token"]
    return _token


def base():
    return f"https://firestore.googleapis.com/v1/projects/{config()['projectId']}/databases/(default)/documents"


def fs(caminho, corpo=None, metodo=None, params=None):
    url = base() + caminho + ("?" + urllib.parse.urlencode(params, doseq=True) if params else "")
    return http(url, corpo, metodo, {"Authorization": "Bearer " + token()})


def de_valor(v):
    if "stringValue" in v: return v["stringValue"]
    if "booleanValue" in v: return v["booleanValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return v["doubleValue"]
    if "timestampValue" in v: return v["timestampValue"]
    if "arrayValue" in v: return [de_valor(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v: return {k: de_valor(x) for k, x in v["mapValue"].get("fields", {}).items()}
    return None


def para_valor(x):
    if isinstance(x, bool): return {"booleanValue": x}
    if isinstance(x, datetime.datetime): return {"timestampValue": x.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")}
    if isinstance(x, list): return {"arrayValue": {"values": [para_valor(i) for i in x]}}
    return {"stringValue": str(x)}


def de_doc(d):
    out = {k: de_valor(v) for k, v in d.get("fields", {}).items()}
    out["id"] = d["name"].rsplit("/", 1)[-1]
    return out


def agora():
    return datetime.datetime.now(datetime.timezone.utc)


def hora(ts):
    if not ts:
        return "sem data"
    try:
        d = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(BR)
        return d.strftime("%d/%m %H:%M")
    except Exception:
        return ts


def horas_desde(ts):
    try:
        return (agora() - datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds() / 3600
    except Exception:
        return 0


def pendentes():
    q = {"structuredQuery": {"from": [{"collectionId": "duvidas"}],
                             "where": {"fieldFilter": {"field": {"fieldPath": "status"}, "op": "EQUAL", "value": {"stringValue": "aguardando"}}}}}
    r = fs(":runQuery", q)
    docs = [de_doc(x["document"]) for x in r if isinstance(x, dict) and x.get("document")]
    return sorted(docs, key=lambda d: d.get("pedidaEm") or d.get("em") or "")


def achar(cod, lista=None):
    """Aceita o código inteiro ou o começo dele (o aviso mostra os 6 primeiros caracteres)."""
    lista = pendentes() if lista is None else lista
    achados = [d for d in lista if d["id"] == cod] or [d for d in lista if d["id"].startswith(cod)]
    if len(achados) == 1:
        return achados[0]
    if not achados:
        try:
            return de_doc(fs(f"/duvidas/{urllib.parse.quote(cod)}"))
        except RuntimeError:
            sair(f"Não achei dúvida com o código {cod}. Rode: duvidas-hangar.py pendentes")
    sair(f"O código {cod} serve para mais de uma dúvida; use o código inteiro.")


def mostrar(d, completo=False):
    ia = (d.get("respostaIA") or "").strip()
    linhas = [f"Código: {d['id'][:6]}   De: {d.get('nome') or 'alguém da turma'}   Pedida em: {hora(d.get('pedidaEm') or d.get('em'))}",
              f"Pergunta: {d.get('pergunta', '')}"]
    if ia:
        linhas.append("O atendente respondeu: " + (ia if completo or len(ia) <= 500 else ia[:500] + "…"))
        if d.get("fontes"):
            linhas.append("Fontes que ele usou: " + " · ".join(d["fontes"]))
    else:
        linhas.append("O atendente não respondeu.")
    if d.get("status") == "respondida":
        linhas.append(f"JÁ RESPONDIDA em {hora(d.get('respondidaEm'))}: {d.get('resposta', '')}")
    return "\n".join(linhas)


# ---------- comandos ----------
def cmd_login(_):
    cfg = config()
    print("Entrar com a conta do atendente (a que você criou no Firebase › Authentication › Usuários).")
    email = input("E-mail do atendente: ").strip()
    senha = getpass.getpass("Senha (não aparece na tela): ")
    try:
        r = http(f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={cfg['apiKey']}",
                 {"email": email, "password": senha, "returnSecureToken": True})
    except RuntimeError as e:
        sair(f"Não entrou: {e}. Confira o e-mail, a senha e se o provedor E-mail/senha está ativado no Firebase.")
    gravar(CRED, {"refreshToken": r["refreshToken"], "uid": r["localId"], "email": r.get("email", email)})
    print("\nPronto, a credencial foi guardada (a senha não fica gravada).")
    print("UID do atendente (vai nas regras do banco): " + r["localId"])


def cmd_status(_):
    cred = ler(CRED)
    if not cred:
        return print("Atendente ainda sem login. O Juan roda uma vez: duvidas-hangar.py login")
    print(f"Atendente logado. UID: {cred.get('uid')}")
    try:
        n = len(pendentes())
        print(f"Banco respondendo. Dúvidas esperando resposta: {n}")
    except RuntimeError as e:
        print(f"O banco recusou a leitura ({e}). Provável: o UID acima ainda não está nas regras publicadas.")


def cmd_pendentes(a):
    l = pendentes()
    if a.json:
        return print(json.dumps(l, ensure_ascii=False, indent=1))
    if not l:
        return print("Nenhuma dúvida esperando resposta.")
    print(f"{len(l)} dúvida(s) esperando a resposta do Juan:\n")
    print("\n\n".join(mostrar(d) for d in l))


def cmd_ver(a):
    print(mostrar(achar(a.codigo), completo=True))


def texto_de(v):
    t = sys.stdin.read() if v == "-" else v
    return " ".join(t.split()) if "\n" not in t.strip() else "\n".join(l.rstrip() for l in t.strip().splitlines())


def cmd_responder(a):
    d = achar(a.codigo)
    if d.get("status") == "respondida" and not a.de_novo:
        sair("Essa dúvida já foi respondida. Para trocar a resposta, repita com --de-novo.")
    resp = texto_de(a.texto).strip()
    if len(resp) < 2 or len(resp) > 4000:
        sair("A resposta precisa ter entre 2 e 4000 caracteres.")
    na_faq = not a.sem_faq
    perg = " ".join((a.pergunta_faq or d.get("pergunta", "")).split())[:300]
    if na_faq and len(perg) < 3:
        sair("Faltou a pergunta para as Perguntas frequentes (--pergunta-faq).")
    campos = {"resposta": resp, "status": "respondida", "respondidaEm": agora(), "lida": False, "naFaq": na_faq}
    fs(f"/duvidas/{d['id']}", {"fields": {k: para_valor(v) for k, v in campos.items()}}, "PATCH",
       {"updateMask.fieldPaths": list(campos), "currentDocument.exists": "true"})
    print(f"Resposta gravada no site para {d.get('nome') or 'quem perguntou'} (só essa pessoa vê, em Minhas dúvidas).")
    if na_faq:
        r = fs("/faq", {"fields": {"pergunta": para_valor(perg), "resposta": para_valor(resp), "em": para_valor(agora())}}, "POST")
        print(f"Publicada nas Perguntas frequentes, sem nome (código {r['name'].rsplit('/', 1)[-1][:6]}): {perg}")


def cmd_faq(a):
    if a.acao == "listar":
        r = fs("/faq", params={"pageSize": 300})
        l = sorted((de_doc(x) for x in r.get("documents", [])), key=lambda d: d.get("em") or "")
        if not l:
            return print("Ainda não há perguntas frequentes.")
        print("\n\n".join(f"[{d['id'][:6]}] {d.get('pergunta', '')}\n{d.get('resposta', '')}" for d in l))
    elif a.acao == "adicionar":
        if not a.pergunta or not a.resposta:
            sair("Use: faq adicionar --pergunta \"...\" --resposta \"...\"")
        r = fs("/faq", {"fields": {"pergunta": para_valor(" ".join(a.pergunta.split())[:300]), "resposta": para_valor(texto_de(a.resposta).strip()[:4000]), "em": para_valor(agora())}}, "POST")
        print("Publicada nas Perguntas frequentes: código " + r["name"].rsplit("/", 1)[-1][:6])
    elif a.acao == "remover":
        if not a.codigo:
            sair("Use: faq remover CODIGO")
        r = fs("/faq", params={"pageSize": 300})
        achados = [x for x in r.get("documents", []) if x["name"].rsplit("/", 1)[-1].startswith(a.codigo)]
        if len(achados) != 1:
            sair("Código não encontrado (ou serve para mais de uma). Rode: faq listar")
        fs("/faq/" + achados[0]["name"].rsplit("/", 1)[-1], metodo="DELETE")
        print("Tirada das Perguntas frequentes.")


def aviso(l, titulo):
    partes = [titulo, ""]
    for d in l:
        ia = (d.get("respostaIA") or "").strip()
        partes += [f"De {d.get('nome') or 'alguém da turma'}, {hora(d.get('pedidaEm') or d.get('em'))} (código {d['id'][:6]})",
                   f"Pergunta: {d.get('pergunta', '')}",
                   ("O atendente respondeu: " + (ia[:350] + ("…" if len(ia) > 350 else ""))) if ia else "O atendente não soube responder.", ""]
    partes.append("Me responda aqui que eu gravo no site para quem perguntou. Se quiser, peça \"triagem das dúvidas\" e eu trago um rascunho de cada uma.")
    return "\n".join(partes)


def cmd_novas(_):
    if not ler(CRED):
        return  # ainda sem login: silêncio
    try:
        l = pendentes()
    except (RuntimeError, OSError):
        return  # sem rede ou regras ainda sem o UID: tenta na próxima
    est = ler(ESTADO, {}) or {}
    vistas = set(est.get("avisadas", []))
    novas = [d for d in l if d["id"] not in vistas]
    est["avisadas"] = [d["id"] for d in l]  # só guarda as que ainda esperam
    gravar(ESTADO, est)
    if novas:
        print(aviso(novas, f"❓ {'Dúvida nova' if len(novas) == 1 else str(len(novas)) + ' dúvidas novas'} no Hangar da Turma"))


def cmd_lembrete(_):
    if not ler(CRED):
        return
    try:
        l = [d for d in pendentes() if horas_desde(d.get("pedidaEm") or d.get("em") or "") >= 20]
    except (RuntimeError, OSError):
        return
    if l:
        print(aviso(l, f"⏳ {len(l)} dúvida(s) do Hangar esperando resposta há mais de 20 horas"))


def main():
    p = argparse.ArgumentParser(description="Dúvidas do Hangar da Turma (lado da Claudia)")
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("login").set_defaults(f=cmd_login)
    s.add_parser("status").set_defaults(f=cmd_status)
    x = s.add_parser("pendentes"); x.add_argument("--json", action="store_true"); x.set_defaults(f=cmd_pendentes)
    x = s.add_parser("ver"); x.add_argument("codigo"); x.set_defaults(f=cmd_ver)
    x = s.add_parser("responder"); x.add_argument("codigo"); x.add_argument("--texto", required=True, help='resposta; "-" lê da entrada padrão')
    x.add_argument("--pergunta-faq"); x.add_argument("--sem-faq", action="store_true"); x.add_argument("--de-novo", action="store_true"); x.set_defaults(f=cmd_responder)
    x = s.add_parser("faq"); x.add_argument("acao", choices=["listar", "adicionar", "remover"]); x.add_argument("codigo", nargs="?")
    x.add_argument("--pergunta"); x.add_argument("--resposta"); x.set_defaults(f=cmd_faq)
    s.add_parser("novas").set_defaults(f=cmd_novas)
    s.add_parser("lembrete").set_defaults(f=cmd_lembrete)
    a = p.parse_args()
    try:
        a.f(a)
    except RuntimeError as e:
        sair(f"O banco recusou ou falhou: {e}")


if __name__ == "__main__":
    main()
