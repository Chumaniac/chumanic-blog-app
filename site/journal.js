const articles = [
  {id:'edit',title:'留一份能核对的输入',section:'开发笔记',body:['对账最常见的分歧发生在输入端。拿一张领料单，把应有数量和实收数量并排，先看看哪些行有差异。','同事复查时，需要的是那张原始单据、当时的两列数字，以及采用的计算规则。保存输入之后，再保存结果。']},
  {id:'warn',title:'读懂一次检查的警告',section:'工具手记',body:['目录检查通过后，报告里可能仍然写着一项警告。打开对应文件，找到触发检查的声明，再判断是否需要修改。','把检查范围和未确认的条件写进记录。过一周回来，仍能看出当时核对了哪部分内容。']},
  {id:'offline',title:'断网时还能看到什么',section:'界面观察',body:['在一份离线记录上，最后更新时间和数据来源比一个闪动的圆圈更有用。','保留最后一份成功结果，说明哪些操作需要恢复连接，并提供可以主动重试的入口。']}
];
const byId = id => document.getElementById(id);
const key = 'chumanic.journal.sample.v1';
let current = articles[0].id;
let displayed;
try { const saved = localStorage.getItem(key); if (articles.some(a=>a.id===saved)) current=saved; } catch {}
function render() {
  const query = byId('query').value.trim().toLowerCase();
  const matches = articles.filter(a=>[a.title,...a.body].join(' ').toLowerCase().includes(query));
  const list = byId('list'); list.replaceChildren();
  const article = matches.find(item=>item.id===current) ?? matches[0];
  displayed = article?.id;
  for (const article of matches) {
    const button=document.createElement('button');button.textContent=article.title;
    if (article.id===displayed) button.setAttribute('aria-current','page');
    button.onclick=()=>{current=article.id;render();document.querySelector('article').focus()};list.append(button);
  }
  byId('body').replaceChildren(); byId('note').textContent='';
  byId('section').textContent=article?.section||'';byId('title').textContent=article?.title||'没有匹配的文章';
  byId('remember').hidden=!article;
  for(const text of article?.body||[]) {const p=document.createElement('p');p.textContent=text;byId('body').append(p)}
}
byId('query').addEventListener('input',render);
byId('remember').onclick=()=>{if (!displayed) return; current=displayed; try{localStorage.setItem(key,current);byId('note').textContent='已保存，下次打开会回到这篇文章。'}catch{byId('note').textContent='浏览器未允许保存，仍可继续阅读。'}};
render();
