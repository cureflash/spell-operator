(function (root) {
  "use strict";

  class SpellError extends Error {
    constructor(message, lineNumber = null) {
      super(lineNumber ? `Line ${lineNumber}: ${message}` : message);
      this.name = "SpellError";
      this.lineNumber = lineNumber;
    }
  }

  class OverheatError extends Error {
    constructor(limit) {
      super(`OVERHEAT: 実行ステップが上限 ${limit} を超えました。`);
      this.name = "OverheatError";
    }
  }

  class SpellInterpreter {
    constructor({ stepLimit = 1000 } = {}) { this.stepLimit = stepLimit; }

    run(source) {
      const lines = this.#normalize(source);
      if (lines.length === 0) throw new SpellError("コードが空です。");
      const state = {spell:null,output:[],casts:[],variables:Object.create(null),steps:0,features:{loops:0,assignments:0,conditionals:0}};
      this.#executeBlock(lines, 0, 0, state);
      return {spell:state.spell,output:[...state.output],casts:[...state.casts],variables:{...state.variables},steps:state.steps,mpCost:Math.max(1,Math.ceil(state.steps/3)),features:{...state.features}};
    }

    validateFire(result) {
      const desired=["5","4","3","2","1"];
      const outputMatches=result.output.length===desired.length&&result.output.every((v,i)=>v===desired[i]);
      const castMatches=result.casts.length===1&&result.casts[0]==="fire";
      const spellMatches=result.spell==="fire";
      const loopUsed=result.features?.loops>=1;
      return {ok:outputMatches&&castMatches&&spellMatches&&loopUsed,checks:{outputMatches,castMatches,spellMatches,loopUsed}};
    }

    validateRepair(result) {
      const castMatches=result.casts.length===1&&result.casts[0]==="repair";
      const spellMatches=result.spell==="repair";
      const assignmentUsed=result.features?.assignments>=1;
      const conditionalUsed=result.features?.conditionals>=1;
      return {ok:castMatches&&spellMatches&&assignmentUsed&&conditionalUsed,checks:{castMatches,spellMatches,assignmentUsed,conditionalUsed}};
    }

    validateHeal(result) { return this.validateRepair({...result,spell:result.spell==="heal"?"repair":result.spell,casts:result.casts.map(v=>v==="heal"?"repair":v)}); }

    #normalize(source) {
      return source.replace(/\t/g,"    ").split(/\r?\n/).map((raw,index)=>{const match=raw.match(/^( *)(.*)$/);return{lineNumber:index+1,indent:match[1].length,text:match[2].trimEnd()};}).filter(line=>line.text.trim()!==""&&!line.text.trimStart().startsWith("#"));
    }

    #executeBlock(lines,startIndex,indent,state) {
      let i=startIndex;
      while(i<lines.length){
        const line=lines[i];
        if(line.indent<indent)break;
        if(line.indent>indent)throw new SpellError("インデントが不正です。",line.lineNumber);
        const text=line.text.trim();this.#step(state);let match;
        if((match=text.match(/^spell\s+([a-zA-Z_][\w]*)$/))){if(state.spell!==null)throw new SpellError("spell 宣言は1回だけです。",line.lineNumber);state.spell=match[1].toLowerCase();i+=1;continue;}
        if((match=text.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/))){state.variables[match[1]]=this.#evalExpression(match[2],state.variables,line.lineNumber);state.features.assignments+=1;i+=1;continue;}
        if((match=text.match(/^print\((.*)\)$/))){state.output.push(String(this.#evalExpression(match[1],state.variables,line.lineNumber)));i+=1;continue;}
        if((match=text.match(/^cast\(\s*["']([a-zA-Z_][\w]*)["']\s*\)$/))){state.casts.push(match[1].toLowerCase());i+=1;continue;}
        if((match=text.match(/^if\s+(.+):$/))){
          const condition=this.#evalExpression(match[1],state.variables,line.lineNumber),bodyIndent=indent+4,bodyStart=i+1;
          if(bodyStart>=lines.length||lines[bodyStart].indent!==bodyIndent)throw new SpellError("if の中身を4スペース下げて書いてください。",line.lineNumber);
          let bodyEnd=bodyStart;while(bodyEnd<lines.length&&lines[bodyEnd].indent>=bodyIndent)bodyEnd+=1;state.features.conditionals+=1;
          if(Boolean(condition))this.#executeBlock(lines.slice(bodyStart,bodyEnd),0,bodyIndent,state);i=bodyEnd;continue;
        }
        if((match=text.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+range\((.*)\):$/))){
          const varName=match[1],count=this.#evalExpression(match[2],state.variables,line.lineNumber);
          if(!Number.isInteger(count)||count<0)throw new SpellError("range() は0以上の整数にしてください。",line.lineNumber);
          const bodyIndent=indent+4,bodyStart=i+1;if(bodyStart>=lines.length||lines[bodyStart].indent!==bodyIndent)throw new SpellError("for の中身を4スペース下げて書いてください。",line.lineNumber);
          let bodyEnd=bodyStart;while(bodyEnd<lines.length&&lines[bodyEnd].indent>=bodyIndent)bodyEnd+=1;const bodyLines=lines.slice(bodyStart,bodyEnd);state.features.loops+=1;
          for(let n=0;n<count;n+=1){this.#step(state);state.variables[varName]=n;this.#executeBlock(bodyLines,0,bodyIndent,state);}i=bodyEnd;continue;
        }
        throw new SpellError(`未対応の命令です: ${text}`,line.lineNumber);
      }
      return i;
    }

    #evalExpression(expression,variables,lineNumber){
      const expr=expression.trim();
      if(!/^[\d\s+\-*/()%<>=!A-Za-z_]+$/.test(expr))throw new SpellError("式に使えない文字が含まれています。",lineNumber);
      if(/[^=!<>]=[^=]/.test(` ${expr} `))throw new SpellError("条件式の比較には ==, !=, <, <=, >, >= を使ってください。",lineNumber);
      const identifiers=expr.match(/[A-Za-z_]\w*/g)||[];for(const name of identifiers){if(!(name in variables))throw new SpellError(`変数 ${name} は定義されていません。`,lineNumber);}
      let jsExpr=expr;for(const name of [...new Set(identifiers)].sort((a,b)=>b.length-a.length)){const value=variables[name],replacement=typeof value==="boolean"?String(value):String(Number(value));jsExpr=jsExpr.replace(new RegExp(`\\b${name}\\b`,"g"),replacement);}
      try{const value=Function(`"use strict"; return (${jsExpr});`)();if(typeof value==="boolean")return value;if(!Number.isFinite(value))throw new Error("not finite");return value;}catch{throw new SpellError("式を計算できません。",lineNumber);}
    }

    #step(state){state.steps+=1;if(state.steps>this.stepLimit)throw new OverheatError(this.stepLimit);}
  }

  const api={SpellInterpreter,SpellError,OverheatError};root.SpellRuntime=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
