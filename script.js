const STORAGE_KEY = "myLinksData_v1";
const $ = (id) => document.getElementById(id);
const state = loadData();
let pendingImport = null;
let activeCategory = "すべて";
let toastTimer;

function defaultData(){return {links:[],categories:["仕事","学習","趣味","その他"],settings:{font:"medium",card:"medium",bg:"#111318",cardColor:"#20232b"}}}
function loadData(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&Array.isArray(saved.links)&&Array.isArray(saved.categories))return {...defaultData(),...saved,settings:{...defaultData().settings,...(saved.settings||{})}}}
  catch(e){console.warn("保存データを読み込めませんでした",e)}
  return defaultData();
}
function saveData(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){showToast("保存できませんでした。容量を確認してください。")}}
function uid(){return "link_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function showToast(message){const t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2300)}
function escapeHTML(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeUrl(value){try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}}
function applySettings(){document.body.className=`font-${state.settings.font||"medium"} card-${state.settings.card||"medium"}`;document.documentElement.style.setProperty("--bg",state.settings.bg||"#111318");document.documentElement.style.setProperty("--card",state.settings.cardColor||"#20232b");$("fontSetting").value=state.settings.font||"medium";$("cardSetting").value=state.settings.card||"medium";$("bgSetting").value=state.settings.bg||"#111318";$("cardColorSetting").value=state.settings.cardColor||"#20232b"}
function render(){
  applySettings();
  const query=$("searchInput").value.trim().toLowerCase();
  const matches=state.links.filter(l=>{const hay=[l.title,l.url,l.description,l.memo,...(l.categories||[])].join(" ").toLowerCase();return !query||hay.includes(query)});
  const sorted=[...matches].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const favorites=sorted.filter(l=>l.favorite);
  $("favoriteCount").textContent=`${favorites.length}件`;
  $("favoritesGrid").innerHTML=favorites.map(cardHTML).join("");
  $("emptyFavorites").hidden=favorites.length>0;
  let list=sorted.filter(l=>!query&&activeCategory!=="すべて"? (l.categories||[]).includes(activeCategory):true);
  $("listHeading").textContent=query?"検索結果":activeCategory==="すべて"?"すべてのリンク":activeCategory;
  $("linkCount").textContent=`${list.length}件`;
  $("linksGrid").innerHTML=list.map(cardHTML).join("");
  $("emptyLinks").hidden=list.length>0;
  $("categoryNav").innerHTML=["すべて",...state.categories].map(c=>`<button class="${activeCategory===c?"active":""}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
  document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.category;render()}));
  document.querySelectorAll(".link-card").forEach(card=>{
    card.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",card.dataset.id);e.dataTransfer.effectAllowed="move"});
    card.addEventListener("dragover",e=>{e.preventDefault();card.classList.add("drag-over")});
    card.addEventListener("dragleave",()=>card.classList.remove("drag-over"));
    card.addEventListener("drop",e=>{e.preventDefault();card.classList.remove("drag-over");reorder(e.dataTransfer.getData("text/plain"),card.dataset.id)});
  });
  document.querySelectorAll("[data-fav]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const l=findLink(b.dataset.fav);if(l){l.favorite=!l.favorite;saveData();render()}}));
  document.querySelectorAll("[data-menu]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();$("menu_"+b.dataset.menu).classList.toggle("open")}));
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openEdit(b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteLink(b.dataset.delete)));
}
function cardHTML(l){
  const image=safeUrl(l.image||"");
  return `<article class="link-card" draggable="true" data-id="${escapeHTML(l.id)}">
    <div class="card-tools"><button class="favorite" data-fav="${escapeHTML(l.id)}" title="お気に入り">${l.favorite?"★":"☆"}</button><button data-menu="${escapeHTML(l.id)}" title="メニュー">⋯</button></div>
    <div class="card-menu" id="menu_${escapeHTML(l.id)}"><button data-edit="${escapeHTML(l.id)}">編集</button><button data-delete="${escapeHTML(l.id)}">削除</button></div>
    <a class="card-open" href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer">
      ${image?`<img class="card-image" src="${escapeHTML(image)}" alt="" loading="lazy" onerror="this.remove()">`:""}
      <div class="card-content"><p class="card-title">${escapeHTML(l.title)}</p>${l.description?`<p class="card-description">${escapeHTML(l.description)}</p>`:""}<div class="tag-row">${(l.categories||[]).map(c=>`<span class="tag">${escapeHTML(c)}</span>`).join("")}</div></div>
    </a></article>`;
}
function findLink(id){return state.links.find(l=>l.id===id)}
function reorder(fromId,toId){if(!fromId||!toId||fromId===toId)return;const a=state.links.findIndex(l=>l.id===fromId),b=state.links.findIndex(l=>l.id===toId);if(a<0||b<0)return;const [item]=state.links.splice(a,1);state.links.splice(b,0,item);state.links.forEach((l,i)=>l.order=i);saveData();render();showToast("並び順を保存しました")}
function refreshCategoryOptions(selected=[]){$("categoryInput").innerHTML=state.categories.map(c=>`<option value="${escapeHTML(c)}" ${selected.includes(c)?"selected":""}>${escapeHTML(c)}</option>`).join("")}
function openNew(){ $("linkForm").reset();$("editId").value="";$("linkDialogTitle").textContent="リンクを追加";$("fetchMessage").textContent="";refreshCategoryOptions();$("linkDialog").showModal()}
function openEdit(id){const l=findLink(id);if(!l)return;$("linkForm").reset();$("editId").value=id;$("linkDialogTitle").textContent="リンクを編集";$("urlInput").value=l.url;$("titleInput").value=l.title;$("imageInput").value=l.image||"";$("descriptionInput").value=l.description||"";$("memoInput").value=l.memo||"";$("fetchMessage").textContent="";refreshCategoryOptions(l.categories||[]);$("linkDialog").showModal()}
function deleteLink(id){const l=findLink(id);if(!l)return;if(!confirm(`「${l.title}」を削除しますか？`))return;state.links=state.links.filter(x=>x.id!==id);saveData();render();showToast("削除しました")}
$("addBtn").addEventListener("click",openNew);
$("searchInput").addEventListener("input",render);
$("settingsBtn").addEventListener("click",()=>{$("settingsDialog").showModal();renderCategoryManager()});
document.querySelectorAll(".close-dialog").forEach(b=>b.addEventListener("click",()=>b.closest("dialog").close()));
$("linkForm").addEventListener("submit",e=>{e.preventDefault();const url=safeUrl($("urlInput").value.trim());if(!url){showToast("http:// または https:// のURLを入力してください");return}
  const id=$("editId").value;const old=id?findLink(id):null;const selected=[...$("categoryInput").selectedOptions].map(o=>o.value);
  const entry={id:id||uid(),url,title:$("titleInput").value.trim()||url,image:safeUrl($("imageInput").value.trim())||"",categories:selected,description:$("descriptionInput").value.trim(),memo:$("memoInput").value.trim(),favorite:old?.favorite||false,createdAt:old?.createdAt||Date.now(),order:old?.order??state.links.length};
  if(old)Object.assign(old,entry);else state.links.unshift(entry);saveData();$("linkDialog").close();render();showToast("保存しました");
});
$("fetchTitleBtn").addEventListener("click",async()=>{const url=safeUrl($("urlInput").value.trim());if(!url){showToast("先にURLを入力してください");return}$("fetchMessage").textContent="タイトルを取得しています…";
  try{const response=await fetch(url,{mode:"cors"});const html=await response.text();const doc=new DOMParser().parseFromString(html,"text/html");const title=doc.querySelector('meta[property="og:title"]')?.content||doc.querySelector("title")?.textContent;if(title){$("titleInput").value=title.trim();const image=doc.querySelector('meta[property="og:image"]')?.content;if(image&&!$("imageInput").value)$("imageInput").value=new URL(image,url).href;$("fetchMessage").textContent="取得しました。サイトによっては取得できない場合があります。"}else $("fetchMessage").textContent="タイトルを見つけられませんでした。手入力してください。";
  }catch{$("fetchMessage").textContent="このサイトはブラウザの制限により自動取得できません。タイトルを手入力してください。"}
});
function renderCategoryManager(){$("categoryManager").innerHTML=state.categories.map(c=>`<div class="category-row"><span>${escapeHTML(c)}</span><span><button data-rename="${escapeHTML(c)}">名前変更</button><button data-cat-delete="${escapeHTML(c)}">削除</button></span></div>`).join("")||'<p class="muted small">カテゴリーはありません。</p>';
  document.querySelectorAll("[data-rename]").forEach(b=>b.addEventListener("click",()=>{const old=b.dataset.rename;const next=prompt("新しいカテゴリー名",old);if(!next||!next.trim()||state.categories.includes(next.trim()))return;const name=next.trim();state.categories=state.categories.map(c=>c===old?name:c);state.links.forEach(l=>l.categories=(l.categories||[]).map(c=>c===old?name:c));saveData();renderCategoryManager();render()}));
  document.querySelectorAll("[data-cat-delete]").forEach(b=>b.addEventListener("click",()=>{const name=b.dataset.catDelete;const mode=prompt(`「${name}」を削除します。\n1：このカテゴリーをリンクから外す\n2：カテゴリーを「その他」に移す\n数字を入力してください`,"1");if(!["1","2"].includes(mode))return;state.categories=state.categories.filter(c=>c!==name);if(mode==="2"&&!state.categories.includes("その他"))state.categories.push("その他");state.links.forEach(l=>{l.categories=(l.categories||[]).filter(c=>c!==name);if(mode==="2"&&!(l.categories||[]).length)l.categories=["その他"]});if(activeCategory===name)activeCategory="すべて";saveData();renderCategoryManager();render()}));
}
$("addCategoryBtn").addEventListener("click",()=>{const name=$("newCategoryInput").value.trim();if(!name)return;if(state.categories.includes(name)){showToast("そのカテゴリーはすでにあります");return}state.categories.push(name);state.categories.sort((a,b)=>a.localeCompare(b,"ja"));$("newCategoryInput").value="";saveData();renderCategoryManager();render();showToast("カテゴリーを追加しました")});
["fontSetting","cardSetting","bgSetting","cardColorSetting"].forEach(id=>$(id).addEventListener("input",()=>{const map={fontSetting:"font",cardSetting:"card",bgSetting:"bg",cardColorSetting:"cardColor"};state.settings[map[id]]=$(id).value;saveData();applySettings()}));
$("exportBtn").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),app:"My Links"},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`MyLinks_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);$("backupMessage").textContent=`${state.links.length}件のリンク、${state.categories.length}件のカテゴリーを保存しました。`});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.links)||!Array.isArray(data.categories))throw new Error("形式");pendingImport=data;$("restoreSummary").textContent=`このファイルにはリンク${data.links.length}件、カテゴリー${data.categories.length}件が含まれています。`; $("settingsDialog").close();$("restoreDialog").showModal()}catch{$("backupMessage").textContent="読み込めないJSONファイルです。";showToast("バックアップファイルを確認してください")}e.target.value=""});
$("mergeRestoreBtn").addEventListener("click",()=>{if(!pendingImport)return;const ids=new Set(state.links.map(l=>l.id));pendingImport.links.forEach(l=>{const copy={...l,id:ids.has(l.id)?uid():l.id||uid()};state.links.push(copy)});pendingImport.categories.forEach(c=>{if(!state.categories.includes(c))state.categories.push(c)});state.settings={...state.settings,...(pendingImport.settings||{})};finishRestore()});
$("replaceRestoreBtn").addEventListener("click",()=>{if(!pendingImport)return;if(!confirm("現在のデータをすべて置き換えます。よろしいですか？"))return;state.links=pendingImport.links;state.categories=pendingImport.categories;state.settings={...defaultData().settings,...(pendingImport.settings||{})};finishRestore()});
function finishRestore(){pendingImport=null;saveData();$("restoreDialog").close();$("settingsDialog").showModal();renderCategoryManager();render();showToast("復元しました")}
document.addEventListener("click",e=>{if(!e.target.closest(".card-tools")&&!e.target.closest(".card-menu"))document.querySelectorAll(".card-menu.open").forEach(m=>m.classList.remove("open"))});
render();
