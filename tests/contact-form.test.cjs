const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('contact.html', 'utf8');
assert(!/<form[\s\S]*?\bnovalidate\b[\s\S]*?>/.test(html));
assert(html.includes('form.noValidate = true'));
assert(html.includes('<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>'));
const action = html.match(/action="([^"]+)"/)[1];
assert(fs.existsSync(action.slice(1)), 'Native form action must resolve to a local success page');
assert(fs.readFileSync(action.slice(1), 'utf8').includes('noindex, follow'));
console.log('PASS native form validation, no-JS visibility and local success destination');
const script = html.slice(html.indexOf("    const form = document.getElementById('contactForm');"), html.lastIndexOf('</script>'));
function setup(fetchImpl, valid = true, analyticsThrows = false) {
  const elements = {};
  function element() {
    const classes = new Set();
    return {classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x)}, attrs: {}, hidden: true, disabled: false, value: 'Keep & this', setAttribute(k,v) {this.attrs[k]=v;}, focus(){this.focused=true;}, scrollIntoView(){}, addEventListener(k,fn){this[k]=fn;}};
  }
  for (const id of ['contactForm','formGrid','success','submitBtn','formError']) elements[id]=element();
  const field=element(), input=element(); input.tagName='INPUT'; input.closest=()=>field; input.checkValidity=()=>valid;
  elements.contactForm.querySelectorAll=()=>[input];
  const calls=[], events=[];
  const context={document:{getElementById:id=>elements[id]},FormData: class {forEach(fn){for (const [k,v] of Object.entries({'form-name':'contact','bot-field':'',name:input.value,help:'website'})) fn(v,k);}},fetch:(...args)=>{calls.push(args);return fetchImpl(...args);},window:{dataLayer:{push:e=>events.push(e)}},gtag:()=>{if(analyticsThrows) throw Error('analytics');}};
  vm.runInNewContext(script,context);
  return {elements,input,field,calls,events,submit:()=>elements.contactForm.submit({preventDefault(){}})};
}
(async()=>{
 let resolve;
 const t=setup(()=>new Promise(r=>resolve=r));
 const pending=t.submit(); assert.equal(t.elements.submitBtn.disabled,true); assert.equal(t.elements.contactForm.attrs['aria-busy'],'true');
 await t.submit(); assert.equal(t.calls.length,1);
 assert.equal(t.calls[0][0],'/');assert.equal(t.calls[0][1].method,'POST');assert.equal(t.calls[0][1].headers['Content-Type'],'application/x-www-form-urlencoded');
 const body=new URLSearchParams(t.calls[0][1].body);assert.equal(body.get('form-name'),'contact');assert.equal(body.get('bot-field'),'');assert.equal(body.get('name'),'Keep & this');
 resolve({ok:true,status:200});await pending;assert(t.elements.success.classList.contains('show'));assert(t.elements.formGrid.classList.contains('hidden'));assert.equal(t.events.length,1);await t.submit();assert.equal(t.calls.length,1);
 console.log('PASS success, encoding, pending and post-success duplicate protection');
 for(const failure of [()=>Promise.resolve({ok:false,status:400}),()=>Promise.resolve({ok:false,status:500}),()=>Promise.reject(Error('network'))]) {
  let attempt=0;const f=setup(()=>++attempt===1?failure():Promise.resolve({ok:true,status:200}));
  await f.submit();assert(!f.elements.success.classList.contains('show'));assert(!f.elements.formGrid.classList.contains('hidden'));assert.equal(f.input.value,'Keep & this');assert.equal(f.elements.submitBtn.disabled,false);assert.equal(f.elements.contactForm.attrs['aria-busy'],'false');assert(!f.elements.submitBtn.classList.contains('loading'));assert.equal(f.elements.formError.hidden,false);assert(f.elements.formError.focused);assert.equal(f.events.length,0);
  await f.submit();assert(f.elements.success.classList.contains('show'));assert.equal(f.elements.formError.hidden,true);
 }
 console.log('PASS HTTP 400/500 and network errors retain input, restore controls, allow retry');
 const invalid=setup(()=>{throw Error('must not fetch');},false);await invalid.submit();assert.equal(invalid.calls.length,0);assert(invalid.input.focused);
 const analytics=setup(()=>Promise.resolve({ok:true}),true,true);await analytics.submit();assert(analytics.elements.success.classList.contains('show'));assert.equal(analytics.elements.formError.hidden,true);assert.equal(analytics.elements.contactForm.attrs['aria-busy'],'false');
 console.log('PASS validation and analytics exception after confirmed success');
 for(const file of ['index.html','tools.html','contact.html']) {
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {if(match[1].includes('ld+json')) JSON.parse(match[2]);else new vm.Script(match[2]);}
  assert.equal((text.match(/rel="canonical"/g)||[]).length,1);
 }
 console.log('PASS all inline JS syntax, JSON-LD and canonical count');
})().catch(e=>{console.error(e);process.exitCode=1});
