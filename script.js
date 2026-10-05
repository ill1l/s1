(function(){
  var KEY='daily-tasks-v2', S={tasks:[],done:{},pct:{},cel:{},focus:{}};
  var hadLS=false;
  try{var r=localStorage.getItem(KEY); if(r){S=JSON.parse(r);hadLS=true;}}catch(e){try{localStorage.setItem(KEY+'-bad',r);}catch(e2){}}
  S.pct=S.pct||{};S.cel=S.cel||{};S.focus=S.focus||{};S.ban=S.ban||[];S.draft=S.draft||{};
  if(!S.tmv){S.tasks.forEach(function(t){delete t.st;delete t.t0;delete t.end;});S.ban.forEach(function(b){delete b.st;delete b.t0;delete b.end;});S.tmv=2;}
  seed1();backfillHist();
  var dbh=null,idbReady=hadLS,lsOk=true,lastCore=null,snapDone='',loadedUpd=S.upd||0,cloud=null,cloudReady=false,pushT=null,pushing=false,again=false;
  function idb(cb){
    if(dbh)return cb(dbh);
    try{var q=indexedDB.open('nizam',1);q.onupgradeneeded=function(){q.result.createObjectStore('k');};q.onsuccess=function(){dbh=q.result;cb(dbh);};q.onerror=function(){cb(null);};}catch(e){cb(null);}
  }
  function bump(){var u=S.upd;delete S.upd;var core=JSON.stringify(S);if(core!==lastCore){lastCore=core;u=Date.now();}S.upd=u;}
  function pushCloud(){
    if(!cloud)return;
    if(pushing){again=true;return;}
    pushing=true;
    cloud.set({json:JSON.stringify(S),upd:S.upd||0}).catch(function(){}).then(function(){pushing=false;if(again){again=false;pushCloud();}});
  }
  function adoptRemote(rem){
    try{var o=JSON.parse(rem.json);if(o&&Array.isArray(o.tasks)){S=o;norm();var u=S.upd;delete S.upd;lastCore=JSON.stringify(S);S.upd=u;render();drawBan();return true;}}catch(e){}
    return false;
  }
  function pullCloud(){
    if(!cloud||!cloudReady)return;
    cloud.get().then(function(snap){var rem=snap.exists?snap.data():null;if(rem&&rem.json&&(rem.upd||0)>(S.upd||0))adoptRemote(rem);}).catch(function(){});
  }
  function seed1(){
    if(S.seed1)return;
    S.tasks=S.tasks||[];S.done=S.done||{};S.pct=S.pct||{};
    var id=new Date(2026,9,4,12,0,0).getTime(),k='2026-10-4';
    if(!S.tasks.some(function(t){return t.id===id;}))S.tasks.push({id:id,text:'إنشاء النظام',cat:'شخصي',time:'',daily:false,hi:false,date:k,fin:k});
    S.done[k]=S.done[k]||[];if(S.done[k].indexOf(id)<0)S.done[k].push(id);
    S.pct[k]=100;S.seed1=1;
  }
  var SP=KEY+'-snap-';
  function snapKeys(){
    var ks=[];for(var i=0;i<localStorage.length;i++){var n=localStorage.key(i);if(n&&n.indexOf(SP)===0)ks.push(n);}
    ks.sort(function(a,b){return dd(b.slice(SP.length))-dd(a.slice(SP.length));});return ks;
  }
  function snapshot(){
    try{var k=SP+today;if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(S));snapKeys().slice(7).forEach(function(n){localStorage.removeItem(n);});}catch(e){}
  }
  function drawSnaps(){
    var c=$('snaps');if(!c)return;c.innerHTML='';
    var ks=snapKeys();
    if(!ks.length){c.textContent='لا توجد نسخ بعد';return;}
    ks.forEach(function(n){
      var d=dd(n.slice(SP.length)),b=document.createElement('button');b.type='button';b.className='chip';
      var lab=d.toLocaleDateString('ar',{day:'numeric',month:'long'});b.textContent=lab;
      twoTap(b,lab,function(){
        try{var o=JSON.parse(localStorage.getItem(n));if(o&&Array.isArray(o.tasks)){S=o;norm();save();render();drawBan();$('bs').textContent='تمت الاستعادة';drawSnaps();}}
        catch(e){$('bs').textContent='تعذرت الاستعادة';}
      });
      c.appendChild(b);
    });
  }
  function backfillHist(){
    S.hist=S.hist||{};
    Object.keys(S.done||{}).forEach(function(k){
      var ids=S.done[k]||[];if(!ids.length||S.hist[k])return;
      var nm=ids.map(function(i){var t=(S.tasks||[]).filter(function(q){return q.id===i;})[0];return t?t.text:null;}).filter(Boolean);
      var pc=(S.pct||{})[k]||0;
      S.hist[k]={p:pc,d:ids.length,t:pc===100?ids.length:(pc>0?Math.round(ids.length*100/pc):ids.length),n:nm,w:!!(S.wo&&S.wo[k])};
    });
  }
  function norm(){S.done=S.done||{};S.pct=S.pct||{};S.cel=S.cel||{};S.focus=S.focus||{};S.ban=S.ban||[];S.draft=S.draft||{};S.done[today]=S.done[today]||[];seed1();backfillHist();}
  function save(){
    bump();
    if(snapDone!==today){snapDone=today;snapshot();}
    var j=JSON.stringify(S);
    try{localStorage.setItem(KEY,j);lsOk=localStorage.getItem(KEY)===j;}catch(e){lsOk=false;}
    if(idbReady)idb(function(d){if(!d)return;try{d.transaction('k','readwrite').objectStore('k').put(j,'S');}catch(e){}});
    if(cloud&&cloudReady){clearTimeout(pushT);pushT=setTimeout(pushCloud,1500);}
    var el=document.getElementById('sv');
    if(el)el.textContent=(lsOk?('✓ محفوظ تلقائياً · '+new Date().toLocaleTimeString('ar',{hour:'numeric',minute:'2-digit'})):'⚠ المتصفح يمنع الحفظ على الجهاز')+(cloud&&cloudReady?' · ☁ محفوظ في حسابك':'')+((!(cloud&&cloudReady)&&(!S.lastBackup||Date.now()-S.lastBackup>6048e5))?' · ⚠ خذ نسخة احتياطية من السجل':'');
  }
  function ymd(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
  var today=ymd(new Date()), daily=true, filter='all';
  S.done[today]=S.done[today]||[];
  S.tasks.forEach(function(t){if(!t.daily&&t.date&&t.date!==today&&!t.fin&&(S.done[t.date]||[]).indexOf(t.id)>-1)t.fin=t.date;});
  var $=function(i){return document.getElementById(i);};
  var Q=['الانضباط هو أن تفعل ما يجب عليك حتى لو لم ترغب.','خطوة صغيرة كل يوم تصنع فرقاً كبيراً.','لا تنتظر الحافز، ابدأ ويأتي الحافز معك.','ما تفعله كل يوم أهم مما تفعله أحياناً.','أنجز مهمة واحدة الآن، ثم التي بعدها.'];
  $('quote').textContent=Q[new Date().getDate()%Q.length];
  $('date').textContent=new Date().toLocaleDateString('ar',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  var hr=new Date().getHours();
  $('hi').textContent=hr<12?'صباح الخير':(hr<17?'طاب يومك':'مساء الخير');
  var th=null;try{th=localStorage.getItem('dt-theme');}catch(e){}
  if(th) document.documentElement.setAttribute('data-theme',th);
  $('theme').onclick=function(){
    var cur=document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
    var n=cur==='dark'?'light':'dark'; document.documentElement.setAttribute('data-theme',n);
    try{localStorage.setItem('dt-theme',n);}catch(e){}
  };
  var urgent=false,first=true,onlyOpen=false;
  $('pri').onclick=function(){urgent=!urgent;this.classList.toggle('on',urgent);};
  var dur=25,left=1500,iv=null,ac=null;
  function beep(){try{if(!ac)return;[660,660,880].forEach(function(f,i){var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=.15;o.connect(g);g.connect(ac.destination);var t=ac.currentTime+i*.25;o.start(t);o.stop(t+.18);});}catch(e){}}
  function pad(n){return (n<10?'0':'')+n;}
  function showT(){$('tm').textContent=pad(Math.floor(left/60))+':'+pad(left%60);$('fbar').style.width=((dur*60-left)/(dur*60)*100)+'%';}
  function fcount(){var n=S.focus[today]||0;$('fc').textContent=n?('جلسات اليوم: '+n):'';}
  $('fs').onclick=function(){
    if(iv){clearInterval(iv);iv=null;this.textContent='استئناف';return;}
    try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume();}catch(e){}
    this.textContent='إيقاف مؤقت';
    iv=setInterval(function(){
      left--;showT();
      if(left<=0){clearInterval(iv);iv=null;S.focus[today]=(S.focus[today]||0)+1;save();left=dur*60;showT();fcount();
        $('fs').textContent='ابدأ';$('wh').textContent='انتهت الجلسة';$('wmsg').textContent='أحسنت. خذ استراحة قصيرة ثم أكمل.';$('win').classList.add('show');
        beep();try{navigator.vibrate&&navigator.vibrate(300);}catch(e){}}
    },1000);
  };
  $('fr').onclick=function(){clearInterval(iv);iv=null;left=dur*60;showT();$('fs').textContent='ابدأ';};
  showT();fcount();
  var fch=document.querySelectorAll('#fd .chip');
  Array.prototype.forEach.call(fch,function(c){c.onclick=function(){if(iv)return;dur=+c.dataset.m;left=dur*60;showT();Array.prototype.forEach.call(fch,function(o){o.classList.toggle('on',o===c);});};});
  function show(v){['home','tasks','ban','hist'].forEach(function(id){$(id).hidden=id!==v;});window.scrollTo(0,0);}
  $('hb').onclick=function(){show('hist');};
  $('gtn').onclick=function(){first=true;show('tasks');render();};
  $('tb').onclick=function(){show('home');};
  $('xb').onclick=function(){show('ban');drawBan();};
  $('bb').onclick=function(){show('home');};
  function p2(n){return (n<10?'0':'')+n;}
  function tick(){
    var els=document.querySelectorAll('.tc');
    for(var i=0;i<els.length;i++){
      var el=els[i],st=+el.dataset.s,en=el.dataset.e?+el.dataset.e:Date.now();
      var sec=Math.floor(Math.max(0,en-st)/1000),d=Math.floor(sec/86400);
      el.textContent=(d?d+'d ':'')+p2(Math.floor(sec%86400/3600))+':'+p2(Math.floor(sec%3600/60))+':'+p2(sec%60);
    }
  }
  setInterval(tick,1000);
  function mkTl(o,hideBtn,after){
    var w=document.createElement('div');w.className='tl2';
    var a=document.createElement('span');a.textContent='بدأ '+new Date(o.t0||o.st).toLocaleTimeString('ar',{hour:'numeric',minute:'2-digit'});
    var t=document.createElement('span');t.className='tc';t.dataset.s=o.st;if(o.end)t.dataset.e=o.end;
    w.appendChild(a);w.appendChild(t);
    if(!hideBtn){
      var b=document.createElement('button');b.type='button';b.className='tb';b.textContent=o.end?'▶ استئناف':'⏹ إيقاف';
      b.onclick=function(){if(o.end){o.st+=Date.now()-o.end;delete o.end;}else{o.end=Date.now();}save();after();};
      w.appendChild(b);
    }
    return w;
  }
  function dd(k){var a=k.split('-');return new Date(+a[0],a[1]-1,+a[2]);}
  function twoTap(btn,orig,fn){
    btn.onclick=function(){
      if(btn.dataset.a){clearTimeout(btn._t);fn();return;}
      btn.dataset.a='1';btn.textContent='تأكيد';btn.style.color='var(--gold)';btn.style.fontSize='14px';
      btn._t=setTimeout(function(){delete btn.dataset.a;btn.textContent=orig;btn.style.color='';btn.style.fontSize='';},3000);
    };
  }
  function inlineEdit(el,val,onSave){
    var inp=document.createElement('input');inp.type='text';inp.value=val;inp.className='ed';var done=false;
    el.replaceWith(inp);inp.focus();
    function fin(){if(done)return;done=true;var v=inp.value.trim();onSave(v);}
    inp.onblur=fin;inp.onkeydown=function(e){if(e.key==='Enter')inp.blur();};
  }
  function drawBan(){
    var l=$('blist');l.innerHTML='';var ch=false;
    var mx=0;S.ban.forEach(function(q){var d0=Math.max(0,Math.round((dd(today)-dd(q.since||today))/864e5));if(d0>mx)mx=d0;});
    $('bn').textContent=S.ban.length?(S.ban.length+' ممنوعات'+(mx?' · أطول التزام '+mx+' يوم':'')):'';
    if(!S.ban.length){
      var e=document.createElement('div');e.className='empty';e.textContent='اكتب الأمور التي لا تسمح لنفسك بفعلها';
      ['تيك توك','يوتيوب','سناب شات','ألعاب'].forEach(function(x){var b=document.createElement('button');b.type='button';b.className='tog';b.style.margin='14px 4px 0';b.textContent=x;b.onclick=function(){$('bi').value=x;$('bi').focus();};e.appendChild(b);});
      l.appendChild(e);
    }
    S.ban.forEach(function(b){
      if(!b.since){b.since=today;ch=true;}
      var n=Math.max(0,Math.round((dd(today)-dd(b.since))/864e5));
      var li=document.createElement('li');li.className='ban';
      var x=document.createElement('span');x.className='x';x.textContent='❌';
      var bd=document.createElement('div');bd.className='body';
      var t=document.createElement('div');t.className='txt';t.textContent=b.text;t.title='اضغط للتعديل';
      t.onclick=function(){inlineEdit(t,b.text,function(v){if(v)b.text=v;save();drawBan();});};
      var m=document.createElement('div');m.className='meta';m.textContent=(n?('ملتزم منذ '+n+' يوم'):'بدأت اليوم')+(n>=30?' 🏆':(n>=7?' 🏅':''));
      bd.appendChild(t);bd.appendChild(m);if(b.st)bd.appendChild(mkTl(b,false,drawBan));
      var r=document.createElement('button');r.className='del';r.type='button';r.setAttribute('aria-label','ابدأ العد من جديد');r.title='رجعت له؟ ابدأ العد من جديد';r.textContent='↺';
      twoTap(r,'↺',function(){b.since=today;if(b.st){b.st=Date.now();b.t0=b.st;delete b.end;}save();drawBan();});
      var d=document.createElement('button');d.className='del';d.type='button';d.setAttribute('aria-label','إزالة');d.textContent='×';
      twoTap(d,'×',function(){S.ban=S.ban.filter(function(q){return q.id!==b.id;});save();drawBan();});
      li.appendChild(x);li.appendChild(bd);li.appendChild(r);li.appendChild(d);l.appendChild(li);
    });
    tick();
    if(ch)save();
  }
  $('bf').onsubmit=function(e){
    e.preventDefault();var v=$('bi').value.trim();if(!v)return;
    var it={id:Date.now(),text:v,since:today};$('bi').value='';(S.draft=S.draft||{}).bi='';
    askTimer('تبي تحط مؤقت على هذا الممنوع؟',function(y){
      if(y){it.st=Date.now();it.t0=it.st;}
      S.ban.push(it);save();drawBan();
    });
  };
  $('back').onclick=function(){show('home');};
  $('rep').onclick=function(){daily=!daily;this.classList.toggle('on',daily);this.textContent=daily?'🔁 تتكرر يومياً':'اليوم فقط';};

  function visible(){return S.tasks.filter(function(t){return t.daily||t.date===today||!t.fin||t.fin===today;});}
  function isDone(t){return S.done[today].indexOf(t.id)>-1;}
  function woDay(d){return [1,2,3,5,6].indexOf(d.getDay())>-1;}
  function drawWo(){
    var on=woDay(dd(today)),w=$('wo');w.hidden=!on;if(!on)return;
    var d=!!(S.wo&&S.wo[today]);w.classList.toggle('done',d);$('woc').textContent=d?'✓':'';
  }
  function grp(t){return isDone(t)?3:((!t.daily&&t.date!==today)?0:(t.hi?1:2));}
  var GL=['متأخرة','عاجلة','مهام اليوم','منجزة'];
  function streak(){
    var n=0,d=new Date();
    if(S.pct[ymd(d)]!==100) d.setDate(d.getDate()-1);
    while(S.pct[ymd(d)]===100){n++;d.setDate(d.getDate()-1);}
    return n;
  }
  function stats(){
    var ks=Object.keys(S.pct),now=new Date(),res={total:0,week:0,month:0,best:0,cur:0,days:[],all:[]};
    if(!ks.length) return res;
    var first=new Date();
    ks.forEach(function(k){var a=k.split('-'),d=new Date(+a[0],a[1]-1,+a[2]);if(d<first)first=d;});
    var d=new Date(first.getFullYear(),first.getMonth(),first.getDate()),run=0,end=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    while(d<=end){
      var full=S.pct[ymd(d)]===100,diff=Math.round((end-d)/864e5);
      if(full){run++;res.total++;res.days.push(new Date(d));if(run>res.best)res.best=run;
        if(diff<7)res.week++;if(d.getMonth()===end.getMonth()&&d.getFullYear()===end.getFullYear())res.month++;}
      else run=0;
      if(S.pct[ymd(d)]!==undefined)res.all.push({d:new Date(d),p:S.pct[ymd(d)]});
      d.setDate(d.getDate()+1);
    }
    res.cur=streak();
    return res;
  }
  function drawStats(){
    drawSnaps();drawCal2();
    var r=stats();
    var av=Object.keys(S.pct).map(function(k){return S.pct[k];}),avg=av.length?Math.round(av.reduce(function(a,b){return a+b;},0)/av.length):0;
    var wc=[0,0,0,0,0,0,0];r.days.forEach(function(d){wc[d.getDay()]++;});
    var bw=r.total?new Date(2023,0,1+wc.indexOf(Math.max.apply(null,wc))).toLocaleDateString('ar',{weekday:'long'}):'—';
    $('bd').innerHTML=[['3 أيام',3],['أسبوع',7],['أسبوعان',14],['شهر',30]].map(function(b){return '<span class="bg'+(r.best>=b[1]?' on':'')+'">'+b[0]+'</span>';}).join('');
    var rows=[['إجمالي الأيام المكتملة',r.total],['آخر 7 أيام',r.week],['هذا الشهر',r.month],['السلسلة الحالية',r.cur],['أطول سلسلة',r.best],['متوسط الإنجاز',avg+'%'],['أفضل يوم لك',bw]];
    $('st').innerHTML=rows.map(function(x){return '<div class="sc"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>';}).join('');
    var spk='';for(var q=29;q>=0;q--){var dq=new Date();dq.setDate(dq.getDate()-q);var pk=S.pct[ymd(dq)]||0;spk+='<i class="'+(pk===100?'f':(pk>0?'g':''))+'" style="height:'+Math.max(pk,5)+'%"></i>';}
    $('sp').innerHTML=spk;
    var all=r.all.slice().reverse();
    var head='<tr><th>التاريخ</th><th>الإنجاز</th><th>الحالة</th></tr>';
    $('lm').hidden=all.length<=14;$('lm').textContent=showAllLog?'عرض أقل':'عرض الكل';
    $('lg').innerHTML=all.length?head+(showAllLog?all:all.slice(0,14)).map(function(x){return '<tr><td>'+x.d.toLocaleDateString('ar',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</td><td>'+x.p+'%'+(S.hist&&S.hist[ymd(x.d)]?' ('+S.hist[ymd(x.d)].d+'/'+S.hist[ymd(x.d)].t+')':'')+'</td><td>'+(x.p===100?'✓ مكتمل'+(S.wo&&S.wo[ymd(x.d)]?' ☯':''):'—')+'</td></tr>';}).join(''):'<tr><td style="color:var(--mute)">لا توجد أيام مسجلة بعد</td></tr>';
  }
  function drawWeek(){
    var h='',d=new Date();d.setDate(d.getDate()-d.getDay());
    for(var i=0;i<7;i++){
      var k=ymd(d),p=S.pct[k]||0;
      h+='<div class="wd'+(k===today?' t':'')+(d.getTime()>Date.now()&&k!==today?' f':'')+'"><i><s style="height:'+p+'%"></s></i>'+d.toLocaleDateString('ar',{weekday:'short'})+'</div>';
      d.setDate(d.getDate()+1);
    }
    $('week').innerHTML=h;
  }
  function drawFilters(){
    var cats=['all'];visible().forEach(function(t){if(cats.indexOf(t.cat)<0)cats.push(t.cat);});
    if(cats.indexOf(filter)<0) filter='all';
    $('filters').innerHTML='';
    cats.forEach(function(c){
      var b=document.createElement('button');b.type='button';b.className='chip'+(c===filter?' on':'');
      var cn=visible().filter(function(t){return c==='all'||t.cat===c;}).length;b.textContent=(c==='all'?'الكل':c)+' '+cn;b.onclick=function(){filter=c;render();};
      $('filters').appendChild(b);
    });
    var o=document.createElement('button');o.type='button';o.className='chip'+(onlyOpen?' on':'');o.textContent='المتبقية فقط';
    o.onclick=function(){onlyOpen=!onlyOpen;render();};$('filters').appendChild(o);
  }
  function render(){
    S.tasks.forEach(function(t){
      if(!t.tm)return;
      if(t.daily){if(t.day!==today){t.day=today;t.st=Date.now();t.t0=t.st;delete t.end;}}
      else if(!t.st){t.st=t.id;t.t0=t.id;}
      if(S.done[today].indexOf(t.id)>-1&&!t.end&&(t.daily||t.date===today||t.fin===today))t.end=Date.now();
    });
    var all=visible(), total=all.length, dn=all.filter(isDone).length, p=total?Math.round(dn/total*100):0;
    S.pct[today]=p;
    S.hist=S.hist||{};
    if(total>0||(S.wo&&S.wo[today]))S.hist[today]={p:p,d:dn,t:total,n:all.filter(isDone).map(function(t){return t.text;}),w:!!(S.wo&&S.wo[today])};
    $('pct').textContent=p+'%';
    document.title='النظام'+(total-dn>0?' ('+(total-dn)+')':'');
    $('arc').style.strokeDashoffset=263.9*(1-p/100);
    $('arc').style.stroke=p===100?'var(--pur)':'var(--gold)';$('pct').style.color=p===100?'var(--pur)':'';
    $('count').textContent=total?('أنجزت '+dn+' من '+total):'لا توجد مهام بعد';
    $('msg').textContent=!total?'ابدأ يومك':(dn===total?'يوم مكتمل':(dn?'استمر، باقي القليل':'ابدأ بأسهل مهمة'));
    var s=streak();
    $('streak').textContent=s?('أيام متتالية مكتملة: '+s):'أكمل كل مهام اليوم لتبدأ سلسلتك';
    drawWeek();drawStats();drawFilters();
    var list=$('list');list.innerHTML='';
    var show=all.filter(function(t){return (filter==='all'||t.cat===filter)&&(!onlyOpen||!isDone(t))&&(!query||t.text.indexOf(query)>-1);}).sort(function(a,b){
      if(grp(a)!==grp(b)) return grp(a)-grp(b);
      return (a.time||'99:99')<(b.time||'99:99')?-1:1;
    });
    if(!show.length){var e=document.createElement('div');e.className='empty';e.textContent=total?'لا مهام في هذا التصنيف':'ابدأ بمهمة جاهزة أو اكتب مهمتك أعلاه';
      if(!total){['شرب الماء','رياضة','مراجعة الدراسة','قراءة'].forEach(function(x){var b=document.createElement('button');b.type='button';b.className='tog';b.style.margin='14px 4px 0';b.textContent=x;b.onclick=function(){$('in').value=x;$('in').focus();};e.appendChild(b);});}
      list.appendChild(e);}
    var gs={};show.forEach(function(t){gs[grp(t)]=1;});
    var multi=Object.keys(gs).length>1,lastG=-1;
    show.forEach(function(t,ix){
      if(multi&&grp(t)!==lastG){lastG=grp(t);var gh=document.createElement('li');gh.className='gh';gh.textContent=GL[lastG];list.appendChild(gh);}
      var li=document.createElement('li');li.className=(isDone(t)?'done':'')+(t.hi?' hi':'');
      if(first){li.style.animation='rise .5s ease both';li.style.animationDelay=(ix*70)+'ms';}
      var c=document.createElement('button');c.className='chk';c.type='button';c.setAttribute('aria-label','إنجاز المهمة');c.textContent=isDone(t)?'✓':'';
      c.onclick=function(){var a=S.done[today],i=a.indexOf(t.id);if(i>-1){a.splice(i,1);delete t.fin;if(t.tm&&t.end){t.st+=Date.now()-t.end;delete t.end;}}else{a.push(t.id);if(!t.daily)t.fin=today;if(t.tm&&!t.end)t.end=Date.now();}render();try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
        if(S.pct[today]===100&&!S.cel[today]){S.cel[today]=1;save();$('wh').textContent='يوم مكتمل';$('wmsg').textContent='أنجزت كل مهامك. هذا هو الانضباط.';$('win').classList.add('show');confetti();}};
      var b=document.createElement('div');b.className='body';
      var x=document.createElement('div');x.className='txt';x.textContent=t.text;x.title='اضغط للتعديل';
      x.onclick=function(){inlineEdit(x,t.text,function(v){if(v)t.text=v;render();});};
      var m=document.createElement('div');m.className='meta';
      m.textContent=t.cat+(t.hi?' · عاجلة':'')+(t.time?' · '+t.time:'')+(t.daily?'':(t.date!==today?' · مؤجلة من يوم سابق':' · اليوم فقط'));
      b.appendChild(x);b.appendChild(m);
      var rp=document.createElement('button');rp.type='button';rp.className='tb'+(t.daily?' on':'');rp.textContent=t.daily?'🔁 تتكرر يومياً':'🔁 اجعلها يومية';
      rp.onclick=function(){
        if(t.daily){t.daily=false;t.date=today;if(isDone(t))t.fin=today;else delete t.fin;}
        else{t.daily=true;delete t.fin;t.day=today;}
        render();
      };
      b.appendChild(rp);if(t.tm)b.appendChild(mkTl(t,isDone(t),render));
      var d=document.createElement('button');d.className='del';d.type='button';d.setAttribute('aria-label','حذف المهمة');d.textContent='×';
      if(isDone(t)){d.textContent='🔒';d.disabled=true;d.title='مهمة منجزة، لا يمكن حذفها';d.setAttribute('aria-label','مهمة منجزة لا يمكن حذفها');d.style.cursor='default';d.style.fontSize='16px';d.style.opacity='.6';}
      d.onclick=function(){if(isDone(t))return;lastDel=t;S.tasks=S.tasks.filter(function(q){return q.id!==t.id;});render();toast('حُذفت المهمة');};
      li.appendChild(c);li.appendChild(b);li.appendChild(d);list.appendChild(li);
    });
    first=false;
    tl();tick();
    $('gtn').style.setProperty('--p',p+'%');
    $('s1').textContent=s;$('s2').textContent=S.focus[today]||0;$('s3').textContent=dn;
    $('ts1').textContent=total-dn;$('ts2').textContent=dn;$('ts3').textContent=all.filter(function(t){return !t.daily&&t.date!==today&&!isDone(t);}).length;$('tbar').style.width=p+'%';
    var nx=all.filter(function(t){return !isDone(t);}).sort(function(a,b){return grp(a)!==grp(b)?grp(a)-grp(b):((a.time||'99:99')<(b.time||'99:99')?-1:1);})[0];
    $('gnx').textContent=nx?('التالي: '+nx.text):'';
    drawWo();
    $('gtc').textContent=total?(total-dn>0?(total-dn)+' متبقية ‹':'اكتملت كلها ‹'):'أضف مهامك ‹';
    $('lr').textContent=total?(total-dn>0?(total-dn)+' متبقية':'اكتملت كلها'):'';
    save();
  }
  function confetti(){
    for(var i=0;i<30;i++){var c=document.createElement('span');c.className='cf';
      c.style.left=Math.random()*100+'vw';c.style.animationDelay=Math.random()*.8+'s';
      c.style.background=i%3?'#c9a96a':'#f3ece0';$('win').appendChild(c);}
  }
  $('wclose').onclick=function(){$('win').classList.remove('show');Array.prototype.slice.call(document.querySelectorAll('.cf')).forEach(function(n){n.remove();});};
  var mo2=0,showAllLog=false;
  function maxO(){var n=new Date();return (2030-n.getFullYear())*12+(11-n.getMonth());}
  function drawCal2(){
    var n=new Date(),y=n.getFullYear(),m=n.getMonth()+mo2,f=new Date(y,m,1),h='',c=0,i;
    $('mt2').textContent=f.toLocaleDateString('ar',{month:'long',year:'numeric'});
    for(i=0;i<7;i++) h+='<span class="wn">'+new Date(2023,0,1+i).toLocaleDateString('ar',{weekday:'short'})+'</span>';
    for(i=0;i<f.getDay();i++) h+='<span class="wn"></span>';
    var dim=new Date(y,m+1,0).getDate();
    for(i=1;i<=dim;i++){
      var dt=new Date(y,m,i),k=ymd(dt),full=S.pct[k]===100;if(full)c++;
      var yy=full&&woDay(dt)&&S.wo&&S.wo[k];
      h+='<span class="'+(full?'pu':'')+(yy?' yy':'')+(k===today?' td':'')+'">'+i+'</span>';
    }
    $('cal2').innerHTML=h;var g=S.goal||20;$('cnt2').textContent='أيام مكتملة في هذا الشهر: '+c+' من '+g;$('gb').style.width=Math.min(100,c/g*100)+'%';$('nx2').disabled=mo2>=maxO();
  }
  $('pv2').onclick=function(){mo2--;drawCal2();};
  $('nx2').onclick=function(){if(mo2<maxO()){mo2++;drawCal2();}};
  $('gt').onclick=function(){mo2=0;drawCal2();};
  $('lm').onclick=function(){showAllLog=!showAllLog;drawStats();};
  $('gset').onclick=function(){
    var g=$('gset'),inp=document.createElement('input'),ok=document.createElement('button');
    inp.type='number';inp.min=1;inp.max=31;inp.value=S.goal||20;inp.className='ed';inp.style.cssText='width:80px;margin-left:8px';inp.setAttribute('aria-label','الهدف الشهري');
    ok.type='button';ok.className='tog on';ok.textContent='حفظ';
    g.hidden=true;g.parentNode.insertBefore(inp,g);g.parentNode.insertBefore(ok,g);inp.focus();
    ok.onclick=function(){var v=parseInt(inp.value,10);if(v>0&&v<=31){S.goal=v;save();}inp.remove();ok.remove();g.hidden=false;drawCal2();};
  };
  function tl(){
    var n=new Date(),m=1440-(n.getHours()*60+n.getMinutes());
    $('left').textContent=S.pct[today]===100?'':('باقي على نهاية اليوم: '+Math.floor(m/60)+' س و'+(m%60)+' د');
  }
  setInterval(tl,60000);
  function refreshHead(){
    var h=new Date().getHours();
    $('hi').textContent=h<12?'صباح الخير':(h<17?'طاب يومك':'مساء الخير');
    $('quote').textContent=Q[new Date().getDate()%Q.length];
    $('date').textContent=new Date().toLocaleDateString('ar',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
  function checkDay(){
    refreshHead();
    var n=ymd(new Date());
    if(n===today)return;
    today=n;S.done[today]=S.done[today]||[];
    S.tasks.forEach(function(t){if(!t.daily&&t.date&&t.date!==today&&!t.fin&&(S.done[t.date]||[]).indexOf(t.id)>-1)t.fin=t.date;});
    mo2=0;first=true;render();drawBan();fcount();
  }
  setInterval(checkDay,30000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden){checkDay();pullCloud();}else if(cloud&&cloudReady)pushCloud();});
  window.addEventListener('pagehide',function(){if(cloud&&cloudReady)pushCloud();});
  window.addEventListener('focus',checkDay);
  var lastDel=null,tmr=null;
  function toast(m){$('ts').querySelector('span').textContent=m;$('ts').hidden=false;clearTimeout(tmr);tmr=setTimeout(function(){$('ts').hidden=true;},5000);}
  $('tu').onclick=function(){if(lastDel){S.tasks.push(lastDel);lastDel=null;$('ts').hidden=true;render();}};
  $('bc').onclick=function(){S.lastBackup=Date.now();save();var t=JSON.stringify(S),ok=false;$('bk').value=t;$('bk').select();
    try{if(navigator.clipboard){navigator.clipboard.writeText(t);ok=true;}else{ok=document.execCommand('copy');}}catch(e){}
    $('bs').textContent=ok?'تم النسخ':'حدد النص وانسخه يدوياً';};
  $('br').onclick=function(){
    try{var o=JSON.parse($('bk').value);if(!o||!Array.isArray(o.tasks))throw 0;
      S=o;S.done=S.done||{};S.pct=S.pct||{};S.cel=S.cel||{};S.focus=S.focus||{};S.ban=S.ban||[];S.done[today]=S.done[today]||[];
      save();$('bs').textContent='تمت الاستعادة';render();}
    catch(e){$('bs').textContent='النص غير صالح';}};
  function bindDraft(id,key){
    var el=$(id);if(S.draft[key])el.value=S.draft[key];
    function h(){S.draft=S.draft||{};S.draft[key]=el.value;save();}
    el.addEventListener('input',h);el.addEventListener('change',h);
  }
  bindDraft('in','in');bindDraft('time','time');bindDraft('cat','cat');bindDraft('bi','bi');
  var catList=['شخصي','دراسة','رياضة','عمل','صحة'],query='';
  function syncCats(){
    var c=$('cats');c.innerHTML='';
    catList.forEach(function(n){
      var b=document.createElement('button');b.type='button';b.className='chip'+($('cat').value===n?' on':'');b.textContent=n;
      b.onclick=function(){$('cat').value=n;(S.draft=S.draft||{}).cat=n;save();syncCats();};
      c.appendChild(b);
    });
  }
  syncCats();
  $('woc').onclick=function(){
    S.wo=S.wo||{};
    if(S.wo[today])delete S.wo[today];else S.wo[today]=true;
    save();render();try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
    if(S.wo[today]&&S.pct[today]===100&&!S.cel[today+'w']){S.cel[today+'w']=1;save();$('wh').textContent='يوم كامل ☯';$('wmsg').textContent='أنجزت مهامك وتمرينك. أحسنت.';$('win').classList.add('show');confetti();}
  };
  $('sq').addEventListener('input',function(){query=this.value.trim();render();});
  function askTimer(msg,cb){
    $('ap').textContent=msg;$('ask').classList.add('show');
    $('ay').onclick=function(){$('ask').classList.remove('show');cb(true);};
    $('an').onclick=function(){$('ask').classList.remove('show');cb(false);};
  }
  $('f').onsubmit=function(e){
    e.preventDefault();
    var v=$('in').value.trim();if(!v)return;
    var tk={id:Date.now(),text:v,cat:$('cat').value,time:$('time').value,daily:daily,hi:urgent,date:today};
    S.cel[today]=0;urgent=false;$('pri').classList.remove('on');$('in').value='';$('time').value='';(S.draft=S.draft||{}).in='';S.draft.time='';
    askTimer('تبي تحط مؤقت على هذي المهمة؟',function(y){
      if(y){tk.tm=true;tk.day=today;tk.st=Date.now();tk.t0=tk.st;}
      S.tasks.push(tk);render();
    });
  };
  render();
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist();}catch(e){}
  try{
    if(window.claude&&window.claude.use){
      Promise.all([window.claude.use('db'),window.claude.use('user')]).then(function(r){
        var db=r[0],us=r[1];if(!db||!us)return;
        return us.id().then(function(id){
          if(!id)return;
          cloud=db.doc('data/users/'+id+'/state');
          return cloud.get().then(function(snap){
            var rem=snap.exists?snap.data():null;
            var haveLocal=S.tasks.length||S.ban.length||Object.keys(S.pct).some(function(k){return S.pct[k]>0;});
            if(rem&&rem.json&&(rem.upd||0)>loadedUpd&&!(loadedUpd===0&&haveLocal))adoptRemote(rem);
            cloudReady=true;save();
          });
        });
      }).catch(function(){});
    }
  }catch(e){}
  if(!hadLS){
    idb(function(d){
      if(!d){idbReady=true;return;}
      try{
        var g=d.transaction('k').objectStore('k').get('S');
        g.onsuccess=function(){
          idbReady=true;
          if(g.result){try{var o=JSON.parse(g.result);if(o&&Array.isArray(o.tasks)){S=o;norm();render();drawBan();}}catch(e){}}
          else save();
        };
        g.onerror=function(){idbReady=true;};
      }catch(e){idbReady=true;}
    });
  }
})();
