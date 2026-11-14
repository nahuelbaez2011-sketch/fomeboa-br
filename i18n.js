
(function(root){
'use strict';
const D={"explore":["🗺️ Explorá São Paulo","🗺️ Explore São Paulo","🗺️ Explore São Paulo"],"intro":["Seleccioná una o varias zonas tocando sus nombres en el mapa y descubrí sus propuestas gastronómicas.","Selecione uma ou mais regiões tocando seus nomes no mapa e descubra suas opções gastronômicas.","Select one or more areas on the map to discover their food and drink scene."],"search":["🔎 Buscar restaurantes, gastronomía o zona...","🔎 Buscar restaurantes, gastronomia ou bairro...","🔎 Search restaurants, food or neighborhoods..."],"navMap":["Mapa","Mapa","Map"],"navRestaurants":["Restaurantes","Restaurantes","Restaurants"],"navOffers":["Ofertas","Ofertas","Offers"],"navAdvertise":["Anunciar","Anunciar","Advertise"],"browse":["Buscar otra zona","Buscar outra região","Find another area"],"districtPlaceholder":["Buscar un distrito, por ejemplo Cambuci","Buscar um distrito, como Cambuci","Search a district, such as Cambuci"],"map":["🗺️ Mapa","🗺️ Mapa","🗺️ Map"],"sat":["🛰️ Satélite","🛰️ Satélite","🛰️ Satellite"],"selected":["📍 Zonas seleccionadas","📍 Regiões selecionadas","📍 Selected areas"],"categoryCounts":["Locales por categoría","Estabelecimentos por categoria","Places by category"],"adArea":["🎁 Ofertas de tu zona","🎁 Ofertas da sua região","🎁 Local offers"],"sort":["Ordenar resultados","Ordenar resultados","Sort results"],"sortLabel":["Orden","Ordenação","Sort by"],"orderName":["Nombre A-Z","Nome A-Z","Name A-Z"],"orderType":["Tipo de local","Tipo de estabelecimento","Place type"],"places":["Locales gastronómicos","Estabelecimentos gastronômicos","Food & drink places"],"more":["Más categorías","Mais categorias","More categories"],"all":["Todos","Todos","All"],"allPlaces":["Todos los locales","Todos os estabelecimentos","All places"],"fav":["♡ Favoritos","♡ Favoritos","♡ Favorites"],"gluten":["Sin gluten · declarado","Sem glúten · declarado","Gluten-free · reported"],"glutenTitle":["¿Qué significa «sin gluten»?","O que significa «sem glúten»?","What does «gluten-free» mean?"],"glutenText":["Los locales señalados tienen opciones sin gluten declaradas en fuentes abiertas. Eso no certifica una cocina exclusiva ni controles contra la contaminación cruzada. Si tenés celiaquía, consultá la preparación con el establecimiento.","Os locais indicados declaram opções sem glúten em fontes abertas. Isso não certifica cozinha exclusiva nem controle de contaminação cruzada. Se você tem doença celíaca, consulte o estabelecimento.","These places report gluten-free options in open data. This does not certify a dedicated kitchen or prevention of cross-contact. If you have celiac disease, confirm preparation practices with the venue."],"promotions":["Promociones","Promoções","Promotions"],"advertiser":["¿Tenés un restaurante?","Você tem um restaurante?","Own a restaurant?"],"promoDemo":["📣 PUBLICIDAD · EJEMPLO","📣 PUBLICIDADE · EXEMPLO","📣 ADVERTISEMENT · EXAMPLE"],"promoTitle":["Tu próxima promoción puede aparecer acá","Sua próxima promoção pode aparecer aqui","Your next promotion could appear here"],"promoDescription":["Ofertas por barrio, descuentos y menús especiales. Este espacio es una demostración: todavía no hay anunciantes ni promociones verificadas.","Ofertas por bairro, descontos e cardápios especiais. Esta área é demonstrativa: ainda não há anunciantes ou promoções verificadas.","Neighborhood offers, discounts and special menus. This is a demo: there are no verified advertisers or offers yet."],"advertiseTitle":["Anunciá en FomeBoa SP","Anuncie no FomeBoa SP","Advertise on FomeBoa SP"],"advertiseText":["Próximamente los negocios podrán publicar promociones locales. La publicidad siempre estará identificada y no cambiará las calificaciones orgánicas.","Em breve, os negócios poderão publicar promoções locais. Os anúncios serão identificados e não afetarão as avaliações orgânicas.","Businesses will soon be able to publish local promotions. Ads will always be labeled and won't affect organic ratings."],"notify":["Avisame cuando esté disponible","Avise-me quando estiver disponível","Let me know when available"],"footer":["FomeBoa SP · Datos de lugares: OpenStreetMap y Overture Maps · Anuncios de demostración","FomeBoa SP · Dados dos locais: OpenStreetMap e Overture Maps · Anúncios demonstrativos","FomeBoa SP · Place data: OpenStreetMap and Overture Maps · Demo ads"],"licenses":["Fuentes y licencias","Fontes e licenças","Sources and licenses"],"kind_restaurant":["Restaurantes","Restaurantes","Restaurants"],"kind_cafe":["Cafeterías","Cafeterias","Cafés"],"kind_bar":["Bares","Bares","Bars"],"kind_bakery":["Panaderías","Padarias","Bakeries"],"kind_pastry":["Pastelerías","Confeitarias","Pastry shops"],"kind_pub":["Pubs","Pubs","Pubs"],"kind_fast_food":["Comida rápida","Lanches","Fast food"],"kind_food_court":["Patios de comidas","Praças de alimentação","Food courts"],"kind_ice_cream":["Heladerías","Sorveterias","Ice cream shops"],"kind_biergarten":["Cervecerías","Cervejarias","Beer gardens"],"kind_confectionery":["Confiterías","Docerias","Confectioneries"],"kind_coffee":["Tiendas de café","Lojas de café","Coffee shops"],"kind_deli":["Delicatessen","Delicatessens","Delis"],"sing_restaurant":["Restaurante","Restaurante","Restaurant"],"sing_cafe":["Cafetería","Cafeteria","Café"],"sing_bar":["Bar","Bar","Bar"],"sing_bakery":["Panadería","Padaria","Bakery"],"sing_pastry":["Pastelería","Confeitaria","Pastry shop"],"sing_pub":["Pub","Pub","Pub"],"sing_fast_food":["Comida rápida","Lanches","Fast food"],"sing_food_court":["Patio de comidas","Praça de alimentação","Food court"],"sing_ice_cream":["Heladería","Sorveteria","Ice cream shop"],"sing_biergarten":["Cervecería","Cervejaria","Beer garden"],"sing_confectionery":["Confitería","Doceria","Confectionery"],"sing_deli":["Delicatessen","Delicatessen","Deli"],"sing_coffee":["Tienda de café","Loja de café","Coffee shop"],"details":["Más información","Mais informações","More information"],"source":["Ver fuente","Ver fonte","View source"],"report":["Reportar cierre o error","Informar fechamento ou erro","Report closure or error"],"googleRating":["★ Buscar puntuación en Google Maps","★ Buscar avaliação no Google Maps","★ Search Google Maps ratings"],"googleVerified":["★ Ver puntuación en Google Maps","★ Ver avaliação no Google Maps","★ View Google Maps rating"],"googleAlt":["Buscar solo por nombre en Google Maps","Buscar somente pelo nome no Google Maps","Search by name only on Google Maps"],"locationUnknown":["Ubicación sin verificar","Localização não verificada","Location unverified"],"addressUnknown":["Dirección sin registrar","Endereço não cadastrado","Address not listed"],"save":["Guardar en favoritos","Salvar nos favoritos","Save to favorites"],"unsave":["Quitar de favoritos","Remover dos favoritos","Remove from favorites"],"selectHint":["Tocá una zona en el mapa para explorar.","Toque em uma região no mapa para explorar.","Tap an area on the map to explore."],"chooseZone":["seleccioná una zona","selecione uma região","select an area"],"visible":["registros visibles","registros visíveis","visible records"],"registered":["registrados","cadastrados","listed"],"partial":["parcial","parcial","partial"],"countsNoZone":["Seleccioná una o varias zonas para ver cantidades por categoría.","Selecione uma ou mais regiões para ver as quantidades por categoria.","Select one or more areas to view category counts."],"countsPending":["Recuento pendiente de cargar. No se interpreta como cero locales.","Contagem ainda não carregada. Isso não significa ausência de locais.","Counts are still loading. This does not mean there are no places."],"countsLoaded":["Recuento de las zonas seleccionadas.","Contagem das regiões selecionadas.","Count for the selected areas."],"countsPartial":["Recuento parcial de las zonas cargadas.","Contagem parcial das regiões carregadas.","Partial count of loaded areas."],"countsTotal":["Total de registros visibles","Total de registros visíveis","Total visible records"],"countsNote":["Sin locales destacados. Los cierres conocidos o reportados se excluyen; la apertura actual de los demás puede no estar confirmada.","Sem estabelecimentos em destaque. Fechamentos conhecidos são excluídos; os demais podem não estar com funcionamento confirmado.","No featured places. Known closures are excluded; operating status may not be verified for others."],"noAds":["Por ahora no hay anunciantes reales en estas zonas.","Ainda não há anunciantes reais nessas regiões.","There are no real advertisers in these areas yet."],"adsIntro":["Elegí una o varias zonas para ver anuncios locales (todavía en demostración).","Selecione uma ou mais regiões para ver anúncios locais (demonstração).","Select one or more areas to see local ads (demo only)."],"adsDemo":["PUBLICIDAD · EJEMPLO FICTICIO","PUBLICIDADE · EXEMPLO FICTÍCIO","AD · FICTIONAL EXAMPLE"],"adsFake":["Esta oferta no existe y no se puede canjear.","Esta oferta é fictícia e não pode ser utilizada.","This offer is fictional and cannot be redeemed."],"morePlaces":["Mostrar más locales","Mostrar mais estabelecimentos","Show more places"],"tools":["Herramientas del catálogo","Ferramentas do catálogo","Catalog tools"],"toolAll":["Explorar catálogo completo","Explorar catálogo completo","Explore full catalog"],"toolAdd":["Sugerir un local que falta","Sugerir estabelecimento ausente","Suggest a missing place"],"toolImport":["Importar lista de locales","Importar lista de estabelecimentos","Import a list of places"],"toolExport":["Descargar propuestas pendientes","Baixar sugestões pendentes","Download pending suggestions"],"authSoon":["Cuenta · próximamente","Conta · em breve","Account · coming soon"],"authCreate":["Crear cuenta","Criar conta","Create account"],"authProfile":["Mi perfil","Meu perfil","My profile"],"authLogin":["Iniciar sesión","Entrar","Sign in"],"authReset":["Recuperar contraseña","Recuperar senha","Reset password"],"authName":["Nombre público","Nome público","Public name"],"authEmail":["Correo electrónico","E-mail","Email"],"authPassword":["Contraseña","Senha","Password"],"authNewPassword":["Nueva contraseña","Nova senha","New password"],"authChange":["Cambiar contraseña","Alterar senha","Change password"],"authLogout":["Cerrar sesión","Sair","Sign out"],"authClose":["Cerrar","Fechar","Close"],"authHelp":["Estamos preparando el registro. Falta conectar la base de datos segura.","Estamos preparando o cadastro. Falta conectar um banco de dados seguro.","We're setting up sign-up. A secure database connection is still needed."],"authHelp2":["Podés seguir explorando locales sin crear una cuenta.","Você pode explorar os locais sem criar uma conta por enquanto.","You can keep browsing places while registration is being set up."],"authShared":["Tu perfil será el mismo en web, Android e iPhone.","Seu perfil será o mesmo na web, Android e iPhone.","Your profile will be the same on web, Android and iPhone."],"gateTitle":["Bienvenido a FomeBoa SP","Bem-vindo ao FomeBoa SP","Welcome to FomeBoa SP"],"gateIntro":["Registrate o iniciá sesión para descubrir la gastronomía de São Paulo.","Cadastre-se ou entre para descobrir a gastronomia de São Paulo.","Sign up or sign in to discover São Paulo's food scene."],"gateSignup":["Crear mi cuenta","Criar minha conta","Create my account"],"gateLogin":["Ya tengo cuenta","Já tenho conta","I have an account"],"gateWait":["Verificando tu sesión...","Verificando sua sessão...","Checking your session..."],"gateHelp":["Tu perfil reúne tus valoraciones, niveles y aportes. No compartimos listas de correos con anunciantes.","Seu perfil reúne avaliações, níveis e contribuições. Não compartilhamos listas de e-mails com anunciantes.","Your profile holds your reviews, levels and contributions. We don't share email lists with advertisers."],"kind_other":["Otros locales","Outros estabelecimentos","Other places"],"authMsgProcessing":["Procesando...","Processando...","Processing..."],"authMsgLogging":["Sesión iniciada.","Sessão iniciada.","Signed in successfully."],"authMsgConfirm":["Revisá tu correo y confirmá la cuenta para poder ingresar.","Confira seu e-mail e confirme a conta para entrar.","Check your email and confirm the account before signing in."],"authMsgReset":["Si existe una cuenta con ese correo, recibirás un enlace.","Se existir uma conta com esse e-mail, você receberá um link.","If an account exists for that email, you will receive a link."],"authMsgName":["Ingresá un nombre de 2 a 40 caracteres.","Digite um nome de 2 a 40 caracteres.","Enter a name between 2 and 40 characters."],"authMsgSession":["No se pudo confirmar la sesión. Volvé a ingresar.","Não foi possível confirmar sua sessão. Entre novamente.","Your session could not be verified. Please sign in again."],"authMsgSignedOut":["Sesión cerrada.","Sessão encerrada.","Signed out."],"authMsgPassword":["Contraseña actualizada.","Senha atualizada.","Password updated."],"authMsgPasswordNew":["Ingresá una contraseña nueva.","Digite uma nova senha.","Enter a new password."],"authMsgLocked":["Ingresá o creá una cuenta para continuar.","Entre ou crie uma conta para continuar.","Sign in or create an account to continue."],"authMsgFail":["No se pudo verificar la sesión. Probá nuevamente.","Não foi possível verificar a sessão. Tente novamente.","Your session could not be verified. Please try again."]};
const supported=['es','pt','en'];
let lang='es';try{const value=localStorage.getItem('fomeboa-language');if(supported.includes(value))lang=value}catch(_){}
const L=k=>D[k]?.[supported.indexOf(lang)]||k;
const id=s=>document.getElementById(s), q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
function put(n,v){if(n&&v!==undefined&&n.textContent!==v)n.textContent=v}
function setLang(value){if(!supported.includes(value))return;lang=value;try{localStorage.setItem('fomeboa-language',value)}catch(_){}translate();root.FomeBoaAuth?.refresh?.();}
function setText(sel,key){put(q(sel),L(key))}
function cats(type,singular=false){return L((singular?'sing_':'kind_')+type)}
function translate(){
document.documentElement.lang=lang==='pt'?'pt-BR':lang;
if(id('fomeboaLanguage'))id('fomeboaLanguage').value=lang;
if(id('fomeboaGateLanguage'))id('fomeboaGateLanguage').value=lang;
const staticLabels=[
['.explore-heading h2','explore'],['.map-panel>.muted','intro'],['header .nav a[href="#explorar"]','navMap'],['header .nav a[href="#restaurantes"]','navRestaurants'],['header .nav a[href="#promociones"]','navOffers'],['header .nav a[href="#anunciar"]','navAdvertise'],
['.browse-zones>summary','browse'],['[data-mapstyle="street"]','map'],['[data-mapstyle="satellite"]','sat'],
['.zone-restaurants>summary>span:first-child','categoryCounts'],['.ads-panel>h2','adArea'],['.filter-accordion>summary','sort'],['.filter-content label[for="order"]','sortLabel'],
['#order option[value="name"]','orderName'],['#order option[value="type"]','orderType'],['.gluten-filter span:last-child','gluten'],
['.gluten-help>summary','glutenTitle'],['.gluten-help>p','glutenText'],['#promociones','promotions'],['#anunciar','advertiser'],
['#promociones+.promo strong','promoDemo'],['#promociones+.promo h3','promoTitle'],['#promociones+.promo p','promoDescription'],
['#anunciar+.promo strong','advertiseTitle'],['#anunciar+.promo p','advertiseText'],['#adContact','notify'],
['#catalogLicenseLink','licenses'],['#catalogTools>summary','tools'],
['#catalogAll','toolAll'],['#catalogAdd','toolAdd'],['#catalogImport','toolImport'],['#catalogExport','toolExport']];
for(const [selector,key] of staticLabels)setText(selector,key);
if(id('search'))id('search').placeholder=L('search');
if(id('zoneFinder'))id('zoneFinder').placeholder=L('districtPlaceholder');
const title=id('restaurantes');if(title&&title.firstChild?.nodeType===3)title.firstChild.textContent=L('places')+' ';
const zoneTitle=q('.selection-box>h2');if(zoneTitle&&zoneTitle.firstChild?.nodeType===3)zoneTitle.firstChild.textContent=L('selected')+' (';
qa('[data-type]').forEach(button=>put(button,button.dataset.type?cats(button.dataset.type):L('all')));
qa('#category option').forEach(o=>put(o,o.value?cats(o.value):L('allPlaces')));
put(id('allBtn'),L('allPlaces'));put(id('favBtn'),L('fav'));
const cat=id('category')?.value;put(id('extraCategoryLabel'),cat&&!['restaurant','cafe','bar','bakery','pastry'].includes(cat)?cats(cat):L('more'));
const footer=q('footer');if(footer){const first=[...footer.childNodes].find(n=>n.nodeType===3);if(first)first.textContent=L('footer')+' ';}
localizeCounts();localizeCards();localizeAds();localizeAuth();localizeTools();
}
function localizeCounts(){
const panel=id('nearbyPreview');
if(panel){
const first=panel.querySelector('p.mini-note');if(first){
 const text=first.textContent;
 if(/Seleccioná una o varias zonas|Selecione uma ou mais regiões|Select one or more areas/.test(text))put(first,L('countsNoZone'));
 else if(/Recuento pendiente|Contagem ainda não|Counts are still/.test(text))put(first,L('countsPending'));
 else if(/Recuento parcial|Contagem parcial|Partial count/.test(text))put(first,L('countsPartial'));
 else if(/Recuento de las zonas|Contagem das regiões|Count for the/.test(text))put(first,L('countsLoaded'));
}
qa('#nearbyPreview .venue-count-list>div dt').forEach(dt=>{
 const raw=dt.textContent.trim();if(!dt.dataset.type){
 for(const k of ['restaurant','cafe','bar','bakery','pastry','pub','fast_food','food_court','ice_cream','biergarten','confectionery','deli','coffee','other']){
 if(supported.some((lng,i)=>D['kind_'+k]?.[i]===raw)){dt.dataset.type=k;break}
 }
}
if(dt.dataset.type)put(dt,cats(dt.dataset.type));
});
setText('#nearbyPreview .venue-count-total>span','countsTotal');
const paragraphs=qa('#nearbyPreview>p.mini-note');const last=paragraphs[paragraphs.length-1];if(last&&/Sin locales destacados|Sem estabelecimentos em destaque|No featured places/.test(last.textContent))put(last,L('countsNote'));
}
const selected=id('selectionChips');if(selected){const hint=selected.querySelector('.mini-note');if(hint)put(hint,L('selectHint'));}
const count=id('total');if(count){let s=count.textContent;
 if(/seleccioná una zona|selecione uma região|select an area/i.test(s))put(count,'('+L('chooseZone')+')');
 else if(/registros visibles|registros visíveis|visible records/.test(s))put(count,s.replace(/registros visibles|registros visíveis|visible records/,L('visible')));}
const badge=id('zoneCountBadge');if(badge&&badge.textContent){const s=badge.textContent;const number=(s.match(/[\d,.]+/)||[])[0];if(number)put(badge,number+' '+L('registered')+(/parcial|partial/.test(s)?' · '+L('partial'):''));}
}
function localizeCards(){
qa('#cards .compact-card').forEach(card=>{
const type=card.dataset.type;const tag=card.querySelector('.tag');
if(type&&tag){const s=tag.textContent;const split=s.indexOf(' · ');put(tag,cats(type,true)+(split>=0?s.slice(split):''));}
const detail=card.querySelector('.compact-details>summary');put(detail,L('details'));
const fav=card.querySelector('.catalog-fav');if(fav){const label=L(fav.getAttribute('aria-pressed')==='true'?'unsave':'save');fav.title=label;fav.setAttribute('aria-label',label);}
const maps=card.querySelector('.compact-google');if(maps){const key=maps.dataset.verified==='true'?'googleVerified':'googleRating';put(maps,L(key)+' ↗');}
const missing=card.querySelector('.compact-no-map');if(missing)put(missing,L('locationUnknown'));
const p=qaFrom(card,'.compact-extra>p').find(n=>/^(Fuente:|Fonte:|Source:)/.test(n.textContent));
if(p){const found=p.textContent.match(/^(?:Fuente:|Fonte:|Source:)\s*([^.]+)\./);if(found)put(p,(lang==='en'?'Source: ':lang==='pt'?'Fonte: ':'Fuente: ')+found[1]+'. '+(lang==='en'?'Operating status not verified.':lang==='pt'?'Funcionamento não verificado.':'Estado de apertura no verificado.'));}
const gluten=card.querySelector('.gluten-mark');
if(gluten){
 const verified=gluten.classList.contains('gluten-mark-verified');
 const text=verified?(lang==='en'?'Gluten-free · verified':lang==='pt'?'Sem glúten · verificado':'Sin gluten · verificado'):(lang==='en'?'Gluten-free options · reported':lang==='pt'?'Opções sem glúten · não verificadas':'Opciones sin gluten · no verificado');
 put(gluten.querySelector('span:last-child'),text);
 const note=verified?(lang==='en'?'Documented verification for this venue; confirm current practices.':lang==='pt'?'Documentação específica revisada; confirme os procedimentos atuais.':'Documentación específica revisada; confirmá los procedimientos actuales.'):(lang==='en'?'Source-reported options; NOT proof of celiac-safe preparation.':lang==='pt'?'Opções declaradas na fonte; NÃO confirmam segurança para celíacos.':'Opciones declaradas por la fuente; NO certifican preparación segura para celíacos.');
 gluten.title=note;gluten.setAttribute('aria-label',text+'. '+note);
}
const addr=card.querySelector('.compact-address');if(addr&&supported.some((_,i)=>D.addressUnknown[i]===addr.textContent))put(addr,L('addressUnknown'));
qaFrom(card,'.compact-extra a').forEach(a=>{
 if(/^(Ver fuente|Ver fonte|View source)$/.test(a.textContent))put(a,L('source'));
 if(/^(Reportar cierre|Informar fechamento|Report closure)/.test(a.textContent))put(a,L('report'));
 if(/^(Buscar solo por nombre|Buscar somente pelo nome|Search by name only)/.test(a.textContent))put(a,L('googleAlt'));
});
});
}
function qaFrom(root,selector){return [...root.querySelectorAll(selector)]}
function localizeAds(){
const scope=id('adScope');
if(scope){
const areas=qa('#selectionChips [data-remove]').map(x=>x.dataset.remove).filter(Boolean);
const txt=areas.join(' + ');
put(scope,txt?(lang==='en'?'Promotions for '+txt+'. The following examples are NOT real offers.':lang==='pt'?'Promoções de '+txt+'. Os exemplos abaixo NÃO são ofertas reais.':'Solo promociones de '+txt+'. Los ejemplos siguientes NO son ofertas reales.'):L('adsIntro'));
}
qa('#localAds .ad-empty').forEach(n=>put(n,L('noAds')));qa('#localAds .ad-label').forEach(n=>put(n,L('adsDemo')));qa('#localAds .notice').forEach(n=>put(n,L('adsFake')));
}
function localizeTools(){
 const box=id('catalogInfo');if(!box)return;
 const count=box.textContent.match(/^\d+(?:[.,]\d+)*/)?.[0];if(!count)return;
 const text=lang==='en'?count+' saved places in the urban area. Sources: OpenStreetMap and Overture Maps. Operating status not verified.':lang==='pt'?count+' estabelecimentos cadastrados na área urbana. Fontes: OpenStreetMap e Overture Maps. Funcionamento não verificado.':count+' locales guardados en el área urbana. Fuentes: OpenStreetMap y Overture Maps. Estado de apertura no verificado.';
 put(box,text);
}
function localizeAuth(){
const button=id('fomeboaAccountButton');
if(button){
 const text=button.textContent;
 const profile=/Mi perfil|Meu perfil|My profile/.test(text);
 const waiting=/próximamente|em breve|coming soon/.test(text);
 put(button,L(profile?'authProfile':waiting?'authSoon':'authCreate'));
}
const formTitle=id('fomeboaAuthTitle');if(formTitle){
 const value=formTitle.textContent;
 put(formTitle,L(/Cambiar contraseña|Alterar senha|Change password/.test(value)?'authChange':/Crear cuenta|Criar conta|Create account/.test(value)?'authCreate':/Iniciar sesión|Entrar|Sign in/.test(value)?'authLogin':/Recuperar|Recover|Reset/.test(value)?'authReset':'authProfile'));
}
qa('#fomeboaAuthModes [data-auth-mode]').forEach(n=>put(n,L(({signup:'authCreate',login:'authLogin',reset:'authReset'})[n.dataset.authMode])));
const labelMap={fomeboaName:'authName',fomeboaEmail:'authEmail',fomeboaPassword:'authPassword',fomeboaNewPassword:'authNewPassword'};
for(const [field,key] of Object.entries(labelMap)){const label=id(field)?.closest('label');if(label){const node=[...label.childNodes].find(n=>n.nodeType===3);if(node)node.textContent=L(key);}}
put(id('fomeboaLogout'),L('authLogout'));
const submit=id('fomeboaAuthSubmit');if(submit)put(submit,L(id('fomeboaName')?.required?'authCreate':id('fomeboaPassword')?.required?'authLogin':'authReset'));
put(q('#fomeboaNewPasswordForm button'),L('authChange'));
put(q('#fomeboaNotReady p:first-child'),L('authHelp'));put(q('#fomeboaNotReady p:nth-child(2)'),L('authHelp2'));
put(q('#fomeboaSignedIn .fomeboa-auth-small'),lang==='en'?'Your account is shared across the website, Android and iPhone.':lang==='pt'?'Sua conta é compartilhada na web, Android e iPhone.':'Tu cuenta funciona en la web, Android y iPhone.');
put(id('fomeboaGateTitle'),L('gateTitle'));put(id('fomeboaGateText'),L('gateIntro'));
put(id('fomeboaGateSignup'),L('gateSignup'));put(id('fomeboaGateLogin'),L('gateLogin'));put(id('fomeboaGateHelp'),L('gateHelp'));
if(id('fomeboaGateStatus')&&/Verificando tu sesión|Verificando sua sessão|Checking your session/.test(id('fomeboaGateStatus').textContent))put(id('fomeboaGateStatus'),L('gateWait'));
}
function mount(){id('fomeboaLanguage')?.addEventListener('change',event=>setLang(event.target.value));id('fomeboaGateLanguage')?.addEventListener('change',event=>setLang(event.target.value));translate();}
root.FomeBoaI18n=Object.freeze({get lang(){return lang},t:L,category:cats,translate,setLang,localizeAuth});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(typeof globalThis!=='undefined'?globalThis:window);
