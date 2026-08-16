(() => {
  "use strict";
  const world=document.getElementById("field-world");
  if(!world)return;
  for(const id of ["field-enemy","field-sign"]){
    const el=document.getElementById(id);
    if(el&&el.parentElement!==world)world.appendChild(el);
  }
})();
