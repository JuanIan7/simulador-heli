# Esquilo (AS350) vermelho em vetor: vista lateral e vista de frente.
# Cada função devolve um <symbol>; "s" é o sufixo do id, "pa" a cor das pás e esquis.
V, VE, VC = '#C9151C', '#8C0E14', '#E8474B'      # vermelho, sombra, brilho
VIDRO, FAIXA, AMARELO, CUBO = '#16222E', '#F5F2EE', '#F2B705', '#8B8178'

CORPO_L = ('M352 218 C398 220 436 246 454 276 C466 296 458 314 438 318 L300 322 '
           'C274 322 252 310 240 294 C226 278 206 270 186 268 L82 258 Q71 256 71 250 Q72 244 82 243 '
           'L226 235 C226 216 238 203 258 202 L318 200 C334 200 346 208 352 218Z')
FAIXA_L = 'M60 250 L226 246 C256 250 262 296 304 298 L474 293'


def lado(s, pa):
    return f'''<symbol id="e-lado-{s}" viewBox="0 0 512 512">
<clipPath id="cl-{s}"><path d="{CORPO_L}"/></clipPath>
<clipPath id="cs-{s}"><path d="{CORPO_L}" transform="translate(0 -9)"/></clipPath>
<path d="M318 161 L486 167 Q494 170 486 174 L318 172Z M318 161 L40 169 Q32 172 40 177 L318 172Z" fill="{pa}"/>
<rect x="312" y="166" width="12" height="38" fill="{CUBO}"/>
<rect x="303" y="186" width="30" height="8" rx="3" fill="{CUBO}"/>
<rect x="299" y="155" width="38" height="14" rx="6" fill="{CUBO}"/>
<path d="M98 247 L64 176 Q62 170 69 170 L88 170 Q94 170 97 175 L140 243Z" fill="{V}"/>
<path d="M98 247 L64 176 Q62 170 69 170 L76 170 L112 246Z" fill="{VE}"/>
<path d="M96 257 L84 290 Q83 294 88 294 L100 294 Q104 294 106 290 L124 260Z" fill="{VE}"/>
<path d="M92 294 L74 302" stroke="{pa}" stroke-width="5" stroke-linecap="round"/>
<path d="{CORPO_L}" fill="{VE}"/>
<g clip-path="url(#cl-{s})">
  <path d="{CORPO_L}" fill="{V}" clip-path="url(#cs-{s})"/>
  <path d="M232 226 L350 222" stroke="{VE}" stroke-width="2.5" fill="none"/>
  <path d="M256 208 L318 206 C332 206 342 212 348 220" stroke="{VC}" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="{FAIXA_L}" stroke="{FAIXA}" stroke-width="8" fill="none"/>
  <path d="{FAIXA_L}" stroke="{AMARELO}" stroke-width="3" fill="none" transform="translate(0 8)"/>
  <path d="M309 286 V324 M371 286 L376 322" stroke="{VE}" stroke-width="2.5" fill="none"/>
</g>
<rect x="264" y="209" width="30" height="8" rx="4" fill="{VE}"/>
<ellipse cx="238" cy="216" rx="8" ry="5" fill="#2A211D"/>
<g fill="{VIDRO}">
  <path d="M360 228 C396 232 428 252 444 276 Q448 284 440 285 L384 285 Q378 285 376 279Z"/>
  <path d="M318 228 L346 228 Q351 228 353 233 L366 279 Q367 285 361 285 L318 285 Q313 285 313 280 L313 233 Q313 228 318 228Z"/>
  <path d="M274 230 L300 228 Q305 228 305 233 L305 280 Q305 285 300 285 L278 285 Q272 285 271 279 L268 240 Q268 231 274 230Z"/>
</g>
<g fill="#fff" opacity=".17">
  <path d="M388 240 L402 247 L396 285 L382 285Z"/>
  <path d="M326 228 L338 228 L334 285 L322 285Z"/>
</g>
<path d="M150 246 L198 243 Q203 246 198 251 L150 254 Q145 250 150 246Z" fill="{VE}"/>
<g transform="rotate(-22 66 250)"><rect x="60" y="210" width="12" height="80" rx="6" fill="{pa}"/></g>
<circle cx="66" cy="250" r="6" fill="{CUBO}"/>
<path d="M306 320 L296 352 M392 319 L402 352" stroke="{pa}" stroke-width="7" stroke-linecap="round" fill="none"/>
<path d="M246 355 L430 355 Q449 355 457 338" stroke="{pa}" stroke-width="9" stroke-linecap="round" fill="none"/>
</symbol>'''


CORPO_F = 'M256 208 C318 208 352 236 356 284 C358 318 330 342 256 342 C182 342 154 318 156 284 C160 236 194 208 256 208Z'


def frente(s, pa):
    return f'''<symbol id="e-frente-{s}" viewBox="0 0 512 512">
<clipPath id="fl-{s}"><path d="{CORPO_F}"/></clipPath>
<clipPath id="fs-{s}"><path d="{CORPO_F}" transform="translate(0 -10)"/></clipPath>
<path d="M256 149 L42 160 Q34 163 42 168 L256 161Z M256 149 L470 160 Q478 163 470 168 L256 161Z" fill="{pa}"/>
<rect x="249" y="156" width="14" height="34" fill="{CUBO}"/>
<rect x="236" y="143" width="40" height="15" rx="6" fill="{CUBO}"/>
<path d="M136 247 L376 247 Q382 250 376 254 L136 254 Q130 250 136 247Z" fill="{VE}"/>
<path d="M212 218 C212 198 230 186 256 186 C282 186 300 198 300 218Z" fill="{V}"/>
<ellipse cx="256" cy="202" rx="24" ry="7" fill="#2A211D"/>
<path d="M210 334 L160 388 M302 334 L352 388" stroke="{pa}" stroke-width="8" stroke-linecap="round" fill="none"/>
<path d="M140 392 L180 392 M332 392 L372 392" stroke="{pa}" stroke-width="12" stroke-linecap="round" fill="none"/>
<path d="{CORPO_F}" fill="{VE}"/>
<g clip-path="url(#fl-{s})">
  <path d="{CORPO_F}" fill="{V}" clip-path="url(#fs-{s})"/>
  <path d="M150 300 H362" stroke="{FAIXA}" stroke-width="8"/>
  <path d="M150 308 H362" stroke="{AMARELO}" stroke-width="3"/>
</g>
<g fill="{VIDRO}">
  <path d="M249 222 C208 224 178 246 172 282 Q172 290 180 290 L249 290Z"/>
  <path d="M263 222 C304 224 334 246 340 282 Q340 290 332 290 L263 290Z"/>
</g>
<g fill="#fff" opacity=".17">
  <path d="M214 236 L228 230 L214 290 L198 290Z"/>
  <path d="M300 232 L312 238 L302 290 L288 290Z"/>
</g>
<circle cx="256" cy="324" r="7" fill="#FFE9A8"/>
</symbol>'''
